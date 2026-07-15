/**
 * shenlun-daily Pages Function
 * 路由：
 *   /                     → 今日文章列表
 *   /article/[date]/[cat] → 独立文章详情页
 *   /archive              → 历史归档
 *   /phrases              → 全局好词金句库
 *   /api/articles         → 原始数据
 *   /api/idiom/[word]     → 成语释义（AI 生成，KV 缓存）
 */

const CAT_CONFIG = {
  '作风类': { label: '工作作风', color: '#B5402E' },
  '党建类': { label: '党的建设', color: '#8A2E2E' },
  '经济类': { label: '经济建设', color: '#A8762B' },
  '科技类': { label: '科技创新', color: '#2E5A88' },
  '民生类': { label: '民生保障', color: '#3E7C5A' },
  '生态类': { label: '生态文明', color: '#2F6B4F' },
  '文化类': { label: '文化建设', color: '#6B4E8C' },
  '治理类': { label: '社会治理', color: '#3A3A3A' },
};

// 200+ 申论常用成语
const CHENGYU_LIST = new Set([
  '中国式现代化','高质量发展','共同富裕','乡村振兴','新质生产力',
  '全过程人民民主','自我革命','以人民为中心','人民至上','全面从严治党',
  '标本兼治','顶层设计','制度型开放','共建共治共享','一带一路',
  '人类命运共同体','百年未有之大变局','创造性转化','创新性发展',
  '驰而不息','久久为功','踏石留印','抓铁有痕','求真务实','真抓实干',
  '身体力行','率先垂范','一以贯之','徙木立信','祛疴治乱','鞠躬尽瘁',
  '死而后已','夙夜在公','励精图治','休戚与共','息息相关','安居乐业',
  '老有所养','病有所医','学有所教','劳有所得','幼有所育','弱有所扶',
  '循序渐进','稳中求进','稳字当头','行稳致远','提质增效','转型升级',
  '脱虚向实','供需两端','以文化人','以文育人','潜移默化','润物无声',
  '春风化雨','兼收并蓄','博采众长','古为今用','洋为中用','取其精华',
  '去其糟粕','推陈出新','统筹兼顾','系统观念','系统思维','辩证思维',
  '战略思维','创新思维','底线思维','问题导向','目标导向','结果导向',
  '精准思维','绣花功夫','迎难而上','攻坚克难','锐意进取','勇往直前',
  '踔厉奋发','笃行不怠','笃信笃行','百折不挠','锲而不舍','水滴石穿',
  '绳锯木断','功崇惟志','业广惟勤','志不求易','事不避难','善作善成',
  '善始善终','落地见效','落地生根','开花结果','多点突破','全面发力',
  '纵深推进','协同推进','齐头并进','一抓到底','守土有责','守土担责',
  '守土尽责','敢于担当','挺身而出','冲锋在前','以上率下','以上促下',
  '得罪千百人','不负十四亿','打虎拍蝇','猎狐行动','风腐交织','由风及腐',
  '顽瘴痼疾','防微杜渐','警钟长鸣','常抓不懈','抓早抓小','源远流长',
  '博大精深','薪火相传','代代相传','承前启后','继往开来','革故鼎新',
  '与时俱进','自立自强','自主创新','开放合作','聚四海之气','借八方之力',
  '协同攻关','联合攻关','勇攀高峰','敢为人先','勇立潮头','立己达人',
  '美人之美','各美其美','美美与共','天下大同','协和万邦','讲信修睦',
  '亲仁善邻','兼济天下','达则兼济天下','摸着石头过河','逢山开路',
  '遇水架桥','敢闯敢试','蹄疾步稳','阔步前行','毋庸置疑','不容置疑',
  '显而易见','不言而喻','不置可否','一如既往','深学细悟','学深悟透',
  '知行合一','学思用贯通','知信行统一','内化于心','外化于行','入脑入心',
  '常学常新','常悟常进','常研常得','世界变乱交织','动荡变革期',
  '大发展大变革','大调整大转型','风险挑战','机遇与挑战并存','扎实推进',
  '稳步推进','有序推进','加快推进','取得实效','成效显著','成效明显',
  '啃硬骨头','打硬仗','涉深水区','深水区攻坚','矛盾交织','问题叠加',
  '同向发力','同频共振','协同发力','联动推进','整体推进','重点突破',
  '以点带面','试点先行','先行先试','压茬推进','压茬落实','一茬接着一茬干',
  '一年接着一年干','一任接着一任抓','稳中向好','稳中有进','稳中提质',
  '进中向好','降本增效','扩内需','促消费','稳投资','稳外贸',
  '植根人民','造福人民','问需于民','问计于民',
  '问效于民','为民服务','为民造福','深入基层','深入群众','深入一线',
  '走村入户','调查研究','解剖麻雀','摸清底数','掌握实情',
  '四个意识','四个自信','两个维护','两个确立','三严三实','两学一做',
  '四风问题','八项规定','不敢腐','不能腐','不想腐',
]);

function findChengyuInText(text) {
  if (!text) return [];
  const re = /[\u4e00-\u9fa5]{4}/g;
  const found = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    if (CHENGYU_LIST.has(m[0])) found.add(m[0]);
  }
  return [...found];
}

