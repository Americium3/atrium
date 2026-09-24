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
    darkLaunch: 'Launch with', darkHint: 'Launch with: {hint}',
    lampOpen: 'Reachable', lampDark: 'Offline', lampChecking: 'Checking',
    justNow: 'just now', minAgo: '{n} min ago', hAgo: '{n} h ago', dAgo: '{n} d ago',
    /* Said, not engraved: a screen reader read "15 H AGO" letter for letter. */
    minAgoSr: '{n} {n|minute|minutes} ago', hAgoSr: '{n} {n|hour|hours} ago',
    dAgoSr: '{n} {n|day|days} ago',
    linesOpen: 'LINES OPEN {n}/{m}',
    tickerMore: '{n} MORE IN THE LEDGER',
    hubLost: 'NO WORD FROM THE HUB',
    ledgerUnreadable: 'The Ledger could not be read',
    ledgerLoading: 'Reading the Ledger',
    ledgerStale: 'NO WORD SINCE {t}',
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
    'stat.stories': '{n} {n|STORY|STORIES}\u00a0· {m} {m|SECTION|SECTIONS}',
    'stat.tools': '{n} {n|TOOL|TOOLS} ON THE RACK',
    'stat.orders_await': '{n} {n|ORDER AWAITS|ORDERS AWAIT} REVIEW', 'stat.brief_of': 'BRIEF OF {date}',
    'note.qb_down': 'qBittorrent unreachable, downloads paused',
    'note.daemon_stale': 'Sync daemon looks stalled',
    'note.fallback': 'Reading state files directly (server down)',
    'note.digest_stale': 'This edition is more than a day old',
    'note.slow': 'Running, but slow to answer',
    'k.anime.premiere': 'Premiered',
    'k.anime.premiere.promoted': 'Premiered and auto-subscribed',
    'k.anime.completed': 'Finished, all {eps} episodes watched',
    'k.anime.completed.noeps': 'Finished and marked as watched',
    'k.anime.landed': 'Episode {ep} shelved · {cour}',
    'k.anime.landed.noep': 'New episode shelved · {cour}',
    'k.anime.subscribed': 'Now subscribed · {group}',
    'k.anime.subscribed.nogroup': 'Now subscribed',
    'k.anime.imported': 'Imported by hand',
    'k.anime.unresolved': 'No release group matched yet',
    'k.anime.grace': 'Waiting for the preferred group',
    'k.autopilot.stalled.head': 'The sync daemon looks stalled',
    'k.autopilot.stalled': 'Last pass {since}, silent {hours} {hours|hour|hours} and counting',
    'k.autopilot.stalled.fresh': 'Last pass {since}, and nothing has landed since',
    'k.autopilot.qb_down.head': 'qBittorrent is unreachable',
    'k.autopilot.qb_down': 'Downloads stay paused until it answers again',
    'k.unknown': 'Fresh word from this hall. Refresh the page to read it in full',
    'k.unknown.head': 'A newly registered hall',
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
    dayTime: '{day}, {time}',
    worksSub: 'Readings from the engine room',
    wkCpu: 'PROCESSOR', wkMem: 'MEMORY', wkGpu: 'VRAM', wkNet: 'TRAFFIC',
    wkHours: 'HOURS RUN', wkDisk: 'STORE', wkFree: '{n} FREE',
    runD: 'd', runH: 'h', runM: 'm', join: ': ', list: ', ',
    runSrDays: '{d} {d|day|days} {h} {h|hour|hours}', runSrMinutes: '{m} {m|minute|minutes}',
    /* No English tooltip where it would only repeat the engraving above it
       (RESERVED, STATISTICS, ALMANAC). The Chinese one is the translation. */
    vacantName: '', vacantLamp: 'Not in service',
    wkNoReading: 'NO READING',
    wkCores: '{n} {n|core|cores}', wkThreads: '{n} {n|thread|threads}',
    wkCpuCount: '{c} {c|core|cores}, {t} {t|thread|threads}',
    wkOf: '{a} of {b} GB', wkLoad: 'GPU load {n}%',
    wkDown: '{d} down · {u} up MB/s',
    almSub: 'The sky over {place}',
    almHigh: 'HIGH', almLow: 'LOW', almPrecip: 'PRECIP', almWind: 'WIND',
    almRise: 'RISE', almSet: 'SET',
    almPolarDay: 'MIDNIGHT SUN', almPolarNight: 'POLAR NIGHT',
    almAge: 'AGE',
    almDaylight: 'DAYLIGHT', almLonger: 'LONGER', almShorter: 'SHORTER',
    almDays: '{n} d', almSrDays: '{n} days', almWindUnit: '{n} km/h',
    almFahrenheit: 'Now {now} °F · high {high} · low {low}',
    almFahrenheitDay: 'High {high} · low {low} °F',
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
    uiMedium: 'STANDARD', uiMediumDesc: "The hall's own size",
    uiLarge: 'SIGNBOARD', uiLargeDesc: 'Legible from across the room',
    onyxGloss: '', ivoryGloss: '', system: 'FOLLOW SYSTEM',
    onyxDesc: 'Black & gold', ivoryDesc: 'Platinum & gold', systemDesc: 'Match the OS',
    motionFull: 'FULL', motionReduced: 'REDUCED',
    replay: 'REPLAY ENTRANCE',
    replayDesc: 'Reloads the hall to play it once more',
    ariaTicker: 'Status band',
    ariaLever: 'Bureau wing',
    ariaDesk: 'House-lights board: wing switch',
    markAll: 'MARK ALL READ',
    markAllHint: 'Strike every dispatch in the Ledger, both wings',
    markAllDone: 'Nothing left to strike',
    markAllStruck: '{n} {n|dispatch|dispatches} struck',
    markAllScope: 'BOTH WINGS',
    srOpen: 'open', srDark: 'dark', srChecking: 'checking', srStop: '.',
    opensTab: 'Opens in its own tab.',
    unread: 'unread',
    wkHot: 'in the red',
    almSrTimes: 'Sunrise {rise}, sunset {set}.',
    almSrHours: '{h} {h|hour|hours} {m} {m|minute|minutes}',
    almSrLonger: 'Longer than yesterday by {m} {m|minute|minutes} {s} {s|second|seconds}',
    almSrShorter: 'Shorter than yesterday by {m} {m|minute|minutes} {s} {s|second|seconds}',
    almSrLongerSec: 'Longer than yesterday by {s} {s|second|seconds}',
    almSrShorterSec: 'Shorter than yesterday by {s} {s|second|seconds}',
    almSrLongerHair: 'Longer than yesterday by less than a second',
    almSrShorterHair: 'Shorter than yesterday by less than a second',
    leverDesc: 'Off lights the Salon, the play wing. On lights the Bureau, the work wing.',
    ariaFilter: 'Filter dispatches', ariaClose: 'Close',
    ariaLedgerClose: 'Close the Ledger',
    ariaGates: 'Gates', ariaLedger: 'Ledger: dispatch timeline',
    ariaWorks: 'Statistics: live readings from this machine',
    ariaAlmanac: 'Almanac: sun, moon and weather over this hall',
    salonWing: 'Play wing', bureauWing: 'Work wing',
    wingLitSalon: 'The Salon is lit: {gates}', wingLitBureau: 'The Bureau is lit: {gates}',
    ledgerBtnLabel: 'LEDGER',
    keysTitle: 'KEYS',
    keyGates: 'Walk the gates', keyJump: 'Go to a gate', keyOpen: 'Open it',
    keyLever: 'Throw the lever', keyLedger: 'Open or close the Ledger', keyPrefs: 'Open Preferences',
    keyWalk: 'Walk the dispatches in the open Ledger', keyPlate: 'Show or hide this plate',
    keyClose: 'Close', keyEsc: 'Close the top layer', keyEnter: 'ENTER', keyTo: 'to',
    unreadCount: '{n} new dispatches', unreadCountOne: '1 new dispatch'
  },
  zh: {
    subtitle: '大通廊',
    preferences: '偏好设置',
    ledger: '消息总台',
    chipAll: '全部',
    allDark: '大厅熄灯，没有可达的服务。',
    today: '今日', earlier: '更早',
    empty: '暂无消息',
    darkNotice: '未点亮。用此脚本启动：{hint}',
    darkLaunch: '用此脚本启动', darkHint: '用此脚本启动：{hint}',
    lampOpen: '已点亮', lampDark: '未点亮', lampChecking: '检查中',
    justNow: '刚刚', minAgo: '{n} 分钟前', hAgo: '{n} 小时前', dAgo: '{n} 天前',
    minAgoSr: '{n} 分钟前', hAgoSr: '{n} 小时前', dAgoSr: '{n} 天前',
    linesOpen: '线路畅通 {n}/{m}',
    tickerMore: '消息总台另有 {n} 条',
    hubLost: '中枢没有回音',
    ledgerUnreadable: '消息总台暂时读不出来',
    ledgerLoading: '正在读取消息总台',
    ledgerStale: '{t} 之后没有回音',
    /* A description may break only where a zero-width space stands (the
       card sets Chinese keep-all): between words and after the comma. Left
       to itself the browser broke 世|界 and 轨|道. */
    'desc.autopilot': '当季\u200b新番，\u200b睡着也\u200b替你\u200b追完\u200b入库。',
    'desc.groundstation': '工坊 Mod 追踪，\u200b更新\u200b在轨\u200b截获。',
    'desc.outreach': '今日的\u200b引荐\u200b名单，\u200b已备好\u200b草稿\u200b待发。',
    'desc.pressroom': '昨夜的\u200b世界，\u200b天亮前\u200b已排版\u200b付印。',
    'desc.arsenal': '一张\u200b游戏\u200b实用\u200b小工具的\u200b工作台。',
    'desc.bourse': '每日\u200b行情\u200b简报，\u200b排好\u200b名次\u200b候审。',
    'desc.fallback': '新登记的\u200b厅室。',
    'desc.vacant': '留给\u200b下一间厅。',
    'stat.airing': '今日 {n} 部放送', 'stat.watching': '在看 {n} 部',
    'stat.pending': '{n} 个更新待装', 'stat.mods': '追踪 {n} 个 MOD',
    'stat.queue': '队列 {done}/{total}', 'stat.invited': '已发 {n}/{target}',
    'stat.stories': '{n} 条\u00a0· {m} 栏',
    'stat.tools': '架上 {n} 件工具',
    'stat.orders_await': '{n} 条指令候审', 'stat.brief_of': '{date}简报',
    'note.qb_down': 'qBittorrent 不可达，下载已暂停',
    'note.daemon_stale': '同步守护进程疑似停摆',
    'note.fallback': '服务器离线，正在直读状态文件',
    'note.digest_stale': '这一期晨报已超过一天未更新',
    'note.slow': '仍在运行，只是应答迟缓',
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
    'k.autopilot.stalled.head': '同步守护进程疑似停摆',
    'k.autopilot.stalled': '最后一轮 {since}，已沉寂 {hours} 小时',
    'k.autopilot.stalled.fresh': '最后一轮 {since}，此后再无剧集入库',
    'k.autopilot.qb_down.head': 'qBittorrent 不可达',
    'k.autopilot.qb_down': '下载将保持暂停，直到它恢复响应',
    'k.unknown': '该厅室有新消息。刷新页面即可完整阅读',
    'k.unknown.head': '新登记的厅室',
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
    'k.bourse.briefing.head': '行情简报已付印',
    'k.bourse.briefing': '{date}版：{orders} 条指令待你审阅',
    'k.bourse.briefing.hold': '{date}版：无操作，按兵不动',
    'k.bourse.briefing.nodate': '{orders} 条指令待你审阅',
    'k.bourse.briefing.hold.nodate': '无操作，按兵不动',
    'k.bourse.canary.head': '瞭望塔报警',
    'k.bourse.canary': '{sym} 动量转负，部分仓位转入避险',
    'k.bourse.allclear.head': '瞭望塔解除警报',
    'k.bourse.allclear': '金丝雀全数安好，恢复进攻',
    dayTime: '{day} {time}',
    worksSub: '本机运转实况',
    wkCpu: '处理器', wkMem: '内存', wkGpu: '显存', wkNet: '网络',
    wkHours: '已运转', wkDisk: '存储', wkFree: '余 {n}',
    runD: ' 天 ', runH: ' 时 ', runM: ' 分', join: '：', list: '，',
    runSrDays: '{d} 天 {h} 小时', runSrMinutes: '{m} 分钟',
    vacantName: '预留', vacantLamp: '未启用',
    wkNoReading: '无读数',
    wkCores: '{n} 核', wkThreads: '{n} 线程',
    wkCpuCount: '{c} 核 {t} 线程',
    wkOf: '{a} / {b} GB', wkLoad: 'GPU 负载 {n}%',
    wkDown: '下 {d} · 上 {u} MB/s',
    almSub: '{place}上空的天象',
    almHigh: '高', almLow: '低', almPrecip: '降水', almWind: '风',
    almRise: '日出', almSet: '日落',
    almPolarDay: '极昼', almPolarNight: '极夜',
    almAge: '月龄',
    almDaylight: '昼长', almLonger: '比昨日长', almShorter: '比昨日短',
    almDays: '{n} 日', almSrDays: '{n} 日', almWindUnit: '{n} 公里/时',
    almFahrenheit: '现在 {now} °F · 最高 {high} · 最低 {low}',
    almFahrenheitDay: '最高 {high} · 最低 {low} °F',
    /* The standard eight, each a whole name: 盈凸 and 亏凸 are not said on
       their own, and 朔 and 望 stood beside 蛾眉月 and 残月 in another
       register. */
    almPhase0: '新月', almPhase1: '蛾眉月',
    almPhase2: '上弦月', almPhase3: '盈凸月',
    almPhase4: '满月', almPhase5: '亏凸月',
    almPhase6: '下弦月', almPhase7: '残月',
    bayLabel: '第 {n} 间',
    floorMotto: '万厅一门',
    appearance: '外观', language: '语言', motion: '动效',
    uiScale: '字号',
    uiSmall: '精细', uiSmallDesc: '凑近细读',
    uiMedium: '标准', uiMediumDesc: '大厅原本的字号',
    uiLarge: '招牌', uiLargeDesc: '隔着房间也看得清',
    /* The Chinese gloss before the English name, which is signage and
       carries lang="en" in the markup (index.html). */
    onyxGloss: '黑金 · ', ivoryGloss: '白金 · ', system: '跟随系统',
    onyxDesc: '玄色与鎏金', ivoryDesc: '铂色与鎏金', systemDesc: '与操作系统一致',
    motionFull: '完整', motionReduced: '减弱',
    replay: '重播入场动画',
    replayDesc: '重新载入大厅，再演一遍',
    ariaTicker: '状态带',
    ariaLever: '事务翼',
    ariaDesk: '场灯开关台：翼区闸刀',
    markAll: '全部标为已读',
    markAllHint: '把消息总台里两翼的消息全部划去',
    markAllDone: '没有未读了',
    markAllStruck: '已划去 {n} 条',
    markAllScope: '两翼一并',
    srOpen: '已点亮', srDark: '未点亮', srChecking: '检查中', srStop: '。',
    opensTab: '在单独的标签页中打开。',
    unread: '未读',
    wkHot: '已入红区',
    almSrTimes: '日出 {rise}，日落 {set}。',
    almSrHours: '{h} 小时 {m} 分',
    almSrLonger: '比昨日长 {m} 分 {s} 秒',
    almSrShorter: '比昨日短 {m} 分 {s} 秒',
    almSrLongerSec: '比昨日长 {s} 秒',
    almSrShorterSec: '比昨日短 {s} 秒',
    almSrLongerHair: '比昨日长不到一秒',
    almSrShorterHair: '比昨日短不到一秒',
    leverDesc: '关：点亮沙龙翼（娱乐）。开：点亮事务翼（工作）。',
    ariaFilter: '筛选消息', ariaClose: '关闭',
    ariaLedgerClose: '关闭消息总台',
    ariaGates: '门廊', ariaLedger: '消息总台：时间轴',
    ariaWorks: '运转统计：本机实时读数',
    ariaAlmanac: '天象：本厅上空的日月与天气',
    salonWing: '沙龙翼（娱乐）', bureauWing: '事务翼（工作）',
    wingLitSalon: '沙龙翼已点亮：{gates}', wingLitBureau: '事务翼已点亮：{gates}',
    ledgerBtnLabel: '消息总台',
    keysTitle: '按键',
    keyGates: '在门廊间移动', keyJump: '直达某扇门', keyOpen: '打开',
    keyLever: '扳动拉杆', keyLedger: '开合消息总台', keyPrefs: '打开偏好设置',
    keyWalk: '在打开的消息总台里逐条移动', keyPlate: '显示或收起这块铭牌',
    keyClose: '关闭', keyEsc: '关闭最上面一层', keyEnter: '回车', keyTo: '至',
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
   deal as the pointer: focus IS the caret coming to rest, so it needs no
   dwell, and the mark lands when the caret moves on.
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
  // The caret resting on a card reads it, but the mark lands as the caret
  // leaves. Struck on arrival, the card had already lost its "unread" by the
  // time a screen reader built the focus announcement, so a keyboard reader
  // never heard which dispatches were new. Focus the hall moved here (the
  // focused card left the feed) does not count; a card the reader reached
  // keeps its claim when a poll moves it and the hall puts focus back.
  var reached = false;
  node.addEventListener('focusin', function () {
    cancel();
    if (!quietFocus) reached = true;
  });
  node.addEventListener('focusout', function (e) {
    if (!reached || node.contains(e.relatedTarget)) return;
    reached = false;
    markRead(id);
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
   Entrance: the house curtain (see DESIGN.md timeline)
   ======================================================================== */
var entrance = $('#entrance');
var entranceTimers = [];
var ENS = 'http://www.w3.org/2000/svg';
function eEl(tag, attrs, cls) {
  var e = document.createElementNS(ENS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
}

/* The crest on the house curtain: a gilt sunburst appliqued on the velvet
   (the rays, which exist nowhere else in the hall but in the day's light
   shafts) round the hall's own enamelled badge. Built once.
   Each ray is carved and gilded, a half-round moulding that tapers to its
   point. It is shaded in eight bands across its width, each band lit by
   how it faces the follow spot (from the booth: in front and above) and
   the footlights (below, warm), so the bands follow the taper and every
   ray is rounded whichever way it points. The leaf carries its burnish
   grain, each ray takes the light a little differently, and the crest
   stands off the pile and throws a soft shadow down onto it. The rays used
   to be flat wedges, one half of each a shade darker over a hard shadow,
   with a line drawing of the rosette at the centre: a logo from an icon
   set against a photographed hall (AR-32). */
function buildRays() {
  var g = $('.e-rays');
  if (!g || g.childNodes.length) return;
  var defs = eEl('defs', {});
  // the leaf along each ray, brightest toward the badge where the spot is
  var gr = eEl('radialGradient', { id: 'e-gilt', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 336 });
  [0, 0.3, 0.62, 1].forEach(function (o, k) { gr.appendChild(eEl('stop', { offset: o }, 'e-gilt-' + k)); });
  defs.appendChild(gr);
  var pt = eEl('pattern', { id: 'e-gilt-tex', patternUnits: 'userSpaceOnUse', width: 150, height: 150 });
  pt.appendChild(eEl('image', { href: '/static/assets/tex/grain-gilt.webp', width: 150, height: 150 }));
  defs.appendChild(pt);
  var soft = eEl('filter', { id: 'e-soft', x: '-20%', y: '-20%', width: '140%', height: '140%' });
  soft.appendChild(eEl('feGaussianBlur', { stdDeviation: 5 }));
  defs.appendChild(soft);
  g.parentNode.insertBefore(defs, g);

  var N = 48, B = 8, D = Math.PI / 180;
  var unit = function (v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  var dot = function (u, v) { return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; };
  var spot = unit([0.1, -0.45, 0.89]), foot = unit([0, 0.8, 0.6]);
  var glint = unit([spot[0], spot[1], spot[2] + 1]);
  var xy = function (v) { return v[0].toFixed(1) + ',' + v[1].toFixed(1); };
  var outline = '', rays = [];
  for (var i = 0; i < N; i++) {
    var a = i * 360 / N - 90, tier = i % 4 === 0 ? 0 : i % 2 === 0 ? 1 : 2;
    var r0 = 96, r1 = [330, 268, 212][tier] + 12 * (hash01(i + 11) - 0.5);
    var w0 = [4.6, 3.8, 3.1][tier], w1 = w0 * 0.3 * 98 / r1 * 2.4;
    var at = function (r, da) { return [r * Math.cos((a + da) * D), r * Math.sin((a + da) * D)]; };
    var tl = at(r1, -w1), tp = at(r1 + 7, 0), tr = at(r1, w1);
    // across the ray (s from -1 to 1): the foot on the badge's rim, and the
    // point, cut to a mitre at the tip
    var foot0 = function (s) { return at(r0, s * w0); };
    var tipAt = function (s) {
      var u = s < 0 ? s + 1 : s, p = s < 0 ? tl : tp, q = s < 0 ? tp : tr;
      return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
    };
    outline += 'M' + [foot0(-1), tl, tp, tr, foot0(1)].map(xy).join('L') + 'Z';
    var across = [-Math.sin(a * D), Math.cos(a * D)];
    var take = 0.86 + 0.28 * hash01(i + 71);   // each ray takes the light its own way
    var best = -1, bestK = 0, bands = [];
    for (var k = 0; k < B; k++) {
      var s0 = -1 + 2 * k / B, s1 = s0 + 2 / B, th = (s0 + s1) / 2 * 74 * D;
      var n = [across[0] * Math.sin(th), across[1] * Math.sin(th), Math.cos(th)];
      var v = (0.78 * Math.max(0, dot(n, spot)) + 0.26 * Math.max(0, dot(n, foot))) * take;
      var gl = Math.pow(Math.max(0, dot(n, glint)), 28);
      if (gl > best) { best = gl; bestK = k; }
      // a band darker than the leaf's own tone is glazed toward umber, a
      // lighter one toward the warm white of burnished gold
      var fill = v < 0.66
        ? 'rgba(34,16,2,' + Math.min(0.8, (0.66 - v) * 1.25).toFixed(3) + ')'
        : 'rgba(255,238,196,' + Math.min(0.75, (v - 0.66) * 1.1 + gl * 0.55).toFixed(3) + ')';
      bands.push({ d: 'M' + [foot0(s0), foot0(s1), tipAt(s1), tipAt(s0)].map(xy).join('L') + 'Z', fill: fill });
    }
    var g0 = -1 + 2 * Math.max(0, bestK - 1) / B, g1 = -1 + 2 * Math.min(B, bestK + 2) / B;
    rays.push({ bands: bands, glint: [foot0(g0), foot0(g1), tipAt(g1), tipAt(g0)].map(xy).join(' ') });
  }
  g.appendChild(eEl('path', { d: outline, transform: 'translate(3 8)', filter: 'url(#e-soft)' }, 'e-ray-sh'));
  g.appendChild(eEl('path', { d: outline }, 'e-ray'));
  rays.forEach(function (r) {
    r.bands.forEach(function (b) {
      var p = eEl('path', { d: b.d }, 'e-ray-band');
      p.style.fill = b.fill;
      g.appendChild(p);
    });
  });
  g.appendChild(eEl('path', { d: outline }, 'e-ray-tex'));
  g.appendChild(eEl('path', { d: outline }, 'e-ray-edge'));
  // Each ray catches the spot on its own beat, along its crown: the glint
  // runs round the sun.
  rays.forEach(function (r, i) {
    var p = eEl('polygon', { points: r.glint }, 'e-ray-lit');
    p.style.setProperty('--i', String(i));
    g.appendChild(p);
  });
}

/* The badge at the crest's heart is the masthead's own: the enamelled
   radiator badge room.js casts for the monogram, at crest scale, so the
   spot docks on the badge it opened on. Cloned rather than <use>d, so its
   parts keep their styling; it is built at DOMContentLoaded, after the
   masthead. */
function dressMedal() {
  var m = $('.e-medal'), src = $('#monogram');
  if (!m || m.childNodes.length) return;
  m.appendChild(eEl('circle', { cx: 3, cy: 9, r: 86, filter: 'url(#e-soft)' }, 'e-medal-sh'));
  var badge = eEl('g', { transform: 'scale(3.62) translate(-24 -24)' }, 'e-badge');
  var parts = src ? Array.prototype.filter.call(src.childNodes, function (n) {
    return n.nodeType === 1 && n.tagName.toLowerCase() !== 'defs';
  }) : [];
  if (parts.length) {
    parts.forEach(function (n) { badge.appendChild(n.cloneNode(true)); });
  } else {
    badge.appendChild(eEl('use', { href: '#rosette' }, 'e-medal-mark'));
  }
  m.appendChild(badge);
}

/* The day's light: a low sun through four open doors behind the reader.
   Its rays are parallel, so each door's light on the floor is a band whose
   edges run away to one point dead ahead at eye height, cut off where the
   floor meets the wall; on the wall the same band stands upright and ends
   at the shadow of the door's lintel. Each band carries the shadow of its
   glazing bar and, on the wall, of the transom. The shade between them is
   the street's sky, cooler than the sun, and dust turns in the beams. The
   geometry follows the room (the floor line is measured), so it is drawn
   in an SVG sized to the screen, and again whenever the stage is solved
   while the entrance stands. Only the motes move. */
var DOORS = [[0.115, 0.215], [0.335, 0.425], [0.572, 0.668], [0.79, 0.885]];
function lightDoors() {
  var host = $('.e-shafts');
  if (!host || !entrance.classList.contains('day') || root.dataset.entered !== 'no') return;
  var W = window.innerWidth, H = window.innerHeight;
  var fp = $('#floorplane'), fr = fp && fp.getBoundingClientRect();
  var yw = fr && fr.height ? fr.top : H * 0.7;
  var key = W + 'x' + H + ':' + Math.round(yw);
  if (host.dataset.key === key) return;
  host.dataset.key = key;
  var vx = W / 2, vy = yw - H * 0.3;       // eye height, dead ahead
  var yl = H * 0.2, foot = H + 40;         // the lintel's shadow; past the screen's foot
  var yt = yl + (yw - yl) * 0.28, th = (yw - yl) * 0.035;
  var out = function (x) { return vx + (x - vx) * (foot - vy) / (yw - vy); };
  var f1 = function (v) { return v.toFixed(1); };
  var band = function (x0, x1) {
    return 'M' + [[x0, yl], [x1, yl], [x1, yw], [out(x1), foot], [out(x0), foot], [x0, yw]]
      .map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join('L') + 'Z';
  };
  var beams = '', bars = '', motes = [];
  DOORS.forEach(function (d, k) {
    var x0 = d[0] * W, x1 = d[1] * W, xm = (x0 + x1) / 2, m = (x1 - x0) * 0.035;
    beams += band(x0, x1);
    bars += band(xm - m, xm + m) +
      'M' + f1(x0) + ' ' + f1(yt) + 'H' + f1(x1) + 'V' + f1(yt + th) + 'H' + f1(x0) + 'Z';
    // the dust in this door's light, placed inside it
    for (var i = 0; i < 22; i++) {
      var u = hash01(k * 97 + i * 7 + 501), v = hash01(k * 89 + i * 13 + 601);
      var y = yl + (H - yl) * (0.08 + 0.9 * v);
      var t = y <= yw ? 0 : (y - yw) / (foot - yw);
      var a = x0 + (out(x0) - x0) * t, b = x1 + (out(x1) - x1) * t;
      var r = +(0.7 + 1.5 * Math.pow(hash01(k * 31 + i + 701), 2)).toFixed(2), R = r * 2.4;
      var al = (0.35 + 0.5 * hash01(k * 29 + i + 801)).toFixed(2);
      // each mote is its own speck on whole pixels, its exact centre kept
      // inside it
      var cx = a + (b - a) * u, tx = Math.floor(cx - R), ty = Math.floor(y - R), S = Math.ceil(2 * R) + 2;
      motes.push('left:' + tx + 'px;top:' + ty + 'px;width:' + S + 'px;height:' + S + 'px;' +
        'background:radial-gradient(circle at ' + (cx - tx).toFixed(2) + 'px ' + (y - ty).toFixed(2) + 'px, ' +
        'rgba(255, 252, 238, ' + al + ') 0 ' + r.toFixed(2) + 'px, rgba(255, 248, 226, 0) ' + R.toFixed(2) + 'px)');
    }
  });
  host.innerHTML =
    '<svg class="e-light" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><filter id="e-pen" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter>' +
      '<linearGradient id="e-sun" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" class="e-sun-0"/><stop offset="0.6" class="e-sun-1"/><stop offset="1" class="e-sun-2"/>' +
      '</linearGradient></defs>' +
      '<rect class="e-shade" width="' + W + '" height="' + H + '"/>' +
      '<g filter="url(#e-pen)"><path class="e-beam" d="' + beams + '"/><path class="e-bar" d="' + bars + '"/></g>' +
    '</svg>';
  // The dust was one screen-sized layer of 88 screen-sized gradients inside
  // the glare. Its one raster took about a second of raster time at 3440
  // and landed in the fade (a 340-390ms frame), and a screen-sized layer
  // on the move cost every frame of the drift about a fifth more than the
  // same dust held still. Now each speck is its own small layer beside the
  // glare, fading on the glare's curve (palace-desk.css), and only their
  // holder moves.
  var flood = host.parentNode, dust = flood.nextElementSibling;
  if (!dust || !dust.classList.contains('e-motes')) {
    dust = el('div', 'e-motes');
    flood.parentNode.insertBefore(dust, flood.nextSibling);
  }
  dust.textContent = '';
  motes.forEach(function (css) {
    var m = el('i', 'e-mote');
    m.style.cssText = css;
    dust.appendChild(m);
  });
}

/* A gilt ring that draws itself round from twelve o'clock, by opacity
   alone: short arcs, each fading in on its own beat (the beats bunch up at
   the start, as an ease-out would), laid under the finished ring, which
   is the same geometry and takes over in one frame once every arc is in,
   so no seam between two arcs is left on the ring. Built once. */
function segmentRing(whole, r, n, layers) {
  if (!whole || (whole.previousSibling && whole.previousSibling.nodeType === 1 &&
      whole.previousSibling.classList.contains('e-segs'))) return;
  var g = eEl('g', {}, 'e-segs'), D = Math.PI / 180, T = 400;
  var P = function (a) { return (r * Math.cos(a * D)).toFixed(2) + ' ' + (r * Math.sin(a * D)).toFixed(2); };
  for (var i = 0; i < n; i++) {
    // each arc runs a hair into the next, so none of the joins shows a gap
    var a0 = -90 + i * 360 / n, a1 = a0 + 360 / n + 0.4;
    var d = 'M' + P(a0) + 'A' + r + ' ' + r + ' 0 0 1 ' + P(a1);
    var seg = eEl('g', {}, 'e-seg');
    seg.style.setProperty('--d', Math.round(T * Math.pow(i / n, 1.9)) + 'ms');
    layers.forEach(function (l) {
      var at = { d: d };
      if (l[1]) at.transform = 'translate(0 ' + l[1] + ')';
      seg.appendChild(eEl('path', at, l[0]));
    });
    g.appendChild(seg);
  }
  whole.parentNode.insertBefore(g, whole);
}

/* The festoon: as the curtain flies out, the hem gathers between its lift
   lines into swags. One swag per ~300px of screen, each a velvet drape
   with its folds running up to the lift points and a bullion fringe. */
function buildSwag() {
  var svg = $('.e-swag');
  if (!svg) return;
  var W = window.innerWidth, H = Math.round(window.innerHeight * 0.2);
  var n = Math.max(4, Math.round(W / 300)), s = W / n, dip = Math.min(H - 26, s * 0.3);
  var f1 = function (v) { return v.toFixed(1); };
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.textContent = '';
  var defs = eEl('defs', {});
  var gr = eEl('linearGradient', { id: 'e-swag-g', x1: 0, y1: 0, x2: 0, y2: 1 });
  [0, 0.55, 1].forEach(function (o, k) { gr.appendChild(eEl('stop', { offset: o }, 'e-swag-s' + k)); });
  defs.appendChild(gr);
  svg.appendChild(defs);
  var drape = '', folds = '', lights = '', fringe = '';
  for (var k = 0; k < n; k++) {
    var x0 = k * s, x1 = (k + 1) * s, cx = (x0 + x1) / 2;
    drape += 'M' + f1(x0) + ' 0H' + f1(x1) + 'C' + f1(x1 - s * 0.12) + ' ' + f1(dip * 1.25) +
             ' ' + f1(x0 + s * 0.12) + ' ' + f1(dip * 1.25) + ' ' + f1(x0) + ' 0Z';
    for (var f = 1; f <= 4; f++) {
      var t = f / 5, side = f % 2 ? x0 : x1, mx = x0 + s * t, my = dip * (0.35 + 0.6 * Math.sin(t * Math.PI));
      folds += 'M' + f1(side) + ' 2Q' + f1((side + mx) / 2) + ' ' + f1(my * 0.5) + ' ' + f1(mx) + ' ' + f1(my);
      lights += 'M' + f1(side + (f % 2 ? 3 : -3)) + ' 2Q' + f1((side + mx) / 2 + 2) + ' ' + f1(my * 0.45) +
                ' ' + f1(mx + 2) + ' ' + f1(my - 3);
    }
    // the fringe hangs from the drape's lower edge
    for (var x = x0 + 1; x < x1; x += 3) {
      var u = (x - x0) / s, y = dip * 0.94 * (1 - Math.pow(2 * u - 1, 2)) + 0.5;
      fringe += 'M' + f1(x) + ' ' + f1(y) + 'v' + f1(13 + 3 * hash01(Math.round(x)));
    }
    lights += 'M' + f1(cx - s * 0.3) + ' ' + f1(dip * 0.72) + 'Q' + f1(cx) + ' ' + f1(dip * 1.02) +
              ' ' + f1(cx + s * 0.3) + ' ' + f1(dip * 0.72);
  }
  svg.appendChild(eEl('path', { d: drape }, 'e-swag-body'));
  svg.appendChild(eEl('path', { d: folds }, 'e-swag-fold'));
  svg.appendChild(eEl('path', { d: lights }, 'e-swag-lit'));
  svg.appendChild(eEl('path', { d: fringe }, 'e-swag-fringe'));
}

/* The fanlights light from the clock outward: each lit arch is ranked by
   how many bays stand between it and the niche, and the pair in the same
   bay either side light together. */
function orderFanlights() {
  var clock = $('#clock');
  if (!clock) return;
  var c = clock.getBoundingClientRect(), mid = c.left + c.width / 2;
  var left = [], right = [];
  document.querySelectorAll('#gates .gate.active').forEach(function (g) {
    var r = g.getBoundingClientRect(), x = r.left + r.width / 2;
    (x < mid ? left : right).push({ g: g, d: Math.abs(x - mid) });
  });
  [left, right].forEach(function (side) {
    side.sort(function (a, b) { return a.d - b.d; });
    side.forEach(function (it, i) { it.g.style.setProperty('--fan-i', String(i)); });
  });
}

/* The marquee's bulbs chase once, on the band's own box, in whole bulbs.
   The run of lit bulbs was a quarter of the band wide and travelled in
   percent of itself, so its 28 steps came out 5.6 bulb pitches long at
   1920 and 7.9 at 3440, and each step lit dots 3-9px off the bulbs. Now
   the run is a whole number of pitches, starts one run-length off the
   band's left end (the bulbs' own origin) and steps a whole number of
   pitches, so every lit dot lands on a bulb. */
var E_CHASE_STEPS = 28;   // the keyframes' steps(), palace-desk.css
function placeMarquee() {
  var tk = $('#ticker'), mq = $('.e-marquee');
  if (!tk || !mq) return;
  var r = tk.getBoundingClientRect();
  mq.style.left = r.left + 'px'; mq.style.top = r.top + 'px';
  mq.style.width = r.width + 'px'; mq.style.height = r.height + 'px';
  var ui = parseFloat(getComputedStyle(tk).getPropertyValue('--ui')) || 1;
  var pitch = 13 * ui;                         // .t-bulbs' tile
  var run = Math.max(1, Math.round(r.width * 0.24 / pitch));
  var span = run + Math.ceil(r.width / pitch); // off the left end to off the right
  var step = Math.ceil(span / E_CHASE_STEPS);
  mq.style.setProperty('--ec-w', (run * pitch) + 'px');
  mq.style.setProperty('--ec-from', (-run * pitch) + 'px');
  mq.style.setProperty('--ec-to', ((step * E_CHASE_STEPS - run) * pitch) + 'px');
}

/* The dock: the spot (night) or the gilt ring (day) flies onto the
   masthead's rosette and goes out on it. Aimed at where the rosette rests,
   read off the masthead's own transform this frame. */
function dockEntrance() {
  var mono = $('#monogram').getBoundingClientRect();
  var burst = $('.e-burst').getBoundingClientRect();
  var mast = $('#masthead');
  var lift = mast ? new DOMMatrixReadOnly(getComputedStyle(mast).transform).m42 : 0;
  entrance.style.setProperty('--dock-x', (mono.left + mono.width / 2 - (burst.left + burst.width / 2)) + 'px');
  entrance.style.setProperty('--dock-y', (mono.top + mono.height / 2 - lift - (burst.top + burst.height / 2)) + 'px');
  entrance.style.setProperty('--dock-s', String(Math.max(0.04, mono.width * 1.15 / burst.width)));
  entrance.classList.add('dock');
}

/* The curtain is dressed at once, but its clock starts only when the hall
   behind it is built and drawn. It used to start as the script ran, while
   the gates, their first readings, the band and the Ledger were still going
   in behind it: at 3440 their first raster froze the curtain twice in its
   first 400ms, just as the footlights came up and the spot opened (MO-8).
   Now that raster happens under a curtain that is standing still: the
   clock starts once the boot's first readings are in (the gates', and the
   cases' where they stand) and the frames that draw them have gone out. A
   hub slow to answer holds the curtain ENTRANCE_HOLD ms, and then the clock
   starts as soon as the frames run at the display's pace again. It used to
   start the moment the hold ran out, and a first raster can take longer
   than that: the footlights and the spot began inside a 250-550ms freeze
   (MO-8). A browser that has drawn the hall before (a new tab, or a restart
   on the same profile) settles 0.45-0.85s after load, at 1920 and at 3440.
   One with no shaders compiled yet (a new profile, as every probe launch
   is) spends 2.3-3s on its first draws at either size, and there it is
   ENTRANCE_HOLD_MAX that starts the clock, at 3440 into the last of them.
   It is also for a renderer that never settles, and for a tab that draws
   nothing. */
var ENTRANCE_HOLD = 900, ENTRANCE_HOLD_MAX = 2500;
/* Calls fn once what has been handed to the compositor is on screen. No
   callback says so, and a fixed two frames is not it: the main thread runs
   a frame or two ahead of the GPU, so its animation frames kept arriving on
   time while a heavy frame was still being rastered, and then stopped. So
   this watches the frames for the heavy one, a gap of three frames or
   more, and goes two short intervals after it: by then it has gone out.
   With no heavy frame in CALM_RUN short intervals, nothing was heavy
   enough to hold a frame back. "Short" is under 25ms, or near the best
   this machine has shown, for a renderer that never gets under it. Two
   short intervals from the start were not enough: at 3440 the GPU began a
   flip's raster up to five frames after the flip, so the calm pair came
   before it, and the throw's first frame went into the stall it was
   waiting out (MO-1). */
var CALM_RUN = 6;
function afterDrawn(fn) {
  var last = 0, best = Infinity, calm = 0, heavy = false;
  requestAnimationFrame(function tick(t) {
    if (last) {
      var dt = t - last;
      best = Math.min(best, dt);
      if (dt > Math.max(45, best * 2.7)) { heavy = true; calm = 0; }
      else calm = dt < Math.max(25, best * 1.5) ? calm + 1 : 0;
    }
    last = t;
    if (calm >= (heavy ? 2 : CALM_RUN)) fn(); else requestAnimationFrame(tick);
  });
}
/* The crest is hung, and the spot opened, where the dial stands behind the
   curtain, so the spot the curtain leaves behind is on the clock. Both were
   at a fixed 44vh, and the dial's centre is the solved row's: 17-42px lower
   on most screens and 42-53px higher on tall ones, and the pool sat across
   the dial's upper half before it flew to the monogram (VD-18). Measured
   when the curtain is dressed and again whenever the stage is solved while
   it stands (the gates arriving, a resize). The crest and the name stay
   out of sight until then (.placed): the dial is not drawn when the curtain
   is dressed, and the row it stands in is solved only once the gates are in,
   so a crest shown at once jumped to the dial during the hold. */
function placeCrest(anyway) {
  if (root.dataset.entered !== 'no') return;
  var dial = $('#clock .dial');
  var r = dial && dial.getBoundingClientRect();
  if (r && r.height) {
    entrance.style.setProperty('--clock-cy', (r.top + r.height / 2).toFixed(1) + 'px');
  } else if (!anyway) {
    return;
  }
  entrance.classList.add('placed');
  lightDoors();
}
function playEntrance(built) {
  // Disable ledger button during entrance; re-enabled in finishEntrance()
  var lb = $('#ledger-btn');
  if (lb) lb.disabled = true;
  var day = root.dataset.theme === 'ivory';
  entrance.classList.add(day ? 'day' : 'night');
  placeCrest();
  if (day) {
    segmentRing($('.e-ring-whole'), 34, 40, [['e-ring-sh', 1], ['e-ring-hi', 0.6], ['e-ring-c', 0]]);
  } else {
    buildRays();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dressMedal);
    else dressMedal();
    buildSwag();
    segmentRing($('.e-crest > .e-circle'), 92, 60, [['e-circle', 0]]);
  }
  var started = false;
  function start() {
    if (started || root.dataset.entered !== 'no') return;
    started = true;
    runEntrance(day);
  }
  function arm() {
    entranceTimers.push(setTimeout(function () { afterDrawn(start); }, ENTRANCE_HOLD));
    entranceTimers.push(setTimeout(start, ENTRANCE_HOLD_MAX));
    Promise.resolve(built).then(function () {
      afterDrawn(start);
    });
  }
  // A hall loaded where nobody can see it (a tab opened in the background,
  // a restored session) holds the curtain until the tab is first shown. The
  // hold's fallback timer used to start the curtain anyway, and the hidden
  // tab's throttled timers ran the whole timeline to the end, so the reader
  // arrived at a finished hall and never saw the curtain (RC-19).
  if (document.visibilityState === 'hidden') {
    document.addEventListener('visibilitychange', function shown() {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', shown);
      arm();
    });
  } else {
    arm();
  }
  armEntranceSkip();
}

function runEntrance(day) {
  var at = function (ms, fn) { entranceTimers.push(setTimeout(fn, ms)); };
  var beat = function (cls) { return function () { entrance.classList.add(cls); }; };
  window.__entranceT0 = performance.now();   // read by the frame-capture scripts
  // hung before the curtain's clock starts, on the dial if it stands
  placeCrest(true);
  entrance.classList.add('play');

  if (day) {
    // The doors are open to the street and the curtain is already up: the
    // hall arrives as an exposure settling, with the sun's shafts in it,
    // while the gilt ring that drew itself in the glare docks.
    at(280, beat('expose'));
    at(900, dockEntrance);
    at(1400, beat('done-fade'));
    at(1700, finishEntrance);
  } else {
    // The house is dark. The footlights come up along the curtain's hem.
    at(60, beat('foot'));
    // A follow spot opens on the crest; the rays catch it one by one.
    at(250, beat('spot'));
    // The curtain flies out, gathering into swags as it goes.
    at(950, beat('rise'));
    // The house lights come up: the marquee chases once, and the arches'
    // fanlights light from the clock outward.
    at(1450, function () {
      placeMarquee();
      orderFanlights();
      entrance.classList.add('house');
    });
    // The spot, left on the air where the crest was, finds the rosette.
    at(1750, dockEntrance);
    // From done-fade the hall is what shows, so the overlay stops taking
    // the pointer; a click there lands the entrance and does what it says.
    at(2140, beat('done-fade'));
    at(2700, finishEntrance);
  }
}

/* Armed with the curtain, before its clock starts: a skip during the hold
   lands the hall just the same. */
function armEntranceSkip() {
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
  // A skip before the house beat lands the lamps with the hall. They were
  // held out by the curtain's rule, and once that let go they came up on
  // the throw's timing, 420ms late and over 0.7s, so a skip showed the
  // assembled hall with its fanlights dark for most of a second. The short
  // fade is set for the flip's frame only; a transition keeps the timing
  // it started with, so lifting the class later leaves it running.
  var early = entrance.classList.contains('night') && !entrance.classList.contains('house');
  if (early) root.classList.add('e-landing');
  // data-boot stays 'played', so the suppressed-load hall-fade does NOT
  // retrigger on this flip. The fanlights' entrance order goes with it.
  root.dataset.entered = 'yes';
  if (early) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('e-landing'); });
    });
  }
  document.querySelectorAll('#gates .gate').forEach(function (g) { g.style.removeProperty('--fan-i'); });
  // Re-enable ledger button now that entrance is done
  var lb = $('#ledger-btn');
  if (lb) lb.disabled = false;
  // Relay: motion transfers from the overlay to the hall. The gear train
  // twitches one tooth — the machine exhales as the overlay clears.
  deskNudge();
}

