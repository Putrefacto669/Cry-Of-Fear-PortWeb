"""Walkable routes inside a GoldSrc BSP (v30) for the player hulls (standing: hull 1, crouched: hull 3).

Reads the map's own clipnodes (no engine needed) and searches a grid with A*: a cell is a position where the
standing hull (or, failing that, the crouched hull) fits with the floor right under it; a step can climb up to
18 units (the stair step of pm_shared) and drop up to 200 (800 into a func_water, where hlsdk does no fall damage). Crouched cells cost more, so the route only
crawls where standing does not fit (c_sewer's duct under the entrance stairs, floor -124 at x 1022..1062).
The result is a list of waypoints that the browser probes walk with the normal controls (W held, C held on the
crouched stretches, the view turned towards the next waypoint).

Usage: python tools/bsp_walk.py <map.bsp> x1 y1 z1 x2 y2 z2 [cell]
Prints the simplified route as JSON: [[x, y, z, duck], ...] with z the standing origin height (feet + 36)
and mode 0 standing, 1 crouched (C held), 2 a jump onto this point (Space), 3 a crouch-jump onto it (C + Space).
"""
import heapq
import json
import math
import re
import struct
import sys

CONTENTS_SOLID = -2
STEP = 18.0
MAX_DROP = 200.0
MAX_WATER_DROP = 800.0  # into a func_water (no fall damage there)
MARGIN = 6.0      # free space wanted around a cell, beyond the hull itself
DUCK_COST = 2.5   # a crouched cell costs this much more than a standing one
JUMP = 40.0       # a jump climbs this much (pm_shared jumps ~45); a jumped step costs JUMP_COST more
JUMP_COST = 6.0
STAND_H, DUCK_H = 36.0, 18.0  # origin above the feet for hull 1 and hull 3


