param([switch]$Aod,[string]$OutputName)
$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Join-Path $projectRoot 'assets/432x514-amazfit-bip-max'
$bmp = [System.Drawing.Bitmap]::new(432,514)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Black)
$layout = if($Aod){'previews/aod-preview-layout.json'}else{'previews/preview-layout.json'}
foreach($item in (Get-Content (Join-Path $projectRoot $layout) -Raw | ConvertFrom-Json)) {
  $img = [System.Drawing.Image]::FromFile((Join-Path $root $item.src))
  $g.DrawImageUnscaled($img,[int]$item.x,[int]$item.y)
  $img.Dispose()
}
if(-not $OutputName){$OutputName = if($Aod){'previews/watchface-aod-preview.png'}else{'previews/watchface-preview.png'}}
$bmp.Save((Join-Path $projectRoot $OutputName),[System.Drawing.Imaging.ImageFormat]::Png)
if($OutputName -eq 'previews/watchface-preview.png' -or $OutputName -eq 'previews/watchface-aod-preview.png') {
  $small = [System.Drawing.Bitmap]::new(294,350)
  $sg = [System.Drawing.Graphics]::FromImage($small)
  $sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $sg.DrawImage($bmp,0,0,294,350)
  $cover = if($Aod){'aod-preview.png'}else{'preview.png'}
  $small.Save((Join-Path $root $cover),[System.Drawing.Imaging.ImageFormat]::Png)
  $sg.Dispose();$small.Dispose()
}
$g.Dispose();$bmp.Dispose()
Write-Output "Saved $OutputName"
