# Clean, isolated build: canonical tree copied, reset to its upstream commits, unified patches applied.
set -euo pipefail
CANON=/root/cof-audits/audit-D3Kl5uly
CLEAN=/root/cof-audits/clean-20261108
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
[ -e $CLEAN ] && { echo "exists: $CLEAN"; exit 1; }
mkdir -p $CLEAN/engine $CLEAN/game
cp -a $CANON/engine/xash3d-fwgs $CLEAN/engine/
cp -a $CANON/game/hlsdk-portable $CLEAN/game/
for d in $CLEAN/engine/xash3d-fwgs $CLEAN/game/hlsdk-portable; do
  git -C $d reset -q --hard; git -C $d clean -qfdx
  git -C $d submodule foreach -q --recursive 'git reset -q --hard; git clean -qfdx'
  echo "$d $(git -C $d rev-parse HEAD) dirty=$(git -C $d status --porcelain --ignore-submodules | wc -l)"
done
export COF_WORK=$CLEAN
cd "$REPO"
bash tools/wsl/patches.sh apply
echo "--- compare with canonical (should be identical diffs)"
for p in engine/xash3d-fwgs game/hlsdk-portable; do
  git -C $CLEAN/$p add -N . ; git -C $CANON/$p add -N .
  cmp <(git -C $CLEAN/$p diff --ignore-submodules) <(git -C $CANON/$p diff --ignore-submodules) && echo "$p diff identical"
done
time bash tools/wsl/build_engine.sh > $CLEAN/engine.log 2>&1; echo "engine exit $?"
time bash tools/wsl/build_game.sh > $CLEAN/game.log 2>&1; echo "game exit $?"
find $CLEAN/build -name '*.wasm' -newer $CLEAN/engine.log -o -name '*.wasm' -path '*engine*' | sort | while read f; do echo "$(sha256sum $f | cut -c1-16) ${f#$CLEAN/build/}"; done