// ── CSS ──
const BASE_CSS = `
:root{
  /* 宣纸 · 墨 · 朱印：保留变量名，重映射为书卷气质 */
  --canvas:#FBF8F1;            /* 卡片/面板：浅宣纸 */
  --surface:#ECE6D9;           /* 次级表面 */
  --surface-soft:#F3EFE6;      /* 页面底色：暖宣纸 */
  --surface-hover:#E4DCCB;
  --ink-deep:#1C1813;
  --ink:#211D18;
  --charcoal:#3A342B;
  --slate:#6B645B;
  --steel:#8A8175;
  --stone:#A99E8E;
  --muted:#B8AE9E;
  --hairline:#E2DBCD;
  --hairline-soft:#EAE3D6;
  --hairline-strong:#CFC6B4;
  --primary:#A8322A;           /* 朱印红 */
  --primary-hover:#86241D;
  --primary-light:#F4E4DF;
  --link:#2E5A88;
  --gold:#9A7B2E;
  --gold-bg:#F6EFD9;
  --gold-border:#E4D2A0;
  --highlight-yellow:#F6EFD9;
  --success:#3E7C5A;--warning:#B5762A;--error:#B5402E;
  --paper:#F3EFE6;--paper-2:#FBF8F1;--paper-3:#ECE6D9;
  --ink-soft:#6B645B;--ink-faint:#A99E8E;
  --line:#E2DBCD;--line-soft:#EAE3D6;--line-strong:#CFC6B4;
  --seal:#A8322A;--seal-deep:#86241D;--seal-soft:#F4E4DF;
  --max-width:1080px;--content-width:780px;--reading-width:720px;
  --r-xs:4px;--r-sm:6px;--r:10px;--r-lg:14px;--r-xl:18px;--r-full:9999px;
  --radius-xs:4px;--radius-sm:6px;--radius:10px;--radius-lg:14px;--radius-xl:18px;--radius-full:9999px;
  --font-sans:"PingFang SC","Microsoft YaHei","Source Han Sans SC","Hiragino Sans GB","Noto Sans SC",system-ui,sans-serif;
  --font-serif:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong",Georgia,serif;
  --serif:var(--font-serif);--sans:var(--font-sans);
  --weight-bold:600;--weight-medium:500;--weight-regular:400;
  --sh-xs:0 1px 2px rgba(40,30,20,.05);--sh-sm:0 2px 8px rgba(40,30,20,.06);
  --sh:0 6px 18px rgba(40,30,20,.08);--sh-lg:0 14px 38px rgba(40,30,20,.12);
  --shadow-xs:0 1px 2px rgba(40,30,20,.05);--shadow-sm:0 2px 8px rgba(40,30,20,.06);
  --shadow:0 6px 18px rgba(40,30,20,.08);--shadow-lg:0 14px 38px rgba(40,30,20,.12);--shadow-xl:0 16px 40px rgba(40,30,20,.14);
  --ease:cubic-bezier(0.16, 1, 0.3, 1);--dur:200ms;--duration:200ms;
}
[data-theme="dark"]{
  --canvas:#211E18;--surface:#2A2620;--surface-soft:#17150F;--surface-hover:#322C24;
  --ink-deep:#F4EDE0;--ink:#ECE5D7;--charcoal:#C8BFAF;--slate:#B7AE9E;
  --steel:#8F8676;--stone:#837B6E;--muted:#6B6356;
  --hairline:#332E25;--hairline-soft:#2A251E;--hairline-strong:#403929;
  --primary:#D6544A;--primary-hover:#E0665B;--primary-light:#3A241E;--link:#6FA0C9;
  --gold:#C9A85A;--gold-bg:#2C2618;--gold-border:#4A3F22;--highlight-yellow:#2C2618;
  --success:#5C9A78;--warning:#CF9345;--error:#D6544A;
  --paper:#17150F;--paper-2:#211E18;--paper-3:#2A2620;
  --ink-soft:#B7AE9E;--ink-faint:#837B6E;
  --line:#332E25;--line-soft:#2A251E;--line-strong:#403929;
  --seal:#D6544A;--seal-deep:#B23A30;--seal-soft:#3A241E;
  --sh-xs:0 1px 2px rgba(0,0,0,.4);--sh-sm:0 2px 8px rgba(0,0,0,.45);
  --sh:0 6px 18px rgba(0,0,0,.5);--sh-lg:0 14px 38px rgba(0,0,0,.6);
}
*,::before,::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:var(--font-sans);background:var(--surface-soft);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:var(--link);text-decoration:none;transition:color var(--duration) var(--ease)}
a:hover{color:var(--primary)}
button{cursor:pointer;font-family:inherit;border:none;background:none;color:inherit}

.site-header{position:sticky;top:0;z-index:100;background:color-mix(in srgb,var(--canvas)88%,transparent);border-bottom:1px solid var(--hairline);-webkit-backdrop-filter:blur(12px) saturate(180%);backdrop-filter:blur(12px) saturate(180%)}
.header-inner{max-width:var(--max-width);margin:0 auto;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.site-brand{display:flex;align-items:baseline;gap:8px;text-decoration:none;white-space:nowrap}
.brand-title{font-size:1.125rem;font-weight:600;color:var(--ink-deep);letter-spacing:-0.3px}
.brand-sub{font-size:.875rem;color:var(--stone)}
.nav-links{display:flex;gap:2px;background:var(--canvas);border:1px solid var(--hairline);border-radius:var(--radius-full);padding:3px}
.nav-links a{padding:6px 16px;border-radius:var(--radius-full);font-size:.875rem;color:var(--slate);font-weight:500;transition:all var(--duration) var(--ease);text-decoration:none}
.nav-links a:hover{color:var(--ink);background:var(--surface-hover)}
.nav-links a.active{background:var(--primary);color:#fff;box-shadow:var(--shadow-xs)}

.main-content{max-width:var(--max-width);margin:0 auto;padding:28px 24px 60px}

.cat-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:24px}
.cat-nav button{padding:6px 14px;border-radius:var(--radius-full);font-size:.875rem;border:1px solid var(--hairline);background:var(--canvas);color:var(--slate);font-weight:500;transition:all var(--duration) var(--ease)}
.cat-nav button:hover{border-color:var(--hairline-strong);color:var(--ink);background:var(--surface-hover)}
.cat-nav button.active{background:var(--ink);color:var(--canvas);border-color:var(--ink);font-weight:600}

.articles-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.article-card{background:var(--canvas);border-radius:var(--radius);box-shadow:var(--shadow-xs);border:1px solid var(--hairline-soft);overflow:hidden;cursor:pointer;transition:all var(--duration) var(--ease);display:flex;flex-direction:column;text-decoration:none;color:inherit}
.article-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--hairline)}
.card-top-bar{height:3px}
.card-body{padding:18px 20px;flex:1;display:flex;flex-direction:column}
.card-category{font-size:.8125rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.card-title{font-size:1rem;font-weight:600;line-height:1.25;margin-bottom:8px;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-excerpt{font-size:.875rem;color:var(--stone);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;flex:1}
.card-footer{padding:10px 20px;border-top:1px solid var(--hairline-soft);display:flex;gap:8px;font-size:.75rem;color:var(--steel);flex-wrap:wrap}
.badge{padding:2px 8px;border-radius:var(--radius-full);background:var(--primary-light);color:var(--primary);font-weight:500}
.badge-bf{background:#fef3cd;color:#856404;border:1px solid #ffeeba}

/* ── Article Page ── */
.article-page{max-width:var(--content-width);margin:0 auto;padding:32px 24px 80px}
.article-back{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:var(--radius-full);border:1px solid var(--hairline);background:var(--canvas);font-size:.875rem;color:var(--slate);font-weight:500;margin-bottom:24px;transition:all var(--duration) var(--ease);text-decoration:none}
.article-back:hover{border-color:var(--primary);color:var(--primary)}
.article-header{background:var(--canvas);border-radius:var(--radius-lg);padding:32px 36px;margin-bottom:20px;box-shadow:var(--shadow-xs);border:1px solid var(--hairline-soft)}
.article-meta-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.cat-badge-large{padding:5px 14px;border-radius:var(--radius-xs);font-size:.8125rem;font-weight:600;color:#fff;line-height:1.5}
.article-title{font-family:var(--font-serif);font-size:1.875rem;font-weight:600;line-height:1.3;margin-bottom:14px;color:var(--ink-deep);letter-spacing:-0.5px}
.article-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:.875rem;color:var(--steel)}
.article-meta a{color:var(--link)}
.article-body{background:var(--canvas);border-radius:var(--radius-lg);padding:40px 44px;box-shadow:var(--shadow-xs);border:1px solid var(--hairline-soft);margin-bottom:20px}
.article-body p{font-family:var(--font-serif);font-size:1.0625rem;line-height:2;margin-bottom:1.2em;text-indent:2em;color:var(--charcoal)}
.article-body p:first-child{text-indent:0}

/* 成语标注（仅 4 字成语） */
.cy-anno{position:relative;display:inline-block;cursor:help;color:var(--ink);border-bottom:1.5px dashed var(--gold);padding-bottom:1px;transition:all var(--duration) var(--ease)}
.cy-anno:hover{color:var(--gold);background:var(--gold-bg)}
.cy-anno .tip{visibility:hidden;opacity:0;position:absolute;bottom:100%;left:50%;transform:translateX(-50%) translateY(-6px);
  width:max-content;max-width:280px;padding:10px 14px;background:var(--ink);color:#fff;font-size:.8125rem;line-height:1.6;
  border-radius:var(--radius);transition:all .15s var(--ease);z-index:10;box-shadow:var(--shadow-lg);
  font-family:var(--font-sans);font-weight:400;pointer-events:none;white-space:normal}
.cy-anno .tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--ink)}
.cy-anno:hover .tip{visibility:visible;opacity:1;transform:translateX(-50%) translateY(-2px)}
.cy-anno.left .tip{left:0;transform:translateX(0) translateY(-6px)}
.cy-anno.left:hover .tip{transform:translateX(0) translateY(-2px)}
.cy-anno.left .tip::after{left:24px;transform:translateX(0)}

/* 金句标注 (黄金荧光笔效果) */
.gs-anno{background:linear-gradient(to bottom,transparent 55%,var(--gold-bg) 55%);padding:2px 0;border-radius:2px;transition:all var(--duration) var(--ease)}
.gs-anno:hover{background:var(--gold-bg);border-radius:4px}

.extras-section{background:var(--canvas);border-radius:var(--radius-lg);border:1px solid var(--hairline-soft);box-shadow:var(--shadow-xs);margin-bottom:20px;overflow:hidden}
.extras-tabs{display:flex;border-bottom:1px solid var(--hairline)}
.extras-tab{padding:14px 24px;font-size:.875rem;font-weight:500;color:var(--slate);cursor:pointer;border-bottom:2px solid transparent;transition:all var(--duration) var(--ease)}
.extras-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.extras-tab:hover{color:var(--ink)}
.extras-content{padding:24px 28px}
.extras-panel{display:none}
.extras-panel.active{display:block}
.words-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.word-card{background:var(--surface-soft);padding:14px 18px;border-radius:var(--radius);border-left:3px solid var(--primary);position:relative;transition:all .15s}
.word-card:hover{background:var(--canvas);box-shadow:var(--shadow-sm)}
.word-card .w{font-size:1rem;font-weight:600;color:var(--ink);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:6px}
.word-card .w .w-text{cursor:help}
.word-card .w .x-count{font-size:.75rem;color:var(--stone);font-weight:400;flex-shrink:0;background:var(--primary-light);color:var(--primary);padding:1px 7px;border-radius:8px}
.word-card .d{font-size:.8125rem;line-height:1.7;color:var(--slate);margin-top:4px}
.golden-list{display:flex;flex-direction:column;gap:14px}
.golden-item{padding:16px 20px;background:var(--gold-bg);border-radius:var(--radius);border-left:3px solid var(--gold)}
.golden-item .g-type{display:inline-block;font-size:.7rem;padding:1px 8px;border-radius:var(--radius-full);background:var(--primary-light);color:var(--primary);font-weight:500;margin-bottom:8px}
.golden-item .g-text{font-family:"FangSong","STFangsong","仿宋",var(--font-serif);font-size:1rem;line-height:1.9;color:var(--ink);font-style:normal}

.site-footer{text-align:center;padding:32px 24px;color:var(--stone);font-size:.75rem;border-top:1px solid var(--hairline);max-width:var(--max-width);margin:0 auto}
.footer-brand{font-weight:600;color:var(--primary);margin-bottom:4px}

/* ── 书卷/报头美学（新增） ── */
.site-brand{gap:12px}
.brand-seal{flex-shrink:0;width:38px;height:38px;border-radius:8px;background:var(--seal);color:#fff;font-family:var(--serif);font-weight:700;font-size:.95rem;display:flex;align-items:center;justify-content:center;letter-spacing:-1px;box-shadow:var(--sh-xs);line-height:1}
.brand-text{display:flex;flex-direction:column;line-height:1.15}
.brand-title{font-family:var(--serif);font-size:1.2rem;font-weight:700;color:var(--ink);letter-spacing:.5px}
.brand-sub{font-size:.7rem;color:var(--ink-faint);letter-spacing:.5px}
.nav-links a.active{color:var(--seal)}
.nav-links a.active::after{content:'';position:absolute;left:14px;right:14px;bottom:2px;height:2px;background:var(--seal);border-radius:2px}
.theme-toggle{margin-left:8px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;border:1px solid var(--hairline);background:var(--surface);transition:all var(--dur) var(--ease)}
.theme-toggle:hover{border-color:var(--seal);transform:rotate(15deg)}

.masthead{border-top:3px double var(--ink);padding-top:18px;margin-bottom:28px}
.masthead-kicker{font-size:.78rem;letter-spacing:4px;color:var(--seal);font-weight:600;margin-bottom:10px}
.masthead-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--hairline);padding-bottom:14px}
.masthead-title{font-family:var(--serif);font-size:2.1rem;font-weight:700;letter-spacing:1px;color:var(--ink)}
.masthead-date{text-align:right;line-height:1.1}
.masthead-day{display:block;font-family:var(--serif);font-size:1.5rem;font-weight:700;color:var(--ink)}
.masthead-week{font-size:.85rem;color:var(--ink-faint)}
.masthead-meta{display:flex;gap:18px;flex-wrap:wrap;font-size:.85rem;color:var(--ink-soft);margin-top:14px}
.masthead-meta a{color:var(--ink-soft)}
.masthead-meta a:hover{color:var(--seal)}

.card-title{font-family:var(--serif);font-size:1.1rem;font-weight:700;line-height:1.4}
.card-category{font-size:.72rem;font-weight:600;letter-spacing:1px;margin-bottom:10px;display:inline-flex;align-items:center;gap:6px}
.card-category::before{content:'';width:7px;height:7px;border-radius:2px;background:currentColor;opacity:.85}
.article-card{border-radius:var(--r)}
.article-card:hover .card-top-bar{height:5px}

.page-title{font-family:var(--serif);font-size:2rem;font-weight:700;margin-bottom:8px;color:var(--ink);letter-spacing:.5px}
.page-sub{font-size:.875rem;color:var(--ink-soft);margin-bottom:28px}
.section-title{font-family:var(--serif);font-size:1.35rem;font-weight:700;margin:8px 0 16px;color:var(--ink);padding-left:12px;border-left:3px solid var(--seal)}
.article-title{font-family:var(--serif);font-size:2rem;font-weight:700;line-height:1.45}
.article-header{border-top:3px double var(--ink);padding-top:22px;margin-bottom:24px}

@media(max-width:768px){
  .header-inner{padding:10px 16px}
  .brand-sub{display:none}
  .nav-links a{padding:6px 10px;font-size:.8rem}
  .main-content{padding:20px 14px 48px}
  .article-page{padding:20px 14px 60px}
  .article-header{padding:18px 20px}
  .article-body{padding:24px 20px}
  .article-title{font-size:1.5rem}
  .article-body p{font-size:1rem;line-height:1.95}
  .articles-grid{grid-template-columns:1fr}
  .extras-content{padding:18px 20px}
  .masthead-title{font-size:1.6rem}
  .masthead-day{font-size:1.4rem}
  .page-title{font-size:1.6rem}
}
`;

