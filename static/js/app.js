/* Atrium frontend. Contract: DESIGN.md v2.
   All dynamic text goes through textContent (never innerHTML) — service
   payloads carry arbitrary titles. */
(function () {
'use strict';

var root = document.documentElement;
var $ = function (s, c) { return (c || document).querySelector(s); };

function store(k, v) {
  try {
    if (arguments.length === 2) { localStorage.setItem(k, v); return v; }
    return localStorage.getItem(k);
  } catch (e) { return null; }
}

/* ========================================================================
   i18n — headlines are composed client-side from kind + params, so a
   language switch retroactively localizes already-fetched dispatches.
   Signage (ATRIUM, SALON, BUREAU, OPEN/DARK) stays English in both
   languages; sentences localize fully.
   ======================================================================== */
var STR = {
  en: {
    subtitle: 'GRAND CONCOURSE',
    preferences: 'PREFERENCES',
    ledger: 'THE LEDGER',
    chipAll: 'ALL',
    allDark: 'The hall is dark. No services are reachable.',
    today: 'TODAY', earlier: 'EARLIER',
    empty: 'No dispatches',
    darkNotice: 'Dark. Launch with: {hint}',
    lampOpen: 'Reachable', lampDark: 'Offline', lampChecking: 'Checking',
    justNow: 'just now', minAgo: '{n} min ago', hAgo: '{n} h ago', dAgo: '{n} d ago',
    linesOpen: 'LINES OPEN {n}/{m}',
    'desc.autopilot': 'Season anime, fetched and shelved while you sleep.',
    'desc.groundstation': 'Workshop mods tracked, updates caught in orbit.',
    'desc.outreach': "The day's introductions, briefed and dealt.",
    'desc.pressroom': 'The world overnight, set in type by morning.',
    'desc.arsenal': 'A workbench of small utility tools for games.',
    'desc.bourse': 'The morning market brief, ranked and ready.',
    'desc.fallback': 'A newly registered hall.',
    'desc.vacant': 'Held for the next hall.',
    'stat.airing': '{n} AIRING TODAY', 'stat.watching': '{n} WATCHING',
    'stat.pending': '{n} {n|UPDATE|UPDATES} PENDING', 'stat.mods': '{n} {n|MOD|MODS} TRACKED',
    'stat.queue': 'QUEUE {done}/{total}', 'stat.invited': 'SENT {n}/{target}',
    'stat.stories': '{n} {n|STORY|STORIES} · {m} {m|SECTION|SECTIONS}', 'stat.stale': 'EDITION STALE',
    'stat.tools': '{n} {n|TOOL|TOOLS} ON THE RACK',
    'stat.orders_await': '{n} {n|ORDER AWAITS|ORDERS AWAIT} REVIEW', 'stat.brief_of': 'BRIEF OF {date}',
    'note.qb_down': 'qBittorrent unreachable, downloads paused',
    'note.daemon_stale': 'Sync daemon looks stalled',
    'note.fallback': 'Reading state files directly (server down)',
    'note.digest_stale': 'This edition is more than a day old',
    'k.anime.premiere': 'Premiered',
    'k.anime.premiere.promoted': 'Premiered and auto-subscribed',
    'k.anime.completed': 'Finished, all {eps} {eps|episode|episodes} watched',
    'k.anime.completed.noeps': 'Finished and marked as watched',
    'k.anime.landed': 'Episode {ep} shelved · {cour}',
    'k.anime.landed.noep': 'New episode shelved · {cour}',
    'k.anime.subscribed': 'Now subscribed · {group}',
    'k.anime.subscribed.nogroup': 'Now subscribed',
    'k.anime.imported': 'Imported by hand',
    'k.anime.unresolved': 'No release group matched yet',
    'k.anime.grace': 'Waiting for the preferred group',
    'k.autopilot.stalled.head': 'The sync daemon has stopped',
    'k.autopilot.stalled': 'Last pass {since}, stalled {hours}h and counting',
    'k.autopilot.stalled.fresh': 'Last pass {since}, and nothing has landed since',
    'k.autopilot.qb_down.head': 'qBittorrent is unreachable',
    'k.autopilot.qb_down': 'Downloads stay paused until it answers again',
    'k.unknown': 'Fresh word from this hall. Refresh the page to read it in full',
    'k.mods.updated': 'Workshop update · {game}',
    'k.mods.updated.nogame': 'Workshop update',
    'k.mods.removed': 'Delisted from the Workshop',
    'k.mods.banned': 'Banned on the Workshop',
    'k.outreach.queue_ready.head': 'Daily queue ready',
    'k.outreach.queue_ready': '{n} {n|introduction|introductions} briefed',
    'k.outreach.progress.head': 'Drafting the queue',
    'k.outreach.progress': '{done} of {total} briefed',
    'k.outreach.invites.head': "The day's invitations",
    'k.outreach.invites': '{n} of {target} sent',
    'k.outreach.error.head': 'Drafter hit an error',
    'k.outreach.error': 'Check the Outreach Desk',
    'k.press.digest_ready.head': 'The edition is out',
    'k.press.digest_ready': '{stories} {stories|story|stories} across {sections} {sections|section|sections}',
    'k.bourse.briefing.head': 'The morning brief is out',
    'k.bourse.briefing': 'Brief of {date}: {orders} {orders|order awaits|orders await} your review',
    'k.bourse.briefing.hold': 'Brief of {date}: no action. The desk holds',
    'k.bourse.briefing.nodate': '{orders} {orders|order awaits|orders await} your review',
    'k.bourse.briefing.hold.nodate': 'No action. The desk holds',
    'k.bourse.canary.head': 'Watchtower alarm',
    'k.bourse.canary': '{sym} momentum turned negative, sheltering part of the book',
    'k.bourse.allclear.head': 'Watchtower all clear',
    'k.bourse.allclear': 'Every canary healthy, back on offense',
    worksSub: 'Readings from the engine room',
    wkCpu: 'PROCESSOR', wkMem: 'MEMORY', wkGpu: 'GRAPHICS', wkNet: 'TRAFFIC',
    wkHours: 'HOURS RUN', wkDisk: 'STORE', wkFree: '{n} FREE',
    runD: 'd', runH: 'h', runM: 'm', wkRate: 'MB/s', join: ': ', list: ', ',
    vacantName: 'Reserved', vacantLamp: 'Not in service',
    wkNoReading: 'NO READING',
    wkCores: '{n} cores', wkOf: '{a} of {b} GB',
    wkDown: '{d} down · {u} up MB/s',
    almSub: 'The sky over {place}',
    almHigh: 'HIGH', almLow: 'LOW', almPrecip: 'PRECIP', almWind: 'WIND',
    almRise: 'RISE', almSet: 'SET',
    almPolarDay: 'MIDNIGHT SUN', almPolarNight: 'POLAR NIGHT',
    almAge: 'AGE',
    almDaylight: 'DAYLIGHT', almLonger: 'LONGER', almShorter: 'SHORTER',
    almDays: '{n} d', almWindUnit: '{n} km/h',
    almFahrenheit: '{high} / {low} °F',
    /* The eight phases, in order from new moon. Sentences, not signage: the
       hall's engraved caps stay English, a moon's name does not. */
    almPhase0: 'New', almPhase1: 'Waxing crescent',
    almPhase2: 'First quarter', almPhase3: 'Waxing gibbous',
    almPhase4: 'Full', almPhase5: 'Waning gibbous',
    almPhase6: 'Last quarter', almPhase7: 'Waning crescent',
    bayLabel: 'BAY {n}',
    floorMotto: 'EVERY HALL, ONE DOOR',
    appearance: 'APPEARANCE', language: 'LANGUAGE', motion: 'MOTION',
    uiScale: 'ENGRAVING SIZE',
    uiSmall: 'FINE', uiSmallDesc: 'Close reading',
    uiMedium: 'STANDARD', uiMediumDesc: 'Scales with the screen',
    uiLarge: 'SIGNBOARD', uiLargeDesc: 'Legible from across the room',
    onyx: 'ONYX', ivory: 'IVORY', system: 'FOLLOW SYSTEM',
    onyxDesc: 'Black & gold', ivoryDesc: 'Platinum & gold', systemDesc: 'Match the OS',
    motionFull: 'FULL', motionReduced: 'REDUCED',
    replay: 'REPLAY ENTRANCE',
    ariaTicker: 'Status band',
    ariaLever: 'Bureau wing',
    ariaDesk: 'Signal desk: mode lever',
    markAll: 'MARK ALL READ',
    markAllHint: 'Strike every dispatch in the window, both wings',
    markAllDone: 'Nothing left to strike',
    markAllStruck: '{n} {n|dispatch|dispatches} struck',
    srOpen: 'open', srDark: 'dark', srChecking: 'checking',
    opensTab: 'Opens in its own tab.',
    unread: 'unread',
    wkHot: 'in the red',
    almSrTimes: 'Sunrise {rise}, sunset {set}.',
    almSrHours: '{h} {h|hour|hours} {m} {m|minute|minutes}',
    almSrMinutes: '{m} {m|minute|minutes} {s} {s|second|seconds}',
    leverDesc: 'Off lights the Salon, the play wing. On lights the Bureau, the work wing.',
    ariaFilter: 'Filter dispatches', ariaClose: 'Close',
    ariaGates: 'Gates', ariaLedger: 'Ledger: dispatch timeline',
    ariaWorks: 'Statistics: live readings from this machine',
    ariaAlmanac: 'Almanac: sun, moon and weather over this hall',
    worksTitle: 'Statistics', almTitle: 'Almanac',
    salonWing: 'Play wing', bureauWing: 'Work wing',
    ledgerBtnLabel: 'LEDGER',
    keysTitle: 'KEYS',
    keyGates: 'Walk the gates', keyJump: 'Go to a gate', keyOpen: 'Open it',
    keyLever: 'Throw the lever', keyLedger: 'The Ledger', keyPrefs: 'Preferences',
    keyWalk: 'Walk the dispatches, in the Ledger', keyPlate: 'Show or hide this plate',
    keyClose: 'Close', keyEnter: 'ENTER',
    unreadCount: '{n} new dispatches', unreadCountOne: '1 new dispatch'
  },
  zh: {
    subtitle: '大通廊',
    preferences: '偏好设置',
    ledger: '消息总台',
    chipAll: '全部',
    allDark: '大厅熄灯，没有可达的服务。',
    today: '今日', earlier: '更早',
    empty: '暂无快讯',
    darkNotice: '未点亮。用此脚本启动：{hint}',
    lampOpen: '已点亮', lampDark: '离线', lampChecking: '检查中',
    justNow: '刚刚', minAgo: '{n} 分钟前', hAgo: '{n} 小时前', dAgo: '{n} 天前',
    linesOpen: '线路畅通 {n}/{m}',
    'desc.autopilot': '当季新番，睡着也替你追完入库。',
    'desc.groundstation': '创意工坊 Mod 尽在轨道监测之中。',
    'desc.outreach': '今日的引荐名单，已备好草稿待发。',
    'desc.pressroom': '昨夜的世界，天亮前已排版付印。',
    'desc.arsenal': '一张游戏实用小工具的工作台。',
    'desc.bourse': '每日行情晨报，排好名次候审。',
    'desc.fallback': '新登记的厅室。',
    'desc.vacant': '留给下一间厅。',
    'stat.airing': '今日 {n} 部放送', 'stat.watching': '在看 {n} 部',
    'stat.pending': '{n} 个更新待装', 'stat.mods': '追踪 {n} 个 MOD',
    'stat.queue': '队列 {done}/{total}', 'stat.invited': '已发 {n}/{target}',
    'stat.stories': '{n} 条 · {m} 栏', 'stat.stale': '早报未更新',
    'stat.tools': '架上 {n} 件工具',
    'stat.orders_await': '{n} 条指令候审', 'stat.brief_of': '证券所晨报 {date}',
    'note.qb_down': 'qBittorrent 不可达，下载已暂停',
    'note.daemon_stale': '同步守护进程疑似卡住',
    'note.fallback': '服务器离线，正在直读状态文件',
    'note.digest_stale': '这一期晨报已超过一天未更新',
    'k.anime.premiere': '开播',
    'k.anime.premiere.promoted': '开播，已自动订阅',
    'k.anime.completed': '完结，全 {eps} 话看完',
    'k.anime.completed.noeps': '完结，已标记看过',
    'k.anime.landed': '第 {ep} 话已入库 · {cour}',
    'k.anime.landed.noep': '新一话已入库 · {cour}',
    'k.anime.subscribed': '已订阅 · {group}',
    'k.anime.subscribed.nogroup': '已订阅',
    'k.anime.imported': '已手动入库',
    'k.anime.unresolved': '尚未匹配到字幕组源',
    'k.anime.grace': '等待首选字幕组中',
    'k.autopilot.stalled.head': '同步守护进程已停摆',
    'k.autopilot.stalled': '最后一轮 {since}，已停摆 {hours} 小时',
    'k.autopilot.stalled.fresh': '最后一轮 {since}，此后再无剧集入库',
    'k.autopilot.qb_down.head': 'qBittorrent 不可达',
    'k.autopilot.qb_down': '下载将保持暂停，直到它恢复响应',
    'k.unknown': '该厅室有新消息。刷新页面即可完整阅读',
    'k.mods.updated': '创意工坊更新 · {game}',
    'k.mods.updated.nogame': '创意工坊更新',
    'k.mods.removed': '已从创意工坊下架',
    'k.mods.banned': '已被创意工坊封禁',
    'k.outreach.queue_ready.head': '每日邀约队列已就绪',
    'k.outreach.queue_ready': '{n} 位候选已备好草稿',
    'k.outreach.progress.head': '草稿撰写中',
    'k.outreach.progress': '已完成 {done}/{total}',
    'k.outreach.invites.head': '当日邀请',
    'k.outreach.invites': '已发出 {n}/{target}',
    'k.outreach.error.head': '草稿引擎出错',
    'k.outreach.error': '请到 Outreach Desk 查看',
    'k.press.digest_ready.head': '晨报已出版',
    'k.press.digest_ready': '{stories} 条新闻，分 {sections} 栏',
    'k.bourse.briefing.head': '证券所晨报已付印',
    'k.bourse.briefing': '{date}版：{orders} 条指令候您审阅',
    'k.bourse.briefing.hold': '{date}版：无操作，按兵不动',
    'k.bourse.briefing.nodate': '{orders} 条指令候您审阅',
    'k.bourse.briefing.hold.nodate': '无操作，按兵不动',
    'k.bourse.canary.head': '瞭望塔报警',
    'k.bourse.canary': '{sym} 动量转负，部分仓位转入避险',
    'k.bourse.allclear.head': '瞭望塔解除警报',
    'k.bourse.allclear': '金丝雀全数安好，恢复进攻',
    worksSub: '本机运转实况',
    wkCpu: '处理器', wkMem: '内存', wkGpu: '显卡', wkNet: '网络',
    wkHours: '已运转', wkDisk: '存储', wkFree: '余 {n}',
    runD: ' 天 ', runH: ' 时 ', runM: ' 分', wkRate: 'MB/s', join: '：', list: '，',
    vacantName: '预留', vacantLamp: '未启用',
    wkNoReading: '无读数',
    wkCores: '{n} 核', wkOf: '{a} / {b} GB',
    wkDown: '下 {d} · 上 {u} MB/s',
    almSub: '{place}上空的天象',
    almHigh: '高', almLow: '低', almPrecip: '降水', almWind: '风',
    almRise: '日出', almSet: '日落',
    almPolarDay: '极昼', almPolarNight: '极夜',
    almAge: '月龄',
    almDaylight: '昼长', almLonger: '比昨日长', almShorter: '比昨日短',
    almDays: '{n} 日', almWindUnit: '{n} 公里/时',
    almFahrenheit: '{high} / {low} °F',
    almPhase0: '朔', almPhase1: '蛾眉月',
    almPhase2: '上弦', almPhase3: '盈凸',
    almPhase4: '望', almPhase5: '亏凸',
    almPhase6: '下弦', almPhase7: '残月',
    bayLabel: '第 {n} 间',
    floorMotto: '万厅一门',
    appearance: '外观', language: '语言', motion: '动效',
    uiScale: '字号',
    uiSmall: '精细', uiSmallDesc: '凑近细读',
    uiMedium: '标准', uiMediumDesc: '随屏幕尺寸自动放大',
    uiLarge: '招牌', uiLargeDesc: '隔着房间也看得清',
    onyx: '黑金 · ONYX', ivory: '白金 · IVORY', system: '跟随系统',
    onyxDesc: '玄色与鎏金', ivoryDesc: '铂色与鎏金', systemDesc: '与操作系统一致',
    motionFull: '完整', motionReduced: '减弱',
    replay: '重播入场动画',
    ariaTicker: '状态带',
    ariaLever: '事务翼',
    ariaDesk: '信号台：模式拨杆',
    markAll: '全部标为已读',
    markAllHint: '把窗口内两翼的消息一次全部盖章',
    markAllDone: '没有未读了',
    markAllStruck: '已划去 {n} 条',
    srOpen: '已点亮', srDark: '未点亮', srChecking: '检查中',
    opensTab: '在单独的标签页中打开。',
    unread: '未读',
    wkHot: '已入红区',
    almSrTimes: '日出 {rise}，日落 {set}。',
    almSrHours: '{h} 小时 {m} 分',
    almSrMinutes: '{m} 分 {s} 秒',
    leverDesc: '关：点亮沙龙翼（娱乐）。开：点亮事务翼（工作）。',
    ariaFilter: '筛选快讯', ariaClose: '关闭',
    ariaGates: '门廊', ariaLedger: '消息总台：快讯时间轴',
    ariaWorks: '运转统计：本机实时读数',
    ariaAlmanac: '天象：本厅上空的日月与天气',
    worksTitle: '运转统计', almTitle: '天象',
    salonWing: '沙龙翼（娱乐）', bureauWing: '事务翼（工作）',
    ledgerBtnLabel: '消息总台',
    keysTitle: '按键',
    keyGates: '在门廊间移动', keyJump: '直达某扇门', keyOpen: '打开',
    keyLever: '扳动拉杆', keyLedger: '消息总台', keyPrefs: '偏好设置',
    keyWalk: '在消息总台里逐条移动', keyPlate: '显示或收起这块铭牌',
    keyClose: '关闭', keyEnter: '回车',
    unreadCount: '{n} 条新消息', unreadCountOne: '1 条新消息'
  }
};

var lang = root.lang === 'zh' ? 'zh' : 'en';
/* {k} substitutes a parameter; {k|one|many} picks a word by the count in
   k, so "1 SECTIONS" and "1 order(s)" never reach the wall. Chinese has no
   plural and simply does not use the second form. */
function t(key, params) {
  var s = STR[lang][key];
  if (s === undefined) s = STR.en[key];
  if (s === undefined) return key;
  return s.replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, function (_, k, one, many) {
    return params && Number(params[k]) === 1 ? one : many;
  }).replace(/\{(\w+)\}/g, function (_, k) {
    return params && params[k] !== undefined ? String(params[k]) : '';
  });
}

/* ========================================================================
   State
   ======================================================================== */
var services = [];
var statuses = {};
var stats = {};
var feed = [];
var firstFeed = true;
var plaqueEls = {};   // dispatch id -> element (re-polls never re-animate)
var chipFilter = 'all';   // session-only, resets to ALL on every load (R11)
/* Ledger drawer state */
var ledgerOpening = false;    // true only during openLedger() render pass
var cascadeIndex = 0;         // counter for --ci stamps in cascading pass
var KNOWN_SIGILS = { autopilot: 1, groundstation: 1, outreach: 1, pressroom: 1, arsenal: 1, bourse: 1 };

/* ========================================================================
   Read state — the cursor is what reads
   ------------------------------------------------------------------------
   A dispatch counts as read once the pointer has RESTED on it. Opening the
   drawer no longer clears the feed wholesale: that marked plaques the eye
   never reached and turned the unread signal into a "have you opened this
   today" lamp rather than a count of what is still outstanding.

   Two stores, and both are load-bearing:
   - `atrium.lastVisit` is now a FLOOR, frozen at whatever the old
     close-stamp last wrote. Everything at or below it stays read, so moving
     to this model does not resurface a fortnight of dispatches the reader
     already dismissed. Nothing advances it any more.
   - `atrium.read` is the per-dispatch set above that floor.
   ======================================================================== */
var READ_KEY = 'atrium.read';
var READ_CAP = 400;   // the feed window is far smaller; this is only a lid
/* Rest, not sweep. Reaching the Ledger's close button crosses every plaque
   in the column, and marking on bare `pointerenter` would empty the badge as
   a side effect of aiming at the hatch. 420 ms outlasts a traverse and comes
   in under a glance. */
var DWELL_MS = 420;

var watermark = +(store('atrium.lastVisit') || 0);
var readIds = (function () {
  var out = {};
  try {
    JSON.parse(store(READ_KEY) || '[]').forEach(function (id) { out[id] = 1; });
  } catch (e) { /* a corrupt store just means nothing is read yet */ }
  return out;
})();

function isNew(d) {
  return d.ts > watermark && !readIds[d.id];
}

/* One write and one re-sync however many dispatches are struck: the stamp
   clears a whole window at once, and doing that a dispatch at a time would
   serialize a localStorage write and a full re-sync per card. */
function loadReadIds() {
  var out = [];
  try { out = JSON.parse(store(READ_KEY) || '[]'); } catch (e) { out = []; }
  return Array.isArray(out) ? out : [];
}
function markReadMany(ids) {
  var added = [];
  ids.forEach(function (id) {
    if (!id || readIds[id]) return;
    readIds[id] = 1;
    added.push(id);
  });
  if (!added.length) return;
  // Read, merge, write. This tab's memory is not the whole truth: another
  // tab may have struck dispatches since this one loaded, and writing only
  // what this tab knows (as it used to) quietly brought those back as new.
  // Order oldest first so the lid drops what has aged out of every feed.
  var disk = loadReadIds();
  var seen = {}, out = [];
  function keep(id) { if (id && !seen[id]) { seen[id] = 1; out.push(id); readIds[id] = 1; } }
  disk.forEach(keep);
  feed.forEach(function (d) { if (readIds[d.id]) keep(d.id); });
  added.forEach(keep);
  store(READ_KEY, JSON.stringify(out.slice(-READ_CAP)));
  syncReadMarks();
}

function markRead(id) {
  markReadMany([id]);
}

/* The drawer's plaques are the only surface that carries a per-dispatch mark
   now, so a read updates there and in the badge. The ticker is left to its
   own poll: it is a marquee, and rebuilding the track mid-scroll snaps it
   back to the start — a jump the hall would then have to explain. */
function syncReadMarks() {
  feed.forEach(function (d) {
    var li = plaqueEls[d.id];
    if (li) li.classList.toggle('new', isNew(d));
  });
  updateLedgerBadge();
}

/* Arm a card so resting on it marks its dispatch read. Touch is excluded on
   purpose: a tap fires pointerenter, which would mark dispatches read for
   the crime of being scrolled past under a thumb. Keyboard gets the same
   deal as the pointer — focus IS the caret coming to rest, so it marks at
   once rather than after a dwell nobody could see. */
function armDwell(node, id) {
  var timer = null;
  function cancel() {
    clearTimeout(timer);
    timer = null;
    node.classList.remove('reading');
  }
  node.addEventListener('pointerenter', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    cancel();
    // .reading runs the dwell out loud — the champagne rim drains and the
    // diamond closes over exactly DWELL_MS, so a mechanic with no button to
    // press still shows its work, and leaving early visibly aborts it.
    node.classList.add('reading');
    timer = setTimeout(function () {
      timer = null;
      node.classList.remove('reading');
      markRead(id);
    }, DWELL_MS);
  });
  node.addEventListener('pointerleave', cancel);
  node.addEventListener('focusin', function () { cancel(); markRead(id); });
}

/* ========================================================================
   Entrance — the sequence assembles the chrome (see DESIGN.md timeline)
   ======================================================================== */
var entrance = $('#entrance');
var entranceTimers = [];

function buildRays() {
  var g = $('.e-rays');
  if (!g) return;
  var ns = 'http://www.w3.org/2000/svg';
  for (var i = 0; i < 24; i++) {
    // Rotation lives on a wrapper <g> attribute: the ray's CSS scale
    // animation would otherwise override the transform attribute entirely.
    var wrap = document.createElementNS(ns, 'g');
    wrap.setAttribute('transform', 'rotate(' + (i * 15) + ' 400 400)');
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '400'); line.setAttribute('y1', '288');
    line.setAttribute('x2', '400'); line.setAttribute('y2', '46');
    line.style.setProperty('--i', String(i));
    wrap.appendChild(line);
    g.appendChild(wrap);
  }
}

