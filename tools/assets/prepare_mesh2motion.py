"""Adapt a preserved Mesh2Motion GLB export without replacing mesh or skinning.

Maps clips/bones to the game's contract, removes horizontal root travel, and
borrows the site's torch-carry arm pose for locomotion. Raw export is untouched.
"""
import copy
import json
import struct
import sys
from pathlib import Path
from torch_arm_motion import motion_rows

source, destination = map(Path, sys.argv[1:3])
kind = sys.argv[3] if len(sys.argv) > 3 else 'torchbearer'
raw = source.read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20+size])
binary = bytearray(raw[28+size:])
names = {'pelvis': 'hips', 'spine_01': 'spine', 'spine_02': 'spine_mid',
         'spine_03': 'chest', 'neck_01': 'neck'}
for side in ('l', 'r'):
    for old, new in [('clavicle', 'clavicle'), ('upperarm', 'upperarm'),
                     ('lowerarm', 'forearm'), ('hand', 'hand'),
                     ('thigh', 'thigh'), ('calf', 'shin'), ('foot', 'foot')]:
        names[f'{old}_{side}'] = f'{new}_{side.upper()}'
for node in doc['nodes']:
    node['name'] = names.get(node.get('name'), node.get('name', 'node'))

def values(index):
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[accessor['type']]
    offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    return [list(struct.unpack_from('<'+'f'*width, binary, offset+i*width*4))
            for i in range(accessor['count'])]

def append_values(rows, kind):
    while len(binary) % 4: binary.append(0)
    offset = len(binary)
    binary.extend(struct.pack('<'+'f'*sum(map(len, rows)), *[v for r in rows for v in r]))
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(binary)-offset})
    doc['accessors'].append({'bufferView': len(doc['bufferViews'])-1,
                            'componentType': 5126, 'count': len(rows), 'type': kind})
    return len(doc['accessors'])-1

original = {a['name']: a for a in doc['animations']}
mapping = {'idle': 'Idle_Torch', 'walk': 'Walk', 'sprint': 'Sprint',
           'crouch_idle': 'Crouch_Idle', 'crouch_walk': 'Crouch_Walk',
           'interact': 'Interact', 'relight': 'Interact', 'burst': 'Spell_Simple_Shoot',
           'death': 'Death_A', 'quick_turn': 'Turn_Left_90', 'chalk': 'PickUp_Table',
           'refill': 'PickUp_Table', 'extinguish': 'Idle_Listening', 'fear': 'Shivering'}
loops = {'idle', 'walk', 'sprint', 'crouch_idle', 'crouch_walk'}
if kind == 'hunter':
    mapping = {'idle': 'Zombie_Idle', 'search': 'Zombie_Walk',
               'pursue': 'Sprint', 'flee': 'Run_Stealth',
               'capture': 'Melee_Hook', 'banish': 'Death_A'}
    loops = {'idle', 'search', 'pursue', 'flee'}
carry = {}
for channel in original.get('Idle_Torch', {'channels': []})['channels']:
    node = channel['target']['node']
    bone_name = doc['nodes'][node]['name']
    if bone_name in ('clavicle_R', 'upperarm_R', 'forearm_R', 'hand_R') or (
            bone_name.endswith('_r') and any(f in bone_name for f in
                ('thumb', 'index', 'middle', 'ring', 'pinky'))):
        sampler = original['Idle_Torch']['samplers'][channel['sampler']]
        samples = values(sampler['output'])
        carry[node] = (values(sampler['input']), samples)

animations = []
for name, site_name in mapping.items():
    animation = copy.deepcopy(original[site_name])
    animation['name'] = name
    for channel in animation['channels']:
        target = channel['target']
        sampler = animation['samplers'][channel['sampler']]
        rows = values(sampler['output'])
        if target['path'] == 'translation':
            # Site root uses Z-up beneath a -90-degree X root transform.
            for row in rows:
                row[0], row[1] = rows[0][0], rows[0][1]
                # Correct the library's original pelvis height after fitting this
                # shorter torso. Keep vertical gait bounce and crouch movement.
                if kind == 'torchbearer':
                    row[2] -= 0.03 if name.startswith('crouch') else 0.11
        elif kind == 'torchbearer' and name in loops and target['path'] == 'rotation' and target['node'] in carry:
            rows = motion_rows(name, doc['nodes'][target['node']]['name'], values(sampler['input']), rows, carry[target['node']])
        if name in loops: rows[-1] = rows[0][:]
        sampler['output'] = append_values(rows, 'VEC3' if target['path'] == 'translation' else 'VEC4')
    animation['extras'] = {'source_clip': site_name, 'source': 'Mesh2Motion',
                           'horizontal_root_motion_removed': True,
                           'torch_arm_pose': 'Idle_Torch' if name in loops else None}
    animations.append(animation)
doc['animations'] = animations
hand = next(i for i,n in enumerate(doc['nodes']) if n['name'] == 'hand_R')
doc['nodes'][hand].setdefault('children', []).append(len(doc['nodes']))
doc['nodes'].append({'name': 'torch_socket', 'translation': [0, 0, 0]})
# Site preview faces +Z; the game and catalog viewer use -Z character forward.
scene = doc['scenes'][doc.get('scene', 0)]
wrapper = len(doc['nodes'])
doc['nodes'].append({'name': 'game_forward', 'rotation': [0, 1, 0, 0],
                     'children': scene['nodes'][:]})
scene['nodes'] = [wrapper]
doc['buffers'][0]['byteLength'] = len(binary)
while len(binary) % 4: binary.append(0)
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' '*((-len(encoded)) % 4)
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(binary))+
                       struct.pack('<II', len(encoded), 0x4e4f534a)+encoded+
                       struct.pack('<II', len(binary), 0x004e4942)+binary)
print(destination, len(binary), 'binary bytes; site rig/skin retained')
