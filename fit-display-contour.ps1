$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Join-Path $PSScriptRoot 'assets/432x514-amazfit-bip-max'
$sample = [System.Drawing.Bitmap]::FromFile((Join-Path $PSScriptRoot 'display-outline.png'))
$rows = @()
$mask = [System.Drawing.Bitmap]::new(432,514)
for($y=0;$y -lt 514;$y++) {
  $left=0;$right=431
  if($y -lt 106 -or $y -ge 408) {
    for($x=0;$x -le 106;$x++) { $p=$sample.GetPixel($x,$y); if([math]::Max($p.R,[math]::Max($p.G,$p.B)) -gt 24){$left=$x;break} }
    for($x=431;$x -ge 325;$x--) { $p=$sample.GetPixel($x,$y); if([math]::Max($p.R,[math]::Max($p.G,$p.B)) -gt 24){$right=$x;break} }
  }
  $rows += ,@($left,$right)
  for($x=0;$x -lt $left;$x++){$mask.SetPixel($x,$y,[System.Drawing.Color]::Black)}
  for($x=$right+1;$x -lt 432;$x++){$mask.SetPixel($x,$y,[System.Drawing.Color]::Black)}
}
$sample.Dispose()
$mask.Save((Join-Path $root 'rounded-corners.png'),[System.Drawing.Imaging.ImageFormat]::Png)
foreach($name in @('background.png','aod-background.png')) {
  $path=Join-Path $root $name
  $image=[System.Drawing.Image]::FromFile($path)
  $bmp=[System.Drawing.Bitmap]::new($image);$image.Dispose()
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImageUnscaled($mask,0,0)
  $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose();$bmp.Dispose()
}
$mask.Dispose()
ConvertTo-Json -InputObject $rows -Compress | Set-Content (Join-Path $PSScriptRoot 'display-contour.json')
Write-Output 'Applied the previous Bip Max outline to both backgrounds and the runtime overlay.'