/* Vault boltwork: 8 radial rods around the drawn circle. Rotation lives on
   wrapper <g> attributes (attribute/CSS override law); the retract is a
   plain translateY on each line, made radial by the wrapper rotation.
   --bi index drives the 12ms stagger; slight stroke-width variation (hash)
   makes the bolts feel individually machined, not stamped. */
function buildBolts() {
  var g = $('.e-bolts');
  if (!g || g.childNodes.length) return;
  var ns = 'http://www.w3.org/2000/svg';
  var swVariants = [5, 4.5, 5.5, 4, 5, 5.5, 4.5, 5];
  for (var i = 0; i < 8; i++) {
    var wrap = document.createElementNS(ns, 'g');
    wrap.setAttribute('transform', 'rotate(' + (i * 45) + ' 400 400)');
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '400'); line.setAttribute('y1', '306');
    line.setAttribute('x2', '400'); line.setAttribute('y2', '262');
    line.setAttribute('stroke-width', String(swVariants[i]));
    line.style.setProperty('--bi', String(i));
    line.setAttribute('class', 'e-bolt-' + i);
    wrap.appendChild(line);
    g.appendChild(wrap);
  }
  // Bolt guide channels (4, at N/S/E/W) — individual rect elements
  for (var j = 0; j < 4; j++) {
    var gWrap = document.createElementNS(ns, 'g');
    gWrap.setAttribute('transform', 'rotate(' + (j * 90) + ' 400 400)');
    var guide = document.createElementNS(ns, 'rect');
    guide.setAttribute('x', '397'); guide.setAttribute('y', '274');
    guide.setAttribute('width', '6'); guide.setAttribute('height', '28');
    guide.setAttribute('rx', '1');
    guide.setAttribute('fill', 'var(--bronze-deep)');
    guide.setAttribute('stroke', 'var(--bronze)');
    guide.setAttribute('stroke-width', '1');
    guide.setAttribute('class', 'e-bolt-guide');
    gWrap.appendChild(guide);
    g.appendChild(gWrap);
  }
  // Bolt carrier ring (circular track all bolts engage)
  var carrier = document.createElementNS(ns, 'circle');
  carrier.setAttribute('cx', '400'); carrier.setAttribute('cy', '400');
  carrier.setAttribute('r', '100');
  carrier.setAttribute('stroke', 'var(--bronze)');
  carrier.setAttribute('stroke-width', '2');
  carrier.setAttribute('fill', 'none');
  carrier.setAttribute('class', 'e-bolt-carrier');
  g.appendChild(carrier);
}

function playEntrance() {
  // Disable ledger button during entrance; re-enabled in finishEntrance()
  var lb = $('#ledger-btn');
  if (lb) lb.disabled = true;
  buildRays();
  buildBolts();
  var at = function (ms, fn) { entranceTimers.push(setTimeout(fn, ms)); };

  // Beat 0 — circle draws + engraving scribes simultaneously (0ms).
  // Both classes added in the same synchronous statement: the circle is
  // being manufactured; the engraving scribes happen during manufacture.
  entrance.classList.add('play');
  entrance.classList.add('engrave');

  // Beat 1 — handwheel materialises + bolts tick in (500ms).
  // The circle (lock case) is complete at ~420ms. The wheel and bolt
  // assembly live inside the case and can only appear once the case is visible.
  at(500, function () { entrance.classList.add('doors'); });

  // Beat 2 — wheel turns 60 deg; bolts retract in two-phase rush-and-settle (700ms).
  // The wheel is the drive: turning it advances the drive cams, which push
  // the bolt carrier, which retracts all eight bolts simultaneously.
  at(700, function () { entrance.classList.add('wheel'); });

  // Beat 3 — seam hairline descends (870ms).
  // The bolts have cleared their locking engagement (bolt body has passed the
  // jamb face before reaching full retraction). The door leaf is now free.
  // STRUCTURED HOLD — seam visible 160ms, wheel settled, bolts home.
  // Do not compress this gap: it is the mechanism confirmation beat.
  at(870, function () { entrance.classList.add('seam'); });

  // Beat 4 — doors swing open; steam vents (1030ms).
  // The seam is the visual proof of pressure differential. At 1030ms the
  // door swings. Steam fires 20ms later — pressure escaping through the gap.
  at(1030, function () { entrance.classList.add('open'); });
  at(1050, function () { steamBurst($('.e-nozzle'), 3); });

  // Beat 5 — wordmark stamps down (1500ms).
  // Door is 40% open by 1500ms — the sign is readable in the widening aperture.
  // Per-letter stagger: 38ms × 5 = 190ms total; last letter at 1500+190+480=2170ms.
  at(1500, function () {
    entrance.classList.add('word');
    // Set per-letter animation delays inline so each span has its own timing.
    var spans = entrance.querySelectorAll('.e-wordmark span');
    for (var si = 0; si < spans.length; si++) {
      spans[si].style.animationDelay = (si * 38) + 'ms';
    }
  });

  // Beat 6 — circle docks as masthead rosette (1800ms).
  // The lock face is no longer needed on the door — it belongs on the hall
  // masthead rosette. The circle flies inward and up to its permanent home.
  // Dock arithmetic (all values runtime-computed from live DOM):
  //   --dock-x = mono.cx - burst.cx (px, signed)
  //   --dock-y = mono.cy - burst.cy - 14 (px; -14 compensates masthead
  //              rise-in from-state translateY(14px) which fires at 2000ms,
  //              200ms after dock)
  //   --dock-s = mono.width / (burst.width * 0.23)
  //   * 0.23: SVG viewBox=800x800, circle r=92, diameter=184, 184/800=0.23.
  //   !! LOAD-BEARING: if masthead rise-in delay changes from 2000ms,
  //   recompute -14 as: masthead_from_translateY * (1 - elapsed_fraction) !!
  at(1800, function () {
    var mono  = $('#monogram').getBoundingClientRect();
    var burst = $('.e-burst').getBoundingClientRect();
    entrance.style.setProperty('--dock-x',
      (mono.left + mono.width / 2 - (burst.left + burst.width / 2)) + 'px');
    entrance.style.setProperty('--dock-y',
      (mono.top + mono.height / 2 - (burst.top + burst.height / 2) - 14) + 'px');
    entrance.style.setProperty('--dock-s',
      String(mono.width / (burst.width * 0.23)));
    entrance.classList.add('dock');
  });

  // Beat 7 — done-fade (2200ms).
  // 30ms gap after last letter (2170ms): load-bearing. Prior code fired at
  // 2100ms while the sixth letter was still animating — this closes that bug.
  at(2200, function () { entrance.classList.add('done-fade'); });

  // Beat 8 — finish (2700ms).
  at(2700, finishEntrance);

  // The overlay has pointer-events:auto while playing, so the skip gesture
  // is swallowed here and never reaches the invisible hall underneath.
  entranceSkip = function (e) {
    // Any input cuts the entrance short, but only the keys the hall itself
    // would act on are swallowed: F5, Ctrl+R and the like keep working.
    var own = !e || e.type !== 'keydown' ||
      (!e.ctrlKey && !e.metaKey && !e.altKey && !/^F\d+$/.test(e.key));
    if (own && e && e.preventDefault) e.preventDefault();
    finishEntrance();
  };
  entrance.addEventListener('pointerdown', entranceSkip);
  window.addEventListener('keydown', entranceSkip);
}

var entranceSkip = null;

function finishEntrance() {
  entranceTimers.forEach(clearTimeout);
  if (entranceSkip) {
    entrance.removeEventListener('pointerdown', entranceSkip);
    window.removeEventListener('keydown', entranceSkip);
    entranceSkip = null;
  }
  entrance.style.display = 'none';
  // Fill-mode 'both' animations on the hall have either finished or get
  // snapped to their end state here. data-boot stays 'played', so the
  // suppressed-load hall-fade does NOT retrigger on this flip.
  root.dataset.entered = 'yes';
  // Re-enable ledger button now that entrance is done
  var lb = $('#ledger-btn');
  if (lb) lb.disabled = false;
  // Relay: motion transfers from the overlay to the hall. The gear train
  // twitches one tooth — the machine exhales as the overlay clears.
  deskNudge();
}

/* Desk nudge: one-tooth gear tick after the entrance clears.
   Amplitude 0.07 on --drive ≈ 6.3 deg on gearA (18 teeth × 5 deg/tooth).
   Self-terminates in ~480ms. Reduced motion: returns immediately. */
function deskNudge() {
  if (root.dataset.motion === 'reduced') return;
  if (!desk) return;
  var t0 = performance.now();
  var PUSH = 200, PULL = 280, AMP = 0.07;
  var base = getDrive();
  function frame(now) {
    var dt = now - t0;
    var v;
    if (dt < PUSH) {
      v = base + AMP * (dt / PUSH);
    } else if (dt < PUSH + PULL) {
      v = base + AMP * (1 - (dt - PUSH) / PULL);
    } else {
      setDrive(base);
      return;
    }
    setDrive(v);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ========================================================================
   Signal desk — lever, gear train, steam (DESIGN.md v4.1). One scalar
   --drive (0=salon, 1=bureau) written by a rAF driver onto :root; the
   lever, both gears and the works board's movement all derive from it via
   calc, so sync is structural.
   ======================================================================== */
var desk = $('#signal-desk');
var deskNozzle = $('#signal-desk .nozzle');
var NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, cls) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
}

/* Trapezoid-tooth gear on ISO proportions (addendum 1.0m, dedendum 1.25m);
   involute flanks are indistinguishable at UI scale. Meshing gears MUST
   share the module m. Emits a d-string centered on (0,0), fill-rule
   evenodd for the bore and spoke windows. */
function gearPath(N, m, o) {
  o = o || {};
  var rp = N * m / 2;
  var ra = rp + m;
  var rr = rp - 1.25 * m;
  var pitch = 2 * Math.PI / N;
  var wTip = pitch * 0.32, wRoot = pitch * 0.52;
  var P = function (r, a) {
    return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2);
  };
  var d = '';
  for (var i = 0; i < N; i++) {
    var c = i * pitch;
    var r0 = c - wRoot / 2, r1 = c + wRoot / 2;
    var t0 = c - wTip / 2, t1 = c + wTip / 2;
    d += (i === 0 ? 'M ' + P(rr, r0)
                  : ' A ' + rr + ' ' + rr + ' 0 0 1 ' + P(rr, r0));
    d += ' L ' + P(ra, t0)
       + ' A ' + ra + ' ' + ra + ' 0 0 1 ' + P(ra, t1)
       + ' L ' + P(rr, r1);
  }
  d += ' A ' + rr + ' ' + rr + ' 0 0 1 ' + P(rr, -wRoot / 2) + ' Z';
  var circle = function (r) {
    return ' M ' + r + ' 0 A ' + r + ' ' + r + ' 0 1 0 ' + (-r) + ' 0'
         + ' A ' + r + ' ' + r + ' 0 1 0 ' + r + ' 0 Z';
  };
  d += circle(o.bore || 0.16 * rp);
  if (o.spokes) {
    var hub = 0.32 * rp, rim = 0.72 * rr, half = 0.16;
    for (var s = 0; s < o.spokes; s++) {
      var a0 = s * 2 * Math.PI / o.spokes + half;
      var a1 = (s + 1) * 2 * Math.PI / o.spokes - half;
      d += ' M ' + P(hub, a0) + ' A ' + hub + ' ' + hub + ' 0 0 1 ' + P(hub, a1)
         + ' L ' + P(rim, a1) + ' A ' + rim + ' ' + rim + ' 0 0 0 ' + P(rim, a0) + ' Z';
    }
  }
  return d;
}

/* Gear train constants — shared module, exact center distance, interleave
   phase per the meshing law. The CSS rotations (90° / −180°) encode the
   −N_A/N_B ratio; lever→gearA gearing is implied by the hidden rack. */
var GEAR_NA = 18, GEAR_NB = 9, GEAR_M = 4.4, GEAR_PHI = -20;

