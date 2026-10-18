"""Install a checked neural mesh bound to an existing animation skeleton."""
import hashlib
import json
import shutil
import struct
import sys
from pathlib import Path
from compact_glb import compact
from validate_glb import inspect

root = Path(__file__).resolve().parents[2]
asset, source = sys.argv[1], Path(sys.argv[2])
kind = asset.removeprefix('cha_')
errors = inspect(source, 'hunter' if kind == 'stalker' else kind)
if errors: raise ValueError(errors)
destination = root/'public/models/catalog'/f'{asset}.glb'
manifest_path = root/'public/models/catalog/manifest.json'
manifest = json.loads(manifest_path.read_text())
entry = next(a for a in manifest['assets'] if a['id'] == asset)
shutil.copy2(source,destination); compact(destination)
raw = destination.read_bytes(); length = struct.unpack_from('<I',raw,12)[0]
doc = json.loads(raw[20:20+length]); binary_chunk = raw[20+length:]
if kind == 'stalker':
    names = {'search':'investigate','pursue':'investigate_fast','capture':'recoil','banish':'death'}
    for animation in doc['animations']: animation['name'] = names.get(animation['name'],animation['name'])
encoded=json.dumps(doc,separators=(',',':')).encode();encoded += b' '*((-len(encoded))%4)
raw=struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary_chunk))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary_chunk
destination.write_bytes(raw)
entry.update(sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),animation_binding='automatic skin weights; existing authored animation rig and clips',forward_axis='-Z',clips=[a['name'] for a in doc['animations']],skin_joints=len(doc['skins'][0]['joints']))
if kind == 'torchbearer':
    entry['animation_binding'] = 'anatomical region weights; fitted foot-targeted gait and stable torch-carry clips baked into GLB'
manifest_path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
shutil.copy2(destination,root/'public/models'/f'{kind}.glb')
primary_path = root/'public/models/manifest.json'
primary = json.loads(primary_path.read_text())
primary['assets'] = [a for a in primary['assets'] if a['id'] != asset] + [{**entry,'file':f'{kind}.glb'}]
primary_path.write_text(json.dumps(primary,indent=2),encoding='utf-8')
print('Installed neural character', asset, len(raw), 'bytes')
