#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
申论议论文每日爬虫
从人民日报观点频道 8 个栏目各抓取最新 1 篇议论文
"""
import json
import os
import re
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

PROJECT_DIR = Path(__file__).resolve().parent
CONFIG_FILE = PROJECT_DIR / "category_urls.json"
DB_FILE = PROJECT_DIR / "history.db"
LOG_FILE = PROJECT_DIR / "logs" / "crawl.log"


def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line, flush=True)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def init_db():
    """初始化 SQLite 去重库"""
    conn = sqlite3.connect(DB_FILE)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            url TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            crawl_date TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


class Crawler:
    def __init__(self, config):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": config["user_agent"],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        })
        self.delay = config["request_delay_sec"]

    def get(self, url, retries=3):
        """GET with retries"""
        for attempt in range(retries):
            try:
                r = self.session.get(url, timeout=20)
                # Auto-detect encoding: some 人民网 pages use GB2312/GB18030
                if r.apparent_encoding and r.apparent_encoding.upper() in ("GB2312", "GBK", "GB18030"):
                    r.encoding = r.apparent_encoding
                else:
                    r.encoding = "utf-8"
                if r.status_code == 200 and len(r.text) > 1000:
                    return r
                log(f"HTTP {r.status_code} or tiny body for {url} (attempt {attempt+1}/{retries})", "WARN")
            except Exception as e:
                log(f"GET {url} failed: {e} (attempt {attempt+1}/{retries})", "WARN")
            time.sleep(self.delay)
        return None

    def fetch_column_articles(self, column_url, limit=10):
        """抓取栏目页的文章链接列表，按发布日期倒序"""
        r = self.get(column_url)
        if not r:
            return []
        soup = BeautifulSoup(r.text, "lxml")
        articles = []
        seen_urls = set()
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            txt = a.get_text(strip=True)
            # 匹配 n1/YYYY/MMDD/cXXX-NNNNN.html
            m = re.search(r"/n1/(\d{4})/(\d{4})/c\d+-\d+\.html", href)
            if m:
                year = m.group(1)
                mmdd = m.group(2)
                month = mmdd[:2]
                day = mmdd[2:]
                date_str = f"{year}-{month}-{day}"
                full_url = urljoin(column_url, href)
                if full_url not in seen_urls and txt and 8 < len(txt) < 60:
                    seen_urls.add(full_url)
                    articles.append({
                        "url": full_url,
                        "title_hint": txt,
                        "date_str": date_str,
                    })
        # 按日期倒序
        articles.sort(key=lambda x: x["date_str"], reverse=True)
        return articles[:limit]

    def fetch_article_content(self, url, max_retries=2):
        """抓取单篇文章的标题、作者、日期、正文"""
        for attempt in range(max_retries):
            r = self.get(url)
            if not r:
                continue
            soup = BeautifulSoup(r.text, "lxml")

            # 标题：多个候选
            title = None
            for sel in ["h1", "h2.title", ".title h2", ".article-title h2"]:
                el = soup.select_one(sel)
                if el:
                    title = el.get_text(strip=True)
                    if title and len(title) > 3:
                        break
            if not title:
                # 退化：<title> 标签去掉 - 人民日报
                t = soup.title
                if t:
                    title = re.sub(r"\s*[_\-]\s*.*$", "", t.get_text(strip=True))

            # 正文：div.rm_txt
            content_el = soup.select_one("div.rm_txt")
            if not content_el:
                # 备选
                for sel in ["div#ozoom", "div.article-content", "div.content"]:
                    el = soup.select_one(sel)
                    if el and len(el.get_text()) > 500:
                        content_el = el
                        break

            if content_el and title:
                # 清洗正文
                # 移除订阅/收藏等工具元素
                for tag in content_el.select(".toolbox, .edit, .reprint, .from, .origin"):
                    tag.decompose()

                # 优先按 <p> 标签提取
                paragraphs = []
                ps = content_el.find_all("p")
                if ps and len(ps) >= 2:
                    for p in ps:
                        txt = p.get_text(strip=True)
                        if txt:
                            paragraphs.append(txt)
                else:
                    # 退化：按 br 或自然段落分割
                    # 先把 br 转 \n
                    for br in content_el.find_all("br"):
                        br.replace_with("\n")
                    full_text = content_el.get_text("\n", strip=True)
                    # 启发式：连续中文段落以换行分隔
                    paragraphs = [line.strip() for line in full_text.split("\n") if line.strip()]

                # 移除无意义段落（点赞数、订阅按钮残留、热门排行、客户端下载）
                cleaned = []
                skip_patterns = [
                    r"^\d+$", r"^\d+\s*字", r"^订阅$", r"^已订阅$", r"^收藏$",
                    r"^已收藏$", r"^小字号$", r"^大字号$", r"^点击播报",
                    r"^来源[:：]", r"^人民网$", r"^客户端下载$",
                    r"^人民日报少年", r"^手机人民网$", r"^领导留言板$",
                    r"^人民视频$", r"^人民智作$", r"^人民网\+$",
                    r"^分享让更多人看到$", r"^热门排行$",
                    r"^《 人民日报 》", r"^《人民日报》", r"^分享\s*$",
                ]
                for p in paragraphs:
                    if any(re.search(pat, p) for pat in skip_patterns):
                        continue
                    # 移除仅包含数字/标点的段落
                    if len(re.sub(r"[^\w]", "", p)) < 4:
                        continue
                    # 移除"热门排行"整段（连续数字编号列表）
                    if re.match(r"^\d+[、.]\s*[^。]{4,30}$", p):
                        continue
                    cleaned.append(p)

                # 进一步：从头部提取作者和日期
                # 常见格式: "仲  音\n2026年03月04日06:41" 或 "作者名\n2026-06-19 21:06"
                author = ""
                pub_date = ""
                for i, p in enumerate(cleaned[:5]):
                    # 找日期
                    date_m = re.search(r"(\d{4})年(\d{2})月(\d{2})日(?:\s*\d{2}:\d{2})?", p)
                    if not date_m:
                        date_m = re.search(r"(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2})?", p)
                    if date_m and not pub_date:
                        pub_date = f"{date_m.group(1)}-{date_m.group(2)}-{date_m.group(3)}"
                        # 作者在该日期前一行
                        if i > 0:
                            prev = cleaned[i-1].strip()
                            # 简短中文姓名 2-4 字
                            if 2 <= len(prev) <= 6 and re.match(r"^[\u4e00-\u9fa5\s]+$", prev):
                                author = re.sub(r"\s+", "", prev)
                        break

                # 移除头部的"标题+作者+日期+来源"杂质（通常在最前几段）
                # 找第一个真正正文段落：长度 > 50 且不以"来源:"开头
                body_start = 0
                for i, p in enumerate(cleaned[:6]):
                    txt = p
                    # 跳过：纯日期、纯作者、来源、点赞数
                    if re.match(r"^(\d{4}[-年]\d{1,2}[-月]\d{1,2}|来源[:：]|人民网|人民日报|订阅|收藏|小字号|点击播报|客户端下载|分享|领导留言板|手机人民网)", txt):
                        continue
                    if 2 <= len(txt) <= 6 and re.match(r"^[\u4e00-\u9fa5\s]+$", txt):
                        continue
                    body_start = i
                    break
                body_paragraphs = cleaned[body_start:]

                # 移除尾部"热门排行"和"客户端下载"段
                # 从末尾反向扫描，遇到"热门排行"或"客户端下载"则截断
                cutoff = len(body_paragraphs)
                for j in range(len(body_paragraphs) - 1, -1, -1):
                    p = body_paragraphs[j]
                    if "热门排行" in p or "客户端下载" in p or re.match(r"^\d+[、.]", p):
                        cutoff = j
                    else:
                        break
                body_paragraphs = body_paragraphs[:cutoff]

                # 移除"《 人民日报 》..."这种刊载信息
                body_paragraphs = [p for p in body_paragraphs if not re.match(r"^《\s*人民日报\s*》", p)]

                if body_paragraphs and any(len(p) > 30 for p in body_paragraphs):
                    return {
                        "url": url,
                        "title": title,
                        "author": author,
                        "pub_date": pub_date,
                        "content": "\n\n".join(body_paragraphs),
                        "fetched_at": datetime.now().isoformat(),
                    }
            log(f"Article parse incomplete for {url} (attempt {attempt+1}/{max_retries})", "WARN")
        return None


def main():
    config = load_config()
    crawler = Crawler(config)
    db = init_db()
    cur = db.cursor()

    # 加载已抓取 URL
    cur.execute("SELECT url FROM articles WHERE crawl_date >= date('now', '-30 days')")
    seen_urls = {row[0] for row in cur.fetchall()}
    log(f"Already crawled {len(seen_urls)} articles in last 30 days")

    results = {}  # {category: article_dict}
    global_seen = set()  # 本轮去重（避免不同栏目选同一篇）

    for cat, cat_cfg in config["categories"].items():
        column_url = cat_cfg["column_url"]
        log(f"Fetching column: {cat} -> {column_url}")
        articles = crawler.fetch_column_articles(column_url, limit=20)

        if not articles:
            log(f"No articles in column {cat}", "WARN")
            continue

        # 选一篇未抓过的（DB 已抓 + 本轮已选都要避开）
        picked = None
        for art in articles:
            if art["url"] not in seen_urls and art["url"] not in global_seen:
                picked = art
                break
        if not picked:
            log(f"All articles in {cat} already seen; taking newest anyway", "WARN")
            # 至少要选个未在本轮选过的
            for art in articles:
                if art["url"] not in global_seen:
                    picked = art
                    break
            if not picked:
                picked = articles[0]

        global_seen.add(picked["url"])
        log(f"Picked: {picked['title_hint']} ({picked['date_str']}) -> {picked['url']}")
        time.sleep(crawler.delay)

        # 抓详情
        detail = crawler.fetch_article_content(picked["url"])
        if detail:
            detail["category"] = cat
            detail["column_name"] = cat_cfg["column_name"]
            detail["column_date"] = picked["date_str"]
            results[cat] = detail

            # 入库
            try:
                cur.execute(
                    "INSERT OR IGNORE INTO articles(url, category, title, crawl_date) VALUES (?, ?, ?, ?)",
                    (detail["url"], cat, detail["title"], datetime.now().strftime("%Y-%m-%d"))
                )
                db.commit()
            except Exception as e:
                log(f"DB insert failed: {e}", "WARN")
        else:
            log(f"Failed to fetch detail for {picked['url']}", "WARN")

        time.sleep(crawler.delay)

    db.close()

    # 保存 JSON 中间结果
    out_json = PROJECT_DIR / "today_articles.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    log(f"Saved {len(results)} articles to {out_json}")

    if len(results) < 8:
        log(f"WARNING: only got {len(results)}/8 articles", "WARN")

    return results


if __name__ == "__main__":
    main()