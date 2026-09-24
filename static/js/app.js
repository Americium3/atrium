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
    hubLost: 'NO WORD FROM THE HUB',
    ledgerUnreadable: 'The Ledger could not be read',
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
    markAllScope: 'BOTH WINGS',
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
    hubLost: '中枢没有回音',
    ledgerUnreadable: '消息总台暂时读不出来',
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
    markAllScope: '两翼一并',
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
/* What the Ledger may claim. Until a feed has landed it is 'loading' and the
   ghosts stay; a feed that could not be read is 'failed', which is not the
   same fact as an empty window and must not say "No dispatches". */
var feedState = 'loading';
var plaqueEls = {};   // dispatch id -> element (re-polls never re-animate)
/* Every dispatch id this page has shown. The plaque cache forgets an id the
   moment it leaves the feed, so a dispatch that dropped out for one poll (a
   hub restarting) came back playing 'arrive' as if it were news. */
var seenIds = {};
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

/* Where the pointer last really was. Chrome answers content moving under a
   still pointer (the drawer sliding in, a poll pushing the column down, a
   chip reflowing it) with pointerover/pointerenter at the SAME coordinates
   and no pointermove, so an enter proves nothing about the reader. Recorded
   in the capture phase, before any card sees the event, with the verdict
   kept for the cards to read. */
var ptrX = NaN, ptrY = NaN, ptrMoved = false;
window.addEventListener('pointermove', function (e) {
  ptrMoved = e.clientX !== ptrX || e.clientY !== ptrY;
  ptrX = e.clientX;
  ptrY = e.clientY;
}, { capture: true, passive: true });

/* Set while the hall itself moves focus onto a plaque (the focused one left
   the feed): the caret landed there, but the reader did not put it there. */
var quietFocus = false;

/* Arm a card so resting on it marks its dispatch read. Touch is excluded on
   purpose: a tap fires pointerenter, which would mark dispatches read for
   the crime of being scrolled past under a thumb. Keyboard gets the same
   deal as the pointer — focus IS the caret coming to rest, so it marks at
   once rather than after a dwell nobody could see.
   The dwell starts on a pointermove that actually moved, never on
   pointerenter: a card that slides under a pointer resting on the hall was
   not reached by the reader, and the drawer opening over a parked mouse
   used to strike whichever plaque landed under it. */
function armDwell(node, id) {
  var timer = null;
  function cancel() {
    clearTimeout(timer);
    timer = null;
    node.classList.remove('reading');
  }
  // renderLedger calls this when it detaches or moves the card: a removed
  // node never hears pointerleave, and its timer struck it anyway.
  node._dwellCancel = cancel;
  node.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (timer || !ptrMoved) return;
    // .reading runs the dwell out loud — the champagne rim drains and the
    // diamond closes over exactly DWELL_MS, so a mechanic with no button to
    // press still shows its work, and leaving early visibly aborts it.
    node.classList.add('reading');
    timer = setTimeout(function () {
      timer = null;
      node.classList.remove('reading');
      // A dwell that ran its course on a card still in the column stands,
      // even with a poll in flight that will drop the dispatch: the reader
      // rested on what the hall showed, for the whole dwell. Holding the
      // mark until the answer lands would leave a drained rim on an unread
      // card for as long as the hub takes (up to FETCH_MS).
      if (node.isConnected) markRead(id);
    }, DWELL_MS);
  });
  node.addEventListener('pointerleave', cancel);
  node.addEventListener('focusin', function () {
    cancel();
    if (!quietFocus) markRead(id);
  });
}

/* Every running dwell stops: the drawer opening or shutting moves the whole
   column out from under the pointer. */
function cancelDwells() {
  Object.keys(plaqueEls).forEach(function (id) {
    var li = plaqueEls[id];
    if (li._dwellCancel) li._dwellCancel();
  });
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
  // Per-letter stagger: 38ms × 5 = 190ms total; last letter at 1500+190+420=2110ms.
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
  //   --dock-y = mono.cy - lift - burst.cy (px)
  //   --dock-s = mono.width / (burst.width * 0.23)
  //   * 0.23: SVG viewBox=800x800, circle r=92, diameter=184, 184/800=0.23.
  // The masthead rises in with the flight (rise-in from translateY(14px),
  // CSS delay 1.8s), so the rosette may still be low when this reads it.
  // `lift` is how low, read off the masthead's own transform this frame, so
  // the circle aims at where the rosette comes to rest. A fixed -14px was
  // only right while the rise-in had not begun. The masthead now starts
  // with the flight rather than 200ms after it: the circle has to land on a
  // rosette that is there to land on.
  at(1800, function () {
    var mono  = $('#monogram').getBoundingClientRect();
    var burst = $('.e-burst').getBoundingClientRect();
    var mast  = $('#masthead');
    var lift  = mast ? new DOMMatrixReadOnly(getComputedStyle(mast).transform).m42 : 0;
    entrance.style.setProperty('--dock-x',
      (mono.left + mono.width / 2 - (burst.left + burst.width / 2)) + 'px');
    entrance.style.setProperty('--dock-y',
      (mono.top + mono.height / 2 - lift - (burst.top + burst.height / 2)) + 'px');
    entrance.style.setProperty('--dock-s',
      String(mono.width / (burst.width * 0.23)));
    entrance.classList.add('dock');
  });

  // Beat 7 — done-fade (2140ms).
  // 30ms gap after last letter (2110ms): load-bearing. A done-fade that
  // fires while the sixth letter is still animating cuts it off mid-stamp.
  // From here the panels are hidden and the void is clear, so the overlay
  // stops catching the pointer (CSS): the hall is visible, and a click on
  // it lands the entrance and then does what it says (see entranceSkip).
  at(2140, function () { entrance.classList.add('done-fade'); });

  // Beat 8 — the dial wakes (2320ms).
  // Only once the wordmark has faded (2140 + 180ms). The letters print
  // across the middle of the dial, and a dial waking behind them read as
  // ATRIUM stencilled over the clock face. The floor's reflections come up
  // with it, so the stone never reflects an empty niche.
  at(2320, function () { entrance.classList.add('dial'); });

  // Beat 9 — finish (2700ms).
  at(2700, finishEntrance);

  // Any input cuts the entrance short. Until done-fade the overlay has
  // pointer-events:auto, so a pointerdown lands on the overlay; it is
  // swallowed there, and so is the click it turns into (swallowNextClick),
  // because by the time that click is hit-tested the overlay has gone and
  // it would land on whatever gate, lever or hatch was under the finger.
  // After done-fade a pointerdown reaches the hall itself: the entrance
  // lands and the click goes on to the thing that was clicked.
  entranceSkip = function (e) {
    var type = e ? e.type : '';
    if (type === 'keydown') {
      // Only the keys the hall itself would act on are swallowed: F5,
      // Ctrl+R and the like keep working.
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !/^F\d+$/.test(e.key)) e.preventDefault();
    } else if (type === 'pointerdown' && entrance.contains(e.target)) {
      e.preventDefault();
      swallowNextClick();
    }
    // A wheel turn only lands the hall. It is passive: the hall never
    // scrolls, so there is nothing to cancel.
    finishEntrance();
  };
  window.addEventListener('pointerdown', entranceSkip, true);
  window.addEventListener('keydown', entranceSkip);
  window.addEventListener('wheel', entranceSkip, { passive: true });
}