function buildDesk() {
  if (!desk) return;

  var DEG = Math.PI / 180;

  // Polar-to-cartesian helper (origin at 0,0, as used inside gear SVGs)
  function P(r, a) {
    return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2);
  }

  // Arc sector path (from a0 to a1 at radius r, origin 0,0)
  function sectorPath(r, a0, a1) {
    var da = a1 - a0;
    if (da < 0) da += 2 * Math.PI;
    var large = da > Math.PI ? 1 : 0;
    return 'M 0 0 L ' + P(r, a0) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + P(r, a1) + ' Z';
  }

  // ---- console casework (static art) — drawn FIRST so everything else on
  //      this desk reads as mounted on it ---------------------------------
  // Geometry is the 360×220 assembly space. The console's floor line is
  // y=196, deliberately ABOVE the lever's own contact near y=209: the case
  // stands further back in the room, and on a floor that recedes, further
  // away is higher up the screen. That 13px is the whole depth cue.
  //
  // The quadrant arc was hanging in mid-air. Its inner ends land at
  // (131, 91) and (229, 91) — which is why the cornice slab is y 84-92 and
  // runs x 22-338: the arc now comes down onto the cap instead of stopping
  // in the air above the terrazzo. Move one and the other has to follow.
  var q = $('.quadrant', desk);
  var CW_L = 32, CW_R = 328;              // body sides
  var CW_CAP_T = 84, CW_CAP_B = 92;       // cornice slab (arc lands here)
  var CW_RISE_B = 100;                    // second cornice step
  var CW_FRZ_B = 114;                     // frieze band foot
  var CW_BODY_B = 182;                    // body foot
  var CW_FLOOR = 196;                     // plinth meets stone
  var ARCH_CX = 180, ARCH_CY = 178, ARCH_R = 56;   // MUST match .gear-well

  // Waxed-floor return, in three flat courses rather than a gradient: the
  // material law is flat tones, and three steps read as a reflection while
  // staying inside it. Narrowing each course fakes the convergence a real
  // plane-space smear would have — over 14px the error is sub-pixel.
  [[24, 196, 312, 5, 0.17], [32, 201, 296, 5, 0.10], [44, 206, 272, 4, 0.05]]
    .forEach(function (r) {
      q.appendChild(svgEl('rect', {
        x: r[0], y: r[1], width: r[2], height: r[3], opacity: r[4]
      }, 'cw-return'));
    });
  // Contact shadow — the hard junction where a thing meets stone.
  q.appendChild(svgEl('ellipse', {
    cx: 180, cy: CW_FLOOR, rx: 168, ry: 4.5, opacity: 0.5
  }, 'cw-contact'));

  // Stepped plinth, two courses, lit top + front face each. The step depth
  // is the gates' own 6px shoulder, which is what makes the console read as
  // part of this building's kit of parts.
  [[20, 189, 320], [26, 182, 308]].forEach(function (p) {
    q.appendChild(svgEl('rect', { x: p[0], y: p[1] + 2, width: p[2], height: 5 }, 'cw-face'));
    q.appendChild(svgEl('rect', { x: p[0], y: p[1], width: p[2], height: 2 }, 'cw-cap'));
  });

  // Body
  q.appendChild(svgEl('rect', {
    x: CW_L, y: CW_FRZ_B, width: CW_R - CW_L, height: CW_BODY_B - CW_FRZ_B
  }, 'cw-face'));

  // Fluted pilasters — the aisle bays' own articulation, brought down to
  // furniture scale. Proud of the field, so they take the lit plane.
  [40, 288].forEach(function (px) {
    q.appendChild(svgEl('rect', {
      x: px, y: CW_FRZ_B, width: 32, height: CW_BODY_B - CW_FRZ_B
    }, 'cw-cap'));
    q.appendChild(svgEl('rect', {
      x: px, y: CW_FRZ_B, width: 32, height: CW_BODY_B - CW_FRZ_B
    }, 'cw-edge'));
    [8, 16, 24].forEach(function (fx) {
      q.appendChild(svgEl('path', {
        d: 'M ' + (px + fx) + ',' + (CW_FRZ_B + 6) +
           ' L ' + (px + fx) + ',' + (CW_BODY_B - 6)
      }, 'cw-flute'));
    });
  });

  // Frieze: a knurl band, the machined cousin of the Greek key. One ring
  // per element — this is the console's one, and it is what carries the
  // machine idiom up into the architecture instead of stopping at the well.
  q.appendChild(svgEl('rect', {
    x: CW_L, y: CW_RISE_B, width: CW_R - CW_L, height: CW_FRZ_B - CW_RISE_B
  }, 'cw-deep'));
  var knurl = '';
  for (var kx = CW_L + 6; kx <= CW_R - 6; kx += 6) {
    knurl += 'M ' + kx + ',' + (CW_RISE_B + 3) + ' L ' + kx + ',' + (CW_FRZ_B - 3) + ' ';
  }
  q.appendChild(svgEl('path', { d: knurl }, 'cw-knurl'));

  // Cornice: two steps, slab on riser.
  q.appendChild(svgEl('rect', {
    x: 28, y: CW_CAP_B, width: 304, height: CW_RISE_B - CW_CAP_B
  }, 'cw-face'));
  q.appendChild(svgEl('rect', {
    x: 22, y: CW_CAP_T, width: 316, height: CW_CAP_B - CW_CAP_T
  }, 'cw-cap'));
  q.appendChild(svgEl('path', {
    d: 'M 22,' + CW_CAP_T + ' L 338,' + CW_CAP_T
  }, 'cw-lit'));

  // Archivolt around the aperture + keystone. The arch is the hall's own
  // figure; the well is the only opening in the region, so it gets the one
  // piece of order the architecture would actually give it.
  q.appendChild(svgEl('path', {
    d: 'M ' + (ARCH_CX - ARCH_R - 6) + ',' + ARCH_CY +
       ' A ' + (ARCH_R + 6) + ' ' + (ARCH_R + 6) + ' 0 0 1 ' + (ARCH_CX + ARCH_R + 6) + ',' + ARCH_CY +
       ' L ' + (ARCH_CX + ARCH_R + 1) + ',' + ARCH_CY +
       ' A ' + (ARCH_R + 1) + ' ' + (ARCH_R + 1) + ' 0 0 0 ' + (ARCH_CX - ARCH_R - 1) + ',' + ARCH_CY + ' Z'
  }, 'cw-cap'));
  q.appendChild(svgEl('path', {
    d: 'M ' + (ARCH_CX - ARCH_R - 6) + ',' + ARCH_CY +
       ' A ' + (ARCH_R + 6) + ' ' + (ARCH_R + 6) + ' 0 0 1 ' + (ARCH_CX + ARCH_R + 6) + ',' + ARCH_CY
  }, 'cw-edge'));
  q.appendChild(svgEl('polygon', {
    points: '171,' + (ARCH_CY - ARCH_R - 12) + ' 189,' + (ARCH_CY - ARCH_R - 12) +
            ' 192,' + (ARCH_CY - ARCH_R + 6) + ' 168,' + (ARCH_CY - ARCH_R + 6)
  }, 'cw-cap'));
  q.appendChild(svgEl('polygon', {
    points: '171,' + (ARCH_CY - ARCH_R - 12) + ' 189,' + (ARCH_CY - ARCH_R - 12) +
            ' 192,' + (ARCH_CY - ARCH_R + 6) + ' 168,' + (ARCH_CY - ARCH_R + 6)
  }, 'cw-edge'));

  // Seam rivets, at the two plate joints only (cornice foot, plinth head).
  [[CW_RISE_B - 4], [CW_BODY_B + 4]].forEach(function (ry) {
    for (var rx = CW_L + 14; rx <= CW_R - 14; rx += 28) {
      q.appendChild(svgEl('circle', { cx: rx, cy: ry[0], r: 1.5 }, 'cw-rivet'));
    }
  });

  // ---- quadrant plate (static art) ---------------------------------------
  // The pivot moved with the lever, from the floor at y=212 up onto the
  // plinth at y=186, and the plate is on the same 0.7 as the arm — the
  // quadrant is what the arm's pawl runs on, so if one scales and the other
  // does not, the machine stops being one mechanism. The reward for keeping
  // them locked: at 0.7 the arc band lands at y 90-102, which is the frieze,
  // so the plate is now screwed to the console's own face instead of
  // floating in the air above the terrazzo.
  var QPIV = 186, QS = 0.7;
  var qp = function (r, deg) {
    var a = deg * Math.PI / 180;
    return (180 + r * QS * Math.sin(a)).toFixed(1) + ' ' +
           (QPIV - r * QS * Math.cos(a)).toFixed(1);
  };
  var qr = function (r) { return (r * QS).toFixed(1); };
  q.appendChild(svgEl('path', { d:
    'M ' + qp(148, -22) + ' A ' + qr(148) + ' ' + qr(148) + ' 0 0 1 ' + qp(148, 22) +
    ' L ' + qp(130, 22) + ' A ' + qr(130) + ' ' + qr(130) + ' 0 0 0 ' + qp(130, -22) + ' Z' }, 'q-plate'));
  q.appendChild(svgEl('path', { d:
    'M ' + qp(140, -19) + ' A ' + qr(140) + ' ' + qr(140) + ' 0 0 1 ' + qp(140, 19) }, 'q-face'));
  // ratchet teeth on the inner edge; deep notches at the ±16° detents
  var teeth = '';
  for (var d = -18; d <= 18; d += 4) {
    if (d === -16 || d === 16) continue;
    teeth += 'M ' + qp(130, d) + ' L ' + qp(126, d) + ' ';
  }
  q.appendChild(svgEl('path', { d: teeth }, 'q-teeth'));
  [-16, 16].forEach(function (deg) {
    q.appendChild(svgEl('polygon', { points: [
      qp(126, deg - 1.8), qp(126, deg + 1.8), qp(138, deg + 1.3), qp(138, deg - 1.3)
    ].join(' ') }, 'q-notch'));
  });
  // Steam vent: a stack rising off the cornice above the right pilaster.
  // It used to run down the front of the machine from y=112 to y=202,
  // which — once there was a console there — read as a black post planted
  // through the casework. A vent leaves at the top; pipes must plumb
  // something, and this one now plumbs the housing it stands on.
  // x=240 threads the one gap on this elevation: clear of the arch (ends at
  // 236) and clear of the BUREAU plate (starts at 254). At 292 it stood
  // behind the plate and read as a chimney growing out of the lettering.
  q.appendChild(svgEl('rect', { x: 240, y: 24, width: 11, height: 62 }, 'q-pipe'));
  q.appendChild(svgEl('rect', { x: 237, y: 34, width: 17, height: 2.5 }, 'q-pipe'));
  q.appendChild(svgEl('rect', { x: 237, y: 44, width: 17, height: 2.5 }, 'q-pipe'));
  q.appendChild(svgEl('ellipse', { cx: 245.5, cy: 24, rx: 5.5, ry: 2 }, 'q-slot'));

  // Base flange + gaiter, on the plinth top where the pivot now lands.
  q.appendChild(svgEl('rect', { x: 155, y: 182, width: 50, height: 8, rx: 1 }, 'lv-flange'));
  [159, 165, 175, 181].forEach(function (cx) {
    q.appendChild(svgEl('circle', { cx: cx, cy: 186, r: 1.4 }, 'lv-fbolt'));
  });
  q.appendChild(svgEl('rect', { x: 162, y: 178, width: 36, height: 9, rx: 3 }, 'q-slot'));
  q.appendChild(svgEl('rect', { x: 163, y: 179, width: 34, height: 7, rx: 2.5 }, 'lv-gaiter'));

  // ---- lever (mover) — rebuild with full anatomy ----
  var lv = $('.lever-svg', desk);

  // Inject knurl pattern into a <defs> inside the lever SVG
  var lvDefs = document.createElementNS(NS, 'defs');
  var knurlPat = document.createElementNS(NS, 'pattern');
  knurlPat.setAttribute('id', 'knurl-a');
  knurlPat.setAttribute('x', '0'); knurlPat.setAttribute('y', '0');
  knurlPat.setAttribute('width', '3'); knurlPat.setAttribute('height', '3');
  knurlPat.setAttribute('patternUnits', 'userSpaceOnUse');
  var kl1 = svgEl('line', { x1: 0, y1: 3, x2: 3, y2: 0, stroke: 'var(--bronze-deep)', 'stroke-width': 0.5 });
  var kl2 = svgEl('line', { x1: 0, y1: 0, x2: 3, y2: 3, stroke: 'var(--bronze-deep)', 'stroke-width': 0.5 });
  knurlPat.appendChild(kl1); knurlPat.appendChild(kl2);

  // Engine-turned texture pattern for the grip
  var etPat = document.createElementNS(NS, 'pattern');
  etPat.setAttribute('id', 'tex-et');
  etPat.setAttribute('x', '0'); etPat.setAttribute('y', '0');
  etPat.setAttribute('width', '64'); etPat.setAttribute('height', '64');
  etPat.setAttribute('patternUnits', 'userSpaceOnUse');
  var etImg = document.createElementNS(NS, 'image');
  etImg.setAttribute('href', '/static/assets/tex/engine_turned.png');
  etImg.setAttribute('x', '0'); etImg.setAttribute('y', '0');
  etImg.setAttribute('width', '64'); etImg.setAttribute('height', '64');
  etPat.appendChild(etImg);

  lvDefs.appendChild(knurlPat);
  lvDefs.appendChild(etPat);
  lv.appendChild(lvDefs);

  // 1. Arm body (tapered, I-beam outer silhouette)
  lv.appendChild(svgEl('polygon', { points: '63.5,206 76.5,206 75,30 65,30' }, 'lv-arm'));
  // 2. Arm lit strip (left edge highlight)
  lv.appendChild(svgEl('polygon', { points: '63.5,206 65.5,206 64,30 63.5,30' }, 'lv-arm-lit'));
  // 3. Arm shadow strip (right edge)
  lv.appendChild(svgEl('polygon', { points: '75.5,30 76.5,206 75,206 74,30' }, 'lv-arm-shd'));
  // 4. I-beam web relief (center, slightly lighter to suggest recessed web)
  lv.appendChild(svgEl('polygon', { points: '67,190 73,190 72,50 68,50' }, 'lv-web'));
  // 5-8. Web rivets × 4 — per-index radius micro-variation for individuality
  var rivetRad = [2.1, 1.8, 2.2, 1.9];
  [165, 140, 115, 80].forEach(function (cy, si) {
    var rv = svgEl('circle', { cx: 70, cy: cy, r: rivetRad[si] }, 'lv-rivet');
    rv.style.setProperty('--si', String(si));
    lv.appendChild(rv);
  });
  // 9. Pivot pin boss
  lv.appendChild(svgEl('circle', { cx: 70, cy: 202, r: 8 }, 'lv-pin-boss'));
  // 10. Pivot pin boss lit arc (300°-60° in SVG = upper-left)
  lv.appendChild(svgEl('path', {
    d: 'M ' + (70 + 8 * Math.cos(300 * DEG)).toFixed(2) + ',' + (202 + 8 * Math.sin(300 * DEG)).toFixed(2) +
       ' A 8 8 0 0 1 ' + (70 + 8 * Math.cos(60 * DEG)).toFixed(2) + ',' + (202 + 8 * Math.sin(60 * DEG)).toFixed(2)
  }, 'lv-pin-lit'));
  // 11. Pivot pin hole
  lv.appendChild(svgEl('circle', { cx: 70, cy: 202, r: 3 }, 'lv-pin-hole'));
  // 12. Cotter slot
  lv.appendChild(svgEl('rect', { x: 67.5, y: 204.5, width: 5, height: 1.5 }, 'lv-cotter'));
  // 13. Pawl housing block
  lv.appendChild(svgEl('rect', { x: 77, y: 170, width: 7, height: 12 }, 'lv-pawl-body'));
  // 14. Pawl blade
  lv.appendChild(svgEl('polygon', { points: '79.5,170 83,170 83.5,163 79,163.5' }, 'lv-pawl'));
  // 15. Pawl spring coil path
  lv.appendChild(svgEl('path', {
    d: 'M 83,168 Q 84.5,166 86,168 Q 87.5,170 89,168 Q 90.5,166 92,168'
  }, 'lv-spring'));
  // 16. Detent roller
  lv.appendChild(svgEl('circle', { cx: 79, cy: 182, r: 2.5 }, 'lv-roller'));
  // 17. Detent roller shadow (sector 120°-300°)
  lv.appendChild(svgEl('path', {
    d: 'M ' + (79 + 2.5 * Math.cos(120 * DEG)).toFixed(2) + ',' + (182 + 2.5 * Math.sin(120 * DEG)).toFixed(2) +
       ' A 2.5 2.5 0 1 1 ' + (79 + 2.5 * Math.cos(300 * DEG)).toFixed(2) + ',' + (182 + 2.5 * Math.sin(300 * DEG)).toFixed(2) + ' Z'
  }, 'lv-roller-shd'));
  // 18. Linkage clevis body
  lv.appendChild(svgEl('rect', { x: 62, y: 195, width: 8, height: 10, rx: 1 }, 'lv-clevis'));
  // 19-20. Clevis tines × 2
  lv.appendChild(svgEl('rect', { x: 60, y: 198, width: 3, height: 7 }, 'lv-clevis-t'));
  lv.appendChild(svgEl('rect', { x: 67, y: 198, width: 3, height: 7 }, 'lv-clevis-t'));
  // 21. Grip ferrule collar
  lv.appendChild(svgEl('rect', { x: 62, y: 60, width: 16, height: 6, rx: 1 }, 'lv-ferrule'));
  // 22. Grip body (polished, wing-metal)
  lv.appendChild(svgEl('rect', { x: 63, y: 16, width: 14, height: 50, rx: 7 }, 'lv-grip'));
  // Engine-turned texture over the grip (above grip, below knurl)
  lv.appendChild(svgEl('rect', { x: 63, y: 16, width: 14, height: 50, rx: 7,
    fill: 'url(#tex-et)' }, 'lv-tex-et'));
  // 23. Knurl pattern rect
  lv.appendChild(svgEl('rect', { x: 63, y: 22, width: 14, height: 38, rx: 7 }, 'lv-knurl'));
  // 24. End cap ellipse
  lv.appendChild(svgEl('ellipse', { cx: 70, cy: 16, rx: 7, ry: 3.5 }, 'lv-endcap'));
  // 25. End cap highlight
  lv.appendChild(svgEl('ellipse', { cx: 68, cy: 15, rx: 3, ry: 1.5 }, 'lv-endcap-lit'));
  // 26. Number plate (existing lv-plate)
  lv.appendChild(svgEl('circle', { cx: 70, cy: 120, r: 9 }, 'lv-plate'));
  // 27. Number plate knurled edge ring
  lv.appendChild(svgEl('circle', { cx: 70, cy: 120, r: 9 }, 'lv-plate-ring'));
  // 28/29. Number texts — CSS data-wing toggles visibility
  var num1 = svgEl('text', { x: 70, y: 124.5, 'text-anchor': 'middle' }, 'lv-plate-t lv-num-1');
  num1.textContent = '1';
  lv.appendChild(num1);
  var num2 = svgEl('text', { x: 70, y: 124.5, 'text-anchor': 'middle' }, 'lv-plate-t lv-num-2');
  num2.textContent = '2';
  lv.appendChild(num2);
  // 30. Return spring coil (below pivot)
  lv.appendChild(svgEl('path', {
    d: 'M 70,202 Q 73,206 70,210 Q 67,214 70,218 Q 73,222 70,226'
  }, 'lv-rspring'));

  // ---- gear pair (movers) — placed on exact mesh geometry ----
  var rpA = GEAR_NA * GEAR_M / 2, rpB = GEAR_NB * GEAR_M / 2;
  var phi = GEAR_PHI * Math.PI / 180;
  // gearA center in the well. The well is 112×60 now (was 176×56): narrower
  // than the 88-wide gear crossing it, so the wheel reads as ROUND instead
  // of as a shallow band. The pair is set so the MESH POINT — the one place
  // the drive train is legible — lands at (75, 43), inside the arch.
  var ax = 38, ay = 56;
  var bx = ax + (rpA + rpB) * Math.cos(phi);
  var by = ay + (rpA + rpB) * Math.sin(phi);
  // interleave phase: ((1 + NA/NB)·φ + 180 − 180/NB) mod (360/NB)
  var phaseB = (((1 + GEAR_NA / GEAR_NB) * GEAR_PHI + 180 - 180 / GEAR_NB)
                % (360 / GEAR_NB) + 360 / GEAR_NB) % (360 / GEAR_NB);
  var gA = $('.gearA-svg', desk), gB = $('.gearB-svg', desk);

  // ---- Gear A — 18 teeth, viewBox -52 -52 104 104 ----
  // Dimensions: rp=39.6, ra=40.6, rr=34.1
  var GA_RP = 39.6, GA_RA = 40.6, GA_RR = 34.1;
  var GA_HUB = 10.5, GA_RIM_WEB = 28.0, GA_WEB_IN = 10.5;
  var GA_HALF = 0.16;

  var wrapA = svgEl('g', {});

  // 1. Rim body — teeth profile only (gearPath with no spokes/bore options)
  wrapA.appendChild(svgEl('path', {
    d: gearPath(GEAR_NA, GEAR_M, {}), 'fill-rule': 'evenodd'
  }, 'ga-rim'));

  // 2/3. Rim lit/shadow arcs at ra+0.6=41.2
  var rimR = 41.2;
  wrapA.appendChild(svgEl('path', {
    d: 'M ' + P(rimR, 330 * DEG) + ' A ' + rimR + ' ' + rimR + ' 0 0 1 ' + P(rimR, 160 * DEG)
  }, 'ga-rim-lit'));
  wrapA.appendChild(svgEl('path', {
    d: 'M ' + P(rimR, 160 * DEG) + ' A ' + rimR + ' ' + rimR + ' 1 1 1 ' + P(rimR, 330 * DEG)
  }, 'ga-rim-shd'));

  // 4. Tooth-root fillet band at rr-1.2=32.9
  wrapA.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 32.9 }, 'ga-fillet'));

  // 5/6. Tip wear flat + chamfer (18 mini-arcs each)
  var tipLitD = '', tipShdD = '';
  for (var ti = 0; ti < 18; ti++) {
    var tc = ti * (2 * Math.PI / 18);
    tipLitD += 'M ' + P(40.2, tc - 0.05) + ' A 40.2 40.2 0 0 1 ' + P(40.2, tc + 0.05) + ' ';
    tipShdD += 'M ' + P(40.2, tc + 0.05) + ' A 40.2 40.2 0 0 1 ' + P(40.2, tc + 0.10) + ' ';
  }
  wrapA.appendChild(svgEl('path', { d: tipLitD }, 'ga-tip-lit'));
  wrapA.appendChild(svgEl('path', { d: tipShdD }, 'ga-tip-shd'));

  // 7. Web disc background
  wrapA.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 28.0 }, 'ga-web'));

  // 8. Web shadow crescent (lower-right: 150°-330°)
  wrapA.appendChild(svgEl('path', { d: sectorPath(28, 150 * DEG, 330 * DEG) }, 'ga-web-shd'));
  // 9. Web highlight crescent (upper-left: 330°-150° going the short way = -30° to 150°)
  wrapA.appendChild(svgEl('path', { d: sectorPath(28, 330 * DEG - 2 * Math.PI, 150 * DEG) }, 'ga-web-lit'));

  // 10-14 (spokes) + 15-19 (fillet shoulders) — 5 of each
  for (var s = 0; s < 5; s++) {
    var a0 = s * 2 * Math.PI / 5 + GA_HALF;
    var a1 = (s + 1) * 2 * Math.PI / 5 - GA_HALF;
    var spkD = 'M ' + P(GA_HUB, a0) + ' A ' + GA_HUB + ' ' + GA_HUB + ' 0 0 1 ' + P(GA_HUB, a1) +
               ' L ' + P(GA_RIM_WEB, a1) + ' A ' + GA_RIM_WEB + ' ' + GA_RIM_WEB + ' 0 0 0 ' + P(GA_RIM_WEB, a0) + ' Z';
    wrapA.appendChild(svgEl('path', { d: spkD }, 'ga-spoke'));
    // Fillet shoulder: tiny dark quad at spoke-hub junction
    var fs = 'M ' + P(GA_HUB, a0 - 0.05) + ' L ' + P(GA_HUB, a0 + 0.05) +
             ' L ' + P(12, a0 + 0.08) + ' L ' + P(12, a0 - 0.08) + ' Z';
    wrapA.appendChild(svgEl('path', { d: fs }, 'ga-spoke-shd'));
  }

  // 20-24. Lightening holes × 5 (midway between spokes, r=19)
  // Per-index radius micro-variation makes each hole feel individually machined.
  var lholeRad = [3.5, 3.1, 3.7, 3.3, 3.6];
  for (var s = 0; s < 5; s++) {
    var lhA = (s + 0.5) * 2 * Math.PI / 5;
    var lhEl = svgEl('circle', {
      cx: (19 * Math.cos(lhA)).toFixed(2),
      cy: (19 * Math.sin(lhA)).toFixed(2),
      r: lholeRad[s]
    }, 'ga-lhole');
    lhEl.style.setProperty('--si', String(s));
    wrapA.appendChild(lhEl);
  }

  // 25. Hub boss outer ring
  wrapA.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 9.5 }, 'ga-boss'));
  // 26. Hub boss lit arc (330°-90°)
  wrapA.appendChild(svgEl('path', {
    d: 'M ' + P(9.5, 330 * DEG) + ' A 9.5 9.5 0 0 1 ' + P(9.5, 90 * DEG)
  }, 'ga-boss-lit'));
  // 27. Hub boss shadow arc (90°-330°)
  wrapA.appendChild(svgEl('path', {
    d: 'M ' + P(9.5, 90 * DEG) + ' A 9.5 9.5 0 1 1 ' + P(9.5, 330 * DEG)
  }, 'ga-boss-shd'));

  // 28. Bore
  wrapA.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 3.2 }, 'ga-bore'));
  // 29. Keyway slot (12 o'clock = -y direction)
  wrapA.appendChild(svgEl('rect', { x: -1.6, y: -9.5, width: 3.2, height: 6.3 }, 'ga-keyway'));
  // 30. Key in keyway
  wrapA.appendChild(svgEl('rect', { x: -1.2, y: -9.4, width: 2.4, height: 5.8 }, 'ga-key'));

  // 31. Set-screw boss (at 12 o'clock on hub boss surface)
  wrapA.appendChild(svgEl('circle', { cx: 0, cy: -9.5, r: 1.8 }, 'ga-ssboss'));
  // 32. Set-screw hex recess — 6 pts inscribed r=0.9 at (0,-9.5)
  var hexPts = [];
  for (var hi = 0; hi < 6; hi++) {
    var ha = hi * Math.PI / 3;
    hexPts.push((0.9 * Math.cos(ha)).toFixed(2) + ',' + (-9.5 + 0.9 * Math.sin(ha)).toFixed(2));
  }
  wrapA.appendChild(svgEl('polygon', { points: hexPts.join(' ') }, 'ga-sshex'));

  // 33-37. Bolt circle × 5 pin holes at r=22, offset 36° to sit between lholes+spokes
  // Per-index stroke-width micro-variation (±0.25) simulates individual drilling.
  var bholeStroke = [1.0, 0.75, 1.25, 0.75, 1.0];
  for (var s = 0; s < 5; s++) {
    var bhA = (s + 0.5) * 2 * Math.PI / 5 + Math.PI / 5;
    var bhEl = svgEl('circle', {
      cx: (22 * Math.cos(bhA)).toFixed(2),
      cy: (22 * Math.sin(bhA)).toFixed(2),
      r: 1.8
    }, 'ga-bhole');
    bhEl.style.setProperty('--si', String(s));
    bhEl.style.strokeWidth = bholeStroke[s];
    wrapA.appendChild(bhEl);
  }

  // 38. Witness mark scribe circle at r=24.5
  wrapA.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 24.5 }, 'ga-witness'));

  // 39. Index/timing mark on tooth 0 (at angle 0 = +x = 3 o'clock in SVG)
  // Two radial ticks: long at ra-1 to ra-2.5, short at ra to ra-0.8
  wrapA.appendChild(svgEl('path', {
    d: 'M ' + P(39, 0) + ' L ' + P(36.5, 0) + ' M ' + P(41, 0) + ' L ' + P(40, 0)
  }, 'ga-index'));

  // 40. Cast part number plate background
  wrapA.appendChild(svgEl('rect', { x: -10, y: 14, width: 20, height: 7, rx: 0.5 }, 'ga-pno-bg'));
  // 41. Cast part number text
  var pnoT = svgEl('text', { x: 0, y: 20, 'text-anchor': 'middle' }, 'ga-pno-t');
  pnoT.textContent = 'GA-18';
  wrapA.appendChild(pnoT);

  gA.appendChild(wrapA);

  // ---- Gear B — 9 teeth, viewBox -30 -30 60 60 ----
  var wrapB = svgEl('g', { transform: 'rotate(' + phaseB.toFixed(2) + ')' });

  // 1. Rim body — teeth only
  wrapB.appendChild(svgEl('path', {
    d: gearPath(GEAR_NB, GEAR_M, {}), 'fill-rule': 'evenodd'
  }, 'gb-rim'));

  // 2/3. Rim lit/shadow arcs at ra+0.6 (computed from GEAR_NB, GEAR_M)
  var bRimR = GEAR_NB * GEAR_M / 2 + GEAR_M + 0.6;   // rp+m+0.6 = 24.8
  wrapB.appendChild(svgEl('path', {
    d: 'M ' + P(bRimR, 330 * DEG) + ' A ' + bRimR + ' ' + bRimR + ' 0 0 1 ' + P(bRimR, 160 * DEG)
  }, 'gb-rim-lit'));
  wrapB.appendChild(svgEl('path', {
    d: 'M ' + P(bRimR, 160 * DEG) + ' A ' + bRimR + ' ' + bRimR + ' 1 1 1 ' + P(bRimR, 330 * DEG)
  }, 'gb-rim-shd'));

  // 4. Fillet band at rr-0.7 (computed from GEAR_NB, GEAR_M)
  var bFilletR = GEAR_NB * GEAR_M / 2 - 1.25 * GEAR_M - 0.7; // rr-0.7 = 13.6
  wrapB.appendChild(svgEl('circle', { cx: 0, cy: 0, r: bFilletR }, 'gb-fillet'));

  // 5. Web disc
  wrapB.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 13.5 }, 'gb-web'));

  // 6. Web shadow crescent (lower-right: 150°-330°)
  wrapB.appendChild(svgEl('path', { d: sectorPath(13.5, 150 * DEG, 330 * DEG) }, 'gb-web-shd'));
  // 6b. Web highlight crescent (upper-left: 330°-150° going the short way)
  wrapB.appendChild(svgEl('path', { d: sectorPath(13.5, 330 * DEG - 2 * Math.PI, 150 * DEG) }, 'gb-web-lit'));

  // 7-9. Spoke arms × 3 (broader half-angle=0.18)
  var GB_HALF = 0.18;
  for (var s = 0; s < 3; s++) {
    var ba0 = s * 2 * Math.PI / 3 + GB_HALF;
    var ba1 = (s + 1) * 2 * Math.PI / 3 - GB_HALF;
    var bSpkD = 'M ' + P(7.5, ba0) + ' A 7.5 7.5 0 0 1 ' + P(7.5, ba1) +
                ' L ' + P(13.5, ba1) + ' A 13.5 13.5 0 0 0 ' + P(13.5, ba0) + ' Z';
    wrapB.appendChild(svgEl('path', { d: bSpkD }, 'gb-spoke'));
  }

  // 10. Hub flange outer ring
  wrapB.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 6.0 }, 'gb-flange'));
  // 11. Hub flange step lit arc (330°-90°)
  wrapB.appendChild(svgEl('path', {
    d: 'M ' + P(5.0, 330 * DEG) + ' A 5 5 0 0 1 ' + P(5.0, 90 * DEG)
  }, 'gb-fl-lit'));
  // 12. Hub flange step shadow arc (90°-330°)
  wrapB.appendChild(svgEl('path', {
    d: 'M ' + P(5.0, 90 * DEG) + ' A 5 5 0 1 1 ' + P(5.0, 330 * DEG)
  }, 'gb-fl-shd'));

  // 13. D-flat bore background
  wrapB.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 2.5 }, 'gb-bore'));
  // 14. D-flat chord mask (clips the flat on one side of the bore)
  wrapB.appendChild(svgEl('rect', { x: -2.5, y: 1.8, width: 5.0, height: 1.0 }, 'gb-dflat'));

  // 15/16. Tip wear flat + chamfer (9 mini-arcs each, at tooth tips)
  var bTipR = GEAR_NB * GEAR_M / 2 + GEAR_M - 0.4; // ra-0.4 = 23.8
  var bTipLitD = '', bTipShdD = '';
  for (var ti = 0; ti < 9; ti++) {
    var btc = ti * (2 * Math.PI / 9);
    bTipLitD += 'M ' + P(bTipR, btc - 0.07) + ' A ' + bTipR + ' ' + bTipR + ' 0 0 1 ' + P(bTipR, btc + 0.07) + ' ';
    bTipShdD += 'M ' + P(bTipR, btc + 0.07) + ' A ' + bTipR + ' ' + bTipR + ' 0 0 1 ' + P(bTipR, btc + 0.14) + ' ';
  }
  wrapB.appendChild(svgEl('path', { d: bTipLitD }, 'gb-tip-lit'));
  wrapB.appendChild(svgEl('path', { d: bTipShdD }, 'gb-tip-shd'));

  // 17. Serial ring (dotted circle)
  wrapB.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 11.5 }, 'gb-serial'));

  // 18. Serial number text
  var snoT = svgEl('text', { x: 0, y: 14, 'text-anchor': 'middle' }, 'gb-sno');
  snoT.textContent = 'GB-9';
  wrapB.appendChild(snoT);

  // 19. Index mark on tooth 0 (one tick, distinct from A's double tick)
  wrapB.appendChild(svgEl('path', {
    d: 'M ' + P(20, 0) + ' L ' + P(18, 0)
  }, 'gb-index'));

  gB.appendChild(wrapB);

  gA.style.left = (ax - 52) + 'px'; gA.style.top = (ay - 52) + 'px';
  gB.style.left = (bx - 30).toFixed(1) + 'px'; gB.style.top = (by - 30).toFixed(1) + 'px';
}

/* The one machined ring allowed above the ticker: a knurl band appended to
   the rosette def (live <use> instances update automatically). */
function buildRosetteKnurl() {
  var def = document.getElementById('rosette');
  if (!def) return;
  var g = svgEl('g', { 'stroke-width': '1' });
  for (var i = 0; i < 24; i++) {
    var a = i * 15 * Math.PI / 180;
    g.appendChild(svgEl('line', {
      x1: (24 + 20.8 * Math.sin(a)).toFixed(2), y1: (24 - 20.8 * Math.cos(a)).toFixed(2),
      x2: (24 + 22.6 * Math.sin(a)).toFixed(2), y2: (24 - 22.6 * Math.cos(a)).toFixed(2)
    }));
  }
  def.appendChild(g);
}

/* Steam — event-only. 4–6 soft sprites per burst, randomized via inline
   custom properties; cleanup on animationend plus a safety timeout. */
var MAX_PUFFS = 14, STEAM_WIND = 9;
function steamBurst(nozzleEl, n) {
  if (!nozzleEl || root.dataset.motion === 'reduced') return;
  if (nozzleEl.childElementCount > MAX_PUFFS - n) return;
  for (var i = 0; i < n; i++) {
    var p = document.createElement('div');
    p.className = 'puff';
    var dur = Math.round(900 + Math.random() * 600);
    var delay = Math.round(Math.random() * 120);
    p.style.cssText =
      '--dx:' + Math.round(Math.random() * 28 - 14 + STEAM_WIND) + 'px;' +
      '--rise:' + Math.round(-(60 + Math.random() * 50)) + 'px;' +
      '--s:' + (2.2 + Math.random() * 0.8).toFixed(2) + ';' +
      '--rot:' + Math.round(Math.random() * 80 - 40) + 'deg;' +
      'animation-duration:' + dur + 'ms;animation-delay:' + delay + 'ms;';
    p.addEventListener('animationend', function (e) { e.target.remove(); }, { once: true });
    (function (el, t) { setTimeout(function () { el.remove(); }, t); })(p, dur + delay + 120);
    nozzleEl.appendChild(p);
  }
}

/* Weighty throw: fast start → ~4.5% overshoot → damped clank settle.
   C0-continuous at the seam; identical feel both directions. */
function easeWeighty(t) {
  if (t >= 1) return 1;
  var MAIN = 0.78, OVER = 0.045;
  if (t < MAIN) {
    var u = t / MAIN;
    return (1 + OVER) * (1 - Math.pow(1 - u, 3.1));
  }
  var v = (t - MAIN) / (1 - MAIN);
  return 1 + OVER * Math.cos(v * Math.PI * 2.2) * Math.exp(-4.5 * v);
}

var deskRaf = null;
function setDrive(v) { root.style.setProperty('--drive', v.toFixed(4)); }
function getDrive() {
  var v = parseFloat(getComputedStyle(root).getPropertyValue('--drive'));
  return isNaN(v) ? 0 : v;
}

/* Interrupt-safe rAF driver: a re-toggle mid-throw reads the current
   --drive as its new start. Steam fires once past 55% of the throw
   (latched). Reduced motion: snap — the gears stay correct for free. */
