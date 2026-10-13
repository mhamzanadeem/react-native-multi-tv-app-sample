# Windows PowerShell 5.1 and PowerShell 7. Process-scoped settings only.
[CmdletBinding()]
param(
    [string]$SdkPath,
    [ValidatePattern('^[A-Za-z0-9_.-]+$')][string]$AvdName = 'Hackathon_TV',
    [ValidateRange(30, 1800)][int]$BootTimeoutSeconds = 300,
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = Split-Path -Parent $PSScriptRoot
$script:LaunchExitCode = 1

function ConvertFrom-JavaProperty([string]$Value) {
    return [regex]::Replace($Value, '\\(u[0-9a-fA-F]{4}|.)', {
        param($match)
        $escape = $match.Groups[1].Value
        if ($escape -match '^u[0-9a-fA-F]{4}$') {
            return [string][char][Convert]::ToInt32($escape.Substring(1), 16)
        }
        switch ($escape) {
            't' { return "`t" }; 'r' { return "`r" }; 'n' { return "`n" }; 'f' { return "`f" }
            default { return $escape }
        }
    })
}

function Get-LocalSdkPath([string]$PropertiesPath) {
    if (Test-Path -LiteralPath $PropertiesPath -PathType Leaf) {
        foreach ($line in [IO.File]::ReadAllLines($PropertiesPath)) {
            if ($line -match '^\s*sdk\.dir\s*(?:[=:]\s*|\s+)(.*)$') {
                ConvertFrom-JavaProperty $Matches[1]
            }
        }
    }
}

function Find-AndroidSdk([string]$ExplicitPath, [string]$PropertiesPath) {
    $candidates = @()
    if ($ExplicitPath) { $candidates += $ExplicitPath }
    else {
        $candidates += $env:ANDROID_HOME, $env:ANDROID_SDK_ROOT
        $candidates += @(Get-LocalSdkPath $PropertiesPath)
        $localAppData = [Environment]::GetFolderPath('LocalApplicationData')
        if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk') }
        if ($localAppData) { $candidates += (Join-Path $localAppData 'Android\Sdk') }
        if ($env:USERPROFILE) { $candidates += (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk') }
        foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
            if ($base) { $candidates += (Join-Path $base 'Android\android-sdk') }
        }
        foreach ($tool in @('adb.exe', 'emulator.exe')) {
            $command = Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($command) { $candidates += (Split-Path -Parent (Split-Path -Parent $command.Source)) }
        }
    }
    foreach ($candidate in @($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        $candidate = [Environment]::ExpandEnvironmentVariables($candidate.Trim().Trim('"'))
        try {
            $resolved = [IO.Path]::GetFullPath($candidate)
            if ((Test-Path -LiteralPath (Join-Path $resolved 'platform-tools\adb.exe') -PathType Leaf) -and
                (Test-Path -LiteralPath (Join-Path $resolved 'emulator\emulator.exe') -PathType Leaf)) {
                return $resolved
            }
        } catch { Write-Verbose "Cannot inspect SDK candidate: $candidate" }
        Write-Warning "SDK candidate is incomplete or inaccessible: $candidate"
    }
    throw 'Android SDK not found with both platform-tools\adb.exe and emulator\emulator.exe. Open Android Studio > Settings > Languages & Frameworks > Android SDK (or Tools > SDK Manager). Copy Android SDK Location and install Android SDK Platform-Tools and Android Emulator. Then run: yarn.cmd tv:start -SdkPath "<Android SDK Location>". No SDK path was guessed.'
}

function Set-LocalSdkPath([string]$PropertiesPath, [string]$AndroidSdk) {
    $text = ''
    $encoding = New-Object Text.UTF8Encoding($false)
    if (Test-Path -LiteralPath $PropertiesPath -PathType Leaf) {
        $reader = New-Object IO.StreamReader($PropertiesPath, $true)
        try { $text = $reader.ReadToEnd(); $encoding = $reader.CurrentEncoding } finally { $reader.Dispose() }
    }
    $newline = "`r`n"
    if ($text.Contains("`n") -and -not $text.Contains("`r`n")) { $newline = "`n" }
    # Forward slashes avoid Java's backslash escaping; Unicode is escaped for Properties.load.
    $value = $AndroidSdk.Replace('\', '/')
    $value = [regex]::Replace($value, '[^\x20-\x7e]', { param($m) '\u{0:x4}' -f [int][char]$m.Value })
    $entry = 'sdk.dir=' + $value
    $pattern = '(?m)^[\t ]*sdk\.dir(?:[\t ]*[=:][\t ]*|[\t ]+)[^\r\n]*'
    $matches = [regex]::Matches($text, $pattern)
    foreach ($match in $matches) {
        if ($match.Value -match '(?<!\\)(?:\\\\)*\\$') {
            throw 'sdk.dir uses a continued line in local.properties. Set it to one line before retrying; the launcher will not overwrite its continuation or unrelated properties.'
        }
    }
    if ($matches.Count -gt 0) {
        $updated = [regex]::Replace($text, $pattern, [Text.RegularExpressions.MatchEvaluator]{ param($m) $entry })
    } else {
        $separator = ''
        if ($text.Length -gt 0 -and -not $text.EndsWith("`n")) { $separator = $newline }
        $updated = $text + $separator + $entry + $newline
    }
    if ($updated -ne $text) {
        [IO.File]::WriteAllText($PropertiesPath, $updated, $encoding)
        Write-Host "Updated sdk.dir in $PropertiesPath (other properties preserved)."
    } else { Write-Host 'local.properties already points to this SDK.' }
}

function Invoke-AndroidTool([string]$Executable, [string[]]$ToolArguments, [int]$TimeoutSeconds = 15) {
    # All arguments here are fixed command tokens or validated AVD/serial identifiers.
    foreach ($argument in $ToolArguments) {
        if ($argument -match '[\s"]') { throw 'Internal error: unexpected whitespace in Android command token.' }
    }
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Executable
    $info.Arguments = $ToolArguments -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            $process.Kill()
            throw "$(Split-Path -Leaf $Executable) timed out after $TimeoutSeconds seconds. Inspect the Android Studio Device Manager and retry."
        }
        return [pscustomobject]@{ ExitCode = $process.ExitCode; Output = $stdout.Result.Trim(); Error = $stderr.Result.Trim() }
    } finally { $process.Dispose() }
}

function Get-EmulatorDevices([string]$Adb) {
    $result = Invoke-AndroidTool $Adb @('devices', '-l')
    if ($result.ExitCode -ne 0) {
        throw "ADB devices failed (exit $($result.ExitCode)). $($result.Error) $($result.Output)"
    }
    foreach ($line in ($result.Output -split '\r?\n')) {
        if ($line -match '^(emulator-\d+)\s+(\S+)') {
            [pscustomobject]@{ Serial = $Matches[1]; State = $Matches[2] }
        }
    }
}

function Get-EmulatorIdentity([string]$Adb, [string]$Serial) {
    $result = Invoke-AndroidTool $Adb @('-s', $Serial, 'emu', 'avd', 'name') 10
    if ($result.ExitCode -eq 0) {
        return (($result.Output -split '\r?\n' | Where-Object { $_ -and $_ -ne 'OK' } | Select-Object -First 1) -as [string])
    }
    return ''
}

function Find-TvDevice([string]$Adb, [string]$PreferredAvd) {
    $otherTv = $null
    foreach ($device in @(Get-EmulatorDevices $Adb)) {
        $name = Get-EmulatorIdentity $Adb $device.Serial
        if ($name -eq $PreferredAvd) { return [pscustomobject]@{ Serial = $device.Serial; Name = $name } }
        if ($device.State -eq 'device' -and $name) {
            $features = Invoke-AndroidTool $Adb @('-s', $device.Serial, 'shell', 'pm', 'list', 'features') 10
            if ($features.ExitCode -eq 0 -and $features.Output -match 'android\.software\.leanback') {
                $otherTv = [pscustomobject]@{ Serial = $device.Serial; Name = $name }
            }
        }
    }
    return $otherTv
}

function Invoke-TvStartup {
    # Preserve native exit codes even if a PowerShell 7 profile enables native-error throwing.
    $PSNativeCommandUseErrorActionPreference = $false
    Push-Location -LiteralPath $script:ProjectRoot
    try {
        [string]$branch = & git branch --show-current
        if ($LASTEXITCODE -ne 0 -or $branch.Trim() -ne 'hackathon') {
            throw "Expected the existing hackathon branch in $script:ProjectRoot; found '$branch'. No branch was switched."
        }
        $yarn = Get-Command yarn.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $yarn) { throw 'yarn.cmd is missing. Install/configure Node.js and Corepack with Yarn 4.5.0, then run yarn.cmd install --immutable in the project root.' }
        if (-not (Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue)) { throw 'Node.js is missing from PATH.' }
        if (-not (Get-Command java.exe -CommandType Application -ErrorAction SilentlyContinue)) { throw 'Java is missing from PATH. Install JDK 17 and configure JAVA_HOME for this terminal, then retry.' }
        if ($env:JAVA_HOME -and -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe') -PathType Leaf)) {
            throw 'JAVA_HOME does not contain bin\java.exe. Set it to your JDK 17 installation in this terminal, or clear a stale override and retry.'
        }
        $androidDirectory = Join-Path $script:ProjectRoot 'apps\expo-multi-tv\android'
        if (-not (Test-Path -LiteralPath (Join-Path $androidDirectory 'gradlew.bat') -PathType Leaf)) {
            throw 'Existing Android native project is missing. Review the Expo TV prebuild configuration before generating it; this launcher does not run a clean prebuild.'
        }
        $propertiesPath = Join-Path $androidDirectory 'local.properties'
        $androidSdk = Find-AndroidSdk $SdkPath $propertiesPath
        $env:ANDROID_HOME = $androidSdk
        $env:ANDROID_SDK_ROOT = $androidSdk
        $env:PATH = (Join-Path $androidSdk 'platform-tools') + ';' + (Join-Path $androidSdk 'emulator') + ';' + $env:PATH
        $adb = Join-Path $androidSdk 'platform-tools\adb.exe'
        $emulator = Join-Path $androidSdk 'emulator\emulator.exe'
        Write-Host "Project: $script:ProjectRoot | Branch: hackathon"
        Write-Host "Android SDK: $androidSdk"
        if (-not $CheckOnly) { Set-LocalSdkPath $propertiesPath $androidSdk }

        $avds = Invoke-AndroidTool $emulator @('-list-avds')
        if ($avds.ExitCode -ne 0) { throw "Could not list AVDs: $($avds.Error)" }
        $availableAvds = @($avds.Output -split '\r?\n' | Where-Object { $_ })
        Write-Host "Available AVDs: $($availableAvds -join ', ')"
        $profilePath = [Environment]::GetFolderPath('UserProfile')
        if (-not $profilePath) {
            Write-Warning "Windows profile API returned an empty path. ADB may try to create \.android. USERPROFILE is '$env:USERPROFILE'. Run this command in your normal Windows user PowerShell outside the restricted runner."
        }
        $devices = Invoke-AndroidTool $adb @('devices', '-l')
        if ($devices.ExitCode -ne 0) {
            $script:LaunchExitCode = $devices.ExitCode
            throw "ADB failed (exit $($devices.ExitCode)).`n$($devices.Error)`n$($devices.Output)`nIf this reports .android access denied, use your normal Windows account and check its profile directory permissions and any ANDROID_USER_HOME/ANDROID_EMULATOR_HOME overrides. Do not delete .android or run as Administrator. This launcher does not change ACLs, reset ADB keys, or move AVD data."
        }
        Write-Host $devices.Output
        $selected = Find-TvDevice $adb $AvdName
        if ($CheckOnly) {
            if ($selected) { Write-Host "Reusable TV emulator: $($selected.Name) ($($selected.Serial))." }
            elseif ($availableAvds -notcontains $AvdName) { throw "AVD '$AvdName' is missing. Create an Android TV AVD with this name in Android Studio > Device Manager." }
            else { Write-Host "AVD '$AvdName' exists and can be started by the normal command." }
            Write-Host 'Diagnostics complete; no properties were written, emulator started, or app built.'
            $script:LaunchExitCode = 0
            return
        }
        $emulatorProcess = $null
        if (-not $selected) {
            # An unidentified offline emulator could be the requested AVD still booting.
            $offline = @(Get-EmulatorDevices $adb | Where-Object { $_.State -ne 'device' })
            if ($offline.Count -gt 0) {
                throw 'An offline/unidentified emulator is already running. Wait for it to connect, or close it in Device Manager and retry. A duplicate AVD will not be started.'
            }
            if ($availableAvds -notcontains $AvdName) { throw "AVD '$AvdName' is missing. Create it using an Android TV device and system image in Android Studio > Device Manager, then retry." }
            Write-Host "Starting Android TV emulator '$AvdName'..."
            # Only the emulator GUI is visible; there is no extra console window.
            $emulatorProcess = Start-Process -FilePath $emulator -ArgumentList @('-avd', $AvdName) -WorkingDirectory $script:ProjectRoot -WindowStyle Hidden -PassThru
        } else { Write-Host "Reusing $($selected.Name) ($($selected.Serial))." }

        $watch = [Diagnostics.Stopwatch]::StartNew()
        $booted = $false
        while ($watch.Elapsed.TotalSeconds -lt $BootTimeoutSeconds) {
            if (-not $selected) { $selected = Find-TvDevice $adb $AvdName }
            if ($selected) {
                $boot = Invoke-AndroidTool $adb @('-s', $selected.Serial, 'shell', 'getprop', 'sys.boot_completed') 10
                $packages = Invoke-AndroidTool $adb @('-s', $selected.Serial, 'shell', 'pm', 'path', 'android') 10
                if ($boot.ExitCode -eq 0 -and $boot.Output -eq '1' -and $packages.ExitCode -eq 0 -and $packages.Output -match '^package:') {
                    $booted = $true
                    break
                }
            }
            if ($emulatorProcess -and $emulatorProcess.HasExited -and $emulatorProcess.ExitCode -ne 0) {
                throw "Emulator exited with code $($emulatorProcess.ExitCode). Try launching '$AvdName' in Device Manager to see its virtualization/system-image error."
            }
            Write-Host ("Waiting for TV boot... {0}s / {1}s" -f [int]$watch.Elapsed.TotalSeconds, $BootTimeoutSeconds)
            Start-Sleep -Seconds 5
        }
        if (-not $booted) { throw "TV emulator did not finish booting within $BootTimeoutSeconds seconds. Check Device Manager and the emulator window. The emulator was left running; no data was wiped." }
        $features = Invoke-AndroidTool $adb @('-s', $selected.Serial, 'shell', 'pm', 'list', 'features') 10
        if ($features.ExitCode -ne 0 -or $features.Output -notmatch 'android\.software\.leanback') {
            throw "'$($selected.Name)' is not an Android TV emulator (leanback feature missing). Select an Android TV system image in Device Manager."
        }
        $env:ANDROID_SERIAL = $selected.Serial
        Write-Host "TV booted: $($selected.Name) ($($selected.Serial)). Launching yarn.cmd dev:android..."
        Write-Host 'Use Ctrl+C to stop Metro. Close the emulator window separately when finished.'
        # Expo's installed --device option selects by AVD name, not the ADB serial.
        & $yarn.Source dev:android --device $selected.Name
        $script:LaunchExitCode = $LASTEXITCODE
        if ($script:LaunchExitCode -ne 0) {
            Write-Host "Android development command failed with exit $script:LaunchExitCode. The build/launch error above is the real failure; the emulator remains running." -ForegroundColor Red
        }
    } finally { Pop-Location }
}

# Dot-sourcing loads helpers for validation without executing the workflow.
if ($MyInvocation.InvocationName -ne '.') {
    try { Invoke-TvStartup }
    catch { Write-Host ("TV startup failed: " + $_.Exception.Message) -ForegroundColor Red }
    exit $script:LaunchExitCode
}
