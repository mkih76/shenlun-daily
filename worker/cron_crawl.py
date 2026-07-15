#!/usr/bin/env python3
"""
VPS 端每日抓取脚本
- 抓取人民网 8 个栏目，质量评分选优
- 写入 CF KV
- 调 CF Workers AI 生成成语释义

VPS 上添加 cron（凭据放在脚本同目录的 .env 中，见 .env.example）:
  crontab -e
  0 8 * * * /usr/bin/python3 /opt/shenlun/cron_crawl.py >> /var/log/shenlun-cron.log 2>&1

  在 /opt/shenlun/.env 中填入：
  CF_API_TOKEN=xxx
  CF_ACCOUNT_ID=xxx
  CF_KV_NAMESPACE_ID=xxx
  SILICONFLOW_API_KEY=xxx
"""

import os, sys, time, re, json, urllib.request, urllib.parse
import io
# Force UTF-8 stdout
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from datetime import datetime, timezone, timedelta

# ── 自动加载同目录 .env（cron 环境默认没有用户环境变量，避免凭据为空导致写 KV 失败）──
def load_dotenv(path=None):
    if path is None:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(path):
        return False
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v
    return True

load_dotenv()

# ── 配置（敏感凭据从环境变量 / 同目录 .env 读取，切勿硬编码进仓库）──
CF_API_BASE = "https://api.cloudflare.com/client/v4"
CF_TOKEN = os.environ.get("CF_API_TOKEN", "")
CF_ACCOUNT = os.environ.get("CF_ACCOUNT_ID", "")
CF_KV_NS = os.environ.get("CF_KV_NAMESPACE_ID", "")
# 成语释义已改用硅基流动 API（见下方 SF_API_KEY），不再使用 Workers AI

CATEGORIES = {
    '作风类': {'label': '工作作风', 'color': '#C00000', 'url': 'http://opinion.people.com.cn/GB/8213/49160/457596/index.html'},
    '党建类': {'label': '党的建设', 'color': '#8B0000', 'url': 'http://opinion.people.com.cn/GB/8213/49160/49217/index.html'},
    '经济类': {'label': '经济建设', 'color': '#0070C0', 'url': 'http://opinion.people.com.cn/GB/8213/49160/461970/index.html'},
    '科技类': {'label': '科技创新', 'color': '#7030A0', 'url': 'http://opinion.people.com.cn/GB/51854/index.html'},
    '民生类': {'label': '民生保障', 'color': '#00884A', 'url': 'http://opinion.people.com.cn/GB/51863/index.html'},
    '生态类': {'label': '生态文明', 'color': '#385723', 'url': 'http://opinion.people.com.cn/GB/223228/index.html'},
    '文化类': {'label': '文化建设', 'color': '#B8860B', 'url': 'http://opinion.people.com.cn/GB/364183/index.html'},
    '治理类': {'label': '社会治理', 'color': '#404040', 'url': 'http://opinion.people.com.cn/GB/8213/49160/461964/index.html'},
}

AUTHOR_SCORES = {
    '社论':10,'任仲平':10,'任平':9,'仲音':9,'本报评论员':8,'人民日报评论员':8,
    '人民论坛':7,'人民时评':7,'评论员观察':7,'人民观点':7,'人民锐评':6,
    '人民网评':6,'望海楼':6,'今日谈':5,'金台随笔':5,'暖闻热评':5,
    '每周经济评论':5,'纵横':4,'来论':3,
}

CAT_KEYWORDS = {
    '作风类':['作风','落实','担当','实干','服务','为民','初心','使命','责任','奋斗'],
    '党建类':['党','纪律','反腐','从严治党','廉洁','自我革命','政治','组织','干部','监督'],
    '经济类':['经济','产业','发展','市场','金融','企业','消费','投资','贸易','创新'],
    '科技类':['科技','创新','数字','人工智能','研发','技术','人才','攻关','自主','前沿'],
    '民生类':['民生','就业','教育','医疗','养老','住房','保障','收入','福利','健康'],
    '生态类':['生态','绿色','环境','碳','能源','污染','保护','气候','低碳','可持续'],
    '文化类':['文化','文明','传统','思想','精神','价值','文艺','遗产','传播','自信'],
    '治理类':['治理','法治','安全','社会','基层','制度','体系','改革','管理','公共'],
}

