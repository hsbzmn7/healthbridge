# Run ML service locally - use Python 3.11 to avoid build issues
# If you have Python 3.11: py -3.11 -m venv venv
# Or: & "C:\Users\hsbzm\AppData\Local\Programs\Python\Python311\python.exe" -m venv venv

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Prefer Python 3.11 (best compatibility)
$py311 = "C:\Users\hsbzm\AppData\Local\Programs\Python\Python311\python.exe"
if (Test-Path $py311) {
    Write-Host "Using Python 3.11"
    & $py311 -m venv venv
} else {
    Write-Host "Using default Python (3.11 recommended)"
    python -m venv venv
}

& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
