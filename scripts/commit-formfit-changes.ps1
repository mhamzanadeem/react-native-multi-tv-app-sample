param([switch]$Push)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
function Invoke-Git { param([string[]]$GitArgs) & git @GitArgs; if ($LASTEXITCODE -ne 0) { throw "Git failed: $($GitArgs[0]). No reset or force push was attempted." } }
$branch = & git branch --show-current
if ($branch -ne 'hackathon') { throw 'Expected the hackathon branch. Review the commit plan before using another branch.' }
$staged = & git diff --cached --name-only
if ($staged) { throw 'The index already contains staged files. Review them before running this script.' }
$plan = Get-Content -LiteralPath 'docs/commit-plan.json' -Raw | ConvertFrom-Json
foreach ($group in $plan) {
    $changed = @(& git status --porcelain --untracked-files=all -- $group.files)
    if (!$changed) { Write-Host "Skipping unchanged group: $($group.title)"; continue }
    Invoke-Git -GitArgs (@('add', '--') + @($group.files))
    Invoke-Git -GitArgs @('commit', '-m', $group.title)
}
Invoke-Git -GitArgs @('log', '-9', '--oneline')
if ($Push) { Invoke-Git -GitArgs @('push', 'origin', 'hackathon') }
