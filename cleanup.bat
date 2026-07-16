@echo off
chcp 65001 >nul
echo =================================================
echo   AUTO-BELLS - DON DEP ^& BAO MAT MA NGUON
echo =================================================
echo CANH BAO: Script nay se XOA VINH VIEN toan bo ma nguon (source code) chua bien dich,
echo bao gom thu muc src cua frontend/backend va cong cu git.
echo Chi giu lai ban build (.js, dist) de chay server.
echo Khong the dung 'git pull' hoac 'update' sau khi chay script nay.
echo.
timeout /t 5 /nobreak

echo.
echo [1/4] Dang bien dich Backend (TypeScript -^> JavaScript)...
cd backend
call npx tsc

echo [2/4] Xoa ma nguon Backend...
rmdir /s /q src
del /q tsconfig.json

echo [3/4] Xoa ma nguon Frontend (chi giu lai ban build dist\)...
cd ..\frontend
rmdir /s /q src
rmdir /s /q public
rmdir /s /q node_modules
del /q .eslintrc.js
del /q tsconfig.json
del /q vite.config.ts
del /q index.html
del /q package.json
del /q package-lock.json
del /q README.md
cd ..

echo [4/4] Xoa cong cu git va cac script khong can thiet...
rmdir /s /q .git
del /q setup.sh
del /q setup.bat
del /q update.sh
del /q README.md
del /q cleanup.sh
del /q cleanup.bat

echo Cap nhat cau hinh khoi dong PM2 de dung ban Build...
call npx pm2 delete autobells 2>nul
cd backend
call npx pm2 start dist/index.js --name "autobells"
call npx pm2 save
cd ..

echo =================================================
echo [OK] HOAN TAT! Du an da duoc toi gian ma nguon.
echo =================================================
pause