CHENGYU_LIST = {
    '标本兼治','顶层设计','中国式现代化','高质量发展','共同富裕','新质生产力',
    '全过程人民民主','自我革命','以人民为中心','全面从严治党','共建共治共享','一带一路',
    '驰而不息','久久为功','踏石留印','抓铁有痕','求真务实','真抓实干',
    '身体力行','率先垂范','一以贯之','徙木立信','循序渐进','稳中求进',
    '行稳致远','提质增效','转型升级','以文化人','潜移默化','润物无声',
    '春风化雨','兼收并蓄','博采众长','古为今用','推陈出新','统筹兼顾',
    '系统思维','辩证思维','底线思维','迎难而上','攻坚克难','踔厉奋发',
    '锲而不舍','善作善成','善始善终','落地见效','开花结果','多点突破',
    '纵深推进','守土有责','守土尽责','敢于担当','打虎拍蝇','风腐交织',
    '由风及腐','防微杜渐','警钟长鸣','源远流长','博大精深','薪火相传',
    '与时俱进','自立自强','自主创新','开放合作','勇攀高峰','敢为人先',
    '毋庸置疑','显而易见','知行合一','扎实推进','稳步推进','取得实效',
    '啃硬骨头','同向发力','同频共振','重点突破','以点带面','压茬推进',
    '稳中向好','稳中有进','降本增效','问计于民','调查研究',
    '四个意识','四个自信','两个维护','两个确立','不敢腐','不能腐','不想腐',
}

POLICY_TERMS = ['中国式现代化','高质量发展','共同富裕','乡村振兴','新质生产力','全过程人民民主','自我革命','以人民为中心','全面从严治党','标本兼治','顶层设计','制度型开放','获得感幸福感安全感','创造性转化创新性发展','百年未有之大变局','人类命运共同体','一带一路','不敢腐不能腐不想腐','共建共治共享','四个意识','四个自信','两个维护','两个确立']


# ── CF KV helpers ──
def kv_put(key, value, ttl=None):
    url = f'{CF_API_BASE}/accounts/{CF_ACCOUNT}/storage/kv/namespaces/{CF_KV_NS}/values/{urllib.parse.quote(key, safe="")}'
    headers = {'Authorization': f'Bearer {CF_TOKEN}'}
    if ttl: headers['Expiration-TTL'] = str(ttl)
    body = value if isinstance(value, (str, bytes)) else json.dumps(value, ensure_ascii=False)
    req = urllib.request.Request(url, data=body.encode('utf-8'), headers=headers, method='PUT')
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status == 200


