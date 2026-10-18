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
        for _ in range(48):
            neighbor = np.zeros_like(dense)
            np.add.at(neighbor, a, dense[b]); np.add.at(neighbor, b, dense[a])
            dense = 0.35*dense + 0.65*neighbor/np.maximum(1, degree[:, None])
        dense = dense[weld]
        # No influence from upper limbs may cross into the lower-leg region.
        arm = [i for i,n in enumerate(doc['skins'][0]['joints'])
               if any(part in doc['nodes'][n]['name'] for part in ('arm', 'hand', 'head'))]
        dense[np.ix_(p[:, 1] < p[:, 1].min()+np.ptp(p[:, 1])*0.45, arm)] = 0
        top = np.argsort(dense, axis=1)[:, -4:]
        selected = np.take_along_axis(dense, top, axis=1)
        selected /= selected.sum(axis=1, keepdims=True)
        joints[:] = top
        weights[:] = selected
        print('Smoothed', len(p), 'vertices across', count, 'welded positions')
path.write_bytes(raw)
