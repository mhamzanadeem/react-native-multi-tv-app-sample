param(
    [string]$BaseUrl = 'https://hqlgs1kwjf.execute-api.us-east-1.amazonaws.com',
    [string]$InstallationId = ('tv-' + [guid]::NewGuid().ToString('N'))
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($InstallationId -notmatch '^tv-[a-f0-9]{32}$') { throw 'InstallationId must be tv- followed by 32 lowercase hexadecimal characters.' }
$guestHeaders = @{ 'X-TV-Installation-Id' = $InstallationId }
Write-Host "Diagnostic guest ID: $InstallationId (separate from your TV unless supplied explicitly)."
# Uses synthetic preferences only. The POST probes create two demo plan records.
Write-Host 'Checking the deployed API (creates two synthetic demo plans, no user history).'
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -TimeoutSec 15
    Write-Host 'Health response:'
    $health | ConvertTo-Json -Depth 8
} catch {
    Write-Warning "Health check failed: $($_.Exception.Message)"
}
$results = foreach ($probe in @(
    @{ fitnessLevel = 'beginner'; durationMinutes = 10 },
    @{ fitnessLevel = 'advanced'; durationMinutes = 30 }
)) {
    $request = @{
        requestId = 'diagnostic-' + [guid]::NewGuid().ToString('N')
        goal = 'general-fitness'
        fitnessLevel = $probe.fitnessLevel
        durationMinutes = $probe.durationMinutes
        equipment = @()
        lowImpact = $true
    }
    Write-Host ('Sending: ' + ($request | ConvertTo-Json -Compress))
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/v1/workouts/generate" -Method Post -Headers $guestHeaders -ContentType 'application/json' -Body ($request | ConvertTo-Json -Compress) -TimeoutSec 30
        $plan = $response.plan
        $matches = $plan -and $plan.fitnessLevel -eq $request.fitnessLevel -and $plan.targetDurationMinutes -eq $request.durationMinutes -and $plan.config.fitnessLevel -eq $request.fitnessLevel -and $plan.config.durationMinutes -eq $request.durationMinutes
        [pscustomobject]@{
            RequestId = $request.requestId
            Requested = "$($request.fitnessLevel) / $($request.durationMinutes) min"
            Returned = "$($plan.fitnessLevel) / $($plan.targetDurationMinutes) min"
            EstimatedSeconds = $plan.estimatedDurationSeconds
            Exercises = @($plan.exercises).Count
            Matches = [bool]$matches
        }
        if (-not $matches) {
            Write-Warning 'Deployed response does not match the request. Response follows:'
            $response | ConvertTo-Json -Depth 12 | Write-Host
        }
    } catch {
        Write-Warning "Generate failed for $($request.requestId): $($_.Exception.Message)"
        if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
    }
}
$results | Format-List
Write-Host 'Both Matches=True: deployed planner honors level/time; investigate the running app and its outgoing request.'
Write-Host 'Matches=False: deployed API/Lambda response is incompatible or ignores preferences.'
Write-Host 'HTTP errors/timeouts: investigate API integration, Lambda logs, and connectivity before changing the UI.'
