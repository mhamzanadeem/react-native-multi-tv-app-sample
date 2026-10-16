$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
try {
    $artifact = Join-Path $projectRoot ('.validation\lambda-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $artifact -Force | Out-Null
    & node ./apps/expo-multi-tv/node_modules/typescript/lib/tsc.js ./infrastructure/lambda/handler.ts --target ES2020 --module commonjs --moduleResolution node --strict --esModuleInterop --skipLibCheck --rootDir . --outDir $artifact
    if ($LASTEXITCODE -ne 0) { throw 'Lambda TypeScript compilation failed.' }
    Copy-Item -LiteralPath ./infrastructure/lambda/index.mjs -Destination (Join-Path $artifact 'index.mjs')
    $archive = Join-Path $projectRoot '.validation\formfit-lambda.zip'
    Compress-Archive -Path (Join-Path $artifact '*') -DestinationPath $archive -Force
    Write-Host "Lambda package: $archive"
    Write-Host 'Runtime: Node.js 22.x | Handler: index.handler | TABLE_NAME=FormFitDemo'
} finally { Pop-Location }
