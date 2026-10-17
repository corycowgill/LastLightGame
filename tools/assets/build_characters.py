"""Legacy authored animation donors; not runtime character replacements.
Run: blender --background --python tools/assets/build_characters.py
Writes ignored .asset-tools/rigs. Runtime meshes come from the neural catalog.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".asset-tools" / "rigs"
OUT.mkdir(parents=True, exist_ok=True)


def material(name, rgb, roughness=0.9, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    node = m.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*rgb, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metal
    return m


def build(kind):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    hunter = kind == "hunter"
    scale = 1.95 if hunter else 1
    cloth = material("ShadowCloth" if hunter else "WeatheredOchre", (.018, .027, .043) if hunter else (.38, .20, .055))
    dark = material("CharcoalLinen", (.035, .043, .05))
    leather = material("WornLeather", (.075, .038, .019), .75)
    brass = material("MutedBrass", (.31, .19, .07), .65, .7)
    face = material("HoodRecess", (.006, .008, .012))
    parts = []

    # Coordinates: Blender Z up / +Y forward -> glTF Y up / -Z forward.
    bones = {
        "hips": ((0, 0, .78), (0, 0, .94), None),
        "spine": ((0, 0, .94), (0, 0, 1.15), "hips"),
        "chest": ((0, 0, 1.15), (0, 0, 1.30), "spine"),
        "head": ((0, 0, 1.30), (0, 0, 1.54), "chest"),
    }
    for side, sign in [("L", -1), ("R", 1)]:
        bones[f"thigh_{side}"] = ((sign*.105, 0, .8), (sign*.11, .015, .43), "hips")
        bones[f"shin_{side}"] = ((sign*.11, .015, .43), (sign*.11, 0, .09), f"thigh_{side}")
        bones[f"foot_{side}"] = ((sign*.11, 0, .09), (sign*.11, .16, .08), f"shin_{side}")
        if hunter:
            elbow, hand = (sign*.28, .01, .83), (sign*.31, .07, .42)
        else:
            elbow = (sign*.29, .015, 1.0)
            hand = (sign*.36, .20, 1.15) if side == "R" else (sign*.30, .04, .82)
        bones[f"upperarm_{side}"] = ((sign*.22, 0, 1.23), elbow, "chest")
        bones[f"forearm_{side}"] = (elbow, hand, f"upperarm_{side}")
        bones[f"hand_{side}"] = (hand, (hand[0], hand[1]+.06, hand[2]), f"forearm_{side}")

    def finish(obj, mat, bone):
        obj.data.materials.append(mat)
        # Bake transforms before assigning an armature modifier.
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))), 1, "REPLACE")
        for poly in obj.data.polygons:
            poly.use_smooth = True
        parts.append(obj)
        return obj

    def ellipsoid(name, pos, size, mat, bone):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=pos)
        obj = bpy.context.object
        obj.name = name
        obj.scale = size
        return finish(obj, mat, bone)

    def limb(name, a, b, r1, r2, mat, bone):
        delta = Vector(b)-Vector(a)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r1, radius2=r2, depth=delta.length, location=(Vector(a)+Vector(b))/2)
        obj = bpy.context.object
        obj.name = name
        obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
        return finish(obj, mat, bone)

    def cube(name, pos, size, mat, bone):
        bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
        obj = bpy.context.object
        obj.name = name
        obj.scale = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bevel = obj.modifiers.new("Broad worn edges", "BEVEL")
        bevel.width, bevel.segments = .012, 2
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        return finish(obj, mat, bone)

    ellipsoid("Tunic", (0, -.015, 1.03), (.20 if not hunter else .14, .13, .27), dark, "spine")
    for side, sign in [("L", -1), ("R", 1)]:
        for part in ["thigh", "shin", "upperarm", "forearm"]:
            a, b, _ = bones[f"{part}_{side}"]
            radius = {"thigh": .10, "shin": .074, "upperarm": .085, "forearm": .06}[part]
            if hunter: radius *= .5
            limb(part, a, b, radius, radius*.75, dark if part != "shin" else leather, f"{part}_{side}")
        ellipsoid("Boot", (sign*.11, .045, .085), (.085, .155, .085), leather, f"foot_{side}")
        hand = bones[f"hand_{side}"][0]
        ellipsoid("Glove", hand, (.052, .065, .052), leather if not hunter else cloth, f"hand_{side}")
        if hunter:
            for f in range(3):
                a = (hand[0]+(f-1)*.025, hand[1]+.03, hand[2]-.02)
                b = (a[0]+sign*.025, a[1]+.04, a[2]-.17)
                limb("LongFinger", a, b, .012, .003, cloth, f"hand_{side}")
        else:
            for z in [.18, .26, .34]:
                limb("CalfWrap", (sign*.11, 0, z-.015), (sign*.11, 0, z+.015), .078, .078, leather, f"shin_{side}")
    # Hood shell has an actual dark forward opening, not a sphere with a face patch.
    verts, faces = [], []
    count = 20
    for ring in range(3):
        for i in range(count):
            a = i*math.tau/count
            if ring == 0: pos = (.225*math.cos(a), .12, 1.39+.255*math.sin(a))
            elif ring == 1: pos = (.18*math.cos(a), -.15, 1.40+.19*math.sin(a))
            else: pos = (.15*math.cos(a), .145, 1.39+.185*math.sin(a))
            verts.append(pos)
    verts.append((0, -.20, 1.40))
    for i in range(count):
        n = (i+1)%count
        faces += [(i,n,n+count,i+count),(i,i+count*2,n+count*2,n),(i+count,n+count,count*3)]
    mesh = bpy.data.meshes.new("HoodShell")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new("SculptedHood", mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, cloth, "head")
    ellipsoid("DarkFace", (0,.115,1.39), (.145,.025,.18), face, "head")
    if hunter:
        eyes = material("PaleEyes", (.25,.40,.40))
        node = eyes.node_tree.nodes.get("Principled BSDF")
        node.inputs["Emission Color"].default_value = (.3,.5,.5,1)
        node.inputs["Emission Strength"].default_value = .8
        for sign in [-1,1]: ellipsoid("Eye", (sign*.045,.145,1.42), (.012,.015,.012), eyes, "head")
    # Scalloped shoulder mantle / torn skirt: broad cloth masses, small ragged edge.
    for layer in range(2):
        vertices, fs = [], []
        for ring in range(2):
            for i in range(24):
                a=i*math.tau/24
                radius = (.17 if ring==0 else .32) if layer==0 else (.17 if ring==0 else .235)
                z = (1.28 if ring==0 else 1.04-(i%3)*.025) if layer==0 else (.95 if ring==0 else (.28 if hunter else .69)-(i%3)*.035)
                vertices.append((math.cos(a)*radius,math.sin(a)*radius*.65-.025,z))
        for i in range(24): fs.append((i,(i+1)%24,(i+1)%24+24,i+24))
        mesh=bpy.data.meshes.new("ClothPanels")
        mesh.from_pydata(vertices,[],fs)
        obj=bpy.data.objects.new("RaggedMantle" if layer==0 else "TornSkirt",mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj,cloth,"chest" if layer==0 else "hips")
        solid=obj.modifiers.new("ClothThickness","SOLIDIFY");solid.thickness=.008
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=solid.name)
    if not hunter:
        cube("Belt",(0,0,.88),(.37,.265,.055),leather,"hips")
        cube("Buckle",(0,.143,.88),(.065,.018,.065),brass,"hips")
        cube("Satchel",(-.22,-.105,.81),(.20,.10,.21),leather,"hips")
        cube("SatchelFlap",(-.22,-.162,.86),(.21,.022,.11),leather,"hips")
        cube("SatchelClasp",(-.22,-.181,.82),(.028,.012,.035),brass,"hips")
        limb("CrossBodyStrap",(-.20,-.145,.88),(.19,-.14,1.26),.018,.018,leather,"spine")
        ellipsoid("FuelFlask",(.23,-.02,.81),(.055,.045,.09),brass,"hips")

    armdata=bpy.data.armatures.new(kind+"Skeleton")
    rig=bpy.data.objects.new(kind+"Rig",armdata)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name,(a,b,parent) in bones.items():
        bone=armdata.edit_bones.new(name);bone.head=a;bone.tail=b
        if parent: bone.parent=armdata.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    model=bpy.context.object;model.name="cha_"+kind
    mod=model.modifiers.new("Skeleton","ARMATURE");mod.object=rig
    model.parent=rig
    # Blender creates a hand-parented empty, exported as the torch attachment node.
    socket=bpy.data.objects.new("torch_socket",None)
    bpy.context.collection.objects.link(socket)
    socket.parent=rig;socket.parent_type="BONE";socket.parent_bone="hand_R"
    socket.location=(0,0,0)
    rig.scale=(scale,scale,scale)
    rig.animation_data_create()
    names = ["idle","search","pursue","capture","banish"] if hunter else ["idle","walk","sprint","crouch_idle","crouch_walk","interact","relight","burst","death","quick_turn","chalk","refill","extinguish","fear"]
    for name in names:
        action=bpy.data.actions.new(name)
        rig.animation_data.action=action
        for frame in range(1,62,3):
            t=(frame-1)/60; wave=math.sin(t*math.tau)
            for p in rig.pose.bones:
                p.rotation_mode="XYZ";p.rotation_euler=(0,0,0);p.location=(0,0,0)
            crouch="crouch" in name
            locomotion=name in ["walk","sprint","crouch_walk","search","pursue"]
            amp=.64 if name in ["sprint","pursue"] else .36
            if locomotion:
                for side,sign in [("L",-1),("R",1)]:
                    rig.pose.bones["thigh_"+side].rotation_euler.x=wave*amp*sign
                    rig.pose.bones["shin_"+side].rotation_euler.x=max(0,-wave*sign)*amp
                    rig.pose.bones["upperarm_"+side].rotation_euler.x=-wave*.18*sign
                rig.pose.bones["hips"].location.y=abs(wave)*.022
            if crouch:
                rig.pose.bones["hips"].location.y=-.20
                rig.pose.bones["thigh_L"].rotation_euler.x-=.55
                rig.pose.bones["thigh_R"].rotation_euler.x-=.55
                rig.pose.bones["shin_L"].rotation_euler.x+=.9
                rig.pose.bones["shin_R"].rotation_euler.x+=.9
                rig.pose.bones["spine"].rotation_euler.x=-.22
            rig.pose.bones["chest"].rotation_euler.x+=wave*.025
            if name in ["interact","chalk","refill","relight","burst","capture"]:
                pulse=math.sin(math.pi*t)
                rig.pose.bones["upperarm_L"].rotation_euler.x=-pulse*.8
                rig.pose.bones["forearm_L"].rotation_euler.x=-pulse*.6
                if name in ["relight","burst","capture"]:
                    rig.pose.bones["upperarm_R"].rotation_euler.x=-pulse*.4
            if name in ["death","banish"]:
                rig.pose.bones["hips"].location.y=-t*.58
                rig.pose.bones["spine"].rotation_euler.x=-t*.9
            if name=="quick_turn":rig.pose.bones["chest"].rotation_euler.z=wave*.35
            if name in ["fear","extinguish"]:rig.pose.bones["head"].rotation_euler.x=math.sin(math.pi*t)*.25
            for p in rig.pose.bones:
                p.keyframe_insert("rotation_euler",frame=frame)
                p.keyframe_insert("location",frame=frame)
        track=rig.animation_data.nla_tracks.new();track.name=name
        track.strips.new(name,1,action)
    rig.animation_data.action=None
    for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
    bpy.context.scene.render.fps=30
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/".asset-tools"/(kind+"-authored.blend")))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+".glb")),export_format="GLB",export_animations=True,export_animation_mode="NLA_TRACKS",export_force_sampling=True,export_skins=True)


build("torchbearer")
build("hunter")
