param(
    [ValidateSet('universal', 'x86_64', 'x86', 'arm64-v8a', 'armeabi-v7a')]
    [string]$Architecture = 'universal'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appDirectory = Join-Path $projectRoot 'apps\expo-multi-tv'
$androidDirectory = Join-Path $appDirectory 'android'
$previousTv = $env:EXPO_TV
$previousMode = $env:NODE_ENV
$previousMetroRoot = $env:EXPO_NO_METRO_WORKSPACE_ROOT
$targetAbis = if ($Architecture -eq 'universal') { @('armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64') } else { @($Architecture) }
try {
    $env:EXPO_TV = '1'
    $env:NODE_ENV = 'production'
    # Gradle passes the entry relative to the Expo app. Expo 54 otherwise uses
    # the Yarn workspace root as Metro's server root and resolves the wrong path.
    $env:EXPO_NO_METRO_WORKSPACE_ROOT = '1'
    if (-not (Test-Path -LiteralPath (Join-Path $androidDirectory 'gradlew.bat'))) {
        Push-Location -LiteralPath $appDirectory
        try {
            & node node_modules/expo/bin/cli prebuild --platform android --no-install
            if ($LASTEXITCODE -ne 0) { throw 'Android prebuild failed.' }
        } finally { Pop-Location }
    }
    Push-Location -LiteralPath $androidDirectory
    try {
        Write-Host "Building a standalone release APK for $Architecture (JavaScript and assets included)."
        Write-Host "CPU targets: $($targetAbis -join ', '). Universal APKs can exceed the upload limit."
        & .\gradlew.bat :app:assembleRelease "-PreactNativeArchitectures=$($targetAbis -join ',')" '-Pandroid.enableMinifyInReleaseBuilds=true' '-Pandroid.enableShrinkResourcesInReleaseBuilds=true' --no-daemon --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Release APK build failed. Review the Gradle error above.' }
    } finally { Pop-Location }
    $builtApk = Join-Path $androidDirectory 'app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $builtApk)) { throw 'Gradle finished without producing the expected APK.' }
    # Confirm that this is a self-contained bundle and only the selected CPU ABI.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($builtApk)
    try {
        if (-not ($archive.Entries | Where-Object FullName -eq 'assets/index.android.bundle')) {
            throw 'APK is missing the bundled JavaScript; do not submit it.'
        }
        $abis = @($archive.Entries | Where-Object { $_.FullName -match '^lib/([^/]+)/' } | ForEach-Object { ($_.FullName -split '/')[1] } | Sort-Object -Unique)
        if (@(Compare-Object -ReferenceObject $targetAbis -DifferenceObject $abis).Count -ne 0) { throw "Unexpected APK architectures: $($abis -join ', ')" }
    } finally { $archive.Dispose() }
    $outputDirectory = Join-Path $projectRoot '.validation\submission'
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $destination = Join-Path $outputDirectory "FormFit-TV-demo-$Architecture.apk"
    Copy-Item -LiteralPath $builtApk -Destination $destination -Force
    $bytes = (Get-Item -LiteralPath $destination).Length
    Write-Host "APK: $destination"
    Write-Host ('Size: {0:N2} MB ({1} bytes)' -f ($bytes / 1000000), $bytes)
    if ($bytes -gt 35000000) {
        Write-Warning 'This APK exceeds a conservative 35 MB limit. Do not upload it to that field; share the build output for further size investigation.'
    } else {
        Write-Host 'The APK is below 35 MB. Install and test it without Metro before uploading.'
    }
    Write-Host 'Uses the existing demo signing configuration. This is a judge-testing APK, not a production store release.'
    Write-Host "SHA256: $((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash)"
} finally {
    $env:EXPO_TV = $previousTv
    $env:NODE_ENV = $previousMode
    $env:EXPO_NO_METRO_WORKSPACE_ROOT = $previousMetroRoot
}
