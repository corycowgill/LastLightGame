"""CPU-only normalization and LOD finishing of completed neural library runs."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('library', type=Path)
parser.add_argument('ids', nargs='+')
args = parser.parse_args()
library = args.library.resolve()
catalog = {a['id']: a for a in json.loads((library/'data/catalog.json').read_text(encoding='utf-8'))['assets']}
for asset in args.ids:
    runs = sorted((library/'generated'/asset).glob('*/manifest.json'), key=lambda p:p.stat().st_mtime, reverse=True)
    source = None
    for run in runs:
        data = json.loads(run.read_text(encoding='utf-8'))
        if data.get('backend') in ('hf','comfy') and data.get('qa_status') != 'rejected': source = data['file']; break
    if source is None: raise RuntimeError('No completed neural source: '+asset)
    version = 1
    while True:
        version_name = f'v{version:03d}'
        dest = library/'assets'/asset/version_name
        if not dest.exists(): break
        existing = json.loads((dest/'manifest.json').read_text(encoding='utf-8'))
        import hashlib
        if existing['source_sha256'] == hashlib.sha256((library/source).read_bytes()).hexdigest() and existing.get('qa_status') != 'rejected': break
        version += 1
    if not dest.exists(): subprocess.run([sys.executable,'scripts/package_asset.py','prepare',asset,source,'--version',version_name],cwd=library,check=True,stdout=subprocess.DEVNULL)
    prepared = json.loads((dest/'manifest.json').read_text(encoding='utf-8'))
    if 'optimization' not in prepared:
        subprocess.run(['C:/Users/coryc/Tools/Blender/blender.exe','--background','--python','scripts/blender_finish.py','--',str(dest),str(catalog[asset]['triangle_budget'])],cwd=library,check=True,stdout=subprocess.DEVNULL)
    print('FINISHED', asset, flush=True)
