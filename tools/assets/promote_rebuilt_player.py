"""Promote the rebuilt player and separate torch with reproducible provenance.
Run from repository root: python tools/assets/promote_rebuilt_player.py LIBRARY FINISHED
"""
import hashlib,json,shutil,sys
from pathlib import Path
library,finished=map(Path,sys.argv[1:3]);dest=Path('docs/torchbearer-rebuild');dest.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
write=lambda p,d:Path(p).write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
records={}
for stable,asset,job,filename in [('cha_torchbearer','cha_torchbearer_clean_v2','ad92e118c2de4a2cabe318e7a467683d','torchbearer.glb'),('pro_torch','pro_torch_unlit_v2','f8c1d84dcb4a4bf885eff99f486f6cea','torch.glb')]:
 source=library/'assets'/asset/'v001';generation=library/'generated'/asset/job
 spec=read(generation/'asset_spec.json');manifest=read(source/'manifest.json')
 shutil.copy2(source/'model.glb',dest/(asset+'-unrigged.glb'))
 write(dest/(asset+'-generation.json'),read(generation/'manifest.json'))
 write(dest/(asset+'-spec.json'),spec)
 write(dest/(asset+'-preparation.json'),manifest)
 target=Path('public/models/catalog')/(stable+'.glb');shutil.copy2(finished/filename,target)
 if stable=='cha_torchbearer':shutil.copy2(target,'public/models/torchbearer.glb')
 records[stable]={'id':stable,'name':'Torchbearer — rebuilt HF motion rig' if stable.startswith('cha') else 'Separate unlit hand torch','file':target.name,'method':'image_to_3d','model':'microsoft/TRELLIS.2-4B','backend':'hf','job_id':job,'seed':spec['seed'],'reference':spec['reference'],'reference_sha256':sha('art-source/torchbearer-rebuild/'+('character-reference.png' if stable.startswith('cha') else 'torch-reference.png')),'source_sha256':manifest['source_sha256'],'sha256':sha(target),'bytes':target.stat().st_size,'triangles':manifest['metrics']['triangles'],'finishing':'Fresh anatomical heat bind; generated motion retarget with carry IK; 1024px textures' if stable.startswith('cha') else 'Blender reduction; 512px textures; grip and flame sockets','target_size_m':1.65 if stable.startswith('cha') else .65,'scale_axis':'y','units':'meters','up_axis':'Y','pivot':'ground_center' if stable.startswith('cha') else 'hand_grip','forward_axis':'-Z' if stable.startswith('cha') else 'Y-up torch','library_version':'v001','library_asset_id':asset,'qa_status':'needs_review','integration_status':'reviewable_in_game_draft','license':'TRELLIS.2 model MIT; original project reference; generated animation Outputs under Tencent HY-Motion terms','license_url':'https://huggingface.co/microsoft/TRELLIS.2-4B'}
player=records['cha_torchbearer'];player.update(skin_joints=52,animation_binding='Fresh 52-joint bind; generated torch-specific gaits; two-bone carry stabilization; gloved fingers wrist-weighted',animation_source={'model':'tencent/HY-Motion-1.0','space':'https://huggingface.co/spaces/tencent/HY-Motion-1.0','provenance':'docs/torchbearer-rebuild/provenance.json','license':'docs/torchbearer-rebuild/HY-Motion-LICENSE.txt'},clips=['idle','walk','sprint','crouch_idle','crouch_walk','interact','relight','burst','death','chalk','refill','extinguish','fear','quick_turn'])
manifest=read('public/models/catalog/manifest.json');manifest['assets']=[records.get(a['id'],a) for a in manifest['assets']];write('public/models/catalog/manifest.json',manifest)
motions=[read(p) for p in sorted(Path('art-source/torchbearer-rebuild/motions').glob('*.json')) if p.stem in ['idle','walk','sprint','crouch_idle','crouch_walk','interact','relight','burst','death']]
report=read('.asset-tools/rebuilt-player/torchbearer-v2.report.json');sockets=read(finished/'sockets.json')
sockets.update(player_sha256=player['sha256'],torch_sha256=records['pro_torch']['sha256'],old_skin_imported=False,motions=motions,bind_report=report,notes=['Original neural surface retained; temporary solve proxy is not exported','Provider template body is removed; raw FBX stays local and ignored','Generated motion is retargeted, made in-place, loop closed and floor adjusted','Right arm uses two-bone carry envelope; wrist orientation stabilized','Gloved fingers follow wrist; source finger joints retained, not individual finger skin articulation'])
write(dest/'provenance.json',sockets)
shutil.copy2('.asset-tools/research/hy-motion-license/LICENSE.txt',dest/'HY-Motion-LICENSE.txt')
print('Promoted new neural player and separate torch with source records and hashes')