function deskDrive(target) {
  if (!desk) return;
  cancelAnimationFrame(deskRaf);
  // Hidden pages never fire rAF — land the mechanism instantly.
  if (root.dataset.motion === 'reduced' ||
      document.visibilityState === 'hidden') { setDrive(target); return; }
  var from = getDrive(), t0 = performance.now(), DUR = 520;
  var latched = false;
  var frame = function (now) {
    // The Motion preference can flip (or the tab hide) mid-throw — land it.
    if (root.dataset.motion === 'reduced' ||
        document.visibilityState === 'hidden') { setDrive(target); return; }
    var t = Math.min(1, (now - t0) / DUR);
    var p = from + (target - from) * easeWeighty(t);
    setDrive(t === 1 ? target : p);
    var prog = target === 1 ? p : 1 - p;
    if (!latched && prog > 0.55) { latched = true; steamBurst(deskNozzle, 5); }
    if (t < 1) deskRaf = requestAnimationFrame(frame);
  };
  deskRaf = requestAnimationFrame(frame);
}

/* ========================================================================
   Gates
   ======================================================================== */
function svgUse(cls, viewBox, ref) {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  var use = document.createElementNS(ns, 'use');
  use.setAttribute('href', ref);
  svg.appendChild(use);
  return svg;
}

/* <use> content lives in a shadow DOM that descendant CSS can't reach.
   The gate frame needs per-segment styling (.fs1-.fs4 sequential lighting),
   so it gets a real-DOM clone instead of a <use>. */
function svgClone(cls, viewBox, defId) {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  var g = document.getElementById(defId).cloneNode(true);
  g.removeAttribute('id');
  svg.appendChild(g);
  return svg;
}

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/* Every wing stands in pairs either side of the clock, so the clock never
   has to give up the axis. A wing with an odd number of services gets one
   reserved gate at its right-hand end; the day a new service registers in
   that wing it takes the slot, and the reserved gate is gone. Placeholders
   live only here, in the stage's view of the registry: status, stats, the
   Ledger and the ticker all keep reading the real `services`. */
function slots() {
  var out = services.slice();
  var wings = [];
  services.forEach(function (s) { if (wings.indexOf(s.wing) < 0) wings.push(s.wing); });
  wings.forEach(function (w) {
    var n = services.filter(function (s) { return s.wing === w; }).length;
    if (n % 2 === 1) {
      out.push({ id: 'vacant-' + w, wing: w, vacant: true,
                 name: 'RESERVED', order: 1e6 });
    }
  });
  return out;
}

/* Gates are absolutely positioned, so DOM order is free — keep it
   active-wing-first so the tab order is active → receded in both wings. */
function gateDomOrder() {
  var wing = root.dataset.wing;
  return slots().sort(function (a, b) {
    var aw = a.wing === wing ? 0 : 1;
    var bw = b.wing === wing ? 0 : 1;
    return aw - bw || a.order - b.order;
  });
}

function renderGates() {
  var wrap = $('#gates');
  wrap.textContent = '';
  // One identity per gate, off a fixed hash of its id (palace.js): the
  // archivolts, the relief programme, the fanlight and the velvet.
  var idents = window.Palace ? window.Palace.identities(slots()) : {};
  gateDomOrder().forEach(function (svc, i) {
    // A reserved gate opens onto nothing, so it is not a link and not a tab
    // stop, and a screen reader has nothing to be told about it.
    var a = el(svc.vacant ? 'div' : 'a', 'gate' + (svc.vacant ? ' vacant' : ''));
    var id = idents[svc.id] || {};
    a.id = 'gate-' + svc.id;
    if (svc.vacant) {
      a.setAttribute('aria-hidden', 'true');
    } else {
      a.href = svc.url;
      // Named by its engraved name and its lamp, described by everything
      // else it says. An aria-label of the bare name used to hide the lamp,
      // the description and the status line from a screen reader.
      a.setAttribute('aria-labelledby', 'gn-' + svc.id + ' gl-' + svc.id);
      a.setAttribute('aria-describedby', ['gd-', 'gs-', 'gnote-', 'gx-']
        .map(function (p) { return p + svc.id; }).join(' ') + ' opens-tab');
    }
    a.dataset.service = svc.id;
    a.dataset.state = svc.vacant ? 'vacant' : 'checking';
    a.dataset.wing = svc.wing;
    a.dataset.velvet = id.velvet || 'claret';
    a.dataset.glass = id.glass || 'amber';
    // The day screen's title card: an intertitle border, the gate's own.
    a.dataset.card = id.card || 'fans';
    a.style.setProperty('--gi', String(i));
    a.style.setProperty('--folds', String(id.folds || 9));
    a.style.setProperty('--fold-x', (id.foldX || 0) + '%');

    // 3D chain: pose (static wing tilt) > shell (pointer parallax) > flat
    // children — the intra-gate z-index stack survives inside the shell.
    var pose = el('div', 'g-pose');
    var shell = el('div', 'g-shell');
    shell.appendChild(el('div', 'g-back'));
    var ns = 'http://www.w3.org/2000/svg';
    var portal = document.createElementNS(ns, 'svg');
    portal.setAttribute('class', 'portal');
    portal.setAttribute('viewBox', '0 0 300 570');
    portal.setAttribute('aria-hidden', 'true');
    if (window.Palace) portal.innerHTML = window.Palace.portal('p-' + svc.id, id);
    shell.appendChild(portal);

    var face = el('div', 'face');
    // The gate wears the service's own mark — the same one its favicon, its
    // taskbar tile and its own masthead show. One identity per service. It
    // is mounted on the cartouche at the fanlight's hub.
    var sig = KNOWN_SIGILS[svc.sigil] ? svc.sigil : null;
    face.appendChild(sig
      ? svgUse('sigil mark', '0 0 96 96', '#mark-' + sig)
      : svgUse('sigil', '0 0 96 96', '#sig-fallback'));
    // The name is signage on the transom: gilt behind black glass.
    var sign = el('div', 'g-sign');
    var gname = el('h3', 'g-name display', svc.name);
    gname.id = 'gn-' + svc.id;
    if (svc.vacant) gname.title = t('vacantName');
    gname.lang = 'en';                 // signage stays English in both languages
    sign.appendChild(gname);
    face.appendChild(sign);
    // The house: the velvet tabs, the valance, the footlights and, before the
    // show, the description thrown onto the closed curtain by the projector.
    var house = el('div', 'g-house');
    house.appendChild(el('div', 'g-screen'));
    if (svc.vacant) house.appendChild(el('div', 'g-iron'));
    house.appendChild(el('div', 'g-tab g-tab-l'));
    house.appendChild(el('div', 'g-tab g-tab-r'));
    house.appendChild(el('div', 'g-valance'));
    house.appendChild(el('div', 'g-foot lit'));
    house.appendChild(el('div', 'g-pool lit'));
    var gdesc = el('p', 'g-desc', t(descKey(svc)));
    gdesc.id = 'gd-' + svc.id;
    house.appendChild(gdesc);
    face.appendChild(house);
    // The apron: the stage front, with the house's live line, its address
    // and the lamp.
    var apron = el('div', 'g-apron');
    var stat = el('div', 'g-stat');
    stat.id = 'gs-' + svc.id;
    stat.appendChild(el('span', 'num-roll num', ''));
    apron.appendChild(stat);
    apron.appendChild(el('div', 'g-addr addr', svc.vacant ? '' : svc.addr));
    var lamp = el('div', 'g-lamp');
    lamp.appendChild(el('span', 'lamp-d'));
    var lampT = el('span', 'lamp-t display', svc.vacant ? 'SHUT' : '…');
    if (svc.vacant) lampT.title = t('vacantLamp');
    lampT.lang = 'en';
    lampT.setAttribute('aria-hidden', 'true');
    lamp.appendChild(lampT);
    var lampSr = el('span', 'sr-only lamp-sr', '');
    lampSr.id = 'gl-' + svc.id;
    lamp.appendChild(lampSr);
    apron.appendChild(lamp);
    // A service's own warning (qBittorrent down, the daemon stalled, a
    // stale edition) used to live only in the lamp's hover title. It is
    // engraved on the apron under the lamp instead, where focus and touch
    // reach it too.
    var note = el('div', 'g-note');
    note.id = 'gnote-' + svc.id;
    note.hidden = true;
    apron.appendChild(note);
    face.appendChild(apron);
    shell.appendChild(face);

    shell.appendChild(el('div', 'g-veil'));
    // Waxed stone: the portal stands in the floor. The reflection is built
    // from the portal's own values (gilt jambs, the velvet, the lit fanlight
    // at the far end), each a soft gradient, so it needs no live blur.
    var mirror = el('div', 'g-mirror');
    mirror.setAttribute('aria-hidden', 'true');
    if (window.Palace) {
      var msvg = document.createElementNS(ns, 'svg');
      msvg.setAttribute('class', 'mirror-art');
      msvg.setAttribute('viewBox', '0 0 300 570');
      msvg.setAttribute('preserveAspectRatio', 'none');
      msvg.innerHTML = window.Palace.mirror('p-' + svc.id, id);
      mirror.appendChild(msvg);
    }
    shell.appendChild(mirror);
    // At night a lit house spills its light out over the threshold onto the
    // stone: a warm pool, lit with the fanlight, gone by day.
    shell.appendChild(el('div', 'g-spill lit'));
    pose.appendChild(shell);
    a.appendChild(pose);
    // The launch-hint notice stays screen-flat, outside the tilt chain.
    var notice = el('div', 'g-notice');
    notice.id = 'gx-' + svc.id;
    notice.hidden = true;
    a.appendChild(notice);

    if (!svc.vacant) a.addEventListener('click', function (e) { gateClick(e, a, svc); });
    wrap.appendChild(a);
  });
  layoutStage(true);
  applyStatuses();
  applyStats();
}

/* A future registry entry with no dictionary string falls back to the
   generic description instead of rendering the raw key. */
function descKey(svc) {
  if (svc.vacant) return 'desc.vacant';
  var key = 'desc.' + svc.desc_key;
  return STR.en[key] !== undefined ? key : 'desc.fallback';
}

function gateClick(e, a, svc) {
  e.preventDefault();
  if (a.dataset.state === 'dark') {
    var n = $('.g-notice', a);
    n.textContent = t('darkNotice', { hint: svc.launch_hint || svc.url });
    n.hidden = !n.hidden;
    // Shown on screen, so said out loud once as well.
    if (!n.hidden) { var hs = $('#hall-status'); if (hs) hs.textContent = n.textContent; }
    return;
  }
  a.classList.add('flash');
  a.classList.add('opening');
  setTimeout(function () { a.classList.remove('flash'); }, 180);
  // The tabs fly within the flash; they fall back once the new tab has the
  // reader, so the house is closed again when they come back to the hall.
  setTimeout(function () { a.classList.remove('opening'); }, 1600);
  setTimeout(function () {
    // Named window: each service reuses one tab instead of littering.
    window.open(svc.url, 'atrium-' + svc.id);
  }, 150);
}

/* Triptych stage: slots computed from the registry so future services
   flank symmetrically. Transform-only (60 fps law). */
function layoutStage(initial) {
  var wrap = $('#gates');
  var W = wrap.clientWidth;
  if (!W) return;
  var wing = root.dataset.wing;
  var first = wrap.querySelector('.gate');
  var all = slots();
  var active = all.filter(function (s) { return s.wing === wing; });
  var receded = all.filter(function (s) { return s.wing !== wing; });
  var clock = $('#clock');
  var stage = $('#stage');

  /* Only the lit wing stands in the hall. The other wing waits behind the
     lever: its arches used to flank the row at 0.62, but with the clock
     holding the axis and the wings in pairs there is no width left for them
     that does not either shrink every arch by a fifth or let one arch cover
     another, and nothing on this stage may cover anything (the owner's rule,
     after a flank spent a release half hidden behind its neighbour).
     The row is solved as one line, [arches] [clock] [arches]; if it is wider
     than the stage, the whole arch module (arches and niche together, via
     --fit) comes down until it is not. Widths are measured at fit 1 so the
     solve does not chase its own output. */
  var fitNow = parseFloat(stage.style.getPropertyValue('--fit')) || 1;
  var g0 = (first ? first.offsetWidth : 260) / fitNow;
  var c0 = clock ? clock.offsetWidth / fitNow : 0;
  var PITCH = 1.16;        // arch centre to arch centre, in gate widths
  var CLEAR = 0.10;        // clock to its nearest arch
  var nSide = Math.ceil(active.length / 2);
  var rowG = 2 * CLEAR + 2 * (nSide ? 1 + (nSide - 1) * PITCH : 0);
  var fit = Math.min(1, (W * 0.985) / (c0 + g0 * rowG));
  if (Math.abs(fit - fitNow) > 0.002) stage.style.setProperty('--fit', fit.toFixed(4));
  var gateW = g0 * fit;
  var spacing = gateW * PITCH;

  /* The clock holds the axis: active gates split evenly to either side of the
     niche rather than straddling the centre. */
  var half = clock ? (c0 * fit) / 2 + gateW * CLEAR : 0;

  // The active gates split equally to either side of the clock; slots()
  // has already made the count even, so the dial keeps the axis at full size.
  var perSide = Math.floor(active.length / 2);
  var leftActives = active.slice(0, perSide);          // outermost → innermost
  var rightActives = active.slice(perSide);            // innermost → outermost

  function placeActive(svc, x, side, order) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    a.classList.add('active'); a.classList.remove('receded');
    // Depth order is set here, not left to DOM order (absolutely positioned
    // siblings), so a gate sweeping out to a flank drops behind before it
    // travels rather than eclipsing the pair coming forward.
    a.style.zIndex = '3';
    a.style.setProperty('--slot-x', x + 'px');
    a.style.setProperty('--slot-s', '1');
    a.style.setProperty('--sink', '0px');   // a former centre gate rises back
    a.style.setProperty('--side', String(side));
    a.style.setProperty('--slot-delay', initial ? '0ms' : (80 + order * 60) + 'ms');
  }
  leftActives.forEach(function (svc, i) {
    var rank = leftActives.length - 1 - i;                  // 0 = nearest clock
    placeActive(svc, -(half + gateW / 2 + rank * spacing), 0.55, i);
  });
  rightActives.forEach(function (svc, i) {
    placeActive(svc, +(half + gateW / 2 + i * spacing), -0.55, i);   // mirror
  });
  // The waiting wing stands exactly where its counterparts stand, out of the
  // room: a throw of the lever lets one wing's arches sink and fade while the
  // other's rise in the same bays, so the doors change places rather than
  // slide across the hall. It is inert while it waits, so it takes no tab
  // stop, no pointer and no screen-reader attention.
  var slotX = [];
  leftActives.forEach(function (svc, i) {
    slotX.push(-(half + gateW / 2 + (leftActives.length - 1 - i) * spacing));
  });
  rightActives.forEach(function (svc, i) {
    slotX.push(+(half + gateW / 2 + i * spacing));
  });
  receded.forEach(function (svc, i) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    a.classList.add('receded'); a.classList.remove('active');
    a.style.zIndex = '1';
    a.style.setProperty('--sink', '0px');
    a.style.setProperty('--slot-x', (slotX[i] !== undefined ? slotX[i] : 0) + 'px');
    a.style.setProperty('--slot-s', '1');
    a.style.setProperty('--slot-delay', '0ms');
    a.style.setProperty('--side', '0');
  });
  all.forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    var waiting = svc.wing !== wing;
    a.inert = waiting;
    if (waiting) a.setAttribute('aria-hidden', 'true');
    else if (!svc.vacant) a.removeAttribute('aria-hidden');
  });
  // How far the row actually reaches from the axis. The bays are cut against
  // THIS, not against the stage column, which is wider than the row.
  triptychHalf = half + (nSide ? gateW + (nSide - 1) * spacing : 0);
  buildAisles();
  if (!initial) scheduleMirror(680);
}

var resizeT;
window.addEventListener('resize', function () {
  clearTimeout(resizeT);
  resizeT = setTimeout(function () { layoutStage(true); }, 120);
});

/* ========================================================================
   The concourse — aisle walls, boards, floor inlay
   ========================================================================
   Everything below exists because a hall that stops 860px short of the
   screen edge is a diorama, not a room. The wall is articulated only where
   the triptych does not stand, so the bays are measured from the stage's
   own box rather than guessed from a breakpoint.
   ======================================================================== */
var triptychHalf = 0;   // half-width the composition actually occupies
var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
             'XI', 'XII'];
function roman(n) { return ROMAN[n] || String(n); }

function uiScale() {
  var v = parseFloat(getComputedStyle(root).getPropertyValue('--ui'));
  return isFinite(v) && v > 0 ? v : 1;
}

/* One pilaster, picture-palace fashion: a panel of antique mirror between two
   reeded gilt fillets, under a stepped gilt capital with a fan in relief and
   over a black marble base. The mirror holds the room: the lamps come back in
   it as soft vertical streaks, so each pilaster shows the light of its own
   bay. Which streak, and how far along, is the pilaster's own (hash of its
   position in the run). */
function pilaster(x, k) {
  var d = el('div', 'pilaster');
  d.style.left = x + 'px';
  var h = hash01((k || 0) * 131 + 17);
  d.style.setProperty('--mx', (18 + h * 64).toFixed(1) + '%');
  d.style.setProperty('--my', (hash01((k || 0) * 71 + 5) * 40).toFixed(1) + '%');
  var cap = svgEl('svg', { viewBox: '0 0 40 30', 'aria-hidden': 'true' }, 'pil-cap');
  [['M0 0 H40 V4 H0 Z', 'pc-abacus'], ['M0 0 H40 V1 H0 Z', 'pc-lit'],
   ['M3 4 H37 V8 H3 Z', 'pc-shade'], ['M5 8 H35 V22 H5 Z', 'pc-bell'],
   ['M7 22 H33 V26 H7 Z', 'pc-neck'], ['M6 26 H34 V30 H6 Z', 'pc-shade']
  ].forEach(function (p) { cap.appendChild(svgEl('path', { d: p[0] }, p[1])); });
  // the fan in the bell: seven rays out of a boss, cast and glazed
  var rays = '';
  for (var r = 0; r < 7; r++) {
    var a0 = Math.PI + (r + 0.18) * Math.PI / 7, a1 = Math.PI + (r + 0.82) * Math.PI / 7;
    rays += 'M20 21 L' + (20 + 12 * Math.cos(a0)).toFixed(2) + ' ' + (21 + 12 * Math.sin(a0)).toFixed(2) +
            ' L' + (20 + 12 * Math.cos(a1)).toFixed(2) + ' ' + (21 + 12 * Math.sin(a1)).toFixed(2) + ' Z';
  }
  cap.appendChild(svgEl('path', { d: rays, transform: 'translate(.4 .6)' }, 'pc-rsh'));
  cap.appendChild(svgEl('path', { d: rays }, 'pc-ray'));
  cap.appendChild(svgEl('path', { d: 'M16 21 A4 4 0 0 1 24 21 Z' }, 'pc-boss'));
  var shaft = el('div', 'pil-shaft');
  shaft.appendChild(el('div', 'pil-mirror'));
  var base = svgEl('svg', { viewBox: '0 0 40 22', 'aria-hidden': 'true' }, 'pil-base');
  [['M4 0 H36 V3 H4 Z', 'pb-nose'], ['M4 0 H36 V1 H4 Z', 'pc-lit'],
   ['M4 3 H36 V14 H4 Z', 'pb-block'], ['M0 14 H40 V17 H0 Z', 'pb-nose'],
   ['M0 17 H40 V22 H0 Z', 'pb-block']
  ].forEach(function (p) { base.appendChild(svgEl('path', { d: p[0] }, p[1])); });
  d.appendChild(cap); d.appendChild(shaft); d.appendChild(base);
  return d;
}

/* One torchiere: an alabaster bowl on a stepped gilt bracket. At night the
   bowl glows through its own stone and throws a scalloped uplight on the
   damask (the cut edge of a cone on a wall is a hyperbola, which is what
   the wash's mask approximates), with a smaller pool below; by day the lamp
   is out and the bowl is just carved stone catching the street light. */
function sconce(x) {
  var d = el('div', 'sconce');
  d.style.left = x + 'px';
  d.appendChild(el('div', 'sc-pool'));
  d.appendChild(el('div', 'sc-down'));
  var svg = svgEl('svg', { viewBox: '0 0 46 72', 'aria-hidden': 'true' }, 'sc-body');
  [['M18 26 H28 V60 H18 Z', 'sc-plate'], ['M16 34 H30 V38 H16 Z', 'sc-plate'],
   ['M16 52 H30 V56 H16 Z', 'sc-plate'], ['M19.5 60 H26.5 L23 70 Z', 'sc-plate'],
   ['M18 26 H19 V60 H18 Z', 'sc-lit'],
   ['M23 38 C23 32 23 30 23 27', 'sc-stem'],
   ['M4 18 C6 30 14 36 23 36 C32 36 40 30 42 18 Z', 'sc-bowl'],
   ['M9 20 C11 29 16 33 23 33.5 M37 20 C35 29 30 33 23 33.5 M16 19 C17 28 20 32 23 33.5 M30 19 C29 28 26 32 23 33.5', 'sc-flute'],
   ['M3 16.5 H43 V19.5 H3 Z', 'sc-rim'], ['M3 16.5 H43 V17.3 H3 Z', 'sc-lit'],
   ['M5 15.2 C12 13.4 34 13.4 41 15.2 L41 16.5 H5 Z', 'sc-mouth']
  ].forEach(function (p) { svg.appendChild(svgEl('path', { d: p[0] }, p[1])); });
  d.appendChild(svg);
  return d;
}

/* The picture-palace foyer keeps its crowd in line with velvet rope on brass
   posts. They stand along the near edge of the floor, the flanks only, so the
   runner and the lever keep the middle. */
function buildStanchions() {
  var rail = $('.fl-rail');
  if (!rail) return;
  var W = rail.clientWidth, H = rail.clientHeight;
  rail.textContent = '';
  if (!W || !H) return;
  var u = uiScale();
  var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H,
                           'aria-hidden': 'true' });
  var ropes = svgEl('g', {}, 'st-ropes'), posts = svgEl('g', {}, 'st-posts');
  var pitch = 170 * u, top = H * 0.08, ropeY = H * 0.24, foot = H * 0.94;
  var pw = Math.max(4, 6.5 * u);
  [[W * 0.012, W * 0.255], [W * 0.745, W * 0.988]].forEach(function (sp, side) {
    var n = Math.max(1, Math.round((sp[1] - sp[0]) / pitch));
    var xs = [];
    for (var i = 0; i <= n; i++) xs.push(sp[0] + (sp[1] - sp[0]) * i / n);
    for (i = 0; i < n; i++) {
      var x0 = xs[i] + pw * 0.9, x1 = xs[i + 1] - pw * 0.9, sag = H * (0.20 + 0.05 * hash01(i * 13 + side * 7));
      var dRope = 'M' + x0.toFixed(1) + ' ' + ropeY.toFixed(1) + ' C' +
        (x0 + (x1 - x0) * 0.3).toFixed(1) + ' ' + (ropeY + sag).toFixed(1) + ' ' +
        (x0 + (x1 - x0) * 0.7).toFixed(1) + ' ' + (ropeY + sag).toFixed(1) + ' ' +
        x1.toFixed(1) + ' ' + ropeY.toFixed(1);
      ropes.appendChild(svgEl('path', { d: dRope, transform: 'translate(1.5 3)' }, 'st-rope-sh'));
      ropes.appendChild(svgEl('path', { d: dRope }, 'st-rope'));
      ropes.appendChild(svgEl('path', { d: dRope, transform: 'translate(0 -1.2)' }, 'st-rope-lt'));
      // the brass snap hooks at either end of the rope
      [x0, x1].forEach(function (hx) {
        posts.appendChild(svgEl('circle', { cx: hx.toFixed(1), cy: ropeY.toFixed(1), r: (2.6 * u).toFixed(1) }, 'st-hook'));
      });
    }
    xs.forEach(function (x) {
      var bw = pw * 3.2, g = svgEl('g', {}, 'st-post');
      g.appendChild(svgEl('ellipse', { cx: (x + 3).toFixed(1), cy: (foot + 2).toFixed(1), rx: (bw * 1.4).toFixed(1), ry: (bw * 0.34).toFixed(1) }, 'st-cast'));
      g.appendChild(svgEl('ellipse', { cx: x.toFixed(1), cy: foot.toFixed(1), rx: bw.toFixed(1), ry: (bw * 0.28).toFixed(1) }, 'st-base'));
      g.appendChild(svgEl('ellipse', { cx: x.toFixed(1), cy: (foot - bw * 0.14).toFixed(1), rx: (bw * 0.82).toFixed(1), ry: (bw * 0.2).toFixed(1) }, 'st-base-top'));
      g.appendChild(svgEl('rect', { x: (x - pw / 2).toFixed(1), y: (top + pw).toFixed(1), width: pw.toFixed(1), height: (foot - top - pw).toFixed(1) }, 'st-shaft'));
      g.appendChild(svgEl('rect', { x: (x - pw * 0.85).toFixed(1), y: (ropeY - pw * 0.6).toFixed(1), width: (pw * 1.7).toFixed(1), height: (pw * 1.2).toFixed(1), rx: (pw * 0.3).toFixed(1) }, 'st-shaft'));
      g.appendChild(svgEl('circle', { cx: x.toFixed(1), cy: (top + pw * 0.3).toFixed(1), r: (pw * 1.05).toFixed(1) }, 'st-ball'));
      g.appendChild(svgEl('circle', { cx: (x - pw * 0.35).toFixed(1), cy: (top - pw * 0.05).toFixed(1), r: (pw * 0.3).toFixed(1) }, 'st-spec'));
      posts.appendChild(g);
    });
  });
  svg.appendChild(ropes);
  svg.appendChild(posts);
  rail.appendChild(svg);
}

