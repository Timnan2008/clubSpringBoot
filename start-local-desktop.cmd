@echo off
setlocal
cd /d "%~dp0"

set "LOCAL_URL=http://127.0.0.1:8088/"
set "JAR=target\formal_club-0.0.1-SNAPSHOT.jar"
set "INSTALLED=D:\software\Qingpu WFL Club\Qingpu WFL Club.exe"
set "ELECTRON=%~dp0desktop\node_modules\electron\dist\electron.exe"

set "APP_EXE="
if exist "%INSTALLED%" set "APP_EXE=%INSTALLED%"
if not defined APP_EXE if exist "%ELECTRON%" set "APP_EXE=%ELECTRON%"
if not defined APP_EXE (
  echo 未找到已安装客户端，也未找到本地 Electron。
  pause
  exit /b 1
)

if not exist "%JAR%" (
  echo [1/3] 未找到 JAR，正在构建前端与后端...
  call npm run build
  if errorlevel 1 goto :fail
  call mvnw.cmd -DskipTests package
  if errorlevel 1 goto :fail
)

echo [2/3] 检查本地后端...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest '%LOCAL_URL%page/dashboard' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"
if errorlevel 1 (
  echo     启动本地后端 8088...
  start "club-local-backend" /min /d "%~dp0" java -jar "%JAR%"
  powershell -NoProfile -Command "for ($i=0; $i -lt 90; $i++) { try { $r = Invoke-WebRequest '%LOCAL_URL%page/dashboard' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
  if errorlevel 1 (
    echo     后端启动失败，请查看 club-local-backend 窗口日志。
    pause
    exit /b 1
  )
)

echo [3/3] 启动桌面客户端...
set "CLUB_DESKTOP_URL=%LOCAL_URL%"
set "CLUB_DESKTOP_START=/page/dashboard"

if exist "%INSTALLED%" (
  rem 关掉仍指向线上的旧窗口，否则会看到空白首页
  taskkill /IM "Qingpu WFL Club.exe" /F >nul 2>nul
  timeout /t 1 /nobreak >nul
  start "" "%INSTALLED%"
) else (
  set "CLUB_DESKTOP_USER_DATA=%TEMP%\club-local-desktop"
  start "" "%ELECTRON%" "%~dp0desktop"
)
endlocal
exit /b 0

:fail
echo 构建失败，请检查上方输出。
pause
exit /b 1
