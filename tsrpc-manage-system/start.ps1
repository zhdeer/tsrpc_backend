# 一键启动前后端（PowerShell）
# 用法: 在项目根目录执行 .\start.ps1  或  npm run dev

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }
Set-Location $root

# 若未安装依赖则先安装
if (-not (Test-Path "node_modules\concurrently")) {
    Write-Host ">>> 安装根目录依赖 ..." -ForegroundColor Yellow
    npm install
}

Write-Host ">>> 一键启动后端 + 前端 ..." -ForegroundColor Cyan
npm run dev
