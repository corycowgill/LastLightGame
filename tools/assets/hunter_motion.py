"""Bake expressive Hunter clips into its existing neural mesh and skeleton."""
import bpy, math, sys
from pathlib import Path
from mathutils import Matrix
source, output=map(Path,sys.argv[sys.argv.index('--')+1:])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
rig.animation_data_clear();rig.animation_data_create()
bpy.context.scene.render.fps=30
durations={'idle':3.2,'search':2.4,'pursue':1.05,'flee':.85,'capture':1.1,'banish':1.3}
for name,duration in durations.items():
    action=bpy.data.actions.new('hunter_'+name);rig.animation_data.action=action
    frames=round(duration*30)
    for frame in range(frames+1):
        bpy.context.scene.frame_set(frame);t=frame/frames;wave=math.sin(t*math.tau);pulse=math.sin(math.pi*t)
        for p in rig.pose.bones: p.matrix_basis=Matrix.Identity(4);p.rotation_mode='XYZ'
        running=name in ('pursue','flee')
        rig.pose.bones['hips'].location.y=(.008 if not running else .018)*math.cos(t*math.tau*2)
        rig.pose.bones['spine'].rotation_euler.x=-.12 if name=='search' else -.25 if running else -.04
        rig.pose.bones['chest'].rotation_euler.z=wave*(.08 if running else .025)
        rig.pose.bones['head'].rotation_euler.z=math.sin(t*math.tau)*(.25 if name=='search' else .055)
        rig.pose.bones['head'].rotation_euler.x=.08 if running else -.04
        for side,sign in [('L',-1),('R',1)]:
            stride=.48 if running else .15 if name=='search' else .015
            rig.pose.bones['thigh_'+side].rotation_euler.x=wave*stride*sign
            rig.pose.bones['shin_'+side].rotation_euler.x=max(0,-wave*sign)*stride*.8
            rig.pose.bones['upperarm_'+side].rotation_euler.x=-wave*sign*(.32 if running else .10)
            rig.pose.bones['forearm_'+side].rotation_euler.x=.12+.06*wave
            if name=='flee':
                rig.pose.bones['upperarm_'+side].rotation_euler.x=-.75+wave*sign*.12
                rig.pose.bones['upperarm_'+side].rotation_euler.z=sign*.2
                rig.pose.bones['forearm_'+side].rotation_euler.x=-.9
            if name=='capture':
                rig.pose.bones['upperarm_'+side].rotation_euler.x=-pulse*.9
                rig.pose.bones['forearm_'+side].rotation_euler.x=-pulse*.45
        if name=='banish':
            rig.pose.bones['spine'].rotation_euler.x=-.25-t*.6
            rig.pose.bones['hips'].location.y=-t*.4
        for p in rig.pose.bones:
            p.keyframe_insert('location',frame=frame);p.keyframe_insert('rotation_euler',frame=frame)
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
rig.animation_data.action=None
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.context.scene.frame_set(0)
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix('.blend').resolve()))
bpy.ops.export_scene.gltf(filepath=str(output.resolve()),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
