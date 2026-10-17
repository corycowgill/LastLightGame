"""Bind a TRELLIS mesh to the existing animation rig; never creates replacement geometry.

blender --background --python tools/assets/bind_generated_character.py -- SOURCE.glb RIG.glb OUTPUT.glb
The geometry remains neural reconstruction. Skinning uses region-constrained
distance weights; existing authored clips are retained, not claimed as AI motion.
"""
import bpy
import sys
import math
from pathlib import Path
from mathutils import Vector, Matrix

source, rig_path, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
is_player = rig_path.stem == "torchbearer"
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(rig_path.resolve()))
rig = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
old_points = [obj.matrix_world @ vertex.co for obj in bpy.context.scene.objects if obj.type == 'MESH' for vertex in obj.data.vertices]
old_height = max(v.z for v in old_points) - min(v.z for v in old_points)
for obj in list(bpy.context.scene.objects):
    if obj.type == 'MESH': bpy.data.objects.remove(obj, do_unlink=True)
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks: track.mute = True
for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
meshes = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == 'MESH']
if not meshes: raise RuntimeError('Generated source contains no mesh')
points = [mesh.matrix_world @ vertex.co for mesh in meshes for vertex in mesh.data.vertices]
source_height = max(v.z for v in points) - min(v.z for v in points)
rig.scale *= source_height / old_height
bpy.context.view_layer.update()
# Bake imported scene transforms into mesh coordinates, expressed in rig space.
for mesh in meshes:
    # TRELLIS front faces +Z in glTF; runtime actors face -Z (+Y in Blender).
    transform = Matrix.Rotation(math.pi, 4, 'Z') @ rig.matrix_world.inverted() @ mesh.matrix_world
    mesh.data.transform(transform)
    mesh.parent = rig
    mesh.matrix_parent_inverse = Matrix.Identity(4)
    mesh.matrix_basis = Matrix.Identity(4)

height = max(v.co.z for m in meshes for v in m.data.vertices) - min(v.co.z for m in meshes for v in m.data.vertices)
# Bind in the reconstructed A-pose, then deform into the existing carrying rest pose.
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for side, sign in ([('L', -1), ('R', 1)] if is_player else []):
    shoulder = Vector((sign * .145 * height, 0, .80 * height))
    elbow = Vector((sign * .24 * height, 0, .665 * height))
    hand = Vector((sign * .335 * height, 0, .565 * height))
    for name, head, tail in [(f'upperarm_{side}', shoulder, elbow), (f'forearm_{side}', elbow, hand), (f'hand_{side}', hand, hand + Vector((sign * .04 * height,0,-.02 * height)))]:
        bone = rig.data.edit_bones.get(name)
        if bone: bone.head = head; bone.tail = tail; bone.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')

def fallback_weights(mesh):
    # Four nearest bone segments; keep torso influence from crossing into limbs.
    for group in list(mesh.vertex_groups): mesh.vertex_groups.remove(group)
    bones = list(rig.data.bones)
    groups = {b.name: mesh.vertex_groups.new(name=b.name) for b in bones}
    cloth = set()
    if is_player and mesh.data.uv_layers.active and mesh.active_material:
        material = mesh.active_material
        shader = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'),None)
        linked = shader.inputs['Base Color'].links if shader else []
        image = getattr(linked[0].from_node,'image',None) if linked else None
        if image:
            width, image_height = image.size; pixels = list(image.pixels)
            for loop in mesh.data.loops:
                uv=mesh.data.uv_layers.active.data[loop.index].uv
                x=max(0,min(width-1,int(uv.x*width))); y=max(0,min(image_height-1,int(uv.y*image_height)))
                r,g,b=pixels[(y*width+x)*4:(y*width+x)*4+3]
                if r > g*1.12 and g > b*1.3 and g > r*.4: cloth.add(loop.vertex_index)
    for vertex in mesh.data.vertices:
        scores = []
        z, x = vertex.co.z / height, abs(vertex.co.x) / height
        side = 'R' if vertex.co.x > 0 else 'L'
        if z > .83: allowed = ['head']
        elif (.55 < z < .84 and vertex.index in cloth) or (z > .73 and x < .28): allowed = ['chest','spine']
        elif x > .16 and z > .18: allowed = [f'upperarm_{side}',f'forearm_{side}',f'hand_{side}']
        elif z < .51: allowed = [f'thigh_{side}',f'shin_{side}',f'foot_{side}','hips']
        else: allowed = ['hips','spine','chest']
        for bone in bones:
            if bone.name not in allowed: continue
            delta = bone.tail_local - bone.head_local
            t = max(0, min(1, (vertex.co - bone.head_local).dot(delta) / max(delta.length_squared, 1e-8)))
            distance = (vertex.co - bone.head_local - t * delta).length
            scores.append((1 / max(distance, .012 * height) ** 6, bone.name))
        selected = sorted(scores, reverse=True)[:4]; total = sum(s for s, _ in selected)
        for weight, name in selected: groups[name].add([vertex.index], weight / total, 'REPLACE')

for mesh in meshes:
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    fallback_weights(mesh)

# Keep the generated mesh in its actual bind pose. The carrying posture is a
# pose offset in the clips, never baked across a differently oriented skeleton.
for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
if is_player:
    def local_bias(name, desired):
        bone=rig.data.bones[name]
        direction=bone.tail_local-bone.head_local
        world_rotation=direction.rotation_difference(Vector(desired))
        basis=bone.matrix_local.to_quaternion()
        return basis.inverted() @ world_rotation @ basis
    offsets={
        'forearm_R':local_bias('forearm_R',(.03,.15,.14)),
        'upperarm_L':local_bias('upperarm_L',(-.025,0,-.28)),
    }
    for track in rig.animation_data.nla_tracks: track.mute=True
    for track in rig.animation_data.nla_tracks:
        action=track.strips[0].action
        rig.animation_data.action=action
        if track.strips[0].action_slot: rig.animation_data.action_slot=track.strips[0].action_slot
        frames=range(int(action.frame_range[0]),int(action.frame_range[1])+1)
        samples=[]
        for frame in frames:
            bpy.context.scene.frame_set(frame)
            samples.append((frame,{name:bias @ rig.pose.bones[name].matrix_basis.to_quaternion() for name,bias in offsets.items()}))
        for frame,poses in samples:
            for name,rotation in poses.items():
                bone=rig.pose.bones[name];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=rotation
                bone.keyframe_insert('rotation_quaternion',frame=frame)
    rig.animation_data.action=None
    socket=bpy.data.objects.get('torch_socket')
    if socket:
        socket.parent=rig;socket.parent_type='BONE';socket.parent_bone='hand_R'
        socket.matrix_parent_inverse=Matrix.Identity(4);socket.location=(0,0,0);socket.rotation_euler=(0,0,0)
for mesh in meshes:
    mesh.modifiers.new('Generated skin', 'ARMATURE').object = rig
    for poly in mesh.data.polygons: poly.use_smooth = True
for track in rig.animation_data.nla_tracks: track.mute = False
bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
for mesh in meshes: mesh.select_set(True)
for obj in rig.children:
    if obj.type == 'EMPTY': obj.select_set(True)
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix('.blend').resolve()))
bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB', use_selection=True, export_yup=True, export_animations=True)
print('BOUND_GENERATED_MESH', output)
