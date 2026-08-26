#!/bin/bash
# 恐龍人生模擬器 — 一鍵更新腳本
# 用法：bash update.sh

cd "$(dirname "$0")"

# 關閉舊的 vite 進程
pkill -f "vite" 2>/dev/null
sleep 1

# 編譯 + 打包
echo "正在編譯..."
npx tsc -b && npx vite build
if [ $? -ne 0 ]; then
  echo "編譯失敗！"
  exit 1
fi
echo "編譯成功！"

# 啟動 preview server 並用瀏覽器開啟
echo "啟動伺服器..."
npx vite preview --host --port 4000 &
SERVER_PID=$!
sleep 3

# 用 Windows 瀏覽器開啟
/mnt/c/Windows/explorer.exe "http://localhost:4000" 2>/dev/null

echo ""
echo "================================"
echo "  遊戲已在瀏覽器中開啟！"
echo "  網址：http://localhost:4000"
echo "  按 Ctrl+C 關閉伺服器"
echo "================================"

# 等待使用者按 Ctrl+C
wait $SERVER_PID
