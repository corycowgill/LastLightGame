"""Remove thigh influence from the ribcage and arm influence from torso cloth.

Spatial tapers preserve shoulder/sleeve transitions; geometry and rig are retained.
Usage: repair_upper_body_weights.py INPUT OUTPUT
"""
import json
import struct
import sys
from pathlib import Path
import numpy as np

raw=bytearray(Path(sys.argv[1]).read_bytes())
length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length]); start=28+length
def array(index,width):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    return np.ndarray((a['count'],width),dtype={5126:'<f4',5123:'<u2',5121:'u1',5125:'<u4'}[a['componentType']],buffer=raw,offset=start+v.get('byteOffset',0)+a.get('byteOffset',0))
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
skin=doc['skins'][0]
names=[doc['nodes'][n]['name'] for n in skin['joints']]
bind=array(skin['inverseBindMatrices'],16)
centers=np.array([np.linalg.inv(m.reshape(4,4).T)[:3,3] for m in bind])
spine=names.index('spine'); mid=names.index('spine_mid'); hip=centers[names.index('hips'),1]
for mesh in doc['meshes']:
    for primitive in mesh['primitives']:
        a=primitive['attributes'];p=array(a['POSITION'],3);j=array(a['JOINTS_0'],4);w=array(a['WEIGHTS_0'],4)
        dense=np.zeros((len(p),len(names)))
        for k in range(4):np.add.at(dense,(np.arange(len(p)),j[:,k]),w[:,k])
        transferred=np.zeros(len(p))
        legs=[i for i,n in enumerate(names) if any(n.startswith(part) for part in ('thigh','shin','foot','ball','toe'))]
        keep=1-smooth(hip+0.03,hip+0.16,p[:,1])
        removed=dense[:,legs]*(1-keep[:,None]);dense[:,legs]*=keep[:,None];transferred+=removed.sum(axis=1)
        for side,sign in [('L',1),('R',-1)]:
            bones=[i for i,n in enumerate(names) if n.lower().endswith('_'+side.lower()) and any(part in n.lower() for part in ('clavicle','arm','hand','thumb','index','middle','ring','pinky'))]
            lateral=smooth(0.09,0.25,p[:,0]*sign)
            shoulder=smooth(1.04,1.19,p[:,1])
            keep=lateral+shoulder*(1-lateral)
            removed=dense[:,bones]*(1-keep[:,None]);dense[:,bones]*=keep[:,None];transferred+=removed.sum(axis=1)
        mix=smooth(centers[spine,1],centers[mid,1],p[:,1])
        dense[:,spine]+=transferred*(1-mix);dense[:,mid]+=transferred*mix
        # Fingers must not tug the forearm/sleeve above the wrist crease.
        for side in ('L','R'):
            hand=names.index('hand_'+side); forearm=names.index('forearm_'+side)
            fingers=[i for i,n in enumerate(names) if n.endswith('_'+side.lower()) and any(f in n for f in ('thumb','index','middle','ring','pinky'))]
            keep=1-smooth(centers[hand,1]+0.02,centers[hand,1]+0.07,p[:,1])
            removed=dense[:,fingers]*(1-keep[:,None]);dense[:,fingers]*=keep[:,None]
            dense[:,forearm]+=removed.sum(axis=1)
        top=np.argsort(dense,axis=1)[:,-4:];selected=np.take_along_axis(dense,top,axis=1)
        selected/=selected.sum(axis=1,keepdims=True)
        j[:]=top;w[:]=selected
Path(sys.argv[2]).write_bytes(raw)
print('Repaired upper-body influence regions without changing mesh topology or bind matrices')
