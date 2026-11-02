set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/extras-20261101
WORK=/root/cof-audits/audit-D3Kl5uly
GAME='/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear'
[ ! -e "$TASK/stage" ]
mkdir "$TASK/stage"
cp -a "$WORK/stage/." "$TASK/stage/"
for map in c_game_menu1 c_intro c_nightmare c_start c_start2 c_apartment1 c_apartment2 c_apartment3 c_apartment4 c_apartment5 c_apartmentsick; do
 python3 -B "$REPO/tools/stage_map.py" "$GAME" "$map" "$TASK/stage" --texcomp "$WORK/build/tools/texcomp"
done