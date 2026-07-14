# 申论每日学习站（shenlun-daily）

每天从人民日报观点频道 8 个栏目抓取高质量议论文，自动生成带分类标签、好词金句标注的网页，供公考申论备考积累素材。

## 架构

```
VPS (每天 08:00 cron)
  └─ worker/cron_crawl.py
       ├─ 住宅 IP 直连人民网（规避边缘节点拦截）
       ├─ 6 维质量评分选优（每类 1 篇）
       └─ 写入 Cloudflare KV (latest_articles / idiom:* / manifest)
                    │
Cloudflare Pages  ── site/_worker.js 读取 KV ──► 渲染网页
                    └─ 成语释义：内置词典兜底 + 硅基流动 API 补充
```

要点：

- **VPS 只触发、不存储**：抓取与评分在 VPS 完成，结果写入 KV；VPS 本地不留存数据。
- **成语释义三级兜底**：内置 278 条词典 → KV 缓存 → 硅基流动 AI 生成。
- **密钥不入仓库**：所有 API Key / Token / ID 均通过环境变量注入（见 `.env.example`），仓库内不出现明文。

## 目录结构

```
.
├── site/                 # Cloudflare Pages 前端 + Pages Functions
│   ├── _worker.js        # 服务端渲染、KV 读取、成语释义
│   ├── index.html
│   ├── css/  js/  assets/
│   └── data/             # 运行时生成（已 gitignore）
├── worker/               # VPS 每日爬虫（线上组件）
│   ├── cron_crawl.py     # 主脚本：抓取 + 评分 + 写 KV
│   └── vps_proxy.py      # 【已弃用】CF Worker 经 VPS 代理抓取方案
├── crawler/              # 【已弃用】早期 CF Worker 抓取尝试
├── crawl.py              # 本地爬虫（生成 Word 用）
├── gen_site.py           # 生成静态站点文件
├── gen_docx.py           # 生成 Word 文档版
├── deploy.py             # 部署 site 到 Cloudflare Pages
├── run.sh                # 本地入口脚本
├── category_urls.json    # 8 类栏目 URL 配置
├── .env.example          # 环境变量模板
└── README.md
```

## 环境配置

复制 `.env.example` 为 `.env` 并填入：

| 变量 | 用途 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | 部署 site 到 Pages（wrangler 使用） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `CF_API_TOKEN` / `CF_ACCOUNT_ID` / `CF_KV_NAMESPACE_ID` | VPS 爬虫写入 KV |
| `SILICONFLOW_API_KEY` | 硅基流动 API（成语释义兜底） |
| `VPS_PROXY_SECRET` | 【弃用】VPS 代理共享密钥 |

> ⚠️ 所有密钥均通过环境变量注入，**不要**硬编码进代码或提交到仓库。

## 部署

### 1. 前端（Cloudflare Pages）

```bash
cd site
npx wrangler pages deploy . --project-name shenlun-daily --branch main
# 或本地：python deploy.py（读取 .env 中的 CLOUDFLARE_* 变量）
```

### 2. 爬虫（VPS 每日定时）

`worker/cron_crawl.py` 仅依赖 Python 3 标准库，无需 pip 安装。脚本会**自动加载同目录的 `.env`**（cron 环境默认没有用户环境变量，必须靠 `.env` 或 crontab 导出提供凭据）。

```bash
# VPS 上
crontab -e
0 8 * * * /usr/bin/python3 /opt/shenlun/cron_crawl.py >> /var/log/shenlun-cron.log 2>&1
```

在 `/opt/shenlun/.env` 中填入（变量名见 `.env.example`）：
```
CF_API_TOKEN=你的Cloudflare_API_Token
CF_ACCOUNT_ID=你的Cloudflare_Account_ID
CF_KV_NAMESPACE_ID=你的KV命名空间ID
SILICONFLOW_API_KEY=你的硅基流动Key
```

脚本通过环境变量 / `.env` 读取 Cloudflare / 硅基流动凭据，写入 KV 后由前端 `site/_worker.js` 读取渲染。

## 本地工具

- `python crawl.py && python gen_docx.py`：本地抓取并生成 Word 文档（输出到 `output/`）。
- `python gen_site.py`：生成静态站点文件到 `site/`。

## 安全 / 去敏说明

本仓库已去除所有敏感信息：

- VPS IP、SSH 密码、Cloudflare API Token、账户 ID、KV 命名空间 ID、硅基流动 Key 均改为环境变量 / 占位符。
- `site/_worker.js` 中早期「经 VPS 代理抓取」的死代码（含 VPS IP 与硬编码密钥）已移除。
- 运行时数据（`history.db`、日志、`site/data/*.json`、`.env`）均不入库。
