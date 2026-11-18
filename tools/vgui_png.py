#!/usr/bin/env python3
"""vgui_png.py - the interface pictures (gfx/vgui) as PNG files the page fetches when it shows them.

Only hud.js reads gfx/vgui (the engine and the game DLLs do not): notes, items, weapons, the passwords,
the keypad, the introductions in seven languages... 45 MiB of TGA, 9.3 MiB compressed, that were in
boot.data and so had to be downloaded before the menu could open. package.sh now leaves them out of
boot (except KEEP, needed the moment the menu or the HUD appears) and hud.js loadTga() fetches
vgui/<path in lower case>.png when the file is not in the virtual file system.

    vgui_png.py <stage/boot/cryoffear/gfx/vgui> <dist/vgui> <list of converted files>

The list holds the converted TGA paths relative to the vgui folder, as they are in the stage, so that
package.sh can leave exactly those out of boot. A TGA hud.js could not read either (only type 2,
24/32 bpp) stays in boot as it is. Files other than TGA (a .psd, a Thumbs.db) are listed too: nothing
reads them.
"""
import struct
import sys
import zlib
from pathlib import Path

# shown at once by the menu or the HUD (hud.js): kept in boot, 0.2 MiB compressed
KEEP_DIRS = ("menu/",)
KEEP = {
    "menu_logo.tga", "640_healthbar.tga", "640_healthbar_bar.tga", "640_healthbar_barempty.tga",
    "640_staminabar.tga", "640_staminabar_bar.tga", "640_staminabar_barempty.tga",
    "640_hudelem_smsicon.tga", "inventory_weapons.tga", "inventory_items.tga",
}


def keep(rel: str) -> bool:
    rel = rel.lower()
    return rel in KEEP or rel.startswith(KEEP_DIRS) or rel.startswith("640_logo_")


def chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def tga_to_png(data: bytes):
    """The same TGA hud.js decodes (type 2, 24/32 bpp, descriptor bit 5 = top origin), or None."""
    id_len, image_type = data[0], data[2]
    w, h = data[12] | (data[13] << 8), data[14] | (data[15] << 8)
    bpp, desc = data[16], data[17]
    if image_type != 2 or bpp not in (24, 32) or not w or not h:
        return None
    px = bpp >> 3
    start = 18 + id_len
    size = w * h * px
    src = data[start:start + size]
    if len(src) != size:
        return None
    # BGR(A) -> RGB(A)
    out = bytearray(size)
    out[0::px], out[1::px], out[2::px] = src[2::px], src[1::px], src[0::px]
    if px == 4:
        out[3::px] = src[3::px]
    stride = w * px
    rows = [out[y * stride:(y + 1) * stride] for y in range(h)]
    if not desc & 0x20:
        rows.reverse()  # bottom origin
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    header = struct.pack(">IIBBBBB", w, h, 8, 6 if px == 4 else 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def main() -> int:
    src, dst, listing = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    dst.mkdir(parents=True, exist_ok=True)
    moved, seen, png_total, tga_total = [], {}, 0, 0
    for p in sorted(src.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(src).as_posix()
        if not rel.lower().endswith(".tga"):
            moved.append(rel)  # .psd, Thumbs.db: read by nothing
            continue
        if keep(rel):
            continue
        png = tga_to_png(p.read_bytes())
        if png is None:
            print(f"  vgui: {rel} stays in boot (not a type 2 TGA)")
            continue
        out = rel.lower()[:-4] + ".png"
        if out in seen:
            raise SystemExit(f"vgui: {rel} and {seen[out]} have the same lower-case name")
        seen[out] = rel
        (dst / out).parent.mkdir(parents=True, exist_ok=True)
        (dst / out).write_bytes(png)
        moved.append(rel)
        png_total += len(png)
        tga_total += p.stat().st_size
    listing.write_text("".join(f"{r}\n" for r in moved))
    print(f"  vgui          {len(seen)} PNG, {png_total / 2**20:.1f} MiB (TGA {tga_total / 2**20:.1f} MiB) fuera de boot")
    return 0


if __name__ == "__main__":
    sys.exit(main())
