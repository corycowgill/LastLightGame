"""Add original fitted site crouch/listening clips without changing the Hunter skin."""
import copy,json,struct,hashlib
from pathlib import Path
source=Path('docs/mesh2motion/multiview/hunter/site-export.glb');target=Path('public/models/hunter.glb')
def unpack(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),bytearray(raw[28+n:])
src,sbin=unpack(source);doc,binary=unpack(target)
def values(d,b,a):
 ac=d['accessors'][a];view=d['bufferViews'][ac['bufferView']];width={'SCALAR':1,'VEC3':3,'VEC4':4}[ac['type']];start=view.get('byteOffset',0)+ac.get('byteOffset',0)
 return [list(struct.unpack_from('<'+'f'*width,b,start+i*width*4)) for i in range(ac['count'])]
def add(rows,kind):
 while len(binary)%4:binary.append(0)
 off=len(binary);binary.extend(struct.pack('<'+'f'*sum(map(len,rows)),*[v for r in rows for v in r]));doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(binary)-off});doc['accessors'].append({'bufferView':len(doc['bufferViews'])-1,'componentType':5126,'count':len(rows),'type':kind});return len(doc['accessors'])-1
for name,original in [('crawl','Crouch_Walk'),('listen','Idle_Listening')]:
 if any(a['name']==name and a.get('extras',{}).get('floor_offset_m')==.22 for a in doc['animations']):continue
 doc['animations']=[a for a in doc['animations'] if a['name']!=name]
 anim=copy.deepcopy(next(a for a in src['animations'] if a['name']==original));anim['name']=name
 for c in anim['channels']:
  sampler=anim['samplers'][c['sampler']]
  rows=values(src,sbin,sampler['output']);times=values(src,sbin,sampler['input'])
  # Copy accessors explicitly, so texture repacking and prior adapters cannot
  # accidentally resolve a source index to unrelated data.
  sampler['input']=add(times,'SCALAR')
  if c['target']['path']=='translation':
   for row in rows:
    row[0],row[1]=rows[0][0],rows[0][1];row[2]+=.22
  rows[-1]=rows[0][:]
  sampler['output']=add(rows,'VEC3' if c['target']['path']=='translation' else 'VEC4')
 anim['extras']={'source':'Mesh2Motion','source_clip':original,'horizontal_root_motion_removed':True,'floor_offset_m':.22,'purpose':'low-clearance traversal' if name=='crawl' else 'stationary investigation'};doc['animations'].append(anim)
doc['buffers'][0]['byteLength']=len(binary)
while len(binary)%4:binary.append(0)
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);target.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary)
print('Extended Hunter with original fitted crouch/listening motion; mesh and skin unchanged')
