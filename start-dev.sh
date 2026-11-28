#!/usr/bin/env bash
PORT=${1:-8088}
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/apps/web-lab"

echo "⚙️ تنظيف العمليات القديمة على المنفذ $PORT..."
fuser -k "$PORT/tcp" 2>/dev/null || true
pkill -9 -f "python.*$PORT" 2>/dev/null || true
pkill -9 -f "node.*$PORT" 2>/dev/null || true
pkill -9 -f "http-server.*$PORT" 2>/dev/null || true
sleep 1

echo "🔍 التحقق من بنية المشروع..."
if [ ! -f "$APP_DIR/index.html" ]; then
  echo "❌ خطأ: لم يتم العثور على $APP_DIR/index.html"
  exit 1
fi

echo "🚀 إطلاق خادم التطوير على المنفذ $PORT..."
cd "$APP_DIR"
python -m http.server "$PORT" > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1

if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "========================================="
  echo "✅ خادم المعاينة يعمل بثبات الآن (PID: $SERVER_PID)!"
  echo "🌐 رابط المعاينة في المتصفح:"
  echo "http://localhost:$PORT"
  echo "========================================="
else
  echo "❌ تعذر إطلاق الخادم، حاول مجدداً"
  exit 1
fi
