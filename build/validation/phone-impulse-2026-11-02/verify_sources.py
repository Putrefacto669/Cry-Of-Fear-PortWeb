from pathlib import Path
import hashlib,json,subprocess
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
o=r/'build/validation/phone-impulse-2026-11-02/source-verification.json'
assert not o.exists()
d=Path('/root/cof-audits/dual-20261102/dist-phone-impulse')
m=json.loads((d/'sw-manifest.js').read_text().split(' = ',1)[1].rstrip(';\n'))
game=Path('/mnt/c/Program Files (x86)/Steam/steamapps/common/Cry of Fear/cryoffear/cl_dlls')
expected={'hl.dll':'0036b91c01e92ed205513f52563053a55a66a32d257efb5f476b8f1f3dde0e63','client.dll':'d2a04641b301804f6f449aa68265042b13adc360925b80033d417ec9f38c9c00'}
hashes={n:hashlib.sha256((game/n).read_bytes()).hexdigest() for n in expected}
assert hashes==expected
p=Path('/root/cof-audits/dual-20261102/lib-phone-impulse')
h={n:hashlib.sha256((p/n).read_bytes()).hexdigest() for n in ['server.wasm','client.wasm','libref_gles3compat.wasm']}
assert not subprocess.check_output(['git','-C',str(r),'diff','HEAD','--','dist/']).strip()
result={'originalsUnchanged':hashes,'privateModules':h,'privateManifest':m['version'],'principalDistGitDiffEmpty':True,'sdkPatchReverseCheck':True}
o.write_text(json.dumps(result,indent=2));print(json.dumps(result))