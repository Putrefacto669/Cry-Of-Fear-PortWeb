set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
S=/root/cof-audits/audit-D3Kl5uly/game/hlsdk-portable
cp "$R/patches/hlsdk/0001-root.patch" /root/cof-audits/dual-20261102/root-before-hands.patch
git -C "$S" diff --binary > "$R/patches/hlsdk/0001-root.patch"
git -C "$S" apply --reverse --check "$R/patches/hlsdk/0001-root.patch"
echo 'SDK root patch reverse-check PASS'