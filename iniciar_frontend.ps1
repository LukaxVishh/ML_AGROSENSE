$ErrorActionPreference = 'Stop'
$pastaFrontend = Join-Path $PSScriptRoot 'frontend'
$comandoPnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if ($comandoPnpm) {
    $executavelPnpm = $comandoPnpm.Source
} else {
    $executavelPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
    if (-not (Test-Path -LiteralPath $executavelPnpm)) {
        throw 'Instale Node.js 22+ e pnpm, depois execute novamente. Consulte frontend/README.md.'
    }
}

Push-Location -LiteralPath $pastaFrontend
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & $executavelPnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependências.' }
    }
    & $executavelPnpm run dev
} finally {
    Pop-Location
}
