#!/usr/bin/env python3
"""每日部署：生成站点 → 推送到 Cloudflare Pages"""
import os, subprocess, sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
SITE_DIR = PROJECT_DIR / "site"

# Cloudflare 凭据从环境变量读取（见 .env.example），不要硬编码
CF_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")

os.chdir(str(SITE_DIR))

# Step 1: Generate
print("[1/2] 生成站点...")
result = subprocess.run([sys.executable, str(PROJECT_DIR / "gen_site.py")], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print(result.stderr)
    sys.exit(1)

# Step 2: Deploy
print("[2/2] 部署到 Cloudflare Pages...")
env = os.environ.copy()
env["CLOUDFLARE_API_TOKEN"] = CF_TOKEN
env["CLOUDFLARE_ACCOUNT_ID"] = CF_ACCOUNT

result = subprocess.run(
    ["npx", "wrangler", "pages", "deploy", ".", "--project-name", "shenlun-daily",
     "--branch", "main", "--commit-dirty=true"],
    capture_output=True, text=True, env=env
)
print(result.stdout)
if result.returncode != 0:
    print(result.stderr)
    sys.exit(1)

print("\n✅ 部署完成 → https://shenlun-daily.pages.dev")