/* Desk nudge: the handle lifts a hair and drops back into its jaws after
   the entrance clears, the board's one breath. Amplitude 0.03 on the drive
   is about 5 degrees of the blade. Self-terminates in ~480ms. Reduced
   motion: returns immediately. */
function deskNudge() {
  if (root.dataset.motion === 'reduced') return;
  if (!desk) return;
  var t0 = performance.now();
  var PUSH = 200, PULL = 280, AMP = 0.03;
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
   The house-lights board (DESIGN.md "The house-lights board"). One scalar,
   the drive (0 = the blade in the Salon's jaws, 1 = in the Bureau's), is
   written by a rAF driver onto the parts that read it as --sw; the blades,
   the crossbar, the handle, the needle and the lamps all derive from it in
   CSS, so they cannot fall out of step.
   ======================================================================== */
var desk = $('#signal-desk');
var NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, cls) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
}

/* The board, its switch and its plates are drawn by static/js/desk.js.
   The hit surfaces are wired here: the board's own drawn shapes, each
   side's jaws, pilot and plate, and the blade's strip inside #lever. */
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

/* The flash of the break: when the blade leaves a pair of jaws, and a
   smaller one when it lands in the other. Event-only, opacity only, run on
   the compositor; never under reduced motion. */
var SPARK_BREAK = [
  { opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.35, offset: 0.25 },
  { opacity: 0.8, offset: 0.38 }, { opacity: 0.1, offset: 0.6 }, { opacity: 0 }
];
var SPARK_MAKE = [{ opacity: 0 }, { opacity: 0.8, offset: 0.12 }, { opacity: 0.2, offset: 0.4 }, { opacity: 0 }];
function sparkAt(side, make) {
  if (!desk || root.dataset.motion === 'reduced') return;
  var sp = desk.querySelector('.sw-spark-' + side);
  if (!sp || !sp.animate) return;
  sp.animate(make ? SPARK_MAKE : SPARK_BREAK, { duration: 150, easing: 'linear' });
}

/* Weighty throw, as a knife switch is thrown: for a moment the jaws' springs
   hold the blades and the hand pulls against them (the first 36ms creep
   3.5% of the way, and the break flashes as they let go); then the hand
   carries the blades over, gathering speed, and they land in the other
   jaws still moving (a Hermite curve that leaves at the grip's speed and
   arrives at 1.6 times the mean); the springs throw them back out about 8
   degrees once, and they fall in and stay, by 400ms of the 520. Past 1 the
   value is the bounce: bounced() in setDrive
   turns it back off the stop, and the needle takes it raw and swings
   past. Identical feel both directions; C0 at every seam. */
function easeWeighty(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  var GRIP = 0.07, LAND = 0.54, B1 = 0.77, PULL = 0.035;
  if (t < GRIP) return PULL * (t / GRIP) * (t / GRIP);
  if (t < LAND) {
    var u = (t - GRIP) / (LAND - GRIP), a = 2 * PULL / GRIP * (LAND - GRIP) / (1 - PULL), b = 1.6;
    var h = u * u * (3 - 2 * u) + a * (u * u * u - 2 * u * u + u) + b * (u * u * u - u * u);
    return PULL + (1 - PULL) * h;
  }
  if (t < B1) return 1 + 0.045 * Math.sin(Math.PI * (t - LAND) / (B1 - LAND));
  return 1;
}

var deskRaf = null;
/* --drive is written on the movers only, never on :root and not on the
   desk either. Only the lever arm, its hit strip and the two gears read it,
   and an inherited custom property restyles everything under the element
   it changes on: on :root that was ~3,600 elements per frame, which held
   the throw to 20-25 fps. On #signal-desk it was the console as well, and
   a console restyled every frame is a console repainted every frame: its
   cast relief runs through a turbulence filter, and re-rastering it for
   each frame of the throw cost the GPU 60-150ms a frame at 3440 (MO-1).
   On .desk-fx and #lever the console is never touched. It is now written
   on the four parts that read it, and it does not inherit (atrium.css):
   on .desk-fx it still restyled the lever's and the gears' whole drawings,
   some 180 nodes, on every frame of the throw.
   The value is also kept here. It used to be read back through
   getComputedStyle, and the throw read it straight after the wing flip, so
   every throw forced the flip's whole-hall restyle (8-10k elements, ~100ms)
   inside the key handler (MO-2). */
var driveNow = 0;
var driveEls = null, rawEls = null;
/* The blade stops on its jaws: past either end the drive comes back off
   the stop, so the throw's overshoot is a bounce, not a blade driven
   through the marble. The needle takes the raw value and swings past. */