/* Lay a rhythm of bays across one clear stretch of wall, a pilaster at each
   end. Returns how many bays it used. */
function fillSpan(node, x0, x1, firstBay) {
  var u = uiScale();
  var w = x1 - x0;
  if (w < 40 * u) return 0;
  var n = Math.max(1, Math.round(w / (300 * u)));
  var bay = w / n;
  for (var i = 0; i <= n; i++) node.appendChild(pilaster(x0 + i * bay, firstBay * 7 + i));
  // A bay narrower than a torchiere and its wash cannot be lit; anything
  // wider is. (The old 90u floor left the owner's 3440 wall with no lamps.)
  if (w < 70 * u) return 0;
  for (var j = 0; j < n; j++) {
    var mid = x0 + (j + 0.5) * bay;
    node.appendChild(sconce(mid));
    var plate = el('div', 'bay-plate display', t('bayLabel', { n: roman(firstBay + j) }));
    plate.style.left = mid + 'px';
    node.appendChild(plate);
  }
  return n;
}

/* Fill one aisle wall, skipping the stretch a board is hung over. Spacing
   bays evenly across the whole span put every sconce and every bay number
   behind the board hung in the middle of it — articulation built and then
   covered up. The bays go in the daylight either side instead, which also
   lands a pilaster hard against each edge of the board, so the board reads
   as set into the wall rather than stuck onto it. */
function fillWall(node, width, hole, firstBay) {
  node.textContent = '';
  node.style.setProperty('--aw', Math.max(0, width) + 'px');
  if (width <= 0) return 0;
  var spans = [];
  if (hole && hole[1] > 0 && hole[0] < width) {
    if (hole[0] > 0) spans.push([0, Math.min(hole[0], width)]);
    if (hole[1] < width) spans.push([Math.max(0, hole[1]), width]);
  } else {
    spans.push([0, width]);
  }
  var used = 0;
  spans.forEach(function (sp) {
    used += fillSpan(node, sp[0], sp[1], firstBay + used);
  });
  return used;
}

/* Where a board sits, in its own wall's coordinate space. */
function boardHole(board, originX) {
  if (!board || getComputedStyle(board).display === 'none') return null;
  var r = board.getBoundingClientRect();
  if (!r.width) return null;
  return [r.left - originX - 9, r.right - originX + 9];
}

/* The wall is measured against the stage, not against a media query: the
   triptych grows with --ui and the boards resize with it, so the only
   honest source for "where does the bare wall start" is the live box. */
function buildAisles() {
  var wall = $('#backwall'), stage = $('#stage');
  if (!wall || !stage) return;
  var wl = $('.wall-l', wall), wr = $('.wall-r', wall);
  if (!wl || !wr) return;
  var bw = wall.getBoundingClientRect();
  var sr = stage.getBoundingClientRect();
  if (!bw.width) return;
  var axis = sr.left + sr.width / 2;
  var reach = (triptychHalf || sr.width / 2) + 28;
  var lw = Math.max(0, (axis - reach) - bw.left);
  var rw = Math.max(0, bw.right - (axis + reach));
  var used = fillWall(wl, lw, boardHole($('#works'), bw.left), 1);
  fillWall(wr, rw, boardHole($('#almanac'), axis + reach), used + 1);
  sizeFloor();
  buildStanchions();
  // The reflections are cast from the live arch boxes, so they are repainted
  // by whatever last moved them — a resize, a wing throw, a font swap.
  scheduleMirror(0);
}

/* A gate takes 0.6s to cross the stage, and getBoundingClientRect during
   that is the arch's CURRENT box, not its destination — so a reflection
   painted on the spot would sit under nothing for half a second and then
   jump. SVG polygon points do not transition, so the smears fade out while
   the arches travel and come back up under wherever they landed, which is
   also how a reflection behaves when the thing casting it moves. */
var mirrorT = null;
function scheduleMirror(wait) {
  var svg = $('.fl-mirror');
  if (!svg) return;
  clearTimeout(mirrorT);
  if (!wait || root.dataset.motion === 'reduced') {
    svg.style.opacity = '';
    paintFloorMirror();
    return;
  }
  svg.style.opacity = '0';
  mirrorT = setTimeout(function () {
    paintFloorMirror();
    svg.style.opacity = '';
  }, wait);
}

/* The floor's perspective distance has to be a function of the floor's own
   height, and CSS cannot read a box's used height back into a calc. The
   plane is absolutely positioned, so writing --fh cannot feed back into the
   height it was measured from. */
function sizeFloor() {
  var fp = $('#floorplane');
  if (!fp) return;
  var h = fp.offsetHeight;
  if (h) fp.style.setProperty('--fh', h + 'px');
}

/* A fixed 32-bit hash. Every chip, every slab tone and every fleck on this
   floor is placed off it: irregular, and irregular the SAME way on every
   reload. Math.random would give a floor that reshuffles itself between two
   screenshots, which is the one thing a floor may never do. */
function hash01(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

/* An annular sector, which is the only primitive a stone medallion needs:
   every ring, wedge, tessera and border course below is one of these. */
function ringSeg(cx, cy, r0, r1, a0, a1) {
  var big = (a1 - a0) > Math.PI ? 1 : 0;
  var p = function (r, a) {
    return (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2);
  };
  return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + p(r1, a1) +
         ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) + ' Z';
}

/* The floor medallion, cut from stone.
   ------------------------------------
   The version this replaces was hairline geometry: uniform strokes, perfect
   symmetry, ATRIUM set dead centre. That is a LOGO lying on the ground, and
   it read as one - stiff, and pasted on rather than built in. A terrazzo
   medallion is quarried tones butted against each other with brass divider
   strips in the joints. The pattern is carried by VALUE, because value is
   the only thing that survives being laid flat and foreshortened to a third
   of its height; the brass never outlines a shape, it only fills a joint.
   The wordmark goes with the line work - the masthead already says it, and
   a floor is not a letterhead. */
function buildFloorInlay() {
  var host = $('.fl-inlay');
  if (!host || host.firstChild) return;
  var C = 500, TAU = Math.PI * 2;
  var svg = svgEl('svg', { viewBox: '0 0 1000 1000', 'aria-hidden': 'true' });
  var add = function (d, cls, op) {
    var p = svgEl('path', { d: d }, cls);
    if (op) p.setAttribute('opacity', op.toFixed(3));
    svg.appendChild(p);
  };
  var ring = function (r) { svg.appendChild(svgEl('circle', { cx: C, cy: C, r: r, fill: 'none' }, 'st-strip')); };
  var at = function (r, a) { return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
  var P = function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); };

  // The picture-palace medallion: a foyer floor, not a compass and not a
  // wheel. Three calm fields of named stone (Nero, Rosso Levanto, Siena)
  // carry concentrated ornament: a bead course, a ring of twelve fans
  // opening outward, stepped petals, a rosette. Every slab is its own block
  // (tone jittered off the fixed hash), every joint a brass strip.
  add(ringSeg(C, C, 432, 474, 0, TAU - 0.0001), 'st-b');
  for (var i = 0; i < 60; i++) {
    var a0 = (i / 60) * TAU;
    add(ringSeg(C, C, 443, 463, a0 + 0.018, a0 + TAU / 60 - 0.018), 'st-d',
        0.78 + hash01(i * 13 + 5) * 0.22);
  }
  ring(474); ring(432);

  // The fan course: Rosso ground, twelve Siena fans standing on its inner
  // strip, ribs alternating Siena and white, a brass boss at each foot.
  add(ringSeg(C, C, 322, 432, 0, TAU - 0.0001), 'st-a');
  for (var f = 0; f < 12; f++) {
    var ang = (f / 12) * TAU - Math.PI / 2;
    var foot = at(328, ang), R = 94;
    var u = [Math.cos(ang), Math.sin(ang)], t = [-Math.sin(ang), Math.cos(ang)];
    var ribs = 7;
    for (var k = 0; k < ribs; k++) {
      var p0 = Math.PI * k / ribs, p1 = Math.PI * (k + 1) / ribs;
      var q0 = [foot[0] + R * (Math.cos(p0) * t[0] + Math.sin(p0) * u[0]),
                foot[1] + R * (Math.cos(p0) * t[1] + Math.sin(p0) * u[1])];
      var q1 = [foot[0] + R * (Math.cos(p1) * t[0] + Math.sin(p1) * u[0]),
                foot[1] + R * (Math.cos(p1) * t[1] + Math.sin(p1) * u[1])];
      add('M' + P(foot) + ' L' + P(q0) + ' A' + R + ' ' + R + ' 0 0 0 ' + P(q1) + ' Z',
          k % 2 ? 'st-d' : 'st-c', 0.84 + hash01(f * 31 + k * 7 + 1) * 0.16);
    }
    // the fan's own brass rim and its boss
    var e0 = [foot[0] + R * t[0], foot[1] + R * t[1]], e1 = [foot[0] - R * t[0], foot[1] - R * t[1]];
    svg.appendChild(svgEl('path', { d: 'M' + P(e0) + ' A' + R + ' ' + R + ' 0 0 0 ' + P(e1), fill: 'none' }, 'st-strip'));
    svg.appendChild(svgEl('circle', { cx: foot[0].toFixed(1), cy: foot[1].toFixed(1), r: 13 }, 'st-gold'));
  }
  ring(322);

  // The inner field: Nero, eight stepped petals of Siena pointing out, a
  // white lozenge between each pair.
  add(ringSeg(C, C, 186, 322, 0, TAU - 0.0001), 'st-b');
  for (var p = 0; p < 8; p++) {
    var pa = (p / 8) * TAU - Math.PI / 2;
    [[196, 0.25], [236, 0.18], [272, 0.11], [300, 0.05]].forEach(function (st, si) {
      add(ringSeg(C, C, st[0], si < 3 ? [236, 272, 300][si] : 312, pa - st[1], pa + st[1]),
          'st-c', 0.86 + hash01(p * 17 + si * 3) * 0.14);
    });
    var la = pa + TAU / 16, lc = at(262, la);
    var L = function (r, da) { return at(r, la + da); };
    add('M' + P(L(226, 0)) + ' L' + P(L(262, 0.07)) + ' L' + P(L(298, 0)) + ' L' + P(L(262, -0.07)) + ' Z', 'st-d');
  }
  ring(186);

  // The rosette: Rosso field, twelve petals of white, a bronze boss.
  add(ringSeg(C, C, 0.01, 186, 0, TAU - 0.0001), 'st-a');
  for (var r = 0; r < 12; r++) {
    var ra = (r / 12) * TAU - Math.PI / 2, w = 0.2;
    add('M' + P(at(62, ra)) + ' Q' + P(at(128, ra - w)) + ' ' + P(at(168, ra)) +
        ' Q' + P(at(128, ra + w)) + ' ' + P(at(62, ra)) + ' Z', r % 2 ? 'st-c' : 'st-d');
  }
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 60 }, 'st-bronze'));
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 60, fill: 'none' }, 'st-strip'));
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 26 }, 'st-gold'));
  host.appendChild(svg);

  buildFloorRoundels();
  buildTerrazzo();
}

/* The aisle roundels: a smaller, calmer inlay of the same stones, built a
   different way (a bead course round a lozenge) so the floor reads as a set
   rather than one motif stamped three times. Placed in PLANE space, which is
   204% of the screen wide and shrinks outward from the axis by the
   perspective divide; 30/70 of the plane lands on the aisle axes. */
function buildFloorRoundels() {
  var plane = $('.fl-plane');
  if (!plane) return;
  var TAU = Math.PI * 2;
  [30, 70].forEach(function (pct, i) {
    var d = el('div', 'fl-round');
    d.style.left = pct + '%';
    var r = svgEl('svg', { viewBox: '0 0 400 400', 'aria-hidden': 'true' });
    r.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 190 }, 'st-b'));
    r.appendChild(svgEl('path', { d: ringSeg(200, 200, 150, 172, 0, TAU - 0.0001) }, 'st-a'));
    for (var j = 0; j < 28; j++) {
      var a = (j / 28) * TAU;
      r.appendChild(svgEl('circle', { cx: (200 + Math.cos(a) * 181).toFixed(1),
        cy: (200 + Math.sin(a) * 181).toFixed(1), r: 4.2 }, 'st-d'));
    }
    [190, 172, 150].forEach(function (rr) {
      r.appendChild(svgEl('circle', { cx: 200, cy: 200, r: rr, fill: 'none' }, 'st-strip'));
    });
    // a stepped lozenge of Siena, a Rosso heart, a white cross of petals
    r.appendChild(svgEl('path', { d: 'M200 58 L342 200 L200 342 L58 200 Z' }, 'st-c'));
    r.appendChild(svgEl('path', { d: 'M200 88 L312 200 L200 312 L88 200 Z' }, 'st-b'));
    r.appendChild(svgEl('path', { d: 'M200 58 L342 200 L200 342 L58 200 Z', fill: 'none' }, 'st-strip'));
    r.appendChild(svgEl('path', { d: 'M200 110 L290 200 L200 290 L110 200 Z' }, 'st-a'));
    for (var k = 0; k < 4; k++) {
      var ka = (k / 4) * TAU + (i ? Math.PI / 4 : 0);
      var tip = [200 + Math.cos(ka) * 78, 200 + Math.sin(ka) * 78];
      var sL = [200 + Math.cos(ka + 0.5) * 30, 200 + Math.sin(ka + 0.5) * 30];
      var sR = [200 + Math.cos(ka - 0.5) * 30, 200 + Math.sin(ka - 0.5) * 30];
      r.appendChild(svgEl('path', { d: 'M200 200 L' + sL.join(' ') + ' L' + tip.join(' ') + ' L' + sR.join(' ') + ' Z' }, 'st-d'));
    }
    r.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 22 }, 'st-gold'));
    d.appendChild(r);
    plane.appendChild(d);
  });
}

/* Aggregate. The tell that a floor is a gradient rather than a floor is that
   no two square metres of it differ; the noise filter under the plane gives
   grain but not CHIPS. These are the visible ones - three sizes, three
   tones, one in eleven in brass - biased toward the viewer, because the
   projection stacks the far half of the plane into a fifth of the band and
   an even scatter turns to felt up there. */
var CHIP_SQUASH = 0.22;
function buildTerrazzo() {
  var svg = $('.fl-chips');
  if (!svg || svg.firstChild) return;
  var frag = document.createDocumentFragment();
  for (var i = 0; i < 700; i++) {
    var y = Math.pow(hash01(i * 3 + 11), 0.62);
    var x = hash01(i * 5 + 7);
    var s = hash01(i * 9 + 23);
    // The plane is between three and six times wider than it is long, and
    // the viewBox is square with preserveAspectRatio="none" — so a chip with
    // equal radii comes out an 8:1 horizontal sliver that reads as a scratch
    // in the slab seams. CHIP_SQUASH puts rx back in the same ballpark as ry
    // across every viewport the hall supports; there is no one number, and a
    // chip that is a little oval either way is a chip.
    var ry = 3 + s * 8;
    frag.appendChild(svgEl('ellipse', {
      cx: (x * 1000).toFixed(1), cy: (y * 1000).toFixed(1),
      rx: (ry * CHIP_SQUASH * (0.72 + hash01(i * 17 + 2) * 0.62)).toFixed(2),
      ry: ry.toFixed(2)
    }, s > 0.91 ? 'ch-g' : (s > 0.5 ? 'ch-l' : 'ch-d')));
  }
  svg.appendChild(frag);
}

/* The floor is waxed, so the room stands in it.
   -------------------------------------------
   Each arch and the clock come back up off the stone. The smears are drawn
   in PLANE space and left to the one rotateX, which is what makes them
   converge exactly as their own arches do - painted on the glass they would
   stay parallel and read as stripes.
   The mapping: a point at depth u along the plane divides by f = 1/(1 + u/L),
   so a column that is vertical ON SCREEN is a WEDGE on the plane, widening
   toward the viewer. Hence the trapezoid: 0.98 of the offset at the wall,
   0.49 at the near edge. Reflections carry --metal, so the whole floor
   changes temperature the moment the lever is thrown. */
var MIRROR_FAR = 0.98, MIRROR_NEAR = 0.49, MIRROR_RUN = 560;
function paintFloorMirror() {
  var svg = $('.fl-mirror');
  if (!svg) return;
  var W = window.innerWidth || 1;
  var seen = [];
  // The arches and the clock carry their own reflections now (the portal
  // flipped in the wax, and the niche's own), so only the two aisle cases
  // still need a smear here.
  [['#works', false, false], ['#almanac', false, false]]
  .forEach(function (spec) {
    var e = $(spec[0]);
    if (!e) return;
    var r = e.getBoundingClientRect();
    if (r.width > 4) {
      seen.push({ dx: (r.left + r.width / 2) / W - 0.5, hw: r.width / W / 2,
                  lit: spec[1], wide: spec[2] });
    }
  });
  svg.textContent = '';
  var defs = svgEl('defs');
  svg.appendChild(defs);
  seen.forEach(function (it, i) {
    var id = 'mir' + i;
    var grad = svgEl('linearGradient',
      { id: id, x1: '0', y1: '0', x2: '0', y2: '1' });
    var top = it.lit ? (it.wide ? 0.34 : 0.30) : 0.13;
    // stop-color is set by CLASS, never as a presentation attribute: var()
    // does not resolve in presentation attributes, so `stop-color="var(--metal)"`
    // parses to nothing and the whole reflection paints transparent — which
    // it did, silently, with all six polygons present in the DOM.
    [[0, top], [0.42, top * 0.42], [1, 0]].forEach(function (st) {
      grad.appendChild(svgEl('stop', {
        offset: (st[0] * 100) + '%',
        'stop-opacity': st[1].toFixed(3)
      }, it.lit ? 'mir-lit' : 'mir-dim'));
    });
    defs.appendChild(grad);
    var far = 500 + 1000 * MIRROR_FAR * it.dx, fw = 1000 * MIRROR_FAR * it.hw;
    var near = 500 + 1000 * MIRROR_NEAR * it.dx, nw = 1000 * MIRROR_NEAR * it.hw;
    svg.appendChild(svgEl('polygon', {
      points: [(far - fw).toFixed(1) + ',0', (far + fw).toFixed(1) + ',0',
               (near + nw).toFixed(1) + ',' + MIRROR_RUN,
               (near - nw).toFixed(1) + ',' + MIRROR_RUN].join(' '),
      fill: 'url(#' + id + ')'
    }));
  });
}

/* ----- THE WORKS ---------------------------------------------------------
   Four needle dials on the same 240-degree scale the retired LINES gauge
   used, so the case reads as instruments off one bench rather than four
   widgets. The readings are the host's own: nothing here crosses the
   machine, and the poll only runs while the board is genuinely on screen —
   below 2200px the aisles fold away, and the hub must not be spawning
   nvidia-smi for a panel nobody can see. */
var WK_DIALS = [
  { key: 'cpu', name: 'wkCpu' },
  { key: 'mem', name: 'wkMem' },
  { key: 'gpu', name: 'wkGpu' },
  { key: 'net', name: 'wkNet' }
];
var works = null;
var worksTimer = null;

/* One enamel dial: knurled bezel, engraved 0..100 face, a red sector over
   the last fifth, and the needle on the spring settle the CSS gives it. */
function buildDial(key) {
  var svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, 'wk-dial');
  svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 46, 'stroke-width': 1.5 }, 'g-bezel'));
  svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 41, 'stroke-width': 1 }, 'g-bezel'));
  var knurl = svgEl('g', { 'stroke-width': 1 }, 'g-knurl');
  for (var i = 0; i < 36; i++) {
    var a = i * 10 * Math.PI / 180;
    knurl.appendChild(svgEl('line', {
      x1: (50 + 42 * Math.sin(a)).toFixed(2), y1: (50 - 42 * Math.cos(a)).toFixed(2),
      x2: (50 + 45 * Math.sin(a)).toFixed(2), y2: (50 - 45 * Math.cos(a)).toFixed(2)
    }));
  }
  svg.appendChild(knurl);
  svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 40 }, 'g-dial'));
  var pt = function (v, r) {
    var a = (-120 + 2.4 * v) * Math.PI / 180;
    return (50 + r * Math.sin(a)).toFixed(2) + ' ' + (50 - r * Math.cos(a)).toFixed(2);
  };
  // Red sector over the last fifth of the scale.
  svg.appendChild(svgEl('path', {
    d: 'M ' + pt(85, 35) + ' A 35 35 0 0 1 ' + pt(100, 35), fill: 'none'
  }, 'g-red'));
  for (var j = 0; j <= 20; j++) {
    var major = j % 5 === 0;
    var a2 = (-120 + 12 * j) * Math.PI / 180;
    var inner = major ? 28 : 32;
    svg.appendChild(svgEl('line', {
      x1: (50 + inner * Math.sin(a2)).toFixed(2), y1: (50 - inner * Math.cos(a2)).toFixed(2),
      x2: (50 + 37 * Math.sin(a2)).toFixed(2), y2: (50 - 37 * Math.cos(a2)).toFixed(2),
      'stroke-width': major ? 1.8 : 0.9
    }, 'g-tick'));
    if (!major) continue;
    var tx = svgEl('text', {
      x: (50 + 20 * Math.sin(a2)).toFixed(2),
      y: (50 - 20 * Math.cos(a2) + 4).toFixed(2),
      'text-anchor': 'middle'
    });
    tx.textContent = String(j * 5);
    svg.appendChild(tx);
  }
  svg.appendChild(svgEl('line', { x1: 50, y1: 62, x2: 50, y2: 19, 'stroke-width': 2 }, 'g-needle'));
  svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 4 }, 'g-hub'));
  return svg;
}

function renderWorks() {
  var box = $('#wk-dials'), tape = $('#wk-tape');
  if (!box || !tape || box.firstChild) return;
  WK_DIALS.forEach(function (d) {
    var cell = el('div', 'wk-cell');
    cell.dataset.dial = d.key;
    cell.appendChild(buildDial(d.key));
    cell.appendChild(el('span', 'wk-name display', t(d.name)));
    cell.appendChild(el('span', 'wk-read num', '—'));
    box.appendChild(cell);
  });
  ['hours', 'disk'].forEach(function (k) {
    var row = el('div', 'wk-strip');
    row.dataset.strip = k;
    row.appendChild(el('span', 'wk-slabel display',
      t(k === 'hours' ? 'wkHours' : 'wkDisk')));
    row.appendChild(el('span', 'wk-sval num', '—'));
    tape.appendChild(row);
  });
  syncWorks();
}

/* Hours run reads as a plate, not a stopwatch — no seconds ticking on a
   wall in a hall. */
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function runFor(s) {
  if (s === null || s === undefined) return '—';
  var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  var m = Math.floor((s % 3600) / 60);
  var D = t('runD'), H = t('runH'), M = t('runM');
  // Units come from the table: the Chinese hall printed "已运转 22m".
  return (d ? d + D.trimEnd() + ' ' + pad2(h) + H :
          h ? h + H.trimEnd() + ' ' + pad2(m) + M : m + M).trim();
}
function tera(gb) {
  return gb >= 1024 ? (gb / 1024).toFixed(1) + ' TB' : Math.round(gb) + ' GB';
}

/* Needle position plus what the caption under it says. Every reading is
   optional: a machine with no NVIDIA card is a normal machine. */
function dialRead(key, w) {
  var d = w && w[key];
  if (!d || d.pct === null || d.pct === undefined) return null;
  if (key === 'cpu') {
    return { pct: d.pct, text: Math.round(d.pct) + '%',
             title: t('wkCores', { n: d.cores }) };
  }
  if (key === 'mem' || key === 'gpu') {
    return { pct: d.pct,
             text: d.used_gb.toFixed(1) + ' / ' + Math.round(d.total_gb) + ' GB',
             title: key === 'gpu' ? d.name : t('wkOf', { a: d.used_gb, b: d.total_gb }) };
  }
  return { pct: d.pct,
           text: d.down_mbs.toFixed(1) + ' ↓  ' + d.up_mbs.toFixed(1) + ' ↑  ' + t('wkRate'),
           title: t('wkDown', { d: d.down_mbs, u: d.up_mbs }) };
}

