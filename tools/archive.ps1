# Full archive of the 18 WILK jigs from Jigzi: jig JSON, module JSON, and every referenced media file.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$arch = Join-Path $root 'archive'
$jsonDir = Join-Path $arch 'json'
$mediaDir = Join-Path $arch 'media'
New-Item -ItemType Directory -Force $jsonDir, $mediaDir | Out-Null

$ids = Get-Content (Join-Path $PSScriptRoot 'jig-ids.txt') | Where-Object { $_.Trim() }

function Get-Utf8($url) { [Text.Encoding]::UTF8.GetString((Invoke-WebRequest -UseBasicParsing $url).RawContentStream.ToArray()) }

$allText = New-Object System.Text.StringBuilder
foreach ($id in $ids) {
    $jf = Join-Path $jsonDir "$id.json"
    if (-not (Test-Path $jf)) { [IO.File]::WriteAllText($jf, (Get-Utf8 "https://api.jigzi.org/v1/jig/$id/live")) }
    $jig = [IO.File]::ReadAllText($jf)
    [void]$allText.Append($jig)
    foreach ($m in ($jig | ConvertFrom-Json).jigData.modules) {
        $mf = Join-Path $jsonDir "$id`_$($m.id).json"
        if (-not (Test-Path $mf)) { [IO.File]::WriteAllText($mf, (Get-Utf8 "https://api.jigzi.org/v1/jig/module/live/$($m.id)")) }
        [void]$allText.Append([IO.File]::ReadAllText($mf))
    }
}

# Collect media refs: {"id":"...","lib":"User|Global|Web"[,"kind":"png"]}
$refs = @{}
foreach ($x in [regex]::Matches($allText.ToString(), '"id":"([0-9a-f-]{36})","lib":"(\w+)"(,"kind":"(\w+)")?')) {
    $key = "$($x.Groups[2].Value.ToLower())/$($x.Groups[1].Value)"
    $kind = $x.Groups[4].Value
    if (-not $refs.ContainsKey($key) -or $kind) { $refs[$key] = $kind }
}
"media refs: $($refs.Count)"

# curl on Windows can't write to non-ASCII paths from a config file — run inside mediaDir with relative outputs.
$cfg = New-Object System.Text.StringBuilder
foreach ($k in $refs.Keys) {
    $files = if ($refs[$k] -eq 'png') { @('original.png', 'resized.png') } else { @('audio.mp3') }
    foreach ($f in $files) {
        $out = Join-Path $mediaDir "$k/$f"
        if ((Test-Path $out) -and (Get-Item $out).Length -gt 0) { continue }
        [void]$cfg.AppendLine("url = `"https://uploads.jigzi.org/media/$k/$f`"")
        [void]$cfg.AppendLine("output = `"$k/$f`"")
    }
}
[IO.File]::WriteAllText((Join-Path $mediaDir 'curl-list.txt'), $cfg.ToString())
Push-Location $mediaDir
try {
    curl.exe --parallel --parallel-max 16 --create-dirs --fail --silent --show-error --retry 3 --config curl-list.txt
    # Refs with no kind that were not audio: retry as png
    foreach ($k in $refs.Keys) {
        if ($refs[$k] -ne 'png' -and -not (Test-Path "$k/audio.mp3")) {
            foreach ($f in @('original.png', 'resized.png')) {
                curl.exe --create-dirs --fail --silent -o "$k/$f" "https://uploads.jigzi.org/media/$k/$f"
            }
        }
    }
} finally { Pop-Location }
Remove-Item (Join-Path $mediaDir 'curl-list.txt') -ErrorAction SilentlyContinue

$refs.GetEnumerator() | ForEach-Object { "$($_.Key)`t$($_.Value)" } | Set-Content -Encoding utf8 (Join-Path $arch 'media-index.tsv')
$files = Get-ChildItem $mediaDir -Recurse -File
"downloaded files: $($files.Count), MB: {0:N1}" -f (($files | Measure-Object Length -Sum).Sum / 1MB)
