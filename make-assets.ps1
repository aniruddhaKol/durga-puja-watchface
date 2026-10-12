$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Join-Path $PSScriptRoot 'assets/432x514-amazfit-bip-max'
New-Item -ItemType Directory -Path $root -Force | Out-Null
function Save-Text($name, $value, $width, $height, $size, $color, $family='Impact', $bold=$false) {
  $bmp = [System.Drawing.Bitmap]::new($width,$height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $style = if($bold){[System.Drawing.FontStyle]::Bold}else{[System.Drawing.FontStyle]::Regular}
  $font = [System.Drawing.Font]::new($family,$size,$style,[System.Drawing.GraphicsUnit]::Pixel)
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
  $format = [System.Drawing.StringFormat]::GenericTypographic.Clone()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
  $g.DrawString([string]$value,$font,$brush,[System.Drawing.RectangleF]::new(0,0,$width,$height),$format)
  $bmp.Save((Join-Path $root $name),[System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose();$brush.Dispose();$font.Dispose();$g.Dispose();$bmp.Dispose()
}
foreach($pair in @(@('background-source.png','background.png'),@('aod-background-source.png','aod-background.png'))) {
  $source = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot $pair[0]))
  $bmp = [System.Drawing.Bitmap]::new(432,514)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($source,0,0,432,514)
  # Generated edits are confined to lower side panels; preserve the center and upper artwork.
  $cornerName = if($pair[1] -eq 'background.png'){'bottom-corners-source.png'}else{'aod-bottom-corners-source.png'}
  $cornerPath = Join-Path $PSScriptRoot $cornerName
  if(Test-Path -LiteralPath $cornerPath) {
    $edited = [System.Drawing.Image]::FromFile($cornerPath)
    $scaled = [System.Drawing.Bitmap]::new(432,514)
    $eg = [System.Drawing.Graphics]::FromImage($scaled)
    $eg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $eg.DrawImage($edited,0,0,432,514)
    foreach($rect in @([System.Drawing.Rectangle]::new(0,436,134,78),[System.Drawing.Rectangle]::new(298,436,134,78))) {
      $g.DrawImage($scaled,$rect,$rect,[System.Drawing.GraphicsUnit]::Pixel)
    }
    $eg.Dispose();$scaled.Dispose();$edited.Dispose()
  }
  $bmp.Save((Join-Path $root $pair[1]),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose();$bmp.Dispose();$source.Dispose()
}
$sets = @(
  @{Name='clock';W=33;H=61;Size=60;Color='#780400';Family='Impact'},
  @{Name='health';W=25;H=49;Size=48;Color='#070706';Family='Impact'},
  @{Name='steps';W=17;H=43;Size=41;Color='#070706';Family='Impact'},
  @{Name='distance';W=19;H=43;Size=41;Color='#070706';Family='Impact'},
  @{Name='cal';W=25;H=43;Size=41;Color='#070706';Family='Impact'},
  @{Name='temp';W=24;H=43;Size=41;Color='#070706';Family='Impact'},
  @{Name='battery';W=12;H=28;Size=26;Color='#070706';Family='Impact'},
  @{Name='sun';W=9;H=22;Size=22;Color='#070706';Family='Impact'},
  @{Name='date';W=17;H=27;Size=26;Color='#9e0000';Family='Impact'},
  @{Name='aod-clock';W=43;H=72;Size=68;Color='#d2ab71';Family='Georgia';Bold=$true},
  @{Name='aod-date';W=17;H=26;Size=24;Color='#d2ab71';Family='Georgia';Bold=$true},
  @{Name='aod-bat';W=11;H=25;Size=24;Color='#ac814f';Family='Impact'},
  @{Name='aod-steps';W=10;H=25;Size=24;Color='#ac814f';Family='Impact'}
)
foreach($set in $sets) {
  foreach($digit in 0..9) { Save-Text ($set.Name+'-'+$digit+'.png') $digit $set.W $set.H $set.Size $set.Color $set.Family ([bool]$set.Bold) }
}
Save-Text 'aod-clock-colon.png' ':' 18 72 62 '#d2ab71' 'Georgia' $true
Save-Text 'dot.png' '.' 7 43 41 '#070706'
Save-Text 'sun-colon.png' ':' 4 22 20 '#070706'
Save-Text 'minus.png' '-' 13 43 36 '#070706'
Save-Text 'percent.png' '%' 14 28 25 '#070706'
Save-Text 'aod-percent.png' '%' 17 25 24 '#ac814f'
# Center the affected sprites by their visible pixels, not the font's line box.
# Draw to a large canvas first so narrow sprite widths cannot clip glyphs.
function Save-CenteredGlyph($name,$value,$width,$height,$size,$color) {
  $canvas=[System.Drawing.Bitmap]::new(80,80)
  $cg=[System.Drawing.Graphics]::FromImage($canvas)
  $cg.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $font=[System.Drawing.Font]::new('Impact',$size,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
  $brush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
  $cg.DrawString([string]$value,$font,$brush,10,10)
  $left=80;$top=80;$right=-1;$bottom=-1
  for($yy=0;$yy -lt 80;$yy++){for($xx=0;$xx -lt 80;$xx++){if($canvas.GetPixel($xx,$yy).A -gt 0){$left=[math]::Min($left,$xx);$right=[math]::Max($right,$xx);$top=[math]::Min($top,$yy);$bottom=[math]::Max($bottom,$yy)}}}
  if($right -lt $left){throw "Empty glyph: $name"}
  $glyphWidth=$right-$left+1;$glyphHeight=$bottom-$top+1
  $drawWidth=[math]::Min($glyphWidth,$width-1);$drawHeight=[math]::Min($glyphHeight,$height-4)
  $bmp=[System.Drawing.Bitmap]::new($width,$height)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($canvas,[System.Drawing.Rectangle]::new([int][math]::Floor(($width-$drawWidth)/2),[int][math]::Floor(($height-$drawHeight)/2),$drawWidth,$drawHeight),$left,$top,$glyphWidth,$glyphHeight,[System.Drawing.GraphicsUnit]::Pixel)
  $bmp.Save((Join-Path $root $name),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose();$bmp.Dispose();$font.Dispose();$brush.Dispose();$cg.Dispose();$canvas.Dispose()
}
foreach($digit in 0..9) {
  Save-CenteredGlyph ('sun-'+$digit+'.png') $digit 9 22 22 '#070706'
  Save-CenteredGlyph ('aod-bat-'+$digit+'.png') $digit 11 25 24 '#ac814f'
}
Save-CenteredGlyph 'sun-colon.png' ':' 4 22 22 '#070706'
Save-CenteredGlyph 'aod-percent.png' '%' 17 25 24 '#ac814f'
Save-Text 'percent-large.png' '%' 24 23 24 '#070706'
Save-Text 'km-label.png' 'KM' 27 18 18 '#070706'
Save-Text 'mi-label.png' 'MI' 27 18 18 '#070706'
Save-Text 'kcal-label.png' 'KCAL' 56 19 19 '#070706'
Save-Text 'celsius-label.png' ([string][char]176+'C') 30 21 21 '#070706'
Save-Text 'fahrenheit-label.png' ([string][char]176+'F') 30 21 21 '#070706'
# Recreate the small charge symbol erased along with the sample percentage.
$bolt = [System.Drawing.Bitmap]::new(19,28)
$bg = [System.Drawing.Graphics]::FromImage($bolt)
$bg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$bg.FillPolygon([System.Drawing.Brushes]::Black,[System.Drawing.Point[]]@([System.Drawing.Point]::new(14,0),[System.Drawing.Point]::new(1,16),[System.Drawing.Point]::new(8,16),[System.Drawing.Point]::new(5,28),[System.Drawing.Point]::new(18,11),[System.Drawing.Point]::new(11,11)))
$bolt.Save((Join-Path $root 'charge-icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$bg.Dispose();$bolt.Dispose()
$week = @('MON','TUE','WED','THU','FRI','SAT','SUN')
for($i=0;$i -lt 7;$i++) {
  Save-Text ('week-'+$i+'.png') $week[$i] 45 27 25 '#9e0000'
  Save-Text ('aod-week-'+$i+'.png') $week[$i] 54 26 24 '#d2ab71' 'Georgia' $true
}
$colors = @{red='#ed3232';blue='#2079d7';orange='#f06423';cream='#d9c397';amber='#e8a717';green='#0aa45e'}
$tapSizes = @(@(87,113),@(89,113),@(87,108),@(89,108),@(87,111),@(89,111),@(79,63),@(80,63),@(87,29),@(88,44),@(40,22))
foreach($dims in $tapSizes) {
  $bmp = [System.Drawing.Bitmap]::new($dims[0],$dims[1])
  $bmp.Save((Join-Path $root ('tap-'+$dims[0]+'x'+$dims[1]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  foreach($name in $colors.Keys) {
    $bmp = [System.Drawing.Bitmap]::new($dims[0],$dims[1])
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rgb = [System.Drawing.ColorTranslator]::FromHtml($colors[$name])
    $alpha = if($name -eq 'blue' -and $dims[1] -eq 29){72}else{36}
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($alpha,$rgb))
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(175,$rgb),2)
    $g.FillRectangle($brush,2,2,($dims[0]-4),($dims[1]-4))
    $g.DrawRectangle($pen,2,2,($dims[0]-4),($dims[1]-4))
    $bmp.Save((Join-Path $root ('press-'+$name+'-'+$dims[0]+'x'+$dims[1]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    $pen.Dispose();$brush.Dispose();$g.Dispose();$bmp.Dispose()
  }
}
foreach($level in 0..100) {
  $color = if($level -lt 20){'#ed3232'}elseif($level -le 50){'#e8a717'}else{'#3cb371'}
  foreach($scene in @(@('',78,10),@('aod-',34,12))) {
    $bmp = [System.Drawing.Bitmap]::new($scene[1],$scene[2])
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $rgb = [System.Drawing.ColorTranslator]::FromHtml($color)
    $alpha = if($scene[0] -eq 'aod-'){130}else{255}
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($alpha,$rgb))
    $filled = [int][math]::Floor($scene[1]*$level/100)
    if($filled -gt 0) { $g.FillRectangle($brush,0,0,$filled,$scene[2]) }
    $bmp.Save((Join-Path $root ($scene[0]+'battery-level-'+$level+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    $brush.Dispose();$g.Dispose();$bmp.Dispose()
  }
}
foreach($scene in @(@('battery-outline.png',86,18,'#070706'),@('aod-battery-outline.png',46,20,'#ac814f'))) {
  $bmp = [System.Drawing.Bitmap]::new($scene[1],$scene[2])
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($scene[3]),2)
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $w = if($scene[0] -eq 'aod-battery-outline.png'){42}else{84}
  $h = $scene[2]-2
  $path.AddArc(1,1,8,8,180,90);$path.AddArc(($w-8),1,8,8,270,90)
  $path.AddArc(($w-8),($h-8),8,8,0,90);$path.AddArc(1,($h-8),8,8,90,90);$path.CloseFigure()
  $g.DrawPath($pen,$path)
  if($scene[0] -eq 'aod-battery-outline.png'){$g.DrawLine($pen,44,7,44,13)}
  $bmp.Save((Join-Path $root $scene[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $path.Dispose();$pen.Dispose();$g.Dispose();$bmp.Dispose()
}
$bmp = [System.Drawing.Bitmap]::new(36,50)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::Black,3)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round;$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
# Match the reference: broad dome, rounded rays, two horizon strokes,
# a short marker underneath, and a tall divider with breathing room.
$dividerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::Black,1.5)
$g.DrawLine($dividerPen,35,1,35,48)
$g.FillPie([System.Drawing.Brushes]::Black,1,15,30,30,180,180)
$g.DrawLine($pen,1,30,31,30);$g.DrawLine($pen,1,35,31,35)
$g.DrawLine($pen,16,43,16,46)
foreach($ray in @(@(16,6,16,10),@(4,10,7,13),@(25,13,28,10),@(1,22,3,22),@(29,22,31,22))) { $g.DrawLine($pen,$ray[0],$ray[1],$ray[2],$ray[3]) }
$bmp.Save((Join-Path $root 'sun-panel.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$dividerPen.Dispose();$pen.Dispose();$g.Dispose();$bmp.Dispose()
$bmp = [System.Drawing.Bitmap]::new(27,29)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$color = [System.Drawing.ColorTranslator]::FromHtml('#ac814f')
$pen = [System.Drawing.Pen]::new($color,3)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round;$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$brush = [System.Drawing.SolidBrush]::new($color)
$g.FillEllipse($brush,13,0,6,6)
foreach($line in @(@(13,9,10,18),@(13,9,19,13),@(19,13,24,10),@(13,9,7,9),@(7,9,3,15),@(10,18,17,21),@(17,21,13,27),@(10,18,5,26))) { $g.DrawLine($pen,$line[0],$line[1],$line[2],$line[3]) }
$bmp.Save((Join-Path $root 'aod-step-icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$brush.Dispose();$pen.Dispose();$g.Dispose();$bmp.Dispose()
& (Join-Path $PSScriptRoot 'fit-display-contour.ps1')
Write-Output 'Generated both backgrounds, live numeral sprites, touch feedback and 202 battery frames.'
