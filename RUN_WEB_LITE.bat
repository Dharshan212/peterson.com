@echo off
rem MYELIN Web Lite local viewer. The app is made of ES modules, which browsers refuse to load from file://,
rem so the page must be opened through a web server. This serves dist\ (with the real release headers) on port 8080.
cd /d "%~dp0"
if not exist dist\index.html (
  echo dist\index.html not found. Run: py -3 PHASE_NOTES\tools\build_equiv.py .
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8080/index.html"
py -3 -B PHASE_NOTES\tools\serve_with_headers.py dist 8080