// ── JS ──
const BASE_JS = `
function attachTooltips(){
  if(document.querySelectorAll('.cy-anno').length === 0) return;
  document.querySelectorAll('.cy-anno').forEach(function(span){
    var rect = span.getBoundingClientRect();
    if (rect.left > window.innerWidth * 0.5) {
      span.classList.add('left');
    }
  });
}
function attachTabs(){
  document.querySelectorAll('.extras-tab').forEach(function(t){
    t.addEventListener('click', function(){
      var key = t.dataset.tab;
      document.querySelectorAll('.extras-tab').forEach(function(x){x.classList.toggle('active', x===t);});
      document.querySelectorAll('.extras-panel').forEach(function(p){p.classList.toggle('active', p.dataset.tab===key);});
    });
  });
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ attachTabs(); attachTooltips(); });
} else {
  attachTabs(); attachTooltips();
}
`;


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API: 成语释义 (AI 生成 + KV 缓存)
    const idiomMatch = path.match(/^\/api\/idiom\/(.+)$/);
    if (idiomMatch) {
      const word = decodeURIComponent(idiomMatch[1]);
      return serveIdiomDef(env, word);
    }

    if (path === '/api/articles') {
      const data = await env.ARTICLES.get('latest_articles', 'json');
      return jsonResponse(data || {});
    }
    if (path === '/api/manifest') {
      const data = await env.ARTICLES.get('manifest', 'json');
      return jsonResponse(data || {});
    }

    if (path === '/manifest.json' || path === '/sw.js' || path === '/favicon.ico' || path === '/robots.txt') {
      return env.ASSETS.fetch(request);
    }


    const articleMatch = path.match(/^\/article\/(\d{4}-\d{2}-\d{2})\/(.+)$/);
    if (articleMatch) {
      const [, date, cat] = articleMatch;
      return serveArticlePage(env, date, decodeURIComponent(cat));
    }

    if (path === '/archive') return serveArchivePage(env);
    if (path === '/phrases') return servePhrasesPage(env);

    return serveHomePage(env);
  }
};

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function todaySlug(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekday(d) {
  const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  return days[new Date(d).getDay()];
}

// ── 智能替换成语 (服务端预生成 tooltip HTML) ──
function annotateChengyu(html, chengyuDefs) {
  if (!chengyuDefs || Object.keys(chengyuDefs).length === 0) return html;

  // 按成语长度从长到短排序,避免短词覆盖长词
  const keys = Object.keys(chengyuDefs).sort((a, b) => b.length - a.length);

  let result = html;
  for (const w of keys) {
    const def = chengyuDefs[w];
    if (!def) continue;
    const escW = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escW, 'g');
    const replacement = `<span class="cy-anno">${w}<span class="tip">${escHtml(def)}</span></span>`;
    result = result.replace(re, replacement);
  }
  return result;
}

