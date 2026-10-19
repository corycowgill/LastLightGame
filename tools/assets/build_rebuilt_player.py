"""Fresh bind of the reconstructed Torchbearer to HF-generated SMPLH motion.

Blender: --background --python tools/assets/build_rebuilt_player.py -- MESH MOTIONS OUTPUT [--pilot]
No old character mesh, skin weights, or locomotion clips are imported.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

args=sys.argv[sys.argv.index('--')+1:]
mesh_path,motions,out=map(lambda p:Path(p).resolve(),args[:3]);pilot='--pilot' in args
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(motions/'walk.fbx'))
source=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for obj in list(bpy.context.scene.objects):
 if obj.type=='MESH':bpy.data.objects.remove(obj,do_unlink=True)
source.name='SourceMotion'
source_rest={b.name:(source.matrix_world@b.matrix_local).to_quaternion() for b in source.data.bones}
source_heads={b.name:source.matrix_world@b.head_local for b in source.data.bones}
standing=[]
for f in range(10,60):
 bpy.context.scene.frame_set(f);standing.append((source.matrix_world@source.pose.bones['Pelvis'].head).z)
standing=sum(standing)/len(standing)
bottom=min(source_heads[n].z for n in ['L_Foot','R_Foot'])-.035
height=(source_heads['Head'].z+.14)-bottom
scale=1.65/height
ref={name:Vector((p.x*scale,p.y*scale,(p.z-bottom)*scale)) for name,p in source_heads.items()}
parents={b.name:b.parent.name if b.parent else None for b in source.data.bones}
primary={'Pelvis':'Spine1','Spine1':'Spine2','Spine2':'Spine3','Spine3':'Neck','Neck':'Head'}
for side,sign in [('L',1),('R',-1)]:
 primary.update({side+'_Hip':side+'_Knee',side+'_Knee':side+'_Ankle',side+'_Ankle':side+'_Foot',side+'_Collar':side+'_Shoulder',side+'_Shoulder':side+'_Elbow',side+'_Elbow':side+'_Wrist',side+'_Wrist':side+'_Middle1'})
 ref[side+'_Shoulder']=Vector((sign*.17,0,1.29))
 ref[side+'_Elbow']=Vector((sign*.425,0,1.29))
 old_wrist=ref[side+'_Wrist'].copy();new_wrist=Vector((sign*.68,0,1.29))
 for name in ref:
  if name.startswith(side+'_') and any(f in name for f in ['Index','Middle','Ring','Pinky','Thumb']):ref[name]=new_wrist+(ref[name]-old_wrist)*.88
 ref[side+'_Wrist']=new_wrist
 for finger in ['Index','Middle','Ring','Pinky','Thumb']:
  primary[side+'_'+finger+'1']=side+'_'+finger+'2';primary[side+'_'+finger+'2']=side+'_'+finger+'3'

def end(name,heads):
 if name in primary:return heads[primary[name]].copy()
 if name=='Head':return heads[name]+Vector((0,0,.13))
 if name.endswith('_Foot'):return heads[name]+Vector((0,-.08,0))
 parent=parents[name]
 return heads[name]+(heads[name]-heads[parent]).normalized()*.025

rig=bpy.data.objects.new('TorchbearerRig',bpy.data.armatures.new('TorchbearerRig'))
bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);source.select_set(False)
bpy.ops.object.mode_set(mode='EDIT')
for old in source.data.bones:
 bone=rig.data.edit_bones.new(old.name);bone.head=ref[old.name];bone.tail=end(old.name,ref)
 if (bone.tail-bone.head).length<.005:bone.tail.z+=.02
 if old.parent:bone.parent=rig.data.edit_bones[old.parent.name]
bpy.ops.object.mode_set(mode='OBJECT')
reference={b.name:b.matrix_local.to_quaternion() for b in rig.data.bones}
# Fit the new bind pose to the clearly separated A-pose sleeves.
bind={n:p.copy() for n,p in ref.items()}
for side,sign in [('L',1),('R',-1)]:
 bind[side+'_Elbow']=Vector((sign*.30,-.006,1.065));bind[side+'_Wrist']=Vector((sign*.42,-.014,.84))
 turn=Vector((sign,0,0)).rotation_difference((bind[side+'_Wrist']-bind[side+'_Elbow']).normalized())
 for name in bind:
  if name.startswith(side+'_') and any(f in name for f in ['Index','Middle','Ring','Pinky','Thumb']):bind[name]=bind[side+'_Wrist']+turn@(ref[name]-ref[side+'_Wrist'])
bpy.ops.object.mode_set(mode='EDIT')
for name,point in bind.items():
 bone=rig.data.edit_bones[name];bone.head=point;bone.tail=end(name,bind)
bpy.ops.object.mode_set(mode='OBJECT')
rest={b.name:b.matrix_local.to_quaternion() for b in rig.data.bones}
# Import only the newly reconstructed body and perform a fresh heat-weight bind.
before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(mesh_path))
meshes=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
for obj in meshes:
 obj.data.transform(obj.matrix_world);obj.matrix_world=Matrix.Identity(4)
 for mod in list(obj.modifiers):obj.modifiers.remove(mod)
 for group in list(obj.vertex_groups):obj.vertex_groups.remove(group)
# Solve on a watertight temporary proxy; retain the original neural surface.
# Generated gloved fingers do not have enough separated topology for individual
# heat solves, so the glove follows the wrist as one unit.
for bone in rig.data.bones:
 if any(f in bone.name for f in ['Index','Middle','Ring','Pinky','Thumb']):bone.use_deform=False
for obj in meshes:
 proxy=bpy.data.objects.new('WeightSolveProxy',obj.data.copy());bpy.context.collection.objects.link(proxy)
 bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True);bpy.context.view_layer.objects.active=proxy
 proxy.data.remesh_voxel_size=.008;bpy.ops.object.voxel_remesh()
 rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
 if any(len(v.groups)==0 for v in proxy.data.vertices):raise RuntimeError('Proxy heat solve failed; no partial weights will be shipped')
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 transfer=obj.modifiers.new('Fresh heat weight transfer','DATA_TRANSFER');transfer.object=proxy;transfer.use_vert_data=True;transfer.data_types_verts={'VGROUP_WEIGHTS'};transfer.vert_mapping='POLYINTERP_NEAREST'
 bpy.ops.object.datalayout_transfer(modifier=transfer.name);bpy.ops.object.modifier_apply(modifier=transfer.name)
 obj.parent=rig;obj.matrix_parent_inverse=Matrix.Identity(4)
 armature=obj.modifiers.new('Fresh deform rig','ARMATURE');armature.object=rig
 bpy.data.objects.remove(proxy,do_unlink=True)
 if not obj.vertex_groups:raise RuntimeError('Fresh automatic weighting failed')
 bpy.context.view_layer.objects.active=obj
 # Anatomical masks keep the short cowl attached to the torso and the hood
 # attached to the head. Heat diffusion alone leaks arm/leg weights across
 # close garment surfaces and creates sharp discontinuities after top-4 export.
 def smooth(a,b,x):
  t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
 torso=[('Pelvis',bind['Pelvis'].z),('Spine1',bind['Spine1'].z),('Spine2',bind['Spine2'].z),('Spine3',bind['Spine3'].z),('Neck',1.34),('Head',1.50)]
 def trunk(z):
  if z<=torso[0][1]:return {torso[0][0]:1.0}
  for (a,lo),(b,hi) in zip(torso,torso[1:]):
   if z<=hi:
    t=smooth(lo,hi,z);return {a:1-t,b:t}
  return {'Head':1.0}
 group_names={g.index:g.name for g in obj.vertex_groups}
 for v in obj.data.vertices:
  x,y,z=v.co;weights={group_names[g.group]:g.weight for g in v.groups}
  # Restrict the torso/hood to adjacent axial joints. The lateral sleeves
  # transition smoothly back to the original heat solution.
  lateral=smooth(.12,.26,abs(x))
  leg=1-smooth(.70,.94,z)
  axial=(1-lateral)*(1-leg)
  if z>1.40:axial=1.0
  original={n:w for n,w in weights.items() if not (z>.96 and ('Hip' in n or 'Knee' in n or 'Ankle' in n or 'Foot' in n)) and not (z<.74 and abs(x)<.25 and any(t in n for t in ['Shoulder','Elbow','Wrist','Collar','Head','Neck']))}
  total=sum(original.values()) or 1
  weights={n:w/total*(1-axial) for n,w in original.items()}
  for n,w in trunk(z).items():weights[n]=weights.get(n,0)+w*axial
  if abs(x)<.25:
   side='L' if x>0 else 'R';knee=bind[side+'_Knee'].z
   influence=smooth(.20,.30,z)*(1-smooth(.64,.74,z))
   t=smooth(knee-.12,knee+.12,z)
   weights={n:w*(1-influence) for n,w in weights.items()}
   for n,w in [(side+'_Knee',1-t),(side+'_Hip',t)]:weights[n]=weights.get(n,0)+w*influence

  # Keep the glove rigid with its wrist. Otherwise the heat solution's
  # forearm influence visually separates the palm from the gripped prop.
  glove=smooth(.60,.66,z)*(1-smooth(.84,1.02,z))*smooth(.27,.32,abs(x))
  if glove>0:
   side='L' if x>0 else 'R'
   weights={n:w*(1-glove) for n,w in weights.items()}
   weights[side+'_Wrist']=weights.get(side+'_Wrist',0)+glove
  for group in obj.vertex_groups:group.remove([v.index])
  selected=sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in selected)
  for n,w in selected:
   if w>1e-6:obj.vertex_groups[n].add([v.index],w/total,'REPLACE')
 bpy.ops.object.vertex_group_limit_total(limit=4);bpy.ops.object.vertex_group_normalize_all(lock_active=False)
 if any(len(v.groups)==0 for v in obj.data.vertices):raise RuntimeError('Unweighted vertex in fresh bind')
print('Fresh weighted bind complete',flush=True)
# A fixed wrist carry frame avoids provider wrist rolls tipping fire into the
# hood. The generated body, gait and left arm are retained; a two-bone IK pass
# keeps the right-hand grip in a safe, reachable carrying envelope.
bpy.context.scene.frame_set(37)
carry_pose=(source.matrix_world@source.pose.bones['R_Wrist'].matrix).to_quaternion()
carry_root=(source.matrix_world@source.pose.bones['Pelvis'].matrix).to_quaternion()@source_rest['Pelvis'].inverted()
carry_forward=carry_root@Vector((0,-1,0))
carry_yaw=math.atan2(carry_forward.x,-carry_forward.y)
carry_rotation=Quaternion((0,0,1),-carry_yaw)@carry_pose@source_rest['R_Wrist'].inverted()@reference['R_Wrist']

def stabilize_carry(quats,root_z):
 world={};points={}
 for n in ref:
  parent=parents[n]
  if parent:
   world[n]=world[parent]@rest[parent].inverted()@rest[n]@quats[n]
   points[n]=points[parent]+world[parent]@rest[parent].inverted()@(bind[n]-bind[parent])
  else:
   world[n]=rest[n]@quats[n];points[n]=bind[n]+Vector((0,0,root_z-bind[n].z))
 shoulder=points['R_Shoulder'];raw=points['R_Wrist']-shoulder
 target=shoulder+Vector((-.11+max(-.025,min(.025,raw.x*.08)),-.31+max(-.025,min(.025,raw.y*.08)),-.12+max(-.025,min(.025,raw.z*.08))))
 axis=(target-shoulder).normalized();distance=(target-shoulder).length
 upper=(bind['R_Elbow']-bind['R_Shoulder']).length;lower=(bind['R_Wrist']-bind['R_Elbow']).length
 along=(upper*upper-lower*lower+distance*distance)/(2*distance)
 pole=Vector((-.8,.15,-.6));perp=(pole-axis*pole.dot(axis)).normalized()
 elbow=shoulder+axis*along+perp*math.sqrt(max(0,upper*upper-along*along))
 for n,child,start,finish in [('R_Shoulder','R_Elbow',shoulder,elbow),('R_Elbow','R_Wrist',elbow,target)]:
  original_axis=world[n]@rest[n].inverted()@(bind[child]-bind[n])
  corrected=original_axis.rotation_difference(finish-start)@world[n]
  parent=parents[n]
  quats[n]=rest[n].inverted()@rest[parent]@world[parent].inverted()@corrected
  world[n]=corrected
 n='R_Wrist';parent=parents[n]
 quats[n]=rest[n].inverted()@rest[parent]@world[parent].inverted()@carry_rotation
 return world

def relax_idle_arm(quats):
 # The provider's idle occasionally lifts the free hand to the face. Keep
 # the left arm relaxed while retaining its subtle generated breathing sway.
 world={}
 for n in ref:
  parent=parents[n]
  world[n]=world[parent]@rest[parent].inverted()@rest[n]@quats[n] if parent else rest[n]@quats[n]
 for n,child,direction in [('L_Shoulder','L_Elbow',Vector((.035,-.01,-.25))),('L_Elbow','L_Wrist',Vector((.005,-.045,-.25)))]:
  desired=(rest[n]@Vector((0,1,0))).rotation_difference(direction)@rest[n]
  parent=parents[n];quats[n]=rest[n].inverted()@rest[parent]@world[parent].inverted()@desired;world[n]=desired
 n='L_Wrist';parent=parents[n]
 desired=world[parent]@rest[parent].inverted()@rest[n]
 quats[n]=rest[n].inverted()@rest[parent]@world[parent].inverted()@desired



clips=['idle','walk','sprint','crouch_idle','crouch_walk','interact','relight','burst','death']
if pilot:clips=['walk']
reports=[]
for clip_name in clips:
 if clip_name!='walk':
  before=set(bpy.context.scene.objects);bpy.ops.import_scene.fbx(filepath=str(motions/(clip_name+'.fbx')))
  fresh=[o for o in bpy.context.scene.objects if o not in before]
  motion=next(o for o in fresh if o.type=='ARMATURE')
 else:motion=source;fresh=[]
 action=bpy.data.actions.new(clip_name);rig.animation_data_create();rig.animation_data.action=action
 source_action=motion.animation_data.action
 length=int(source_action.frame_range[1]);loop=clip_name in ['idle','walk','sprint','crouch_idle','crouch_walk']
 # Discard lead-in/lead-out; close the selected cycle smoothly after retargeting.
 first,last=(20,55) if clip_name=='walk' else (20,45) if clip_name=='sprint' else (25,80) if clip_name=='crouch_walk' else (10,110) if loop else (1,length)
 frames=[]
 for frame in range(first,min(last,length)+1):
  bpy.context.scene.frame_set(frame)
  pose={n:(motion.matrix_world@motion.pose.bones[n].matrix).to_quaternion() for n in ref}
  delta=pose['Pelvis']@source_rest['Pelvis'].inverted();forward=delta@Vector((0,-1,0));yaw=math.atan2(forward.x,-forward.y)
  unwind=Quaternion((0,0,1),-yaw)
  desired={n:unwind@pose[n]@source_rest[n].inverted()@reference[n] for n in ref}
  quats={}
  for name in ref:
   parent=parents[name]
   quats[name]=(rest[name].inverted()@rest[parent]@desired[parent].inverted()@desired[name]) if parent else rest[name].inverted()@desired[name]
  root_z=bind['Pelvis'].z+((motion.matrix_world@motion.pose.bones['Pelvis'].head).z-standing)*scale
  if clip_name!='death':stabilize_carry(quats,root_z)
  if clip_name=='idle':relax_idle_arm(quats)
  frames.append((quats,root_z))
 if loop:
  count=min(7,len(frames)//5)
  start_q,start_z=frames[0]
  for k in range(count):
   index=len(frames)-count+k;t=(k+1)/count;t=t*t*(3-2*t);q,z=frames[index]
   frames[index]=({n:v.slerp(start_q[n],t) for n,v in q.items()},z*(1-t)+start_z*t)
 for i,(quats,z) in enumerate(frames,1):
  for name,q in quats.items():
   bone=rig.pose.bones[name];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=q;bone.location=(0,0,0);bone.scale=(1,1,1)
   if name=='Pelvis':bone.location=rest[name].inverted()@Vector((0,0,z-bind[name].z));bone.keyframe_insert('location',frame=i,group=name)
   bone.keyframe_insert('rotation_quaternion',frame=i,group=name)
 bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=len(frames)
 # Set a constant floor offset from actual deformed boot vertices.
 minima=[]
 for frame in range(1,len(frames)+1,3):
  bpy.context.scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get()
  for obj in meshes:
   evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
   minima.append(min((evaluated.matrix_world@v.co).z for v in mesh.vertices));evaluated.to_mesh_clear()
 correction=-min(minima)
 for i,(_,z) in enumerate(frames,1):
  bone=rig.pose.bones['Pelvis'];bone.location=rest['Pelvis'].inverted()@Vector((0,0,z-bind['Pelvis'].z+correction));bone.keyframe_insert('location',frame=i,group='Pelvis')
 action.use_fake_user=True
 reports.append({'clip':clip_name,'frames':len(frames),'source_frames':[first,min(last,length)],'ground_offset':correction})
 print('Baked',clip_name,len(frames),'frames',flush=True)
 for obj in fresh:bpy.data.objects.remove(obj,do_unlink=True)

aliases={'Pelvis':'hips','Spine1':'spine','Spine2':'spine_mid','Spine3':'chest','Neck':'neck','Head':'head'}
for side in ['L','R']:
 for old,new in [('Hip','thigh'),('Knee','shin'),('Ankle','foot'),('Foot','ball'),('Collar','clavicle'),('Shoulder','upperarm'),('Elbow','forearm'),('Wrist','hand')]:aliases[side+'_'+old]=new+'_'+side
 for finger in ['Index','Middle','Ring','Pinky','Thumb']:
  for i in [1,2,3]:aliases[side+'_'+finger+str(i)]=finger.lower()+'_'+str(i).zfill(2)+'_'+side.lower()
for old,new in aliases.items():rig.data.bones[old].name=new
# Blender only rewrites the active action on bone rename. Repair the RNA paths
# of every baked action explicitly before exporting separate NLA tracks.
for report in reports:
 action=bpy.data.actions[report['clip']]
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for curve in bag.fcurves:
     for old,new in aliases.items():curve.data_path=curve.data_path.replace('pose.bones["'+old+'"]','pose.bones["'+new+'"]')
bpy.data.objects.remove(source,do_unlink=True)
# Preserve the clean source orientation; a root transform sets game forward -Z.
root=bpy.data.objects.new('game_forward',None);bpy.context.collection.objects.link(root);root.rotation_euler.z=math.pi
rig.parent=root
for obj in meshes:
 for mat in obj.data.materials:
  if mat and mat.use_nodes:
   shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
   if shader:shader.inputs['Metallic'].default_value=0;shader.inputs['Roughness'].default_value=.9
# Publish individual actions as NLA tracks, no cross-action blending.
rig.animation_data.action=None
for report in reports:
 action=bpy.data.actions[report['clip']];track=rig.animation_data.nla_tracks.new();track.name=action.name
 strip=track.strips.new(action.name,1,action);strip.blend_type='REPLACE';strip.extrapolation='NOTHING'
bpy.context.scene.render.fps=30
bpy.ops.object.select_all(action='DESELECT');root.select_set(True);rig.select_set(True)
for obj in meshes:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(out.with_suffix('.blend')))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_skins=True,export_all_influences=False)
out.with_suffix('.report.json').write_text(json.dumps({'rig':'Fresh 52-joint bind from generated HY-Motion SMPLH skeleton','mesh':str(mesh_path),'clips':reports,'old_skin_imported':False},indent=2))
print('EXPORTED',str(out),flush=True)