function syncWorks() {
  var box = $('#wk-dials');
  if (!box || !box.firstChild) return;
  WK_DIALS.forEach(function (d) {
    var cell = box.querySelector('[data-dial="' + d.key + '"]');
    if (!cell) return;
    var r = dialRead(d.key, works);
    // A needle with no reading rests at zero rather than lying at a number.
    cell.style.setProperty('--gauge', (-120 + (r ? r.pct : 0) * 2.4).toFixed(1));
    cell.dataset.hot = r && r.pct >= 85 ? 'yes' : 'no';
    cell.dataset.blank = r ? 'no' : 'yes';
    var read = $('.wk-read', cell);
    read.textContent = r ? r.text : t('wkNoReading');
    read.setAttribute('aria-hidden', 'true');
    cell.title = t(d.name) + (r && r.title ? t('join') + r.title : '');
    // The caption's arrows and the red sector say nothing aloud; this does.
    var sr = $('.wk-sr', cell);
    if (!sr) { sr = el('span', 'sr-only wk-sr'); cell.appendChild(sr); }
    sr.textContent = t(d.name) + t('join') +
      (r ? (d.key === 'net' ? t('wkDown', { d: works.net.down_mbs, u: works.net.up_mbs }) : r.text) +
           (r.title && d.key !== 'net' ? t('list') + r.title : '') +
           (r.pct >= 85 ? t('list') + t('wkHot') : '')
         : t('wkNoReading'));
  });
  var tape = $('#wk-tape');
  if (!tape) return;
  var hours = tape.querySelector('[data-strip="hours"] .wk-sval');
  // The machine's uptime, as the board promises; the hub's own uptime reset
  // to minutes on every restart. It stands in only when the host's is null.
  if (hours) hours.textContent = runFor(works &&
    (works.host_uptime_s !== null && works.host_uptime_s !== undefined
      ? works.host_uptime_s : works.hub_uptime_s));
  var disk = tape.querySelector('[data-strip="disk"] .wk-sval');
  if (disk) {
    disk.textContent = works && works.disk
      ? works.disk.label + '  ' + t('wkFree', { n: tera(works.disk.free_gb) })
      : '—';
  }
}

/* The dial faces are engraved once; only their lettering is language. */
function relabelWorks() {
  WK_DIALS.forEach(function (d) {
    var cell = document.querySelector('#wk-dials [data-dial="' + d.key + '"]');
    if (cell) $('.wk-name', cell).textContent = t(d.name);
  });
  ['hours', 'disk'].forEach(function (k) {
    var row = document.querySelector('#wk-tape [data-strip="' + k + '"]');
    if (row) {
      $('.wk-slabel', row).textContent = t(k === 'hours' ? 'wkHours' : 'wkDisk');
    }
  });
  syncWorks();
}

/* On screen only: the board is display:none below 2200px, and a hidden
   panel must not keep the host sampling. */
function worksVisible() {
  var b = $('#works');
  return !!b && getComputedStyle(b).display !== 'none' &&
         document.visibilityState === 'visible';
}

function pollWorks() {
  if (!worksVisible()) return Promise.resolve();
  return fetchJson('/api/works').then(function (w) {
    works = w;
    syncWorks();
  }).catch(function () { /* a restarting hub is not a reading */ });
}

/* Instruments read live or they are decoration, so the cadence is the
   dial's rather than the hall's 45s poll. */
function startWorks() {
  clearInterval(worksTimer);
  worksTimer = setInterval(pollWorks, 4000);
  pollWorks();
}

/* ----- THE ALMANAC -------------------------------------------------------
   The east board. Where STATISTICS reads the machine, this reads the sky
   over it — and it is deliberately built out of two halves that fail
   independently.

   The sun and the moon are ARITHMETIC, run here on the coordinates the hub
   hands over. That is what lets the bead keep moving through the day on a
   board whose forecast is a quarter of an hour old, and what leaves the case
   with an instrument in it when the weather service is unreachable.

   The forecast comes from /api/almanac, which is TTL'd well below this poll:
   the cadence below is the board's, not the service's.
   ======================================================================== */
var ALM_POLL_MS = 600000;    // the forecast — behind a 15 min TTL at the hub
var SKY_TICK_MS = 60000;     // the bead — the one live thing on the board
var RAD = Math.PI / 180;

var almanac = null;          // last payload from /api/almanac
var almTimer = null, skyTimer = null;

function fmod(a, n) { return ((a % n) + n) % n; }

/* Hours to a wall clock. Rounded in MINUTES rather than per field: rounding
   the minutes of 23:59.7 on their own prints 23:60. */
function hhmm(h) {
  var m = Math.round(fmod(h, 24) * 60);
  return pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
}

/* How far the named place's clock is from UTC right now, DST included. Falls
   back to the reader's own offset when the hub names no zone — the reader is
   usually standing in the place anyway. */
function offsetOf(tz, at) {
  if (!tz) return -at.getTimezoneOffset() / 60;
  try {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(at).forEach(function (p) { parts[p.type] = p.value; });
    var asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
                         +parts.hour % 24, +parts.minute, +parts.second);
    return Math.round((asUTC - at.getTime()) / 60000) / 60;
  } catch (e) {
    return -at.getTimezoneOffset() / 60;
  }
}

/* The wall clock at the place, as plain fields. Everything the board prints
   is measured from here. */
function localAt(tz, at) {
  var s = new Date(at.getTime() + offsetOf(tz, at) * 3600000);
  return {
    year: s.getUTCFullYear(), month: s.getUTCMonth(), day: s.getUTCDate(),
    hours: s.getUTCHours() + s.getUTCMinutes() / 60 + s.getUTCSeconds() / 3600
  };
}

/* NOAA's sunrise equation, short form. Returns clock hours at `tzHours`.
   Checked against Open-Meteo for Pittsburgh: 06:17 against their 06:16. */
function sunTimes(lat, lon, date, tzHours) {
  var days = Math.floor((Date.UTC(date.year, date.month, date.day)
                         - Date.UTC(2000, 0, 1)) / 86400000);
  var n = days + 0.0008 - lon / 360;
  var M = fmod(357.5291 + 0.98560028 * n, 360) * RAD;
  var C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
  var L = fmod(M / RAD + C + 180 + 102.9372, 360) * RAD;
  var J = 2451545.0 + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  var dec = Math.asin(Math.sin(L) * Math.sin(23.4397 * RAD));
  var la = lat * RAD;
  var cosw = (Math.sin(-0.833 * RAD) - Math.sin(la) * Math.sin(dec))
           / (Math.cos(la) * Math.cos(dec));
  // Inside a polar circle the sun never crosses the horizon at all.
  if (cosw > 1) return { polar: 'night' };
  if (cosw < -1) return { polar: 'day' };
  var w = Math.acos(cosw);
  // Wrapped into the local day HERE, not at the point of display. West of
  // Greenwich a summer sunset lands after midnight UTC, so the unwrapped
  // figure comes out negative — it formats correctly and every comparison
  // made against it is backwards, which puts the bead on the wrong horizon.
  var clock = function (j) { return fmod(fmod(j - 2451545.0 + 0.5, 1) * 24 + tzHours, 24); };
  var jset = J + (w / RAD) / 360;
  var rise = clock(J - (jset - J));
  var set = clock(jset);
  var noon = clock(J);
  // A clock offset far from its own meridian can set after local midnight;
  // keep the pair ordered so the day still runs forwards.
  if (set < rise) set += 24;
  if (noon < rise) noon += 24;
  return { rise: rise, set: set, noon: noon, hours: (w / RAD) * 2 / 15 };
}

/* The true moon, from clock.js (Meeus), so the Almanac and the clock's
   aperture read the same sky. The eight names follow the light rather than
   eight equal slices of the month: a quarter is a half-lit disc, so the
   principal names only stand near their instant, and "Last quarter · 64%"
   can no longer be printed. */
function moonPhase(at) {
  var m = window.AtriumMoon.at(at);
  var lit = m.lit, idx;
  if (lit <= 0.03) idx = 0;
  else if (lit >= 0.97) idx = 4;
  else if (Math.abs(lit - 0.5) <= 0.06) idx = m.waxing ? 2 : 6;
  else if (lit < 0.5) idx = m.waxing ? 1 : 7;
  else idx = m.waxing ? 3 : 5;
  return { age: m.age, lit: lit, waxing: m.waxing, idx: idx };
}

/* The terminator is an ELLIPSE. Drawing it as a straight chord, or as a
   second circle offset sideways, is the usual shortcut and it gets gibbous
   phases visibly wrong — which is the first thing an almanac reader looks
   at. The waning half is the waxing path mirrored. */
function moonDisc(phase, r) {
  var box = r + 2;
  var svg = svgEl('svg', {
    viewBox: (-box) + ' ' + (-box) + ' ' + (box * 2) + ' ' + (box * 2),
    'aria-hidden': 'true'
  }, 'al-disc');
  svg.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r }, 'm-dark'));
  var xt = r * (1 - 2 * phase.lit);     // where the terminator crosses the equator
  var lit = svgEl('path', {
    d: 'M 0 ' + (-r) + ' A ' + r + ' ' + r + ' 0 0 1 0 ' + r + ' '
     + 'A ' + Math.abs(xt).toFixed(3) + ' ' + r + ' 0 0 ' + (xt > 0 ? 0 : 1)
     + ' 0 ' + (-r) + ' Z'
  }, 'm-lit');
  if (!phase.waxing) lit.setAttribute('transform', 'scale(-1,1)');
  svg.appendChild(lit);
  // The bezel last, so the mount reads over the disc the way a case does.
  svg.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r, 'stroke-width': 1 }, 'm-bezel'));
  return svg;
}

/* ----- The heliograph ----------------------------------------------------
   A diurnal circle: the sun's path for the day, drawn as the ellipse you get
   looking at that circle edge-on, with the horizon cutting across it. The
   solid arc above the cut is the day, the dotted arc below it is the night,
   and the sun runs the whole ring at a constant 15° an hour.

   Two things about that are load-bearing, and the first version of this plate
   got both of them wrong.

   THE HORIZON IS A CHORD, NOT A DIAMETER. Cutting the ellipse through its
   centre draws a day that is exactly half the circle — twelve hours — under a
   tape that says DAYLIGHT 13:13. On 2026-08-29 in Pittsburgh the sun is up
   for 198° of the ring, not 180°, so the chord sits 0.16 of the minor radius
   BELOW the centre. That offset is the season made visible: a fat dome in
   June, a shallow cap in December, and the two equal halves only at an
   equinox — which is the one day the old drawing was right.

   THE HOUR RING IS 15° AN HOUR. Spreading the daylight hours evenly across a
   half circle stretches them to fit, which put every tick in the wrong place
   — zero error at the crossings, where it is pinned, and up to 8.8° in
   between, which is where the eye checks a dial against itself.

   Ticks stand on the ellipse's own NORMAL, not on the radius from its centre.
   Those are the same direction only on a circle; on a squashed one the radius
   leans, worst at the diagonals, and the marks read as though they had come
   loose from the curve. */
var SKY_TICK_HOURS = 24;

function skyBox(host) {
  var w = (host && host.clientWidth) || 300;
  var h = (host && host.clientHeight) || 150;
  var H = Math.max(150, Math.min(300, Math.round(300 * h / Math.max(w, 1))));
  return {
    // The ellipse stops well short of the plate edge on purpose: the two
    // crossings are where the only lettering on the instrument lives, and an
    // ellipse drawn to the full width leaves it nowhere to stand but on the
    // curve itself.
    W: 300, H: H, cx: 150, cy: H / 2, rx: 112,
    ry: Math.max(40, Math.min(124, H / 2 - 20))
  };
}

/* Degrees from culmination — the sun's own clock, 15° an hour, positive
   after noon. */
function sunAngle(hours, noon) { return 15 * (hours - noon); }

function wrapDeg(d) { return ((d + 180) % 360 + 360) % 360 - 180; }

/* The ring, seen edge-on: 0° at the apex, +90° at the right, 180° at the
   nadir. */
function spot(g, deg) {
  var a = deg * RAD;
  return { x: g.cx + g.rx * Math.sin(a), y: g.cy - g.ry * Math.cos(a) };
}

/* One elliptical arc between two angles, the short way round unless the
   sweep is more than half the ring. */
function ringArc(g, from, to) {
  var p0 = spot(g, from), p1 = spot(g, to);
  var large = Math.abs(to - from) > 180 ? 1 : 0;
  return 'M ' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2)
       + ' A ' + g.rx + ' ' + g.ry + ' 0 ' + large + ' 1 '
       + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2);
}

function skyText(x, y, cls, text, anchor) {
  var n = svgEl('text', {
    x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle'
  }, cls);
  n.textContent = text;
  return n;
}

/* A tick standing off the curve along its true normal. For a point at
   parametric angle d the outward normal runs (sin d / rx, −cos d / ry) —
   the radius from the centre only agrees with it on a circle. */
function ringTick(g, deg, len, cls) {
  var p = spot(g, deg);
  var a = deg * RAD;
  var nx = Math.sin(a) / g.rx, ny = -Math.cos(a) / g.ry;
  var m = Math.sqrt(nx * nx + ny * ny) || 1;
  return svgEl('line', {
    x1: p.x.toFixed(2), y1: p.y.toFixed(2),
    x2: (p.x + len * nx / m).toFixed(2), y2: (p.y + len * ny / m).toFixed(2)
  }, cls);
}

/* Open-Meteo's own sunrise and sunset, in the place's local clock. The plate
   computes its own so it still has a sky with no forecast, but when the
   service HAS answered its times are the better ones — the short-form NOAA
   equation below lands 2-3 minutes off them — and, more to the point, the
   times engraved at the crossings must be the times those crossings stand
   for. */
function isoClockHours(s) {
  var m = /T(\d{2}):(\d{2})/.exec(String(s || ''));
  return m ? (+m[1]) + (+m[2]) / 60 : null;
}

function shownTimes(sun, weather) {
  var r = isoClockHours(weather && weather.sunrise);
  var s = isoClockHours(weather && weather.sunset);
  if (r === null || s === null || s <= r) {
    return { rise: sun.rise, set: sun.set, hours: sun.hours, measured: false };
  }
  return { rise: r, set: s, hours: s - r, measured: true };
}

function buildSky(where, host, weather) {
  var g = skyBox(host);
  var svg = svgEl('svg', {
    viewBox: '0 0 ' + g.W + ' ' + g.H, preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true'
  }, 'al-arc');
  // Nothing has arrived yet: a bare horizon still reads as an instrument,
  // where a blank panel reads as a case with its glass knocked out.
  if (!where) {
    svg.appendChild(svgEl('line', {
      x1: 6, y1: g.cy, x2: g.W - 6, y2: g.cy, 'stroke-width': 1
    }, 'a-horizon'));
    return { svg: svg, sun: null };
  }

  var at = new Date();
  var tzh = offsetOf(where.timezone, at);
  var here = localAt(where.timezone, at);
  var sun = sunTimes(where.lat, where.lon, here, tzh);

  if (sun.polar) {
    svg.appendChild(svgEl('line', {
      x1: 6, y1: g.cy, x2: g.W - 6, y2: g.cy, 'stroke-width': 1
    }, 'a-horizon'));
    svg.appendChild(skyText(g.cx, g.cy - 12, 'a-polar',
      t(sun.polar === 'day' ? 'almPolarDay' : 'almPolarNight')));
    return { svg: svg, sun: sun, here: here, at: at, tz: tzh };
  }

  var shown = shownTimes(sun, weather);
  var noon = (shown.rise + shown.set) / 2;
  // Half the day arc. 180° × daylight/24 — 90° at an equinox, and the whole
  // asymmetry of the plate falls out of this one number.
  var half = 180 * shown.hours / 24;
  var horizonY = g.cy - g.ry * Math.cos(half * RAD);

  svg.appendChild(svgEl('path', {
    d: ringArc(g, half, 360 - half), fill: 'none', 'stroke-width': 1,
    'stroke-dasharray': '1 4'
  }, 'a-night'));
  svg.appendChild(svgEl('path', {
    d: ringArc(g, -half, half), fill: 'none', 'stroke-width': 1
  }, 'a-track'));
  svg.appendChild(svgEl('line', {
    x1: 6, y1: horizonY.toFixed(2), x2: g.W - 6, y2: horizonY.toFixed(2),
    'stroke-width': 1
  }, 'a-horizon'));

  // Where the sun is now, on its own clock rather than on the drawing's.
  var phi = wrapDeg(sunAngle(here.hours, noon));
  var up = Math.abs(phi) <= half;

  // Inked as far as the day has got, which after sunset is all of it: the
  // plate reports how much daylight has been SPENT, not merely where the sun
  // is standing.
  var inkTo = up ? phi : half;
  if (inkTo > -half) {
    svg.appendChild(svgEl('path', {
      d: ringArc(g, -half, inkTo), fill: 'none', 'stroke-width': 1.5
    }, 'a-done'));
  }

  // The hour ring: one tick per whole hour of the local day, all twenty-four
  // of them, longer at the quarters. Below the horizon they go short and
  // faint — the night is still measured, just not lit.
  var hours = svgEl('g', { 'stroke-width': 1 }, 'a-hour');
  for (var h = 0; h < SKY_TICK_HOURS; h++) {
    var d = wrapDeg(sunAngle(h, noon));
    var lit = Math.abs(d) <= half;
    hours.appendChild(ringTick(g, d, h % 6 === 0 ? 6 : 4,
                               lit ? 'a-h-day' : 'a-h-night'));
  }
  svg.appendChild(hours);

  // The crossings: label engraved above the horizon, time below it, both at
  // the plate's outer edges where the curve cannot reach them.
  [[-half, 4, 'start', 'almRise', shown.rise],
   [half, g.W - 4, 'end', 'almSet', shown.set]]
  .forEach(function (foot) {
    var p = spot(g, foot[0]);
    svg.appendChild(svgEl('line', {
      x1: p.x.toFixed(2), y1: (p.y - 4).toFixed(2),
      x2: p.x.toFixed(2), y2: (p.y + 5).toFixed(2), 'stroke-width': 1.5
    }, 'a-foot'));
    svg.appendChild(skyText(foot[1], horizonY - 7, 'a-lab', t(foot[3]), foot[2]));
    svg.appendChild(skyText(foot[1], horizonY + 17, 'a-time', hhmm(foot[4]), foot[2]));
  });

  var s = spot(g, phi);
  if (up) {
    svg.appendChild(svgEl('circle', {
      cx: s.x.toFixed(2), cy: s.y.toFixed(2), r: 8, 'stroke-width': 1
    }, 'a-sun-ring'));
  }
  svg.appendChild(svgEl('circle', {
    cx: s.x.toFixed(2), cy: s.y.toFixed(2), r: up ? 4.5 : 3.2
  }, up ? 'a-sun' : 'a-sun down'));
  // The bead carries no time label. A regulator the size of a doorway is
  // standing between the two arches saying exactly that, and the plate's job
  // is the one thing the clock cannot say — WHERE in the day this is.

  return { svg: svg, sun: sun, shown: shown, here: here, at: at, tz: tzh };
}

/* ----- The board --------------------------------------------------------- */

function almPlaceName(p) {
  return (lang === 'zh' && p.name_zh) ? p.name_zh : (p.name || p.name_zh || '');
}

/* The station line is SIGNAGE — an address engraved on the case — so it
   stays English and true caps in both languages, exactly as the gates'
   addresses do. The localized name of the place is in the subtitle above. */
function almStation(p) {
  return (p.name || p.name_zh || '') + '  ·  '
       + Math.abs(p.lat).toFixed(2) + '°' + (p.lat >= 0 ? 'N' : 'S') + '  '
       + Math.abs(p.lon).toFixed(2) + '°' + (p.lon >= 0 ? 'E' : 'W');
}

function almDeg(v) {
  return (v === null || v === undefined) ? '—' : Math.round(v) + '°';
}

function almVitals(w) {
  var rows = [
    ['almHigh', w ? almDeg(w.high_c) : '—'],
    ['almLow', w ? almDeg(w.low_c) : '—'],
    ['almPrecip', w && w.precip_prob !== null && w.precip_prob !== undefined
                  ? w.precip_prob + '%' : '—'],
    ['almWind', w && w.wind_kmh !== null && w.wind_kmh !== undefined
                ? t('almWindUnit', { n: Math.round(w.wind_kmh) }) : '—']
  ];
  var box = el('div', 'al-vitals');
  rows.forEach(function (r) {
    var line = el('div', 'al-vrow');
    line.appendChild(el('span', 'al-vlabel display', t(r[0])));
    line.appendChild(el('span', 'al-vval num', r[1]));
    box.appendChild(line);
  });
  return box;
}

function buildRead(w) {
  var box = $('#al-read');
  box.textContent = '';
  box.dataset.blank = w ? 'no' : 'yes';
  var now = el('div', 'al-now');
  now.appendChild(el('span', 'al-temp num', w ? almDeg(w.now_c) : '—'));
  now.appendChild(el('span', 'al-cond zh-sentence',
    w ? (lang === 'zh' ? w.label_zh : w.label) : t('wkNoReading')));
  box.appendChild(now);
  box.appendChild(almVitals(w));
  // Fahrenheit lives in the tooltip: this reader is standing in a country
  // that speaks it, in a hall that does not.
  box.title = w && w.high_f !== null && w.high_f !== undefined
              && w.low_f !== null && w.low_f !== undefined
    ? t('almFahrenheit', { high: Math.round(w.high_f), low: Math.round(w.low_f) })
    : '';
}

function almStrip(label, value, spoken) {
  var row = el('div', 'al-strip');
  row.appendChild(el('span', 'al-slabel display', label));
  var v = el('span', 'al-sval num', value);
  row.appendChild(v);
  // "12:10" and "2'39"" are engraving, not speech.
  if (spoken) {
    v.setAttribute('aria-hidden', 'true');
    row.appendChild(el('span', 'sr-only', spoken));
  }
  return row;
}

function buildTape(sky, where) {
  var box = $('#al-tape');
  box.textContent = '';
  var at = (sky && sky.at) || new Date();
  var phase = moonPhase(at);

  // The disc carries no MOON caption on purpose: a picture of the moon
  // labelled "moon" is the redundancy the DIRECTORY board was struck for.
  var moon = el('div', 'al-moon');
  moon.appendChild(moonDisc(phase, 15));
  var text = el('div', 'al-mtext');
  text.appendChild(el('span', 'al-mname zh-sentence',
    t('almPhase' + phase.idx) + '  ·  ' + Math.round(phase.lit * 100) + '%'));
  text.appendChild(almStrip(t('almAge'), t('almDays', { n: phase.age.toFixed(1) })));
  moon.appendChild(text);
  box.appendChild(moon);

  if (!sky || !sky.sun || sky.sun.polar || !where) return;
  var sun = sky.sun;
  var strips = el('div', 'al-strips');
  // The same figure the crossings were engraved with, or the tape and the
  // dial print two different day lengths a centimetre apart.
  var dayLen = (sky.shown || sun).hours;
  // Rounded as a whole, never field by field: rounding only the minutes
  // printed "10:60" on the days the forecast was missing.
  var total = Math.round(dayLen * 60);
  var h = Math.floor(total / 60), mins = total % 60;
  strips.appendChild(almStrip(t('almDaylight'), h + ':' + pad2(mins),
    t('almSrHours', { h: h, m: mins })));

  var yest = sunTimes(where.lat, where.lon,
    localAt(where.timezone, new Date(at.getTime() - 86400000)), sky.tz);
  if (!yest.polar) {
    // Seconds, because across one day the difference is under two minutes and
    // rounding to minutes would print a flat zero for half the year. The
    // LABEL carries the direction — this hall does not signal with colour.
    var ds = Math.round((sun.hours - yest.hours) * 3600);
    var abs = Math.abs(ds);
    strips.appendChild(almStrip(t(ds >= 0 ? 'almLonger' : 'almShorter'),
      Math.floor(abs / 60) + '\u2032' + pad2(abs % 60) + '\u2033',
      t('almSrMinutes', { m: Math.floor(abs / 60), s: abs % 60 })));
  }
  box.appendChild(strips);
}

function renderAlmanac() {
  var sub = $('#al-sub');
  if (!sub) return;
  var where = almanac && almanac.place ? almanac.place : null;
  var host = $('#al-sky');
  // Measured BEFORE the old plate comes out: emptying the register first
  // collapses it to nothing, and the new plate would be inscribed in a box
  // of zero height.
  var sky = buildSky(where, host, almanac ? almanac.weather : null);
  host.textContent = '';
  host.appendChild(sky.svg);
  // The plate is a picture (aria-hidden); what it engraves is said here.
  var said = sky.shown ? t('almSrTimes', { rise: hhmm(sky.shown.rise), set: hhmm(sky.shown.set) })
    : sky.sun && sky.sun.polar ? t(sky.sun.polar === 'day' ? 'almPolarDay' : 'almPolarNight') : '';
  if (said) host.appendChild(el('p', 'sr-only', said));
  sub.textContent = where ? t('almSub', { place: almPlaceName(where) }) : '—';
  $('#al-station').textContent = where ? almStation(where) : '—';
  buildRead(almanac ? almanac.weather : null);
  buildTape(sky, where);
}

