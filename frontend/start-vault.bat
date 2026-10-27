@echo off
set ROOT=C:\Dev\family-health-vault

start "Flask Backend" cmd /k "cd /d %ROOT%\backend && call venv\Scripts\activate && python app.py"
start "Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev"

timeout /t 10 /nobreak >nul
start http://localhost:5173