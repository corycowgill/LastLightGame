"""Reuse accepted neural masonry as paving: transforms only, no authored geometry.

The separate slab reconstruction was rejected. This is explicitly a derivative
of arc_wall_2m, not a claim that the failed floor inference succeeded.
"""
import json
import struct
import hashlib
import shutil
from pathlib import Path
import numpy as np
import trimesh

root=Path(__file__).resolve().parents[2]
directory=root/'public/models/catalog'
manifest_path=directory/'manifest.json';manifest=json.loads(manifest_path.read_text())
source=next(a for a in manifest['assets'] if a['id']=='arc_wall_2m')
path=directory/source['file']; bounds=trimesh.load(path,force='scene',process=False).bounds
rotation=np.array([[1,0,0],[0,0,1],[0,-1,0]])
corners=np.array([[bounds[i,0],bounds[j,1],bounds[k,2]] for i in (0,1) for j in (0,1) for k in (0,1)])@rotation.T
scale=np.array([2,.12,2])/(corners.max(axis=0)-corners.min(axis=0))
corners*=scale
matrix=np.eye(4);matrix[:3,:3]=np.diag(scale)@rotation
matrix[:3,3]=[-(corners[:,0].max()+corners[:,0].min())/2,-corners[:,1].min(),-(corners[:,2].max()+corners[:,2].min())/2]
raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length]);binary=raw[20+length:]
for scene in doc['scenes']:
    index=len(doc['nodes']);doc['nodes'].append({'name':'NeuralStonePaving','matrix':matrix.T.flatten().tolist(),'children':scene['nodes']});scene['nodes']=[index]
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
raw=struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary
destination=directory/'arc_floor_2m.glb';destination.write_bytes(raw)
entry={**source,'id':'arc_floor_2m','name':'Stone paving — neural masonry derivative','file':destination.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'derived_from':'arc_wall_2m','derivation':'Rotate and fit accepted neural masonry to 2 × 0.12 × 2 m; no new geometry','finishing':'Neural masonry LOD1; transform-only paving adaptation','target_size_m':2,'scale_axis':'x'}
manifest['assets']=[a for a in manifest['assets'] if a['id']!='arc_floor_2m']+[entry]
manifest['assets'].sort(key=lambda a:a['id']);manifest_path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Derived neural stone paving',len(raw),'bytes')
provenance=root/'docs/catalog-assets/arc_floor_2m';provenance.mkdir(parents=True,exist_ok=True)
for name in ['generation.json','preparation.json']:
    previous=provenance/name
    if previous.exists():
        old=json.loads(previous.read_text())
        if old.get('asset_id')=='arc_floor_2m':
            old['qa_status']='rejected';(provenance/('rejected-'+name)).write_text(json.dumps(old,indent=2))
    shutil.copy2(root/'docs/catalog-assets/arc_wall_2m'/name,previous)
(provenance/'derivation.json').write_text(json.dumps(entry,indent=2),encoding='utf-8')