/* On screen only: the board is display:none below 2200px, and a hidden panel
   must never keep the hub calling out to a weather service. */
function almanacVisible() {
  var b = $('#almanac');
  return !!b && getComputedStyle(b).display !== 'none' &&
         document.visibilityState === 'visible';
}

function pollAlmanac() {
  if (!almanacVisible()) return Promise.resolve();
  return fetchJson('/api/almanac').then(function (a) {
    almanac = a;
    renderAlmanac();
  }).catch(function () { /* a restarting hub is not a forecast */ });
}

function startAlmanac() {
  clearInterval(almTimer);
  clearInterval(skyTimer);
  almTimer = setInterval(pollAlmanac, ALM_POLL_MS);
  skyTimer = setInterval(function () {
    if (!almanacVisible()) return;
    // Also the board's way back from a cold start: the case can be opened by
    // a window resize long after the boot fetch declined to run, and ten
    // minutes of a blank plate is not a wait, it is a fault.
    if (!almanac) { pollAlmanac(); return; }
    renderAlmanac();
  }, SKY_TICK_MS);
  pollAlmanac();
}

/* Pointer parallax: one rAF writer. It writes each gate shell's transform
   directly. It used to write two custom properties on #stage for the shells
   to read through calc(), but a custom property inherits, so every frame
   invalidated style for the whole stage subtree: at 3440 the median frame
   during a pointer sweep was 83ms. Gated on fine pointers, live
   reduced-motion (the CSS kill-switch can't stop rAF-written transforms),
   visibility, and the entrance having finished. */
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  function write() {
    var t = 'rotateY(' + (cx * 5).toFixed(3) + 'deg) rotateX(' + (cy * -3).toFixed(3) + 'deg)';
    var shells = document.querySelectorAll('#gates .g-shell');
    for (var i = 0; i < shells.length; i++) shells[i].style.transform = t;
  }
  function frame() {
    raf = null;
    if (root.dataset.motion === 'reduced') {
      if (cx || cy) { cx = 0; cy = 0; write(); }
      return;
    }
    cx += (tx - cx) * 0.1;
    cy += (ty - cy) * 0.1;
    write();
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) schedule();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('pointermove', function (e) {
    if (root.dataset.entered !== 'yes') return;   // let the entrance land
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    schedule();
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') schedule();
    else if (raf) { cancelAnimationFrame(raf); raf = null; }
  });
})();

/* ========================================================================
   Mode lever — re-lights the hall; never touches the Ledger (R11)
   ======================================================================== */
var lever = $('#lever');
var themeBusy = false;

var wingReorderT;

function setWing(w) {
  wingPending = w;
  var apply = function () {
    root.dataset.wing = w;
    if (wingPending === w) wingPending = null;
    store('atrium.wing', w);
    lever.setAttribute('aria-checked', String(w === 'bureau'));
    deskDrive(w === 'bureau' ? 1 : 0);
    layoutStage(false);
    // After the slide settles, re-append gates active-first so the tab
    // order matches the new composition (pixels don't move — gates are
    // transform-placed).
    clearTimeout(wingReorderT);
    wingReorderT = setTimeout(function () {
      var wrap = $('#gates');
      var had = document.activeElement;
      gateDomOrder().forEach(function (svc, i) {
        var a = $('#gate-' + svc.id);
        if (a && wrap.children[i] !== a) wrap.insertBefore(a, wrap.children[i] || null);
      });
      // Moving the focused node drops focus to <body>; put it back.
      if (had && had !== document.activeElement && had.isConnected && !had.inert) {
        had.focus({ preventScroll: true });
      }
    }, 750);
  };
  // Serialize: the lever re-light queues until a theme crossfade finishes.
  if (themeBusy) setTimeout(apply, 420); else apply();
}
/* Toggle target derives from the PENDING wing when a crossfade has queued
   the apply — two quick toggles must round-trip, not both land on the same
   side. */
var wingPending = null;
function toggleWing() {
  var cur = wingPending || root.dataset.wing;
  setWing(cur === 'salon' ? 'bureau' : 'salon');
}
lever.addEventListener('click', toggleWing);
lever.addEventListener('keydown', function (e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    // A held key auto-repeats, and each repeat used to throw the lever back.
    if (!e.repeat) toggleWing();
  }
});

/* ========================================================================
   Status / stats
   ======================================================================== */
function applyStatuses() {
  var openCount = 0, known = 0;
  services.forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    var st = statuses[svc.id];
    if (!a) return;
    var state = st ? st.state : 'checking';
    a.dataset.state = state;
    var lampT = $('.lamp-t', a);
    if (state === 'open') { lampT.textContent = 'OPEN'; openCount++; known++; }
    else if (state === 'dark') { lampT.textContent = 'DARK'; known++; }
    else { lampT.textContent = '…'; }
    lampT.title = t(state === 'open' ? 'lampOpen' :
                    state === 'dark' ? 'lampDark' : 'lampChecking');
    var sr = $('.lamp-sr', a);
    if (sr) sr.textContent = t(state === 'open' ? 'srOpen' : state === 'dark' ? 'srDark' : 'srChecking');
    if (state !== 'dark') $('.g-notice', a).hidden = true;
    var note = st && st.note && STR.en['note.' + st.note] !== undefined ? t('note.' + st.note) : '';
    $('.g-lamp', a).title = note || lampT.title;
    var noteEl = $('.g-note', a);
    if (noteEl) { noteEl.textContent = note; noteEl.hidden = !note; }
  });
  var allDark = known === services.length && known > 0 && openCount === 0;
  $('#all-dark').hidden = !allDark;

  // The hall is a picture; say out loud how many lines are open, so a screen
  // reader learns the same thing the lamps show. Only on change — a live
  // region rewritten every poll would announce itself every poll.
  // Nothing is said until a status is known: before the first answer (or
  // when /api/status fails) "LINES OPEN 0/6" was announced as fact.
  var st = $('#hall-status');
  if (st && services.length && known) {
    var msg = allDark ? t('allDark') : t('linesOpen', { n: openCount, m: services.length });
    if (st.textContent !== msg) st.textContent = msg;
  }
}

function statText(svc) {
  var s = stats[svc.id] || {};
  var st = statuses[svc.id];
  // A dark gate says nothing: three services used to keep their last figure
  // on a dark gate and in the ticker, two dropped it, and nothing said which
  // was which.
  if (st && st.state === 'dark') return '';
  if (svc.id === 'pressroom' && st && st.note === 'digest_stale') return t('stat.stale');
  if (svc.id === 'autopilot') {
    if (s.airing > 0) return t('stat.airing', { n: s.airing });
    if (s.watching !== undefined) return t('stat.watching', { n: s.watching });
  } else if (svc.id === 'groundstation') {
    if (s.pending > 0) return t('stat.pending', { n: s.pending });
    if (s.mods !== undefined) return t('stat.mods', { n: s.mods });
  } else if (svc.id === 'pressroom') {
    if (s.stories > 0) return t('stat.stories', { n: s.stories, m: s.sections || 0 });
  } else if (svc.id === 'arsenal') {
    if (s.tools > 0) return t('stat.tools', { n: s.tools });
  } else if (svc.id === 'bourse') {
    if (s.orders > 0) return t('stat.orders_await', { n: s.orders });
    if (s.date) return t('stat.brief_of', { date: s.date });
  } else if (svc.id === 'outreach') {
    var parts = [];
    if (s.total > 0) parts.push(t('stat.queue', { done: s.ready || 0, total: s.total }));
    if (s.invited !== undefined && s.invited > 0)
      parts.push(t('stat.invited', { n: s.invited, target: s.target || 20 }));
    return parts.join(' · ');
  }
  return '';
}

function applyStats() {
  services.forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    var span = $('.num-roll', a);
    var txt = statText(svc);
    if (span.textContent !== txt) {
      if (span.textContent && root.dataset.motion !== 'reduced') {
        clearTimeout(span._rollT);      // a stale timer would swap in old text
        span.classList.remove('roll');
        void span.offsetWidth;          // restart the odometer animation
        span.classList.add('roll');
        span._rollT = setTimeout(function () { span.textContent = txt; }, 240);
      } else {
        clearTimeout(span._rollT);
        span.textContent = txt;
      }
    }
  });
}

/* ========================================================================
   Ledger
   ======================================================================== */
/* "2026-09-21" on the wire, "Sep 21" / "9月21日" on the wall. Parsed as a
   local calendar day: new Date('2026-09-21') is UTC midnight, which is still
   the 20th anywhere west of Greenwich. */
function briefDay(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'short', day: 'numeric' }).format(new Date(+m[1], m[2] - 1, +m[3]));
}

/* Every line here must stay true after its day ends: a plaque filed under
   EARLIER is read tomorrow, so no string says "today". */
function headline(d) {
  var k = d.kind, p = d.params || {};
  switch (k) {
    case 'anime.premiere':
      return { head: p.title, detail: t(p.promoted ? 'k.anime.premiere.promoted' : 'k.anime.premiere') };
    case 'anime.completed':
      return { head: p.title, detail: t(p.eps ? 'k.anime.completed' : 'k.anime.completed.noeps', p) };
    case 'anime.landed':
      return { head: p.show, detail: t(p.ep ? 'k.anime.landed' : 'k.anime.landed.noep', p) };
    case 'anime.subscribed':
      return { head: p.title, detail: t(p.group ? 'k.anime.subscribed' : 'k.anime.subscribed.nogroup', p) };
    case 'anime.imported':
      return { head: p.title, detail: t('k.anime.imported') };
    case 'anime.unresolved':
      return { head: p.title, detail: t('k.anime.unresolved'), warn: true };
    case 'anime.grace':
      return { head: p.title, detail: t('k.anime.grace') };
    case 'autopilot.stalled':
      return { head: t('k.autopilot.stalled.head'),
               detail: t(p.hours >= 1 ? 'k.autopilot.stalled' : 'k.autopilot.stalled.fresh', p),
               warn: true };
    case 'autopilot.qb_down':
      return { head: t('k.autopilot.qb_down.head'), detail: t('k.autopilot.qb_down'), warn: true };
    case 'mods.updated':
      // An appId the hub cannot map arrives with game '' and used to leave a
      // bare separator behind: "Workshop update ·  · Fixed things".
      return { head: p.title,
               detail: t(p.game ? 'k.mods.updated' : 'k.mods.updated.nogame', p) +
                       (p.note ? ' · ' + p.note : '') };
    case 'mods.removed':
      return { head: p.title, detail: t('k.mods.removed'), warn: true };
    case 'mods.banned':
      return { head: p.title, detail: t('k.mods.banned'), warn: true };
    case 'outreach.queue_ready':
      return { head: t('k.outreach.queue_ready.head'), detail: t('k.outreach.queue_ready', p) };
    case 'outreach.progress':
      return { head: t('k.outreach.progress.head'), detail: t('k.outreach.progress', p) };
    case 'outreach.invites':
      return { head: t('k.outreach.invites.head'), detail: t('k.outreach.invites', p) };
    case 'outreach.error':
      return { head: t('k.outreach.error.head'), detail: t('k.outreach.error'), warn: true };
    case 'press.digest_ready':
      return { head: t('k.press.digest_ready.head'), detail: t('k.press.digest_ready', p) };
    case 'bourse.briefing':
      // Named by the market day it covers. Without it a week of holds read
      // as one line repeated, and "No action today" stood under EARLIER.
      var day = briefDay(p.date);
      return { head: t('k.bourse.briefing.head'),
               detail: t((p.orders > 0 ? 'k.bourse.briefing' : 'k.bourse.briefing.hold') +
                         (day ? '' : '.nodate'), { orders: p.orders, date: day }) };
    case 'bourse.canary':
      return { head: t('k.bourse.canary.head'), detail: t('k.bourse.canary', p), warn: true };
    case 'bourse.allclear':
      return { head: t('k.bourse.allclear.head'), detail: t('k.bourse.allclear') };
  }
  // A kind this page has never heard of — a hall deployed a new dispatch
  // while this tab sat open. Name the hall instead of leaking the raw kind.
  var svc = null;
  for (var i = 0; i < services.length; i++) {
    if (services[i].id === d.origin) { svc = services[i]; break; }
  }
  return { head: (svc ? svc.name : d.origin), detail: t('k.unknown') };
}

/* Ages are floored, as a person reads a clock: rounding put "60 min ago" on
   a dispatch not yet an hour old and "48 h ago" on one of 47.8 h. Past two
   days the count is calendar days, so a Monday dispatch can no longer read
   "3 d ago" on Wednesday evening. */
function relTime(ts) {
  var d = Date.now() - ts;
  if (d < 90 * 1000) return t('justNow');
  if (d < 3600 * 1000) return t('minAgo', { n: Math.floor(d / 60000) });
  if (d < 48 * 3600 * 1000) return t('hAgo', { n: Math.floor(d / 3600000) });
  var then = new Date(ts), today = new Date();
  then.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  // Rounded only to absorb a 23 or 25 hour day at a clock change.
  return t('dAgo', { n: Math.round((today - then) / 86400000) });
}

function buildPlaque(d) {
  var li = el('li', 'plaque');
  li.dataset.id = d.id;
  // pl-shadow-wrap is an unclipped wrapper that carries the drop-shadow filter.
  // The li itself only carries animations (arrive/cascading), so the browser can
  // promote animated opacity/transform to compositor layers without re-rasterizing
  // the filter every frame.
  var shadowWrap = el('div', 'pl-shadow-wrap');
  var frame = el('div', 'pl-frame');
  var a = el('a', 'pl-in');
  a.href = d.url;
  a.addEventListener('click', function (e) {
    e.preventDefault();
    markRead(d.id);   // following a dispatch is the least ambiguous read there is
    window.open(d.url, 'atrium-' + d.origin);
  });
  // Armed on the li, not the anchor: the medallion overhangs the spine
  // outside the frame, and a reader who rests on the sigil is on the plaque.
  armDwell(li, d.id);
  var medal = el('span', 'medal' + (d.wing === 'bureau' ? ' m-bureau' : ''));
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  var rim = document.createElementNS(ns, 'use');
  rim.setAttribute('href', '#medallion');
  rim.setAttribute('class', 'rim');
  svg.appendChild(rim);
  var sig = document.createElementNS(ns, 'use');
  var known = KNOWN_SIGILS[d.origin];
  sig.setAttribute('href', known ? '#mark-' + d.origin : '#sig-fallback');
  sig.setAttribute('class', known ? 'm-sig m-mark' : 'm-sig');
  svg.appendChild(sig);
  medal.appendChild(svg);
  li.appendChild(medal);   // outside the clipped layers — overhangs the spine
  a.appendChild(el('div', 'pl-head'));
  a.appendChild(el('span', 'sr-only pl-unread', t('unread')));
  a.appendChild(el('div', 'pl-detail'));
  a.appendChild(el('div', 'pl-time num'));
  frame.appendChild(a);
  shadowWrap.appendChild(frame);
  li.appendChild(shadowWrap);
  return li;
}

function updatePlaque(li, d) {
  var h = headline(d);
  li.classList.toggle('warn', !!h.warn);
  li.classList.toggle('new', isNew(d));
  var head = $('.pl-head', li);
  head.textContent = h.head || '';
  var cjk = /[\u3040-\u30ff\u3400-\u9fff]/.test(h.head || '');
  if (cjk !== (lang === 'zh')) head.lang = cjk ? 'zh' : 'en';
  else head.removeAttribute('lang');
  $('.pl-unread', li).textContent = t('unread');
  $('.pl-detail', li).textContent = h.detail || '';
  $('.pl-time', li).textContent = relTime(d.ts);
}

function renderLedger() {
  var ol = $('#plaques');
  var shown = feed.filter(function (d) {
    return chipFilter === 'all' || d.wing === chipFilter;
  });
  if (firstFeed) { ol.textContent = ''; }
  // Cache-prune ONLY dispatches that left the feed window for real; a
  // chip-hidden plaque is detached but keeps its cache entry, so toggling
  // the filter back never rebuilds it as "fresh" (would re-animate).
  var shownIds = {};
  shown.forEach(function (d) { shownIds[d.id] = 1; });
  Object.keys(plaqueEls).forEach(function (id) {
    var li = plaqueEls[id];
    var inFeed = feed.some(function (d) { return d.id === id; });
    if (!inFeed) {
      if (li.parentNode) li.parentNode.removeChild(li);
      delete plaqueEls[id];
    } else if (!shownIds[id] && li.parentNode) {
      li.parentNode.removeChild(li);
    }
  });
  // Clear empty markers and ghosts; day breaks are reused below.
  Array.prototype.slice.call(ol.querySelectorAll('.l-empty, .ghost'))
    .forEach(function (n) { n.parentNode.removeChild(n); });

  if (!shown.length) {
    Array.prototype.slice.call(ol.querySelectorAll('.daybreak'))
      .forEach(function (n) { n.parentNode.removeChild(n); });
    var empty = el('li', 'l-empty');
    var fl = svgUse('', '0 0 60 40', '#fleuron');
    empty.appendChild(fl);
    empty.appendChild(el('div', 'zh-sentence', t('empty')));
    ol.appendChild(empty);
    return;
  }
  var midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  var todayMs = midnight.getTime();
  var lastBucket = null;
  // Every node goes into `order`, and only nodes out of place are moved at
  // the end. The 45 s poll used to re-append every plaque, and moving the
  // node that holds focus drops focus to <body>: a keyboard reader lost
  // their place in the column every poll.
  var order = [];
  var oldBreaks = {};
  Array.prototype.forEach.call(ol.querySelectorAll('.daybreak'), function (n) {
    oldBreaks[n.dataset.bucket] = n;
  });
  shown.forEach(function (d) {
    var bucket = d.ts >= todayMs ? 'today' : 'earlier';
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      var db = oldBreaks[bucket] || el('li', 'daybreak display');
      delete oldBreaks[bucket];
      db.dataset.bucket = bucket;
      db.setAttribute('role', 'presentation');
      var dbh = db.firstElementChild;
      if (!dbh) {
        dbh = el('span', 'db-h');
        dbh.setAttribute('role', 'heading');
        dbh.setAttribute('aria-level', '3');
        db.appendChild(dbh);
      }
      dbh.textContent = t(bucket);
      if (ledgerOpening) {
        db.classList.add('cascading');
        db.style.setProperty('--ci', String(cascadeIndex));
        db.addEventListener('animationend', function () {
          db.classList.remove('cascading');
        }, { once: true });
        (function (el2) {
          // 1400ms > the 820ms stagger cap + the 420ms card-cascade duration.
          // A shorter guard strips .cascading mid-animation on the last cards.
          setTimeout(function () { el2.classList.remove('cascading'); }, 1400);
        })(db);
      }
      cascadeIndex++;
      order.push(db);
    }
    var li = plaqueEls[d.id];
    var fresh = false;
    if (!li) {
      li = buildPlaque(d);
      plaqueEls[d.id] = li;
      fresh = true;
    }
    updatePlaque(li, d);
    order.push(li);
    if (ledgerOpening) {
      // Cascade open: EVERY card falls, not just new ones. Plaque elements are
      // cached in plaqueEls across renders, so by the time the drawer is first
      // opened `fresh` is false for all of them — gating the cascade on `fresh`
      // meant the waterfall never ran on a real card, only on the day-breaks
      // (which are rebuilt each pass). Removed after the run so polls are clean.
      li.classList.add('cascading');
      li.style.setProperty('--ci', String(cascadeIndex++));
      li.addEventListener('animationend', function () {
        li.classList.remove('cascading');
      }, { once: true });
      (function (el) {
        setTimeout(function () { el.classList.remove('cascading'); }, 1400);
      })(li);
    } else if (fresh && !firstFeed) {
      // Normal arrive animation on poll-driven new dispatch
      li.classList.add('arrive');
      li.addEventListener('animationend', function () {
        li.classList.remove('arrive');
      }, { once: true });
      (function (el) {
        setTimeout(function () { el.classList.remove('arrive'); }, 700);
      })(li);
    }
  });
  Object.keys(oldBreaks).forEach(function (k) {
    var n = oldBreaks[k];
    if (n.parentNode) n.parentNode.removeChild(n);
  });
  order.forEach(function (node, i) {
    var at = ol.children[i];
    if (at !== node) ol.insertBefore(node, at || null);
  });
}

var badgeCount = 0;

function updateLedgerBadge() {
  var badge = $('#ledger-badge');
  var btn = $('#ledger-btn');
  if (!badge) return;
  var count = feed.filter(isNew).length;
  var was = badgeCount;
  badgeCount = count;

  badge.hidden = count <= 0;
  // The disc says "something arrived"; the number it stands for is still
  // reachable — read out by a screen reader, and on hover as a tooltip.
  var label = count <= 0 ? ''
    : count === 1 ? t('unreadCountOne') : t('unreadCount', { n: count });
  var slot = $('#ledger-badge-count');
  if (slot) slot.textContent = label;
  if (btn) {
    if (count > 0) btn.title = label;
    else btn.removeAttribute('title');
  }

  // Seat the disc only when the count actually grows. Re-polls return the
  // same dispatches, and re-animating on every tick would be idle motion.
  if (count > was) {
    badge.classList.remove('seating');
    void badge.offsetWidth;            // restart the animation
    badge.classList.add('seating');
  }
  syncStamp();
}

/* ----- The stamp ---------------------------------------------------------
   Resting on a plaque strikes one dispatch; this strikes the window. The
   hall's rule was never "nothing may mark wholesale" — it was that nothing
   marks except the READER, which is why opening and closing the drawer still
   clears nothing. A button pressed on purpose is the reader saying so.

   It clears BOTH WINGS even while a chip is filtering the column, because
   the annunciator on the masthead counts both wings: a control labelled
   "mark all read" that leaves the disc lit has not done what it says. The
   tooltip states it rather than leaving it to be discovered.
   ======================================================================== */
function syncStamp() {
  var btn = $('#mark-all');
  if (!btn) return;
  var idle = badgeCount <= 0;
  // aria-disabled, not the disabled attribute: a disabled button drops
  // focus to the body the moment the last dispatch is struck, and the
  // keyboard reader loses the drawer.
  btn.setAttribute('aria-disabled', String(idle));
  btn.classList.toggle('inert', idle);
  btn.title = idle ? t('markAllDone') : t('markAllHint');
  // Re-arm the live region while there is something to strike, so the next
  // run announces itself instead of writing a message that is already there.
  var say = $('#mark-all-status');
  if (say && !idle) say.textContent = '';
}

function stampAll() {
  var ids = feed.filter(isNew).map(function (d) { return d.id; });
  if (!ids.length) return;
  var nodes = Array.prototype.slice.call(
    document.querySelectorAll('#plaques .plaque.new'));

  function done() {
    nodes.forEach(function (li) { li.classList.remove('reading'); });
    markReadMany(ids);
    var say = $('#mark-all-status');
    if (say) say.textContent = t('markAllStruck', { n: ids.length });
  }

  if (!nodes.length || root.dataset.motion === 'reduced') { done(); return; }

  // The column stamps itself clear from the top down, running the same
  // 420ms drain a dwell runs — one mechanic, shown at scale. The stagger is
  // capped in TOTAL: at a flat 40ms a full window would take longer to
  // clear than the drawer takes to open, and the reader would be watching
  // an animation instead of a confirmation.
  var step = Math.min(40, 640 / nodes.length);
  nodes.forEach(function (li, i) {
    setTimeout(function () { li.classList.add('reading'); }, i * step);
  });
  setTimeout(done, (nodes.length - 1) * step + DWELL_MS);
}

var markAllBtn = $('#mark-all');
if (markAllBtn) {
  markAllBtn.addEventListener('click', function () {
    if (markAllBtn.getAttribute('aria-disabled') === 'true') return;
    stampAll();
  });
}

function openLedger() {
  var ledgerEl = $('#ledger');
  var scrimEl = $('#ledger-scrim');
  var ledgerBtnEl = $('#ledger-btn');
  if (!ledgerEl || !scrimEl || !ledgerBtnEl) return;
  // Mark opening for cascade
  ledgerOpening = true;
  cascadeIndex = 0;
  // Add .opening so spine animation fires, then remove after spine draw
  ledgerEl.classList.add('opening');
  setTimeout(function () { ledgerEl.classList.remove('opening'); }, 400);
  ledgerEl.inert = false;
  ledgerEl.classList.add('open');
  scrimEl.classList.add('visible');
  ledgerBtnEl.setAttribute('aria-expanded', 'true');
  renderLedger();
  ledgerOpening = false;
  // The drawer covers the hatch that opened it, so focus moves in with it:
  // to the drawer's heading, from where the chips, the stamp and the first
  // plaque are one Tab away. Tab then cycles the drawer and the hatch.
  var head = $('#ledger h2');
  if (head) head.focus({ preventScroll: true });
}

