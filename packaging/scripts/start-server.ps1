# 로컬 정적 서버 (경로 고정 없음 — 스크립트 위치 기준)
param(
    [int]$Port = 8765
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Add-Type -AssemblyName System.Web

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
}

function Get-ContentType([string]$path) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    if ($mime.ContainsKey($ext)) { return $mime[$ext] }
    return "application/octet-stream"
}

$url = "http://127.0.0.1:$Port/standalone-client/index.html"
Start-Process $url

Write-Host "JB 블로그 생성기 실행 중: $url"
Write-Host "종료하려면 이 창을 닫으세요."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
        $rawPath = $request.Url.LocalPath
        if ($rawPath -eq "/" -or $rawPath -eq "") {
            $rawPath = "/standalone-client/index.html"
        }
        $rel = $rawPath.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
        $full = Join-Path $Root $rel
        $full = [IO.Path]::GetFullPath($full)

        if (-not $full.StartsWith([IO.Path]::GetFullPath($Root))) {
            $response.StatusCode = 403
            $bytes = [Text.Encoding]::UTF8.GetBytes("Forbidden")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        if (-not (Test-Path $full -PathType Leaf)) {
            $response.StatusCode = 404
            $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        $bytes = [IO.File]::ReadAllBytes($full)
        $response.StatusCode = 200
        $response.ContentType = Get-ContentType $full
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    catch {
        $response.StatusCode = 500
        $msg = [Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    finally {
        $response.Close()
    }
}
