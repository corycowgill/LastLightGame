"""Import neural-reconstructed library candidates, never authored/procedural substitutes.

Usage: python tools/assets/import_catalog.py LIBRARY_ROOT ASSET_ID [ASSET_ID ...]
Candidates remain explicitly labeled integration drafts until their library QA passes.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from compact_glb import compact, normalize_static

ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('library', type=Path)
    parser.add_argument('ids', nargs='+')
    args = parser.parse_args()
    library = args.library.resolve()
    catalog = json.loads((library / 'data/catalog.json').read_text(encoding='utf-8'))
    definitions = {a['id']: a for a in catalog['assets']}
    output = ROOT / 'public/models/catalog'
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version': 1, 'assets': []}
    entries = {a['id']: a for a in manifest['assets']}
    for asset_id in args.ids:
        spec = definitions[asset_id]
        candidates = sorted((library / 'assets' / asset_id).glob('*/manifest.json'), reverse=True)
        chosen = None
        for candidate in candidates:
            prepared = json.loads(candidate.read_text(encoding='utf-8'))
            source = library / prepared['source']
            run = json.loads((source.parent / 'manifest.json').read_text(encoding='utf-8'))
            if run.get('backend') not in ('hf', 'comfy') or run.get('qa_status') == 'rejected':
                continue
            model = library / prepared['file']
            if digest(model) != prepared['sha256'] or digest(source) != prepared['source_sha256']:
                raise ValueError('Source or candidate changed: ' + asset_id)
            chosen = (prepared, run, model)
            break
        if chosen is None:
            raise ValueError('No neural reconstructed candidate: ' + asset_id)
        prepared, run, model = chosen
        if entries.get(asset_id, {}).get('animation_binding') and entries[asset_id]['source_sha256'] == run['sha256']:
            print('Retained bound character', asset_id)
            continue
        destination = output / (asset_id + '.glb')
        triangles = prepared['metrics']['triangles']
        if asset_id in ('arc_wall_2m','arc_floor_2m'):
            lod = prepared['lods'][0]
            model = library / lod['file']
            triangles = lod['triangles']
        shutil.copy2(model, destination)
        texture_size = spec.get('runtime_texture_size', 512)
        compact(destination, max_size=texture_size)
        if spec['category'] != 'characters':
            normalize_static(destination, spec['scale_axis'], spec['target_size_m'], align_longest=asset_id in ('pro_chalk','pro_match_case','pro_journal'), thin_y=asset_id=='arc_floor_2m')
        if spec.get('reference'):
            reference = library / spec['reference']
        else:
            references = list((library / 'generated' / asset_id).glob('*/reference.png'))
            reference = next((p for p in references if digest(p) == run['reference_sha256']), None)
            if reference is None: raise ValueError('Generated reference provenance missing: ' + asset_id)
        entries[asset_id] = {
            'id': asset_id, 'name': spec['name'], 'file': asset_id + '.glb',
            'method': 'image_to_3d', 'model': 'microsoft/TRELLIS.2-4B',
            'backend': run['backend'], 'job_id': run['job_id'], 'seed': run['seed'],
            'reference': reference.relative_to(library).as_posix(), 'reference_sha256': digest(reference),
            'source_sha256': run['sha256'], 'sha256': digest(destination),
            'bytes': destination.stat().st_size, 'triangles': triangles,
            'finishing': f'Blender budget reduction; texture resize to {texture_size}; geometry preserved during texture packing',
            'target_size_m': spec['target_size_m'], 'scale_axis': spec['scale_axis'],
            'units': 'meters', 'up_axis': 'Y', 'pivot': 'ground_center',
            'forward_axis': prepared['forward_axis'],
            'library_version': prepared['version'],
            'qa_status': prepared['qa_status'], 'integration_status': 'reviewable_in_game_draft',
            'license': 'TRELLIS.2 model MIT; original project reference',
            'license_url': 'https://huggingface.co/microsoft/TRELLIS.2-4B',
        }
        provenance = ROOT / 'docs/catalog-assets' / asset_id
        provenance.mkdir(parents=True, exist_ok=True)
        for name, data in [('definition.json', spec), ('generation.json', run), ('preparation.json', prepared)]:
            (provenance / name).write_text(json.dumps(data, indent=2), encoding='utf-8')
        print(asset_id, destination.stat().st_size, 'bytes', triangles, 'triangles')
    manifest['assets'] = sorted(entries.values(), key=lambda a: a['id'])
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