// ── 金句标注 (服务端预生成黄金高亮) ──
function annotateGoldenSentences(html, highlights) {
  if (!highlights || highlights.length === 0) return html;
  let result = html;
  for (const h of highlights) {
    const text = h.text;
    if (!text || text.length < 8) continue;
    const escT = escHtml(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escT, 'g');
    result = result.replace(re, `<span class="gs-anno">${escHtml(text)}</span>`);
  }
  return result;
}

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── 兜底成语字典 (KV 没缓存时使用) ──
const FALLBACK_DEFS = {
  '源远流长': '源头很远，流程很长，比喻历史悠久。',
  '博大精深': '形容思想、学说等广博高深。',
  '薪火相传': '比喻学问、技术或精神代代相传。',
  '与时俱进': '随着时代的发展而不断进步。',
  '革故鼎新': '去除旧的，建立新的。',
  '承前启后': '承接前代的，启发后代的。',
  '继往开来': '继承前人的事业，开辟未来的道路。',
  '天下大同': '儒家理想社会境界，天下人人友爱、各得其所。',
  '美美与共': '各自美，又相互欣赏、共同美，出自费孝通名言。',
  '各美其美': '各自欣赏自身的美，尊重多元文化的差异。',
  '美人之美': '善于发现、欣赏他人之美。',
  '和而不同': '和睦相处但保持各自特色。',
  '协和万邦': '协调万国关系，形容国与国之间和睦相处。',
  '讲信修睦': '讲究信用，谋求和睦。',
  '亲仁善邻': '亲近仁者，与邻为善。',
  '兼济天下': '使天下人都得到好处。',
  '立己达人': '《论语》"己欲立而立人，己欲达而达人"，先成就自己，再帮助别人。',
  '以文化人': '用文化的方式教育人、感化人。',
  '以文育人': '通过文化载体培育人。',
  '推陈出新': '剔除旧的，创造新的，含有所继承的基础上有所创新之意。',
  '博采众长': '广泛采纳众人的长处及各方面的优点。',
  '兼收并蓄': '把不同的内容兼收并蓄、广泛吸收。',
  '潜移默化': '指人的思想或性格受环境影响而不知不觉地发生变化。',
  '润物无声': '形容潜移默化的良好影响。',
  '春风化雨': '比喻良好教育的普及和深入。',
  '驰而不息': '形容马不停蹄、持续不断，强调长期坚持而不松懈。',
  '久久为功': '持之以恒、锲而不舍，长期坚持做事方能见到成效。',
  '踏石留印': '比喻做事扎实、一步一个脚印。',
  '抓铁有痕': '比喻工作力度大、措施有力，能留下明显的成果。',
  '求真务实': '追求真理、讲求实效，强调一切从实际出发。',
  '真抓实干': '认真地、切实地开展实际工作，不搞花架子。',
  '身体力行': '亲身体验、努力实行，强调以身作则。',
  '率先垂范': '带头做、亲自做，为他人树立榜样。',
  '徙木立信': '商鞅立木为信以取信于民，比喻说到做到、言而有信。',
  '循序渐进': '按照一定的步骤逐渐深入或提高。',
  '稳中求进': '在稳定的基础上谋求发展。',
  '稳字当头': '把稳定作为首要任务和前提。',
  '行稳致远': '走得稳才能走得更远，强调平稳发展。',
  '提质增效': '提升质量、增加效益。',
  '转型升级': '通过技术进步和结构调整实现产业从中低端向中高端跃升。',
  '统筹兼顾': '统一筹划、照顾各方面，强调全面协调、整体推进。',
  '系统思维': '从系统整体出发，着眼于要素与要素、整体与部分的关系。',
  '辩证思维': '用联系、发展、全面的观点看问题。',
  '底线思维': '凡事从最坏处准备，努力争取最好的结果。',
  '迎难而上': '面对困难奋勇向前，不畏缩。',
  '攻坚克难': '攻克堡垒、战胜困难。',
  '锐意进取': '意志坚定、勇于进取。',
  '勇往直前': '勇敢地一直往前进。',
  '踔厉奋发': '精神振奋、斗志昂扬地行动。',
  '锲而不舍': '不停地刻镂，比喻有恒心、有毅力。',
  '水滴石穿': '水滴持续滴落能穿透石头，比喻力量虽小但坚持不懈。',
  '善作善成': '善于做、善于完成。',
  '善始善终': '从开始到结束都很好，比喻做事认真。',
  '落地见效': '措施、政策得到实际执行并产生效果。',
  '落地生根': '比喻事情落到实处、扎实推进。',
  '开花结果': '比喻工作有进展并取得成果。',
  '多点突破': '在多个方面、多个领域同时取得突破。',
  '纵深推进': '向更深入、更广阔的领域推进。',
  '协同推进': '多个方面协调配合共同推进。',
  '齐头并进': '几个方面同时并进。',
  '一抓到底': '从开始到结束一直坚持抓落实。',
  '守土有责': '在自己的职责范围内守护、负责。',
  '守土担责': '勇于承担自己职责范围内的责任。',
  '守土尽责': '尽职尽责做好本职工作。',
  '敢于担当': '勇于承担责任、不回避矛盾。',
  '挺身而出': '勇敢地站出来面对困难或危险。',
  '冲锋在前': '在战斗中冲在最前面。',
  '打虎拍蝇': '既查处领导干部违纪违法案件，又解决群众身边的不正之风。',
  '风腐交织': '不正之风和腐败问题相互交织、相互渗透。',
  '由风及腐': '由轻微的违规行为，逐渐演变为腐败犯罪。',
  '不敢腐': '通过严厉惩治形成高压态势，让人不敢触碰腐败红线。',
  '不能腐': '通过完善制度、健全法治，让腐败行为无机可乘。',
  '不想腐': '通过加强教育、培育廉洁文化，从思想根源上消除腐败动机。',
  '防微杜渐': '在错误或坏事尚萌芽时就加以防止。',
  '常抓不懈': '长期持续地抓，不松懈。',
  '警钟长鸣': '警示之声长久不断，提醒人们保持警惕。',
  '抓早抓小': '对苗头性、倾向性问题早发现早处理。',
  '自立自强': '依靠自身力量实现发展强盛。',
  '自主创新': '依靠自身力量进行创新，不依赖他人。',
  '开放合作': '以开放的姿态与其他国家、地区合作共事。',
  '勇攀高峰': '勇敢地向最高点攀登，比喻追求卓越。',
  '敢为人先': '敢做别人没做过的事。',
  '勇立潮头': '勇敢地站在时代潮流的前列。',
  '毋庸置疑': '事实明显或理由充分，不必怀疑。',
  '显而易见': '明显地容易看清。',
  '不言而喻': '不用说就能明白。',
  '知行合一': '认识与实践的统一。',
  '扎实推进': '稳扎稳打地推进工作。',
  '稳步推进': '按步骤、按计划有序推进。',
  '有序推进': '按顺序、有条理地推进。',
  '加快推进': '加快速度、加大力度推进。',
  '取得实效': '取得实际的效果和成绩。',
  '成效显著': '取得的成绩和效果十分明显。',
  '啃硬骨头': '比喻解决最困难的问题。',
  '同向发力': '朝着同一个方向共同努力。',
  '同频共振': '节奏一致、配合默契。',
  '重点突破': '抓住关键问题取得突破。',
  '以点带面': '通过个别的、典型的事例带动全面的工作。',
  '压茬推进': '前后接续、一茬接一茬地推进。',
  '稳中向好': '在稳定中向好的方向发展。',
  '稳中有进': '在稳定的基础上有进步。',
  '降本增效': '降低成本、增加效益。',
  '众志成城': '众人一心，像城墙一样坚固，比喻团结一致。',
  '戮力同心': '齐心合力，团结一致。',
  '不驰于空想': '不沉溺于空洞的幻想。',
  '不骛于虚声': '不追求虚名浮誉。',
  '绵绵用力': '持续不断地投入力量。',
  '中国式现代化': '中国共产党领导的社会主义现代化，具有五大特征。',
  '高质量发展': '体现新发展理念的发展，是创新成为第一动力的发展。',
  '共同富裕': '全体人民通过辛勤劳动和相互帮助，普遍达到生活富裕。',
  '新质生产力': '以创新为主导，符合新发展理念的先进生产力质态。',
  '全过程人民民主': '我国社会主义民主政治的本质属性，最广泛、最真实、最管用的民主。',
  '人类命运共同体': '各国相互依存、休戚与共，追求共赢共享。',
  '百年未有之大变局': '当今世界正经历新一轮大发展大变革大调整。',
  '顶层设计': '从最高层次上对系统进行整体规划，明确目标、战略、路径。',
  '以人民为中心': '坚持人民主体地位，把人民对美好生活的向往作为奋斗目标。',
  '全面从严治党': '新时代党的建设总要求，覆盖全方位。',
  '一带一路': '丝绸之路经济带和21世纪海上丝绸之路，旨在促进沿线各国合作。',
  '自我革命': '中国共产党以伟大自我革命引领伟大社会革命。',
  '制度型开放': '从商品和要素流动型开放转向规则、规制等制度型开放。',
  '共建共治共享': '社会治理格局中，政府主导、社会协同、公众参与。',
  '创造性转化': '对传统文化中仍有借鉴价值的内涵和陈旧的表现形式加以改造。',
  '创新性发展': '对中华优秀传统文化的内涵加以补充、拓展、完善。',
  '四个意识': '政治意识、大局意识、核心意识、看齐意识。',
  '四个自信': '道路自信、理论自信、制度自信、文化自信。',
  '两个维护': '坚决维护习近平总书记党中央的核心、全党的核心地位。',
  '两个确立': '确立习近平同志党中央的核心、全党的核心地位。',
  '八项规定': '中央政治局关于改进工作作风、密切联系群众的八项规定。',
  '一以贯之': '用一个道理贯穿始终，强调政策的连续性和稳定性。',
  '一如既往': '完全像从前一样，不改变做法。',
  '三严三实': '严以修身、严以用权、严以律己，谋事要实、创业要实、做人要实。',
  '不容置疑': '不允许有什么怀疑，形容论证严密。',
  '不置可否': '不表示赞同，也不表示反对。',
  '业广惟勤': '学业事业的成功在于勤奋。',
  '两学一做': '学党章党规、学系列讲话，做合格党员。',
  '为民服务': '为人民群众服务。',
  '为民造福': '为人民群众谋福利。',
  '乡村振兴': '推动农村经济、政治、文化、社会、生态全面振兴。',
  '事不避难': '遇到困难不回避，迎难而上。',
  '人工智能': '研究、开发用于模拟、延伸和扩展人类智能的理论、方法、技术。',
  '人民至上': '把人民的利益放在第一位。',
  '从严治党': '按照严格的纪律和规矩管理党。',
  '代代相传': '一代一代传下去。',
  '以上促下': '以上级带动下级，形成上下联动。',
  '以上率下': '上级以身作则，带动下级。',
  '休戚与共': '彼此之间祸福、忧乐共同承担。',
  '供需两端': '供给与需求两个方面。',
  '先行先试': '率先进行试点，积累经验。',
  '党的建设': '党为保持自身先进性而进行的自身建设。',
  '入脑入心': '深入到头脑和心里，形容学习或理解深刻。',
  '全面发力': '在多个方面同时投入力量、采取措施。',
  '内化于心': '将外部要求转化为内心深处的认知和信念。',
  '创新思维': '以新颖独特的方式解决问题的思维活动。',
  '功崇惟志': '建立伟大功业在于有远大志向。',
  '励精图治': '振作精神，想办法治理好国家。',
  '劳有所得': '有劳动就有收获，民生保障的基本要求。',
  '协同发力': '多方协调共同出力。',
  '协同攻关': '多个方面、多个部门联合攻克难题。',
  '压茬落实': '接续不断、一茬接一茬地推进落实。',
  '去其糟粕': '剔除事物中不好的部分。',
  '取其精华': '吸收事物中好的部分。',
  '古为今用': '批判地继承古代文化遗产，为今天所用。',
  '四风问题': '形式主义、官僚主义、享乐主义和奢靡之风。',
  '外化于行': '将内心认知转化为实际行动。',
  '夙夜在公': '从早到晚都为国家公务忙碌。',
  '学有所教': '人人享有受教育的权利。',
  '学深悟透': '学习深入、领悟透彻。',
  '安居乐业': '安定地生活，愉快地从事其职业。',
  '工作作风': '在工作中表现出来的态度和风格。',
  '常学常新': '经常学习常有新体会。',
  '常悟常进': '经常领悟常有新进步。',
  '常研常得': '经常研究常有新收获。',
  '幼有所育': '学龄前儿童得到良好的养育。',
  '弱有所扶': '困难群众得到基本生活保障和帮扶。',
  '志不求易': '立志不追求容易实现的目标。',
  '息息相关': '形容关系非常密切。',
  '成效明显': '取得的效果比较明显。',
  '战略思维': '从全局和长远看问题、想问题。',
  '掌握实情': '深入了解实际情况。',
  '摸清底数': '搞清楚基本情况和具体数据。',
  '敢闯敢试': '敢于闯新路、敢于做试验。',
  '整体推进': '从全局出发全面推进工作。',
  '文化建设': '发展教育、科学、文学艺术等事业。',
  '标本兼治': '既解决表层问题，又解决根源问题。',
  '植根人民': '深深扎根于人民群众之中。',
  '死而后已': '到死才停止，形容奋斗终生。',
  '民生保障': '保障人民群众基本生活需要。',
  '洋为中用': '借鉴吸收外国的有益经验为我所用。',
  '涉深水区': '比喻进入问题最复杂、最困难的领域。',
  '深入一线': '深入到基层和工作现场。',
  '深入基层': '深入到基层单位。',
  '深入群众': '深入到人民群众之中。',
  '深学细悟': '深入学习、仔细领悟。',
  '猎狐行动': '中央反腐败协调小组部署的追逃追赃专项行动。',
  '生态文明': '人与自然和谐共生的文明形态。',
  '病有所医': '人民群众患病能够得到及时有效的治疗。',
  '百折不挠': '无论受多少挫折都不退缩。',
  '目标导向': '以实现既定目标为方向推进工作。',
  '矛盾交织': '多种矛盾相互交叉、错综复杂。',
  '社会治理': '政府、社会组织、公民共同管理社会事务。',
  '祛疴治乱': '除去痼疾、整治乱象。',
  '科技创新': '通过科学研究创造新技术、新工艺。',
  '稳中提质': '在稳定发展中提升质量。',
  '笃信笃行': '坚定信仰、忠实践行。',
  '笃行不怠': '忠实履行而不倦怠。',
  '精准思维': '注重精准、精确、精细的思维方法。',
  '系统观念': '从系统整体出发统筹各要素的观念。',
  '经济建设': '以发展经济为中心的建设活动。',
  '结果导向': '以最终结果作为衡量标准的导向。',
  '绣花功夫': '比喻精细精准的工作方式。',
  '绳锯木断': '绳子也能把木头锯断，比喻坚持不懈。',
  '老有所养': '老年人得到基本生活保障。',
  '联动推进': '相关部门协调配合共同推进。',
  '联合攻关': '多个单位联合攻克难关。',
  '脱虚向实': '从务虚转向务实，注重实际效果。',
  '解剖麻雀': '比喻对个别典型事例进行深入细致研究。',
  '试点先行': '先在局部地区试验，积累经验再推广。',
  '调查研究': '通过各种方式了解客观实际情况。',
  '走村入户': '深入农村挨家挨户走访。',
  '蹄疾步稳': '像马跑得快而稳，形容又快又稳。',
  '进中向好': '在发展中向好的方向推进。',
  '造福人民': '为人民谋福利。',
  '逢山开路': '遇到山就开出路来，形容克服困难。',
  '遇水架桥': '遇到河流就架起桥来，形容克服困难。',
  '问效于民': '向人民询问工作效果。',
  '问计于民': '向人民请教办法、听取意见。',
  '问需于民': '了解人民群众的实际需要。',
  '问题叠加': '多个问题同时出现、相互叠加。',
  '问题导向': '以解决问题为出发点和落脚点。',
  '阔步前行': '迈开大步向前走。',
  '鞠躬尽瘁': '恭敬谨慎，竭尽全力，多用以形容贡献毕生精力。',
  '顽瘴痼疾': '积久难治的疾病，比喻难改的陋习。',
  '风险挑战': '可能遇到的危险和考验。',
  '勇挑重担': '勇于承担重要的责任。',
  '千锤百炼': '比喻经过反复锻炼和考验。',
  '一茬接着一茬': '一拨接一拨，连续不断。',
  '知信行统一': '认知、信仰、行动相统一。',
  '向纵深推进': '向更深层次推进。',
  '精准扶贫': '针对贫困地区和贫困户进行精确识别、精确帮扶。',
  '民生福祉': '人民群众的生计和幸福。',
  '民主监督': '通过民主方式进行的监督。',
  '民主决策': '通过民主程序进行决策。',
  '举一反三': '从一件事情类推而知道其他事情。',
  '责无旁贷': '责任不能往旁边推卸，是自己应尽的责任。',
  '正风肃纪': '整顿作风、严肃纪律。',
  '上行下效': '上面的人怎么做，下面的人就跟着学。',
  '一查到底': '彻底查清问题。',
  '一严到底': '严格要求到底不放松。',
  '党管干部': '党对干部工作的领导和管理。',
  '反腐倡廉': '反对腐败，倡导廉洁。',
  '担当尽责': '勇于承担责任，认真履行职责。',
  '空谈误国': '光说不做会耽误国家发展。',
  '实干兴邦': '脚踏实地地做事能使国家兴旺。',
  '水乳交融': '像水和乳汁那样融合在一起，比喻关系非常融洽。',
  '凝心聚力': '凝聚人心，集中力量。',
  '以身作则': '用自己的行动做出榜样。',
  '有始有终': '有开头也有结尾，指做事认真，能坚持到底。',
  '掷地有声': '形容话语坚定有力、行动果断。',
  '一任接着一任抓': '一任领导接着一任领导持续抓工作，强调接续奋斗。',
  '一年接着一年干': '持续推进工作，年年接续。',
  '一茬接着一茬干': '一拨接一拨地持续推进。',
  '不负十四亿': '不辜负十四亿人民的期望。',
  '得罪千百人': '宁可得罪少数人也要维护人民利益。',
  '世界变乱交织': '当今世界变乱交织，不稳定不确定因素增多。',
  '促消费': '促进消费扩大和升级。',
  '扩内需': '扩大国内市场需求。',
  '稳外贸': '稳定对外贸易基本盘。',
  '稳投资': '稳定投资规模、优化投资结构。',
  '借八方之力': '借助各方面的力量。',
  '聚四海之气': '汇聚四面八方的力量和智慧。',
  '动荡变革期': '世界处于动荡变革时期。',
  '大发展大变革': '当前世界正经历大发展大变革。',
  '大调整大转型': '经济结构正在大调整大转型。',
  '学思用贯通': '学习、思考、运用贯通起来。',
  '打硬仗': '打最艰难的仗，比喻攻克最困难的难题。',
  '摸着石头过河': '比喻在实践中摸索前进。',
  '机遇与挑战并存': '机会和困难同时存在。',
  '深水区攻坚': '在问题最复杂的领域发起攻坚。',
};

