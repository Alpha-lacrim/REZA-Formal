[CmdletBinding()]
param(
    [switch]$RotateSecrets,
    [ValidateRange(1, 65535)]
    [int]$MssqlPort
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function New-SecureToken {
    param([int]$ByteCount = 48)

    $bytes = New-Object byte[] $ByteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }

    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Get-DotEnvValue {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $pattern = '^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$'
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        if ($line -match $pattern) {
            return $Matches[1].Trim()
        }
    }

    return $null
}

function Set-DotEnvValue {
    param(
        [string]$Path,
        [string]$Name,
        [string]$Value
    )

    [string[]]$lines = [System.IO.File]::ReadAllLines($Path)
    $pattern = '^\s*' + [regex]::Escape($Name) + '\s*='
    $updated = $false

    for ($index = 0; $index -lt $lines.Length; $index++) {
        if ($lines[$index] -match $pattern) {
            $lines[$index] = "$Name=$Value"
            $updated = $true
            break
        }
    }

    if (-not $updated) {
        $lines += "$Name=$Value"
    }

    [System.IO.File]::WriteAllLines($Path, $lines, $utf8NoBom)
}

function Remove-DotEnvValue {
    param(
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $pattern = '^\s*' + [regex]::Escape($Name) + '\s*='
    [string[]]$filtered = [System.IO.File]::ReadAllLines($Path) |
        Where-Object { $_ -notmatch $pattern }
    [System.IO.File]::WriteAllLines($Path, $filtered, $utf8NoBom)
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$rootEnvironment = Join-Path $repositoryRoot '.env'
$backendEnvironment = Join-Path $repositoryRoot 'backend\.env'
$frontendEnvironment = Join-Path $repositoryRoot 'frontend\.env.local'
$rootWasCreated = -not (Test-Path -LiteralPath $rootEnvironment)

if ($rootWasCreated) {
    Copy-Item -LiteralPath (Join-Path $repositoryRoot '.env.docker.example') -Destination $rootEnvironment
}

if (-not (Test-Path -LiteralPath $backendEnvironment)) {
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'backend\.env.example') -Destination $backendEnvironment
}

$rootDjangoSecret = Get-DotEnvValue -Path $rootEnvironment -Name 'DJANGO_SECRET_KEY'
$rootDatabasePassword = Get-DotEnvValue -Path $rootEnvironment -Name 'DB_PASSWORD'
$generateRequiredSecrets = $RotateSecrets -or $rootWasCreated -or
    [string]::IsNullOrWhiteSpace($rootDjangoSecret) -or
    [string]::IsNullOrWhiteSpace($rootDatabasePassword)

if ($generateRequiredSecrets) {
    $rootDjangoSecret = New-SecureToken -ByteCount 64
    $rootDatabasePassword = 'Rz!9aA_' + (New-SecureToken -ByteCount 36)
    Set-DotEnvValue -Path $rootEnvironment -Name 'DJANGO_SECRET_KEY' -Value $rootDjangoSecret
    Set-DotEnvValue -Path $rootEnvironment -Name 'DB_PASSWORD' -Value $rootDatabasePassword
    Set-DotEnvValue -Path $backendEnvironment -Name 'DJANGO_SECRET_KEY' -Value (New-SecureToken -ByteCount 64)
    Set-DotEnvValue -Path $backendEnvironment -Name 'DB_PASSWORD' -Value $rootDatabasePassword
}

if ($MssqlPort -gt 0) {
    Set-DotEnvValue -Path $rootEnvironment -Name 'MSSQL_PORT' -Value $MssqlPort.ToString()
}

foreach ($obsoleteName in @(
    'GEMINI_API_KEY',
    'VITE_GEMINI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'VITE_GOOGLE_GENERATIVE_AI_API_KEY'
)) {
    Remove-DotEnvValue -Path $frontendEnvironment -Name $obsoleteName
}

Write-Output 'Development environment prepared without displaying secret values.'
if ($generateRequiredSecrets) {
    Write-Output 'Generated fresh DJANGO_SECRET_KEY and DB_PASSWORD values in ignored environment files.'
}
else {
    Write-Output 'Existing non-empty root secrets were preserved. Use -RotateSecrets only when rotation is intentional.'
}
Write-Output 'Removed obsolete Gemini environment variable names from frontend/.env.local when present.'
if ($MssqlPort -gt 0) {
    Write-Output 'Updated the ignored Docker host SQL port without changing the container database port.'
}
