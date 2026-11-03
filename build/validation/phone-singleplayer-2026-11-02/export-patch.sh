set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
S=/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable
B=/root/cof-audits/dual-20261102/root-before-singleplayer.patch
[ ! -e "$B" ]
cp "$R/patches/hlsdk/0001-root.patch" "$B"
git -C "$S" diff --binary > "$R/patches/hlsdk/0001-root.patch"
git -C "$S" apply --reverse --check "$R/patches/hlsdk/0001-root.patch"
echo 'SDK patch reverse-check PASS'