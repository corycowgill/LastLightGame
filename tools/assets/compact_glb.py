"""Resize embedded textures without reauthoring geometry, UVs, rigs or materials."""
import io
import json
import struct
from pathlib import Path
from PIL import Image


def normalize_static(path, axis, target, align_longest=False, thin_y=False):
    """Fit a rigid generated mesh after reduction; never use unskinned bounds on actors."""
    import numpy as np
    import trimesh
    path = Path(path)
    scene = trimesh.load(path, force='scene', process=False)
    bounds = scene.bounds; dimensions = scene.extents
    rotation = np.eye(3)
    destination = 'xyz'.index(axis)
    source = int(np.argmin(dimensions)) if thin_y else int(np.argmax(dimensions))
    desired = 1 if thin_y else destination
    if (align_longest or thin_y) and source != desired:
        a, b = np.eye(3)[source], np.eye(3)[desired]
        cross = np.cross(a,b)
        k = np.array([[0,-cross[2],cross[1]],[cross[2],0,-cross[0]],[-cross[1],cross[0],0]])
        rotation = np.eye(3)+k+k@k
    corners = np.array([[bounds[i,0],bounds[j,1],bounds[k,2]] for i in (0,1) for j in (0,1) for k in (0,1)]) @ rotation.T
    factor = target / (corners[:,destination].max()-corners[:,destination].min())
    corners *= factor
    transform = np.eye(4); transform[:3,:3] = rotation*factor
    transform[:3,3] = [-(corners[:,0].max()+corners[:,0].min())/2,-corners[:,1].min(),-(corners[:,2].max()+corners[:,2].min())/2]
    raw = path.read_bytes(); length = struct.unpack_from('<I',raw,12)[0]
    doc = json.loads(raw[20:20+length]); binary = raw[20+length:]
    for entry in doc['scenes']:
        index = len(doc['nodes']); doc['nodes'].append({'name':'MetricPlacement','matrix':transform.T.flatten().tolist(),'children':entry['nodes']}); entry['nodes']=[index]
    encoded = json.dumps(doc,separators=(',',':')).encode(); encoded += b' '*((-len(encoded))%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)


def compact(path, max_size=512):
    path = Path(path)
    raw = path.read_bytes()
    json_size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + json_size])
    offset = 20 + json_size
    bin_size, kind = struct.unpack_from('<II', raw, offset)
    if kind != 0x004e4942: raise ValueError('Missing GLB binary')
    binary = raw[offset + 8:offset + 8 + bin_size]
    color_images = set()
    for material in doc.get('materials', []):
        for texture in [material.get('pbrMetallicRoughness', {}).get('baseColorTexture'), material.get('emissiveTexture')]:
            if texture: color_images.add(doc['textures'][texture['index']]['source'])
    replacements = {}
    for index, image in enumerate(doc.get('images', [])):
        view_index = image.get('bufferView')
        if view_index is None: raise ValueError('Expected embedded image')
        view = doc['bufferViews'][view_index]
        start = view.get('byteOffset', 0)
        with Image.open(io.BytesIO(binary[start:start + view['byteLength']])) as decoded:
            decoded.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            opaque = 'A' not in decoded.getbands() or decoded.getchannel('A').getextrema() == (255, 255)
            if index in color_images and opaque:
                decoded.convert('RGB').save(output, format='JPEG', quality=92, optimize=True)
                image['mimeType'] = 'image/jpeg'
            else:
                decoded.save(output, format='PNG', optimize=True)
                image['mimeType'] = 'image/png'
            replacements[view_index] = output.getvalue()
    rebuilt = bytearray()
    for index, view in enumerate(doc['bufferViews']):
        rebuilt.extend(b'\0' * ((-len(rebuilt)) % 4))
        start = view.get('byteOffset', 0)
        data = replacements.get(index, binary[start:start + view['byteLength']])
        view['byteOffset'] = len(rebuilt); view['byteLength'] = len(data)
        rebuilt.extend(data)
    doc['buffers'][0]['byteLength'] = len(rebuilt)
    rebuilt.extend(b'\0' * ((-len(rebuilt)) % 4))
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    total = 12 + 8 + len(encoded) + 8 + len(rebuilt)
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded + struct.pack('<II', len(rebuilt), 0x004e4942) + rebuilt)


if __name__ == '__main__':
    import sys
    compact(sys.argv[1])