// ── 加载成语释义 (KV 缓存 + 兜底字典) ──
async function loadChengyuDefs(env, chengyuList, skipApi = false) {
  if (!chengyuList || chengyuList.length === 0) return {};
  const defs = {};
  const missing = [];

  // 1. 兜底字典 (本地常量, 不需要网络)
  for (const w of chengyuList) {
    if (FALLBACK_DEFS[w]) defs[w] = FALLBACK_DEFS[w];
  }

  // 2. 批量从 KV 读取 (覆盖兜底里没有的, 或更新已有的)
  const keys = chengyuList.map(w => `idiom:${w}`);
  if (env.ARTICLES) {
    try {
      const kvResults = await Promise.all(
        keys.map(k => env.ARTICLES.get(k, 'text').catch(() => null))
      );
      chengyuList.forEach((w, i) => {
        if (kvResults[i]) defs[w] = kvResults[i];
        else if (!defs[w]) missing.push(w);
      });
    } catch (e) {
      missing.push(...chengyuList.filter(w => !defs[w]));
    }
  } else {
    missing.push(...chengyuList.filter(w => !defs[w]));
  }

  // 缺失的用硅基流动 API 生成 (兼容 OpenAI 格式)；skipApi=true 时跳过（页面渲染不串行调 API，避免超时）
  if (missing.length > 0 && !skipApi) {
    const apiKey = env.ARTICLES ? await env.ARTICLES.get('SILICONFLOW_API_KEY', 'text').catch(() => null) : null;
    if (apiKey) {
      for (const w of missing) {
        try {
          const resp = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'Qwen/Qwen2.5-7B-Instruct',
              messages: [
                { role: 'system', content: '你是中文释义专家。请用 60 字以内解释成语或政策术语，包含字面意思和使用场景。只输出释义。' },
                { role: 'user', content: '请解释：' + w }
              ],
              max_tokens: 150,
              temperature: 0.3
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            const def = data.choices?.[0]?.message?.content?.trim()?.slice(0, 200);
            if (def && def.length > 2) {
              defs[w] = def;
              if (env.ARTICLES) await env.ARTICLES.put('idiom:'+w, def, { expirationTtl: 7776000 });
            }
          }
        } catch (e) {}
      }
    }
  }

  return defs;
}

// ── API: 获取成语释义 (硅基流动) ──
async function serveIdiomDef(env, word) {
  // FALLBACK_DEFS 兜底
  if (FALLBACK_DEFS[word]) {
    return jsonResponse({ word, def: FALLBACK_DEFS[word], source: 'dict' });
  }
  // KV 缓存
  if (env.ARTICLES) {
    const cached = await env.ARTICLES.get(`idiom:${word}`, 'text');
    if (cached) {
      return jsonResponse({ word, def: cached, source: 'cache' });
    }
  }
  // 硅基流动 API 生成
  const apiKey = env.ARTICLES ? await env.ARTICLES.get('SILICONFLOW_API_KEY', 'text').catch(() => null) : null;
  if (apiKey) {
    try {
      const resp = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: [
            { role: 'system', content: '你是中文释义专家。请用 60 字以内解释成语或政策术语，包含字面意思和使用场景。只输出释义。' },
            { role: 'user', content: '请解释：' + word }
          ],
          max_tokens: 150,
          temperature: 0.3
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const def = data.choices?.[0]?.message?.content?.trim()?.slice(0, 200);
        if (def && def.length > 2) {
          if (env.ARTICLES) await env.ARTICLES.put('idiom:'+word, def, { expirationTtl: 7776000 });
          return jsonResponse({ word, def, source: 'ai' });
        }
      }
    } catch (e) {}
  }
  return jsonResponse({ word, def: '暂无释义', source: 'none' });
}