function closeLedger() {
  var ledgerEl = $('#ledger');
  var scrimEl = $('#ledger-scrim');
  var ledgerBtnEl = $('#ledger-btn');
  if (!ledgerEl || !scrimEl || !ledgerBtnEl) return;
  // A closed drawer is inert: off screen it still sat in the tab order, and
  // because focus marks a dispatch read, one pass of Tab through the page
  // struck the whole Ledger. Focus inside it goes back to the button first,
  // or making it inert would drop the reader's place onto <body>.
  if (ledgerEl.contains(document.activeElement)) ledgerBtnEl.focus();
  ledgerEl.inert = true;
  ledgerEl.classList.remove('open');
  scrimEl.classList.remove('visible');
  ledgerBtnEl.setAttribute('aria-expanded', 'false');
  // Closing marks nothing. Reading is what the pointer did while the drawer
  // was open, and a plaque three screens down was not read by the act of
  // shutting the drawer over it.
  renderLedger();
  updateLedgerBadge();
}

function renderGhosts() {
  var ol = $('#plaques');
  ol.textContent = '';
  for (var i = 0; i < 3; i++) {
    var li = el('li', 'plaque ghost');
    li.appendChild(el('div', 'pl-in'));
    ol.appendChild(li);
  }
}

/* Radiogroup keyboard pattern: roving tabindex (checked = 0, rest = -1),
   arrows move + select, Home/End jump. Shared by the chips and the prefs
   radio groups. */
function radioKeydown(radios, idx, e, commit) {
  var next = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    next = radios[(idx + 1) % radios.length];
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    next = radios[(idx - 1 + radios.length) % radios.length];
  } else if (e.key === 'Home') {
    next = radios[0];
  } else if (e.key === 'End') {
    next = radios[radios.length - 1];
  }
  if (!next) return;
  e.preventDefault();
  next.focus();
  commit(next);
}

function updateRoving(radios) {
  radios.forEach(function (r) {
    r.tabIndex = r.getAttribute('aria-checked') === 'true' ? 0 : -1;
  });
}

/* Chips — session-only, always start at ALL; no code path ties the lever
   to the chips (R11). */
var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
chips.forEach(function (chip, idx) {
  chip.addEventListener('click', function () { selectChip(chip); });
  chip.addEventListener('keydown', function (e) {
    radioKeydown(chips, idx, e, selectChip);
  });
});
function selectChip(chip) {
  chips.forEach(function (c) { c.setAttribute('aria-checked', String(c === chip)); });
  updateRoving(chips);
  chipFilter = chip.dataset.chip;
  renderLedger();
}

/* ========================================================================
   Ticker — status band + only-what's-new; never wing-filtered (R11)
   ======================================================================== */
function renderTicker() {
  var ticker = $('#ticker');
  var track = $('#ticker-track');
  var segs = [];
  var open = 0, known = 0;
  services.forEach(function (s) {
    var st = statuses[s.id];
    if (st && st.state !== 'checking') { known++; if (st.state === 'open') open++; }
  });
  if (known) segs.push(t('linesOpen', { n: open, m: services.length }));
  services.forEach(function (s) {
    var txt = statText(s);
    if (txt) segs.push(txt);
  });
  var fresh = feed.filter(isNew).slice(0, 6);
  var freshTexts = fresh.map(function (d) {
    var h = headline(d);
    return (h.head + ' · ' + h.detail);
  });

  track.textContent = '';
  function sep() {
    // The diamond is ornament; a screen reader hears a pause instead of
    // "black diamond", and the segments no longer run together.
    var s = el('span', 't-sep');
    var d = el('span', '', '\u25c6');
    d.setAttribute('aria-hidden', 'true');
    s.appendChild(d);
    s.appendChild(el('span', 'sr-only', '; '));
    return s;
  }
  function pushSegs(list, cls) {
    list.forEach(function (s, i) {
      if (track.childNodes.length) track.appendChild(sep());
      var seg = el('span', cls || '', s);
      // A CJK title in the English hall (or a Latin one in the Chinese) is
      // tagged, so a screen reader switches voice instead of spelling it.
      var cjk = /[\u3040-\u30ff\u3400-\u9fff]/.test(s);
      if (cjk !== (lang === 'zh')) seg.lang = cjk ? 'zh' : 'en';
      track.appendChild(seg);
    });
  }
  function makeRolling() {
    // Append the trailing separator FIRST, then clone — the track becomes
    // (A◆)(A◆) so the -50% loop lands exactly on the period (a clone taken
    // before the separator would jump by half a separator every cycle).
    track.appendChild(sep());
    // The loop needs a second copy of the band; a screen reader does not.
    var twin = el('span', 't-twin');
    twin.setAttribute('aria-hidden', 'true');
    Array.prototype.slice.call(track.childNodes).forEach(function (n) {
      twin.appendChild(n.cloneNode(true));
    });
    track.appendChild(twin);
    var chars = track.textContent.length;
    ticker.style.setProperty('--t-dur', Math.max(26, chars * 0.32) + 's');
    ticker.classList.add('rolling');
    ticker.classList.remove('static');
  }
  if (freshTexts.length) {
    pushSegs(segs);
    pushSegs(freshTexts, 't-new');
    makeRolling();
  } else {
    pushSegs(segs.length ? segs : ['—']);
    ticker.classList.add('static');
    ticker.classList.remove('rolling');
    // A status line wider than the band still needs to roll.
    requestAnimationFrame(function () {
      if (track.scrollWidth > ticker.clientWidth - 8) makeRolling();
    });
  }
}

/* ========================================================================
   Polling — 45 s, visibility-gated, immediate refetch on refocus
   ======================================================================== */
function fetchJson(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error(url + ' -> ' + r.status);
    return r.json();
  });
}

function refresh() {
  // The dateline was written once at load, so a hall left open overnight
  // printed yesterday under a clock whose date aperture had already turned.
  renderDateline();
  // Self-heal a failed boot: if the registry never arrived (hub restarting
  // when the tab loaded), retry it on the regular poll cadence.
  var reg = services.length ? Promise.resolve(null)
    : fetchJson('/api/services').then(function (payload) {
        services = payload.services || [];
        if (services.length) renderGates();
      }).catch(function () { return null; });
  return Promise.all([
    reg,
    fetchJson('/api/status').catch(function () { return null; }),
    fetchJson('/api/feed').catch(function () { return null; }),
    fetchJson('/api/stats').catch(function () { return null; })
  ]).then(function (all) {
    var res = all.slice(1);
    if (res[0]) statuses = res[0].services || {};
    if (res[2]) stats = res[2].stats || {};
    applyStatuses();
    applyStats();
    if (res[1]) {
      feed = res[1].dispatches || [];
      renderLedger();
      firstFeed = false;
    }
    updateLedgerBadge();
    renderTicker();
  });
}

setInterval(function () {
  if (document.visibilityState === 'visible') refresh();
}, 45000);
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible') return;
  refresh();
  // The bead goes at most a minute stale while the tab is hidden, but the
  // reading behind it can be an hour old — both are re-read on the way back.
  pollAlmanac();
});

/* ========================================================================
   Preferences overlay — focus-trapped dialog, Esc closes (R4/R5)
   ======================================================================== */
var prefs = $('#prefs');
var prefsBtn = $('#prefs-btn');
var lastFocus = null;

var FOCUSABLE = 'button, [href], input, select, [tabindex]:not([tabindex="-1"])';

/* Bound on document while the dialog is open — a keydown must close/trap
   even when focus fell to body (e.g. after clicking sheet padding). */
function prefsKeydown(e) {
  if (e.key === 'Escape') { closePrefs(); return; }
  if (e.key !== 'Tab') return;
  var focusables = prefs.querySelectorAll(FOCUSABLE);
  if (!focusables.length) return;
  var first = focusables[0], last = focusables[focusables.length - 1];
  if (!prefs.contains(document.activeElement)) {
    e.preventDefault(); first.focus(); return;
  }
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

/* aria-modal promises the rest of the page is out of reach; inert makes
   it true for a screen reader's virtual cursor as well as for Tab. */
var PREFS_BEHIND = ['#hall', '#signal-desk', '#ledger', '#ledger-scrim', '#keyplate'];
function openPrefs() {
  lastFocus = document.activeElement;
  PREFS_BEHIND.forEach(function (s) { var n = $(s); if (n) n.inert = true; });
  prefs.hidden = false;
  syncPrefRadios();
  document.addEventListener('keydown', prefsKeydown);
  var first = prefs.querySelector('[role=radio][aria-checked=true]') ||
              prefs.querySelector('button');
  if (first) first.focus();
}
function closePrefs() {
  PREFS_BEHIND.forEach(function (s) { var n = $(s); if (n) n.inert = false; });
  // The drawer keeps its own rule: inert whenever it is shut.
  var l = $('#ledger');
  if (l) l.inert = !l.classList.contains('open');
  prefs.hidden = true;
  document.removeEventListener('keydown', prefsKeydown);
  if (lastFocus) lastFocus.focus();
}
prefsBtn.addEventListener('click', openPrefs);
$('#prefs-close').addEventListener('click', closePrefs);
prefs.addEventListener('click', function (e) {
  if (e.target === prefs) closePrefs();
});

/* ========================================================================
   Ledger drawer — open/close wiring
   ======================================================================== */
var ledgerBtnEl = $('#ledger-btn');
var ledgerScrimEl = $('#ledger-scrim');

if (ledgerBtnEl) {
  ledgerBtnEl.addEventListener('click', function () {
    var ledgerEl = $('#ledger');
    if (ledgerEl && ledgerEl.classList.contains('open')) {
      closeLedger();
    } else {
      openLedger();
    }
  });
}

if (ledgerScrimEl) {
  ledgerScrimEl.addEventListener('click', function () {
    closeLedger();
  });
}

/* Escape closes ledger (non-modal; does not fight prefs Escape which is
   bound while prefs is open and removed when it closes). */
document.addEventListener('keydown', function (e) {
  var ledgerEl = $('#ledger');
  var open = ledgerEl && ledgerEl.classList.contains('open');
  // Preferences sits above the drawer; one Escape closes one layer.
  if (!prefs.hidden) return;
  if (e.key === 'Escape' && open) {
    closeLedger();
    if (ledgerBtnEl) ledgerBtnEl.focus();
    return;
  }
  if (e.key === 'Tab' && open) {
    var ring = [ledgerBtnEl].concat(Array.prototype.slice.call(
      ledgerEl.querySelectorAll(FOCUSABLE)));
    // Handled in full: the hatch and the drawer are not neighbours in the
    // document, so leaving Tab to the browser from the hatch walked straight
    // on into the masthead behind the scrim.
    var ring2 = ring.filter(function (n) { return n && n.offsetParent !== null; });
    var i = ring2.indexOf(document.activeElement);
    e.preventDefault();
    var n2 = ring2.length;
    ring2[i < 0 ? (e.shiftKey ? n2 - 1 : 0) : (i + (e.shiftKey ? n2 - 1 : 1)) % n2].focus();
  }
});

function syncPrefRadios() {
  var current = {
    theme: root.dataset.themePref || 'system',
    lang: lang,
    motion: root.dataset.motionPref || 'system',
    ui: root.dataset.ui || 'm'
  };
  Array.prototype.forEach.call(prefs.querySelectorAll('[data-pref]'), function (group) {
    var pref = group.dataset.pref;
    var radios = Array.prototype.slice.call(group.querySelectorAll('[role=radio]'));
    radios.forEach(function (r) {
      r.setAttribute('aria-checked', String(r.dataset.value === current[pref]));
    });
    updateRoving(radios);
  });
}

/* Arrow-key selection inside each prefs radiogroup. */
Array.prototype.forEach.call(prefs.querySelectorAll('[data-pref]'), function (group) {
  var radios = Array.prototype.slice.call(group.querySelectorAll('[role=radio]'));
  radios.forEach(function (r, idx) {
    r.addEventListener('keydown', function (e) {
      radioKeydown(radios, idx, e, function (next) { next.click(); });
    });
  });
});

prefs.addEventListener('click', function (e) {
  var btn = e.target.closest('[role=radio]');
  if (!btn) return;
  var pref = btn.parentNode.dataset.pref;
  var val = btn.dataset.value;
  if (pref === 'theme') setThemePref(val);
  else if (pref === 'lang') setLang(val);
  else if (pref === 'motion') {
    root.dataset.motionPref = val;
    store('atrium.motion', val);
    resolveMotion();
  } else if (pref === 'ui') {
    root.dataset.ui = val;
    store('atrium.ui', val);
    // --ui moves the arch module as well as the lettering, so the slots the
    // stage was solved against are stale the moment the property lands.
    // Re-solve after the style recalc, and re-hang the aisle boards with it.
    requestAnimationFrame(function () { layoutStage(true); });
  }
  syncPrefRadios();
});

var mq = matchMedia('(prefers-color-scheme: dark)');
function resolveTheme() {
  var pref = root.dataset.themePref || 'system';
  var dark = pref === 'onyx' || (pref === 'system' && mq.matches);
  var next = dark ? 'onyx' : 'ivory';
  if (root.dataset.theme !== next) {
    themeBusy = true;
    root.dataset.theme = next;
    setTimeout(function () { themeBusy = false; }, 420);
  }
}
function setThemePref(pref) {
  root.dataset.themePref = pref;
  store('atrium.theme', pref);
  resolveTheme();
}
// Follow-system reacts live with the same crossfade.
if (mq.addEventListener) mq.addEventListener('change', resolveTheme);

function setLang(next) {
  lang = next === 'zh' ? 'zh' : 'en';
  root.lang = lang;
  store('atrium.lang', lang);
  applyI18nStatic();
  renderDateline();
  slots().forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    $('.g-desc', a).textContent = t(descKey(svc));
    if (svc.vacant) {
      $('.g-name', a).title = t('vacantName');
      $('.lamp-t', a).title = t('vacantLamp');
    }
  });
  applyStatuses();
  applyStats();
  renderLedger();
  relabelWorks();
  renderAlmanac();
  if (keyplate && !keyplate.hidden) renderKeyplate();
  updateLedgerBadge();
  renderTicker();
  // Bay numbers are localized ("BAY III" / "第 III 间"), so the wall is
  // re-lettered with everything else.
  buildAisles();
}

function applyI18nStatic() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (n) {
    n.textContent = t(n.dataset.i18n);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (n) {
    n.setAttribute('aria-label', t(n.dataset.i18nAria));
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (n) {
    n.title = t(n.dataset.i18nTitle);
  });
}

function renderDateline() {
  var fmt = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' });
  var txt = fmt.format(new Date());
  if ($('#dateline').textContent !== txt) $('#dateline').textContent = txt;
}

/* The poll alone left the dateline up to 45 s behind the clock's DATE
   aperture, and TODAY's plaques under TODAY for as long. A timer aimed at
   the next local midnight turns both with the clock. setHours(24) is the
   next midnight across a clock change too, and a timer that wakes early
   (or late, from a sleeping laptop) simply re-aims. */
var midnightT = 0;
function armMidnight() {
  clearTimeout(midnightT);
  var next = new Date();
  next.setHours(24, 0, 0, 0);
  midnightT = setTimeout(function () {
    renderDateline();
    if (!firstFeed) renderLedger();
    armMidnight();
  }, next.getTime() - Date.now() + 50);
}

// Replay leaves a one-shot flag for the pre-paint script and reloads. Every
// load plays the entrance anyway; the flag is for a reader who set motion to
// reduced, who then gets the quiet fade rather than a run of hard cuts.
$('#replay').addEventListener('click', function () {
  try { sessionStorage.setItem('atrium.replay', '1'); } catch (e) { /* plain reload */ }
  location.reload();
});

/* Motion follows the system unless the reader chose otherwise, and the OS
   setting can change while the hall is open. */
var mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
function resolveMotion() {
  var pref = root.dataset.motionPref || 'system';
  var next = pref === 'system' ? (mqMotion.matches ? 'reduced' : 'full') : pref;
  if (root.dataset.motion !== next) {
    root.dataset.motion = next;
    // The clock drives itself; tell it to swap sweep for deadbeat.
    window.dispatchEvent(new Event('atrium:motionchange'));
  }
}
mqMotion.addEventListener('change', resolveMotion);

/* Another tab changed something this one shows. Apply it without writing
   it back, or two tabs would volley the same value forever. */
window.addEventListener('storage', function (e) {
  if (e.key === READ_KEY) {
    loadReadIds().forEach(function (id) { readIds[id] = 1; });
    syncReadMarks();
  } else if (e.key === 'atrium.theme') {
    root.dataset.themePref = e.newValue || 'system';
    resolveTheme();
  } else if (e.key === 'atrium.lang') {
    if ((e.newValue === 'zh' ? 'zh' : 'en') !== lang) setLang(e.newValue);
  } else if (e.key === 'atrium.motion') {
    root.dataset.motionPref = e.newValue || 'system';
    resolveMotion();
  } else if (e.key === 'atrium.ui') {
    root.dataset.ui = (e.newValue === 's' || e.newValue === 'l') ? e.newValue : 'm';
    requestAnimationFrame(function () { layoutStage(true); });
  } else {
    return;
  }
  if (!prefs.hidden) syncPrefRadios();
});

/* ========================================================================
   Keys: the hall by keyboard
   ------------------------------------------------------------------------
   Tab still walks everything. On top of it: arrows walk the gates of the
   lit wing left to right, digits jump to one, Enter opens it (it is a
   link), W throws the lever, L opens and closes the Ledger (arrows then
   walk its dispatches), P opens Preferences, ? shows the key plate, Esc
   closes the top layer. Nothing fires while a modifier is held, while
   Preferences is open or while the entrance is still playing.
   ======================================================================== */
var keyplate = $('#keyplate');

function litGates() {
  return Array.prototype.slice.call(
    document.querySelectorAll('#gates .gate.active:not(.vacant)'))
    .sort(function (a, b) {
      return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
    });
}

function renderKeyplate() {
  if (!keyplate) return;
  var n = litGates().length;
  var rows = [
    ['\u2190 \u2192', 'keyGates'],
    [n > 1 ? '1 \u2013 ' + n : '1', 'keyJump'],
    [t('keyEnter'), 'keyOpen'],
    ['W', 'keyLever'],
    ['L', 'keyLedger'],
    ['\u2191 \u2193', 'keyWalk'],
    ['P', 'keyPrefs'],
    ['?', 'keyPlate'],
    ['ESC', 'keyClose'],
  ];
  var list = $('.kp-rows', keyplate);
  list.textContent = '';
  rows.forEach(function (r) {
    var row = el('div', 'kp-row');
    row.appendChild(el('kbd', 'kp-key display', r[0]));
    row.appendChild(el('span', 'kp-do', t(r[1])));
    list.appendChild(row);
  });
  $('.kp-title', keyplate).textContent = t('keysTitle');
}

function toggleKeyplate(show) {
  if (!keyplate) return;
  var next = show === undefined ? keyplate.hidden : show;
  if (next) renderKeyplate();
  keyplate.hidden = !next;
}

function focusGate(i) {
  var gates = litGates();
  if (!gates.length) return;
  var g = gates[Math.max(0, Math.min(gates.length - 1, i))];
  g.focus({ preventScroll: true });
}

document.addEventListener('keydown', function (e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!prefs.hidden || root.dataset.entered !== 'yes') return;
  var tgt = e.target;
  if (tgt && (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName))) return;
  var k = e.key;
  var ledgerEl = $('#ledger');
  var ledgerOpen = ledgerEl && ledgerEl.classList.contains('open');

  if (k === '?') { e.preventDefault(); toggleKeyplate(); return; }
  if (k === 'Escape' && keyplate && !keyplate.hidden && !ledgerOpen) {
    toggleKeyplate(false); return;
  }

  if (ledgerOpen) {
    if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End') {
      // Chips keep their own arrows (they are a radio group).
      if (tgt && tgt.closest && tgt.closest('.chips')) return;
      var links = Array.prototype.slice.call(ledgerEl.querySelectorAll('.plaque a'));
      if (!links.length) return;
      e.preventDefault();
      var at = links.indexOf(document.activeElement);
      var next = k === 'Home' ? 0 : k === 'End' ? links.length - 1 :
        at < 0 ? 0 : Math.max(0, Math.min(links.length - 1, at + (k === 'ArrowDown' ? 1 : -1)));
      links[next].focus();
    } else if (k === 'l' || k === 'L') {
      e.preventDefault();
      closeLedger();
      if (ledgerBtnEl) ledgerBtnEl.focus();
    }
    return;
  }

  var gates = litGates();
  var ae = document.activeElement;
  var onGate = gates.indexOf(ae);
  if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Home' || k === 'End') {
    // Arrows belong to the gates only when focus is on one, or nowhere in
    // particular; the lever, the chips and the radios keep theirs.
    if (onGate < 0 && ae && ae !== document.body) return;
    e.preventDefault();
    if (k === 'Home') focusGate(0);
    else if (k === 'End') focusGate(gates.length - 1);
    else if (onGate < 0) focusGate(k === 'ArrowRight' ? 0 : gates.length - 1);
    else focusGate(onGate + (k === 'ArrowRight' ? 1 : -1));
  } else if (/^[1-9]$/.test(k)) {
    var n = +k;
    if (n <= gates.length) { e.preventDefault(); focusGate(n - 1); }
  } else if (k === 'w' || k === 'W') {
    e.preventDefault();
    if (e.repeat) return;
    var keep = onGate;
    toggleWing();
    // The wing that was lit goes inert, and focus with it. Land on the gate
    // in the same bay of the wing coming forward.
    if (keep >= 0) setTimeout(function () { focusGate(keep); }, themeBusy ? 480 : 60);
    if (keyplate && !keyplate.hidden) setTimeout(renderKeyplate, 700);
  } else if (k === 'l' || k === 'L') {
    e.preventDefault();
    openLedger();
  } else if (k === 'p' || k === 'P') {
    e.preventDefault();
    openPrefs();
  }
});

/* ========================================================================
   Boot
   ======================================================================== */
applyI18nStatic();
renderDateline();
armMidnight();
renderGhosts();
buildRosetteKnurl();
buildDesk();
buildFloorInlay();
renderWorks();      // the dials stand engraved before the first reading
buildAisles();
renderAlmanac();    // the plate is engraved before the first forecast lands
startWorks();
startAlmanac();
// Seed the inline --drive: without it the first throw's getDrive() would
// read the wing-attribute CSS rule AFTER setWing flips the attribute —
// from === target, so the ease and the 55% steam latch would both vanish.
setDrive(root.dataset.wing === 'bureau' ? 1 : 0);
lever.setAttribute('aria-checked', String(root.dataset.wing === 'bureau'));

/* The marquee's chaser: every third bulb steps one pitch every 300 ms, at
   night, in full motion, while the page is visible. */
(function chaser() {
  var tk = $('#ticker');
  if (!tk) return;
  var k = 0;
  setInterval(function () {
    if (document.hidden || root.dataset.motion !== 'full' || root.dataset.theme !== 'onyx') {
      if (tk.dataset.chase !== '0') tk.dataset.chase = '0';
      return;
    }
    k = (k + 1) % 3;
    tk.dataset.chase = String(k);
  }, 300);
})();

/* ?steam=1 (debug, not persisted): freeze a burst at four life stages so
   headless screenshots can QA the vapor without a pointer. */
if (new URLSearchParams(location.search).get('steam') === '1' && deskNozzle) {
  [-100, -350, -650, -900].forEach(function (offset, i) {
    var p = document.createElement('div');
    p.className = 'puff';
    p.style.cssText = '--dx:' + (i * 10 - 8) + 'px;--rise:-84px;--s:2.6;' +
      '--rot:24deg;animation-duration:1200ms;' +
      'animation-delay:' + offset + 'ms;animation-play-state:paused;';
    deskNozzle.appendChild(p);
  });
}

if (root.dataset.entered === 'no') playEntrance();

fetchJson('/api/services').then(function (payload) {
  services = payload.services || [];
  renderGates();
  return refresh();
}).catch(function () {
  // Hub API unreachable — leave ghosts; refresh() retries the registry.
}).then(function () {
  // Deep links run regardless of how the boot fetch fared. ?ledger=1 is the
  // debug-only twin of ?prefs=1 — the drawer is the one surface a headless
  // screenshot cannot reach, since opening it takes a click.
  var q = new URLSearchParams(location.search);
  if (q.get('prefs') === '1') openPrefs();
  if (q.get('ledger') === '1') openLedger();
});

})();
