<#
.SYNOPSIS
    校验本仓库的 Git 状态，确保 AGENTS.md 中的仓库要求被满足。

.DESCRIPTION
    逐项检查：仓库已初始化、主分支名为 main、提交身份已配置、已有提交、
    AGENTS.md 已被跟踪、工作区干净、仓库对象完整。
    任意一项失败即以退出码 1 结束，全部通过则退出码 0。

.EXAMPLE
    pwsh -NoProfile -File .\tests\verify-repo.ps1

.EXAMPLE
    pwsh -NoProfile -File .\tests\verify-repo.ps1 -GitPath 'D:\Desktop\tools\PortableGit\cmd\git.exe'
#>
[CmdletBinding()]
param(
    # 待校验的仓库根目录，默认为本脚本所在目录的上一级。
    [string]$RepoPath = (Split-Path -Parent $PSScriptRoot),

    # git 可执行文件路径，默认先找 PATH，再回退到绿色版 PortableGit。
    [string]$GitPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# 避免 PowerShell 7.4+ 把原生命令的非零退出码直接变成终止性错误，
# 这些检查需要自己读取 $LASTEXITCODE。
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Resolve-GitExecutable {
    param([string]$Explicit)

    if ($Explicit) {
        if (-not (Test-Path -LiteralPath $Explicit)) {
            throw "指定的 git 不存在: $Explicit"
        }
        return (Resolve-Path -LiteralPath $Explicit).Path
    }

    $onPath = Get-Command git -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    $portable = 'D:\Desktop\tools\PortableGit\cmd\git.exe'
    if (Test-Path -LiteralPath $portable) { return $portable }

    throw '未找到 git：请将 git 加入 PATH，或使用 -GitPath 指定 git.exe 路径。'
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string[]]$GitArgs,
        [switch]$AllowFailure
    )

    $output = & $script:GitExe -C $script:RepoRoot @GitArgs 2>&1
    $exitCode = $LASTEXITCODE
    $text = (($output | ForEach-Object { $_.ToString() }) -join "`n").Trim()

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "git $($GitArgs -join ' ') 执行失败（退出码 $exitCode）：$text"
    }
    return $text
}

$results = [System.Collections.Generic.List[object]]::new()

function Test-Check {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][scriptblock]$Body
    )

    try {
        $detail = & $Body
        $results.Add([pscustomobject]@{ 检查项 = $Name; 结果 = 'PASS'; 说明 = $detail })
    }
    catch {
        $results.Add([pscustomobject]@{ 检查项 = $Name; 结果 = 'FAIL'; 说明 = $_.Exception.Message })
    }
}

if (-not (Test-Path -LiteralPath $RepoPath)) {
    Write-Error "仓库目录不存在: $RepoPath"
    exit 1
}
$RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path

try {
    $GitExe = Resolve-GitExecutable -Explicit $GitPath
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}

$RepoRoot = $RepoPath

Write-Host "仓库目录: $RepoRoot"
Write-Host "git 路径: $GitExe"
Write-Host ''

Test-Check '仓库已初始化' {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) {
        throw '缺少 .git 目录'
    }
    $inside = Invoke-Git @('rev-parse', '--is-inside-work-tree')
    if ($inside -ne 'true') { throw "git 报告的工作区状态为 '$inside'" }
    '工作区已纳入 git 管理'
}

Test-Check '主分支为 main' {
    $branch = Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')
    if ($branch -ne 'main') { throw "当前分支为 '$branch'，期望 'main'" }
    'main'
}

Test-Check '提交身份已配置' {
    $name = Invoke-Git @('config', '--local', '--get', 'user.name')
    $email = Invoke-Git @('config', '--local', '--get', 'user.email')
    if (-not $name) { throw '未配置 user.name' }
    if (-not $email) { throw '未配置 user.email' }
    "$name <$email>"
}

Test-Check '已有至少一次提交' {
    $count = Invoke-Git @('rev-list', '--count', 'HEAD')
    if ($count -notmatch '^\d+$') { throw "无法读取提交数量: '$count'" }
    if ([int]$count -lt 1) { throw '提交数量为 0' }
    $head = Invoke-Git @('log', '-1', '--pretty=format:%h %s')
    "$count 次提交，最新：$head"
}

Test-Check 'AGENTS.md 已被跟踪' {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'AGENTS.md'))) {
        throw 'AGENTS.md 不存在'
    }
    $tracked = Invoke-Git @('ls-files', '--error-unmatch', 'AGENTS.md')
    if (-not $tracked) { throw 'AGENTS.md 未被 git 跟踪' }
    '已跟踪'
}

Test-Check '工作区干净' {
    $porcelain = Invoke-Git @('status', '--porcelain')
    if ($porcelain) { throw "存在未提交的改动：`n$porcelain" }
    '无未提交改动'
}

Test-Check '仓库对象完整' {
    $fsck = Invoke-Git @('fsck', '--no-progress')
    if ($fsck) { return "fsck 输出：$fsck" }
    'fsck 未报告问题'
}

Write-Host ''
$results | Format-Table -AutoSize | Out-String -Width 4096 | Write-Host

$failed = @($results | Where-Object { $_.结果 -eq 'FAIL' })
if ($failed.Count -gt 0) {
    Write-Host "失败 $($failed.Count) 项，通过 $($results.Count - $failed.Count) 项。" -ForegroundColor Red
    exit 1
}

Write-Host "全部 $($results.Count) 项检查通过。" -ForegroundColor Green
exit 0
