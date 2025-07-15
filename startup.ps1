$PSScriptRoot  # This variable contains the folder of the running script
Set-Location $PSScriptRoot
$env:LOG_LEVEL = 2
Start-Process node -ArgumentList "./dist/server.js" -WindowStyle Hidden