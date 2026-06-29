@echo off
chcp 65001 > nul
:: 上面這行是為了防止命令提示字元出現中文亂碼

echo =========================================
echo  開始執行自動化部署流程...
echo =========================================

:: 提示使用者輸入 Commit 訊息
set "msg="
set /p msg="請輸入 Git Commit 訊息 (直接按 Enter 則預設為 'update'): "

:: 如果使用者沒輸入，就給予預設值 "update"
if "%msg%"=="" set "msg=update"

echo.
echo =========================================
echo  準備執行流程，Commit 訊息將設定為: "%msg%"
echo =========================================
echo.

echo [1/5] 正在編譯專案 (npm run build)...
call npm run build
if %errorlevel% neq 0 goto error

echo [2/5] 正在部署專案 (npm run deploy)...
call npm run deploy
if %errorlevel% neq 0 goto error

echo [3/5] 正在暫存變更 (git add .)...
git add .
if %errorlevel% neq 0 goto error

echo [4/5] 正在提交變更 (git commit)...
git commit -m "%msg%"
if %errorlevel% neq 0 goto error

echo [5/5] 正在推送到遠端倉庫 (git push)...
git push origin main
if %errorlevel% neq 0 goto error

echo =========================================
echo  部署成功完成！
echo =========================================
pause
exit

:error
echo -----------------------------------------
echo  [錯誤] 執行過程中發生問題，流程已中斷。
echo -----------------------------------------
pause
exit