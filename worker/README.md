# VPS 每日爬虫（cron_crawl.py）

每天 08:00 由 VPS cron 调用，从人民网观点频道 8 个栏目抓取议论文，经质量评分选优后写入 Cloudflare KV，供前端 `site/_worker.js` 读取渲染。

## 工作流程

1. 住宅 IP 直连人民网（规避边缘节点拦截）。
2. 每栏目取候选文章，按 6 维质量评分（作者栏目权重、篇幅、成语密度、引用量、关键词匹配、时效性）选优。
3. 提取好词（成语 / 政策术语）与金句，调用硅基流动生成成语释义。
4. 写入 KV：`latest_articles`、`idiom:<词>`、`manifest`。

## 运行依赖

仅 Python 3 标准库，无需 `pip install`。

## 配置

通过环境变量提供凭据（见仓库根 `.env.example`）：

- `CF_API_TOKEN` / `CF_ACCOUNT_ID` / `CF_KV_NAMESPACE_ID`
- `SILICONFLOW_API_KEY`

## 定时任务

```bash
0 8 * * * /usr/bin/python3 /opt/shenlun/cron_crawl.py >> /var/log/shenlun-cron.log 2>&1
```

> 注意：`vps_proxy.py` 与 `crawler/` 为早期「经 Cloudflare Worker 抓取」的尝试，因边缘 IP 被拦截已弃用，仅供历史参考。
