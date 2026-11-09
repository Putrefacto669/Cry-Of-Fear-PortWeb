set -e
export COF_WORK=/root/cof-audits/audit-D3Kl5uly
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
MAPS="c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick"
OUT=/root/cof-audits/modellight/dist
mkdir -p /root/cof-audits/modellight; rm -rf $OUT
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
cd "$REPO"; COF_BUILD=/root/cof-audits/clean-20261108/build COF_DIST=$OUT bash tools/wsl/package.sh $MAPS 2>&1 | grep -E "dist listo|rror|sw-manifest" | head