// ── Home ──
async function serveHomePage(env) {
  const [articles, manifest, latestDate] = await Promise.all([
    env.ARTICLES.get('latest_articles', 'json'),
    env.ARTICLES.get('manifest', 'json'),
    env.ARTICLES.get('latest_date'),
  ]);

  const today = latestDate || todaySlug(new Date());
  const todayArticles = articles || {};
  const manifestData = manifest || {};
  const totalDates = Object.keys(manifestData).length;
  const totalArticles = Object.values(manifestData).reduce((a, b) => a + b, 0);

  const cards = Object.entries(todayArticles).map(([cat, art]) => {
    const cfg = CAT_CONFIG[cat] || { label: cat, color: '#666' };
    const excerpt = (art.content || '').replace(/\s+/g, '').slice(0, 80);
    const phraseCount = (art.phrases || []).length;
    const hlCount = (art.highlights || []).length;
    return `<a class="article-card" href="/article/${today}/${cat}">
      <div class="card-top-bar" style="background:${cfg.color}"></div>
      <div class="card-body">
        <div class="card-category" style="color:${cfg.color}">${cfg.label}</div>
        <h3 class="card-title">${esc(art.title || '')}</h3>
        <p class="card-excerpt">${esc(excerpt)}</p>
      </div>
      <div class="card-footer">
        ${art.backfill_from ? '<span class="badge badge-bf">📋 昨日转载</span>' : ''}
        ${phraseCount > 0 ? `<span class="badge">📝 ${phraseCount}好词</span>` : ''}
        ${hlCount > 0 ? `<span class="badge">✨ ${hlCount}金句</span>` : ''}
        ${art.pub_date ? `<span>${art.pub_date}</span>` : ''}
      </div>
    </a>`;
  }).join('');

  return htmlResponse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>
(function(){
  try{
    var t=localStorage.getItem('shenlun-theme');
    if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-theme',t);
    var syncIcon=function(){var b=document.querySelector('.theme-toggle');if(b)b.textContent=(document.documentElement.getAttribute('data-theme')==='dark')?'☀️':'🌙';};
    window.toggleTheme=function(){var c=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',c);try{localStorage.setItem('shenlun-theme',c);}catch(e){}syncIcon();};
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',syncIcon);}else{syncIcon();}
  }catch(e){}
})();
</script>
<title>申论议论文 · 每日精选</title>
<meta name="theme-color" content="#A8322A">
<link rel="manifest" href="/manifest.json">
<style>${BASE_CSS}</style>
</head>
<body>
    <header class="site-header">
      <div class="header-inner">
        <a href="/" class="site-brand">
          <span class="brand-seal">申论</span>
          <span class="brand-text">
            <span class="brand-title">申论议论文</span>
            <span class="brand-sub">每日精选 · 人民网观点</span>
          </span>
        </a>
        <nav class="nav-links">
          <a href="/" class="active">今日</a>
          <a href="/archive">归档</a>
          <a href="/phrases">好词金句</a>
          <button class="theme-toggle" onclick="toggleTheme()" aria-label="切换日/夜读模式">🌙</button>
        </nav>
      </div>
    </header>
<main class="main-content">
    <section class="masthead">
      <p class="masthead-kicker">每 日 精 选 · 人 民 网 观 点 频 道</p>
      <div class="masthead-row">
        <h1 class="masthead-title">今日论点导读</h1>
        <div class="masthead-date">
          <span class="masthead-day">${today}</span>
          <span class="masthead-week">${getWeekday(today)}</span>
        </div>
      </div>
      <div class="masthead-meta">
        <span>📄 今日 ${Object.keys(todayArticles).length} 篇</span>
        <a href="/archive">📚 累计 ${totalArticles} 篇</a>
        <span>🤖 每日 8:00 自动更新</span>
      </div>
    </section>
  <div class="cat-nav" id="catNav">
    <button class="active" onclick="allArticles()">全部</button>
    ${Object.entries(CAT_CONFIG).map(([k, v]) => `<button onclick="filterCat('${k}')">${v.label}</button>`).join('')}
  </div>
  <div class="articles-grid" id="cards">${cards || '<p style="text-align:center;color:var(--stone);padding:40px">暂无文章</p>'}</div>
</main>
<footer class="site-footer">
  <div class="footer-brand">申论议论文 · 每日精选</div>
  <div>来源：人民网 · 观点频道 ｜ 仅供学习使用</div>
</footer>
<script>
var CAT_CONFIG = ${JSON.stringify(CAT_CONFIG)};
var CAT_DATA = ${JSON.stringify(todayArticles)};
var TODAY_DATE="${today}";
function allArticles() {
  document.querySelectorAll('.cat-nav button').forEach(function(b,i){b.classList.toggle('active',i===0);});
  renderCards(null);
}
function filterCat(cat) {
  document.querySelectorAll('.cat-nav button').forEach(function(b){
    b.classList.toggle('active', b.textContent.trim() === (CAT_CONFIG[cat]||{}).label || (cat==='all' && b.textContent.trim()==='全部'));
  });
  renderCards(cat);
}
function renderCards(filter) {
  var html='';
  Object.entries(CAT_DATA).forEach(function(e){
    var cat=e[0], art=e[1];
    if(filter && cat!==filter) return;
    var cfg=CAT_CONFIG[cat]||{label:cat,color:'#666'};
    var excerpt=(art.content||'').replace(/\\s+/g,'').slice(0,80);
    html+='<a class="article-card" href="/article/'+TODAY_DATE+'/'+cat+'"><div class="card-top-bar" style="background:'+cfg.color+'"></div><div class="card-body"><div class="card-category" style="color:'+cfg.color+'">'+cfg.label+'</div><h3 class="card-title">'+escH(art.title||'')+'</h3><p class="card-excerpt">'+escH(excerpt)+'</p></div><div class="card-footer">'+((art.phrases||[]).length?'<span class="badge">📝 '+(art.phrases||[]).length+' 好词</span>':'')+((art.highlights||[]).length?'<span class="badge">✨ '+(art.highlights||[]).length+' 金句</span>':'')+(art.pub_date?'<span>'+art.pub_date+'</span>':'')+'</div></a>';
  });
  document.getElementById('cards').innerHTML=html||'<p style="text-align:center;color:var(--stone);padding:40px">该分类暂无文章</p>';
}
function escH(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
var TODAY_DATE="${today}";
</script>
</body>
</html>`);
}

// ── Article Page ──
async function serveArticlePage(env, date, cat) {
  // Try specific date, fallback to latest
  let article;
  let actualDate = date;
  const dayKey = `articles/${date}`;

  const dayData = await env.ARTICLES.get(dayKey, 'json');
  if (dayData && dayData[cat]) {
    article = dayData[cat];
  } else {
    const latest = await env.ARTICLES.get('latest_articles', 'json');
    if (latest && latest[cat]) {
      article = latest[cat];
      actualDate = await env.ARTICLES.get('latest_date') || date;
    } else {
      return new Response('文章未找到', { status: 404 });
    }
  }

  const cfg = CAT_CONFIG[cat] || { label: cat, color: '#666' };

  // 提取文章里所有出现的成语
  const chengyuInText = findChengyuInText(article.content || '');
  // 限制每页最多处理 30 个成语 (避免 AI 调用过多)
  const chengyuToAnnotate = chengyuInText.slice(0, 30);

  // 加载释义 (KV + AI)
  const chengyuDefs = await loadChengyuDefs(env, chengyuToAnnotate);

  // 金句列表
  const highlights = article.highlights || [];

  // 渲染段落: 先成语标注 → 再金句标注
  const paras = (article.content || '').replace(/\r/g, '').split('\n\n').filter(p => p.trim().length > 2);
  const bodyHTML = paras.map(p => {
    let html = esc(p.trim());
    html = annotateChengyu(html, chengyuDefs);
    html = annotateGoldenSentences(html, highlights);
    return `<p>${html}</p>`;
  }).join('\n');

  // 关键词卡片 (从页内成语取, 全部含 AI 释义)
  const wordsHTML = chengyuToAnnotate.length ? chengyuToAnnotate.map(w => `
    <div class="word-card">
      <div class="w"><span class="w-text">${w}</span></div>
      <div class="d">${escHtml(chengyuDefs[w] || '加载中...')}</div>
    </div>
  `).join('') : '<p style="color:var(--stone)">本篇未发现成语</p>';

  // 金句摘录 - 完整长句
  const highlightsHTML = highlights.length ? highlights.map(h => `
    <div class="golden-item">
      <span class="g-type">${esc(h.type || '引用')}</span>
      <div class="g-text">${esc(h.text)}</div>
    </div>
  `).join('') : '<p style="color:var(--stone)">暂无金句摘录</p>';

  return htmlResponse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>
(function(){
  try{
    var t=localStorage.getItem('shenlun-theme');
    if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-theme',t);
    var syncIcon=function(){var b=document.querySelector('.theme-toggle');if(b)b.textContent=(document.documentElement.getAttribute('data-theme')==='dark')?'☀️':'🌙';};
    window.toggleTheme=function(){var c=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',c);try{localStorage.setItem('shenlun-theme',c);}catch(e){}syncIcon();};
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',syncIcon);}else{syncIcon();}
  }catch(e){}
})();
</script>
<title>${esc(article.title || '')} · 申论议论文</title>
<meta name="theme-color" content="${cfg.color}">
<style>${BASE_CSS}</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="site-brand">
      <span class="brand-seal">申论</span>
      <span class="brand-text">
        <span class="brand-title">申论议论文</span>
        <span class="brand-sub">每日精选 · 人民网观点</span>
      </span>
    </a>
    <nav class="nav-links">
      <a href="/">今日</a>
      <a href="/archive">归档</a>
      <a href="/phrases">好词金句</a>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="切换日/夜读模式">🌙</button>
    </nav>
  </div>
</header>
<main class="article-page">
  <a class="article-back" href="/">← 返回今日</a>
  <article>
    <div class="article-header">
      <div class="article-meta-row">
        <span class="cat-badge-large" style="background:${cfg.color}">${esc(cfg.label)}</span>
        ${article.column_name ? `<span style="font-size:.875rem;color:var(--steel)">栏目：${esc(article.column_name)}</span>` : ''}
      </div>
      <h1 class="article-title">${esc(article.title || '')}</h1>
      <div class="article-meta">
        ${article.author ? `<span>👤 ${esc(article.author)}</span>` : ''}
        ${article.pub_date ? `<span>📅 ${esc(article.pub_date)}</span>` : ''}
        ${article.url ? `<a href="${esc(article.url)}" target="_blank" rel="noopener">🔗 阅读原文</a>` : ''}
        <span style="color:var(--muted)">悬停黄色虚线查看成语释义</span>
      </div>
    </div>

    <div class="article-body">${bodyHTML}</div>

    <div class="extras-section">
      <div class="extras-tabs">
        <div class="extras-tab active" data-tab="phrases">📝 关键词 (${chengyuToAnnotate.length})</div>
        <div class="extras-tab" data-tab="golden">✨ 金句摘录 (${highlights.length})</div>
      </div>
      <div class="extras-content">
        <div class="extras-panel active" data-tab="phrases">
          <div class="words-grid">${wordsHTML}</div>
        </div>
        <div class="extras-panel" data-tab="golden">
          <div class="golden-list">${highlightsHTML}</div>
        </div>
      </div>
    </div>
  </article>
</main>
<footer class="site-footer">
  <div class="footer-brand">申论议论文 · 每日精选</div>
  <div>来源：人民网 · 观点频道 ｜ 仅供学习使用</div>
</footer>
<script>${BASE_JS}</script>
</body>
</html>`);
}

async function serveArchivePage(env) {
  const manifest = await env.ARTICLES.get('manifest', 'json') || {};
  const dates = Object.keys(manifest).sort().reverse();
  const totalArticles = Object.values(manifest).reduce((a, b) => a + b, 0);

  const groups = {};
  dates.forEach(slug => {
    const [y, m] = slug.split('-');
    const ym = y + '-' + m;
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push({ slug, count: manifest[slug] });
  });

  const sections = Object.entries(groups).map(([ym, items]) => {
    const y = ym.split('-')[0];
    if (!groups._years) groups._years = {};
    if (!groups._years[y]) groups._years[y] = [];
    groups._years[y].push({ ym, items });
    return null;
  });

  // 预加载每天的文章数据（用于归档页展开）
  const daysData = {};
  for (const slug of dates) {
    const dayArticles = await env.ARTICLES.get(`articles/${slug}`, 'json');
    if (dayArticles) daysData[slug] = dayArticles;
  }

  const years = groups._years || {};
  const sectionsHTML = Object.entries(years).sort((a,b) => b[0]-a[0]).map(([year, months]) => `
    <div style="margin-bottom:32px">
      <h3 style="font-size:1.5rem;font-weight:600;color:var(--primary);margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--primary-light)">${year} 年</h3>
      ${months.sort((a,b) => b.ym.localeCompare(a.ym)).map(m => `
        <div style="margin-bottom:20px">
          <h4 style="font-size:1rem;font-weight:600;color:var(--slate);margin-bottom:10px">${m.ym.split('-')[1]} 月</h4>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${m.items.sort((a,b) => b.slug.localeCompare(a.slug)).map(d => `
              <button class="date-card" data-date="${d.slug}" onclick="toggleDay('${d.slug}')" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;padding:12px 16px;border-radius:var(--radius);border:1px solid var(--hairline);background:var(--canvas);color:var(--ink);min-width:64px;transition:all .18s;font-family:inherit">
                <span style="font-size:1.5rem;font-weight:700;line-height:1.2">${d.slug.split('-')[2]}</span>
                <span style="font-size:.75rem;color:var(--stone);margin-top:2px">${d.count} 篇</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  return htmlResponse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>
(function(){
  try{
    var t=localStorage.getItem('shenlun-theme');
    if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-theme',t);
    var syncIcon=function(){var b=document.querySelector('.theme-toggle');if(b)b.textContent=(document.documentElement.getAttribute('data-theme')==='dark')?'☀️':'🌙';};
    window.toggleTheme=function(){var c=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',c);try{localStorage.setItem('shenlun-theme',c);}catch(e){}syncIcon();};
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',syncIcon);}else{syncIcon();}
  }catch(e){}
})();
</script>
<title>归档 · 申论议论文</title>
<style>${BASE_CSS}</style>
<style>
.date-card:hover{border-color:var(--primary)!important;background:var(--surface-hover)!important;transform:translateY(-1px)}
.date-card.active{border-color:var(--primary)!important;background:var(--primary-light)!important;color:var(--primary)!important}
.day-detail{max-height:0;overflow:hidden;transition:max-height .35s ease,opacity .25s ease;opacity:0}
.day-detail.open{max-height:3000px;opacity:1}
.day-detail .articles-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:16px}
@media(max-width:520px){.day-detail .articles-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="site-brand">
      <span class="brand-seal">申论</span>
      <span class="brand-text">
        <span class="brand-title">申论议论文</span>
        <span class="brand-sub">每日精选 · 人民网观点</span>
      </span>
    </a>
    <nav class="nav-links"><a href="/">今日</a><a href="/archive" class="active">归档</a><a href="/phrases">好词金句</a><button class="theme-toggle" onclick="toggleTheme()" aria-label="切换日/夜读模式">🌙</button></nav>
  </div>
</header>
<main class="main-content">
  <h1 class="page-title">📚 文章归档</h1>
  <p class="page-sub">共 ${dates.length} 天 · ${totalArticles} 篇文章</p>
  ${sectionsHTML || '<p style="text-align:center;color:var(--stone);padding:60px">归档为空</p>'}
  <div id="dayDetailContainer"></div>
</main>
<footer class="site-footer"><div class="footer-brand">申论议论文 · 每日精选</div><div>来源：人民网 · 观点频道</div></footer>
<script>
var DAYS_DATA = ${JSON.stringify(daysData)};
var CAT_CFG = ${JSON.stringify(CAT_CONFIG)};
var openDay = null;
function toggleDay(slug) {
  var el = document.getElementById('detail-'+slug);
  var btn = document.querySelector('[data-date="'+slug+'"]');
  if(openDay && openDay !== slug) {
    var prev = document.getElementById('detail-'+openDay);
    var prevBtn = document.querySelector('[data-date="'+openDay+'"]');
    if(prev){prev.classList.remove('open');prev.style.display='none';}
    if(prevBtn) prevBtn.classList.remove('active');
  }
  if(!el) {
    el = document.createElement('div');
    el.id = 'detail-'+slug;
    el.className = 'day-detail';
    var data = DAYS_DATA[slug];
    var html = '<div class="articles-grid">';
    if(data) {
      Object.entries(data).forEach(function(e){
        var cat=e[0], art=e[1];
        var cfg=CAT_CFG[cat]||{label:cat,color:'#666'};
        var excerpt=(art.content||'').replace(/\\s+/g,'').slice(0,80);
        html+='<a class="article-card" href="/article/'+slug+'/'+cat+'" style="text-decoration:none;color:inherit;display:block"><div class="card-top-bar" style="background:'+cfg.color+'"></div><div class="card-body"><div class="card-category" style="color:'+cfg.color+'">'+cfg.label+'</div><h3 class="card-title">'+escH(art.title||'')+'</h3><p class="card-excerpt">'+escH(excerpt)+'</p></div><div class="card-footer">'+((art.phrases||[]).length?'<span class="badge">📝 '+(art.phrases||[]).length+' 好词</span>':'')+((art.highlights||[]).length?'<span class="badge">✨ '+(art.highlights||[]).length+' 金句</span>':'')+(art.pub_date?'<span>'+art.pub_date+'</span>':'')+'</div></a>';
      });
    } else { html='<p style="text-align:center;color:var(--stone);padding:30px">该日数据不可用</p>'; }
    html+='</div>';
    el.innerHTML = html;
    document.getElementById('dayDetailContainer').appendChild(el);
    // trigger reflow then animate
    void el.offsetHeight;
  }
  var isOpen = el.classList.contains('open');
  if(isOpen) {
    el.classList.remove('open');
    btn.classList.remove('active');
    setTimeout(function(){el.style.display='none';},350);
    openDay = null;
  } else {
    el.style.display='block';
    void el.offsetHeight;
    el.classList.add('open');
    btn.classList.add('active');
    openDay = slug;
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function escH(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
</script>
</body>
</html>`);
}

async function servePhrasesPage(env) {
  const manifest = await env.ARTICLES.get('manifest', 'json') || {};
  const dates = Object.keys(manifest);

  const allWords = {};
  const allHighlights = {};

  for (const date of dates) {
    const articles = await env.ARTICLES.get(`articles/${date}`, 'json');
    if (!articles) continue;
    for (const [cat, art] of Object.entries(articles)) {
      const cfg = CAT_CONFIG[cat] || { label: cat };
      // 从内容里提取所有出现的成语
      const chengyu = findChengyuInText(art.content || '');
      chengyu.forEach(w => {
        if (!allWords[w]) allWords[w] = { count: 0, cats: new Set() };
        allWords[w].count++;
        allWords[w].cats.add(cfg.label);
      });
      (art.highlights || []).forEach(h => {
        const key = h.text;
        if (!allHighlights[key]) allHighlights[key] = { count: 0, type: h.type, cats: new Set() };
        allHighlights[key].count++;
        allHighlights[key].cats.add(cfg.label);
      });
    }
  }

  const sortedWords = Object.entries(allWords).sort((a, b) => b[1].count - a[1].count);
  // 加载全部成语释义（分批，避免超时）
  const allWordList = sortedWords.map(([w]) => w);
  // 页面渲染只取本地字典 + KV 缓存的释义，缺失的由前端“查看释义”按需拉取，避免请求内串行 API 超时
  const wordDefs = await loadChengyuDefs(env, allWordList, true);

  // 成语卡片 JSON（供前端翻页）
  const wordsJSON = sortedWords.map(([w, info]) => ({
    w, c: info.count, d: wordDefs[w] || '加载中...', cats: [...info.cats]
  }));

  // 金句卡片 JSON
  const goldenJSON = Object.entries(allHighlights).sort((a, b) => b[1].count - a[1].count)
    .map(([text, info]) => ({ t: text, c: info.count, type: info.type, cats: [...info.cats] }));

  return htmlResponse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>
(function(){
  try{
    var t=localStorage.getItem('shenlun-theme');
    if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-theme',t);
    var syncIcon=function(){var b=document.querySelector('.theme-toggle');if(b)b.textContent=(document.documentElement.getAttribute('data-theme')==='dark')?'☀️':'🌙';};
    window.toggleTheme=function(){var c=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',c);try{localStorage.setItem('shenlun-theme',c);}catch(e){}syncIcon();};
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',syncIcon);}else{syncIcon();}
  }catch(e){}
})();
</script>
<title>好词金句 · 申论议论文</title>
<style>${BASE_CSS}</style>
<style>
/* ── 好词金句库专用样式 ── */
.phrase-lib{max-width:var(--content-width);margin:0 auto}

/* Tab 栏 */
.lib-tabs{display:flex;gap:0;border-bottom:2px solid var(--hairline-strong);margin-bottom:24px}
.lib-tab{flex:1;text-align:center;padding:14px 20px;font-size:1rem;font-weight:600;color:var(--slate);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all var(--duration) var(--ease);font-family:var(--serif);letter-spacing:.5px}
.lib-tab:hover{color:var(--ink);background:var(--surface-soft)}
.lib-tab.active{color:var(--seal);border-bottom-color:var(--seal)}
.lib-tab .tab-count{display:inline-block;font-size:.75rem;font-weight:400;color:var(--stone);margin-left:6px;padding:1px 8px;border-radius:var(--radius-full);background:var(--surface)}

/* 统计栏 */
.lib-stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;padding:14px 18px;background:var(--canvas);border-radius:var(--radius);border:1px solid var(--hairline-soft);font-size:.85rem;color:var(--slate)}
.lib-stats strong{color:var(--ink);font-weight:600}

/* 翻页控件 */
.pager{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding:10px 0;border-bottom:1px solid var(--hairline-soft)}
.pager-info{font-size:.85rem;color:var(--stone)}
.pager-info em{color:var(--seal);font-style:normal;font-weight:600}
.pager-btns{display:flex;gap:4px}
.pager-btn{padding:6px 14px;border-radius:var(--radius-sm);border:1px solid var(--hairline);background:var(--canvas);color:var(--slate);font-size:.85rem;font-weight:500;cursor:pointer;transition:all var(--duration) var(--ease)}
.pager-btn:hover:not(:disabled){border-color:var(--seal);color:var(--seal);background:var(--seal-soft)}
.pager-btn:disabled{opacity:.35;cursor:not-allowed}
.pager-btn.active{background:var(--seal);color:#fff;border-color:var(--seal)}

/* 成语卡片（紧凑版） */
.idiom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.idiom-card{background:var(--canvas);border-radius:var(--radius);border:1px solid var(--hairline-soft);padding:14px 16px;transition:all .15s var(--ease);cursor:default;display:flex;flex-direction:column;gap:6px}
.idiom-card:hover{border-color:var(--hairline-strong);box-shadow:var(--shadow-sm);transform:translateY(-1px)}
.idiom-card .ic-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.idiom-card .ic-word{font-size:1.05rem;font-weight:700;color:var(--ink);font-family:var(--serif)}
.idiom-card .ic-badge{font-size:.72rem;font-weight:500;color:var(--seal);background:var(--seal-soft);padding:2px 9px;border-radius:var(--radius-full);white-space:nowrap}
.idiom-card .ic-def{font-size:.8125rem;line-height:1.65;color:var(--slate)}
.idiom-card .ic-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:2px}
.idiom-card .ic-tag{font-size:.7rem;color:var(--steel);background:var(--surface-soft);padding:1px 7px;border-radius:4px}
.idiom-card .ic-more{margin-top:2px;align-self:flex-start;font-size:.78rem;font-weight:500;color:var(--seal);background:var(--seal-soft);border:1px solid transparent;padding:4px 12px;border-radius:var(--radius-full);cursor:pointer;transition:all var(--duration) var(--ease)}
.idiom-card .ic-more:hover:not(:disabled){border-color:var(--seal);background:var(--seal-soft)}
.idiom-card .ic-more:disabled{opacity:.6;cursor:default}

/* 金句卡片（紧凑版） */
.golden-grid{display:flex;flex-direction:column;gap:10px}
.golden-card{background:var(--gold-bg);border-radius:var(--radius);border-left:3px solid var(--gold);padding:14px 18px;transition:all .15s var(--ease)}
.golden-card:hover{box-shadow:var(--shadow-sm);transform:translateX(2px)}
.golden-card .gc-meta{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.gc-type{font-size:.72rem;font-weight:600;color:var(--primary);background:var(--primary-light);padding:2px 9px;border-radius:var(--radius-full)}
.gc-count{font-size:.75rem;color:var(--stone)}
.gc-text{font-family:"FangSong","STFangsong","仿宋",var(--serif);font-size:.95rem;line-height:1.85;color:var(--ink)}
.gc-cats{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
.gc-cat{font-size:.7rem;color:var(--steel);background:var(--paper-3);padding:1px 7px;border-radius:4px}

/* 空状态 */
.lib-empty{text-align:center;padding:60px 20px;color:var(--stone);font-size:.95rem}
.lib-empty-icon{font-size:2.5rem;margin-bottom:12px;opacity:.5}

@media(max-width:640px){
  .idiom-grid{grid-template-columns:1fr}
  .lib-tabs{flex-wrap:wrap}
  .lib-tab{padding:12px 14px;font-size:.9rem}
  .pager{flex-direction:column;gap:8px;text-align:center}
}
</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="site-brand">
      <span class="brand-seal">申论</span>
      <span class="brand-text">
        <span class="brand-title">申论议论文</span>
        <span class="brand-sub">每日精选 · 人民网观点</span>
      </span>
    </a>
    <nav class="nav-links"><a href="/">今日</a><a href="/archive">归档</a><a href="/phrases" class="active">好词金句</a><button class="theme-toggle" onclick="toggleTheme()" aria-label="切换日/夜读模式">🌙</button></nav>
  </div>
</header>
<main class="main-content">
<div class="phrase-lib">
  <h1 class="page-title">📝 好词金句库</h1>
  <p class="page-sub">从 ${dates.length} 天文章中累积提取 · 点击切换分类 · 分页浏览</p>

  <!-- Tab 栏 -->
  <div class="lib-tabs">
    <div class="lib-tab active" data-lib="idiom" onclick="switchLib('idiom')">📖 成语词库 <span class="tab-count">${sortedWords.length} 条</span></div>
    <div class="lib-tab" data-lib="golden" onclick="switchLib('golden')">✨ 金句摘录 <span class="tab-count">${goldenJSON.length} 条</span></div>
  </div>

  <!-- 统计 -->
  <div class="lib-stats">
    <span>📅 数据来源：<strong>${dates.length}</strong> 天文章</span>
    <span>📖 成语总数：<strong>${sortedWords.length}</strong> 个</span>
    <span>✨ 金句总数：<strong>${goldenJSON.length}</strong> 条</span>
  </div>

  <!-- 成语面板 -->
  <div id="panelIdiom">
    <div class="pager" id="pagerIdiom">
      <div class="pager-info" id="infoIdiom"></div>
      <div class="pager-btns" id="btnsIdiom"></div>
    </div>
    <div class="idiom-grid" id="gridIdiom"></div>
  </div>

  <!-- 金句面板 -->
  <div id="panelGolden" style="display:none">
    <div class="pager" id="pagerGolden">
      <div class="pager-info" id="infoGolden"></div>
      <div class="pager-btns" id="btnsGolden"></div>
    </div>
    <div class="golden-grid" id="gridGolden"></div>
  </div>
</div>
</main>
<footer class="site-footer"><div class="footer-brand">申论议论文 · 每日精选</div><div>来源：人民网 · 观点频道</div></footer>

<script>
// ── 数据 ──
var WORDS_DATA = ${JSON.stringify(wordsJSON).replace(/</g,'\\u003c')};
var GOLDEN_DATA = ${JSON.stringify(goldenJSON).replace(/</g,'\\u003c')};
var PAGE_SIZE = 12;

// ── 状态 ──
var currentLib = 'idiom';
var idiomsPage = 1;
var goldenPage = 1;

function escH(s){return(s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escAttr(s){return(s==null?'':String(s)).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// 生成翻页按钮（窗口式：当前页始终可见，>7 页时首尾+省略号）
function buildPager(current, totalPages, goFn){
  var parts=[];
  parts.push('<button class="pager-btn" onclick="'+goFn+'('+(current-1)+')" '+(current<=1?'disabled':'')+'>◀ 上页</button>');
  if(totalPages<=7){
    for(var i=1;i<=totalPages;i++) parts.push('<button class="pager-btn'+(i===current?' active':'')+'" onclick="'+goFn+'('+i+')">'+i+'</button>');
  }else{
    var nums=[1];
    var start=Math.max(2,current-1), end=Math.min(totalPages-1,current+1);
    if(start>2) nums.push('...');
    for(var i=start;i<=end;i++) nums.push(i);
    if(end<totalPages-1) nums.push('...');
    nums.push(totalPages);
    nums.forEach(function(n){
      if(n==='...'){parts.push('<span style="color:var(--stone);padding:0 6px">…</span>');}
      else{parts.push('<button class="pager-btn'+(n===current?' active':'')+'" onclick="'+goFn+'('+n+')">'+n+'</button>');}
    });
  }
  parts.push('<button class="pager-btn" onclick="'+goFn+'('+(current+1)+')" '+(current>=totalPages?'disabled':'')+'>下页 ▶</button>');
  return parts.join('');
}

// ── 切换 Tab ──
function switchLib(lib){
  currentLib=lib;
  document.querySelectorAll('.lib-tab').forEach(function(t){t.classList.toggle('active',t.dataset.lib===lib);});
  document.getElementById('panelIdiom').style.display=(lib==='idiom')?'block':'none';
  document.getElementById('panelGolden').style.display=(lib==='golden')?'block':'none';
  if(lib==='idiom') renderIdioms();
  else renderGolden();
}

// ── 成语渲染 ──
function renderIdioms(){
  var data=WORDS_DATA;
  var total=data.length;
  var totalPages=Math.ceil(total/PAGE_SIZE)||1;
  if(idiomsPage>totalPages) idiomsPage=totalPages;
  if(idiomsPage<1) idiomsPage=1;
  var start=(idiomsPage-1)*PAGE_SIZE;
  var pageData=data.slice(start,start+PAGE_SIZE);

  // 翻页信息
  document.getElementById('infoIdiom').innerHTML='第 <em>'+idiomsPage+'</em> / '+totalPages+' 页，共 <em>'+total+'</em> 条';
  document.getElementById('btnsIdiom').innerHTML=buildPager(idiomsPage,totalPages,'goPage');

  // 卡片
  if(pageData.length===0){
    document.getElementById('gridIdiom').innerHTML='<div class="lib-empty"><div class="lib-empty-icon">📖</div>暂无成语数据</div>';
    return;
  }
  var html='';
  pageData.forEach(function(item){
    var defHtml = item.d
      ? '<div class="ic-def">'+escH(item.d)+'</div>'
      : '<button class="ic-more" data-w="'+escAttr(item.w)+'" onclick="loadDef(this)">查看释义 ▸</button>';
    html+='<div class="idiom-card"><div class="ic-head"><span class="ic-word">'+escH(item.w)+'</span><span class="ic-badge">×'+item.c+'</span></div>'+defHtml+'<div class="ic-tags">'+item.cats.map(function(c){return '<span class="ic-tag">'+escH(c)+'</span>';}).join('')+'</div></div>';
  });
  document.getElementById('gridIdiom').innerHTML=html;
}

function goPage(p){
  if(p<1) return;
  idiomsPage=p;
  renderIdioms();
  document.getElementById('panelIdiom').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── 金句渲染 ──
function renderGolden(){
  var data=GOLDEN_DATA;
  var total=data.length;
  var totalPages=Math.ceil(total/PAGE_SIZE)||1;
  if(goldenPage>totalPages) goldenPage=totalPages;
  if(goldenPage<1) goldenPage=1;
  var start=(goldenPage-1)*PAGE_SIZE;
  var pageData=data.slice(start,start+PAGE_SIZE);

  document.getElementById('infoGolden').innerHTML='第 <em>'+goldenPage+'</em> / '+totalPages+' 页，共 <em>'+total+'</em> 条';
  document.getElementById('btnsGolden').innerHTML=buildPager(goldenPage,totalPages,'goGPage');

  if(pageData.length===0){
    document.getElementById('gridGolden').innerHTML='<div class="lib-empty"><div class="lib-empty-icon">✨</div>暂无金句数据</div>';
    return;
  }
  var html='';
  pageData.forEach(function(item){
    html+='<div class="golden-card"><div class="gc-meta"><span class="gc-type">'+escH(item.type||'引用')+'</span><span class="gc-count">×'+item.c+'</span></div><div class="gc-text">'+escH(item.t)+'</div><div class="gc-cats">'+item.cats.map(function(c){return '<span class="gc-cat">'+escH(c)+'</span>';}).join('')+'</div></div>';
  });
  document.getElementById('gridGolden').innerHTML=html;
}

function goGPage(p){
  if(p<1) return;
  goldenPage=p;
  renderGolden();
  document.getElementById('panelGolden').scrollIntoView({behavior:'smooth',block:'start'});
}

// 点击“查看释义”按需从 /api/idiom 拉取并替换按钮
function loadDef(btn){
  var w=btn.getAttribute('data-w');
  if(!w) return;
  btn.disabled=true; btn.textContent='加载中…';
  fetch('/api/idiom/'+encodeURIComponent(w)).then(function(r){return r.json();}).then(function(j){
    var def=(j&&j.def)?j.def:'(暂无释义)';
    var div=document.createElement('div');
    div.className='ic-def';
    div.textContent=def;
    if(btn.parentNode) btn.parentNode.replaceChild(div,btn);
  }).catch(function(){
    btn.disabled=false; btn.textContent='加载失败，点击重试';
  });
}

// ── 初始化 ──
renderIdioms();
renderGolden();
</script>
</body>
</html>`);
}

function htmlResponse(html) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    }
  });
}
