@echo off
chcp 65001 > nul
title Đồng bộ tiến độ JLPT N2 từ Google Chrome
echo ============================================================
echo   Đang trích xuất tiến độ làm bài từ Google Chrome...
echo ============================================================
python export_user_data.py
echo.
echo [XONG] Đã cập nhật tiến độ vào user_data.js!
echo Toàn bộ câu đã làm, dấu sao và lịch sử đã được lưu.
echo ============================================================
pause