def kv_get(key):
    url = f'{CF_API_BASE}/accounts/{CF_ACCOUNT}/storage/kv/namespaces/{CF_KV_NS}/values/{urllib.parse.quote(key, safe="")}'
    headers = {'Authorization': f'Bearer {CF_TOKEN}'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read().decode('utf-8')
    except:
        return None


# ── 硅基流动 API 释义（Key 从环境变量 SILICONFLOW_API_KEY 读取）──
SF_API_KEY = os.environ.get("SILICONFLOW_API_KEY", "")

def ai_define_chengyu(word):
    """硅基流动 Qwen2.5-7B 生成释义"""
    try:
        body = json.dumps({
            'model': 'Qwen/Qwen2.5-7B-Instruct',
            'messages': [
                {'role': 'system', 'content': '仅输出60字内中文释义，不要前缀。'},
                {'role': 'user', 'content': '请解释：' + word}
            ],
            'max_tokens': 100,
            'temperature': 0.3
        }, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(
            'https://api.siliconflow.cn/v1/chat/completions',
            data=body,
            headers={'Authorization': 'Bearer ' + SF_API_KEY, 'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode('utf-8', errors='replace'))
            return data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()[:200]
    except Exception:
        return None


# 兜底字典: 100+ 高频成语
CHENGYU_FALLBACK = {
    '标本兼治': '既解决表层问题，又解决根源问题，通过加强制度建设和思想教育，从根本上消除问题产生的土壤和条件。',
    '久久为功': '持之以恒、锲而不舍，长期坚持做事方能见到成效。',
    '驰而不息': '形容马不停蹄、持续不断，强调长期坚持而不松懈。',
    '一以贯之': '用同一个道理贯穿始终，强调政策的连续性和稳定性。',
    '徙木立信': '商鞅立木为信以取信于民，比喻说到做到、言而有信。',
    '循序渐进': '按照一定的步骤逐渐深入或提高。',
    '稳中求进': '在稳定的基础上谋求发展，是我国经济工作总基调。',
    '提质增效': '提升质量、增加效益，是高质量发展的核心要求。',
    '推陈出新': '剔除旧的，创造新的，含有所继承的基础上有所创新之意。',
    '统筹兼顾': '统一筹划、照顾各方面，强调全面协调、整体推进。',
    '系统思维': '从系统整体出发，着眼于要素与要素、整体与部分、结构与功能的关系。',
    '底线思维': '凡事从最坏处准备，努力争取最好的结果，做到有备无患。',
    '迎难而上': '面对困难奋勇向前，不畏缩。',
    '攻坚克难': '攻克堡垒、战胜困难。',
    '锲而不舍': '不停地刻镂，比喻有恒心、有毅力，坚持不懈。',
    '善作善成': '善于做、善于完成，强调做事的主动性和成效。',
    '落地见效': '措施、政策得到实际执行并产生效果。',
    '敢于担当': '勇于承担责任、不回避矛盾。',
    '防微杜渐': '在错误或坏事尚萌芽时就加以防止。',
    '与时俱进': '随着时代的发展而不断进步。',
    '源远流长': '源头很远，流程很长，比喻历史悠久。',
    '薪火相传': '比喻学问、技术或精神代代相传。',
    '自立自强': '依靠自身力量实现发展强盛。',
    '勇攀高峰': '勇敢地向最高点攀登，比喻追求卓越。',
    '敢为人先': '敢做别人没做过的事。',
    '显而易见': '明显地容易看清。',
    '知行合一': '认识与实践的统一。',
    '众志成城': '众人一心，像城墙一样坚固，比喻团结一致。',
    '革故鼎新': '去除旧的，建立新的。',
    '承前启后': '承接前代的，启发后代的。',
    '继往开来': '继承前人的事业，开辟未来的道路。',
    '博采众长': '广泛采纳众人的长处及各方面的优点。',
    '兼收并蓄': '把不同的内容兼收并蓄、广泛吸收。',
    '古为今用': '批判地继承古代文化遗产，使之成为今天有益的东西。',
    '潜移默化': '指人的思想或性格受环境影响而不知不觉地发生变化。',
    '润物无声': '形容潜移默化的良好影响。',
    '春风化雨': '比喻良好教育的普及和深入。',
    '戮力同心': '齐心合力，团结一致。',
    '笃行不怠': '坚持不懈地践行，不倦怠。',
    '踔厉奋发': '精神振奋、斗志昂扬地行动。',
    '真抓实干': '认真地、切实地开展实际工作，不搞花架子。',
    '身体力行': '亲身体验、努力实行，强调以身作则、率先垂范。',
    '以身作则': '用自己的行动作为榜样。',
    '率先垂范': '带头做、亲自做，为他人树立榜样。',
    '求真务实': '追求真理、讲求实效，强调一切从实际出发，实事求是。',
    '不驰于空想': '不沉溺于空洞的幻想。',
    '不骛于虚声': '不追求虚名浮誉。',
    '一抓到底': '从开始到结束一直坚持抓落实。',
    '常抓不懈': '长期持续地抓，不松懈。',
    '压茬推进': '前后接续、一茬接一茬地推进。',
    '绵绵用力': '持续不断地投入力量。',
    '行稳致远': '走得稳才能走得更远，强调平稳发展。',
    '稳字当头': '把稳定作为首要任务和前提。',
    '稳中向好': '在稳定中向好的方向发展。',
    '稳中有进': '在稳定的基础上有进步。',
    '一以贯之': '用同一个道理贯穿始终。',
    '不偏不倚': '不偏向任何一方，保持公正中立。',
    '相辅相成': '互相帮助，互相补充。',
    '相得益彰': '互相帮助、互相补充，更显所长。',
    '齐头并进': '几个方面同时并进。',
    '多点突破': '在多个方面、多个领域同时取得突破。',
    '整体推进': '从全局出发全面推进。',
    '协同推进': '多个方面协调配合共同推进。',
    '重点突破': '抓住关键问题取得突破。',
    '以点带面': '通过个别的、典型的事例带动全面的工作。',
    '同向发力': '朝着同一个方向共同努力。',
    '同频共振': '节奏一致、配合默契。',
    '整体推进': '从全局出发全面推进。',
    '走深走实': '深入推进、扎实落实。',
    '扎实推进': '稳扎稳打地推进工作。',
    '稳步推进': '按步骤、按计划有序推进。',
    '有序推进': '按顺序、有条理地推进。',
    '加快推进': '加快速度、加大力度推进。',
    '取得实效': '取得实际的效果和成绩。',
    '成效显著': '取得的成绩和效果十分明显。',
    '成效明显': '取得的效果比较明显。',
    '守土有责': '在自己的职责范围内守护、负责。',
    '守土担责': '勇于承担自己职责范围内的责任。',
    '守土尽责': '尽职尽责做好本职工作。',
    '挺身而出': '勇敢地站出来面对困难或危险。',
    '冲锋在前': '在战斗中冲在最前面，比喻带头做最难的工作。',
    '打虎拍蝇': '既坚决查处领导干部违纪违法案件，又切实解决发生在群众身边的不正之风。',
    '风腐交织': '不正之风和腐败问题相互交织、相互渗透。',
    '由风及腐': '由轻微的违反中央八项规定精神的行为，逐渐演变为腐败犯罪。',
    '不敢腐': '通过严厉惩治形成高压态势，让人不敢触碰腐败红线。',
    '不能腐': '通过完善制度、健全法治，让腐败行为无机可乘。',
    '不想腐': '通过加强教育、培育廉洁文化，从思想根源上消除腐败动机。',
    '中国式现代化': '中国共产党领导的社会主义现代化，具有人口规模巨大、全体人民共同富裕等五大特征。',
    '高质量发展': '体现新发展理念的发展，是创新成为第一动力、协调成为内生特点的发展。',
    '共同富裕': '全体人民通过辛勤劳动和相互帮助，普遍达到生活富裕富足。',
    '新质生产力': '以创新为主导，符合新发展理念的先进生产力质态。',
    '全过程人民民主': '我国社会主义民主政治的本质属性，是最广泛、最真实、最管用的民主。',
    '人类命运共同体': '各国相互依存、休戚与共，追求本国利益时兼顾他国合理关切。',
    '百年未有之大变局': '当今世界正经历新一轮大发展大变革大调整，国际力量对比深刻变化。',
    '顶层设计': '从最高层次上对系统进行整体规划，明确目标、战略、路径。',
    '以人民为中心': '坚持人民主体地位，把人民对美好生活的向往作为奋斗目标。',
    '全面从严治党': '新时代党的建设总要求，覆盖党的政治建设、思想建设等全方位。',
    '一带一路': '丝绸之路经济带和21世纪海上丝绸之路，旨在促进沿线各国政策沟通、设施联通等。',
    '自我革命': '中国共产党坚持党要管党、全面从严治党，以伟大自我革命引领伟大社会革命。',
    '制度型开放': '从商品和要素流动型开放转向规则、规制、管理、标准等制度型开放。',
    '共建共治共享': '社会治理格局中，政府主导、社会协同、公众参与。',
    '创造性转化': '按照时代特点和要求，对传统文化中仍有借鉴价值的内涵加以改造。',
    '创新性发展': '按照时代的新进步新发展，对中华优秀传统文化的内涵加以补充、拓展、完善。',
    '四个意识': '政治意识、大局意识、核心意识、看齐意识。',
    '四个自信': '道路自信、理论自信、制度自信、文化自信。',
    '两个维护': '坚决维护习近平总书记党中央的核心、全党的核心地位，坚决维护党中央权威。',
    '两个确立': '确立习近平同志党中央的核心、全党的核心地位，确立习近平新时代中国特色社会主义思想的指导地位。',
    '八项规定': '中央政治局关于改进工作作风、密切联系群众的八项规定。',
    '众力': '众人的力量。',
}


# ── HTTP fetch ──
def fetch(url):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'zh-CN,zh;q=0.9',
        })
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read()
            ct = r.headers.get('Content-Type', '').lower()
            enc = 'utf-8' if 'utf-8' in ct else 'GB18030'
            try:
                text = body.decode(enc)
                if not re.search(r'[\u4e00-\u9fa5]{3}', text[:200]):
                    text = body.decode('utf-8')
                return text
            except:
                return body.decode('utf-8', errors='replace')
    except Exception as e:
        return None


# ── Article parsing ──
def extract_article_links(html):
    links, seen = [], set()
    for m in re.finditer(r"/n1/\d{4}/\d{4}/c\d+-\d+\.html", html):
        path = m[0]
        if path in seen: continue
        after = html[m.end():m.end()+120]
        tm = re.search(r'>([^<]{8,60})</a>', after)
        if not tm: continue
        title = tm[1].strip()
        if len(title) < 6: continue
        year, mmdd = re.search(r"/n1/(\d{4})/(\d{4})/", path).groups()
        date_str = f'{year}-{mmdd[:2]}-{mmdd[2:]}'
        url = f'http://opinion.people.com.cn{path}'
        seen.add(path)
        links.append({'url': url, 'title_hint': title, 'date_str': date_str})
    return sorted(links, key=lambda x: x['date_str'], reverse=True)


def extract_article(html, url):
    title = ''
    m = re.search(r'<h1[^>]*>([^<]{4,60})</h1>', html, re.I)
    if m: title = m[1].strip()
    if not title or not re.search(r'[\u4e00-\u9fa5]', title):
        m = re.search(r'<title>([^<]+)</title>', html, re.I)
        if m:
            title = re.sub(r'[_\-\s]+—.*$', '', m[1]).strip().replace('--', ' ').strip()

    content = ''
    for pat in [
        r'<div[^>]*id=["\']rm_txt_zw["\'][^>]*>(.+?)</div>\s*</div>\s*</div>',
        r'<div[^>]*class=["\']rm_txt_con[^"\']*["\'][^>]*>(.+?)</div>\s*</div>\s*</div>',
        r'<div[^>]*class=["\']rm_txt["\'][^>]*>(.+?)</div>\s*</div>\s*</div>',
        r'<div[^>]*id=["\']ozoom["\'][^>]*>(.+?)</div>\s*</div>\s*</div>',
    ]:
        m = re.search(pat, html, re.I | re.DOTALL)
        if m:
            paras = []
            for pm in re.finditer(r'<p[^>]*>\s*(.+?)\s*</p>', m[1], re.I | re.DOTALL):
                t = re.sub(r'<[^>]+>', '', pm[1]).strip()
                if t and len(t) >= 4 and not re.match(r'^(订阅|收藏|小字号|大字号|客户端下载|分享|热门排行|人民网)', t):
                    paras.append(t)
            while paras and re.search(r'《\s*人民日报\s*》|热门排行|客户端下载', paras[-1]):
                paras.pop()
            content = '\n\n'.join(paras)
            break

    pub_date = ''
    m = re.search(r'(\d{4})年(\d{2})月(\d{2})日', content)
    if m: pub_date = f'{m[1]}-{m[2]}-{m[3]}'

    return {'title': title, 'pub_date': pub_date, 'url': url, 'content': content}


def extract_column_info(html):
    for name in sorted(AUTHOR_SCORES.keys(), key=lambda x: -len(x)):
        if name in html:
            return name
    return ''


# ── Quality scoring ──
def find_chengyu(text):
    if not text: return []
    found, seen = [], set()
    for m in re.finditer(r'[\u4e00-\u9fa5]{4}', text):
        if m[0] in CHENGYU_LIST and m[0] not in seen:
            seen.add(m[0])
            found.append(m[0])
    return found


def extract_phrases(text):
    if not text: return []
    words = set()
    for w in find_chengyu(text): words.add(w)
    for term in POLICY_TERMS:
        if term in text: words.add(term)
    return list(words)[:25]


def extract_highlights(text):
    if not text: return []
    seen, results = set(), []

    def add(s, t):
        s = s.strip().rstrip('，。！？；：、')
        if not s or len(s) < 12 or len(s) > 200 or s in seen: return
        if re.search(r'\d{4}年\d{1,2}月|https?://', s): return
        if len(re.findall(r'[A-Za-z0-9]', s)) > 5: return
        seen.add(s)
        results.append({'text': s, 'type': t})

    for m in re.finditer(r'[「""]([^「」""]{15,180})[」""]', text): add(m[1], '引用')
    for m in re.finditer(r'([^。！\n]{6,30}[、，][^。！\n]{6,30}[、，][^。！\n]{6,30})[。！]', text):
        if (m[1].count('、') + m[1].count('，')) >= 2: add(m[1], '排比')
    for m in re.finditer(r'([^。]{8,40}(?:不是|不仅是)[^，]{4,30}，?(?:而是|而且|更是)[^。]{6,40})', text): add(m[1], '对比句式')
    for m in re.finditer(r'(习近平(?:总书记|主席|强调|指出)[\u4e00-\u9fa5、，：""]+?[。！])', text):
        add(m[1].rstrip('。！'), '领导语录')
    for m in re.finditer(r'([^。\n]{12,80}[。])', text):
        if re.search(r'(关键在|根本是|本质是|必然要求|根本保证|力量源泉|力量所在|方向所在|最大优势)', m[1]):
            add(m[1], '警句')
    for p in text.split('\n\n'):
        for s in p.split('[。！？]')[:2]:
            st = s.strip()
            if 15 <= len(st) <= 100 and re.search(r'(人民|发展|建设|改革|创新|治理|服务|保障|推进|完善|加强|深化|坚持|推动|贯彻|落实|提高|提升|维护|促进|实现|高质量|现代化|复兴|强国|福祉|利益|权益|美好|向往)', st):
                add(st, '论述')
    return results[:8]


def score_article(article, cat_key, col_name):
    score = 0
    author_s = AUTHOR_SCORES.get(col_name, 1)
    score += author_s * 3
    cl = len(article.get('content', ''))
    if cl >= 500: score += 3
    if cl >= 1000: score += 5
    if cl >= 1500: score += 4
    if cl >= 2000: score += 3
    if cl >= 3000: score -= 2
    if cl >= 5000: score -= 5
    cy_count = len(find_chengyu(article.get('content', '')))
    idiom_s = min((cy_count / max(cl, 1)) * 1000 * 3, 15)
    score += idiom_s
    quote_count = len(re.findall(r'[「""]', article.get('content', ''))) // 2
    score += min(quote_count * 2, 10)
    title = article.get('title', '')
    keywords = CAT_KEYWORDS.get(cat_key, [])
    kw_matches = sum(1 for kw in keywords if kw in article.get('content', '') or kw in title)
    score += min(kw_matches * 2, 20)
    today = datetime.now().strftime('%Y-%m-%d')
    if article.get('pub_date') == today: score += 5
    return score


# ── 归档补位: 整栏抓取失败时, 取该栏目最近一次的历史文章 ──
def get_last_article_for_cat(cat):
    try:
        man_raw = kv_get('manifest')
        dates = json.loads(man_raw).keys() if man_raw else []
    except Exception:
        dates = []
    for d in sorted(dates, reverse=True):
        try:
            ad = json.loads(kv_get(f'articles/{d}') or '{}')
        except Exception:
            continue
        if cat in ad and ad[cat].get('title'):
            return ad[cat], d
    return None, None


# ── Main ──
def main():
    print(f'[{datetime.now().isoformat()}] Starting daily crawl...')
    if not CF_TOKEN or not CF_ACCOUNT or not CF_KV_NS:
        print('[FATAL] CF_API_TOKEN / CF_ACCOUNT_ID / CF_KV_NAMESPACE_ID 未配置（环境变量为空且未在脚本同目录找到 .env）。')
        print('        请创建 /opt/shenlun/.env 并填入上述变量后重试。脚本已退出。')
        sys.exit(1)

    # Load seen URLs
    seen_raw = kv_get('seen_urls')
    seen = set()
    if seen_raw:
        try:
            seen = set(json.loads(seen_raw).get('urls', []))
        except: pass
    print(f'Loaded {len(seen)} seen URLs')

    # Load yesterday article URLs to prevent re-selecting same articles
    from datetime import timedelta as _td
    _yday = (datetime.now() - _td(days=1)).strftime('%Y-%m-%d')
    _yday_raw = kv_get(f'articles/{_yday}')
    yesterday_urls = set()
    if _yday_raw:
        try:
            _ya = json.loads(_yday_raw)
            yesterday_urls = set(a.get('url', '') for a in _ya.values() if a.get('url'))
        except Exception:
            pass
    print(f'Loaded {len(yesterday_urls)} yesterday URLs ({_yday})')

    today = datetime.now().strftime('%Y-%m-%d')
    articles = {}
    new_seen = set(seen)

    for cat_key, cat_cfg in CATEGORIES.items():
        try:
            print(f'\n[{cat_cfg["label"]}]')
            list_html = fetch(cat_cfg['url'])
            if not list_html:
                print('  List page failed')
                continue

            links = extract_article_links(list_html)
            print(f'  {len(links)} candidates')

            # 取最新 5 篇评分: 优先选「未读过」的新稿, 否则取当期最新一篇(保证 8 栏不空)
            top = links[:5]
            best_unseen, best_unseen_score = None, -1
            best_any, best_any_score = None, -1
            for cand in top:
                try:
                    time.sleep(1.5)
                    html = fetch(cand['url'])
                    if not html: continue
                    article = extract_article(html, cand['url'])
                    if not article or len(article.get('content', '')) < 200: continue
                    col_name = extract_column_info(html)
                    score = score_article(article, cat_key, col_name)
                    print(f'    {score:5.1f}分 [{col_name or "未识别"}] {article["title"][:30]}')
                    article['phrases'] = extract_phrases(article.get('content', ''))
                    article['highlights'] = extract_highlights(article.get('content', ''))
                    article['category'] = cat_key
                    article['column_name'] = col_name
                    article['author'] = ''
                    article['pub_date'] = article.get('pub_date', '')
                    if score > best_any_score:
                        best_any_score = score
                        best_any = article
                    is_new = cand['url'] not in seen and cand['url'] not in new_seen
                    if is_new and score > best_unseen_score:
                        best_unseen_score = score
                        best_unseen = article
                except Exception as e:
                    print(f'    err: {e}')

            # Secondary dedup: skip yesterday's articles even in fallback
            chosen = best_unseen
            if not chosen and best_any:
                if best_any.get('url') not in yesterday_urls:
                    chosen = best_any
                else:
                    print(f'    ⚠️ Best candidate was used yesterday, skipping...')
            if chosen:
                articles[cat_key] = chosen
                if chosen is best_unseen:
                    new_seen.add(chosen['url'])
                    print(f'  🏆 {chosen["title"][:40]} [{best_unseen_score:.1f}分] (新稿)')
                elif chosen.get('url') in yesterday_urls:
                    print(f'  🏆 {chosen["title"][:40]} [{best_any_score:.1f}分] (昨日复用)')
                else:
                    print(f'  🏆 {chosen["title"][:40]} [{best_any_score:.1f}分] (当期最新)')
            else:
                # 整栏抓取失败, 尝试从归档补位
                last, last_date = get_last_article_for_cat(cat_key)
                if last:
                    last2 = dict(last)
                    last2['backfilled'] = True
                    last2['backfill_from'] = last_date or ''
                    articles[cat_key] = last2
                    print(f'  🔄 抓取失败, 复用 {last_date} 的《{last.get("title", "?")[:30]}》')
                else:
                    print('  ⚠️ 该栏目无内容且无归档历史')
            time.sleep(1)
        except Exception as e:
            print(f'  {cat_cfg["label"]} error: {e}')

    count = len(articles)
    print(f'\n[Total] {count}/8 articles')

    if count >= 4:
        # Save
        today_articles = {}
        for k, v in articles.items():
            v2 = dict(v)
            v2['content'] = v.get('content', '')[:15000]
            today_articles[k] = v2
        data_json = json.dumps(today_articles, ensure_ascii=False)
        kv_put(f'articles/{today}', data_json)
        kv_put('latest_articles', data_json)
        kv_put('latest_date', today)
        manifest_raw = kv_get('manifest')
        manifest = {}
        if manifest_raw:
            try: manifest = json.loads(manifest_raw)
            except: pass
        manifest[today] = count
        kv_put('manifest', json.dumps(manifest, ensure_ascii=False))
        kv_put('seen_urls', json.dumps({'urls': list(new_seen)}, ensure_ascii=False))
        print(f'[Save] {count} articles saved to KV')

        # AI idiom defs
        all_chengyu = set()
        for art in articles.values():
            for w in find_chengyu(art.get('content', '')):
                all_chengyu.add(w)
        print(f'[AI] Generating defs for {len(all_chengyu)} chengyu...')
        sys.stdout.flush()
        ai_works = True
        # Try one AI request to test
        if all_chengyu:
            test_w = list(all_chengyu)[0]
            test_def = ai_define_chengyu(test_w)
            if not test_def:
                print('  [AI unavailable, using fallback dictionary]')
                sys.stdout.flush()
                ai_works = False
            else:
                kv_put(f'idiom:{test_w}', test_def, ttl=90*24*3600)
                print(f'  OK {test_w}')
                sys.stdout.flush()

        for w in list(all_chengyu)[:30]:
            cached = kv_get(f'idiom:{w}')
            if cached: continue
            if ai_works:
                defn = ai_define_chengyu(w) or CHENGYU_FALLBACK.get(w)
            else:
                defn = CHENGYU_FALLBACK.get(w)
            if defn:
                kv_put(f'idiom:{w}', defn, ttl=90*24*3600)
                print(f'  OK {w}')
                sys.stdout.flush()
            time.sleep(0.3)

    print(f'\n[{datetime.now().isoformat()}] Done.')


if __name__ == '__main__':
    main()