function bounced(v) { return v > 1 ? 2 - v : v < 0 ? -v : v; }
function setDrive(v) {
  driveNow = v;
  if (!driveEls && desk) {
    driveEls = Array.prototype.slice.call(desk.querySelectorAll('.sw-drive:not(.sw-raw)'));
    rawEls = Array.prototype.slice.call(desk.querySelectorAll('.sw-raw'));
  }
  if (!driveEls) return;
  var b = bounced(v).toFixed(4), r = v.toFixed(4);
  driveEls.forEach(function (e) { e.style.setProperty('--sw', b); });
  rawEls.forEach(function (e) { e.style.setProperty('--sw', r); });
  // the blades, the crossbar and the handle: a pose drawn at each angle
  if (window.Desk && window.Desk.drive) window.Desk.drive(bounced(v));
}
function getDrive() { return driveNow; }

/* Interrupt-safe rAF driver: a re-toggle mid-throw reads the current
   drive as its new start. The break flashes as the blade leaves its jaws
   and the make as it lands (each latched once). Reduced motion: snap, and
   every part lands where the drive says.
   The throw runs on drawn frames, not on the wall clock: no frame moves
   the arm more than a sixteenth of its throw. Placed where the clock said
   it should be, the arm skipped its swing whenever a frame came late: the
   first frame after W carries the flip's re-leaf, 250-1,085ms of raster
   at 3440, and the arm was first drawn at or past its end stop (MO-15).
   After a late frame it now carries on from where it was drawn, and the
   swing and the overshoot are always drawn in sixteen frames or more. */
function deskDrive(target) {
  if (!desk) return;
  cancelAnimationFrame(deskRaf);
  // Hidden pages never fire rAF — land the mechanism instantly.
  if (root.dataset.motion === 'reduced' ||
      document.visibilityState === 'hidden') { setDrive(target); return; }
  var from = getDrive(), last = performance.now(), run = 0, DUR = 520;
  var STEP = DUR / 16;
  var broke = false, made = false;
  var fromSide = from < 0.5 ? 'salon' : 'bureau', toSide = target === 1 ? 'bureau' : 'salon';
  var frame = function (now) {
    // The Motion preference can flip (or the tab hide) mid-throw — land it.
    if (root.dataset.motion === 'reduced' ||
        document.visibilityState === 'hidden') { setDrive(target); return; }
    // The first frame's timestamp is taken when the frame began, which can
    // be before the click handler read the clock; a negative step kicked
    // the lever back past its end stop for one frame.
    run += Math.max(0, Math.min(STEP, now - last));
    last = Math.max(last, now);
    var t = Math.min(1, run / DUR);
    var p = from + (target - from) * easeWeighty(t);
    setDrive(t === 1 ? target : p);
    // how far the blades stand off the jaws they left, and off the ones
    // they are going to: they clear the spring leaves at about 14 degrees
    // of their 180, and the arc is drawn as they part and struck as they
    // meet
    var b = bounced(p), off = fromSide === 'salon' ? b : 1 - b, near = toSide === 'bureau' ? 1 - b : b;
    if (!broke && fromSide !== toSide && off > 0.075) { broke = true; sparkAt(fromSide, false); }
    if (!made && broke && near < 0.075) { made = true; sparkAt(toSide, true); }
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
      // Named by its engraved name; described by everything else it says,
      // the lamp first (describeGate, which follows the state). An aria-label
      // of the bare name used to hide the lamp, the description and the
      // status line from a screen reader. The lamp word is not in the name:
      // "OUTREACH DESK 已点亮" was one name in two languages, and a name is
      // voiced in one.
      a.setAttribute('aria-labelledby', 'gn-' + svc.id);
    }
    a.dataset.service = svc.id;
    a.dataset.state = svc.vacant ? 'vacant' : 'checking';
    a.dataset.wing = svc.wing;
    a.dataset.velvet = id.velvet || 'claret';
    a.dataset.glass = id.glass || 'amber';
    // The day screen's title card: an intertitle border, the gate's own.
    a.dataset.card = id.card || 'fans';
    a.dataset.ink = id.ink || 'oxblood';
    a.dataset.stock = id.stock || 'cream';
    a.style.setProperty('--gi', String(i));
    a.style.setProperty('--folds', String(id.folds || 9));
    a.style.setProperty('--fold-x', (id.foldX || 0) + '%');
    a.style.setProperty('--swag', String(id.swag || 0));
    // The DARK card is pinned by hand, a little off true, the gate's own way.
    a.style.setProperty('--card-tilt', (id.cardTilt || 0).toFixed(2) + 'deg');

    // 3D chain: pose (static wing tilt) > shell (pointer parallax) > flat
    // children — the intra-gate z-index stack survives inside the shell.
    var pose = el('div', 'g-pose');
    var shell = el('div', 'g-shell');
    // The arch's own hit area: the link takes the pointer only inside the
    // arch, never on the bare wall above its shoulders (see palace-gates.css).
    shell.appendChild(el('div', 'g-hit'));
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
    // The domed crystal the bezel holds over the mark (palace.js).
    if (window.Palace) {
      var crys = document.createElementNS(ns, 'svg');
      crys.setAttribute('class', 'g-crystal');
      crys.setAttribute('viewBox', '104 100 92 92');
      crys.setAttribute('aria-hidden', 'true');
      crys.innerHTML = window.Palace.crystal();
      face.appendChild(crys);
    }
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
    // The launch-hint notice of a DARK gate is a card pinned on the closed
    // curtain, in the description's place while it shows. It used to hang
    // over the apron and cover the gate's own lamp and address.
    // The card is a picture of its words: its path breaks at every separator
    // (<wbr>), and each break came out of the gate's description as a
    // space. A screen reader is given a hidden twin holding the words in
    // one piece, filled only while the card is pinned.
    var notice = el('div', 'g-notice');
    notice.setAttribute('aria-hidden', 'true');
    notice.hidden = true;
    house.appendChild(notice);
    var noticeSr = el('span', 'g-notice-sr');
    noticeSr.id = 'gx-' + svc.id;
    noticeSr.hidden = true;
    house.appendChild(noticeSr);
    face.appendChild(house);
    // The apron: the stage front, with the house's live line, its address
    // and the lamp.
    var apron = el('div', 'g-apron');
    var stat = el('div', 'g-stat');
    stat.id = 'gs-' + svc.id;
    stat.appendChild(el('span', 'num-roll num', ''));
    apron.appendChild(stat);
    // What the description reads for the live line and the note: each one
    // whole, its stop in the same run of text (describeGate).
    var statSaid = el('span', 'g-said-stat');
    statSaid.id = 'gss-' + svc.id;
    statSaid.hidden = true;
    apron.appendChild(statSaid);
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
    var noteSaid = el('span', 'g-said-note');
    noteSaid.id = 'gns-' + svc.id;
    noteSaid.hidden = true;
    apron.appendChild(noteSaid);
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
        if (e.button !== 1 || !actsDark(a)) return;
        e.preventDefault();
        showNotice(a, svc);
      });
      // Esc (the key plate's Close) takes a pinned card down from the gate
      // that has focus, as a click on the arch does for the pointer. The
      // keyboard could pin the card and never take it down again, and it
      // hid the gate's own description for the rest of the visit. The key
      // plate lies over the hall, so while it shows, its Esc comes first;
      // with no card pinned, Esc keeps its meaning.
      a.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || e.ctrlKey || e.metaKey || e.altKey) return;
        if (notice.hidden || (keyplate && !keyplate.hidden)) return;
        e.preventDefault();
        e.stopPropagation();
        hideNotice(a);
        layerMoved();
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

/* The notice is printed like a house notice: DARK in the display caps
   between two rules, what to do, then the launcher path in the address
   face. The path is lettered one folder at a time: each run from one
   separator to the next is a box of its own, so the line can only break
   between them. A <wbr> after each separator was not enough, since the
   browser still broke after a hyphen inside a name ('pdx-mod-' / 'hub'),
   which reads as hyphenation. A run too long for the card still wraps
   inside its box rather than run out of it, and fitNotice tightens the
   card first. The boxes are not text: a copied path comes out exactly as
   the registry has it. */
function letterNotice(n, svc) {
  var hint = svc.launch_hint || svc.url;
  n.textContent = '';
  var head = el('span', 'gx-head display', 'DARK');
  head.lang = 'en';                  // signage, like the lamp word
  n.appendChild(head);
  n.appendChild(el('span', 'gx-say', t('darkLaunch')));
  var path = el('span', 'gx-path');
  hint.split(/(?<=[\\/_])/).forEach(function (part, i) {
    if (i) path.appendChild(document.createElement('wbr'));
    path.appendChild(el('span', 'gx-run', part));
  });
  n.appendChild(path);
  // The twin says only what to do. The lamp word opens the gate's
  // description already, and "dark. ... Dark. Launch with" said it twice.
  var sr = $('.g-notice-sr', n.parentNode);
  if (sr) sr.textContent = t('darkHint', { hint: hint });
  // The card has to stand inside the house whatever the path's length and
  // however small the arch: it is set tighter, a step at a time, until it
  // fits, and set again whenever the house changes size.
  if (window.ResizeObserver) {
    noticeRO = noticeRO || new ResizeObserver(function (es) {
      es.forEach(function (e) { var k = $('.g-notice', e.target); if (k) fitNotice(k); });
    });
    noticeRO.observe(n.parentNode);
  }
  fitNotice(n);
}
var noticeRO = null;
/* A run of the path that takes two lines has broken inside a name. */
function runBroken(n) {
  return Array.prototype.some.call(n.querySelectorAll('.gx-run'), function (r) {
    var rg = document.createRange();
    rg.selectNodeContents(r);
    return rg.getClientRects().length > 1;
  });
}
function fitNotice(n) {
  var house = n.parentNode;
  if (n.hidden || !house) return;
  n.removeAttribute('data-fit');
  for (var k = 1; k <= 3 && (n.offsetHeight > house.clientHeight || runBroken(n)); k++) {
    n.dataset.fit = String(k);
  }
}

/* Pins the card. It is said out loud when it goes up, and again whenever
   `again` asks (a keyboard press on a card already showing). Said whole,
   DARK and all: the announcement stands on its own, where the gate's
   description already has its lamp word. */
function showNotice(a, svc, again) {
  var n = $('.g-notice', a);
  if (n.hidden) {
    letterNotice(n, svc);
    n.hidden = false;
    fitNotice(n);
    describeGate(a);
  } else if (!again) {
    return;
  }
  sayGate(t('darkNotice', { hint: svc.launch_hint || svc.url }), a);
}

function hideNotice(a) {
  var n = $('.g-notice', a), sr = $('.g-notice-sr', a);
  n.hidden = true;
  // Emptied, not just hidden: aria-describedby reads a hidden element it
  // points at, and a gate back OPEN used to keep its launch path.
  sr.textContent = '';
  unsayGate(a);
  describeGate(a);
}

/* A gate last known DARK stays dark to the reader's hand while its lamp only
   asks again: one missed poll used to take down the card being read, and
   a press in that moment opened the dead address. Only a lamp known OPEN
   opens the gate again. */
function actsDark(a) {
  return a.dataset.state === 'dark' || (a.dataset.state === 'checking' && a._known === 'dark');
}

/* A gate is described by what it says and what it does: its lamp, the description,
   the live line, the service's note, the launch card only while it is
   pinned, and "opens in its own tab" only when a press would open one. A
   DARK gate opens nothing, and it used to say that it did. The live line
   and the note are read from twins that carry each part and its stop in
   one run of text: a stop in a box of its own came out detached, as in
   "4 AIRING TODAY . Opens in its own tab.", on a braille line as well. */
function describeGate(a) {
  var id = a.dataset.service;
  var ids = ['gl-', 'gd-', 'gss-', 'gns-'].map(function (p) { return p + id; });
  if (!$('.g-notice', a).hidden) ids.push('gx-' + id);
  if (!actsDark(a)) ids.push('opens-tab');
  a.setAttribute('aria-describedby', ids.join(' '));
}

/* The launch card is said in a polite region of its own. It used to borrow
   #hall-status, and the next poll, finding the card's words there, said an
   unchanged line count again. The region is emptied and written a beat
   later, so the same card said twice is still a change a reader hears.
   Once said, it is taken down again: left standing, a reader browsing the
   hall met the launch path as a loose sentence after the last gate, with
   no gate attached. The gate's own description keeps the words. */
var gateSayT = null, gateSayFor = null;
var GATE_SAY_HOLD = 5000;   // ms: long after the region's change is queued
function sayGate(text, a) {
  var n = $('#gate-say');
  if (!n) return;
  clearTimeout(gateSayT);
  n.textContent = '';
  gateSayFor = a || null;
  gateSayT = setTimeout(function () {
    n.textContent = text;
    gateSayT = setTimeout(function () { unsayGate(); }, GATE_SAY_HOLD);
  }, 80);
}
/* Empties the region: any gate's words with no argument, or only a's. */
function unsayGate(a) {
  if (a && gateSayFor !== a) return;
  clearTimeout(gateSayT);
  gateSayFor = null;
  var n = $('#gate-say');
  if (n) n.textContent = '';
}

/* The browser's new-tab modifier: Cmd on a Mac, Ctrl everywhere else.
   Elsewhere, Meta is the Windows or Super key, and the browser treats a
   click holding it as a plain same-tab navigation. Letting that through
   would replace the hall with the service. */
var NEW_TAB_KEY = /mac|iphone|ipad|ipod/i.test(
  (navigator.userAgentData && navigator.userAgentData.platform) ||
  navigator.platform || '') ? 'metaKey' : 'ctrlKey';

function gateClick(e, a, svc) {
  var dark = actsDark(a);
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
    // A keyboard press pins the card and says it, every time. A second
    // Enter used to take the card down without a word; a reader pressing
    // again is asking to hear the path again.
    if (e.detail === 0) { showNotice(a, svc, true); return; }
    // A double-click is two clicks, and a plain toggle ended it hidden.
    // Only the first click of a run toggles; the rest leave it showing.
    if (e.detail > 1 || n.hidden) showNotice(a, svc);
    else hideNotice(a);
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
var SWAP_DIM = 120;   // ms, the house lights going down first (by night only)
var SWAP_IN = 360;    // ms, an incoming arch's fade (.gate.active, atrium.css)
var stageLands = 0;   // when the last throw's arches are all up (performance.now())
var solved = null;   // the last solve's measurements, for a throw to reuse
function layoutStage(initial) {
  var wrap = $('#gates');
  // A throw re-lays the row it already has, so it reuses the last solve's
  // measurements instead of reading them back: straight after the wing
  // flip, any read forced the flip's whole-hall restyle inside the key
  // handler (MO-2). A resize, the engraving size and a new registry all
  // come in as initial, and measure afresh.
  var m = !initial && solved;
  var W = m ? m.W : wrap.clientWidth;
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
     solve does not chase its own output. Both boxes are linear in --fit, so
     the used width over the fit in force IS the fit-1 width, as long as it
     is read unrounded: offsetWidth is a whole pixel, and at 2800 and wider
     its rounding moved the row by a fraction of a pixel on the first throw
     after a load, enough to rebuild the wall and every floor streak
     mid-throw (MO-10). */
  var fitNow = parseFloat(stage.style.getPropertyValue('--fit')) || 1;
  var g0 = m ? m.g0 : (first ? parseFloat(getComputedStyle(first).width) || first.offsetWidth : 260) / fitNow;
  var c0 = m ? m.c0 : clock ? (parseFloat(getComputedStyle(clock).width) || clock.offsetWidth) / fitNow : 0;
  var PITCH = 1.16;        // arch centre to arch centre, in gate widths
  var CLEAR = 0.10;        // clock to its nearest arch
  function rowUnits(n) { var k = Math.ceil(n / 2); return 2 * CLEAR + 2 * (k ? 1 + (k - 1) * PITCH : 0); }
  /* Both wings stand in one bay grid, the longer wing's, whichever is lit.
     The fit used to be solved from the lit wing alone, so a wing of five
     (six bays with its RESERVED) stood at 0.80 and a wing of three at 1.0:
     every throw rewrote --fit, the outgoing arches grew in their old bays
     over each other and over the clock while they were still fully opaque,
     and no incoming arch found a mate at its own x to wait for (CRB-1).
     With one fit for both, a throw never resizes anything, and the shorter
     wing's bays are the longer wing's inner ones. */
  var span = Math.max(active.length, receded.length);
  var rowG = rowUnits(span);
  // The aisles open only beside a row at full size, the longer wing's, so a
  // throw never opens or shuts them. Neither width here depends on them.
  if (!m && setAisles((c0 + g0 * rowG) / 0.985)) {
    W = wrap.clientWidth;
  }
  if (!m && first) solved = { W: W, g0: g0, c0: c0 };
  // The wall is laid from the same grid: its piers and damask bays stand
  // for both wings, so a throw re-lays none of it.
  var nSide = Math.ceil(span / 2);
  var fit = Math.min(1, (W * 0.985) / (c0 + g0 * rowG));
  // Inside the dead band of full size the row stands at full size, so the
  // band cannot leave a live re-solve a hair off the load's (PS-1).
  if (fit > 0.998) fit = 1;
  if (Math.abs(fit - fitNow) > 0.002 || (fit === 1 && fitNow !== 1)) stage.style.setProperty('--fit', fit.toFixed(4));
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
    // when its fade begins, for shown() below
    a.riseAt = lit ? performance.now() + delay : Infinity;
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

  if (cut.length && initial) {
    void wrap.offsetWidth;   // the cut values become the before-change style
    cut.forEach(function (a) { a.classList.remove('no-slide'); });
  } else if (cut.length) {
    // In a throw the only cut is the RESERVED pair changing places, and the
    // flush above forced the wing flip's whole-hall restyle inside the key
    // handler (MO-2). The frame styles the cut instead, and it is lifted in
    // the frame after, when the values it held are the ones in place.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cut.forEach(function (a) { a.classList.remove('no-slide'); });
      });
    });
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
  // Whether an arch now going out had begun to show: kept in JS (role()
  // stamps when each fade begins), since a computed-style read here was one
  // more forced whole-hall restyle in the key handler (MO-2).
  function shown(a) { return performance.now() >= (a.riseAt === undefined ? 0 : a.riseAt) + 5; }
  swaps.forEach(function (s) {
    if (!s.lit) return;
    var mate = swaps.filter(function (o) { return !o.lit && Math.abs(o.x - s.x) < 0.5; })[0];
    s.wait = !!mate && shown(mate.a);
  });
  // By night an outgoing arch's lamps go out before it sinks (the CSS holds
  // its sink back by the same --gate-dim), so its bay is empty that much
  // later. By day nothing is lit and nothing waits for it.
  var dim = root.dataset.theme === 'onyx' ? SWAP_DIM : 0;
  var lastRise = 0;
  swaps.forEach(function (s) {
    var delay = s.rank * SWAP_STEP;
    if (s.wait) delay += dim + SWAP_OUT + SWAP_GAP;
    s.delay = delay;
    if (s.lit) lastRise = Math.max(lastRise, delay);
    s.a.classList.toggle('arriving', s.lit);
    role(s.a, s.lit, delay);
  });
  // when the last arch of the throw is up, for sayWing()
  stageLands = performance.now() + (swaps.length ? lastRise + SWAP_IN : 0);

  /* Focus rides the throw. When the reader is on an arch that is going out,
     focus stays on it while it sinks (it keeps its visibility while
     focused, atrium.css) and moves to the arch rising into the same bay at
     the moment that arch starts to rise, in the same task that makes the
     old one inert. The handoff used to run on a timer after the whole wing
     had gone inert: focus fell to <body> in between, a screen reader
     announced the page, and the arch it then landed on stood fully
     transparent for another half second (AT-21, KB-13). */
  // A handoff still waiting is finished at once by a re-solve (the arch it
  // would leave focus on is about to go inert), and dropped by a second
  // throw, which brings that arch straight back.
  if (handoffFn) {
    var pending = handoffFn;
    handoffFn = null;
    pending.cancel();
    if (initial) pending();
  }
  var ae = document.activeElement, leaving = null;
  swaps.forEach(function (s) { if (!s.lit && s.a === ae) leaving = s; });
  all.forEach(function (svc) {
    var a = gate(svc);
    if (!a) return;
    var waiting = svc.wing !== wing;
    if (leaving && a === leaving.a) return;   // inert at the handoff
    a.inert = waiting;
    if (waiting) a.setAttribute('aria-hidden', 'true');
    else if (!svc.vacant) a.removeAttribute('aria-hidden');
  });
  if (leaving) {
    var into = swaps.filter(function (s) { return s.lit && Math.abs(s.x - leaving.x) < 0.5; })[0];
    var to = into && !into.vacant ? into.a : nearestLit(leaving.x);
    var still = root.dataset.motion === 'reduced' || document.visibilityState === 'hidden';
    /* The handoff waits for the arch taking focus to start rising: its
       opacity transition's transitionstart, which fires as the fade's delay
       runs out on the fade's own clock. A timer for the same delay ran on
       wall time from the class change, and every frame late opened a gap:
       focus reached the new arch 0.1 to 0.9s before it began to show, while
       the old one still stood at full opacity, and no ring showed anywhere
       (KB-2). gate-arrive's animationstart is no better: a composited fade
       takes its start time a frame or more after a main-thread animation
       started by the same class change (measured 167ms apart at 2560).
       The timer stays as a net, well past any rise, for a fade that never
       starts. */
    var rise = function (e) {
      if (e.target === to && e.propertyName === 'opacity') hand();
    };
    var hand = function () {
      hand.cancel();
      if (handoffFn === hand) handoffFn = null;
      var old = leaving.a;
      if (document.activeElement === old && to) to.focus({ preventScroll: true });
      old.inert = true;
      old.setAttribute('aria-hidden', 'true');
    };
    hand.cancel = function () {
      clearTimeout(handoffT);
      handoffT = 0;
      if (to) to.removeEventListener('transitionstart', rise);
    };
    if (still) hand();
    else {
      handoffFn = hand;
      var toSwap = swaps.filter(function (s) { return s.lit && s.a === to; })[0];
      if (toSwap) {
        to.addEventListener('transitionstart', rise);
        handoffT = setTimeout(hand, toSwap.delay + HANDOFF_NET);
      } else {
        handoffT = setTimeout(hand, leaving.delay + SWAP_OUT - 40);
      }
    }
  }

  // How far the row actually reaches from the axis. The bays are cut against
  // THIS, not against the stage column, which is wider than the row.
  triptychHalf = half + (nSide ? gateW + (nSide - 1) * spacing : 0);
  // The solved row, for the wall: the pier lights stand in the gaps between
  // resting slots, never where an arch happens to be mid-throw. A throw
  // leaves every bay where it was, so it re-lays nothing: rebuilding the
  // wall, the rope and the floor on every throw forced ~50ms of layout in
  // the key handler for a row that had not moved (MO-2).
  var geom = { half: half, gateW: gateW, spacing: spacing, nSide: nSide };
  var same = rowGeom && ['half', 'gateW', 'spacing', 'nSide'].every(function (k) {
    return Math.abs(rowGeom[k] - geom[k]) < 0.01;
  });
  rowGeom = geom;
  if (initial || !same) buildAisles();
  if (initial) placeCrest();
}
var handoffT = 0, handoffFn = null;
var HANDOFF_NET = 1500;   // ms past an arch's beat before focus stops waiting for its rise

/* The aisles, past 2800px, open only where the row can stand at full size
   between two cases of at least AISLE_MIN, and the cases take no more than
   the row leaves them (--aisle-room). At 2800 they used to open whatever
   the engraving size, and the row shrank to fit between them: 305px arches
   at every size, a tenth smaller than at 2799, and at 3440 the engraving
   size no longer moved the arches at all (LY-22). rowW is the row at fit 1.
   Returns whether anything changed, so the stage is measured again. */
var AISLE_MIN = 300;   // the narrowest case (atrium.css, --aisle-w)
var aisleMQ = matchMedia('(min-width: 2800px)');
function setAisles(rowW) {
  var con = $('#concourse');
  if (!con) return false;
  var state = 'shut', room = '';
  if (aisleMQ.matches) {
    var cs = getComputedStyle(con);
    var inner = con.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var each = (inner - rowW) / 2 - (parseFloat(cs.columnGap) || 0);
    if (each >= AISLE_MIN) { state = 'open'; room = Math.floor(each) + 'px'; }
  }
  var was = con.dataset.aisles;
  if (was === state && con.style.getPropertyValue('--aisle-room') === room) return false;
  con.dataset.aisles = state;
  if (room) con.style.setProperty('--aisle-room', room);
  else con.style.removeProperty('--aisle-room');
  if (state === 'open' && was !== 'open') wakeBoards();
  return true;
}

/* The lit, working arch nearest a bay: where focus goes when the arch
   rising into its bay is the RESERVED one. */
