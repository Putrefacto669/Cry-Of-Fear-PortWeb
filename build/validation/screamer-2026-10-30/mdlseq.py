# Sequences of a GoldSrc studio model (studiohdr_t / mstudioseqdesc_t, version 10)
import struct, sys
d = open(sys.argv[1], "rb").read()
ident, ver = struct.unpack_from("<4si", d, 0)
name = d[8:72].split(b"\0")[0].decode()
eye = struct.unpack_from("<3f", d, 76); mn = struct.unpack_from("<3f", d, 88); mx = struct.unpack_from("<3f", d, 100)
numbones, boneindex = struct.unpack_from("<ii", d, 140)
numseq, seqindex = struct.unpack_from("<ii", d, 164)
print(ident, ver, name, "bones", numbones, "seqs", numseq, "hull", [round(v) for v in mn], [round(v) for v in mx])
for i in range(numseq):
    o = seqindex + i * 176
    label = d[o:o+32].split(b"\0")[0].decode()
    fps, flags, activity, actweight, numevents, eventindex, numframes, numpivots, pivotindex, motiontype, motionbone = struct.unpack_from("<fiiiiiiiiii", d, o + 32)
    lin = struct.unpack_from("<3f", d, o + 76)
    bbmin = struct.unpack_from("<3f", d, o + 96); bbmax = struct.unpack_from("<3f", d, o + 108)
    print(f"  #{i} {label!r} fps={fps} frames={numframes} dur={numframes/fps if fps else 0:.2f}s motiontype={motiontype} linear={tuple(round(v,1) for v in lin)} bbox={[round(v) for v in bbmin]}..{[round(v) for v in bbmax]}")
for b in range(min(numbones, 4)):
    o = boneindex + b * 112
    bname = d[o:o+32].split(b"\0")[0].decode(); parent = struct.unpack_from("<i", d, o + 32)[0]
    print("  bone", b, bname, "parent", parent, "pos", [round(v, 1) for v in struct.unpack_from("<3f", d, o + 64)])
