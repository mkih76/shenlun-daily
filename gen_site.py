#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
申论议论文 · 静态站点生成器 v2
多层数据架构 · 长期可持续
"""
import json
import re
import sqlite3
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
ARTICLE_FILE = PROJECT_DIR / "today_articles.json"
CONFIG_FILE = PROJECT_DIR / "category_urls.json"
DB_FILE = PROJECT_DIR / "history.db"
OUTPUT_DIR = PROJECT_DIR / "site"

CAT_KEYS = ['作风类','党建类','经济类','科技类','民生类','生态类','文化类','治理类']

# ── Phrase extraction ─────────────────────

POLICY_TERMS = [
    "中国式现代化", "高质量发展", "共同富裕", "乡村振兴",
    "新质生产力", "全过程人民民主", "自我革命", "以人民为中心",
    "全面从严治党", "标本兼治", "顶层设计", "制度型开放",
    "获得感幸福感安全感", "创造性转化创新性发展",
    "百年未有之大变局", "人类命运共同体", "一带一路",
    "不敢腐不能腐不想腐", "共建共治共享",
]

QUOTE_PATTERNS = [
    (re.compile(r'["\u201c]([^"\u201d]{15,90})["\u201d]'), '引用'),
    (re.compile(r'([^。！\n]{8,25}，[^。！\n]{8,25}，[^。！\n]{8,25})(?:[。！])'), '排比'),
    (re.compile(r'(?:是|不是|并非)([^，]{6,30}，[^，]{6,30})(?:[。！；])'), '对仗'),
    (re.compile(r'([^。]+不是[^，]+，而是[^。]+)'), '对比句式'),
]


def extract_phrases(text):
    """提取好词和金句"""
    if not text:
        return [], []

    words = set()

    # Four-char idioms via regex
    for m in re.finditer(r'(?<![a-zA-Z0-9])[\u4e00-\u9fa5]{4}(?![a-zA-Z0-9])', text):
        w = m.group(0)
        if not re.match(r'^(.{2})\1$', w):  # no AA-BB repeating
            words.add(w)

    # Policy terms
    for term in POLICY_TERMS:
        if term in text:
            words.add(term)

    # Sentences
    sentences = []
    seen = set()
    for pattern, stype in QUOTE_PATTERNS:
        for m in pattern.finditer(text):
            s = m.group(1).strip()
            if s and len(s) >= 10 and s not in seen:
                seen.add(s)
                sentences.append({"text": s, "type": stype})

    return sorted(words)[:25], sentences[:6]


# ── Data loading ──────────────────────────

def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_today():
    if not ARTICLE_FILE.exists():
        return {}
    with open(ARTICLE_FILE, "r", encoding="utf-8") as f:
        articles = json.load(f)
    for cat, art in articles.items():
        art["phrases"], art["highlights"] = extract_phrases(art.get("content", ""))
    return articles


def load_history():
    if not DB_FILE.exists():
        return {}
    conn = sqlite3.connect(str(DB_FILE))
    cur = conn.execute(
        "SELECT crawl_date, category, title, url FROM articles ORDER BY crawl_date DESC"
    )
    hist = {}
    for row in cur:
        date_str, cat, title, url = row
        hist.setdefault(date_str, []).append({"category": cat, "title": title, "url": url})
    conn.close()
    return hist


# ── Site generation ───────────────────────

def generate():
    print("=" * 56)
    print("  申论议论文 · 静态站点生成器 v2")
    print("=" * 56)

    config = load_config()
    today = load_today()
    history = load_history()

    today_slug = datetime.now().strftime("%Y-%m-%d")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "css").mkdir(exist_ok=True)
    (OUTPUT_DIR / "js").mkdir(exist_ok=True)
    (OUTPUT_DIR / "data").mkdir(exist_ok=True)

    # ── 1. Save today's data ──
    clean_today = {}
    for cat in CAT_KEYS:
        art = today.get(cat, {})
        content = art.get("content", "")
        if len(content) > 15000:
            content = content[:15000]
        clean_today[cat] = {
            "title": art.get("title", ""),
            "author": art.get("author", ""),
            "pub_date": art.get("pub_date", ""),
            "url": art.get("url", ""),
            "content": content,
            "phrases": art.get("phrases", []),
            "highlights": art.get("highlights", []),
        }

    today_file = OUTPUT_DIR / "data" / f"{today_slug}.json"
    with open(today_file, "w", encoding="utf-8") as f:
        json.dump(clean_today, f, ensure_ascii=False, indent=2)

    # ── 2. Build manifest ──
    manifest = {"dates": {}, "updated": datetime.now().isoformat()}
    if clean_today:
        manifest["dates"][today_slug] = len(clean_today)
    for date_key, arts in history.items():
        if date_key != today_slug:
            manifest["dates"][date_key] = len(arts)

    manifest_file = OUTPUT_DIR / "data" / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # ── 3. Aggregate phrases ──
    all_words = {}
    all_highlights = {}
    cat_labels = {}
    for cat, cfg in config.get("categories", {}).items():
        cat_labels[cat] = cfg.get("label", cat)

    for cat, art in clean_today.items():
        label = cat_labels.get(cat, cat)
        for w in art.get("phrases", []):
            if w not in all_words:
                all_words[w] = {"count": 0, "cats": []}
            all_words[w]["count"] += 1
            if label not in all_words[w]["cats"]:
                all_words[w]["cats"].append(label)
        for h in art.get("highlights", []):
            key = h["text"]
            if key not in all_highlights:
                all_highlights[key] = {"count": 0, "type": h["type"], "cats": []}
            all_highlights[key]["count"] += 1
            if label not in all_highlights[key]["cats"]:
                all_highlights[key]["cats"].append(label)

    phrases_data = {
        "words": all_words,
        "highlights": all_highlights,
        "totalDates": len(manifest["dates"]),
        "totalArticles": sum(manifest["dates"].values()),
        "updated": datetime.now().isoformat(),
    }

    phrases_file = OUTPUT_DIR / "data" / "phrases.json"
    with open(phrases_file, "w", encoding="utf-8") as f:
        json.dump(phrases_data, f, ensure_ascii=False, indent=2)

    # ── 4. Generate index.html ──
    today_json = json.dumps(clean_today, ensure_ascii=False)
    phrases_json = json.dumps(phrases_data, ensure_ascii=False)

    # Read CSS and JS for embedding (inline for first load speed)
    css_path = OUTPUT_DIR / "css" / "main.css"
    js_path = OUTPUT_DIR / "js" / "app.js"
    css_content = css_path.read_text(encoding="utf-8") if css_path.exists() else ""
    js_content = js_path.read_text(encoding="utf-8") if js_path.exists() else ""

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>申论议论文 · 每日精选</title>
<meta name="description" content="人民日报观点频道每日议论文精选，申论素材积累与好词金句库">
<meta name="theme-color" content="#C00000">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📰</text></svg>">
<style>{css_content}</style>
<script>var SITE_TODAY={today_json};var SITE_TODAY_DATE="{today_slug}";var SITE_PHRASES={phrases_json};</script>
</head>
<body>

<header class="site-header">
  <div class="header-inner">
    <a href="/" class="site-brand" onclick="App.goHome();return false">
      <span class="brand-title">申论议论文</span>
      <span class="brand-sub">每日精选</span>
    </a>
    <nav class="nav-links">
      <a href="/" data-view="today" class="active">今日</a>
      <a href="/archive" data-view="archive">归档</a>
      <a href="/search" data-view="search">搜索</a>
      <a href="/phrases" data-view="phrases">好词金句</a>
    </nav>
  </div>
</header>

<main class="main-content" id="main-content"></main>

<footer class="site-footer">
  <div class="footer-brand">申论议论文 · 每日精选</div>
  <div>来源：人民网 · 观点频道 ｜ 仅供学习使用 ｜ {datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
</footer>

<script>{js_content}</script>
</body>
</html>"""

    index_path = OUTPUT_DIR / "index.html"
    index_path.write_text(html, encoding="utf-8")

    # ── 5. Copy static assets ──
    # service worker
    sw = """const CACHE='shenlun-v2';
const URLS=['/', '/css/main.css','/js/app.js','/data/manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
"""
    (OUTPUT_DIR / "sw.js").write_text(sw, encoding="utf-8")

    # PWA manifest
    pwa = {
        "name": "申论议论文 · 每日精选",
        "short_name": "申论精选",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#faf9f6",
        "theme_color": "#C00000",
        "description": "人民日报观点频道每日议论文精选",
    }
    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(pwa, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── 6. Summary ──
    print(f"\n  今日文章: {len(clean_today)} 篇")
    print(f"  归档天数: {len(manifest['dates'])}")
    print(f"  好词数量: {len(all_words)}")
    print(f"  金句数量: {len(all_highlights)}")
    print(f"  输出目录: {OUTPUT_DIR}")
    print(f"  入口文件: {OUTPUT_DIR / 'index.html'}")
    print(f"\n{'=' * 56}")
    return OUTPUT_DIR


if __name__ == "__main__":
    generate()