class Bsp:
    def __init__(self, path, include_breakables=True):
        self.include_breakables = include_breakables
        d = open(path, "rb").read()
        lump = lambda i: struct.unpack_from("<ii", d, 4 + i * 8)
        off, ln = lump(1)
        self.planes = [struct.unpack_from("<4fi", d, off + i * 20) for i in range(ln // 20)]
        off, ln = lump(9)
        self.clip = [struct.unpack_from("<i2h", d, off + i * 8) for i in range(ln // 8)]
        off, _ = lump(14)
        heads = struct.unpack_from("<4i", d, off + 36)  # model 0: hull 0..3
        self.heads = {False: heads[1], True: heads[3]}
        # func_water volumes: a fall into water does no damage (hlsdk CBasePlayer::PostThink skips the fall
        # damage when the player lands in CONTENT_WATER), so a longer drop is allowed when it ends in one
        self.water = []
        eoff, eln = lump(0)
        ents = d[eoff:eoff + eln].decode("latin-1")
        for block in re.findall(r"\{([^}]*)\}", ents):
            e = dict(re.findall(r'"([^"]*)"\s+"([^"]*)"', block))
            if e.get("classname") == "func_water" and e.get("model", "").startswith("*"):
                i = int(e["model"][1:])
                mn = struct.unpack_from("<3f", d, off + i * 64)
                mx = struct.unpack_from("<3f", d, off + i * 64 + 12)
                self.water.append((mn, mx))

        # solid brush entities (their own hull 1/3 clip trees): a func_wall, a trigger_checkbrush (solid in
        # checkbrush.cpp) or an unbroken func_breakable blocks the player like the world does. The c_sewer route
        # first went through the bars func_breakable *34 and the grates func_wall *5/*8.
        self.solids = []
        solid_classes = {"func_wall", "trigger_checkbrush", "func_breakable"}
        if not self.include_breakables:
            solid_classes.discard("func_breakable")
        for block in re.findall(r"\{([^}]*)\}", ents):
            e = dict(re.findall(r'"([^"]*)"\s+"([^"]*)"', block))
            cls = e.get("classname", "")
            starts_off = cls == "func_wall_toggle" and int(e.get("spawnflags", "0") or 0) & 1
            if (cls in solid_classes or (cls == "func_wall_toggle" and not starts_off)) and e.get("model", "").startswith("*"):
                i = int(e["model"][1:])
                mn = struct.unpack_from("<3f", d, off + i * 64)
                mx = struct.unpack_from("<3f", d, off + i * 64 + 12)
                hh = struct.unpack_from("<4i", d, off + i * 64 + 36)
                self.solids.append((mn, mx, {False: hh[1], True: hh[3]}, cls, e["model"]))

    def in_water(self, x, y, feet):
        return any(mn[0] <= x <= mx[0] and mn[1] <= y <= mx[1] and mn[2] - 2 <= feet <= mx[2] for mn, mx in self.water)

    def walk_tree(self, n, p):
        while n >= 0:
            plane, c0, c1 = self.clip[n]
            nx, ny, nz, dist, ptype = self.planes[plane]
            v = (p[ptype] if ptype < 3 else nx * p[0] + ny * p[1] + nz * p[2]) - dist
            n = c0 if v >= 0 else c1
        return n

    def contents(self, p, duck=False):
        n = self.walk_tree(self.heads[duck], p)
        if n == CONTENTS_SOLID:
            return n
        hw, hh = 16, (18 if duck else 36)  # the hull's half sizes: a brush's hull tree only covers its expanded box
        for mn, mx, heads, cls, model in self.solids:
            if (mn[0] - hw <= p[0] <= mx[0] + hw and mn[1] - hw <= p[1] <= mx[1] + hw
                    and mn[2] - hh <= p[2] <= mx[2] + hh and self.walk_tree(heads[duck], p) == CONTENTS_SOLID):
                return CONTENTS_SOLID
        return n

    def empty(self, p, duck=False):
        return self.contents(p, duck) != CONTENTS_SOLID

    def free(self, x, y, feet, duck=False):
        return self.empty((x, y, feet + (DUCK_H if duck else STAND_H)), duck)

    def settle(self, x, y, feet, duck=False):
        """The feet height at (x, y) reached from `feet` (up a step of 18 at most, down 200 at most), or None."""
        if not self.free(x, y, feet, duck):
            for up in range(1, int(STEP) + 1):
                if self.free(x, y, feet + up, duck):
                    feet += up
                    break
            else:
                return None
        for drop in range(0, int(MAX_WATER_DROP)):
            if not self.free(x, y, feet - drop - 1, duck):
                if drop > MAX_DROP and not self.in_water(x, y, feet - drop):
                    return None  # a fall this long only into water
                return feet - drop
        return None

    def stand(self, x, y, z):
        """Standing origin (feet + 36) at (x, y) reached from origin height z, or None (the earlier interface)."""
        f = self.settle(x, y, z - STAND_H)
        return None if f is None else f + STAND_H


def route(bsp, a, b, cell=16):
    """A* over (cell x, cell y, level, crouched): two floors over the same cell (a stairwell under a landing)
    and the standing and crouched states are different nodes. Returns [(x, y, feet, duck), ...]."""
    sx, sy = a[0], a[1]
    f0 = bsp.settle(a[0], a[1], a[2] - STAND_H)
    assert f0 is not None, "start is not a standing position"
    goal = (round((b[0] - sx) / cell), round((b[1] - sy) / cell))
    goal_feet = b[2] - STAND_H
    level = lambda f: int(round(f / 32.0))
    s0 = (0, 0, level(f0), False)
    openq = [(0, s0)]
    came = {s0: None}
    feet = {s0: f0}
    jumps = {s0: False}
    cost = {s0: 0}
    found = None
    while openq:
        _, cur = heapq.heappop(openq)
        f = feet[cur]
        if abs(cur[0] - goal[0]) <= 1 and abs(cur[1] - goal[1]) <= 1 and abs(f - goal_feet) < 40 and not cur[3]:
            found = cur
            break
        if len(cost) > 600000:
            break
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            x, y = sx + (cur[0] + dx) * cell, sy + (cur[1] + dy) * cell
            for duck in (False, True):
                nf = bsp.settle(x, y, f, duck)
                jump = False
                if not duck and (nf is None or nf - f > STEP):
                    # out of a water channel onto a ledge 32 units up (c_sewer, x 1960..1992 at y 950): a jump,
                    # with room for the head above the start and over the edge
                    mx, my = sx + (cur[0] + dx / 2) * cell, sy + (cur[1] + dy / 2) * cell
                    # standing jump, or a crouch-jump (C held in the air: the 36-high hull) under a low edge
                    for jduck in (False, True):
                        up = bsp.settle(x, y, f + JUMP, jduck)
                        if (up is not None and STEP < up - f <= JUMP
                                and bsp.free(sx + cur[0] * cell, sy + cur[1] * cell, f + JUMP, jduck)
                                and bsp.free(mx, my, f + JUMP, jduck)):
                            nf, jump, duck = up, True, jduck
                            break
                if nf is None or (nf - f > STEP and not jump):
                    continue
                # the middle of the step has to be free too
                mx, my = sx + (cur[0] + dx / 2) * cell, sy + (cur[1] + dy / 2) * cell
                if not bsp.free(mx, my, max(f, nf) + 1, duck):
                    continue
                # a margin from the walls (a cost, not a ban: stairwells leave 16 units of room); a corner that
                # only fits with the hull touching it snagged the walk (natural-run-103229)
                tight = any(not bsp.free(x + ox, y + oy, nf + 1, duck)
                            for ox, oy in ((MARGIN, 0), (-MARGIN, 0), (0, MARGIN), (0, -MARGIN)))
                nxt = (cur[0] + dx, cur[1] + dy, level(nf), duck)
                c = (cost[cur] + math.hypot(dx, dy) * (DUCK_COST if duck else 1.0)
                     + (0.5 if nf < f - STEP else 0) + (4.0 if tight else 0) + (JUMP_COST if jump else 0))
                if c < cost.get(nxt, 1e18):
                    cost[nxt] = c
                    came[nxt] = cur
                    feet[nxt] = nf
                    jumps[nxt] = jump
                    h = math.hypot(nxt[0] - goal[0], nxt[1] - goal[1]) + abs(nf - goal_feet) / cell
                    heapq.heappush(openq, (c + h, nxt))
                if not duck:
                    break  # standing fits: no need for the crouched node
    if found is None:
        return None
    path = []
    while found is not None:
        mode = (3 if found[3] else 2) if jumps[found] else int(found[3])
        path.append((sx + found[0] * cell, sy + found[1] * cell, feet[found], mode))
        found = came[found]
    return path[::-1]


def simplify(bsp, path):
    """Keep only the points where a straight walk would hit a wall, change level or change posture."""
    if not path:
        return path
    out = [path[0]]
    i = 0
    while i < len(path) - 1:
        j = len(path) - 1
        while j > i + 1 and not clear(bsp, path[i], path[j], path[i:j + 1]):
            j -= 1
        out.append(path[j])
        i = j
    return out


def clear(bsp, a, b, seg):
    """a..b may replace seg only if seg already runs along the straight line (so a shortcut never jumps
    between floors that overlap), keeps one posture, and the line itself is free at the heights settle() finds."""
    duck = b[3] == 1
    if any(p[3] != b[3] or p[3] >= 2 for p in seg[1:-1]) or b[3] >= 2:
        return False  # one posture per stretch; a jump stays a waypoint of its own
    L = math.dist(a[:2], b[:2])
    if L > 0:
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        for p in seg:
            if abs((p[0] - a[0]) * uy - (p[1] - a[1]) * ux) > 12:
                return False
    n = max(2, int(L / 4))
    f = a[2]
    for k in range(1, n + 1):
        t = k / n
        x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        nf = bsp.settle(x, y, f, duck)
        if nf is None or nf - f > STEP:
            return False
        f = nf
    return abs(f - b[2]) < 2


def clearance(bsp, x, y, f, duck=False, reach=24):
    """How far the hull can move from (x, y) before touching a wall, in the worst of 8 directions."""
    worst = reach
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (0.7071, 0.7071), (0.7071, -0.7071), (-0.7071, 0.7071), (-0.7071, -0.7071)):
        d = 0
        while d < reach and bsp.free(x + dx * (d + 1), y + dy * (d + 1), f + 1, duck):
            d += 1
        worst = min(worst, d)
    return worst


def center(bsp, path):
    """Moves each waypoint (not the first) up to 8 units to where it has the most room on its own floor.
    A waypoint on the edge of a narrow doorway (12 units of room at 1278..1318, y 1100..1112) made the walk
    snag on the frame (natural-run-195515)."""
    out = [path[0]]
    for x, y, f, mode in path[1:]:
        duck = mode == 1
        if mode >= 2:  # a jump lands where the search found it
            out.append((x, y, f, mode))
            continue
        best = (clearance(bsp, x, y, f, duck), 0, x, y, f)
        for ox in range(-8, 9, 2):
            for oy in range(-8, 9, 2):
                nf = bsp.settle(x + ox, y + oy, f, duck)
                if nf is None or abs(nf - f) > 2:
                    continue
                cand = (clearance(bsp, x + ox, y + oy, nf, duck), -(ox * ox + oy * oy), x + ox, y + oy, nf)
                if cand > best:
                    best = cand
        out.append((best[2], best[3], best[4], mode))
    return out


def doorways(bsp, path, tight=8, step=4):
    """Adds a waypoint at the start and at the end of every narrow passage a straight stretch crosses (less than
    `tight` units of room), so that center() puts the walk through its middle. A 12-unit doorway in the middle of
    a stretch (1516..1528, y 1384..1412) snagged the walk on its frame (negatives-202727)."""
    out = [path[0]]
    for a, b in zip(path, path[1:]):
        duck = b[3] in (1, 3)
        if b[3] >= 2:
            out.append(b)
            continue
        n = max(1, int(math.dist(a[:2], b[:2]) / step))
        f = a[2]
        inside = False
        for k in range(1, n):
            t = k / n
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            f = bsp.settle(x, y, f, duck) or f
            narrow = clearance(bsp, x, y, f, duck, reach=tight) < tight
            if narrow != inside:
                out.append((x, y, f, b[3]))
                inside = narrow
        out.append(b)
    return out


if __name__ == "__main__":
    bsp = Bsp(sys.argv[1])
    a = tuple(map(float, sys.argv[2:5]))
    b = tuple(map(float, sys.argv[5:8]))
    cell = int(sys.argv[8]) if len(sys.argv) > 8 else 16
    p = route(bsp, a, b, cell)
    if p is None:
        print("null")
        sys.exit(1)
    pts = center(bsp, doorways(bsp, simplify(bsp, p)))
    print(json.dumps([[round(x, 1), round(y, 1), round(f + STAND_H, 1), int(d)] for x, y, f, d in pts]))
