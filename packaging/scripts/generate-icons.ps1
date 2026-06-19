# JB스포츠 AI 블로그 생성기 — 아이콘 PNG 생성
param(
    [string]$Root = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = "Stop"
$assets = Join-Path $Root "assets"
$iconsDir = Join-Path $Root "chrome-extension\icons"

New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

Add-Type -AssemblyName System.Drawing

function New-IconPng {
    param([int]$Size, [string]$OutPath)
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(79, 70, 229))
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
    $margin = [int]($Size * 0.22)
    $inner = $Size - ($margin * 2)
    $g.FillEllipse($brush, $margin, $margin, $inner, $inner)
    $star = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $cx = $Size / 2
    $cy = $Size / 2
    $r = $Size * 0.18
    $points = @(
        [System.Drawing.PointF]::new($cx, $cy - $r),
        [System.Drawing.PointF]::new($cx + $r * 0.35, $cy + $r * 0.2),
        [System.Drawing.PointF]::new($cx - $r * 0.55, $cy + $r * 0.15),
        [System.Drawing.PointF]::new($cx + $r * 0.55, $cy + $r * 0.15),
        [System.Drawing.PointF]::new($cx - $r * 0.35, $cy + $r * 0.2)
    )
    $g.FillPolygon($star, $points)
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

@(16, 48, 128) | ForEach-Object {
    New-IconPng -Size $_ -OutPath (Join-Path $iconsDir "icon$_.png")
}

# 데스크톱·바로가기용
New-IconPng -Size 256 -OutPath (Join-Path $assets "icon.png")

# ICO (256 단일)
$iconPath = Join-Path $assets "icon.ico"
if (Test-Path $iconPath) { Remove-Item $iconPath -Force }
$png256 = Join-Path $assets "icon.png"
$icon = [System.Drawing.Icon]::FromHandle(
    ([System.Drawing.Bitmap]::FromFile($png256)).GetHicon()
)
$fs = [System.IO.File]::Create($iconPath)
$icon.Save($fs)
$fs.Close()

Write-Host "아이콘 생성 완료: $iconsDir, $assets"