var entranceSkip = null;

/* preventDefault on pointerdown stops a mouse's compatibility events but
   not the click a touchscreen synthesizes from a tap. That click is eaten
   here, in the capture phase, before anything in the hall sees it. The
   trap disarms itself shortly after the pointer comes up, so a skip that
   never turns into a click (a drag, a cancelled touch) cannot eat a later,
   deliberate one. */
function swallowNextClick() {
  var armed = true;
  function eat(e) { e.preventDefault(); e.stopPropagation(); disarm(); }
  function disarm() {
    if (!armed) return;
    armed = false;
    window.removeEventListener('click', eat, true);
    window.removeEventListener('pointerup', soon, true);
    window.removeEventListener('pointercancel', soon, true);
  }
  function soon() { setTimeout(disarm, 400); }
  window.addEventListener('click', eat, true);
  window.addEventListener('pointerup', soon, true);
  window.addEventListener('pointercancel', soon, true);
}

function finishEntrance() {
  entranceTimers.forEach(clearTimeout);
  if (entranceSkip) {
    window.removeEventListener('pointerdown', entranceSkip, true);
    window.removeEventListener('keydown', entranceSkip);
    window.removeEventListener('wheel', entranceSkip);
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
    var dt = Math.max(0, now - t0);   // same early-frame timestamp as deskDrive
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
   --drive (0=salon, 1=bureau) written by a rAF driver onto #signal-desk;
   the lever and both gears derive from it via calc, so sync is
   structural.
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

/* The console, the lever, the gear train and the throw plates are drawn by
   static/js/desk.js (the picture palace's signal desk). The hit surfaces
   are the ones this file has always wired: the console's own drawn shapes,
   the gear well, the two plates and the arm strip inside #lever. */
function buildDesk() {
  if (desk && window.Desk) window.Desk.build(desk);
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
   C0-continuous at the seam; identical feel both directions. The overshoot
   lives at the far end only: below 0 the cubic extrapolates backwards, so
   t is pinned to the rest pose there rather than trusted to be >= 0. */
function easeWeighty(t) {
  if (t <= 0) return 0;
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
/* --drive is written on the desk, not on :root. Only the lever arm and the
   two gears read it, and an inherited custom property changed on :root
   restyles every element in the document: ~3,600 of them per frame, which
   held the throw to 20-25 fps. On the desk it restyles the desk. */
function setDrive(v) { if (desk) desk.style.setProperty('--drive', v.toFixed(4)); }
function getDrive() {
  if (!desk) return 0;
  var v = parseFloat(getComputedStyle(desk).getPropertyValue('--drive'));
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
    // The first frame's timestamp is taken when the frame began, which can
    // be before the click handler read t0; unclamped, that negative t
    // kicked the lever back past its end stop for one frame.
    var t = Math.max(0, Math.min(1, (now - t0) / DUR));
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

/* Gates are absolutely positioned, so DOM order is free. They are built
   lit-wing-first so the entrance's rise stagger (--gi) runs across the arches
   that are actually showing. Tab order does not depend on it: the waiting
   wing is inert. */
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

    if (!svc.vacant) {
      // Where the press began, for gateClick: a drag that selects the
      // notice's text and is released on the arch still ends in a click.
      a.addEventListener('pointerdown', function (e) {
        a._pressInNotice = notice.contains(e.target);
      });
      a.addEventListener('click', function (e) { gateClick(e, a, svc); });
      // Middle-click never fires 'click', so the browser used to open a DARK
      // gate's dead address in a new tab. It gets the launch notice instead.
      a.addEventListener('auxclick', function (e) {
        if (e.button !== 1 || a.dataset.state !== 'dark') return;
        e.preventDefault();
        showNotice(a, svc);
      });
    }
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

function showNotice(a, svc) {
  var n = $('.g-notice', a);
  if (!n.hidden) return;
  n.textContent = t('darkNotice', { hint: svc.launch_hint || svc.url });
  n.hidden = false;
  // Shown on screen, so said out loud once as well.
  var hs = $('#hall-status'); if (hs) hs.textContent = n.textContent;
}

/* The browser's new-tab modifier: Cmd on a Mac, Ctrl everywhere else.
   Elsewhere, Meta is the Windows or Super key, and the browser treats a
   click holding it as a plain same-tab navigation. Letting that through
   would replace the hall with the service. */
var NEW_TAB_KEY = /mac|iphone|ipad|ipod/i.test(
  (navigator.userAgentData && navigator.userAgentData.platform) ||
  navigator.platform || '') ? 'metaKey' : 'ctrlKey';

function gateClick(e, a, svc) {
  var dark = a.dataset.state === 'dark';
  // The new-tab modifier and Shift are the browser's own new-tab and
  // new-window gestures, and middle-click already gets them. Any other
  // modifier falls through to the named window below. A DARK gate keeps
  // its notice instead: its address would only open a dead tab.
  if (!dark && (e[NEW_TAB_KEY] || e.shiftKey)) return;
  e.preventDefault();
  if (dark) {
    var n = $('.g-notice', a);
    // The notice is there to be read and copied. A click on it, or a drag
    // that began in it (selecting the path), is not asking for it to close.
    // Keyboard clicks carry detail 0 and no press of their own.
    if (n.contains(e.target) || (e.detail > 0 && a._pressInNotice)) return;
    // A double-click is two clicks, and a plain toggle ended it hidden.
    // Only the first click of a run toggles; the rest leave it showing.
    if (e.detail > 1 || n.hidden) showNotice(a, svc);
    else n.hidden = true;
    return;
  }
  // One gesture, one tab: each click of a double-click used to schedule
  // its own window.open.
  if (e.detail > 1) return;
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
var SWAP_OUT = 200, SWAP_GAP = 20, SWAP_STEP = 60;   // ms, see the throw below
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

  /* The bays of a wing of n, left to right. slots() has already made n even,
     so half stand left of the clock (outermost first) and half right
     (innermost first), and the dial keeps the axis at full size. rank counts
     out from the clock on both sides. Both wings are laid in the same bays:
     the waiting wing stands exactly where its counterparts stand, out of the
     room, so a throw of the lever lets one wing's arches sink while the
     other's rise in place, and the doors change places rather than slide
     across the hall. */
  function bays(n) {
    var per = Math.floor(n / 2), out = [];
    for (var i = 0; i < n; i++) {
      var left = i < per;
      var rank = left ? per - 1 - i : i - per;
      out.push({ x: (left ? -1 : 1) * (half + gateW / 2 + rank * spacing),
                 side: left ? 0.55 : -0.55, rank: rank });
    }
    return out;
  }
  var litBays = bays(active.length), waitBays = bays(receded.length);

  /* A slot is never travelled to. Arches used to glide 0.6s from wherever
     they last stood: out from behind the clock when they were first laid
     out (a forced style read put new gates at the centre before their slot
     was written), and across each other and the niche after a resize, when
     their size changed at once but their slots did not. Every move is now
     written with the gate's transitions cut (.no-slide), flushed, and the
     cut lifted, so an arch is in its bay in the same frame the bay exists. */
  var cut = [];
  function place(a, bay) {
    var x = bay.x.toFixed(2) + 'px', side = String(bay.side);
    a.style.setProperty('--slot-s', '1');
    if (a.style.getPropertyValue('--slot-x') === x &&
        a.style.getPropertyValue('--side') === side) return;
    hold(a);
    a.style.setProperty('--slot-x', x);
    a.style.setProperty('--side', side);
  }
  function role(a, lit, delay) {
    a.classList.toggle('active', lit);
    a.classList.toggle('receded', !lit);
    // Depth order is set here, not left to DOM order (absolutely positioned
    // siblings).
    a.style.zIndex = lit ? '3' : '1';
    a.style.setProperty('--slot-delay', delay + 'ms');
  }
  function gate(svc) { return $('#gate-' + svc.id); }

  var swaps = [];
  function hold(a) { if (cut.indexOf(a) < 0) { a.classList.add('no-slide'); cut.push(a); } }
  active.forEach(function (svc, i) {
    var a = gate(svc);
    if (!a) return;
    place(a, litBays[i]);
    if (initial) {
      // First layout, resize, --ui: the row simply is where it is solved.
      hold(a);
      role(a, true, 0);
      a.classList.remove('arriving');
    } else if (!a.classList.contains('active')) {
      swaps.push({ a: a, lit: true, rank: litBays[i].rank, vacant: !!svc.vacant, x: litBays[i].x });
    }
  });
  receded.forEach(function (svc, i) {
    var a = gate(svc);
    if (!a) return;
    a.classList.remove('arriving');
    if (initial) {
      place(a, waitBays[i]);
      hold(a);
      role(a, false, 0);
    } else if (!a.classList.contains('active')) {
      place(a, waitBays[i]);     // out of the room, so it moves unseen
    } else {
      // Going out: it sinks where it stands.
      swaps.push({ a: a, lit: false, rank: waitBays[i].rank, vacant: !!svc.vacant,
                   x: parseFloat(a.style.getPropertyValue('--slot-x')) || 0 });
    }
  });

  /* The RESERVED arch is the same arch in both wings. Where one stands down
     and the other takes its bay, they change places under the cut, so the
     bay stays put through the throw instead of blinking out and back. */
  var outV = swaps.filter(function (s) { return s.vacant && !s.lit; })[0];
  var inV = swaps.filter(function (s) { return s.vacant && s.lit; })[0];
  if (outV && inV && Math.abs(outV.x - inV.x) < 0.5) {
    [outV, inV].forEach(function (s) {
      hold(s.a);
      role(s.a, s.lit, 0);
    });
    swaps = swaps.filter(function (s) { return s !== outV && s !== inV; });
  }

  if (cut.length) {
    void wrap.offsetWidth;   // the cut values become the before-change style
    cut.forEach(function (a) { a.classList.remove('no-slide'); });
  }

  /* The throw, bay by bay: the outgoing arch sinks and fades in 200ms, the
     bay stands empty for a beat, and only then does the incoming arch rise
     into it. Both faces used to share the bay for ~280ms, and the lettering
     of AUTOPILOT and OUTREACH DESK printed over each other. The beat runs out
     from the clock on both sides at once (rank), mirrored about the axis the
     clock holds; by DOM order it used to lead with the outer left and the
     inner right. An incoming arch takes no pointer until its fade is under
     way (.arriving, timed in CSS off the same delay): visibility has to
     switch at once so W can put focus on it, and for its whole delay it was
     an invisible target that took the clicks meant for the arch still
     fading out above it.
     The wait is for the arch leaving the same bay, so where there is none
     showing (a throw reversed before the other arch began to rise, or a bay
     only one wing fills) the incoming arch goes on its own beat. Without
     this, a change of mind left the arch that was leaving frozen half faded
     for the length of the wait before it came back. */
  function shown(a) {
    var cs = getComputedStyle(a);
    return cs.visibility === 'visible' ? parseFloat(cs.opacity) : 0;
  }
  swaps.forEach(function (s) {
    if (!s.lit) return;
    var mate = swaps.filter(function (o) { return !o.lit && Math.abs(o.x - s.x) < 0.5; })[0];
    s.wait = !!mate && shown(mate.a) > 0.02;
  });
  swaps.forEach(function (s) {
    var delay = s.rank * SWAP_STEP;
    if (s.wait) delay += SWAP_OUT + SWAP_GAP;
    s.a.classList.toggle('arriving', s.lit);
    role(s.a, s.lit, delay);
  });

  all.forEach(function (svc) {
    var a = gate(svc);
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
}

/* Re-solved in the resize event itself, which runs before the frame is
   styled, so the new size and the new slots paint together. A 120ms
   debounce used to leave the arches at their new size in their old slots,
   overlapping each other and the clock, for the length of the wait. */
window.addEventListener('resize', function () { layoutStage(true); });

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
  // Repainted with everything that re-lays the wall: a resize, a wing
  // throw, a language or engraving-size change.
  paintFloorMirror();
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
   changes temperature the moment the lever is thrown.

   The arches and the clock are cast from the row as layoutStage solved it,
   never from their live boxes. A live box is wherever the arch is THIS
   frame: mid-glide, mid-dolly, or (on a quiet boot) at the centre before
   its slot had landed, which painted all four arches as one beam under the
   clock and left the stone under every arch dry until the next throw. The
   waiting wing casts nothing: it is not in the room. */
var MIRROR_FAR = 0.98, MIRROR_NEAR = 0.49, MIRROR_RUN = 560;
function paintFloorMirror() {
  var svg = $('.fl-mirror');
  if (!svg) return;
  var W = window.innerWidth || 1;
  var seen = [];
  // The arches and the clock carry their own reflections (each portal
  // flipped in the wax, and the niche's own), so only the two aisle cases
  // still need a smear here. They never move.
  ['#works', '#almanac'].forEach(function (sel) {
    var e = $(sel);
    if (!e) return;
    var r = e.getBoundingClientRect();
    if (r.width > 4) {
      seen.push({ dx: (r.left + r.width / 2) / W - 0.5, hw: r.width / W / 2, lit: false });
    }
  });
  function points(it) {
    var far = 500 + 1000 * MIRROR_FAR * it.dx, fw = 1000 * MIRROR_FAR * it.hw;
    var near = 500 + 1000 * MIRROR_NEAR * it.dx, nw = 1000 * MIRROR_NEAR * it.hw;
    return [(far - fw).toFixed(1) + ',0', (far + fw).toFixed(1) + ',0',
            (near + nw).toFixed(1) + ',' + MIRROR_RUN,
            (near - nw).toFixed(1) + ',' + MIRROR_RUN].join(' ');
  }
  function stops(it) {
    var top = it.lit ? (it.wide ? 0.34 : 0.30) : 0.13;
    return [[0, top], [0.42, top * 0.42], [1, 0]];
  }
  // The same set of smears as last time is repainted in place. A lever throw
  // leaves every bay where it was, so the polygons stay put and only --metal
  // changes under them, which the stops' own transition carries across with
  // the arches (it used to blank the floor for a second and repaint it).
  var shape = seen.map(function (it) { return (it.lit ? 'L' : 'D') + (it.wide ? 'W' : ''); }).join();
  var polys = svg.querySelectorAll('polygon');
  if (svg.dataset.shape === shape && polys.length === seen.length) {
    seen.forEach(function (it, i) {
      polys[i].setAttribute('points', points(it));
    });
    return;
  }
  svg.dataset.shape = shape;
  svg.textContent = '';
  var defs = svgEl('defs');
  svg.appendChild(defs);
  seen.forEach(function (it, i) {
    var id = 'mir' + i;
    var grad = svgEl('linearGradient',
      { id: id, x1: '0', y1: '0', x2: '0', y2: '1' });
    // stop-color is set by CLASS, never as a presentation attribute: var()
    // does not resolve in presentation attributes, so `stop-color="var(--metal)"`
    // parses to nothing and the whole reflection paints transparent — which
    // it did, silently, with all six polygons present in the DOM.
    stops(it).forEach(function (st) {
      grad.appendChild(svgEl('stop', {
        offset: (st[0] * 100) + '%',
        'stop-opacity': st[1].toFixed(3)
      }, it.lit ? 'mir-lit' : 'mir-dim'));
    });
    defs.appendChild(grad);
    svg.appendChild(svgEl('polygon', { points: points(it), fill: 'url(#' + id + ')' }));
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

/* One request at a time. The 4 s beat used to fire whether or not the last
   request had come back, and a slow reply landing after a quick one swung
   the needle back to the older reading. */
var worksBusy = false;
var worksOkAt = 0;
/* A dial that has heard nothing for this long stops pointing at a number.
   It kept its last needle through any number of failed polls and looked
   live the whole time. Two and a half beats: one miss is a hiccup. */
var WORKS_STALE_MS = 10000;

function pollWorks() {
  if (!worksVisible() || worksBusy) return Promise.resolve();
  worksBusy = true;
  return fetchJson('/api/works').then(function (w) {
    // An older reading never replaces a newer one.
    if (works && w && w.generated < works.generated) return;
    works = w;
    worksOkAt = Date.now();
    syncWorks();
  }).catch(function () {
    // A restarting hub is not a reading, and neither is the last one kept.
    if (works && Date.now() - worksOkAt > WORKS_STALE_MS) {
      works = null;
      syncWorks();
    }
  }).then(function () { worksBusy = false; });
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

/* A payload without weather is the hub reporting a miss, and the hub asks
   the forecast service again 120 s later (almanac.py FAIL_TTL_S).
   The board asks on the same beat: waiting out the ten-minute poll kept one
   missed forecast engraved as NO READING for ten minutes. */
var ALM_RETRY_MS = 121000;   // just past the hub's 120 s, so the retry is real
var almRetryT = null;
var almReadAt = 0;

function pollAlmanac() {
  if (!almanacVisible()) return Promise.resolve();
  return fetchJson('/api/almanac').then(function (a) {
    almanac = a;
    almReadAt = Date.now();
    clearTimeout(almRetryT);
    if (!a.weather) almRetryT = setTimeout(pollAlmanac, ALM_RETRY_MS);
    renderAlmanac();
  }).catch(function () { /* a restarting hub is not a forecast */ });
}

/* The boards open at 2800px, so a window that grows past that shows a case
   that has never read anything: the boot poll declined while it was hidden,
   and the Almanac waited out a minute of blank plate for its sky tick. Read
   the moment the case opens. */
var boardsT = null;
window.addEventListener('resize', function () {
  clearTimeout(boardsT);
  boardsT = setTimeout(function () {
    if (!works) pollWorks();
    if (!almanac || !almanac.weather || Date.now() - almReadAt > ALM_POLL_MS) pollAlmanac();
  }, 150);
});

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

function setWing(w) {
  wingPending = w;
  var apply = function () {
    root.dataset.wing = w;
    if (wingPending === w) wingPending = null;
    store('atrium.wing', w);
    lever.setAttribute('aria-checked', String(w === 'bureau'));
    deskDrive(w === 'bureau' ? 1 : 0);
    // The gates stay in the order they were built. The waiting wing is
    // inert, so Tab walks only the lit one, left to right, wherever the two
    // sit in the DOM. A 750ms re-append used to put the lit wing first, and
    // moving live nodes replayed the sheen on a hovered arch and bounced
    // focus off the gate the reader had just landed on.
    layoutStage(false);
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
/* The pointer reaches the switch through the machine itself: the arm strip
   is inside #lever and arrives above, the console's drawn shapes and the
   gear well throw it from here, and each throw plate lights its own wing
   (a click on SALON never leaves the Salon). */
var deskCore = $('#signal-desk .desk-core');
deskCore.addEventListener('click', function (e) {
  var tgt = e.target;
  if (!tgt.closest) return;
  var plate = tgt.closest('.l-label');
  if (plate) {
    var want = plate.classList.contains('l-bureau') ? 'bureau' : 'salon';
    if ((wingPending || root.dataset.wing) !== want) setWing(want);
  } else if (tgt.closest('.desk-art, .gear-well')) {
    toggleWing();
  }
});

/* The desk is fixed to the foot of the screen, but the stage's baseline
   moves with whatever stands above it: a Chinese masthead that wraps pushes
   the whole row down. Where the floor under the stage is shorter than the
   machine, the vent stack rose over the clock's sill. --desk-room caps the
   machine's scale to the floor it actually has. It is the stage's LAYOUT
   bottom (offsetTop), not its painted one: the entrance dollies the stage
   with a transform, and a reading taken mid-dolly would stick. */
var DESK_GAP = 8;         // clear stone between the sill and the vent cap
var DESK_MIN = 0.5;       // below this the lever is too small to take
var deskArtTop = null;    // highest drawn point, in assembly units
function fitDesk() {
  var stage = $('#stage'), desk = $('#signal-desk');
  if (!stage || !desk) return;
  if (deskArtTop === null) {
    // The quadrant draws 1:1 in the assembly's 360x220 units, and its vent
    // cap is the machine's highest point (the lever tip peaks 30 below it).
    try { deskArtTop = $('.quadrant', desk).getBBox().y; } catch (err) { return; }
  }
  var base = stage.offsetHeight;
  for (var n = stage; n; n = n.offsetParent) base += n.offsetTop;
  var foot = parseFloat(getComputedStyle(desk).bottom) || 0;
  var room = (window.innerHeight - foot - base - DESK_GAP) / (220 - deskArtTop);
  desk.style.setProperty('--desk-room', Math.max(DESK_MIN, room).toFixed(3));
}
if (window.ResizeObserver) {
  // The concourse resizes when the masthead above it grows or the window
  // does; the stage resizes with the arch module (--ui).
  var deskRO = new ResizeObserver(function () { fitDesk(); });
  ['#concourse', '#stage'].forEach(function (s) { var n = $(s); if (n) deskRO.observe(n); });
}

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
  // Nothing is said until a status is known: before the first answer
  // "LINES OPEN 0/6" was announced as fact. A hub that stops answering is
  // said out loud, and a hub still asking clears the old count rather than
  // repeating a number it no longer knows.
  var st = $('#hall-status');
  // (A hub that never answered at all has no registry either, and is said.)
  if (st && (services.length || hubLost)) {
    var msg = hubLost ? t('hubLost') : !known ? ''
      : allDark ? t('allDark') : t('linesOpen', { n: openCount, m: services.length });
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
    // The odometer is for a reading that changed. A line re-lettered into
    // the other language holds the same numbers, and every gate used to
    // roll on a language switch; the text swaps in place instead.
    var relettered = span._lang !== undefined && span._lang !== lang;
    span._lang = lang;
    if (span.textContent !== txt) {
      if (span.textContent && !relettered && root.dataset.motion !== 'reduced') {
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
  // Nothing is known yet, so nothing is claimed: the ghosts stay until the
  // first feed lands. Opening the drawer used to wipe them and engrave "No
  // dispatches" over a feed that was still on its way.
  if (feedState === 'loading') {
    if (!ol.querySelector('.ghost')) renderGhosts();
    return;
  }
  var shown = feed.filter(function (d) {
    return chipFilter === 'all' || d.wing === chipFilter;
  });
  if (firstFeed) { ol.textContent = ''; }
  var shownIds = {};
  shown.forEach(function (d) { shownIds[d.id] = 1; });
  // A focused plaque about to leave hands focus to its neighbour, the next
  // one down that stays (else the one above), found in the column as it
  // stands now. Removing the focused node dropped focus to <body>, and the
  // next arrow key started the walk over from the top.
  var hadLi = document.activeElement && document.activeElement.closest
    ? document.activeElement.closest('#plaques .plaque') : null;
  var heir = null;
  if (hadLi && !shownIds[hadLi.dataset.id]) {
    heir = stays(hadLi, 'nextElementSibling') || stays(hadLi, 'previousElementSibling');
  }
  function stays(li, dir) {
    for (var n = li[dir]; n; n = n[dir]) {
      if (n.classList.contains('plaque') && shownIds[n.dataset.id]) return n;
    }
    return null;
  }
  function refocus() {
    if (!hadLi || hadLi.contains(document.activeElement)) return;
    // The hall put the caret here, not the reader, so it strikes nothing.
    // (A plaque that stayed but was moved lost focus the same way.)
    var to = hadLi.isConnected ? $('.pl-in', hadLi)
      : heir && heir.isConnected ? $('.pl-in', heir) : $('#ledger-title');
    quietFocus = true;
    try { if (to) to.focus(); } finally { quietFocus = false; }
  }
  // Cache-prune ONLY dispatches that left the feed window for real; a
  // chip-hidden plaque is detached but keeps its cache entry, so toggling
  // the filter back never rebuilds it as "fresh" (would re-animate).
  Object.keys(plaqueEls).forEach(function (id) {
    var li = plaqueEls[id];
    var inFeed = feed.some(function (d) { return d.id === id; });
    if (!inFeed || (!shownIds[id] && li.parentNode)) {
      // A detached card never hears pointerleave; its dwell stops here.
      if (li._dwellCancel) li._dwellCancel();
      if (li.parentNode) li.parentNode.removeChild(li);
    }
    if (!inFeed) delete plaqueEls[id];
  });
  // Clear empty markers and ghosts; day breaks are reused below.
  Array.prototype.slice.call(ol.querySelectorAll('.l-empty, .ghost'))
    .forEach(function (n) { n.parentNode.removeChild(n); });

  if (!shown.length) {
    Array.prototype.slice.call(ol.querySelectorAll('.daybreak'))
      .forEach(function (n) { n.parentNode.removeChild(n); });
    // An unread feed is not an empty one. Only a feed that answered with
    // nothing may say "No dispatches".
    var failed = feedState === 'failed';
    var empty = el('li', 'l-empty' + (failed ? ' l-failed' : ''));
    var fl = svgUse('', '0 0 60 40', '#fleuron');
    empty.appendChild(fl);
    empty.appendChild(el('div', 'zh-sentence', t(failed ? 'ledgerUnreadable' : 'empty')));
    ol.appendChild(empty);
    feed.forEach(function (d) { seenIds[d.id] = 1; });
    refocus();
    syncStamp();
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
    } else if (fresh && !firstFeed && !seenIds[d.id]) {
      // Normal arrive animation on poll-driven new dispatch. A plaque that
      // is only coming back (the hub restarted and answered empty once) is
      // not news, and nine of them replaying 'arrive' said it was.
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
    if (at === node) return;
    // A card being moved is leaving the spot the pointer rested on.
    if (node._dwellCancel && node.isConnected) node._dwellCancel();
    ol.insertBefore(node, at || null);
  });
  feed.forEach(function (d) { seenIds[d.id] = 1; });
  refocus();
  syncStamp();      // a chip change moves what the stamp's scope line says
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
    // A browser never shows a title to keyboard focus, so the count was the
    // pointer's alone. The same number is engraved beside the disc, shown
    // only on hover and focus-visible (CSS): at rest the mark stays a mark.
    var num = btn.querySelector('.l-count');
    if (!num) {
      num = el('span', 'l-count num');
      num.setAttribute('aria-hidden', 'true');   // the sr-only line says it
      btn.appendChild(num);
    }
    num.textContent = count > 0 ? String(count) : '';
    num.hidden = count <= 0;
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
  // While a chip narrows the column, the stamp still clears both wings, and
  // only the tooltip said so: engraved on the stamp itself, keyboard and
  // pointer both see it before they press.
  var scope = btn.querySelector('.l-stamp-scope');
  if (!scope) {
    scope = el('span', 'l-stamp-scope display');
    btn.appendChild(scope);
  }
  scope.textContent = t('markAllScope');
  scope.hidden = idle || chipFilter === 'all';
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
  // The column is about to slide in under wherever the pointer rests; no
  // dwell from before may carry over into it.
  cancelDwells();
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
  // A dwell under way when the drawer shuts was not finished by the reader.
  cancelDwells();
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
   ------------------------------------------------------------------------
   The band is rebuilt only where nobody is reading it. A poll that changed
   one figure used to tear the track down mid-scroll: a paused band swapped
   the segment under the pointer, and a rolling one jumped to another
   dispatch. Now a changed band waits for the loop to come round (the one
   moment the track stands at its own start), for the pointer or the focus
   to leave, or, under reduced motion, for the next page turn. A band that
   says the same thing as before changes nothing at all.
   ======================================================================== */
/* Crawl speed in px/s at --ui 1, so the band keeps its pace whatever the
   engraving size. It was 0.32 s per character counted over BOTH copies of
   the loop, which ran it at half the rate it meant: 1.6 characters a second,
   three minutes before the last unread dispatch came on screen. */
var TICKER_PX_S = 50;
/* Reduced motion: the band stands still and turns a page this often. */
var TICKER_PAGE_MS = 6000;
var tickerKey = null;      // what the band on screen says
var tickerLang = null;     // ...and in which language
var tickerBox = '';        // the band width and engraving it was laid out for
var tickerPending = null;  // a newer band waiting for its moment
var tickerPageT = null;

function tickerModel() {
  var segs = [];
  var open = 0, known = 0;
  services.forEach(function (s) {
    var st = statuses[s.id];
    if (st && st.state !== 'checking') { known++; if (st.state === 'open') open++; }
  });
  // A hub that stopped answering is the first thing the band says; a count
  // of open lines it cannot vouch for is not said at all.
  if (hubLost) segs.push(t('hubLost'));
  else if (known) segs.push(t('linesOpen', { n: open, m: services.length }));
  services.forEach(function (s) {
    var txt = statText(s);
    if (txt) segs.push(txt);
  });
  var fresh = feed.filter(isNew).slice(0, 6).map(function (d) {
    var h = headline(d);
    return (h.head + ' · ' + h.detail);
  });
  var paged = root.dataset.motion === 'reduced';
  return {
    segs: segs, fresh: fresh, paged: paged,
    key: [lang, paged ? 'r' : 'f', segs.join('\u0001'), fresh.join('\u0001')].join('\u0002')
  };
}

/* now: the reader asked for this (language, motion, a new band width), so it
   lands at once instead of waiting for the loop. */
function renderTicker(now) {
  var ticker = $('#ticker');
  var m = tickerModel();
  // A language switch re-letters the whole hall at once; the band with it.
  if (tickerLang !== lang) now = true;
  if (!now && m.key === tickerKey) { tickerPending = null; return; }
  if (!now && tickerKey !== null && tickerHeld(ticker)) { tickerPending = m; return; }
  applyTicker(m);
}

/* Is somebody reading the band right now? A rolling band always is, until
   its loop comes round; a still one is while the pointer or the focus is on
   it; a paged one is between page turns. */
function tickerHeld(ticker) {
  var track = $('#ticker-track');
  if (ticker.classList.contains('rolling') && track.getAnimations &&
      track.getAnimations().some(function (a) { return a.playState !== 'finished'; })) return true;
  if (ticker.matches(':hover, :focus-within')) return true;
  return !!tickerPageT;
}

function applyTicker(m) {
  var ticker = $('#ticker');
  var track = $('#ticker-track');
  tickerPending = null;
  tickerKey = m.key;
  tickerLang = lang;
  tickerBox = ticker.clientWidth + '|' + uiScale();
  clearTimeout(tickerPageT);
  tickerPageT = null;
  ticker.classList.remove('rolling', 'static', 'paged');
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
  function seg(s, cls) {
    var n = el('span', cls || '', s);
    // A CJK title in the English hall (or a Latin one in the Chinese) is
    // tagged, so a screen reader switches voice instead of spelling it.
    var cjk = /[\u3040-\u30ff\u3400-\u9fff]/.test(s);
    if (cjk !== (lang === 'zh')) n.lang = cjk ? 'zh' : 'en';
    return n;
  }
  var items = m.segs.map(function (s) { return seg(s); })
    .concat(m.fresh.map(function (s) { return seg(s, 't-new'); }));
  if (!items.length) items = [seg('—')];
  items.forEach(function (n) {
    if (track.childNodes.length) track.appendChild(sep());
    track.appendChild(n);
  });
  // Decided before any class goes on: the line is measured as it would
  // stand still, so a band that has to roll is never set static first and
  // then restarted a frame later (which snapped it back every poll).
  var room = ticker.clientWidth - 8;
  var overflows = track.getBoundingClientRect().width > room;
  if (m.paged) {
    if (overflows) pageTicker(ticker, track, items, room, sep);
    else ticker.classList.add('static');
    return;
  }
  if (!m.fresh.length && !overflows) { ticker.classList.add('static'); return; }
  // Append the trailing separator FIRST, then clone — the track becomes
  // (A◆)(A◆) so the -50% loop lands exactly on the period (a clone taken
  // before the separator would jump by half a separator every cycle).
  track.appendChild(sep());
  var copy = track.getBoundingClientRect().width;
  // The loop needs a second copy of the band; a screen reader does not.
  var twin = el('span', 't-twin');
  twin.setAttribute('aria-hidden', 'true');
  Array.prototype.slice.call(track.childNodes).forEach(function (n) {
    twin.appendChild(n.cloneNode(true));
  });
  track.appendChild(twin);
  ticker.style.setProperty('--t-dur',
    Math.max(8, copy / (TICKER_PX_S * uiScale())).toFixed(2) + 's');
  ticker.classList.add('rolling');
}

/* Reduced motion: the band cannot crawl, and frozen at its start it showed
   one screenful and cut the next title mid-word, so the rest of the unread
   dispatches never appeared at all. It is set in pages that each fit the
   band, broken only between segments, and turns one every TICKER_PAGE_MS
   with a slow crossfade (the one motion DESIGN allows it). Every page stays
   in the accessibility tree, so a screen reader still hears the whole band
   once. A single segment wider than the band gets a page of its own and an
   ellipsis rather than a cut. */
function pageTicker(ticker, track, items, room, sep) {
  var probe = sep();
  track.appendChild(probe);
  var sepW = probe.getBoundingClientRect().width;
  var widths = items.map(function (n) { return n.getBoundingClientRect().width; });
  // A page is set with a separator's width of margin at either end: packed
  // to the very edge it read as a line that had been cut, not set.
  room -= 2 * sepW;
  var pages = [], cur = [], used = 0;
  items.forEach(function (n, i) {
    var w = widths[i] + (cur.length ? sepW : 0);
    if (cur.length && used + w > room) { pages.push(cur); cur = []; used = 0; w = widths[i]; }
    cur.push(n);
    used += w;
  });
  if (cur.length) pages.push(cur);
  track.textContent = '';
  pages.forEach(function (list, i) {
    var page = el('span', 't-page' + (i === 0 ? ' on' : ''));
    list.forEach(function (n, j) {
      if (j) page.appendChild(sep());
      page.appendChild(n);
    });
    // Between pages a screen reader hears the same pause as between
    // segments; nothing is drawn.
    if (i < pages.length - 1) page.appendChild(el('span', 'sr-only', '; '));
    track.appendChild(page);
  });
  ticker.classList.add('paged');
  if (pages.length > 1) turnTickerPage();
}

function turnTickerPage() {
  tickerPageT = setTimeout(function () {
    var ticker = $('#ticker');
    tickerPageT = null;
    // Pauses on hover and focus, like the crawl, and never turns unseen.
    if (document.hidden || ticker.matches(':hover, :focus-within')) { turnTickerPage(); return; }
    // A newer band comes in on a page turn, the paged band's loop boundary.
    if (tickerPending) { applyTicker(tickerPending); return; }
    var pages = Array.prototype.slice.call(document.querySelectorAll('#ticker-track .t-page'));
    var at = pages.findIndex(function (p) { return p.classList.contains('on'); });
    pages.forEach(function (p, i) { p.classList.toggle('on', i === (at + 1) % pages.length); });
    turnTickerPage();
  }, TICKER_PAGE_MS);
}

(function () {
  var ticker = $('#ticker'), track = $('#ticker-track');
  if (!ticker || !track) return;
  // The loop has come round: the track stands at its own start, which is
  // the one moment a new band can go up without anything on screen jumping.
  track.addEventListener('animationiteration', function (e) {
    if (e.target === track && tickerPending) applyTicker(tickerPending);
  });
  // A still band that was held for a reader goes up when they leave it.
  function released() {
    if (!tickerPending || ticker.classList.contains('rolling')) return;
    setTimeout(function () {
      if (tickerPending && !tickerHeld(ticker)) applyTicker(tickerPending);
    }, 0);
  }
  ticker.addEventListener('pointerleave', released);
  ticker.addEventListener('focusout', released);
  // Crawl or pages is a motion decision, and the pages are cut to the
  // band's width and the engraving: either changing re-sets the band now.
  window.addEventListener('atrium:motionchange', function () { renderTicker(true); });
  var resizeT = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      if (tickerKey !== null && ticker.clientWidth + '|' + uiScale() !== tickerBox) {
        renderTicker(true);
      }
    }, 200);
  });
})();

/* ========================================================================
   Polling — 45 s, visibility-gated, immediate refetch on refocus
   ======================================================================== */
/* Every request gives up after FETCH_MS. A hub that takes the connection and
   then hangs left a poll pending for minutes, and a poll that never ends can
   never report that it failed. Longer than the hub's own warm-up wait. */
var FETCH_MS = 12000;
function fetchJson(url) {
  var ctl = window.AbortController ? new AbortController() : null;
  var timer = ctl ? setTimeout(function () { ctl.abort(); }, FETCH_MS) : null;
  return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
    if (!r.ok) throw new Error(url + ' -> ' + r.status);
    return r.json();
  }).finally(function () { clearTimeout(timer); });
}

/* Whether the hall still hears its hub. The lamps, the stat lines and the
   band used to hold the last good reading forever when /api/status stopped
   answering, so a dead hub looked exactly like a healthy hall. */
var hubLost = false;
var RETRY_MS = 15000;      // after a miss, ask again well inside the 45 s beat
var retryT = null;
var refreshSeq = 0, appliedSeq = 0;

function refresh() {
  // The dateline was written once at load, so a hall left open overnight
  // printed yesterday under a clock whose date aperture had already turned.
  renderDateline();
  clearTimeout(retryT);
  var seq = ++refreshSeq;
  var none = function () { return null; };
  // Self-heal a failed boot: if the registry never arrived (hub restarting
  // when the tab loaded), retry it on the regular poll cadence.
  var reg = services.length ? Promise.resolve(null)
    : fetchJson('/api/services').then(function (payload) {
        services = payload.services || [];
        if (services.length) renderGates();
      }).catch(none);
  return Promise.all([
    reg,
    fetchJson('/api/status').catch(none),
    fetchJson('/api/feed').catch(none),
    fetchJson('/api/stats').catch(none)
  ]).then(function (all) {
    // Polls overlap (the beat, a refocus, a retry); an answer to an older
    // question never overwrites a newer one.
    if (seq < appliedSeq) return;
    appliedSeq = seq;
    var st = all[1], fd = all[2], sx = all[3];
    // A hub still on its first round of adapter polls answers with every
    // group empty and every stat blank. That is the hub clearing its throat,
    // not a reading: it emptied the Ledger and then replayed every plaque as
    // an arrival. The last reading stands and the hall asks again shortly.
    function cold(p) { return !!p && p.warm === false; }
    // No answer, an error, or a body that is not a status: every lamp goes
    // back to asking, and the band and the live region say why.
    var wasLost = hubLost;
    hubLost = !(st && st.services && typeof st.services === 'object');
    statuses = hubLost ? {} : st.services;
    if (!(sx && sx.stats && typeof sx.stats === 'object')) stats = {};
    else if (!cold(sx)) stats = sx.stats;
    applyStatuses();
    applyStats();
    if (fd && Array.isArray(fd.dispatches)) {
      if (!cold(fd)) {
        // The first feed landing in an open drawer falls in as the opening
        // cascade would have; the drawer held its ghosts until now.
        var falling = firstFeed && $('#ledger').classList.contains('open');
        feed = fd.dispatches;
        feedState = 'ok';
        if (falling) { ledgerOpening = true; cascadeIndex = 0; }
        renderLedger();
        ledgerOpening = false;
        firstFeed = false;
      }
    } else if (feedState !== 'ok') {
      // Only a Ledger that never read says so. After a good read the plaques
      // stay: a dispatch that happened is still true when the hub goes quiet.
      feedState = 'failed';
      renderLedger();
    }
    updateLedgerBadge();
    // Losing the hub (or finding it again) is not a routine change of
    // figure: the band says so at once rather than a loop later, still
    // counting open lines it can no longer see.
    renderTicker(hubLost !== wasLost);
    if (hubLost || !fd || cold(st) || cold(fd) || cold(sx)) retryT = setTimeout(poll, RETRY_MS);
  });
}

function poll() {
  if (document.visibilityState === 'visible') refresh();
}
setInterval(poll, 45000);
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
/* Only a click that starts and ends on the backdrop closes the sheet. A
   press in the sheet released on the backdrop (or the other way round) is
   dispatched to #prefs, their common ancestor, and used to close it. */
var prefsPress = { down: null, up: null };
prefs.addEventListener('pointerdown', function (e) { prefsPress.down = e.target; });
prefs.addEventListener('pointerup', function (e) { prefsPress.up = e.target; });
prefs.addEventListener('click', function (e) {
  if (e.target === prefs && prefsPress.down === prefs && prefsPress.up === prefs) {
    closePrefs();
  }
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

/* The medallion hangs outside the plaque's link, over the spine where the
   clipped frame cannot reach, so a click on it used to do nothing. It reads
   as part of the plaque, so it opens the dispatch like the rest of it. */
var plaquesEl = $('#plaques');
if (plaquesEl) {
  plaquesEl.addEventListener('click', function (e) {
    var medal = e.target.closest && e.target.closest('.medal');
    var link = medal && medal.parentNode.querySelector('a.pl-in');
    if (link) link.click();
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
/* The theme changes as one picture. Flipping data-theme under the scoped
   colour transitions never made a crossfade: the wall, floor, pilasters and
   dado are gradients, which cannot interpolate, so they jumped at once
   while the arches, clock and masthead were still fading; and the ~1,100
   transitions it started (310 on the clock's chapter ring alone) restyled
   the whole tree every frame, at 6-25 fps, after a ~280ms stall.
   Now the old hall is captured as an image and the new one fades in over it
   (a view transition, 400ms, css ::view-transition-*). Beneath the image the
   flip itself lands with every transition cut (.theme-cut), so the new hall
   is drawn once, finished, and nothing restyles per frame. Where a view
   transition is unavailable, or motion is reduced, the flip is simply
   instant: still one picture, never half and half. */
function resolveTheme() {
  var pref = root.dataset.themePref || 'system';
  var dark = pref === 'onyx' || (pref === 'system' && mq.matches);
  var next = dark ? 'onyx' : 'ivory';
  if (root.dataset.theme === next) return;
  themeBusy = true;
  setTimeout(function () { themeBusy = false; }, 420);
  var flip = function () {
    root.classList.add('theme-cut');
    root.dataset.theme = next;
  };
  var uncut = function () { root.classList.remove('theme-cut'); };
  if (document.startViewTransition && root.dataset.motion !== 'reduced') {
    var vt = document.startViewTransition(flip);
    // By `ready` the new hall has been drawn under the cut, so lifting it
    // starts nothing; the old picture is still fading over it.
    vt.ready.then(uncut, uncut);
  } else {
    flip();
    void root.offsetWidth;   // the flip's style change happens under the cut
    uncut();
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
    // An open launch notice is lettered once, on the click that opened it,
    // so it kept its English under a Chinese description.
    var notice = $('.g-notice', a);
    if (notice && !notice.hidden) {
      notice.textContent = t('darkNotice', { hint: svc.launch_hint || svc.url });
    }
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

/* Laid on the ticker band's box (see #keyplate in atrium.css): the band
   moves with the masthead above it, which wraps in Chinese. */
function placeKeyplate() {
  var band = $('#ticker');
  if (!band) return;
  var r = band.getBoundingClientRect();
  keyplate.style.top = Math.round(r.top) + 'px';
  keyplate.style.left = Math.round(r.left) + 'px';
  keyplate.style.right = Math.round(window.innerWidth - r.right) + 'px';
}
/* The plate is a notice, not a dialog. It used to answer only "?" and Esc,
   so a pointer left it standing over the hall. Now any press closes it, on
   the plate or anywhere else, and the press still does what it was for. */
function keyplatePress() { toggleKeyplate(false); }

function toggleKeyplate(show) {
  if (!keyplate) return;
  var next = show === undefined ? keyplate.hidden : show;
  if (next) { renderKeyplate(); placeKeyplate(); }
  keyplate.hidden = !next;
  if (next) document.addEventListener('pointerdown', keyplatePress, true);
  else document.removeEventListener('pointerdown', keyplatePress, true);
}
window.addEventListener('resize', function () {
  if (keyplate && !keyplate.hidden) placeKeyplate();
});

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
  // Hub API unreachable — leave ghosts; refresh() retries the registry, and
  // sooner than the 45 s beat, which left the ghosts up that long before the
  // Ledger could say it had not been read.
  clearTimeout(retryT);
  retryT = setTimeout(poll, RETRY_MS);
}).then(function () {
  // Deep links run regardless of how the boot fetch fared. ?ledger=1 is the
  // debug-only twin of ?prefs=1 — the drawer is the one surface a headless
  // screenshot cannot reach, since opening it takes a click.
  var q = new URLSearchParams(location.search);
  if (q.get('prefs') === '1') openPrefs();
  if (q.get('ledger') === '1') openLedger();
});

})();
