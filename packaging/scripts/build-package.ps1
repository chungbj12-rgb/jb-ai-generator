# 공유용 ZIP 패키지 빌드
param(
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$PackagingRoot = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $PackagingRoot -Parent

if (-not $OutputDir) {
    $OutputDir = Join-Path $PackagingRoot "dist"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmm"
$ReleaseName = "jbai-package-$Stamp"
$StageDir = Join-Path $OutputDir $ReleaseName
$ZipPath = Join-Path $OutputDir "$ReleaseName.zip"

if (Test-Path $StageDir) { Remove-Item $StageDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $StageDir | Out-Null

function Copy-Tree {
    param([string]$Src, [string]$Dst)
    New-Item -ItemType Directory -Force -Path $Dst | Out-Null
    Copy-Item -Path (Join-Path $Src "*") -Destination $Dst -Recurse -Force
}

# 아이콘 생성
& (Join-Path $PSScriptRoot "generate-icons.ps1") -Root $PackagingRoot

# 소스 chrome-extension에도 lib·assets·icons 동기화 (개발용)
$extDir = Join-Path $PackagingRoot "chrome-extension"
Copy-Tree (Join-Path $PackagingRoot "lib") (Join-Path $extDir "lib")
Copy-Tree (Join-Path $PackagingRoot "assets") (Join-Path $extDir "assets")

Copy-Tree (Join-Path $PackagingRoot "standalone-client") (Join-Path $StageDir "standalone-client")
Copy-Tree (Join-Path $PackagingRoot "lib") (Join-Path $StageDir "lib")
Copy-Tree (Join-Path $PackagingRoot "assets") (Join-Path $StageDir "assets")
Copy-Tree (Join-Path $PackagingRoot "chrome-extension") (Join-Path $StageDir "chrome-extension")
Copy-Tree (Join-Path $PackagingRoot "scripts") (Join-Path $StageDir "scripts")

# 확장 프로그램에 공용 lib·assets 동기화
Copy-Tree (Join-Path $PackagingRoot "lib") (Join-Path $StageDir "chrome-extension\lib")
Copy-Tree (Join-Path $PackagingRoot "assets") (Join-Path $StageDir "chrome-extension\assets")

# 실행 배치 (더블클릭) — ASCII 파일명으로 호환성 확보
$bat = @"
@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-server.ps1"
"@
$batPath = Join-Path $StageDir "start.bat"
[System.IO.File]::WriteAllText($batPath, $bat, [System.Text.UTF8Encoding]::new($false))

# 사용법 복사
Copy-Item (Join-Path $PackagingRoot "사용법.txt") (Join-Path $StageDir "사용법.txt") -Force

# ZIP
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path $StageDir -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "========================================"
Write-Host " 패키지 빌드 완료"
Write-Host " 폴더: $StageDir"
Write-Host " ZIP : $ZipPath"
Write-Host "========================================"
Write-Host ""
Write-Host "공유 방법: ZIP 파일을 전달 → 압축 해제 → start.bat 더블클릭"
