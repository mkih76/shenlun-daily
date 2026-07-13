/* ═══════════════════════════════════════════════════════════
   申论议论文 · 每日精选 — 应用逻辑
   ═══════════════════════════════════════════════════════════ */

(function() {
'use strict';

// ── State ──
const STATE = {
  view: 'today',
  date: null,
  catFilter: 'all',
};

// ── Helpers ──
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }
function todaySlug(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const CAT_KEYS = ['作风类','党建类','经济类','科技类','民生类','生态类','文化类','治理类'];
const CAT_CONFIG = {
  '作风类': { label: '工作作风', color: '#C00000' },
  '党建类': { label: '党的建设', color: '#8B0000' },
  '经济类': { label: '经济建设', color: '#0070C0' },
  '科技类': { label: '科技创新', color: '#7030A0' },
  '民生类': { label: '民生保障', color: '#00884A' },
  '生态类': { label: '生态文明', color: '#385723' },
  '文化类': { label: '文化建设', color: '#B8860B' },
  '治理类': { label: '社会治理', color: '#404040' },
};

function catInfo(cat) { return CAT_CONFIG[cat] || { label: cat, color: '#666' }; }

function extractExcerpt(text, len) {
  if (!text) return '';
  return text.replace(/\s+/g, '').slice(0, len || 90);
}

// ── Render: Today/Latest Articles ──
function renderToday(dateKey) {
  // Try embedded data first
  let data = null;
  const slug = dateKey || null;

  if (!slug && window.SITE_TODAY) {
    data = window.SITE_TODAY;
  } else if (slug && window.SITE_TODAY && slug === (window.SITE_TODAY_DATE || todaySlug(new Date()))) {
    data = window.SITE_TODAY;
  }

  // If data is available (embedded), render immediately
  if (data) { return renderArticleCards(data, slug); }

  // Otherwise, fetch from JSON
  const fetchSlug = slug || todaySlug(new Date());
  return fetch(`data/${fetchSlug}.json`)
    .then(r => r.json())
    .then(data => renderArticleCards(data, slug))
    .catch(() => '<div class="empty-state"><div class="empty-icon">📭</div><h3>暂无文章数据</h3><p>请稍后刷新或检查网络连接</p></div>');
}

function renderArticleCards(data, dateKey) {
  if (!data || Object.keys(data).length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📄</div><h3>今日暂无文章</h3><p>每日议论文将在上午自动更新</p></div>';
  }

  const entries = Object.entries(data);

  // Filter by category if active
  const filtered = STATE.catFilter === 'all'
    ? entries
    : entries.filter(([cat]) => cat === STATE.catFilter);

  // Category nav
  const catNavHTML = `
    <div class="cat-nav">
      <button class="${STATE.catFilter === 'all' ? 'active' : ''}" onclick="App.filterCat('all')">全部</button>
      ${CAT_KEYS.map(cat => {
        const info = catInfo(cat);
        const active = STATE.catFilter === cat ? 'active' : '';
        return `<button class="${active}" style="${active ? 'background:'+info.color+';border-color:'+info.color : ''}" onclick="App.filterCat('${cat}')">${info.label}</button>`;
      }).join('')}
    </div>`;

  const cardsHTML = filtered.map(([cat, art]) => {
    const info = catInfo(cat);
    const title = art.title || '';
    const body = art.content || '';
    const phraseCount = (art.phrases || []).length;
    const hlCount = (art.highlights || []).length;

    return `
      <article class="article-card" onclick="App.openArticle('${dateKey || todaySlug(new Date())}','${cat}')">
        <div class="card-top-bar" style="background:${info.color}"></div>
        <div class="card-body">
          <div class="card-category" style="color:${info.color}">${info.label}</div>
          <h3 class="card-title">${title}</h3>
          <p class="card-excerpt">${extractExcerpt(body)}</p>
        </div>
        <div class="card-footer">
          ${phraseCount > 0 ? `<span class="badge">📝 好词 ${phraseCount}</span>` : ''}
          ${hlCount > 0 ? `<span class="badge">✨ 金句 ${hlCount}</span>` : ''}
          ${art.pub_date ? `<span>${art.pub_date}</span>` : ''}
        </div>
      </article>`;
  }).join('');

  // Date banner if viewing a specific date
  const dayLabel = dateKey ? `📅 ${dateKey}` : '📰 今日精选';

  return `
    <div class="today-banner">
      <div>
        <span class="today-date">${dayLabel}</span>
        <span class="today-weekday">${getWeekday(dateKey)}</span>
      </div>
      <div class="today-meta">
        <span>📄 ${entries.length} 篇</span>
        ${filtered.length !== entries.length ? `<span>筛选: ${filtered.length} 篇</span>` : ''}
      </div>
    </div>
    ${catNavHTML}
    <div class="articles-grid">${cardsHTML}</div>
  `;
}

function getWeekday(dateKey) {
  if (!dateKey) {
    const now = new Date();
    const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    return days[now.getDay()];
  }
  const [y, m, d] = dateKey.split('-').map(Number);
  const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  return days[new Date(y, m-1, d).getDay()];
}

// ── Reading Overlay ──
function openArticle(dateKey, cat) {
  // Get data from embedded or fetch
  const dataSource = (!dateKey || dateKey === (window.SITE_TODAY_DATE || todaySlug(new Date())))
    ? window.SITE_TODAY
    : null;

  function showArticle(data) {
    const art = data && data[cat];
    if (!art) return;

    const info = catInfo(cat);
    const phrases = art.phrases || [];
    const highlights = art.highlights || [];
    const bodyParas = (art.content || '').split('\n\n').filter(p => p.trim().length > 2);

    const overlay = document.createElement('div');
    overlay.className = 'reading-overlay';

    let extrasHTML = '';
    if (phrases.length || highlights.length) {
      extrasHTML = `
        <div class="reading-extras">
          <h4>✨ 本文好词金句</h4>
          ${phrases.length ? '<div class="word-tags">' + phrases.slice(0,20).map(w => `<span class="word-tag">${w}</span>`).join('') + '</div>' : ''}
          ${highlights.length ? highlights.slice(0,8).map(h => `
            <div class="golden-sentence">
              <span class="gs-type">${h.type}</span>${h.text}
            </div>
          `).join('') : ''}
        </div>`;
    }

    overlay.innerHTML = `
      <div class="reading-panel">
        <div class="reading-header">
          <span class="cat-badge" style="background:${info.color}">${info.label}</span>
          <span class="reading-title">${art.title || ''}</span>
          <button class="close-btn" onclick="this.closest('.reading-overlay').remove()" title="关闭">✕</button>
        </div>
        <div class="reading-meta">
          ${art.author ? '<span>👤 ' + art.author + '</span>' : ''}
          ${art.pub_date ? '<span>📅 ' + art.pub_date + '</span>' : ''}
          ${art.url ? '<a href="' + art.url + '" target="_blank" rel="noopener">🔗 原文链接</a>' : ''}
        </div>
        <div class="reading-body">
          ${bodyParas.map(p => `<p>${p.trim()}</p>`).join('\n')}
        </div>
        ${extrasHTML}
        <div class="reading-controls">
          <button onclick="this.closest('.reading-overlay').remove()">关闭</button>
          ${art.url ? `<button onclick="navigator.clipboard.writeText('${art.url.replace(/'/g,"\\'")}')">复制链接</button>` : ''}
        </div>
      </div>
    `;

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    const origRemove = overlay.remove.bind(overlay);
    overlay.remove = function() {
      document.body.style.overflow = '';
      origRemove();
    };
  }

  if (dataSource) {
    showArticle(dataSource);
  } else {
    fetch(`data/${dateKey}.json`)
      .then(r => r.json())
      .then(showArticle)
      .catch(() => console.error('Failed to load article data'));
  }
}

// ── Archive View ──
function renderArchive() {
  // Load manifest
  return fetch('data/manifest.json')
    .then(r => r.json())
    .then(manifest => {
      const dates = Object.keys(manifest.dates || {}).sort().reverse();
      const totalArticles = Object.values(manifest.dates || {}).reduce((s, c) => s + c, 0);

      if (dates.length === 0) {
        return '<div class="empty-state"><div class="empty-icon">📚</div><h3>归档为空</h3><p>文章将在每日更新后自动归档</p></div>';
      }

      // Group by year-month
      const groups = {};
      dates.forEach(slug => {
        const [y, m] = slug.split('-');
        const ym = y + '-' + m;
        if (!groups[ym]) groups[ym] = [];
        groups[ym].push({ slug, count: manifest.dates[slug] || 0 });
      });

      const years = {};
      Object.entries(groups).forEach(([ym, items]) => {
        const y = ym.split('-')[0];
        if (!years[y]) years[y] = [];
        years[y].push({ ym, items });
      });

      return `
        <div class="archive-header">
          <h2>📚 文章归档</h2>
          <div class="archive-stats">共 ${dates.length} 天 · ${totalArticles} 篇文章</div>
        </div>
        ${Object.entries(years).sort((a,b) => b[0]-a[0]).map(([year, months]) => `
          <div class="year-section">
            <h3>${year} 年</h3>
            ${months.sort((a,b) => b.ym.localeCompare(a.ym)).map(m => `
              <div class="month-section">
                <h4>${m.ym.split('-')[1]} 月</h4>
                <div class="date-grid">
                  ${m.items.sort((a,b) => b.slug.localeCompare(a.slug)).map(d => `
                    <a class="date-card" onclick="App.viewDate('${d.slug}')" title="${d.slug} · ${d.count} 篇">
                      <span class="day-number">${d.slug.split('-')[2]}</span>
                      <span class="day-info">${d.count} 篇</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      `;
    })
    .catch(() => '<div class="empty-state"><div class="empty-icon">📚</div><h3>加载失败</h3><p>请检查网络连接</p></div>');
}

// ── Search View ──
function renderSearch(query) {
  if (!query) {
    return `
      <div class="search-container">
        <h2 style="margin-bottom:20px">🔍 搜索文章</h2>
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" type="text" placeholder="输入关键词搜索..." onkeyup="App.doSearch(this.value)" autofocus>
        </div>
        <div class="search-results" id="search-results"></div>
      </div>`;
  }

  // Load manifest and search through all articles
  return fetch('data/manifest.json')
    .then(r => r.json())
    .then(manifest => {
      const dates = Object.keys(manifest.dates || {}).sort().reverse();
      const searchLower = query.toLowerCase();

      // Search through embedded data + manifest
      const results = [];

      // Check today's data first
      if (window.SITE_TODAY) {
        Object.entries(window.SITE_TODAY).forEach(([cat, art]) => {
          if (matchArticle(art, searchLower)) {
            results.push({
              date: window.SITE_TODAY_DATE || todaySlug(new Date()),
              cat, art,
            });
          }
        });
      }

      // Also check a few recent dates for matching titles (from manifest)
      // For simplicity, we'll show the search UI and let users browse
      if (results.length === 0) {
        return `
          <div class="search-container">
            <h2 style="margin-bottom:20px">🔍 搜索文章</h2>
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input class="search-input" type="text" placeholder="输入关键词搜索..." value="${escapeHtml(query)}" onkeyup="App.doSearch(this.value)" autofocus>
            </div>
            <div class="search-results" id="search-results">
              <div class="empty-state"><div class="empty-icon">🔍</div><h3>今日文章中未找到 "${escapeHtml(query)}"</h3><p>搜索功能将随文章积累逐步完善</p></div>
            </div>
          </div>`;
      }

      const resultsHTML = results.map(r => {
        const info = catInfo(r.cat);
        const title = r.art.title || '';
        const body = r.art.content || '';
        const highlighted = highlightText(extractExcerpt(body, 120), searchLower);

        return `
          <div class="search-result" onclick="App.openArticle('${r.date}','${r.cat}')">
            <div class="sr-cat" style="color:${info.color}">${info.label}</div>
            <div class="sr-title">${highlightText(title, searchLower)}</div>
            <div class="sr-excerpt">${highlighted}</div>
            <div class="sr-date">📅 ${r.date}</div>
          </div>`;
      }).join('');

      return `
        <div class="search-container">
          <h2 style="margin-bottom:20px">🔍 搜索文章</h2>
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="search-input" type="text" placeholder="输入关键词搜索..." value="${escapeHtml(query)}" onkeyup="App.doSearch(this.value)" autofocus>
          </div>
          <div class="search-results" id="search-results">${resultsHTML}</div>
          ${results.length === 0 ? '<div class="empty-state"><p>未找到匹配结果</p></div>' : ''}
        </div>`;
    });
}

function matchArticle(art, query) {
  const fields = [art.title, art.content, art.author, (art.phrases || []).join(' ')];
  return fields.some(f => (f || '').toLowerCase().includes(query));
}

function highlightText(text, query) {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Phrases View ──
function renderPhrases() {
  // Use embedded data if available, otherwise fetch
  const data = window.SITE_PHRASES;
  if (!data || (!data.words || !data.highlights)) {
    return fetch('data/phrases.json')
      .then(r => r.json())
      .then(d => renderPhrasesContent(d))
      .catch(() => '<div class="empty-state"><div class="empty-icon">📝</div><h3>好词金句库加载中</h3><p>将在文章积累后自动生成</p></div>');
  }
  return renderPhrasesContent(data);
}

function renderPhrasesContent(data) {
  const words = Object.entries(data.words || {}).sort((a,b) => b[1].count - a[1].count);
  const highlights = Object.entries(data.highlights || {}).sort((a,b) => b[1].count - a[1].count);

  // Size classes for word cloud
  function wordSize(count) {
    const max = words.length > 0 ? words[0][1].count : 1;
    if (count > max * 0.8) return 'size-l';
    if (count > max * 0.4) return 'size-m';
    return '';
  }

  // Filter by category
  let filteredWords = words;
  let filteredHL = highlights;
  if (STATE.catFilter && STATE.catFilter !== 'all') {
    const catLabel = catInfo(STATE.catFilter).label;
    filteredWords = words.filter(([_, info]) => (info.cats || []).includes(catLabel));
    filteredHL = highlights.filter(([_, info]) => (info.cats || []).includes(catLabel));
  }

  return `
    <div class="phrases-header">
      <h2>📝 好词金句库</h2>
      <p>从 ${data.totalDates || 0} 天 · ${(data.totalArticles || 0)} 篇文章中积累</p>
      <div class="phrases-stats">
        <div class="stat"><div class="stat-value">${Object.keys(data.words || {}).length}</div><div class="stat-label">好词</div></div>
        <div class="stat"><div class="stat-value">${Object.keys(data.highlights || {}).length}</div><div class="stat-label">金句</div></div>
      </div>
    </div>

    <div class="cat-nav">
      <button class="${!STATE.catFilter || STATE.catFilter === 'all' ? 'active' : ''}" onclick="App.filterCat('all');App.refresh();">全部</button>
      ${CAT_KEYS.map(cat => {
        const info = catInfo(cat);
        const active = STATE.catFilter === cat ? 'active' : '';
        return `<button class="${active}" style="${active ? 'background:'+info.color+';border-color:'+info.color : ''}" onclick="App.filterCat('${cat}');App.refresh();">${info.label}</button>`;
      }).join('')}
    </div>

    <h3 style="margin-bottom:14px;color:var(--text-secondary)">📖 高频好词</h3>
    <div class="word-cloud">
      ${filteredWords.length === 0 ? '<p style="color:var(--text-tertiary)">该分类暂无好词</p>' : ''}
      ${filteredWords.slice(0, 100).map(([w, info]) => `
        <span class="wc-item ${wordSize(info.count)}" title="出现 ${info.count} 次">${w}</span>
      `).join('')}
    </div>

    <h3 style="margin-bottom:14px;color:var(--text-secondary);margin-top:32px">✨ 金句精选</h3>
    <div class="golden-list">
      ${filteredHL.length === 0 ? '<p style="color:var(--text-tertiary)">该分类暂无金句</p>' : ''}
      ${filteredHL.slice(0, 50).map(([text, info]) => `
        <div class="golden-item">
          <div class="gi-text">${text}</div>
          <div class="gi-meta">
            <span class="gi-badge type-${info.type || 'quote'}">${info.type || '引用'}</span>
            ${(info.cats || []).slice(0,3).map(c => `<span>${c}</span>`).join(' · ')}
            ${info.count > 1 ? `<span>出现 ${info.count} 次</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Main Controller ──
function refresh() {
  const main = qs('#main-content');
  const navLinks = qsa('.nav-links a');

  // Update nav
  navLinks.forEach(a => {
    a.classList.toggle('active', a.dataset.view === STATE.view);
  });

  // Render view
  let result;
  switch (STATE.view) {
    case 'today':
      result = renderToday(STATE.date);
      break;
    case 'archive':
      result = renderArchive();
      break;
    case 'search':
      result = renderSearch(STATE.searchQuery || '');
      break;
    case 'phrases':
      result = renderPhrases();
      break;
  }

  if (typeof result === 'string') {
    main.innerHTML = result;
  } else if (result && typeof result.then === 'function') {
    main.innerHTML = '<div class="skeleton" style="height:400px"></div>';
    result.then(html => { main.innerHTML = html; });
  }
}

// ── Public API ──
window.App = {
  refresh,
  openArticle,
  viewDate(slug) {
    STATE.view = 'today';
    STATE.date = slug;
    refresh();
    window.scrollTo(0, 0);
  },
  filterCat(cat) {
    STATE.catFilter = cat;
    refresh();
  },
  doSearch(query) {
    STATE.searchQuery = query.trim();
    if (STATE.searchQuery) {
      STATE.view = 'search';
      refresh();
    }
  },
  goHome() {
    STATE.view = 'today';
    STATE.date = null;
    STATE.catFilter = 'all';
    refresh();
  },
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  // Nav clicks
  qsa('.nav-links a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      STATE.view = a.dataset.view;
      STATE.date = null;
      STATE.catFilter = 'all';
      refresh();
    });
  });

  // Brand click → home
  const brand = qs('.site-brand');
  if (brand) {
    brand.addEventListener('click', e => {
      e.preventDefault();
      App.goHome();
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const overlay = qs('.reading-overlay');
      if (overlay) overlay.remove();
    }
  });

  // Initial render
  refresh();
});

})();