function nearestLit(x) {
  var best = null, d = Infinity;
  litGates().forEach(function (g) {
    var dx = Math.abs(slotX(g) - x);
    if (dx < d) { d = dx; best = g; }
  });
  return best;
}
function slotX(g) { return parseFloat(g.style.getPropertyValue('--slot-x')) || 0; }

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
var rowGeom = null;     // the row as layoutStage solved it (room.js reads it)
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
  // The base is a block of the dado's own stone under a gilt nosing, cut
  // from its own part of the slab (the pilaster's hash), not a painted box.
  var base = el('div', 'pil-base');
  base.style.setProperty('--sx', (hash01((k || 0) * 37 + 3) * 100).toFixed(1) + '%');
  base.style.setProperty('--sy', (hash01((k || 0) * 53 + 9) * 100).toFixed(1) + '%');
  base.appendChild(el('div', 'pb-stone'));
  base.appendChild(el('div', 'pb-plinth'));
  d.appendChild(cap); d.appendChild(shaft); d.appendChild(base);
  return d;
}

/* One torchiere: an alabaster bowl on a stepped gilt bracket. At night the
   bowl glows through its own stone and throws a scalloped uplight on the
   damask (the cut edge of a cone on a wall is a hyperbola, which is what
   the wash's mask approximates), with a smaller pool below; by day the lamp
   is out and the bowl is just carved stone catching the street light. */
function sconce(x, s) {
  var d = el('div', 'sconce');
  d.style.left = x + 'px';
  // A narrow bay takes a smaller lamp: the fixture, its bracket and the
  // light it throws all scale by s.
  if (s < 1) d.style.setProperty('--sc', s.toFixed(3));
  d.appendChild(el('div', 'sc-pool'));
  d.appendChild(el('div', 'sc-down'));
  var svg = svgEl('svg', { viewBox: '0 0 46 72', 'aria-hidden': 'true' }, 'sc-body');
  // The bracket is cast brass, turned: every part is drawn as the six tones
  // across a round moulding (the lit lip, the crest, the body, the relief
  // body, the shade and the glaze in the far edge), lit from up and to the
  // left. It was one flat silhouette under a lit alabaster bowl (AR-20).
  // A stepped plate fixes it to the wall; two collars and a turned drop
  // finish the stem.
  turned(svg, 14, 32, 41, 49, 'sc');
  turned(svg, 15.6, 30.4, 42.2, 47.8, 'sc');
  turned(svg, 18, 28, 26, 60, 'sc');
  svg.appendChild(svgEl('path', { d: 'M21 39.5 V50.5 M25 39.5 V50.5' }, 'sc-groove'));
  turned(svg, 15.5, 30.5, 33.5, 38.5, 'sc');
  turned(svg, 15.5, 30.5, 51.5, 56.5, 'sc');
  svg.appendChild(svgEl('path', { d: 'M15.5 33.5 H30.5 V34.2 H15.5 Z M15.5 51.5 H30.5 V52.2 H15.5 Z' }, 'sc-lit'));
  svg.appendChild(svgEl('path', { d: 'M15.5 37.9 H30.5 V38.5 H15.5 Z M15.5 55.9 H30.5 V56.5 H15.5 Z' }, 'sc-shade'));
  turned(svg, 19, 27, 60, 62.6, 'sc');
  turned(svg, 20.4, 25.6, 62.6, 65, 'sc');
  svg.appendChild(svgEl('path', { d: 'M20.8 65 H23 V71 Z' }, 'sc-t1'));
  svg.appendChild(svgEl('path', { d: 'M23 65 H25.2 L23 71 Z' }, 'sc-t4'));
  [['M23 38 C23 32 23 30 23 27', 'sc-stem'],
   ['M4 18 C6 30 14 36 23 36 C32 36 40 30 42 18 Z', 'sc-bowl'],
   ['M9 20 C11 29 16 33 23 33.5 M37 20 C35 29 30 33 23 33.5 M16 19 C17 28 20 32 23 33.5 M30 19 C29 28 26 32 23 33.5', 'sc-flute'],
   ['M3 16.5 H43 V19.5 H3 Z', 'sc-rim'], ['M3 16.5 H43 V17.3 H3 Z', 'sc-lit'],
   ['M5 15.2 C12 13.4 34 13.4 41 15.2 L41 16.5 H5 Z', 'sc-mouth']
  ].forEach(function (p) { svg.appendChild(svgEl('path', { d: p[0] }, p[1])); });
  d.appendChild(svg);
  return d;
}

/* A turned brass part seen side on, from x0 to x1: six vertical strips in
   the leaf's order across a round moulding, lip to glaze, the lit side on
   the left. Plain fills in --lead-*, so the part re-leafs with the wall. */
var TURN_AT = [0, 0.1, 0.28, 0.58, 0.78, 0.92, 1];
function turned(svg, x0, x1, y0, y1, pre) {
  for (var k = 0; k < 6; k++) {
    var a = x0 + (x1 - x0) * TURN_AT[k], b = x0 + (x1 - x0) * TURN_AT[k + 1] + 0.05;
    svg.appendChild(svgEl('rect', { x: a.toFixed(2), y: y0.toFixed(2), width: (b - a).toFixed(2), height: (y1 - y0).toFixed(2) },
      pre + '-t' + k));
  }
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
  // The post's reflection in the wax fades with depth; its stops are set by
  // class (var() does not resolve in a stop's presentation attributes).
  var defs = svgEl('defs');
  defs.innerHTML = '<linearGradient id="st-refl-g" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" class="stref s0"/><stop offset="1" class="stref s1"/></linearGradient>' +
    '<linearGradient id="st-ferrule" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" class="cyl s1"/><stop offset=".35" class="cyl s2"/>' +
    '<stop offset=".7" class="cyl s3"/><stop offset="1" class="cyl s4"/></linearGradient>' +
    // The velvet's crushed pile, laid along the rope as its paint, and the
    // softness of the light on a round plush section.
    '<pattern id="st-pile" patternUnits="userSpaceOnUse" width="' + (56 * u).toFixed(1) + '" height="' + (56 * u).toFixed(1) + '">' +
    '<image href="/static/assets/tex/grain-pile.webp" width="' + (56 * u).toFixed(1) + '" height="' + (56 * u).toFixed(1) + '"/></pattern>' +
    '<filter id="st-soft" x="-5%" y="-100%" width="110%" height="300%"><feGaussianBlur stdDeviation="' + (0.8 * u).toFixed(2) + '"/></filter>';
  svg.appendChild(defs);
  var ropes = svgEl('g', {}, 'st-ropes'), posts = svgEl('g', {}, 'st-posts');
  var pitch = 170 * u, top = H * 0.08, ropeY = H * 0.24, foot = H * 0.9;
  var pw = Math.max(4, 6.5 * u);
  var f1 = function (v) { return v.toFixed(1); };
  [[W * 0.012, W * 0.255], [W * 0.745, W * 0.988]].forEach(function (sp, side) {
    var n = Math.max(1, Math.round((sp[1] - sp[0]) / pitch));
    var xs = [];
    for (var i = 0; i <= n; i++) xs.push(sp[0] + (sp[1] - sp[0]) * i / n);
    for (i = 0; i < n; i++) {
      var x0 = xs[i] + pw * 1.6, x1 = xs[i + 1] - pw * 1.6, sag = H * (0.20 + 0.05 * hash01(i * 13 + side * 7));
      var dRope = 'M' + f1(x0) + ' ' + f1(ropeY) + ' C' +
        f1(x0 + (x1 - x0) * 0.3) + ' ' + f1(ropeY + sag) + ' ' +
        f1(x0 + (x1 - x0) * 0.7) + ' ' + f1(ropeY + sag) + ' ' +
        f1(x1) + ' ' + f1(ropeY);
      // Velvet rope, a round plush section: its shadow on the stone, the
      // body, the crushed pile over it, the underside the light does not
      // reach, and one broad soft sheen above the centre. A row of dashes
      // stood for the nap, and the rope read as a belt with top-stitching
      // (AR-36).
      ropes.appendChild(svgEl('path', { d: dRope, transform: 'translate(1.5 3)' }, 'st-rope-sh'));
      ropes.appendChild(svgEl('path', { d: dRope }, 'st-rope'));
      ropes.appendChild(svgEl('path', { d: dRope, stroke: 'url(#st-pile)' }, 'st-rope-pile'));
      ropes.appendChild(svgEl('path', { d: dRope, transform: 'translate(0 ' + f1(1.3 * u) + ')', filter: 'url(#st-soft)' }, 'st-rope-dk'));
      ropes.appendChild(svgEl('path', { d: dRope, transform: 'translate(0 ' + f1(-0.8 * u) + ')', filter: 'url(#st-soft)' }, 'st-rope-lt'));
      // Brass snap ends: a ferrule crimped on each end of the rope, laid
      // along the rope's own line where it leaves the post, and its hook.
      var fl = 3.4 * u, ft = 6 * u, ang = Math.atan2(sag * 0.75, (x1 - x0) * 0.3) * 180 / Math.PI;
      [[x0, ang, -1], [x1, 180 - ang, 1]].forEach(function (e) {
        var g = svgEl('g', { transform: 'translate(' + f1(e[0]) + ' ' + f1(ropeY) + ') rotate(' + e[1].toFixed(1) + ')' });
        g.appendChild(svgEl('rect', { x: '0', y: f1(-ft / 2), width: f1(fl), height: f1(ft), rx: f1(0.8 * u), fill: 'url(#st-ferrule)' }, 'st-ferrule'));
        g.appendChild(svgEl('rect', { x: f1(fl * 0.55), y: f1(-ft / 2), width: f1(0.7 * u), height: f1(ft) }, 'st-crimp'));
        ropes.appendChild(g);
        // the snap hook's ring, bridging the ferrule and the post's socket
        posts.appendChild(svgEl('circle', { cx: f1(e[0] + e[2] * 0.4 * pw), cy: f1(ropeY), r: f1(0.42 * pw) }, 'st-hook'));
      });
    }
    xs.forEach(function (x) {
      var bw = pw * 3.2, g = svgEl('g', {}, 'st-post');
      g.appendChild(svgEl('ellipse', { cx: f1(x + 3), cy: f1(foot + 2), rx: f1(bw * 1.4), ry: f1(bw * 0.34) }, 'st-cast'));
      // the base in the wax: its dome flipped under the foot, fading
      g.appendChild(svgEl('path', { d: 'M' + f1(x - bw * 0.86) + ' ' + f1(foot + bw * 0.04) +
        ' A' + f1(bw * 0.86) + ' ' + f1(bw * 0.5) + ' 0 0 0 ' + f1(x + bw * 0.86) + ' ' + f1(foot + bw * 0.04) + ' Z',
        fill: 'url(#st-refl-g)' }, 'st-refl'));
      // the weighted base: a broad foot and a low turned dome over it
      g.appendChild(svgEl('ellipse', { cx: f1(x), cy: f1(foot), rx: f1(bw), ry: f1(bw * 0.28) }, 'st-base'));
      g.appendChild(svgEl('path', { d: 'M' + f1(x - bw * 0.86) + ' ' + f1(foot - bw * 0.04) +
        ' A' + f1(bw * 0.86) + ' ' + f1(bw * 0.5) + ' 0 0 1 ' + f1(x + bw * 0.86) + ' ' + f1(foot - bw * 0.04) + ' Z' }, 'st-dome'));
      g.appendChild(svgEl('path', { d: 'M' + f1(x - bw * 0.62) + ' ' + f1(foot - bw * 0.3) +
        ' A' + f1(bw * 0.62) + ' ' + f1(bw * 0.36) + ' 0 0 1 ' + f1(x - bw * 0.05) + ' ' + f1(foot - bw * 0.52) }, 'st-dome-lt'));
      g.appendChild(svgEl('ellipse', { cx: f1(x), cy: f1(foot - bw * 0.52), rx: f1(pw * 0.95), ry: f1(pw * 0.32) }, 'st-collar'));
      g.appendChild(svgEl('rect', { x: f1(x - pw / 2), y: f1(top + pw * 1.5), width: f1(pw), height: f1(foot - bw * 0.5 - top - pw * 1.5) }, 'st-shaft'));
      g.appendChild(svgEl('rect', { x: f1(x - pw / 2 + pw * 0.14), y: f1(top + pw * 1.5), width: f1(Math.max(0.6, pw * 0.1)), height: f1(foot - bw * 0.5 - top - pw * 1.5) }, 'st-arris'));
      // the rope socket
      g.appendChild(svgEl('rect', { x: f1(x - pw * 0.85), y: f1(ropeY - pw * 0.6), width: f1(pw * 1.7), height: f1(pw * 1.2), rx: f1(pw * 0.3) }, 'st-shaft'));
      // the turned finial: a collar, a neck, the ball and a knop on it
      g.appendChild(svgEl('ellipse', { cx: f1(x), cy: f1(top + pw * 1.5), rx: f1(pw * 0.95), ry: f1(pw * 0.34) }, 'st-collar'));
      g.appendChild(svgEl('rect', { x: f1(x - pw * 0.34), y: f1(top + pw * 0.9), width: f1(pw * 0.68), height: f1(pw * 0.6) }, 'st-shaft'));
      g.appendChild(svgEl('circle', { cx: f1(x), cy: f1(top + pw * 0.2), r: f1(pw * 0.95) }, 'st-ball'));
      g.appendChild(svgEl('circle', { cx: f1(x), cy: f1(top - pw * 1.0), r: f1(pw * 0.34) }, 'st-ball'));
      g.appendChild(svgEl('circle', { cx: f1(x - pw * 0.33), cy: f1(top - pw * 0.12), r: f1(pw * 0.28) }, 'st-spec'));
      posts.appendChild(g);
    });
  });
  svg.appendChild(ropes);
  svg.appendChild(posts);
  rail.appendChild(svg);
}

/* The smallest a torchiere is cast, as a share of its full 44u: below it
   the bowl no longer reads as alabaster, and the bay stands unlit. */
var SCONCE_MIN = 0.45;

/* Lay a rhythm of bays across one clear stretch of wall, a pilaster at each
   end. Returns how many bays it used. */
function fillSpan(node, x0, x1, firstBay, edge) {
  var u = uiScale();
  var w = x1 - x0;
  if (w < 40 * u) {
    // Too narrow for a bay, but the board beside it still wants a pilaster
    // flush against its edge, or the case hangs on bare damask.
    if (edge != null) node.appendChild(pilaster(edge, firstBay * 7));
    return 0;
  }
  var n = Math.max(1, Math.round(w / (300 * u)));
  var bay = w / n;
  for (var i = 0; i <= n; i++) node.appendChild(pilaster(x0 + i * bay, firstBay * 7 + i));
  // What a bay holds has to stand clear inside it, between the shafts of
  // the pilasters at its two ends (28u of shaft, half at each end). A
  // torchiere is 44u wide; the bay plate is as wide as its lettering. The
  // old test (a 52u span) hung both across the pilasters in the sliver bays
  // at the screen's edges, and ran a plate off the screen at 3440 (LY-15,
  // VD-6). Leaving those bays bare took the lamps and the numbers off the
  // wall at 1280 to 1600 and at 3440, where the edge bay is the only one,
  // so a narrow bay takes a smaller lamp, with 2u of wall either side of
  // it, and a plate cut with the numeral alone when the full legend will
  // not fit. Only a bay too narrow even for those stands bare, and the
  // numbering runs on over the bays that carry a plate.
  var clear = bay - 28 * u;
  var lamp = Math.min(1, (clear - 4 * u) / (44 * u));
  var numbered = 0;
  for (var j = 0; j < n; j++) {
    var mid = x0 + (j + 0.5) * bay;
    if (lamp >= SCONCE_MIN) node.appendChild(sconce(mid, lamp));
    var num = roman(firstBay + numbered);
    var plate = el('div', 'bay-plate display', t('bayLabel', { n: num }));
    plate.style.left = mid + 'px';
    node.appendChild(plate);
    if (plate.offsetWidth + 8 * u > clear) {
      plate.textContent = num;
      plate.classList.add('bay-num');
    }
    if (plate.offsetWidth + 4 * u > clear) node.removeChild(plate);
    else numbered++;
  }
  return numbered;
}

/* Fill one aisle wall, skipping the stretch a board is hung over. Spacing
   bays evenly across the whole span put every sconce and every bay number
   behind the board hung in the middle of it — articulation built and then
   covered up. The bays go in the daylight either side instead, which also
   lands a pilaster hard against each edge of the board, so the board reads
   as set into the wall rather than stuck onto it. */
function fillWall(node, width, hole, firstBay, inner) {
  // A throw of the lever re-solves the stage and lands here with the same
  // wall. Rebuilt, every pilaster was new and took the Bureau's leaf in one
  // frame, so its own fill transition never ran (MO-5); the same wall is
  // left standing. The bay plates are lettered and measured, so the
  // language and the face they are set in count.
  var key = [width, hole ? hole.join(',') : '', firstBay, inner, uiScale(), lang,
             document.fonts ? document.fonts.status : ''].join('|');
  if (node.dataset.fill === key) return +node.dataset.used;
  node.textContent = '';
  node.style.setProperty('--aw', Math.max(0, width) + 'px');
  node.dataset.fill = key;
  node.dataset.used = '0';
  if (width <= 0) return 0;
  var spans = [];
  if (hole && hole[1] > 0 && hole[0] < width) {
    // The stretch between a board and the arches is a pier light's
    // (room.js), not a bay: only the outer side of a board is laid in bays.
    if (hole[0] > 0 && inner !== 'left') spans.push([0, Math.min(hole[0], width), hole[0]]);
    if (hole[1] < width && inner !== 'right') spans.push([Math.max(0, hole[1]), width, hole[1]]);
  } else {
    spans.push([0, width, null]);
  }
  var used = 0;
  spans.forEach(function (sp) {
    used += fillSpan(node, sp[0], sp[1], firstBay + used, sp[2]);
  });
  node.dataset.used = String(used);
  return used;
}

/* Where a board sits, in its own wall's coordinate space, widened by half a
   pilaster so the pilaster set against each edge stands clear of the case
   instead of 17px behind it (LY-11). `inner` names the side that faces the
   arches: that stretch belongs to a pier light. */
function boardHole(board, originX) {
  if (!board || getComputedStyle(board).display === 'none') return null;
  var r = board.getBoundingClientRect();
  if (!r.width) return null;
  var half = 17 * uiScale();
  return [r.left - originX - 9 - half, r.right - originX + 9 + half];
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
  // The wall's dado and skirting are sized from the fitted arch module, so
  // the concourse needs the row's --fit as well as the stage (LY-14).
  var con = $('#concourse');
  if (con) con.style.setProperty('--fit', stage.style.getPropertyValue('--fit') || '1');
  var axis = sr.left + sr.width / 2;
  var reach = (triptychHalf || sr.width / 2) + 28;
  var lw = Math.max(0, (axis - reach) - bw.left);
  var rw = Math.max(0, bw.right - (axis + reach));
  var used = fillWall(wl, lw, boardHole($('#works'), bw.left), 1, 'right');
  fillWall(wr, rw, boardHole($('#almanac'), axis + reach), used + 1, 'left');
  // The room's own dressing: book-matched dado, pier lights between the
  // arches, each bay's own damask. Laid from the solved row.
  if (window.Room && rowGeom) {
    window.Room.layoutWall({ axis: axis - bw.left, reach: reach, row: rowGeom,
      boards: ['#works', '#almanac'].map(function (sel) {
        var b = $(sel);
        if (!b || getComputedStyle(b).display === 'none') return null;
        var r = b.getBoundingClientRect();
        return r.width ? [r.left - bw.left, r.right - bw.left] : null;
      }) });
  }
  sizeFloor();
  buildStanchions();
  // Repainted with everything that re-lays the wall: a resize, a wing
  // throw, a language or engraving-size change.
  paintFloorMirror();
  if (window.Room) window.Room.layoutFloor();
}

/* The hall stands on one screen. The floor's reservation (--floor-min) was a
   share of the viewport height, with a short-screen step at 860px, but the
   masthead and the marquee above the stage grow with --ui and no height
   query can see them: at SIGNBOARD on a 3440x900 screen they stood 190px
   tall, the stage plus the reservation overran the screen by 11px, and
   every height from 861 to 926 scrolled (LY-1). So the budget is solved
   here, from the stage's real top.
   The floor keeps what the screen leaves under the stage, and never less
   than the board needs at its short-screen scale (DESK_K_MIN). Below that
   the old machine shrank to half size on the same screens and its SALON
   and BUREAU plates came out at 6.6px (LY-8). The house-lights board is
   taller than that machine (its crest and pedestal), so it asks for a
   little less than the 0.78 of the 860px query: at 0.78 it took a fifth
   of the arch off a 3440x900 screen.
   When the floor cannot have that much, the arch module gives up the
   difference through --gate-vcap, which caps --gate-w: the order DESIGN
   spends the height in is masthead, marquee, arches, floor, and the lever
   is the one thing on the floor that has to work.
   Every term is a layout value that the cap and the floor do not move
   (the stage's top is the masthead's and the marquee's, the headroom is
   the viewport's), so writing them cannot feed back into the solve. */
var FLOOR_HARD = 62, DESK_K_MIN = 0.66, FLOOR_SHARE = 0.31;
function budgetHall() {
  var hall = $('#hall'), con = $('#concourse'), stage = $('#stage'), desk = $('#signal-desk');
  if (!hall || !con || !stage || !stage.offsetHeight) return;
  var H = window.innerHeight;
  var top = 0;
  for (var n = stage; n; n = n.offsetParent) top += n.offsetTop;
  var foot = parseFloat(getComputedStyle(hall).paddingBottom) || 0;
  var need = FLOOR_HARD, art = deskArt();
  if (desk && art !== null) {
    var k = H < 760 ? 0.62 : DESK_K_MIN;   // the 760px query's own scale
    var deskFoot = parseFloat(getComputedStyle(desk).bottom) || 0;
    need = Math.max(need, Math.ceil(deskFoot + DESK_GAP + (deskBox() - art) * k - foot));
  }
  // The wall's headroom over the arches (--stage-h in atrium.css): 80px,
  // rising to 100 above 1080px of viewport. On a tall screen the arch is
  // held by the width, and all the height the wall left went to the floor,
  // 42-43% of a 4:3 or 16:10 screen against the 27-32% a wide one gets
  // (LY-9), so there the wall takes the surplus down to FLOOR_SHARE, but
  // never stands taller over the arches than an arch: on a near-square
  // screen it would have been a bare field of damask half the hall high. It
  // is solved from the arch with no vertical cap (--gate-free), and it never
  // leaves the floor less than its need, so it can never bring the cap
  // below that arch: nothing here feeds back into the solve.
  var hrWas = parseFloat(con.style.getPropertyValue('--headroom'));
  if (!isFinite(hrWas)) hrWas = Math.max(80, Math.min(100, H - 1080));   // the sheet's own term
  var free = parseFloat(getComputedStyle(root).getPropertyValue('--gate-free')) || 0;
  var headroom = Math.max(80, Math.min(100, H - 1080), Math.min(Math.floor(free * 1.9),
    Math.floor(H - top - free * 1.9 - Math.max(FLOOR_SHARE * H, foot + need))));
  if (headroom !== hrWas) con.style.setProperty('--headroom', headroom + 'px');
  // The stage is the arch module plus that headroom, so this is the largest
  // arch that leaves the floor its need.
  var cap = ((H - top - foot - need - headroom) / 1.9).toFixed(1) + 'px';
  var was = root.style.getPropertyValue('--gate-vcap');
  if (was !== cap) {
    root.style.setProperty('--gate-vcap', cap);
    // A cap that binds, or bound, moves the arch module under a row solved
    // for the old one (the engraving size lands a frame before this runs),
    // so the stage is re-solved against it.
    var g = solved ? solved.g0 : Infinity;
    if (parseFloat(cap) < g + 0.5 || parseFloat(was) < g + 0.5) layoutStage(true);
  }
  var room = Math.floor(H - top - (stage.offsetHeight - hrWas + headroom) - foot);
  var fit = Math.max(need, room) + 'px';
  if (con.style.getPropertyValue('--floor-fit') !== fit) con.style.setProperty('--floor-fit', fit);
}
if (window.ResizeObserver) {
  // The masthead wraps in Chinese and when its fonts land, and it and the
  // marquee grow with the engraving size: each moves the stage's top.
  // Observers run after layout and before paint, so a scrollbar never gets
  // a frame. (The stage is not watched: the cap written here resizes it.)
  var budgetRO = new ResizeObserver(function () { budgetHall(); });
  ['#masthead', '#ticker'].forEach(function (s) { var n = $(s); if (n) budgetRO.observe(n); });
}
window.addEventListener('resize', budgetHall);

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
  // Quarried, not printed: a marble figure over every cut stone, and the
  // wax's sheen over the whole inlay. The roundels borrow the same figure.
  // These are HTML layers with CSS backgrounds, not SVG paint servers: the
  // floor's SVG is re-laid every frame while the clock's hands turn, and a
  // pattern or gradient fill is rebuilt on every lay, which re-rasterised
  // the whole medallion every frame (a third of the frame rate at 3440).
  host.appendChild(el('div', 'fl-vein'));
  host.appendChild(el('div', 'fl-sheen'));

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
    var vein = el('div', 'fl-vein');
    vein.style.setProperty('--vr', (i ? 97 : 23) + 'deg');
    d.appendChild(vein);
    d.appendChild(el('div', 'fl-sheen'));
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

