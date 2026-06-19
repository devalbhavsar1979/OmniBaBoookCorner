git add .
for /f "usebackq" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"`) do set "TODAY=%%i"
git commit -m "update: %TODAY%"
git push -u origin main