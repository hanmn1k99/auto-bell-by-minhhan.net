@echo off
chcp 65001 >nul
echo ======================================
echo   AUTO-BELLS CAI DAT TU DONG (WINDOWS)
echo ======================================

echo [1/6] Kiem tra Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js chua duoc cai dat! Dang tien hanh cai dat tu dong bang winget...
    winget install OpenJS.NodeJS -e --silent
    echo.
    echo =========================================================================
    echo DA CAI DAT XONG NODE.JS!
    echo Vui long dong cua so cmd nay lai va chay lai file setup.bat de tiep tuc!
    echo =========================================================================
    pause
    exit /b 0
)

echo [2/6] Kiem tra va cai dat PM2...
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo Dang cai dat PM2...
    call npm install -g pm2
)

echo [3/6] Cai dat Frontend ^& Build...
cd frontend
call npm install
call npm run build
cd ..

echo [4/6] Cai dat Backend ^& Database...
cd backend
call npm install
call npx prisma generate
call npx prisma db push --accept-data-loss

echo [5/6] Khoi tao file .env (neu chua co)...
if not exist .env (
    copy .env.example .env
    echo Da tao file .env. Ban nen chinh sua tai khoan admin trong file backend/.env.
) else (
    echo File .env da ton tai.
)

echo [6/6] Khoi dong Server qua PM2...
call npx pm2 start npm --name "autobells" -- run start

echo ======================================
echo CAI DAT THANH CONG!
echo He thong dang chay ngam qua PM2.
echo Kiem tra trang thai bang lenh: npx pm2 status
echo ======================================
pause