/* One instrument per reading. The drawing lives in cabinetry.js (bezel,
   enamel, scale, red arc, needle and crystal); the needle still turns on the
   spring settle the CSS gives .wk-rotor, from the --gauge set below. */
function buildDial(key) {
  return window.Cabinet.dial(key);
}

function renderWorks() {
  var box = $('#wk-dials'), tape = $('#wk-tape');
  if (!box || !tape || box.firstChild) return;
  WK_DIALS.forEach(function (d) {
    var cell = el('div', 'wk-cell');
    cell.dataset.dial = d.key;
    // A tab stop, so what the tooltip adds (the core count, the card's load
    // and its name) is in reach of a keyboard or a finger as well as a
    // mouse: a focused dial lays its whole line over the tape (.cs-tip).
    // It was hover-only on a case with no tab stop in it.
    cell.tabIndex = 0;
    cell.appendChild(buildDial(d.key));
    // The engraved name is for the eye; the cell's spoken line (syncWorks)
    // starts with the same name, and a reader heard it twice.
    var name = el('span', 'wk-name display', t(d.name));
    name.setAttribute('aria-hidden', 'true');
    cell.appendChild(name);
    cell.appendChild(el('span', 'wk-read num', '—'));
    // Said already, by the cell's own spoken line (.wk-sr).
    var tip = el('span', 'cs-tip zh-sentence');
    tip.setAttribute('aria-hidden', 'true');
    cell.appendChild(tip);
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
  // A dial's drawn size moves without its register moving (the captions
  // settle once the faces load), and its figures are sized from it.
  if (casesRO) casesRO.observe($('.wk-dial', box));
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
function runSaid(s) {
  if (s === null || s === undefined) return '';
  var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  var m = Math.floor((s % 3600) / 60);
  return d ? t('runSrDays', { d: d, h: h }) :
         h ? t('almSrHours', { h: h, m: m }) : t('runSrMinutes', { m: m });
}
function tera(gb) {
  return gb >= 1024 ? (gb / 1024).toFixed(1) + ' TB' : Math.round(gb) + ' GB';
}

/* "16 cores, 32 threads": the hub sends the two counts apart, because the
   one count psutil gives by default is the logical one, and the dial called
   a 16-core, 32-thread part "32 cores". */
function cpuCount(d) {
  var c = d.cores, n = d.threads;
  var has = function (v) { return v !== null && v !== undefined; };
  if (has(c) && has(n) && n !== c) return t('wkCpuCount', { c: c, t: n });
  if (has(c)) return t('wkCores', { n: c });
  return has(n) ? t('wkThreads', { n: n }) : '';
}

/* Needle position, the figure in the dial's window (text), what is said
   after the dial's name (said) and what its tooltip adds (title). Every
   reading is optional: a machine with no NVIDIA card is a normal machine.
   Each figure is said once: the spoken line used to give the window's
   "58.3 / 126 GB" and then "58.3 of 125.6 GB" after it. */
function dialRead(key, w) {
  var d = w && w[key];
  if (!d || d.pct === null || d.pct === undefined) return null;
  if (key === 'cpu') {
    var count = cpuCount(d);
    return { pct: d.pct, text: Math.round(d.pct) + '%',
             said: Math.round(d.pct) + '%' + (count ? t('list') + count : ''),
             title: count };
  }
  if (key === 'mem' || key === 'gpu') {
    // Rounded once, for the window and the spoken line alike: the window
    // printed "5.7 / 32 GB" while the tooltip and the reader said "5.7 of
    // 31.8 GB", two figures for one instrument.
    var used = d.used_gb.toFixed(1), total = Math.round(d.total_gb);
    var of = t('wkOf', { a: used, b: total });
    // The VRAM needle is the card's memory. How hard the card is working is
    // a different figure, and it is said beside it rather than dropped.
    var more = key === 'gpu'
      ? (d.util_pct !== null && d.util_pct !== undefined
          ? t('list') + t('wkLoad', { n: Math.round(d.util_pct) }) : '') +
        (d.name ? t('list') + d.name : '')
      : '';
    return { pct: d.pct,
             text: used + ' / ' + total + ' GB',
             said: of + more, title: of + more };
  }
  // The same tenths the window prints; the spoken line used to read the
  // hub's raw floats ("0.43 up" under a window of "0.4").
  var down = d.down_mbs.toFixed(1), up = d.up_mbs.toFixed(1);
  var rate = t('wkDown', { d: down, u: up });
  return { pct: d.pct,
           // The unit is engraved on the face (MB/s), which keeps the window
           // to one line in a 300px aisle. No-break spaces hold each figure
           // to its arrow if a narrow window still takes two.
           text: down + ' ↓  ' + up + ' ↑',
           said: rate, title: rate };
}

function syncWorks() {
  var box = $('#wk-dials');
  if (!box || !box.firstChild) return;
  WK_DIALS.forEach(function (d) {
    var cell = box.querySelector('[data-dial="' + d.key + '"]');
    if (!cell) return;
    var r = dialRead(d.key, works);
    // A needle with no reading rests at zero rather than lying at a number.
    // The angle goes on the needle's two sheets only: a custom property is
    // inherited, and written on the cell it restyled the whole instrument,
    // some 290 nodes, on every reading.
    var gauge = (-120 + (r ? r.pct : 0) * 2.4).toFixed(1);
    cell.querySelectorAll('.wk-rotor').forEach(function (n) {
      n.style.setProperty('--gauge', gauge);
    });
    cell.dataset.hot = r && r.pct >= 85 ? 'yes' : 'no';
    cell.dataset.blank = r ? 'no' : 'yes';
    var read = $('.wk-read', cell);
    read.textContent = r ? r.text : t('wkNoReading');
    read.setAttribute('aria-hidden', 'true');
    cell.title = t(d.name) + (r && r.title ? t('join') + r.title : '');
    $('.cs-tip', cell).textContent = cell.title;
    // The caption's arrows and the red sector say nothing aloud; this does.
    var sr = $('.wk-sr', cell);
    if (!sr) { sr = el('span', 'sr-only wk-sr'); cell.appendChild(sr); }
    sr.textContent = t(d.name) + t('join') +
      (r ? r.said + (r.pct >= 85 ? t('list') + t('wkHot') : '') : t('wkNoReading'));
  });
  var tape = $('#wk-tape');
  if (!tape) return;
  var hours = tape.querySelector('[data-strip="hours"] .wk-sval');
  // The machine's uptime, as the board promises; the hub's own uptime reset
  // to minutes on every restart. It stands in only when the host's is null.
  var up = works && (works.host_uptime_s !== null && works.host_uptime_s !== undefined
    ? works.host_uptime_s : works.hub_uptime_s);
  if (hours) {
    hours.textContent = runFor(up);
    // "1d 08h" is engraving; the reading is said in words beside it.
    var saidRun = runSaid(up);
    if (saidRun) hours.setAttribute('aria-hidden', 'true');
    else hours.removeAttribute('aria-hidden');
    var sr = hours.parentNode.querySelector('.wk-said');
    if (!sr) { sr = el('span', 'sr-only wk-said'); hours.parentNode.appendChild(sr); }
    sr.textContent = saidRun;
  }
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

/* On screen only: the board is display:none below 2800px and when the
   cases are folded, and a hidden panel must not keep the host sampling. */
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
/* The stale mark is a timer of its own, armed by every reading that lands.
   Checked only on the beat, it waited behind a request that was still out:
   a hanging hub held the last figure up for 16 s (the ticks at 8 and 12 s
   were skipped as busy) and plain failures for 12 s (the next beat). */
var worksStaleT = null;

function worksLapse() {
  worksStaleT = null;
  if (!works) return;
  works = null;
  syncWorks();
}

function pollWorks() {
  if (!worksVisible() || worksBusy) return Promise.resolve();
  // A reading that sat on the dials past the stale mark while the board could
  // not poll (a background tab, a narrow window, a folded case) is not live.
  // It comes down before the next one is asked for; it used to stand as the
  // current figure until the next beat landed. A hidden tab's timers are
  // throttled, so the lapse may not have run yet.
  if (works && Date.now() - worksOkAt > WORKS_STALE_MS) worksLapse();
  worksBusy = true;
  return fetchJson('/api/works').then(function (w) {
    // An older reading never replaces a newer one.
    if (works && w && w.generated < works.generated) return;
    works = w;
    worksOkAt = Date.now();
    clearTimeout(worksStaleT);
    worksStaleT = setTimeout(worksLapse, WORKS_STALE_MS);
    syncWorks();
  }).catch(function () {
    // A restarting hub is not a reading, and neither is the last one kept:
    // worksLapse() takes it down at the stale mark.
  }).then(function () { worksBusy = false; });
}

/* Instruments read live or they are decoration, so the cadence is the
   dial's rather than the hall's 45s poll. */
function startWorks() {
  clearInterval(worksTimer);
  worksTimer = setInterval(pollWorks, 4000);
  return pollWorks();
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
  var xt = r * (1 - 2 * phase.lit);     // where the terminator crosses the equator
  var d = 'M 0 ' + (-r) + ' A ' + r + ' ' + r + ' 0 0 1 0 ' + r + ' '
        + 'A ' + Math.abs(xt).toFixed(3) + ' ' + r + ' 0 0 ' + (xt > 0 ? 0 : 1)
        + ' 0 ' + (-r) + ' Z';
  // The sphere, its crystal and its bezel are cabinetry's; the shape of the
  // lit face is the almanac's arithmetic.
  return window.Cabinet.moon(d, phase.waxing, r);
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

/* The register the plate is inscribed in: its content box, which is what the
   svg's 100% fills. */
function skyRoom(host) {
  if (!host || !host.clientWidth) return { w: 300, h: 150 };
  var cs = getComputedStyle(host);
  return { w: host.clientWidth,
           h: host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) };
}

/* The plate's lettering in screen pixels: 10px at the least, and more with
   the engraving size, never less. It used to be cut at fixed plate units,
   which on a short case drew RISE at 5px and made SIGNBOARD (whose taller
   head and tape shrink the plate) print it smaller than FINE. */
function skyLetterPx() {
  var ui = uiScale();
  // 10.1: a tenth over the floor, so a register that settles a fraction of a
  // pixel shorter after the plate is cut does not land the lettering under it.
  return { lab: Math.max(10.1, 7 * ui), time: Math.max(10.1, 8.5 * ui) };
}

function skyBox(host) {
  var room = skyRoom(host);
  var w = room.w || 300, h = room.h > 0 ? room.h : 150;
  var H = Math.max(150, Math.min(300, Math.round(300 * h / Math.max(w, 1))));
  // A register wider than the plate's own 2:1 widens the plate to match
  // rather than letterboxing a 300-unit plate in the middle of it, so a short
  // case can keep its ellipse and still have room for the lettering beside it.
  var W = Math.max(300, Math.round(H * w / Math.max(h, 1)));
  // Pixels per plate unit as drawn (the svg meets its box), so the lettering
  // can be cut in units at the size it has to read at.
  var ppu = Math.min(w / W, h / H) || 1;
  var px = skyLetterPx();
  var lab = px.lab / ppu, time = px.time / ppu;
  // The widest word at a crossing, RISE or 07:09 (tracking included), and
  // room for it beside the bezel: the ellipse gives up width before the
  // lettering gives up size.
  var word = Math.max(2.3 * lab + 6, 2.4 * time + 3);
  var cx = W / 2;
  var rx = Math.max(64, Math.min(104, cx - 4 - word - 6.5 - 4));
  // The lettering stands just outside the bezel, as it did on the 300-unit
  // plate, not out at the edges of a widened one.
  var xL = Math.max(4, cx - rx - 6.5 - 4 - word);
  return {
    // The ellipse stops well short of the plate edge on purpose: the two
    // crossings are where the only lettering on the instrument lives, and an
    // ellipse drawn to the full width leaves it nowhere to stand but on the
    // curve itself.
    W: W, H: H, cx: cx, cy: H / 2, rx: rx,
    // Flatter than it is wide, always: a diurnal circle seen edge-on.
    ry: Math.max(38, Math.min(66, H / 2 - 26)),
    lab: lab, time: time, xL: xL, xR: W - xL, ppu: ppu,
    // What the plate was cut for; a register of another size re-cuts it.
    key: Math.round(w) + 'x' + Math.round(h) + '@' + px.lab.toFixed(2)
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

function skyText(x, y, cls, text, anchor, size) {
  var n = svgEl('text', {
    x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle'
  }, cls);
  // In plate units, so it is set inline: the sheet's sizes are the fallback.
  if (size) n.style.fontSize = size.toFixed(2) + 'px';
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
  // For a stroke the sheet sets in screen pixels (the zh labels' weight).
  svg.style.setProperty('--ppu', g.ppu.toFixed(3));
  // Nothing has arrived yet: a bare horizon still reads as an instrument,
  // where a blank panel reads as a case with its glass knocked out.
  var plateSeed = window.Cabinet.fnv1a('sky');
  if (!where) {
    window.Cabinet.skyPlate(svg, g, g.cy, plateSeed);
    svg.appendChild(svgEl('line', {
      x1: g.xL + 2, y1: g.cy, x2: g.xR - 2, y2: g.cy, 'stroke-width': 1
    }, 'a-horizon'));
    return { svg: svg, sun: null };
  }

  var at = new Date();
  var tzh = offsetOf(where.timezone, at);
  var here = localAt(where.timezone, at);
  var sun = sunTimes(where.lat, where.lon, here, tzh);

  if (sun.polar) {
    window.Cabinet.skyPlate(svg, g, g.cy, plateSeed);
    svg.appendChild(svgEl('line', {
      x1: g.xL + 2, y1: g.cy, x2: g.xR - 2, y2: g.cy, 'stroke-width': 1
    }, 'a-horizon'));
    svg.appendChild(skyText(g.cx, g.cy - 12, 'a-polar',
      t(sun.polar === 'day' ? 'almPolarDay' : 'almPolarNight'), 'middle', g.time));
    return { svg: svg, sun: sun, here: here, at: at, tz: tzh };
  }

  var shown = shownTimes(sun, weather);
  var noon = (shown.rise + shown.set) / 2;
  // Half the day arc. 180° × daylight/24 — 90° at an equinox, and the whole
  // asymmetry of the plate falls out of this one number.
  var half = 180 * shown.hours / 24;
  var horizonY = g.cy - g.ry * Math.cos(half * RAD);
  // The enamel, the bezel and the slot go down first; the engraving and the
  // bead are laid over them.
  window.Cabinet.skyPlate(svg, g, horizonY, plateSeed);

  svg.appendChild(svgEl('path', {
    d: ringArc(g, half, 360 - half), fill: 'none', 'stroke-width': 1,
    'stroke-dasharray': '1 4'
  }, 'a-night'));
  svg.appendChild(svgEl('path', {
    d: ringArc(g, -half, half), fill: 'none', 'stroke-width': 1
  }, 'a-track'));
  svg.appendChild(svgEl('line', {
    x1: g.xL + 2, y1: horizonY.toFixed(2), x2: g.xR - 2, y2: horizonY.toFixed(2),
    'stroke-width': 1
  }, 'a-horizon'));

  // Where the sun is now, on its own clock rather than on the drawing's.
  var phi = wrapDeg(sunAngle(here.hours, noon));
  var up = Math.abs(phi) <= half;

  // Inked as far as the day has got, which after sunset is all of it: the
  // plate reports how much daylight has been SPENT, not merely where the sun
  // is standing. Below the horizon the wrapped angle cannot say which side
  // of the day this is, and it sent every hour from midnight to sunrise to
  // "all of it" too. The place's clock can: before noon the day has not
  // begun, after it the day is done.
  var inkTo = up ? phi : here.hours < noon ? -half : half;
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

  // The crossings: label engraved above the horizon, time below it, both
  // outside the bezel where the curve cannot reach them. The gaps to the
  // horizon grow with the lettering (7 and 17 units at the old 8 and 12).
  [[-half, g.xL, 'start', 'almRise', shown.rise],
   [half, g.xR, 'end', 'almSet', shown.set]]
  .forEach(function (foot) {
    var p = spot(g, foot[0]);
    svg.appendChild(svgEl('line', {
      x1: p.x.toFixed(2), y1: (p.y - 4).toFixed(2),
      x2: p.x.toFixed(2), y2: (p.y + 5).toFixed(2), 'stroke-width': 1.5
    }, 'a-foot'));
    svg.appendChild(skyText(foot[1], horizonY - 3 - 0.5 * g.lab, 'a-lab',
      t(foot[3]), foot[2], g.lab));
    svg.appendChild(skyText(foot[1], horizonY + 8.6 + 0.7 * g.time, 'a-time',
      hhmm(foot[4]), foot[2], g.time));
  });

  var s = spot(g, phi);
  // A domed gilt bead riding the slot, above the horizon or below it.
  window.Cabinet.sunBead(svg, s.x, s.y, up);
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

/* The high, the low and the chance of rain are the day's and stand for the
   day. The temperature, the condition and the wind are one moment's, and a
   hub that stopped answering kept that moment up as "now" for hours, beside
   dials that had long since dropped to NO READING. The moment lapses at half
   an hour: the hub's 15 min cache plus the 10 min poll (25 min) is the
   oldest a healthy board ever shows. Its age is the hub's age_s when it was
   read plus the time since; the minute sky tick redraws the reading. */
var ALM_NOW_MS = 1800000;

function almFresh(w) {
  if (!w || !almReadAt) return false;
  var held = almanac && typeof almanac.age_s === 'number' ? almanac.age_s * 1000 : 0;
  return Date.now() - almReadAt + held <= ALM_NOW_MS;
}

function almVitals(w, fresh) {
  var rows = [
    ['almHigh', w ? almDeg(w.high_c) : '—'],
    ['almLow', w ? almDeg(w.low_c) : '—'],
    ['almPrecip', w && w.precip_prob !== null && w.precip_prob !== undefined
                  ? w.precip_prob + '%' : '—'],
    ['almWind', fresh && w.wind_kmh !== null && w.wind_kmh !== undefined
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
  var fresh = almFresh(w);
  // "now": the day's figures stand, the moment's have lapsed.
  box.dataset.blank = !w ? 'yes' : fresh ? 'no' : 'now';
  var now = el('div', 'al-now');
  now.appendChild(el('span', 'al-temp num', fresh ? almDeg(w.now_c) : '—'));
  now.appendChild(el('span', 'al-cond zh-sentence',
    fresh ? (lang === 'zh' ? w.label_zh : w.label) : t('wkNoReading')));
  box.appendChild(now);
  box.appendChild(almVitals(w, fresh));
  var fahr = almFahrenheit(w, fresh);
  box.title = fahr;
  // The same line in reach of a keyboard or a finger (a focused reading
  // lays it under itself, .cs-tip) and said aloud. It was a mouse tooltip
  // only, and the °F figures were in no text on the page at all.
  if (fahr) {
    box.tabIndex = 0;
    box.appendChild(el('span', 'sr-only', fahr));
    var tip = el('span', 'cs-tip zh-sentence', fahr);
    tip.setAttribute('aria-hidden', 'true');
    box.appendChild(tip);
  } else {
    box.removeAttribute('tabindex');
  }
}

/* Fahrenheit lives in the tooltip: this reader is standing in a country
   that speaks it, in a hall that does not. It gives the big figure as well,
   labelled, which "66 / 50 °F" over a reading of "10°" did not; once the
   moment has lapsed only the day's pair is given. */
function almFahrenheit(w, fresh) {
  var has = function (v) { return v !== null && v !== undefined; };
  if (!w || !has(w.high_f) || !has(w.low_f)) return '';
  var f = { high: Math.round(w.high_f), low: Math.round(w.low_f) };
  if (fresh && has(w.now_f)) {
    f.now = Math.round(w.now_f);
    return t('almFahrenheit', f);
  }
  return t('almFahrenheitDay', f);
}

/* `spoken` stands in for the value; with `whole` it stands in for the
   label as well, for a strip whose label is only half a sentence. */
function almStrip(label, value, spoken, whole) {
  var row = el('div', 'al-strip');
  var l = el('span', 'al-slabel display', label);
  row.appendChild(l);
  var v = el('span', 'al-sval num', value);
  row.appendChild(v);
  // "12:10" and "2'39"" are engraving, not speech.
  if (spoken) {
    v.setAttribute('aria-hidden', 'true');
    if (whole) l.setAttribute('aria-hidden', 'true');
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
  // No-break spaces hold the figure to the name's last word. A narrow column
  // (SIGNBOARD at 3100) broke the line after the separator and left "95%"
  // alone on a line of its own; now it can only break inside the name.
  text.appendChild(el('span', 'al-mname zh-sentence',
    t('almPhase' + phase.idx) + ' · ' + Math.round(phase.lit * 100) + '%'));
  text.appendChild(almStrip(t('almAge'), t('almDays', { n: phase.age.toFixed(1) }),
    t('almSrDays', { n: phase.age.toFixed(1) })));
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
    var raw = (sun.hours - yest.hours) * 3600;
    var abs = Math.round(Math.abs(raw)), m = Math.floor(abs / 60), sec = abs % 60;
    // The direction is the unrounded difference's. Rounded first, the 0.4 s
    // the day lost on 2026-12-22 came out as -0, which `>= 0` engraved as
    // LONGER.
    var longer = raw >= 0;
    // The engraved English label is SHORTER on its own, as an almanac sets
    // it; spoken, it carries its comparison ("than yesterday"), as the
    // Chinese label does on the strip. A spoken line with no minutes says
    // none: "by 0 minutes 39 seconds" was the engraving read aloud.
    strips.appendChild(almStrip(t(longer ? 'almLonger' : 'almShorter'),
      m + '\u2032' + pad2(sec) + '\u2033',
      t((longer ? 'almSrLonger' : 'almSrShorter') + (m ? '' : sec ? 'Sec' : 'Hair'),
        { m: m, s: sec }),
      true));
  }
  box.appendChild(strips);
}

/* A forecast is for one local day at the place. Past the place's midnight
   the last one read is yesterday's, and its sunrise, sunset, high and low
   were engraved as today's until the next poll came round. The board takes
   it as no forecast until today's lands: the plate falls back on its own
   arithmetic and the reading on NO READING. */
function almWeather() {
  var w = almanac && almanac.weather;
  var where = almanac && almanac.place;
  if (!w || !where) return w || null;
  var day = String(w.sunrise || '').slice(0, 10);
  if (day.length !== 10) return w;   // a polar day has no sunrise to date it by
  var here = localAt(where.timezone, new Date());
  return day === here.year + '-' + pad2(here.month + 1) + '-' + pad2(here.day) ? w : null;
}

/* The new day's forecast is read at the place's own midnight rather than
   whenever the ten-minute poll next comes round. The ask is pinned to that
   midnight once armed. Every render used to re-arm it from its own clock,
   and the sky tick renders once a minute: a tick in the seconds between the
   midnight and its ask (or on waking a machine that slept through both)
   measured the NEXT midnight from a day that had just turned, and put the
   ask off by a whole day. */
var almMidnightT = null;
var almMidnightAt = 0;   // when the pending ask is due; 0 once it has run

function almArmMidnight(due) {
  // An ask still to come stands against any later one. An earlier due (the
  // day of a clock change, a place further east) takes its place.
  if (almMidnightAt && almMidnightAt <= due) return;
  clearTimeout(almMidnightT);
  almMidnightAt = due;
  almMidnightT = setTimeout(almAskAtMidnight, Math.max(0, due - Date.now()));
}

function almAskAtMidnight() {
  almMidnightAt = 0;
  // A poll still out from before midnight comes back with yesterday's, and
  // pollAlmanac() declines while one is out: ask again once it is back.
  if (almBusy) { almArmMidnight(Date.now() + 2000); return; }
  pollAlmanac();
}

function renderAlmanac() {
  var sub = $('#al-sub');
  if (!sub) return;
  var where = almanac && almanac.place ? almanac.place : null;
  var wx = almWeather();
  var host = $('#al-sky');
  // Measured BEFORE the old plate comes out: emptying the register first
  // collapses it to nothing, and the new plate would be inscribed in a box
  // of zero height.
  var sky = buildSky(where, host, wx);
  host.textContent = '';
  host.appendChild(sky.svg);
  // fitCases() re-cuts the plate when the register changes size under it.
  host.dataset.plate = skyBox(host).key;
  // The plate is a picture (aria-hidden); what it engraves is said here.
  var said = sky.shown ? t('almSrTimes', { rise: hhmm(sky.shown.rise), set: hhmm(sky.shown.set) })
    : sky.sun && sky.sun.polar ? t(sky.sun.polar === 'day' ? 'almPolarDay' : 'almPolarNight') : '';
  if (said) host.appendChild(el('p', 'sr-only', said));
  sub.textContent = where ? t('almSub', { place: almPlaceName(where) }) : '—';
  $('#al-station').textContent = where ? almStation(where) : '—';
  buildRead(wx);
  buildTape(sky, where);
  if (sky.here) almArmMidnight(sky.at.getTime() + (24 - sky.here.hours) * 3600000 + 2000);
}

/* On screen only: the board is display:none below 2800px (and when the case
   is folded), and a hidden panel must never keep the hub calling out to a
   weather service. */
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
// One request at a time: the boot poll and the cases' first hanging both ask,
// and a retry chain armed by each would run twice.
var almBusy = false;

function pollAlmanac() {
  if (!almanacVisible()) return Promise.resolve();
  if (almBusy) return Promise.resolve();
  almBusy = true;
  var failed = false;
  return fetchJson('/api/almanac').then(function (a) {
    almanac = a;
    almReadAt = Date.now();
    renderAlmanac();
  }).catch(function () { failed = true; /* a restarting hub is not a forecast */ })
    .then(function () {
      // Re-armed after a failed request as well as after a miss: armed only
      // on a reply, one retry that met a hub restart left NO READING up for
      // the rest of the ten minutes. A failure re-arms it with a forecast
      // still on the board too, whose moment lapses (almFresh) and would
      // otherwise wait out the ten minutes after the hub came back.
      almBusy = false;
      clearTimeout(almRetryT);
      if (failed || !almWeather()) almRetryT = setTimeout(pollAlmanac, ALM_RETRY_MS);
    });
}

/* Read the cases the moment they can be seen again: the boot poll declined
   while they were hidden, and a reading kept from before is as old as the
   time they spent away. pollWorks() takes a stale reading down itself. */
function readCases() {
  if (!works || Date.now() - worksOkAt > WORKS_STALE_MS) pollWorks();
  if (!almWeather() || Date.now() - almReadAt > ALM_POLL_MS) pollAlmanac();
}

/* The boards open at 2800px, so a window that grows past that shows a case
   that has never read anything, and the Almanac waited out a minute of blank
   plate for its sky tick. */
var boardsT = null;
/* The aisles also open without a resize, when the engraving size leaves
   the row room for them (setAisles). */
function wakeBoards() {
  clearTimeout(boardsT);
  boardsT = setTimeout(readCases, 150);
}
window.addEventListener('resize', wakeBoards);

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
  return pollAlmanac();
}

/* ----- Hanging the cases -------------------------------------------------
   A case hangs from the cornice to the chair rail, so a short screen gives it
   a short door, and the head and the tape keep their size while the
   instruments take what is left. On a short enough wall that was nothing:
   four captions over dials of 0px, a sky plate of no height, and the
   Almanac's tape running out under the station plate. So the pair is
   measured as laid out, and when a dial would be drawn smaller than its
   figures can be read at, or the sky plate lower than its crossings can be
   lettered in, both cases fold away and the aisle walls take their bays.
   They go as a pair: one case left hanging in a symmetric hall reads as the
   other one having fallen off.

   The same pass hands the dials their drawn size (--dpu, which sizes their
   figures) and re-cuts the sky plate when its register has changed size;
   it used to keep the old register's proportions for up to a minute and
   then change shape by itself on the next sky tick. */
var DIAL_MIN_PX = 80;   // the figures are 13 units at most: 10px needs 77px
var SKY_MIN_PX = 90;    // RISE and 07:09 at 10px beside a readable ellipse
var casesHung = null;   // null: below 2800px, where there is no aisle
var casesRO = null;     // set below; renderWorks() adds the dials to it

function fitCases() {
  var boards = [$('#works'), $('#almanac')];
  var dials = $('#wk-dials'), host = $('#al-sky');
  if (!boards[0] || !boards[1] || !dials || !host) return;
  // Measured unfolded and folded again in this one task, so an unfolded
  // frame is never painted.
  boards.forEach(function (b) { delete b.dataset.fold; });
  var open = getComputedStyle(boards[0]).display !== 'none';
  var hung = null, dpu = 1;
  if (open) {
    var d = $('.wk-dial', dials), r = d ? d.getBoundingClientRect() : null;
    var dialPx = r ? Math.min(r.width, r.height) : 0;
    dpu = dialPx / 100;
    hung = dialPx >= DIAL_MIN_PX && skyRoom(host).h >= SKY_MIN_PX;
  }
  if (hung === false) boards.forEach(function (b) { b.dataset.fold = 'away'; });
  if (hung) {
    // Rounded down, so the figures round up: never a hair under their size.
    dials.style.setProperty('--dpu', (Math.floor(dpu * 1000) / 1000).toFixed(3));
    if (host.dataset.plate !== skyBox(host).key) renderAlmanac();
  }
  var was = casesHung;
  casesHung = hung;
  if (was === hung) return;
  // The wall was laid against the old answer: re-lay its bays around the
  // cases, or across the aisle where they were.
  buildAisles();
  if (hung) readCases();
}

if (window.ResizeObserver) {
  // The stage answers a new window size, the doors and the two flexing
  // registers a new language, engraving size or reading's height.
  casesRO = new ResizeObserver(function () { fitCases(); });
  ['#stage', '#works .cs-door', '#almanac .cs-door', '#wk-dials', '#al-sky']
    .forEach(function (sel) { var n = $(sel); if (n) casesRO.observe(n); });
}
// A folded case has no box to report a change of engraving size or language
// with, and the stage does not always move for one, so the pair stayed folded
// at a size it would now fit. Those two are asked about directly.
if (window.MutationObserver) {
  new MutationObserver(function () { fitCases(); })
    .observe(root, { attributes: true, attributeFilter: ['data-ui', 'lang'] });
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
var themeBusy = false;   // a theme crossfade is running, under its cut
var afterTheme = null;   // the lever re-light waiting for it

var flipRaf = 0;
function setWing(w) {
  wingPending = w;
  var apply = function () {
    store('atrium.wing', w);
    lever.setAttribute('aria-checked', String(w === 'bureau'));
    // The lever answers the hand at once: it is its own layer, and its
    // drive restyles only the lever and its gears. It used to wait with the
    // arches for the re-leaf to be drawn, so nothing on the machine moved
    // for 250-1,085ms after W (MO-15). Only the arches wait.
    deskDrive(w === 'bureau' ? 1 : 0);
    // The re-leaf goes out in the frame after the lever's first. In the
    // same frame its raster (120-170ms at 3440) held that frame back, and
    // the arm was first seen a fifth of a second after the key.
    var flip = function () {
      flipRaf = 0;
      if (themeBusy) { afterTheme = flip; return; }
      root.dataset.wing = w;
      if (wingPending === w) wingPending = null;
      afterReleaf(throwWing);
    };
    cancelAnimationFrame(flipRaf);
    if (root.dataset.motion === 'reduced' || document.visibilityState === 'hidden') flip();
    else flipRaf = requestAnimationFrame(function () { flipRaf = requestAnimationFrame(flip); });
  };
  // Serialize: the lever re-light queues until a theme crossfade finishes
  // and its cut is lifted; under the cut the throw would land in one frame.
  // The latest throw asked for is the one that runs.
  if (themeBusy) afterTheme = apply; else apply();
}
/* The arches changing places. They read the wing as it stands when they
   run, so two quick throws land where the second one points. */
function throwWing() {
  // The gates stay in the order they were built. The waiting wing is
  // inert, so Tab walks only the lit one, left to right, wherever the two
  // sit in the DOM. A 750ms re-append used to put the lit wing first, and
  // moving live nodes replayed the sheen on a hovered arch and bounced
  // focus off the gate the reader had just landed on.
  // Nothing here reads style or layout back (MO-2): the flip restyled the
  // whole hall, and every read after it used to force that restyle inside
  // the key handler (94-220ms) before the throw could start.
  layoutStage(false);
  clearTimeout(wingSayT);
  if (wingSay) { wingSay = false; sayWing(); }
}
/* W throws the lever from anywhere, and a throw replaces every arch in the
   hall. Focus on an arch rides the throw to the arch rising into its bay,
   and the lever says its own switch state, but from anywhere else (the
   masthead, the band, the page, the open Ledger) the whole hall changed
   without a word (AT-25). From there the wing and its gates are said once
   the last of its arches is up. */
var wingSay = false, wingSayT = 0;
function sayWing() {
  wingSayT = setTimeout(function () {
    var names = litGates().map(function (g) {
      var n = document.getElementById('gn-' + g.dataset.service);
      return n ? n.textContent : '';
    }).filter(Boolean);
    sayGate(t(root.dataset.wing === 'bureau' ? 'wingLitBureau' : 'wingLitSalon',
      { gates: names.join(t('list')) }));
  }, Math.max(0, stageLands - performance.now()));
}
/* The flip re-leafs the whole hall: every gilt fixture off the arches
   changes metal through --lead-* and --metal, and each one is rastered
   again. On the owner's 3440 display that frame took 150-250ms of GPU
   raster, and a throw started in the same task ran on the clock meanwhile:
   the 200ms sink was over before the next frame was drawn, so nobody saw
   it (MO-1). So the flip goes out on its own, and the arches start once it
   has been drawn. (The fixtures change metal in that one frame, not over a
   0.4s colour fade: a fill fading on the clock and the pilasters
   re-rastered them on every frame of the throw, 70ms a frame at 3440.
   Law 11.) */
var releafN = 0, releafT = 0;
function afterReleaf(fn) {
  var n = ++releafN;
  clearTimeout(releafT);
  var go = function () {
    if (n !== releafN) return;
    clearTimeout(releafT);
    releafN++;
    fn();
  };
  // A hidden tab draws nothing and fires no frames. Under reduced motion
  // nothing sinks, so there is no sink to wait to be seen: the arches
  // change with the re-leaf, in its frame.
  if (document.visibilityState === 'hidden' || root.dataset.motion === 'reduced') { go(); return; }
  afterDrawn(go);
  releafT = setTimeout(go, 500);
}
/* Toggle target derives from the PENDING wing when a crossfade has queued
   the apply — two quick toggles must round-trip, not both land on the same
   side. */
var wingPending = null;
function toggleWing() {
  var cur = wingPending || root.dataset.wing;
  setWing(cur === 'salon' ? 'bureau' : 'salon');
}
/* One gesture, one throw. Each click of a double-click used to throw the
   lever, so the pair threw it there and back: the gesture came to nothing,
   and a slow one reversed the swap mid-throw with no service arch standing
   for most of a second (PT-19). Keyboard clicks carry detail 0. */
function leverClick(e) {
  if (e.detail > 1) return false;
  // the click that ends a pull on the arm, which has already thrown it
  if (armPulled && e.timeStamp - armPulled < 400) { armPulled = 0; return false; }
  return true;
}
lever.addEventListener('click', function (e) { if (leverClick(e)) toggleWing(); });
/* The pointer reaches the switch through the board itself: the blade's
   strip is inside #lever and arrives above, the board's drawn shapes throw
   it from here, and each side's plate, pilot and jaws light their own wing
   (a click on SALON never leaves the Salon). */
var deskCore = $('#signal-desk .desk-core');
deskCore.addEventListener('click', function (e) {
  var tgt = e.target;
  if (!tgt.closest) return;
  // a plate, a pilot or a pair of jaws names its side
  var side = tgt.closest('[data-side]');
  if (side) {
    var want = side.getAttribute('data-side');
    if ((wingPending || root.dataset.wing) !== want) setWing(want);
  } else if (tgt.closest('.desk-art') && leverClick(e)) {
    toggleWing();
  }
});
/* The arm leans toward the other throw while it is held (atrium.css), which
   asks for a pull, and a pull used to do nothing: released anywhere off the
   arm, its click landed on the console's box or the floor (PT-20). The arm
   now keeps the pointer it was pressed with, and a release carried a few
   pixels toward the other throw throws it; one carried the other way pushes
   against the stop and does nothing. A release that barely moved is left to
   the click. */
var ARM_PULL = 6;   // px of travel that makes a press a pull
var armPulled = 0, armPress = null;
var hitArm = $('#lever .hit-arm');
if (hitArm) {
  hitArm.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    armPress = { id: e.pointerId, x: e.clientX };
    try { hitArm.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
  });
  hitArm.addEventListener('pointerup', function (e) {
    if (!armPress || armPress.id !== e.pointerId) return;
    var dx = e.clientX - armPress.x;
    armPress = null;
    if (Math.abs(dx) < ARM_PULL) return;
    armPulled = e.timeStamp;
    // The Salon's throw is on the left and the Bureau's on the right.
    var want = dx > 0 ? 'bureau' : 'salon';
    if ((wingPending || root.dataset.wing) !== want) setWing(want);
  });
  hitArm.addEventListener('pointercancel', function () { armPress = null; });
}

/* The desk is fixed to the foot of the screen, but the stage's baseline
   moves with whatever stands above it: a Chinese masthead that wraps pushes
   the whole row down. Where the floor under the stage is shorter than the
   machine, the vent stack rose over the clock's sill. --desk-room caps the
   machine's scale to the floor it actually has. It is the stage's LAYOUT
   bottom (offsetTop), not its painted one: the entrance dollies the stage
   with a transform, and a reading taken mid-dolly would stick. */
var DESK_GAP = 8;         // clear stone between the sill and the board's crest
var DESK_MIN = 0.5;       // below this the switch is too small to take
/* The highest point the board ever draws, in its own units: the top of
   the handle's arc, just over the focus ring on the crest's finial. */
function deskArt() { return window.Desk ? window.Desk.ART_TOP : null; }
function deskBox() { return window.Desk ? window.Desk.BOX_H : 300; }
function fitDesk() {
  var stage = $('#stage'), desk = $('#signal-desk');
  if (!stage || !desk || deskArt() === null) return;
  var base = stage.offsetHeight;
  for (var n = stage; n; n = n.offsetParent) base += n.offsetTop;
  var foot = parseFloat(getComputedStyle(desk).bottom) || 0;
  var room = (window.innerHeight - foot - base - DESK_GAP) / (deskBox() - deskArt());
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
/* What the live region last said about the lines. It is compared against
   this, never against the region's text: a DARK gate's launch notice used
   to be said through the same region, and an unchanged count was said a
   second time on the next poll after any notice. The notice has its own
   region now, #gate-say. */
var hallSaid = '';
var hallNews = '';   // what it has to say now, heard or not

function applyStatuses() {
  var openCount = 0, known = 0;
  services.forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    var st = statuses[svc.id];
    if (!a) return;
    var state = st ? st.state : 'checking';
    a.dataset.state = state;
    if (state !== 'checking') a._known = state;   // see actsDark
    var lampT = $('.lamp-t', a);
    if (state === 'open') { lampT.textContent = 'OPEN'; openCount++; known++; }
    else if (state === 'dark') { lampT.textContent = 'DARK'; known++; }
    else { lampT.textContent = '…'; }
    lampT.title = t(state === 'open' ? 'lampOpen' :
                    state === 'dark' ? 'lampDark' : 'lampChecking');
    var sr = $('.lamp-sr', a);
    // Stopped, like every part of the gate's description, or speech runs
    // the lamp word straight into the curtain's sentence.
    if (sr) sr.textContent = t(state === 'open' ? 'srOpen' : state === 'dark' ? 'srDark' : 'srChecking') + t('srStop');
    // The card comes down when the lamp comes back, and only then: a lamp
    // that is only asking (one missed poll, a hub restarting) has not come
    // back, and the card went with it, the path half read or half copied.
    if (state === 'open' && !$('.g-notice', a).hidden) hideNotice(a);
    describeGate(a);
    var note = st && st.note && STR.en['note.' + st.note] !== undefined ? t('note.' + st.note) : '';
    $('.g-lamp', a).title = note || lampT.title;
    var noteEl = $('.g-note', a);
    if (noteEl) {
      noteEl.textContent = note;
      noteEl.hidden = !note;
    }
    var noteSaid = $('.g-said-note', a);
    if (noteSaid) noteSaid.textContent = note ? note + t('srStop') : '';
  });
  var allDark = known === services.length && known > 0 && openCount === 0;

  // The hall is a picture; say out loud how many lines are open, so a screen
  // reader learns the same thing the lamps show. Only on change — a live
  // region rewritten every poll would announce itself every poll.
  // Nothing is said until a status is known: before the first answer
  // "LINES OPEN 0/6" was announced as fact. A hub that stops answering is
  // said out loud, and a hub still asking clears the old count rather than
  // repeating a number it no longer knows.
  // (A hub that never answered at all has no registry either, and is said.)
  if (services.length || hubLost) {
    hallNews = hubLost ? t('hubLost') : !known ? ''
      : allDark ? t('allDark') : t('linesOpen', { n: openCount, m: services.length });
    sayLines();
  }
}

/* Said only where it can be heard. The region lives in the hall, which is
   inert under Preferences and the open Ledger, and a count written there
   then was taken as said though no screen reader could hear it: a line
   that went DARK meanwhile was never announced. It waits instead, and
   syncBehind() says it when the hall comes back. */
function sayLines() {
  var st = $('#hall-status');
  if (!st || hallNews === hallSaid || st.closest('[inert]')) return;
  hallSaid = hallNews;
  st.textContent = hallNews;
}

function statText(svc) {
  var s = stats[svc.id] || {};
  var st = statuses[svc.id];
  // A dark gate says nothing: three services used to keep their last figure
  // on a dark gate and in the ticker, two dropped it, and nothing said which
  // was which.
  if (st && st.state === 'dark') return '';
  // A stale edition keeps its counts here. The apron's note already says the
  // edition is old, and "EDITION STALE" above it said the same thing twice.
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
    // The same day the Ledger prints ("Sep 21"), not the wire's ISO date.
    if (s.date) return t('stat.brief_of', { date: briefDay(s.date) || s.date });
  } else if (svc.id === 'outreach') {
    var parts = [];
    if (s.total > 0) parts.push(t('stat.queue', { done: s.ready || 0, total: s.total }));
    if (s.invited !== undefined && s.invited > 0)
      parts.push(t('stat.invited', { n: s.invited, target: s.target || 20 }));
    // A no-break space before the dot: a line that wraps breaks after the
    // separator, and never opens its second line with a lone '·'.
    return parts.join('\u00a0· ');
  }
  return '';
}

function applyStats() {
  services.forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    var span = $('.num-roll', a);
    var txt = statText(svc);
    // Said at once, whole: the odometer's words land 240 ms later.
    var said = $('.g-said-stat', a);
    if (said) said.textContent = txt ? txt + t('srStop') : '';
    // The odometer is for a reading that changed. A line re-lettered into
    // the other language holds the same numbers, and every gate used to
    // roll on a language switch; the text swaps in place instead.
    var relettered = span._lang !== undefined && span._lang !== lang;
    span._lang = lang;
    // Compared with the line the gate is rolling to, not the one painted:
    // for the 240 ms of a roll the span still holds the old words, and a
    // newer answer equal to them was taken as no change, so the roll went
    // on and left the older figure standing until the next poll.
    var target = span._target !== undefined ? span._target : span.textContent;
    if (target !== txt) {
      clearTimeout(span._rollT);        // a stale timer would swap in old text
      span._target = txt;
      if (span.textContent === txt) {
        // Back to the words still painted: the roll under way lands on them.
      } else if (span.textContent && !relettered && root.dataset.motion !== 'reduced') {
        span.classList.remove('roll');
        void span.offsetWidth;          // restart the odometer animation
        span.classList.add('roll');
        span._rollT = setTimeout(function () { span.textContent = txt; }, 240);
      } else {
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

/* "2026-09-21 22:10" on the wire (the daemon's last_sync), "Sep 21, 22:10"
   / "9月21日 22:10" on the card, dated as every other card is. */
function passDay(stamp) {
  var m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(stamp || '');
  var day = m ? briefDay(m[1]) : '';
  return day ? t('dayTime', { day: day, time: m[2] }) : (stamp || '');
}

/* Every line here must stay true after its day ends: a plaque filed under
   EARLIER is read tomorrow, so no string says "today". */
function headline(d) {
  var k = d.kind, p = d.params || {};
  switch (k) {
    case 'anime.premiere':
      return { head: p.title, detail: t(p.promoted ? 'k.anime.premiere.promoted' : 'k.anime.premiere') };
    case 'anime.completed':
      // A one-episode show was "Finished, all 1 episode watched".
      return { head: p.title, detail: t(Number(p.eps) > 1 ? 'k.anime.completed' : 'k.anime.completed.noeps', p) };
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
               detail: t(p.hours >= 1 ? 'k.autopilot.stalled' : 'k.autopilot.stalled.fresh',
                         { since: passDay(p.since), hours: p.hours }),
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
  // A hall the registry does not list yet is called what a new gate's
  // fallback description calls it. Its origin is an internal id, and a
  // card used to be headed "spaceidle".
  var svc = null;
  for (var i = 0; i < services.length; i++) {
    if (services[i].id === d.origin) { svc = services[i]; break; }
  }
  return { head: (svc ? svc.name : t('k.unknown.head')), detail: t('k.unknown') };
}

/* Ages are floored, as a person reads a clock: rounding put "60 min ago" on
   a dispatch not yet an hour old and "48 h ago" on one of 47.8 h. Past two
   days the count is calendar days, so a Monday dispatch can no longer read
   "3 d ago" on Wednesday evening. */
function relTime(ts, spoken) {
  var d = Date.now() - ts;
  if (d < 90 * 1000) return t('justNow');
  // spoken: the same age in words. "15 h ago" was read as "15 H AGO".
  if (d < 3600 * 1000) return t(spoken ? 'minAgoSr' : 'minAgo', { n: Math.floor(d / 60000) });
  if (d < 48 * 3600 * 1000) return t(spoken ? 'hAgoSr' : 'hAgo', { n: Math.floor(d / 3600000) });
  var then = new Date(ts), today = new Date();
  then.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  // Rounded only to absorb a 23 or 25 hour day at a clock change.
  return t(spoken ? 'dAgoSr' : 'dAgo', { n: Math.round((today - then) / 86400000) });
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
    markRead(d.id);   // following a dispatch is the least ambiguous read there is
    // The browser's own new-tab gestures are left to it, as on a gate: a
    // Ctrl or Shift click used to be turned into the named tab, which took
    // the reader's open service tab away from whatever it was showing. A
    // middle click reaches here only forwarded from the holder (#plaques).
    if (e[NEW_TAB_KEY] || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    // One gesture, one open: a double-click loaded the dispatch twice.
    if (e.detail > 1) return;
    window.open(d.url, 'atrium-' + d.origin);
  });
  // A middle click on the card itself goes to the browser untouched; it is
  // still the reader following the dispatch.
  a.addEventListener('auxclick', function (e) { if (e.button === 1) markRead(d.id); });
  // Armed on the li, not the anchor: the medallion overhangs the spine
  // outside the frame, and a reader who rests on the sigil is on the plaque.
  armDwell(li, d.id);
  var medal = el('span', 'medal' + (d.wing === 'bureau' ? ' m-bureau' : ''));
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  // The card's fittings (lean, stamp, jewel) and the cartouche the mark
  // sits in are cabinetry's, off the dispatch's own hash.
  window.Cabinet.cartouche(svg, window.Cabinet.card(li, d.id, shadowWrap));
  var sig = document.createElementNS(ns, 'use');
  var known = KNOWN_SIGILS[d.origin];
  sig.setAttribute('href', known ? '#mark-' + d.origin : '#sig-fallback');
  sig.setAttribute('class', known ? 'm-sig m-mark' : 'm-sig');
  svg.appendChild(sig);
  medal.appendChild(svg);
  li.appendChild(medal);   // outside the clipped layers — overhangs the spine
  // The card's name is read as one line, so its parts are parted for
  // speech: title, unread, detail and age used to run together unbroken.
  // They are said from one hidden line of inline text. Each separator in
  // a box of its own came out detached from the words before it ("The
  // edition is out , unread , ..."), in speech and on a braille display.
  var head = el('div', 'pl-head');
  head.setAttribute('aria-hidden', 'true');
  a.appendChild(head);
  var detail = el('div', 'pl-detail');
  detail.setAttribute('aria-hidden', 'true');
  a.appendChild(detail);
  var when = el('div', 'pl-time num');
  when.setAttribute('aria-hidden', 'true');
  a.appendChild(when);
  var said = el('span', 'sr-only pl-name');
  ['pl-said-head', 'pl-unread', 'pl-sep', 'pl-said-detail', 'pl-sep', 'pl-said'].forEach(function (c) {
    said.appendChild(el('span', c));
  });
  a.appendChild(said);
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
  var headSaid = $('.pl-said-head', li);
  headSaid.textContent = h.head || '';
  if (head.lang) headSaid.lang = head.lang; else headSaid.removeAttribute('lang');
  $('.pl-unread', li).textContent = t('list') + t('unread');
  // No detail, no separator for it: "title, , age" otherwise.
  var seps = li.querySelectorAll('.pl-sep');
  seps[0].textContent = h.detail ? t('list') : '';
  seps[1].textContent = t('list');
  $('.pl-detail', li).textContent = h.detail || '';
  $('.pl-said-detail', li).textContent = h.detail || '';
  ageCard(li, d);
}

/* A card's age is written twice, engraved for the eye and in words for a
   screen reader (the engraving is aria-hidden), and always together: the
   outage retimer once kept only the engraving counting, so a card that
   showed "3 h ago" still said "1 hour ago". */
function ageCard(li, d) {
  $('.pl-time', li).textContent = relTime(d.ts);
  $('.pl-said', li).textContent = relTime(d.ts, true);
}

/* Ages count from each dispatch, not from the last good read. */
function retimeLedger() {
  feed.forEach(function (d) {
    var li = plaqueEls[d.id];
    if (li) ageCard(li, d);
  });
}

/* When the Ledger last heard from the hub. Once a poll has gone by without
   a fresh feed the drawer says since when, in the lacquer beside the stamp:
   the plaques it still shows were true then, but newer dispatches may be
   waiting behind a hub that has gone quiet. */
var feedReadAt = 0;
var STALE_MS = 60000;   // longer than one 45 s beat
function syncStale() {
  var mark = $('#ledger-stale');
  if (!mark) return;
  var stale = feedState === 'ok' && feedReadAt && Date.now() - feedReadAt > STALE_MS;
  mark.hidden = !stale;
  if (!stale) return;
  var at = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB',
    { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(feedReadAt));
  mark.textContent = t('ledgerStale', { t: at });
}

function renderLedger() {
  var ol = $('#plaques');
  // Nothing is known yet, so nothing is claimed: the ghosts stay until the
  // first feed lands. Opening the drawer used to wipe them and engrave "No
  // dispatches" over a feed that was still on its way.
  if (feedState === 'loading') {
    if (!ol.querySelector('.ghost')) renderGhosts();
    var saying = ol.querySelector('li.sr-only.ghost');
    if (saying) saying.textContent = t('ledgerLoading');   // a language switch meanwhile
    // The idle stamp says why it is idle. Only the full render below synced
    // it, so a drawer opened before the first feed showed no tooltip at all.
    syncStamp();
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
      // A plain list item holding the day's heading. As role=presentation
      // it put a bare heading straight into the list, which a list may not
      // hold.
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
      // The card goes in held at the drop's first keyframe, and the drop
      // waits for the column to be redrawn (afterReflow). Started with the
      // insert, it ran through the frame that redraws every card below it
      // (117-134 ms at 3440), and that one frame took the card from 18% to
      // 90% of its fall.
      li.classList.add('arrive-hold');
      (function (card) {
        afterReflow(function () {
          card.classList.remove('arrive-hold');
          card.classList.add('arrive');
          card.addEventListener('animationend', function () {
            card.classList.remove('arrive');
          }, { once: true });
          setTimeout(function () { card.classList.remove('arrive'); }, 700);
        });
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

/* A card let into the column moves every card below it, and the frame that
   draws them in their new places is the slow one, two or three frames after
   the insert rather than the next (the GPU is still redrawing the column;
   117-167 ms at 3440 on an integrated GPU, after a 50 ms one). A fixed wait
   is either too short for a slow machine or makes a fast one wait for it,
   so this watches the frames: it runs on the first frame after a slow one,
   or once 150 ms have gone by without one. */
function afterReflow(fn) {
  var first = 0, last = 0;
  requestAnimationFrame(function tick(t) {
    if (!first) first = t;
    else if (t - last > 80 || t - first > 150) { fn(); return; }
    last = t;
    requestAnimationFrame(tick);
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
  // "Nothing left to strike" is a claim about a window the hall has read.
  // Before the first feed it says only that the Ledger is being read, which
  // is why it is idle; with no feed it says why.
  if (feedState === 'failed') btn.title = t('ledgerUnreadable');
  else if (feedState === 'loading') btn.title = t('ledgerLoading');
  else btn.title = idle ? t('markAllDone') : t('markAllHint');
  syncStale();
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
  // A notice lying over the drawer's chips and stamp hid them and the focus
  // ring on them. A pointer press already put the plate away; L does too.
  // It goes first: L pressed on the plate's heading is L pressed on the gate
  // the plate was called from, and putting the plate away hands focus back
  // there. Read before it, the return was the plate's own heading, hidden by
  // the time the drawer shut, and focus fell through to the hatch.
  toggleKeyplate(false);
  // Where the reader was, so shutting the drawer can put them back there
  // rather than on the hatch, where the next arrow key did nothing. The bay
  // is kept as well: W can darken that gate while the drawer is open.
  var from = document.activeElement;
  ledgerReturn = from && from !== document.body && !ledgerEl.contains(from) &&
    !(keyplate && keyplate.contains(from))
    ? { el: from, bay: litGates().indexOf(from) } : null;
  layerMoved();
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
  // A drawer opened again starts at its head. It kept the scroll it was shut
  // with, and the first Tab parked the knob at the screen's top edge with
  // the top of its ring cut off.
  ledgerEl.scrollTop = 0;
  renderLedger();
  ledgerOpening = false;
  // The drawer covers the hatch that opened it, so focus moves in with it:
  // to the drawer's heading, from where the chips, the stamp and the first
  // plaque are one Tab away. Tab then cycles the drawer's own stops.
  var head = $('#ledger h2');
  if (head) head.focus({ preventScroll: true });
  // Only then does the hall go out of reach: made inert while focus was
  // still on a gate, it would drop the reader's place on the way in.
  syncBehind();
}

function closeLedger() {
  var ledgerEl = $('#ledger');
  var scrimEl = $('#ledger-scrim');
  var ledgerBtnEl = $('#ledger-btn');
  if (!ledgerEl || !scrimEl || !ledgerBtnEl) return;
  layerMoved();
  var ae = document.activeElement;
  // The key plate called up over the drawer returns to a plaque, which is
  // about to go inert. L pressed there shut the drawer and threw its return
  // away (focus was on the plate, not in the drawer), and the Esc that put
  // the plate away then had nowhere to go but <body>.
  var plateOver = keyplate && !keyplate.hidden && keyplate.contains(ae) &&
    kpReturn && ledgerEl.contains(kpReturn);
  // A dwell under way when the drawer shuts was not finished by the reader.
  cancelDwells();
  ledgerEl.classList.remove('open');
  scrimEl.classList.remove('visible');
  ledgerBtnEl.setAttribute('aria-expanded', 'false');
  // The hall comes back into reach before focus is handed to it.
  HALL_BEHIND.forEach(function (s) { var n = $(s); if (n) n.inert = false; });
  // A closed drawer is inert: off screen it still sat in the tab order, and
  // because focus marks a dispatch read, one pass of Tab through the page
  // struck the whole Ledger. Focus inside it goes back where it came from
  // first, or making it inert would drop the reader's place onto <body>.
  if (ledgerEl.contains(ae)) {
    ledgerHandBack(ledgerBtnEl);
  } else if (plateOver) {
    // The plate stays up; it returns where the drawer would have.
    kpReturn = ledgerReturnTarget() || ledgerBtnEl;
    kpReturnX = kpReturn.classList.contains('gate') ? slotX(kpReturn) : null;
  } else {
    ledgerReturn = null;
  }
  syncBehind();
  // Closing marks nothing. Reading is what the pointer did while the drawer
  // was open, and a plaque three screens down was not read by the act of
  // shutting the drawer over it.
  renderLedger();
  updateLedgerBadge();
  // A plate called up over the open drawer stood short of it; it takes the
  // whole band again.
  if (keyplate && !keyplate.hidden) placeKeyplate();
}

/* Focus goes back to whatever opened the drawer: a gate, the lever, the
   band. The hatch is the fallback, for a drawer opened from the hatch, from
   nowhere, or from something that has since gone. A gate darkened by the
   lever while the drawer was open hands over to the gate in its bay. */
var ledgerReturn = null;
function ledgerReturnTarget() {
  var r = ledgerReturn;
  ledgerReturn = null;
  var to = r && r.el;
  if (to && (!to.isConnected || to.closest('[inert]') || !to.getClientRects().length)) {
    var gates = r.bay >= 0 ? litGates() : [];
    to = gates.length ? gates[Math.min(r.bay, gates.length - 1)] : null;
  }
  return to;
}
function ledgerHandBack(hatch) {
  (ledgerReturnTarget() || hatch).focus({ preventScroll: true });
}

/* What each open layer puts out of reach behind it. Preferences is a modal
   dialog over everything. The open drawer keeps Tab in its own ring, so the
   hall and the desk behind its scrim go inert with it: a screen reader's
   cursor used to walk out of the drawer into gates hidden behind the scrim,
   and a Tab pressed there threw it straight back in. The key plate stays in
   reach, since it is called up over the drawer and takes focus there. A
   shut drawer is inert. */
/* What a layer puts out of reach: the masthead, the band, the stage and the
   two cases, and the desk. The wall and the floor are left out: they are
   aria-hidden, hold nothing to focus, and the layer covers them, and inert
   on them made the whole terrazzo plane be rastered again for nothing
   (MO-14). The live regions are in the stage, so they go with it. */
var HALL_BEHIND = ['#masthead', '#ticker', '#works', '#stage', '#almanac', '#signal-desk'];
function syncBehind() {
  var up = !prefs.hidden;
  var l = $('#ledger');
  var open = !!l && l.classList.contains('open');
  HALL_BEHIND.forEach(function (s) { var n = $(s); if (n) n.inert = up || open; });
  ['#ledger-scrim', '#keyplate'].forEach(function (s) { var n = $(s); if (n) n.inert = up; });
  if (l) l.inert = up || !open;
  // The hall's live region was out of the tree while it was inert, so a
  // line count that changed meanwhile was never heard. It is said once the
  // hall is back, a beat later: the region has to be in the tree with its
  // old words before new ones count as news.
  if (!up && !open) setTimeout(sayLines, 150);
}

/* The ghosts are for the eye. To a screen reader they were a list of three
   empty items and no word that anything was on its way, so they are hidden
   from it, and one line it can read says the Ledger is being read. It goes
   with the ghosts when the first feed lands. */
function renderGhosts() {
  var ol = $('#plaques');
  ol.textContent = '';
  ol.appendChild(el('li', 'ghost sr-only', t('ledgerLoading')));
  for (var i = 0; i < 3; i++) {
    var li = el('li', 'plaque ghost');
    li.setAttribute('aria-hidden', 'true');
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
/* The band carries this many unread dispatches and counts the rest into the
   Ledger. A week's window can hold sixty, and at the crawl's pace a band
   carrying them all would take minutes to come round. */
var TICKER_NEW_MAX = 6;
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
  // of open lines it cannot vouch for is not said at all. A hall with every
  // line dark says so here, in words, where the count would stand. That
  // line used to be set on the stage, where the clock stands: it lay behind
  // the niche, and only a stray letter or two reached the wall (CRB-3).
  if (hubLost) segs.push(t('hubLost'));
  else if (known && known === services.length && !open) segs.push(t('allDark'));
  else if (known) segs.push(t('linesOpen', { n: open, m: services.length }));
  services.forEach(function (s) {
    var txt = statText(s);
    // Each figure names its hall. "9 WATCHING" ran under the Bureau's arches
    // with nothing on screen to say watching what.
    if (txt) segs.push({ hall: s.short || s.name, text: txt });
  });
  // A dispatch keeps its title and its detail apart: they are often in two
  // scripts, and each is tagged for its own voice (AT-11).
  var unread = feed.filter(isNew);
  var fresh = unread.slice(0, TICKER_NEW_MAX).map(function (d) {
    var h = headline(d);
    return [h.head, h.detail];
  });
  // The rest are counted, not dropped: the band used to stop at the sixth
  // while the hatch's tooltip counted seven, and nothing said where the
  // seventh had gone.
  var more = unread.length - fresh.length;
  var paged = root.dataset.motion === 'reduced';
  var said = segs.map(function (g) { return g.hall ? g.hall + '\u0003' + g.text : g; });
  return {
    segs: segs, fresh: fresh, more: more, paged: paged,
    key: [lang, paged ? 'r' : 'f', said.join('\u0001'),
          fresh.map(function (f) { return f.join(' · '); }).join('\u0001'),
          more].join('\u0002')
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
   its loop comes round; a still one is while a reader is on it; a paged one
   is between page turns. */
function tickerHeld(ticker) {
  var track = $('#ticker-track');
  if (ticker.classList.contains('rolling') && track.getAnimations &&
      track.getAnimations().some(function (a) { return a.playState !== 'finished'; })) return true;
  if (tickerReader(ticker)) return true;
  return !!tickerPageT;
}
/* A reader is a mouse or a pen resting on the band (data-reader, set below)
   or the keyboard's focus. A tap is neither: it leaves :hover stuck on the
   band until the next tap somewhere else, and that froze the crawl and held
   every new band (PT-12). A click's focus is not one either (PT-6), and a
   press no longer takes focus at all: any key after it made that focus
   :focus-visible and froze the band until the next click (PT-13). */
function tickerReader(ticker) {
  return ticker.hasAttribute('data-reader') || ticker.matches(':focus-visible');
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
  // A CJK title in the English hall (or a Latin one in the Chinese) is
  // tagged, so a screen reader switches voice instead of spelling it.
  function tag(n, s) {
    var cjk = /[\u3040-\u30ff\u3400-\u9fff]/.test(s);
    if (cjk !== (lang === 'zh')) n.lang = cjk ? 'zh' : 'en';
    return n;
  }
  function seg(s, cls) {
    if (s && s.hall) {
      // The hall's name is signage and stays English, so in the Chinese hall
      // it is tagged apart from the figure that follows it.
      var g = el('span', cls || '');
      var name = el('span', 't-hall', s.hall);
      if (lang !== 'en') name.lang = 'en';
      g.appendChild(name);
      g.appendChild(document.createTextNode(' \u00b7 '));
      g.appendChild(seg(s.text));
      return g;
    }
    return tag(el('span', cls || '', s), s);
  }
  // A dispatch is two runs, title and detail, each tagged on its own, as the
  // Ledger's plaques are. Tagged whole, an English detail went to the
  // Chinese voice with its title, and an English title in the Chinese hall
  // went untagged because its detail was Chinese.
  function dispatchSeg(f) {
    var n = el('span', 't-new');
    n.appendChild(tag(el('span', '', f[0]), f[0]));
    n.appendChild(document.createTextNode(' \u00b7 '));
    n.appendChild(tag(el('span', '', f[1]), f[1]));
    return n;
  }
  var items = m.segs.map(function (s) { return seg(s); })
    .concat(m.fresh.map(dispatchSeg));
  if (m.more > 0) items.push(seg(t('tickerMore', { n: m.more })));
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
    // Pauses for a reader, like the crawl, and never turns unseen.
    if (document.hidden || tickerReader(ticker)) { turnTickerPage(); return; }
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
  ticker.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'touch') ticker.setAttribute('data-reader', '');
  });
  ticker.addEventListener('pointerleave', function () {
    ticker.removeAttribute('data-reader');
    released();
  });
  ticker.addEventListener('focusout', released);
  ticker.addEventListener('mousedown', function (e) { e.preventDefault(); });
  // Crawl or pages is a motion decision, and the pages are cut to the
  // band's width and the engraving: either changing re-sets the band now.
  window.addEventListener('atrium:motionchange', function () { renderTicker(true); });
  function rebox() {
    if (tickerKey !== null && ticker.clientWidth + '|' + uiScale() !== tickerBox) renderTicker(true);
  }
  var resizeT = null;
  function reboxSoon() {
    clearTimeout(resizeT);
    resizeT = setTimeout(rebox, 200);
  }
  window.addEventListener('resize', reboxSoon);
  // The engraving size changes no window size, so the resize above never
  // saw it, and a band cut for the old size ran on under the end cap (RC-4).
  // Watched on the root, it re-sets the band from the Preferences radio and
  // from another tab alike. Not on the next frame: under reduced motion
  // every property still eases over 0.01ms, so the lettering is measured at
  // its old size until a frame has passed.
  if (window.MutationObserver) {
    new MutationObserver(reboxSoon).observe(root, { attributes: true, attributeFilter: ['data-ui'] });
  }
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
var refreshSeq = 0, appliedSeq = 0, registrySeq = 0;

/* The registry as last built into gates, verbatim. The hub serves it from
   memory, and it changes only when the hub comes back with a different
   SERVICES. The hall is the start page and stays open across that, and it
   used to read the registry once: a retired service kept a gate on "…" and
   held LINES OPEN at 5/6 over five open lines, and a new one had no gate
   and headed its dispatch with its raw id until a reload. */
var registryBuilt = null;
function applyRegistry(payload) {
  var list = payload && Array.isArray(payload.services) ? payload.services : null;
  if (!list) return;                 // not a registry: the gates standing stay
  var sig = JSON.stringify(list);
  if (sig === registryBuilt) return;
  registryBuilt = sig;
  // A rebuild replaces every gate, and the one the reader was on with it.
  var ae = document.activeElement;
  var on = ae && ae.closest ? ae.closest('#gates .gate') : null;
  services = list;
  renderGates();
  var back = on && document.getElementById(on.id);
  if (back && back !== on && !back.closest('[inert]')) back.focus({ preventScroll: true });
}

function refresh() {
  // The dateline was written once at load, so a hall left open overnight
  // printed yesterday under a clock whose date aperture had already turned.
  renderDateline();
  clearTimeout(retryT);
  var seq = ++refreshSeq;
  var none = function () { return null; };
  // The registry is asked for on every poll, beside the rest rather than
  // ahead of it. Asked first, a hub that took the connection and hung cost
  // the boot the whole fetch timeout twice (once here, once for the
  // status behind it) before anything said the hub was gone. It is applied
  // the moment it lands, so the gates stand before a slow status arrives.
  var reg = fetchJson('/api/services').then(function (payload) {
    if (seq < registrySeq) return;   // an older answer never undoes a newer one
    registrySeq = seq;
    applyRegistry(payload);
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
    // back to asking, and the band and the live region say why. A cold
    // status is neither: it is the hub not having asked yet, and it used to
    // put every lamp back to the ellipsis over a reading the page still had.
    var wasLost = hubLost;
    var stOk = !!(st && st.services && typeof st.services === 'object');
    var sxOk = !!(sx && sx.stats && typeof sx.stats === 'object');
    var fdOk = !!(fd && Array.isArray(fd.dispatches));
    if (!(stOk && cold(st))) {
      hubLost = !stOk;
      statuses = hubLost ? {} : st.services;
    }
    if (!sxOk) stats = {};
    else if (!cold(sx)) stats = sx.stats;
    applyStatuses();
    applyStats();
    var lettered = false;
    if (fdOk) {
      if (!cold(fd)) {
        // The first feed landing in an open drawer falls in as the opening
        // cascade would have; the drawer held its ghosts until now.
        var falling = firstFeed && $('#ledger').classList.contains('open');
        feed = fd.dispatches;
        feedState = 'ok';
        feedReadAt = Date.now();
        if (falling) { ledgerOpening = true; cascadeIndex = 0; }
        renderLedger();
        ledgerOpening = false;
        firstFeed = false;
        lettered = true;
      }
    } else if (feedState !== 'ok') {
      // Only a Ledger that never read says so. After a good read the plaques
      // stay: a dispatch that happened is still true when the hub goes quiet.
      feedState = 'failed';
      renderLedger();
      lettered = true;
    }
    // ...but its age is not. The plaques kept the ages they had when the
    // feed went quiet, "16 h ago" two hours on.
    if (!lettered && feedState === 'ok') retimeLedger();
    updateLedgerBadge();
    // Losing the hub (or finding it again) is not a routine change of
    // figure: the band says so at once rather than a loop later, still
    // counting open lines it can no longer see.
    renderTicker(hubLost !== wasLost);
    // Anything not applied is asked for again soon: a lost status, a stats
    // or feed answer that failed or could not be read, a cold payload, or a
    // registry that never came. A stats miss alone used to leave every stat
    // line blank for the rest of the 45 s beat.
    if (hubLost || !stOk || !sxOk || !fdOk || cold(st) || cold(fd) || cold(sx) ||
        !services.length) {
      clearTimeout(retryT);   // overlapping polls must not leave two timers
      retryT = setTimeout(poll, RETRY_MS);
    }
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
  // So are the dials, which otherwise showed the reading from before the tab
  // was hidden as live until the next beat.
  pollWorks();
});

/* ========================================================================
   Preferences overlay — focus-trapped dialog, Esc closes (R4/R5)
   ======================================================================== */
var prefs = $('#prefs');
var prefsBtn = $('#prefs-btn');
// The panel's switchgear is drawn once, before it is ever opened.
window.Cabinet.dressPrefs(prefs);
var lastFocus = null;

/* The real Tab stops inside a layer, for the Preferences trap and the
   Ledger's ring. The bare selector also matched an SVG <use href> (it has an
   href, and no offsetParent to fail the visibility test), which focus()
   ignores, so Tab stuck on the control before it; and it matched every radio
   of a roving group, where only the checked one is a stop. */
var FOCUSABLE = 'a[href], button, input, select, [tabindex]';
function tabStops(scope) {
  return Array.prototype.filter.call(scope.querySelectorAll(FOCUSABLE), function (n) {
    return n instanceof HTMLElement && n.tabIndex >= 0 && !n.disabled &&
      n.getClientRects().length > 0 && !n.closest('[inert]');
  });
}

/* Bound on document while the dialog is open — a keydown must close/trap
   even when focus fell to body (e.g. after clicking sheet padding). */
function prefsKeydown(e) {
  if (e.key === 'Escape') { closePrefs(); return; }
  if (e.key !== 'Tab') return;
  var focusables = tabStops(prefs);
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
   it true for a screen reader's virtual cursor as well as for Tab
   (syncBehind). It goes inert in the frame after the sheet's first, not
   in the key's task. inert restyles everything under it (7,600 elements
   at 3440, ~37ms), and the focus() below forced that restyle inside the
   key handler, ahead of the sheet: at 3440 the sheet was first seen
   200-540ms after P (MO-14). Until then focus is in the sheet, Tab is held
   there (prefsKeydown), no hall key acts while it is open and the
   backdrop takes the pointer. */
var prefsInertRaf = 0;
function openPrefs() {
  layerMoved();
  lastFocus = document.activeElement;
  prefs.hidden = false;
  syncPrefRadios();
  document.addEventListener('keydown', prefsKeydown);
  var first = prefs.querySelector('[role=radio][aria-checked=true]') ||
              prefs.querySelector('button');
  if (first) first.focus();
  cancelAnimationFrame(prefsInertRaf);
  prefsInertRaf = requestAnimationFrame(function () {
    prefsInertRaf = requestAnimationFrame(function () {
      prefsInertRaf = 0;
      if (!prefs.hidden) syncBehind();
    });
  });
}
function closePrefs() {
  cancelAnimationFrame(prefsInertRaf);
  prefsInertRaf = 0;
  layerMoved();
  prefs.hidden = true;
  // Everything comes back as it stood, the open drawer's own reach included.
  syncBehind();
  document.removeEventListener('keydown', prefsKeydown);
  if (lastFocus) lastFocus.focus();
}
/* One gesture opens one layer. The sheet is centred, so the spot the
   button stood on is backdrop the moment it opens, and the second press of
   a double-click shut it again at once. Openers never take a second press. */
prefsBtn.addEventListener('click', function (e) {
  if (e.detail > 1) return;
  openPrefs();
});
$('#prefs-close').addEventListener('click', closePrefs);
/* Only a click that starts and ends on the backdrop closes the sheet. A
   press in the sheet released on the backdrop (or the other way round) is
   dispatched to #prefs, their common ancestor, and used to close it. */
var prefsPress = { down: null, up: null };
prefs.addEventListener('pointerdown', function (e) { prefsPress.down = e.target; });
prefs.addEventListener('pointerup', function (e) { prefsPress.up = e.target; });
prefs.addEventListener('click', function (e) {
  // Only the first click of a gesture: the second press of a double-click
  // on a size key, or on the button that opened the sheet, lands where the
  // sheet no longer is.
  if (e.target === prefs && prefsPress.down === prefs && prefsPress.up === prefs &&
      e.detail <= 1) {
    closePrefs();
  }
});

/* ========================================================================
   Ledger drawer — open/close wiring
   ======================================================================== */
var ledgerBtnEl = $('#ledger-btn');
var ledgerScrimEl = $('#ledger-scrim');

/* A double-click is one act here too. The scrim takes the pointer the moment
   the drawer starts to slide, over the hatch as well, so the second press
   of a double-click on the hatch landed on the scrim and shut the drawer
   while it was still coming in. Neither the hatch nor the scrim takes a
   second press. */
if (ledgerBtnEl) {
  ledgerBtnEl.addEventListener('click', function (e) {
    if (e.detail > 1) return;
    var ledgerEl = $('#ledger');
    if (ledgerEl && ledgerEl.classList.contains('open')) {
      closeLedger();
    } else {
      openLedger();
    }
  });
}

if (ledgerScrimEl) {
  ledgerScrimEl.addEventListener('click', function (e) {
    if (e.detail > 1) return;
    closeLedger();
  });
}
/* The drawer's own knob. closeLedger() hands focus back where the drawer
   was opened from. The drawer stops taking the pointer the moment it shuts,
   so the second press of a double-click fell through to whatever lay
   under the knob (PREFERENCES, from 1280 to 1920 wide), which is why the
   masthead's openers ignore a second press as well. */
var ledgerCloseEl = $('#ledger-close');
if (ledgerCloseEl) ledgerCloseEl.addEventListener('click', function (e) {
  if (e.detail > 1) return;
  closeLedger();
});

/* The medallion hangs outside the plaque's link, over the spine where the
   clipped frame cannot reach, and the holder's gilt rim is the frame round
   the link. Both read as the plaque, so a press on either opens the dispatch
   like the rest of it. The press is handed to the link whole (button,
   modifiers, click count), so a Ctrl, Shift, middle or double click does
   what it does on the card; link.click() carried none of that. */
var plaquesEl = $('#plaques');
function plaqueLinkUnder(e) {
  var li = e.target.closest && e.target.closest('.plaque');
  if (!li || e.target.closest('a.pl-in')) return null;
  return li.querySelector('a.pl-in');
}
function forwardToPlaque(e) {
  var link = plaqueLinkUnder(e);
  if (!link) return;
  link.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true, view: window, detail: e.detail, button: e.button,
    ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey
  }));
}
if (plaquesEl) {
  plaquesEl.addEventListener('click', forwardToPlaque);
  plaquesEl.addEventListener('auxclick', function (e) { if (e.button === 1) forwardToPlaque(e); });
  // Chrome arms its middle-button autoscroll on the press, and the reader's
  // next click was spent ending it.
  plaquesEl.addEventListener('mousedown', function (e) {
    if (e.button === 1 && plaqueLinkUnder(e)) e.preventDefault();
  });
}

/* Escape closes ledger (non-modal; does not fight prefs Escape which is
   bound while prefs is open and removed when it closes). */
document.addEventListener('keydown', function (e) {
  var ledgerEl = $('#ledger');
  var open = ledgerEl && ledgerEl.classList.contains('open');
  // Preferences sits above the drawer; one Escape closes one layer.
  if (!prefs.hidden) return;
  // Tab from the key plate walks on from wherever the reader called it up,
  // as every other key on it does. The plate sits after the hall in the
  // page, so Tab went to the lever and Shift+Tab to the last gate. Putting
  // the plate away hands focus back first; the browser's own Tab (or the
  // drawer's ring below) then moves on from there. A Tab passing through is
  // not a layer key, so a held Tab keeps walking.
  if (e.key === 'Tab' && keyplate && !keyplate.hidden &&
      keyplate.contains(document.activeElement)) {
    var held = layerKey;
    toggleKeyplate(false);
    layerKey = held;
  }
  if (e.key === 'Escape' && open) {
    // The key plate lies over the drawer, so it is the top layer. Handled
    // here in full: the keys handler below used to see the drawer already
    // shut and close the plate on the same press.
    e.preventDefault();
    if (keyplate && !keyplate.hidden) toggleKeyplate(false);
    else closeLedger();
    return;
  }
  if (e.key === 'Tab' && open) {
    // The drawer's own stops, handled in full so Tab never walks out into
    // the hall behind the scrim. The hatch used to lead the ring, but the
    // drawer's head lies over it at every size: the first Tab from the
    // heading put the caret where nobody could see it. The knob, Esc and L
    // all shut the drawer.
    var ring = tabStops(ledgerEl);
    if (!ring.length) return;
    var i = ring.indexOf(document.activeElement);
    e.preventDefault();
    var n = ring.length;
    focusInDrawer(ring[i < 0 ? (e.shiftKey ? n - 1 : 0) : (i + (e.shiftKey ? n - 1 : 1)) % n]);
  }
});

/* The browser brings a focused element into view only until any part of it
   shows, which left the last card of an arrow walk a few pixels under the
   screen with its ring cut. The card's scroll margin covers the ring. The
   knob, the chips and the stamp are the drawer's head, so reaching one of
   them from below scrolls the drawer back to its top: brought only into
   view, each was parked on the screen's top edge with the top of its ring
   cut off and the title plate scrolled away above it. */
function focusInDrawer(n) {
  n.focus({ preventScroll: true });
  if (n.closest('#ledger .l-head, #ledger .l-tools')) $('#ledger').scrollTop = 0;
  else (n.closest('.plaque') || n).scrollIntoView({ block: 'nearest' });
}

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

/* The rotary and the bat toggle answer a press where it lands. Their radios
   are full-height columns laid over the hardware, and the knob sits inside
   the IVORY column and the lever inside REDUCED, so a press on either chose
   the middle legend whatever it pointed at: clicking a knob set to ONYX
   repainted the hall in Ivory. A press on the plate now turns the pointer to
   the detent nearest the press, as a hand would, and a press on the boss,
   which has no side, steps one detent on. The radios stay the keyboard's and
   the screen reader's surface; a keyboard click carries no position. */
/* The rotary's hub is the knob's round cap, the shaft it turns on (the knob
   is hung so the cap sits on the plate's centre, palace-cabinetry.css). It
   used to turn about the middle of its box, which swung the cap round the
   step zone: half the visible boss stepped and the rest turned back or
   skipped a detent. The step zone (9 x --ui) is wider than the cap (6.9). */
var DETENTS = {
  theme: { art: '.p-rotary', hub: '.pk-cap', angles: [-52, 0, 52], values: ['onyx', 'ivory', 'system'] },
  motion: { art: '.p-bat', hub: '.pb-nut', angles: [-38, 0, 38], values: ['full', 'reduced', 'system'] }
};
function detentUnder(group, e) {
  // A keyboard click carries no position.
  return e.detail ? detentAt(group, e.clientX, e.clientY) : null;
}
function detentAt(group, x, y) {
  var d = DETENTS[group.dataset.pref];
  if (!d) return null;
  var art = $(d.art, group), hub = $(d.hub, group);
  if (!art || !hub) return null;
  var a = art.getBoundingClientRect(), h = hub.getBoundingClientRect();
  var cx = h.left + h.width / 2, cy = h.top + h.height / 2;
  var dx = x - cx, dy = y - cy;
  var reach = a.width * 0.46, boss = 9 * uiScale();   // the plate's radius (46 of 100)
  if (d.art === '.p-rotary') { if (dx * dx + dy * dy > reach * reach) return null; }
  else if (x < a.left || x > a.right || y < a.top || y > a.bottom) return null;
  if (dx * dx + dy * dy < boss * boss) {
    var at = d.values.indexOf(group.querySelector('[aria-checked=true]').dataset.value);
    return d.values[(at + 1) % d.values.length];
  }
  // A press below the hub is read as level with it, so the plate's two
  // ends still mean the two ends of the throw.
  var deg = Math.atan2(dx, -Math.min(dy, -boss)) * 180 / Math.PI;
  var best = 0;
  d.angles.forEach(function (g, i) { if (Math.abs(deg - g) < Math.abs(deg - d.angles[best])) best = i; });
  return d.values[best];
}

/* The legend lit under the pointer is the one a press there would pick.
   The columns stand over the hardware, so the column's own hover lit IVORY
   over half the rotary where a press chose ONYX or FOLLOW SYSTEM. Over the
   rotary and the bat the aim is worked out by the press's own maths and
   marked on that radio (data-aim); a mouse only, since a tap has no hover
   and left two legends lit. */
function aimSwitch(group, x, y, over) {
  var v = group && DETENTS[group.dataset.pref] ? detentAt(group, x, y) : null;
  var aim = v ? group.querySelector('[data-value="' + v + '"]') : over;
  Array.prototype.forEach.call(prefs.querySelectorAll('[data-aim]'), function (n) {
    if (n !== aim) n.removeAttribute('data-aim');
  });
  if (aim && group && DETENTS[group.dataset.pref]) aim.setAttribute('data-aim', '');
}
prefs.addEventListener('pointermove', function (e) {
  if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  var over = e.target.closest('[role=radio]');
  // Read at the whole pixel the click will report (Chrome truncates a
  // click's position, not a move's), so a pointer on a detent's border
  // lights the legend the press will pick.
  aimSwitch(over ? over.parentNode : e.target.closest('[data-pref]'),
    Math.floor(e.clientX), Math.floor(e.clientY), over);
});
prefs.addEventListener('pointerleave', function () { aimSwitch(null); });

prefs.addEventListener('click', function (e) {
  // One gesture, one act, as on a gate. The second press of a double-click
  // stepped the bat's nut a second detent, and on ENGRAVING SIZE it landed
  // on whatever the resized sheet had moved under the pointer: a
  // neighbouring key, or the backdrop, which shut the sheet.
  if (e.detail > 1) return;
  var btn = e.target.closest('[role=radio]');
  // The plate also shows between the columns, where no radio is.
  var group = btn ? btn.parentNode : e.target.closest('[data-pref]');
  var turned = group ? detentUnder(group, e) : null;
  if (!btn && !turned) return;
  if (turned && (!btn || turned !== btn.dataset.value)) {
    // Focus follows the choice, not the column the press fell in.
    btn = group.querySelector('[data-value="' + turned + '"]');
    btn.focus({ preventScroll: true });
  }
  var pref = group.dataset.pref;
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
  // The boss now steps from the new detent, so the aim under a still
  // pointer moves on with it.
  if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
    aimSwitch(group, e.clientX, e.clientY, e.target.closest('[role=radio]'));
  }
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
   instant: still one picture, never half and half.
   The flip lands whatever was chosen last. A choice made while the old hall
   is still being captured only retargets the flip on its way: compared
   with data-theme, which that flip had not written yet, a second choice in
   the window was taken as no change, and the hall stayed on the first. */
var themeNext = null;   // what the flip on its way will write, until it lands
var themeFade = null;   // the crossfade while it is on screen
var themeGen = 0;
function resolveTheme() {
  var pref = root.dataset.themePref || 'system';
  var dark = pref === 'onyx' || (pref === 'system' && mq.matches);
  var next = dark ? 'onyx' : 'ivory';
  if ((themeNext || root.dataset.theme) === next) return;
  var pending = themeNext !== null;
  themeNext = next;
  if (pending) return;
  themeBusy = true;
  var gen = ++themeGen;
  var flip = function () {
    root.classList.add('theme-cut');
    root.dataset.theme = themeNext;
    themeNext = null;
  };
  // A newer crossfade started over this one owns the cut now.
  var uncut = function () {
    if (gen === themeGen) root.classList.remove('theme-cut');
  };
  var done = function () {
    if (gen !== themeGen) return;
    themeFade = null;
    uncut();
    themeBusy = false;
    if (afterTheme) { var f = afterTheme; afterTheme = null; f(); }
  };
  if (document.startViewTransition && root.dataset.motion !== 'reduced') {
    var vt = themeFade = document.startViewTransition(flip);
    // The fade is held on its first millisecond until the new hall has been
    // rastered, and the cut is lifted meanwhile. The fade starts at `ready`,
    // before the new hall is drawn, and at 3440 that raster took 300-700ms:
    // the fade ran out on the clock behind it and landed in two or three
    // frames. Held at 1ms the new hall is on screen, too faint to see, so it
    // is rastered, and the 400ms fade then plays in full. Lifting the cut
    // restyles every element in the hall (88ms at 3440, and a 240ms raster
    // after it); lifted after `finished` it froze the hall again once the
    // fade was over (MO-7), so it goes in the frame after `ready`, inside
    // the hold, when the flip is styled and nothing new is seen yet.
    vt.ready.then(function () {
      requestAnimationFrame(uncut);
      var fades = document.getAnimations().filter(function (a) {
        return a.effect && a.effect.pseudoElement &&
          a.effect.pseudoElement.indexOf('::view-transition') === 0;
      });
      fades.forEach(function (a) { a.pause(); a.currentTime = 1; });
      var go = function () {
        clearTimeout(cap);
        fades.forEach(function (a) { if (a.playState === 'paused') a.play(); });
      };
      var cap = setTimeout(go, 1200);
      afterDrawn(go);
    }, uncut);
    // A throw asked for meanwhile still waits for the fade to finish
    // (setWing): its arches would change places inside the picture.
    vt.finished.then(done, done);
    // A second change after the flip, before the fade has begun, skips this
    // transition, and its other promises reject. That is ordinary use of the
    // Appearance control, not an error.
    vt.updateCallbackDone.catch(function () {});
  } else {
    flip();
    void root.offsetWidth;   // the flip's style change happens under the cut
    done();
  }
}
function setThemePref(pref) {
  root.dataset.themePref = pref;
  store('atrium.theme', pref);
  resolveTheme();
}
// Follow-system reacts live with the same crossfade.
if (mq.addEventListener) mq.addEventListener('change', resolveTheme);

/* The crossfade is a picture laid over a live hall, but Chrome hit-tests
   the picture: for as long as it ran, every press landed on <html>, so
   CLOSE, a language or a second theme ignored the click. A press now cuts
   the fade short, and its click is handed to the control under it, with
   its position and count, so the switchgear still reads where it landed. */
var pressThrough = false;
window.addEventListener('pointerdown', function (e) {
  pressThrough = false;
  if (!themeFade || e.target !== root) return;
  themeFade.skipTransition();
  pressThrough = true;
}, true);
window.addEventListener('click', function (e) {
  if (!pressThrough) return;
  pressThrough = false;
  if (e.target !== root) return;   // it reached its control after all
  var to = document.elementFromPoint(e.clientX, e.clientY);
  if (!to || to === root) return;
  e.stopImmediatePropagation();
  var stop = to.closest('button, a[href], [tabindex]');
  if (stop) stop.focus({ preventScroll: true });
  to.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true, view: window, detail: e.detail, button: e.button,
    clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
    ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey
  }));
}, true);

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
      letterNotice(notice, svc);
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
    // An empty string means no tooltip in this language (see vacantName).
    var tip = t(n.dataset.i18nTitle);
    if (tip) n.title = tip; else n.removeAttribute('title');
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
    // Validated as the pre-paint script validates it.
    root.dataset.themePref = (e.newValue === 'onyx' || e.newValue === 'ivory')
      ? e.newValue : 'system';
    resolveTheme();
  } else if (e.key === 'atrium.lang') {
    if ((e.newValue === 'zh' ? 'zh' : 'en') !== lang) setLang(e.newValue);
  } else if (e.key === 'atrium.motion') {
    // Validated as the pre-paint script validates it. Taken as it came, a
    // stray value ("fast") ran the hall on a motion no rule knows, and with
    // no radio checked the Motion group dropped out of the Tab ring.
    root.dataset.motionPref = (e.newValue === 'full' || e.newValue === 'reduced')
      ? e.newValue : 'system';
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

/* Left to right by the slot the stage solved, not by the painted box: a
   box read forces layout, and in the throw it was also the whole-hall
   restyle of the wing flip, paid inside the key handler. */
function litGates() {
  return Array.prototype.slice.call(
    document.querySelectorAll('#gates .gate.active:not(.vacant)'))
    .sort(function (a, b) { return slotX(a) - slotX(b); });
}

/* Every key is a typewriter key of its own: a pair is two keys, a range is
   its first and last key with a gilt dash between (read out as "1 to 3"),
   and the two word keys, ENTER and ESC, are the wide function keys in a
   chrome bezel. They used to be drawn as one capsule per legend, which read
   as web buttons. The plate is a description list, a key and what it does
   per entry, so a screen reader hears each pair together instead of a run
   of loose words. The ruled gutters between the columns are gilt rules
   with a lozenge, reverse-painted on the glass like the rest of the plate. */
function renderKeyplate() {
  if (!keyplate) return;
  var n = litGates().length;
  var rows = [
    [['\u2190', '\u2192'], 'keyGates'],
    [n > 1 ? ['1', '-', String(n)] : ['1'], 'keyJump'],
    [['+' + t('keyEnter')], 'keyOpen'],
    [['W'], 'keyLever'],
    [['L'], 'keyLedger'],
    [['\u2191', '\u2193'], 'keyWalk'],
    [['P'], 'keyPrefs'],
    [['?'], 'keyPlate'],
    [['+ESC'], 'keyEsc'],
  ];
  var list = $('.kp-rows', keyplate);
  list.textContent = '';
  rows.forEach(function (r, i) {
    if (i && i % 2 === 0) {
      var rule = el('div', 'kp-rule');
      rule.setAttribute('aria-hidden', 'true');
      list.appendChild(rule);
    }
    var row = el('div', 'kp-row');
    var dt = el('dt', 'kp-keys');
    r[0].forEach(function (k) {
      if (k === '-') {
        var dash = el('span', 'kp-dash', '\u2013');
        dash.setAttribute('aria-hidden', 'true');
        dt.appendChild(dash);
        dt.appendChild(el('span', 'sr-only', ' ' + t('keyTo') + ' '));
      } else {
        var wide = k.charAt(0) === '+';
        var key = el('kbd', 'kp-key display' + (wide ? ' kp-wide' : ''), wide ? k.slice(1) : k);
        // In the Chinese hall ESC and W are English signage, and 回车 is
        // not: the Chinese face's stroke weight goes on the one key it is.
        if (lang === 'zh' && /[A-Za-z]/.test(key.textContent)) key.lang = 'en';
        dt.appendChild(key);
      }
    });
    row.appendChild(dt);
    row.appendChild(el('dd', 'kp-do', t(r[1])));
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
  // Called up over the open Ledger, the plate stops short of the drawer:
  // laid across it, it covered the chips and the stamp and the focus on them.
  // It stands clear by the band's own margin, the air it keeps on its left:
  // stopped at the drawer's edge, its moulding butted into the drawer's gilt
  // bead and its end clip sat on the bead.
  var drawer = $('#ledger');
  var stop = r.right;
  // (Under 1280px the drawer takes the full width, and the plate lies over it.)
  var edge = drawer && drawer.classList.contains('open')
    ? window.innerWidth - drawer.offsetWidth - r.left : Infinity;
  if (edge - r.left >= 480) stop = Math.min(stop, edge);
  keyplate.style.top = Math.round(r.top) + 'px';
  keyplate.style.left = Math.round(r.left) + 'px';
  keyplate.style.right = Math.round(window.innerWidth - stop) + 'px';
}
/* The plate is a notice, not a dialog. It used to answer only "?" and Esc,
   so a pointer left it standing over the hall. Now any press closes it, on
   the plate or anywhere else, and the press still does what it was for. */
function keyplatePress() { toggleKeyplate(false, true); }

/* The plate arrived without a sound: focus stayed on the gate and nothing
   was announced, so the key reference existed only for the eye. Showing it
   now moves focus to its heading, where a screen reader names the plate and
   can read the keys that follow; closing it by key puts focus back where it
   was. A press elsewhere is the pointer's own business, so it is left to
   go where it lands. If the arch focus came from has since gone out with a
   throw, focus goes to the arch standing in its bay. */
var kpReturn = null, kpReturnX = null;
function toggleKeyplate(show, byPointer) {
  if (!keyplate) return;
  var next = show === undefined ? keyplate.hidden : show;
  if (next === !keyplate.hidden) return;
  layerMoved();
  if (next) {
    renderKeyplate();
    placeKeyplate();
    var ae = document.activeElement;
    kpReturn = ae && ae !== document.body && !keyplate.contains(ae) ? ae : null;
    kpReturnX = kpReturn && kpReturn.classList.contains('gate') ? slotX(kpReturn) : null;
    keyplate.hidden = false;
    document.addEventListener('pointerdown', keyplatePress, true);
    $('.kp-title', keyplate).focus({ preventScroll: true });
    return;
  }
  var had = keyplate.contains(document.activeElement);
  keyplate.hidden = true;
  document.removeEventListener('pointerdown', keyplatePress, true);
  var back = kpReturn, x = kpReturnX;
  kpReturn = kpReturnX = null;
  if (!had || byPointer) return;
  var usable = back && back.isConnected && !back.closest('[inert]') &&
    (!back.checkVisibility || back.checkVisibility());
  // A return that has gone and was no gate (a control now inert or hidden)
  // falls back to the open drawer's heading, else the hatch. Left on the
  // plate's heading as it hid, focus fell to <body> and the next arrow
  // started the walk over from the first gate.
  if (back && !usable) {
    var drawerOpen = $('#ledger').classList.contains('open');
    back = (x !== null && nearestLit(x)) || $(drawerOpen ? '#ledger-title' : '#ledger-btn');
  }
  if (back) back.focus({ preventScroll: true });
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

/* A held key acts once when it opens or shuts a layer, as W already did for
   the lever. Held L flashed the drawer open and shut at the key-repeat rate
   and held ? did the same to the plate. Held Enter on the drawer's knob shut
   it, then the repeats landed on whatever took focus next: the hatch opened
   the drawer again, a gate would have opened its service. Whatever layer a
   key moved, its repeats are dropped until it comes up. */
var keyHeld = null;   // the key down now, by code
var layerKey = null;  // that key, once it has moved a layer
document.addEventListener('keydown', function (e) {
  if (!e.repeat) { keyHeld = e.code; layerKey = null; return; }
  if (e.code === layerKey) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
document.addEventListener('keyup', function (e) {
  if (e.code === keyHeld) keyHeld = null;
  if (e.code === layerKey) layerKey = null;
}, true);
function layerMoved() { if (keyHeld) layerKey = keyHeld; }

/* The plate lies on the band, so a caret arriving on the band would sit
   under it. The notice gives way to the reader. */
var tickerEl = $('#ticker');
if (tickerEl) tickerEl.addEventListener('focusin', function () {
  if (!keyplate || keyplate.hidden) return;
  // Tab passing through is not a layer key: a held Tab walks on.
  var held = layerKey;
  toggleKeyplate(false);
  layerKey = held;
});

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
  // The plate says ENTER opens it, and every other key on it works the
  // hall from where it was called up; Enter did nothing, since a heading
  // has no action of its own. The plate goes away, handing focus back, and
  // the press goes to what it handed focus to. A click from here carries no
  // pointer detail, so a DARK gate still pins its card and says it.
  if (k === 'Enter' && keyplate && !keyplate.hidden && tgt && keyplate.contains(tgt)) {
    e.preventDefault();
    toggleKeyplate(false);
    var to = document.activeElement;
    if (to && to.matches && to.matches('a[href], button, [role=switch]')) to.click();
    return;
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
      focusInDrawer(links[next]);
      return;
    }
    if (k === 'l' || k === 'L') {
      e.preventDefault();
      closeLedger();
      return;
    }
    // The plate lists W, P and the digits with the drawer open, and they
    // used to do nothing there. W throws the lever behind the drawer and P
    // lays Preferences over it (one Esc then closes one layer). A digit is
    // a walk to a gate, so the drawer shuts first.
    if (/^[1-9]$/.test(k) && +k <= litGates().length) closeLedger();
    else if (!/^[wWpP]$/.test(k)) return;
  }

  var gates = litGates();
  var ae = document.activeElement;
  // On the key plate's heading the keys still work the hall, counted from
  // wherever the reader called the plate up.
  if (keyplate && ae && keyplate.contains(ae)) ae = kpReturn && kpReturn.isConnected ? kpReturn : document.body;
  var onGate = gates.indexOf(ae);
  // Mid-throw, focus can still be on the arch sinking out of its bay (it
  // hands over when the other one rises). A key pressed then counts from
  // that bay: it used to be dropped, since the arch was not a lit one.
  if (onGate < 0 && ae && ae.classList && ae.classList.contains('receded')) {
    var bayArch = nearestLit(slotX(ae));
    onGate = bayArch ? gates.indexOf(bayArch) : -1;
  }
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
    // Focus on an arch goes with the throw to the arch rising into the
    // same bay (layoutStage), so nothing is aimed from here. From anywhere
    // but an arch or the lever, the new wing is said (sayWing).
    var real = document.activeElement;
    if (!(real === lever || (real && real.classList && real.classList.contains('gate')))) wingSay = true;
    toggleWing();
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
renderLedger();       // the ghosts, and a stamp that says the Ledger is being read
buildRosetteKnurl();
buildDesk();
buildFloorInlay();
// The two cases are furniture before they are instruments: carcass, crest,
// lamp and door glass go up first, then the dials go in behind the glass.
window.Cabinet.dressCase($('#works'));
window.Cabinet.dressCase($('#almanac'));
renderWorks();      // the dials stand engraved before the first reading
buildAisles();
renderAlmanac();    // the plate is engraved before the first forecast lands
// Their first readings are part of the hall the entrance waits for.
var boardsRead = [startWorks(), startAlmanac()];
// Seed the drive: without it the first throw would start from 0 whatever
// the wing, and a Bureau hall's first throw would have nowhere to go.
setDrive(root.dataset.wing === 'bureau' ? 1 : 0);
lever.setAttribute('aria-checked', String(root.dataset.wing === 'bureau'));

/* The marquee's chaser lives with the marquee's look, in room.js. */

// The first poll builds the hall: the registry and the readings are asked
// for together, the gates go up as soon as the registry lands, and a hub
// that does not answer is said to be gone when the first round gives up.
// The boot used to ask for the registry alone and then again with the rest,
// so a hub that took the connection and hung left the hall silent for two
// fetch timeouts, no gates, a blank band and an empty live region.
var hallBuilt = refresh();

if (root.dataset.entered === 'no') {
  playEntrance(Promise.all([hallBuilt].concat(boardsRead)).catch(function () {}));
}

hallBuilt.then(function () {
  // Deep links run regardless of how the boot fetch fared. ?ledger=1 is the
  // debug-only twin of ?prefs=1 — the drawer is the one surface a headless
  // screenshot cannot reach, since opening it takes a click.
  var q = new URLSearchParams(location.search);
  if (q.get('prefs') === '1') openPrefs();
  if (q.get('ledger') === '1') openLedger();
});

})();
