"""Repair discontinuous site weights on the original mesh; no geometry changes.

Weld texture-seam vertices for the weight solve, diffuse over mesh adjacency,
then retain four normalized influences. Skeleton and animation are unchanged.
Requires NumPy. Run before grounding, since corrected skin affects mesh bounds.
"""
import json
import struct
import sys
from pathlib import Path
import numpy as np

path = Path(sys.argv[1])
raw = bytearray(path.read_bytes())
size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20+size])
binary = 28+size
types = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: '<u1'}

def array(index, width):
    a = doc['accessors'][index]
    v = doc['bufferViews'][a['bufferView']]
    offset = binary + v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.ndarray((a['count'], width), dtype=types[a['componentType']],
                      buffer=raw, offset=offset)

for mesh in doc['meshes']:
    for primitive in mesh['primitives']:
        attrs = primitive['attributes']
        p = array(attrs['POSITION'], 3)
        joints = array(attrs['JOINTS_0'], 4)
        weights = array(attrs['WEIGHTS_0'], 4)
        indices = array(primitive['indices'], 1).reshape(-1, 3)
        _, weld = np.unique(np.round(p, 5), axis=0, return_inverse=True)
        count = int(weld.max())+1
        influences = len(doc['skins'][0]['joints'])
        dense = np.zeros((count, influences), dtype=np.float64)
        for k in range(4): np.add.at(dense, (weld, joints[:, k]), weights[:, k])
        dense /= np.bincount(weld)[:, None]
        triangles = weld[indices]
        edges = np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]])
        edges = np.unique(np.sort(edges, axis=1), axis=0)
        a, b = edges[:, 0], edges[:, 1]
        degree = np.bincount(np.concatenate([a, b]), minlength=count)
        for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 48):
            neighbor = np.zeros_like(dense)
            np.add.at(neighbor, a, dense[b]); np.add.at(neighbor, b, dense[a])
            dense = 0.35*dense + 0.65*neighbor/np.maximum(1, degree[:, None])
        dense = dense[weld]
        # Finger influences from automatic binding can leak up the sleeves.
        # Taper them outside each hand and transfer their mass to that wrist.
        skin = doc['skins'][0]
        inverse_bind = array(skin['inverseBindMatrices'], 16)
        bone_names = [doc['nodes'][n]['name'] for n in skin['joints']]
        for side in ('l', 'r'):
            hand = next((i for i,n in enumerate(bone_names)
                         if n.lower() == 'hand_'+side), None)
            fingers = [i for i,n in enumerate(bone_names)
                       if n.endswith('_'+side) and any(f in n for f in
                           ('thumb', 'index', 'middle', 'ring', 'pinky'))]
            if hand is None or not fingers: continue
            center = np.linalg.inv(inverse_bind[hand].reshape(4,4).T)[:3,3]
            radius = np.ptp(p[:,1])*0.065
            keep = np.clip((radius*1.5-np.linalg.norm(p-center,axis=1))/(radius*0.5),0,1)
            removed = dense[:,fingers]*(1-keep[:,None])
            dense[:,fingers] *= keep[:,None]
            dense[:,hand] += removed.sum(axis=1)
        # No influence from upper limbs may cross into the lower-leg region.
        arm = [i for i,n in enumerate(doc['skins'][0]['joints'])
               if any(part in doc['nodes'][n]['name'] for part in ('arm', 'hand', 'head'))]
        before_exclusion = dense.copy()
        dense[np.ix_(p[:, 1] < p[:, 1].min()+np.ptp(p[:, 1])*0.45, arm)] = 0
        empty = dense.sum(axis=1) < 1e-12
        dense[empty] = before_exclusion[empty]
        # Solve again under the GPU's four-influence constraint. A single
        # final truncation otherwise introduces fresh discontinuities where
        # adjacent vertices choose different fourth and fifth bones.
        welded = np.zeros((count, influences), dtype=np.float64)
        np.add.at(welded, weld, dense)
        welded /= np.bincount(weld)[:,None]
        for _ in range(240):
            top = np.argsort(welded,axis=1)[:,-4:]
            sparse = np.zeros_like(welded)
            np.put_along_axis(sparse,top,np.take_along_axis(welded,top,axis=1),axis=1)
            sparse /= np.maximum(sparse.sum(axis=1,keepdims=True),1e-12)
            neighbor = np.zeros_like(sparse)
            np.add.at(neighbor,a,sparse[b]); np.add.at(neighbor,b,sparse[a])
            welded = 0.8*sparse+0.2*neighbor/np.maximum(1,degree[:,None])
        dense = welded[weld]
        dense[np.ix_(p[:,1] < p[:,1].min()+np.ptp(p[:,1])*0.45,arm)] = 0
        empty = dense.sum(axis=1) < 1e-12
        dense[empty] = before_exclusion[empty]
        top = np.argsort(dense, axis=1)[:, -4:]
        selected = np.take_along_axis(dense, top, axis=1)
        selected /= selected.sum(axis=1, keepdims=True)
        joints[:] = top
        weights[:] = selected
        print('Smoothed', len(p), 'vertices across', count, 'welded positions')
path.write_bytes(raw)
