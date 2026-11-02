set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
COF_STAGE=/root/cof-audits/extras-20261101/stage COF_ORIGINAL='/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear' python3 -B "$R/tools/e2e/test_extras_maps.py"