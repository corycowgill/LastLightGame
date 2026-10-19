"""Time-varying torch carry, preserving the source grip and bounded gait sway."""
import bisect
import math

def slerp(a, b, t):
    dot = sum(x*y for x,y in zip(a,b))
    if dot < 0:
        b = [-x for x in b]
        dot = -dot
    if dot > 0.9995:
        q = [x+(y-x)*t for x,y in zip(a,b)]
    else:
        angle = math.acos(max(-1,min(1,dot)))
        q = [(math.sin((1-t)*angle)*x+math.sin(t*angle)*y)/math.sin(angle) for x,y in zip(a,b)]
    length = math.sqrt(sum(x*x for x in q))
    return [x/length for x in q]

def sample(times, rotations, phase):
    time = times[0][0]+phase*(times[-1][0]-times[0][0])
    flat = [r[0] for r in times]
    i = min(len(times)-2,max(0,bisect.bisect_right(flat,time)-1))
    if len(times)==1: return rotations[0][:]
    duration = flat[i+1]-flat[i]
    return slerp(rotations[i],rotations[i+1],(time-flat[i])/duration if duration else 0)

def motion_rows(name, bone, times, rows, carry):
    result=[]
    # Keep fingers/wrist on the animated grip, with modest elbow/shoulder sway.
    gait = {"walk":0.18,"sprint":0.28,"crouch_walk":0.16,"crouch_idle":0.12}.get(name,0)
    factor = 1 if bone.startswith("upperarm") else 0.65 if bone.startswith("forearm") else 0.4 if bone.startswith("clavicle") else 0.15 if bone.startswith("hand") else 0
    span=max(1e-6,times[-1][0]-times[0][0])
    for time, original in zip(times,rows):
        phase=(time[0]-times[0][0])/span
        pose=sample(carry[0],carry[1],phase)
        result.append(slerp(pose,original,gait*factor))
    result[-1]=result[0][:]
    return result
