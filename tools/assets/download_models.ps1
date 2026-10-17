param([switch]$IncludeMotion)
$ErrorActionPreference = 'Stop'
$assetRoot = Join-Path $PSScriptRoot '../../.asset-tools/models'
# Model files stay outside Git and the browser bundle. No token is printed.
$env:HF_HUB_DISABLE_XET = '1'
$env:PYTHONUTF8 = '1'
hf download stabilityai/TripoSR config.yaml model.ckpt --revision 5b521936b01fbe1890f6f9baed0254ab6351c04a --local-dir (Join-Path $assetRoot 'TripoSR')
if ($LASTEXITCODE -ne 0) { throw 'TripoSR download failed' }
if ($IncludeMotion) {
    hf download nvidia/Kimodo-SOMA-RP-v1.2 --revision 0e3c89024d896064b6851201373f7834784a386b --local-dir (Join-Path $assetRoot 'Kimodo-SOMA-RP-v1.2')
    if ($LASTEXITCODE -ne 0) { throw 'Kimodo download failed' }
}
Write-Host 'Downloads complete. Inference environments, encoder access, rigging and visual review are separate steps; see docs/AI_ASSET_PIPELINE.md.'
