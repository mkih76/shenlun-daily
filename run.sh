#!/usr/bin/env bash
# 申论议论文每日推送入口脚本
# 由 Hermes Cron 任务调用，每天 08:00 执行

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/run_$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

echo "==[ $(date '+%Y-%m-%d %H:%M:%S') ]==" >> "$LOG_FILE"
cd "$PROJECT_DIR"

echo "[1/2] 爬取文章..." >> "$LOG_FILE"
python crawl.py >> "$LOG_FILE" 2>&1
CRAWL_EXIT=$?
echo "[crawl exit=$CRAWL_EXIT]" >> "$LOG_FILE"

echo "[2/2] 生成 Word..." >> "$LOG_FILE"
python gen_docx.py >> "$LOG_FILE" 2>&1
DOCX_EXIT=$?
echo "[docx exit=$DOCX_EXIT]" >> "$LOG_FILE"

if [ $CRAWL_EXIT -ne 0 ] || [ $DOCX_EXIT -ne 0 ]; then
    echo "[FAIL] crawl=$CRAWL_EXIT docx=$DOCX_EXIT" >> "$LOG_FILE"
    exit 1
fi

echo "[OK] $(date '+%Y-%m-%d %H:%M:%S') 推送完成" >> "$LOG_FILE"
exit 0