"""Bake fitted, foot-targeted character motion into the generated mesh's GLB.

Authors skeleton animation only. No replacement mesh geometry is created.
"""
import bpy
import math
from mathutils import Vector, Matrix, Euler


def rebuild_player_motion(rig, height):
    rig.animation_data_clear()
    rig.animation_data_create()
    scene = bpy.context.scene
    scene.render.fps = 30
    for bone in rig.pose.bones:
        bone.rotation_mode = 'QUATERNION'
        bone.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()

    def segment(name, head, tail):
        rest = rig.data.bones[name]
        rotation = (rest.tail_local-rest.head_local).rotation_difference(tail-head)
        rig.pose.bones[name].matrix = Matrix.Translation(head) @ (rotation @ rest.matrix_local.to_quaternion()).to_matrix().to_4x4()
        bpy.context.view_layer.update()

    def chain(upper, lower, end, target, pole):
        a = rig.pose.bones[upper].head.copy()
        l1, l2 = rig.data.bones[upper].length, rig.data.bones[lower].length
        direction = target-a
        distance = min(direction.length, (l1+l2)*.995)
        direction.normalize()
        target = a+direction*distance
        along = (l1*l1-l2*l2+distance*distance)/(2*distance)
        perpendicular = pole-direction*pole.dot(direction)
        perpendicular.normalize()
        joint = a+direction*along+perpendicular*math.sqrt(max(0,l1*l1-along*along))
        segment(upper,a,joint)
        segment(lower,joint,target)
        segment(end,target,target+(target-joint).normalized()*rig.data.bones[end].length)
        return target

    durations = {'idle':2.8,'walk':.8,'sprint':.6,'crouch_idle':2.8,'crouch_walk':1.0,
                 'interact':.9,'relight':2.0,'burst':.7,'death':1.5,'quick_turn':.8,
                 'chalk':.9,'refill':1.1,'extinguish':1.2,'fear':1.4}
    for name,duration in durations.items():
        action=bpy.data.actions.new('fitted_'+name)
        rig.animation_data.action=action
        frames=round(duration*30)
        for frame in range(frames+1):
            scene.frame_set(frame)
            t=frame/frames
            wave=math.sin(t*math.tau)
            crouch='crouch' in name
            moving=name in ('walk','sprint','crouch_walk')
            sprint=name=='sprint'
            pulse=math.sin(math.pi*t)**2
            drop=.24 if crouch else .10 if sprint else .055 if moving else 0
            if name=='death': drop=t*.57
            bob=(.008 if crouch else .014)*math.cos(t*math.tau*2) if moving else .003*wave
            for bone in rig.pose.bones: bone.matrix_basis=Matrix.Identity(4)
            # Hips bone local Y points upward. Lower the pelvis without scaling the body.
            rig.pose.bones['hips'].location.y=-drop+bob
            rig.pose.bones['spine'].rotation_quaternion=Euler((-.18 if crouch else -.10 if sprint else -.025,0,0)).to_quaternion()
            rig.pose.bones['chest'].rotation_quaternion=Euler((.012*wave,0,.025*wave if moving else .006*wave)).to_quaternion()
            if name=='death': rig.pose.bones['spine'].rotation_quaternion=Euler((-t*.85,0,0)).to_quaternion()
            if name in ('fear','extinguish'): rig.pose.bones['head'].rotation_quaternion=Euler((pulse*.12,0,pulse*.08)).to_quaternion()
            bpy.context.view_layer.update()
            for side,sign in [('L',-1),('R',1)]:
                phase=(t+(0 if side=='L' else .5))%1
                foot=rig.data.bones['foot_'+side].head_local.copy()
                if moving:
                    amplitude=.36 if sprint else .20 if crouch else .28
                    stance=.55 if sprint else .62
                    if phase<stance:
                        foot.y=amplitude*(1-2*phase/stance)
                    else:
                        swing=(phase-stance)/(1-stance)
                        foot.y=-amplitude*math.cos(math.pi*swing)
                        foot.z+=(.13 if sprint else .055 if crouch else .085)*math.sin(math.pi*swing)
                if name=='death': foot.y+=sign*t*.1
                ankle=chain('thigh_'+side,'shin_'+side,'foot_'+side,foot,Vector((0,1,0)))
                # Flat planted soles; no backward knee snapping or heel orbiting.
                rest=rig.data.bones['foot_'+side]
                rig.pose.bones['foot_'+side].matrix=Matrix.Translation(ankle) @ rest.matrix_local.to_quaternion().to_matrix().to_4x4()
                bpy.context.view_layer.update()
                shoulder=rig.pose.bones['upperarm_'+side].head.copy()
                if side=='R':
                    target=shoulder+Vector((.085*height,.14*height,-.04*height))
                    target.z+=.008*wave
                    if name=='burst': target.y+=pulse*.12;target.z+=pulse*.06
                else:
                    target=shoulder+Vector((-.055*height, .025*height + (wave*.045 if moving else 0), -.28*height))
                    if name in ('interact','relight','chalk','refill'):
                        target=target.lerp(shoulder+Vector((.04*height,.20*height,-.14*height)),pulse)
                chain('upperarm_'+side,'forearm_'+side,'hand_'+side,target,Vector((sign,0,-.7)))
            for bone in rig.pose.bones:
                bone.keyframe_insert('location',frame=frame)
                bone.keyframe_insert('rotation_quaternion',frame=frame)
        track=rig.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,0,action)
        strip.name=name
        track.mute=True
    rig.animation_data.action=None
    for bone in rig.pose.bones: bone.matrix_basis=Matrix.Identity(4)
    socket=bpy.data.objects.get('torch_socket')
    if socket:
        socket.parent=rig;socket.parent_type='BONE';socket.parent_bone='hand_R'
        socket.matrix_parent_inverse=Matrix.Identity(4)
        socket.location=(0,-rig.data.bones['hand_R'].length*.5,0)
        socket.rotation_euler=(0,0,0)
