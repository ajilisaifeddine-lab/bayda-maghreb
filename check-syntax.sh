#!/usr/bin/env bash
set -e
echo "🔍 جاري فحص ملفات JavaScript في apps/web-lab/..."
ERR=0
for f in apps/web-lab/*.js; do
  if ! node -c "$f" 2>&1; then
    echo "❌ خطأ في الملف: $f"
    ERR=1
  fi
done
if [ $ERR -eq 0 ]; then
  echo "✅ جميع ملفات JavaScript سليمة وخالية من الأخطاء النحوية 100%!"
else
  exit 1
fi
