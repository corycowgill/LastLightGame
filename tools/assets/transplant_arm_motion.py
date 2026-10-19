"""Copy repaired arm tracks onto the shipped skin, retaining all vertex/weight data.

Usage: transplant_arm_motion.py PREPARED_CURRENT_SOURCE SHIPPED OUTPUT
"""
import copy
import json
import struct
import sys
from pathlib import Path

def load(path):
    raw=Path(path).read_bytes()
    size=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+size]),bytearray(raw[28+size:])

source, source_binary=load(sys.argv[1])
doc,binary=load(sys.argv[2])

def copy_accessor(index):
    a=copy.deepcopy(source['accessors'][index])
    view=source['bufferViews'][a['bufferView']]
    offset=view.get('byteOffset',0)+a.get('byteOffset',0)
    width={'SCALAR':1,'VEC4':4}[a['type']]
    length=a['count']*width*4
    while len(binary)%4: binary.append(0)
    start=len(binary);binary.extend(source_binary[offset:offset+length])
    doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':length})
    a['bufferView']=len(doc['bufferViews'])-1;a.pop('byteOffset',None)
    doc['accessors'].append(a)
    return len(doc['accessors'])-1

tracks=0
for animation in doc['animations']:
    if animation['name'] not in ('idle','walk','sprint','crouch_idle','crouch_walk'):continue
    prepared=next(a for a in source['animations'] if a['name']==animation['name'])
    for channel in animation['channels']:
        name=doc['nodes'][channel['target']['node']]['name']
        if channel['target']['path']!='rotation':continue
        if not (name in ('clavicle_R','upperarm_R','forearm_R','hand_R') or (name.endswith('_r') and any(f in name for f in ('thumb','index','middle','ring','pinky')))):continue
        track=next(c for c in prepared['channels'] if source['nodes'][c['target']['node']]['name']==name and c['target']['path']=='rotation')
        sampler=copy.deepcopy(prepared['samplers'][track['sampler']])
        for field in ('input','output'):sampler[field]=copy_accessor(sampler[field])
        channel['sampler']=len(animation['samplers']);animation['samplers'].append(sampler);tracks+=1
    animation['extras']['torch_arm_motion']='animated Idle_Torch grip with bounded source-gait sway; no frozen midpoint'

doc['buffers'][0]['byteLength']=len(binary)
while len(binary)%4:binary.append(0)
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
Path(sys.argv[3]).write_bytes(struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)
print('Repaired',tracks,'arm tracks; mesh, skin weights, bind matrices and other clips retained')
