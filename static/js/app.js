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
    allDark: 'The hall is dark — no services reachable.',
    today: 'TODAY', earlier: 'EARLIER',
    empty: 'No dispatches',
    darkNotice: 'Dark — launch with: {hint}',
    lampOpen: 'Reachable', lampDark: 'Offline', lampChecking: 'Checking',
    justNow: 'just now', minAgo: '{n} min ago', hAgo: '{n} h ago', dAgo: '{n} d ago',
    linesOpen: 'LINES OPEN {n}/{m}',
    'desc.autopilot': 'Season anime, fetched and shelved while you sleep.',
    'desc.groundstation': 'Workshop mods tracked, updates caught in orbit.',
    'desc.outreach': "The day's introductions, briefed and dealt.",
    'desc.pressroom': 'The world overnight, set in type by morning.',
    'desc.fallback': 'A newly registered hall.',
    'stat.airing': '{n} AIRING TODAY', 'stat.watching': '{n} WATCHING',
    'stat.pending': '{n} UPDATES PENDING', 'stat.mods': '{n} MODS TRACKED',
    'stat.queue': 'QUEUE {done}/{total}', 'stat.invited': 'SENT {n}/{target}',
    'stat.stories': '{n} STORIES · {m} SECTIONS', 'stat.stale': 'EDITION STALE',
    'note.qb_down': 'qBittorrent unreachable — downloads paused',
    'note.daemon_stale': 'Sync daemon looks stalled',
    'note.fallback': 'Reading state files directly (server down)',
    'k.anime.premiere': 'Premiered',
    'k.anime.premiere.promoted': 'Premiered — auto-subscribed',
    'k.anime.completed': 'Finished — all {eps} episodes watched',
    'k.anime.completed.noeps': 'Finished — marked as watched',
    'k.anime.landed': 'Episode {ep} shelved · {cour}',
    'k.anime.landed.noep': 'New episode shelved · {cour}',
    'k.anime.subscribed': 'Now subscribed · {group}',
    'k.anime.subscribed.nogroup': 'Now subscribed',
    'k.anime.unresolved': 'No release group matched yet',
    'k.anime.grace': 'Waiting for the preferred group',
    'k.mods.updated': 'Workshop update · {game}',
    'k.mods.removed': 'Delisted from the Workshop',
    'k.mods.banned': 'Banned on the Workshop',
    'k.outreach.queue_ready.head': 'Daily queue ready',
    'k.outreach.queue_ready': '{n} introductions briefed',
    'k.outreach.progress.head': 'Drafting the queue',
    'k.outreach.progress': '{done} of {total} briefed',
    'k.outreach.invites.head': 'Invitations today',
    'k.outreach.invites': '{n} of {target} sent',
    'k.outreach.error.head': 'Drafter hit an error',
    'k.outreach.error': 'Check the Outreach Desk',
    'k.press.digest_ready.head': "Today's edition is out",
    'k.press.digest_ready': '{stories} stories across {sections} sections',
    worksSub: 'Readings from the engine room',
    wkCpu: 'PROCESSOR', wkMem: 'MEMORY', wkGpu: 'GRAPHICS', wkNet: 'TRAFFIC',
    wkHours: 'HOURS RUN', wkDisk: 'STORE', wkFree: '{n} FREE',
    wkNoReading: 'NO READING',
    wkCores: '{n} cores', wkOf: '{a} of {b} GB',
    wkDown: '{d} down · {u} up MB/s',
    bulletinSub: "Today's dispatches",
    bulletinEmpty: 'The case is empty',
    openLedger: 'OPEN THE LEDGER',
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
    ariaLever: 'Mode lever: off = Salon, the play wing; on = Bureau, the work wing',
    ariaDesk: 'Signal desk — mode lever',
    ariaFilter: 'Filter dispatches', ariaClose: 'Close',
    ariaGates: 'Gates', ariaLedger: 'Ledger — dispatch timeline',
    ariaWorks: 'The works — live readings from this machine',
    ariaBulletin: 'Bulletin — latest dispatches',
    worksTitle: 'The works', bulTitle: 'Bulletin',
    salonWing: 'Play wing', bureauWing: 'Work wing',
    ledgerBtnLabel: 'LEDGER',
    unreadCount: '{n} new dispatches', unreadCountOne: '1 new dispatch'
  },
  zh: {
    subtitle: '大通廊',
    preferences: '偏好设置',
    ledger: '消息总台',
    chipAll: '全部',
    allDark: '大厅熄灯——没有可达的服务。',
    today: '今日', earlier: '更早',
    empty: '暂无快讯',
    darkNotice: '未点亮——用此脚本启动：{hint}',
    lampOpen: '已点亮', lampDark: '离线', lampChecking: '检查中',
    justNow: '刚刚', minAgo: '{n} 分钟前', hAgo: '{n} 小时前', dAgo: '{n} 天前',
    linesOpen: '线路 {n}/{m}',
    'desc.autopilot': '当季新番，睡着也替你追完入库。',
    'desc.groundstation': '创意工坊 Mod 尽在轨道监测之中。',
    'desc.outreach': '今日的引荐名单，已备好草稿待发。',
    'desc.pressroom': '昨夜的世界，天亮前已排版付印。',
    'desc.fallback': '新登记的厅室。',
    'stat.airing': '今日 {n} 部放送', 'stat.watching': '在看 {n} 部',
    'stat.pending': '{n} 个更新待装', 'stat.mods': '追踪 {n} 个 MOD',
    'stat.queue': '队列 {done}/{total}', 'stat.invited': '已发 {n}/{target}',
    'stat.stories': '{n} 条 · {m} 栏', 'stat.stale': '早报未更新',
    'note.qb_down': 'qBittorrent 不可达——下载已暂停',
    'note.daemon_stale': '同步守护进程疑似卡住',
    'note.fallback': '服务器离线——正在直读状态文件',
    'k.anime.premiere': '开播',
    'k.anime.premiere.promoted': '开播——已自动订阅',
    'k.anime.completed': '完结——全 {eps} 话看完',
    'k.anime.completed.noeps': '完结——已标记看过',
    'k.anime.landed': '第 {ep} 话已入库 · {cour}',
    'k.anime.landed.noep': '新一话已入库 · {cour}',
    'k.anime.subscribed': '已订阅 · {group}',
    'k.anime.subscribed.nogroup': '已订阅',
    'k.anime.unresolved': '尚未匹配到字幕组源',
    'k.anime.grace': '等待首选字幕组中',
    'k.mods.updated': '创意工坊更新 · {game}',
    'k.mods.removed': '已从创意工坊下架',
    'k.mods.banned': '已被创意工坊封禁',
    'k.outreach.queue_ready.head': '今日邀约队列已就绪',
    'k.outreach.queue_ready': '{n} 位候选已备好草稿',
    'k.outreach.progress.head': '草稿撰写中',
    'k.outreach.progress': '已完成 {done}/{total}',
    'k.outreach.invites.head': '今日邀请',
    'k.outreach.invites': '已发出 {n}/{target}',
    'k.outreach.error.head': '草稿引擎出错',
    'k.outreach.error': '请到 Outreach Desk 查看',
    'k.press.digest_ready.head': '今日晨报已出版',
    'k.press.digest_ready': '{sections} 个版面 · {stories} 条',
    worksSub: '本机运转实况',
    wkCpu: '处理器', wkMem: '内存', wkGpu: '显卡', wkNet: '网络',
    wkHours: '已运转', wkDisk: '存储', wkFree: '余 {n}',
    wkNoReading: '无读数',
    wkCores: '{n} 核', wkOf: '{a} / {b} GB',
    wkDown: '下 {d} · 上 {u} MB/s',
    bulletinSub: '今日快讯',
    bulletinEmpty: '橱窗暂空',
    openLedger: '打开消息总台',
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
    ariaLever: '模式拨杆：关＝沙龙翼（娱乐），开＝事务翼（工作）',
    ariaDesk: '信号台——模式拨杆',
    ariaFilter: '筛选快讯', ariaClose: '关闭',
    ariaGates: '门廊', ariaLedger: '账本 — 派发时间轴',
    ariaWorks: '机房仪表 —— 本机实时读数',
    ariaBulletin: '布告栏 —— 最新快讯',
    worksTitle: '机房仪表', bulTitle: '布告栏',
    salonWing: '娱乐翼 · 沙龙', bureauWing: '工作翼 · 事务所',
    ledgerBtnLabel: '账本',
    unreadCount: '{n} 条新消息', unreadCountOne: '1 条新消息'
  }
};

var lang = root.lang === 'zh' ? 'zh' : 'en';
function t(key, params) {
  var s = STR[lang][key];
  if (s === undefined) s = STR.en[key];
  if (s === undefined) return key;
  return s.replace(/\{(\w+)\}/g, function (_, k) {
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
var watermark = +(store('atrium.lastVisit') || 0);
var plaqueEls = {};   // dispatch id -> element (re-polls never re-animate)
var chipFilter = 'all';   // session-only, resets to ALL on every load (R11)
/* Ledger drawer state */
var ledgerOpening = false;    // true only during openLedger() render pass
var cascadeIndex = 0;         // counter for --ci stamps in cascading pass
var KNOWN_SIGILS = { autopilot: 1, groundstation: 1, outreach: 1, pressroom: 1 };

window.addEventListener('pagehide', function () {
  // Only a Ledger that was actually open counts as read. Stamping the
  // watermark on every unload marked every dispatch read whether or not the
  // drawer was ever opened, so the unread signal could not survive a reload —
  // which is the one thing a notification dot has to do.
  var drawer = document.getElementById('ledger');
  if (!drawer || !drawer.classList.contains('open')) return;
  store('atrium.lastVisit', String(Date.now()));
});

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
    if (e && e.preventDefault) e.preventDefault();
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

  // ---- quadrant plate (static art) — pivot at (180, 212) ----
  var q = $('.quadrant', desk);
  var qp = function (r, deg) {
    var a = deg * Math.PI / 180;
    return (180 + r * Math.sin(a)).toFixed(1) + ' ' + (212 - r * Math.cos(a)).toFixed(1);
  };
  q.appendChild(svgEl('path', { d:
    'M ' + qp(148, -22) + ' A 148 148 0 0 1 ' + qp(148, 22) +
    ' L ' + qp(130, 22) + ' A 130 130 0 0 0 ' + qp(130, -22) + ' Z' }, 'q-plate'));
  q.appendChild(svgEl('path', { d:
    'M ' + qp(140, -19) + ' A 140 140 0 0 1 ' + qp(140, 19) }, 'q-face'));
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
  // painted static contact shadow under the gear-well aperture
  q.appendChild(svgEl('rect', { x: 92, y: 206, width: 176, height: 4 }, 'q-shadow'));
  // steam vent pipe + collars + mouth
  q.appendChild(svgEl('rect', { x: 263.5, y: 112, width: 11, height: 90 }, 'q-pipe'));
  q.appendChild(svgEl('rect', { x: 260.5, y: 119, width: 17, height: 2.5 }, 'q-pipe'));
  q.appendChild(svgEl('rect', { x: 260.5, y: 126, width: 17, height: 2.5 }, 'q-pipe'));
  q.appendChild(svgEl('ellipse', { cx: 269, cy: 112, rx: 5.5, ry: 2 }, 'q-slot'));

  // Base flange plate (static — does not rotate with lever)
  q.appendChild(svgEl('rect', { x: 155, y: 208, width: 50, height: 8, rx: 1 }, 'lv-flange'));
  [159, 165, 175, 181].forEach(function (cx) {
    q.appendChild(svgEl('circle', { cx: cx, cy: 212, r: 1.4 }, 'lv-fbolt'));
  });
  // Two-layer floor gaiter (replaces the old q-slot rect)
  q.appendChild(svgEl('rect', { x: 162, y: 200, width: 36, height: 9, rx: 3 }, 'q-slot'));
  q.appendChild(svgEl('rect', { x: 163, y: 201, width: 34, height: 7, rx: 2.5 }, 'lv-gaiter'));

  // Static gear-A shadow ellipse (on quadrant, never on the mover)
  // ax=58 in well coords; well is at left:50%-88px, so in the 360x220
  // quadrant space the center is near (180,66). We offset +34px downward
  // for the contact shadow.
  q.appendChild(svgEl('ellipse', { cx: 180, cy: 100, rx: 36, ry: 8, opacity: 0.5 }, 'q-shadow ga-shadow'));

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
  var ax = 58, ay = 66;                        // gearA center in the well
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

/* Gates are absolutely positioned, so DOM order is free — keep it
   active-wing-first so the tab order is active → receded in both wings. */
function gateDomOrder() {
  var wing = root.dataset.wing;
  return services.slice().sort(function (a, b) {
    var aw = a.wing === wing ? 0 : 1;
    var bw = b.wing === wing ? 0 : 1;
    return aw - bw || a.order - b.order;
  });
}

function renderGates() {
  var wrap = $('#gates');
  wrap.textContent = '';
  gateDomOrder().forEach(function (svc, i) {
    var a = el('a', 'gate');
    a.id = 'gate-' + svc.id;
    a.href = svc.url;
    a.dataset.service = svc.id;
    a.dataset.state = 'checking';
    a.style.setProperty('--gi', String(i));
    a.setAttribute('aria-label', svc.name);

    // 3D chain: pose (static wing tilt) > shell (pointer parallax) > flat
    // children — the intra-gate z-index stack survives inside the shell.
    var pose = el('div', 'g-pose');
    var shell = el('div', 'g-shell');
    shell.appendChild(el('div', 'g-back'));
    shell.appendChild(svgClone('frame', '0 0 300 570', 'gate-frame'));

    var face = el('div', 'face');
    // The gate wears the service's own mark — the same one its favicon, its
    // taskbar tile and its own masthead show. One identity per service.
    var sig = KNOWN_SIGILS[svc.sigil] ? svc.sigil : null;
    face.appendChild(sig
      ? svgUse('sigil mark', '0 0 96 96', '#mark-' + sig)
      : svgUse('sigil', '0 0 96 96', '#sig-fallback'));
    face.appendChild(el('h3', 'g-name display', svc.name));
    face.appendChild(el('p', 'g-desc', t(descKey(svc))));
    var stat = el('div', 'g-stat');
    stat.appendChild(el('span', 'num-roll num', ''));
    face.appendChild(stat);
    face.appendChild(el('div', 'g-addr addr', svc.addr));
    var lamp = el('div', 'g-lamp');
    lamp.appendChild(el('span', 'lamp-d'));
    lamp.appendChild(el('span', 'lamp-t display', '…'));
    face.appendChild(lamp);
    shell.appendChild(face);

    shell.appendChild(el('div', 'g-veil'));
    shell.appendChild(el('div', 'sheen'));
    // Polished-floor reflection: a second frame clone, flipped and masked.
    var mirror = el('div', 'g-mirror');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.appendChild(svgClone('', '0 0 300 570', 'gate-frame'));
    shell.appendChild(mirror);
    pose.appendChild(shell);
    a.appendChild(pose);
    // The launch-hint notice stays screen-flat, outside the tilt chain.
    var notice = el('div', 'g-notice');
    notice.hidden = true;
    a.appendChild(notice);

    a.addEventListener('click', function (e) { gateClick(e, a, svc); });
    wrap.appendChild(a);
  });
  layoutStage(true);
  applyStatuses();
  applyStats();
}

/* A future registry entry with no dictionary string falls back to the
   generic description instead of rendering the raw key. */
function descKey(svc) {
  var key = 'desc.' + svc.desc_key;
  return STR.en[key] !== undefined ? key : 'desc.fallback';
}

function gateClick(e, a, svc) {
  e.preventDefault();
  if (a.dataset.state === 'dark') {
    var n = $('.g-notice', a);
    n.textContent = t('darkNotice', { hint: svc.launch_hint || svc.url });
    n.hidden = !n.hidden;
    return;
  }
  a.classList.add('flash');
  setTimeout(function () { a.classList.remove('flash'); }, 180);
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
  var gateW = first ? first.offsetWidth : 260;
  var active = services.filter(function (s) { return s.wing === wing; });
  var receded = services.filter(function (s) { return s.wing !== wing; });
  var spacing = gateW * 1.16;

  /* The clock holds the axis: active gates split evenly to either side of the
     niche rather than straddling the centre. With an odd count the extra gate
     goes stage-left, which keeps the composition weighted like a facade
     instead of drifting. The niche is measured, not assumed, so a narrow
     viewport that shrinks the dial pulls the gates in with it. */
  var clock = $('#clock');
  var half = clock ? clock.offsetWidth / 2 + gateW * 0.10 : 0;
  var left = Math.ceil(active.length / 2);

  active.forEach(function (svc, i) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    var onLeft = i < left;
    var rank = onLeft ? (left - 1 - i) : (i - left);
    var x = (onLeft ? -1 : 1) * (half + gateW / 2 + rank * spacing);
    a.classList.add('active'); a.classList.remove('receded');
    // Depth order is set here, not left to DOM order. The gates are absolutely
    // positioned siblings, so without an explicit z-index the later ones in
    // markup paint on top — and a gate on its way out to the flank sweeps
    // straight across the pair coming forward, briefly eclipsing them. Setting
    // it at the start of the move rather than the end means the gate that is
    // about to recede drops behind before it travels.
    a.style.zIndex = '3';
    a.style.setProperty('--slot-x', x + 'px');
    a.style.setProperty('--slot-s', '1');
    // Gates flanking a centrepiece turn a few degrees toward it — the wall
    // reads as a shallow apse rather than three flat panels.
    a.style.setProperty('--side', onLeft ? '0.55' : '-0.55');
    // Receding gates lead by 80ms; each group cascades at 60ms.
    a.style.setProperty('--slot-delay', initial ? '0ms' : (80 + i * 60) + 'ms');
  });
  // Flanks tuck just outside the outermost arch — NOT at the stage's own
  // edge. With the aisles open the stage column is much wider than the
  // triptych standing in it, and an edge-anchored flank would drift across
  // the bays and moor itself against a board.
  var outermost = half + gateW / 2 + Math.max(0, left - 1) * spacing;
  // A flank tucks BEHIND the outer arch; it must never end up UNDER it. On a
  // narrow stage the 0.62 flank is wider than the clear column beside the
  // triptych and half its lettering disappears, which stops reading as depth
  // and starts reading as a bug. Give it the room that is actually there.
  // outermost is the outer arch's CENTRE, so its edge is half a gate on.
  //
  // The room is short by a fixed AIR gap as well. Sized to the bare
  // remainder, the flank grows until it abuts the arch in front of it, and
  // two arches sharing an edge read as one torn shape rather than as two
  // planes at different depths — the separation is what carries the
  // recession, so it is reserved before the flank is sized, not hoped for.
  var air = gateW * 0.14;
  var room = W / 2 - (outermost + gateW / 2) - air;
  var flankS = Math.max(0.34, Math.min(0.62, room / gateW));
  var edge = Math.min(W / 2 - gateW * flankS / 2,
                      outermost + spacing * 0.86);
  receded.forEach(function (svc, i) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    a.classList.add('receded'); a.classList.remove('active');
    // Behind the active pair for the whole journey, not just on arrival.
    a.style.zIndex = '1';
    // Alternate flanks; extra flankmates on a side step inward so they
    // never stack exactly on top of each other.
    var side = (receded.length === 1) ? 1 : (i % 2 === 0 ? -1 : 1);
    var rank = Math.floor(i / 2);
    a.style.setProperty('--slot-x', (side * (edge - rank * gateW * 0.5)) + 'px');
    a.style.setProperty('--slot-s', flankS.toFixed(3));
    a.style.setProperty('--slot-delay', initial ? '0ms' : (i * 60) + 'ms');
    a.style.setProperty('--side', String(side));   // triptych inward tilt
  });
  // How far the composition actually reaches from the axis — the flanks at
  // 0.62 scale included. The bays are cut against THIS, not against the
  // stage column: the column is far wider than the triptych standing in it,
  // and measuring the column would leave the widest stretch of bare wall
  // (the one between the outermost arch and the boards) unarticulated.
  triptychHalf = Math.max(
    outermost + gateW / 2,
    receded.length ? edge + gateW * flankS / 2 : 0
  );
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

/* One pilaster: stepped capital, fluted shaft, plinth block. */
function pilaster(x) {
  var d = el('div', 'pilaster');
  d.style.left = x + 'px';
  var cap = svgEl('svg', { viewBox: '0 0 40 26', 'aria-hidden': 'true' }, 'pil-cap');
  cap.appendChild(svgEl('path',
    { d: 'M0 0 H40 V7 H36 V14 H34 V26 H6 V14 H4 V7 H0 Z' }));
  var shaft = el('div', 'pil-shaft');
  var base = svgEl('svg', { viewBox: '0 0 40 22', 'aria-hidden': 'true' }, 'pil-base');
  base.appendChild(svgEl('path',
    { d: 'M6 0 H34 V8 H36 V15 H40 V22 H0 V15 H4 V8 H6 Z' }));
  d.appendChild(cap); d.appendChild(shaft); d.appendChild(base);
  return d;
}

/* One sconce: bracket, stepped shell, a flame, and the pool it throws. */
function sconce(x) {
  var d = el('div', 'sconce');
  d.style.left = x + 'px';
  d.appendChild(el('div', 'sc-pool'));
  var svg = svgEl('svg', { viewBox: '0 0 46 56', 'aria-hidden': 'true' }, 'sc-body');
  svg.appendChild(svgEl('path', { d: 'M23 3 V16' }, 'sc-bracket'));
  svg.appendChild(svgEl('path', { d: 'M23 8 L28 25 H18 Z' }, 'sc-flame'));
  svg.appendChild(svgEl('path', { d: 'M8 50 L13 25 H33 L38 50 Z' }, 'sc-shell'));
  svg.appendChild(svgEl('path', { d: 'M11 39 H35 M12.6 32 H33.4' }, 'sc-step'));
  svg.appendChild(svgEl('rect',
    { x: '17', y: '50', width: '12', height: '4' }, 'sc-shell'));
  d.appendChild(svg);
  return d;
}

/* Lay a rhythm of bays across one clear stretch of wall, a pilaster at each
   end. Returns how many bays it used. */
function fillSpan(node, x0, x1, firstBay) {
  var u = uiScale();
  var w = x1 - x0;
  if (w < 40 * u) return 0;
  var n = Math.max(1, Math.round(w / (300 * u)));
  var bay = w / n;
  for (var i = 0; i <= n; i++) node.appendChild(pilaster(x0 + i * bay));
  if (w < 90 * u) return 0;   // too tight to light or to letter
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
  fillWall(wr, rw, boardHole($('#bulletin'), axis + reach), used + 1);
  sizeFloor();
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
  var add = function (d, cls) { svg.appendChild(svgEl('path', { d: d }, cls)); };

  // Outer border course: 64 setts, tone alternating.
  for (var i = 0; i < 64; i++) {
    add(ringSeg(C, C, 428, 470, (i / 64) * TAU, ((i + 1) / 64) * TAU),
        i % 2 ? 'st-b' : 'st-a');
  }
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 470, fill: 'none' }, 'st-strip'));
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 428, fill: 'none' }, 'st-strip'));

  // Two fields, not one. A single radial fan is a paper doily; a real
  // medallion is banded, and it is the CONCENTRIC break that stops the eye
  // spinning. Outer band on 32 divisions, inner field on 16, so the two
  // courses are visibly different work rather than the same wedge twice.
  [[336, 420, 32], [196, 330, 16]].forEach(function (band, bi) {
    for (var w = 0; w < band[2]; w++) {
      var seg = svgEl('path', {
        d: ringSeg(C, C, band[0], band[1], (w / band[2]) * TAU - Math.PI / 2,
                   ((w + 1) / band[2]) * TAU - Math.PI / 2)
      }, (w % 2 ? 'st-a' : 'st-b'));
      // No two slabs of the same stone come out of the same block.
      seg.setAttribute('opacity',
        (0.84 + hash01(w * 7 + bi * 91 + 3) * 0.16).toFixed(3));
      svg.appendChild(seg);
    }
  });
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 333, fill: 'none' }, 'st-strip'));
  // Eight bronze points laid OVER both fields: the star is cast metal set
  // into the stone, which is what gives the medallion an axis and what the
  // hall's own compass bearing hangs on.
  for (var k = 0; k < 8; k++) {
    var ang = (k / 8) * TAU - Math.PI / 2;
    var R = k % 2 === 0 ? 412 : 322, spread = k % 2 === 0 ? 0.068 : 0.05;
    svg.appendChild(svgEl('polygon', {
      points: [C + Math.cos(ang) * R, C + Math.sin(ang) * R,
               C + Math.cos(ang + spread) * 170, C + Math.sin(ang + spread) * 170,
               C + Math.cos(ang - spread) * 170, C + Math.sin(ang - spread) * 170].join(' ')
    }, k % 2 ? 'st-c' : 'st-bronze'));
  }
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 420, fill: 'none' }, 'st-hair'));
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 196, fill: 'none' }, 'st-strip'));

  // Tessera ring, then the bronze boss with its own low relief.
  for (var t = 0; t < 32; t++) {
    add(ringSeg(C, C, 150, 186, (t / 32) * TAU, ((t + 0.62) / 32) * TAU),
        t % 4 === 0 ? 'st-gold' : 'st-c');
  }
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 142 }, 'st-boss'));
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 142, fill: 'none' }, 'st-strip'));
  var star = [];
  for (var s = 0; s < 16; s++) {
    var sa = (s / 16) * TAU - Math.PI / 2, sr = s % 2 ? 46 : 116;
    star.push((C + Math.cos(sa) * sr).toFixed(1) + ',' + (C + Math.sin(sa) * sr).toFixed(1));
  }
  svg.appendChild(svgEl('polygon', { points: star.join(' ') }, 'st-bronze'));
  svg.appendChild(svgEl('circle', { cx: C, cy: C, r: 30 }, 'st-gold'));
  host.appendChild(svg);

  buildFloorRoundels();
  buildTerrazzo();
}

/* A hall floor is not one medallion and 2500px of blank stone: the aisles
   get their own smaller roundels so the terrazzo carries a rhythm the whole
   way across. Square-in-circle, a different construction from the medallion
   so the floor reads as a SET of inlays rather than one motif stamped three
   times - and cut from the same two stones, for the same reason.
   Placed in PLANE space, which is 204% of the screen wide and shrinks
   outward from the axis by the perspective divide. At the roundels' own
   depth that works out to x_screen = 0.5 + (p - 0.5) * 1.58, so 30/70 of
   the plane lands on the aisle axes at roughly 22/78 of the screen. */
function buildFloorRoundels() {
  var plane = $('.fl-plane');
  if (!plane) return;
  var TAU = Math.PI * 2;
  [30, 70].forEach(function (pct, i) {
    var d = el('div', 'fl-round');
    d.style.left = pct + '%';
    var r = svgEl('svg', { viewBox: '0 0 400 400', 'aria-hidden': 'true' });
    for (var j = 0; j < 24; j++) {
      r.appendChild(svgEl('path',
        { d: ringSeg(200, 200, 152, 190, (j / 24) * TAU, ((j + 1) / 24) * TAU) },
        j % 2 ? 'st-b' : 'st-a'));
    }
    r.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 190, fill: 'none' }, 'st-strip'));
    r.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 152, fill: 'none' }, 'st-strip'));
    r.appendChild(svgEl('rect',
      { x: 62, y: 62, width: 276, height: 276,
        transform: 'rotate(' + (i ? -45 : 45) + ' 200 200)' }, 'st-c'));
    r.appendChild(svgEl('rect', { x: 92, y: 92, width: 216, height: 216 }, 'st-b'));
    r.appendChild(svgEl('rect',
      { x: 92, y: 92, width: 216, height: 216, fill: 'none' }, 'st-hair'));
    for (var k = 0; k < 8; k++) {
      var a = (k / 8) * TAU;
      r.appendChild(svgEl('polygon', {
        points: [200 + Math.cos(a) * 138, 200 + Math.sin(a) * 138,
                 200 + Math.cos(a + 0.15) * 42, 200 + Math.sin(a + 0.15) * 42,
                 200 + Math.cos(a - 0.15) * 42, 200 + Math.sin(a - 0.15) * 42].join(' ')
      }, k % 2 ? 'st-a' : 'st-c'));
    }
    r.appendChild(svgEl('circle', { cx: 200, cy: 200, r: 34 }, 'st-gold'));
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
  Array.prototype.forEach.call(document.querySelectorAll('#gates .gate'),
  function (g) {
    var r = g.getBoundingClientRect();
    if (r.width > 4) {
      seen.push({ dx: (r.left + r.width / 2) / W - 0.5, hw: r.width / W / 2,
                  lit: g.classList.contains('active') });
    }
  });
  // The clock, and the two aisle cases: everything hanging on the wall is in
  // the floor, or the flanks read as dry stone next to a wet middle.
  [['#clock', true, true], ['#works', false, false], ['#bulletin', false, false]]
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
  return d ? d + 'd ' + pad2(h) + 'h' : h ? h + 'h ' + pad2(m) + 'm' : m + 'm';
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
           text: d.down_mbs.toFixed(1) + ' ↓  ' + d.up_mbs.toFixed(1) + ' ↑',
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
    $('.wk-read', cell).textContent = r ? r.text : t('wkNoReading');
    cell.title = t(d.name) + (r && r.title ? ' — ' + r.title : '');
  });
  var tape = $('#wk-tape');
  if (!tape) return;
  var hours = tape.querySelector('[data-strip="hours"] .wk-sval');
  if (hours) hours.textContent = runFor(works && works.hub_uptime_s);
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

/* ----- The BULLETIN ------------------------------------------------------ */
var BULLETIN_SLOTS = 4;

function renderBulletin() {
  var box = $('#bul-notes');
  if (!box) return;
  box.textContent = '';
  // The case shows the hall's own feed: it ignores the lever and the Ledger
  // chips exactly as the ticker does (R11).
  var shown = feed.slice(0, BULLETIN_SLOTS);
  shown.forEach(function (d) {
    var h = headline(d);
    var a = el('a', 'bd-note' + (d.ts > watermark ? ' new' : '') + (h.warn ? ' warn' : ''));
    a.setAttribute('role', 'listitem');
    a.href = d.url;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.open(d.url, 'atrium-' + d.origin);
    });
    var svg = svgEl('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true' }, 'bn-medal');
    var rim = svgEl('use', {}, 'rim');
    rim.setAttribute('href', '#medallion');
    svg.appendChild(rim);
    var sig = svgEl('use', {}, KNOWN_SIGILS[d.origin] ? 'm-sig m-mark' : 'm-sig');
    sig.setAttribute('href', KNOWN_SIGILS[d.origin] ? '#mark-' + d.origin : '#sig-fallback');
    svg.appendChild(sig);
    a.appendChild(svg);
    var mid = el('span', 'bn-mid');
    mid.appendChild(el('span', 'bn-head zh-sentence', h.head || ''));
    if (h.detail) mid.appendChild(el('span', 'bn-detail zh-sentence', h.detail));
    mid.appendChild(el('span', 'bn-time num', relTime(d.ts)));
    a.appendChild(mid);
    box.appendChild(a);
  });
  if (!shown.length) {
    var empty = el('div', 'bd-note ghost');
    empty.appendChild(el('span', 'bn-medal'));
    var m = el('span', 'bn-mid');
    m.appendChild(el('span', 'bn-detail zh-sentence', t('bulletinEmpty')));
    empty.appendChild(m);
    box.appendChild(empty);
  }
  // A notice case with three empty rails still reads as a notice case; a
  // case with one notice and a void under it reads as broken furniture.
  for (var i = Math.max(shown.length, shown.length ? 0 : 1); i < BULLETIN_SLOTS; i++) {
    var g = el('div', 'bd-note ghost');
    g.appendChild(el('span', 'bn-medal'));
    var gm = el('span', 'bn-mid');
    gm.appendChild(el('span', 'bn-head'));
    g.appendChild(gm);
    box.appendChild(g);
  }
}

var bulOpen = $('#bul-open');
if (bulOpen) bulOpen.addEventListener('click', function () { openLedger(); });

/* Pointer parallax — one rAF writer of two custom properties on #stage;
   shells consume them via calc. Gated on fine pointers, live reduced-motion
   (the CSS kill-switch can't stop rAF-written transforms), visibility, and
   the entrance having finished. */
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var stage = $('#stage');
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  function write() {
    stage.style.setProperty('--par-x', cx.toFixed(4));
    stage.style.setProperty('--par-y', cy.toFixed(4));
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
      gateDomOrder().forEach(function (svc) {
        var a = $('#gate-' + svc.id);
        if (a) wrap.appendChild(a);
      });
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
    toggleWing();
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
    if (state !== 'dark') $('.g-notice', a).hidden = true;
    var note = st && st.note ? t('note.' + st.note) : '';
    $('.g-lamp', a).title = note || lampT.title;
  });
  $('#all-dark').hidden = !(known === services.length && known > 0 && openCount === 0);

  // The hall is a picture; say out loud how many lines are open, so a screen
  // reader learns the same thing the lamps show. Only on change — a live
  // region rewritten every poll would announce itself every poll.
  var st = $('#hall-status');
  if (st && services.length) {
    var msg = t('linesOpen', { n: openCount, m: services.length });
    if (st.textContent !== msg) st.textContent = msg;
  }
}

function statText(svc) {
  var s = stats[svc.id] || {};
  if (svc.id === 'autopilot') {
    if (s.airing > 0) return t('stat.airing', { n: s.airing });
    if (s.watching !== undefined) return t('stat.watching', { n: s.watching });
  } else if (svc.id === 'groundstation') {
    if (s.pending > 0) return t('stat.pending', { n: s.pending });
    if (s.mods !== undefined) return t('stat.mods', { n: s.mods });
  } else if (svc.id === 'pressroom') {
    if (s.stories > 0) return t('stat.stories', { n: s.stories, m: s.sections || 0 });
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
    case 'anime.unresolved':
      return { head: p.title, detail: t('k.anime.unresolved'), warn: true };
    case 'anime.grace':
      return { head: p.title, detail: t('k.anime.grace') };
    case 'mods.updated':
      return { head: p.title, detail: t('k.mods.updated', p) + (p.note ? ' — ' + p.note : '') };
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
  }
  return { head: k, detail: '' };
}

function relTime(ts) {
  var d = Date.now() - ts;
  if (d < 90 * 1000) return t('justNow');
  if (d < 3600 * 1000) return t('minAgo', { n: Math.round(d / 60000) });
  if (d < 48 * 3600 * 1000) return t('hAgo', { n: Math.round(d / 3600000) });
  return t('dAgo', { n: Math.round(d / 86400000) });
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
    window.open(d.url, 'atrium-' + d.origin);
  });
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
  li.classList.toggle('new', d.ts > watermark);
  $('.pl-head', li).textContent = h.head || '';
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
  // Clear old daybreaks/empty markers, rebuild order
  Array.prototype.slice.call(ol.querySelectorAll('.daybreak, .l-empty, .ghost'))
    .forEach(function (n) { n.parentNode.removeChild(n); });

  if (!shown.length) {
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
  shown.forEach(function (d) {
    var bucket = d.ts >= todayMs ? 'today' : 'earlier';
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      var db = el('li', 'daybreak display', t(bucket));
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
      ol.appendChild(db);
    }
    var li = plaqueEls[d.id];
    var fresh = false;
    if (!li) {
      li = buildPlaque(d);
      plaqueEls[d.id] = li;
      fresh = true;
    }
    updatePlaque(li, d);
    ol.appendChild(li);                      // reposition in sorted order
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
}

var badgeCount = 0;

function updateLedgerBadge() {
  var badge = $('#ledger-badge');
  var btn = $('#ledger-btn');
  if (!badge) return;
  var count = feed.filter(function (d) { return d.ts > watermark; }).length;
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
  ledgerEl.classList.add('open');
  scrimEl.classList.add('visible');
  ledgerBtnEl.setAttribute('aria-expanded', 'true');
  renderLedger();
  ledgerOpening = false;
}

function closeLedger() {
  var ledgerEl = $('#ledger');
  var scrimEl = $('#ledger-scrim');
  var ledgerBtnEl = $('#ledger-btn');
  if (!ledgerEl || !scrimEl || !ledgerBtnEl) return;
  ledgerEl.classList.remove('open');
  scrimEl.classList.remove('visible');
  ledgerBtnEl.setAttribute('aria-expanded', 'false');
  // Update watermark on close — zeroes the badge on next check
  watermark = Date.now();
  store('atrium.lastVisit', String(watermark));
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
  var fresh = feed.filter(function (d) { return d.ts > watermark; }).slice(0, 6);
  var freshTexts = fresh.map(function (d) {
    var h = headline(d);
    return (h.head + ' — ' + h.detail);
  });

  track.textContent = '';
  function pushSegs(list, cls) {
    list.forEach(function (s, i) {
      if (track.childNodes.length) track.appendChild(el('span', 't-sep', '◆'));
      track.appendChild(el('span', cls || '', s));
    });
  }
  function makeRolling() {
    // Append the trailing separator FIRST, then clone — the track becomes
    // (A◆)(A◆) so the -50% loop lands exactly on the period (a clone taken
    // before the separator would jump by half a separator every cycle).
    track.appendChild(el('span', 't-sep', '◆'));
    var copy = Array.prototype.slice.call(track.childNodes).map(function (n) {
      return n.cloneNode(true);
    });
    copy.forEach(function (n) { track.appendChild(n); });
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
      renderBulletin();
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
  if (document.visibilityState === 'visible') refresh();
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

function openPrefs() {
  lastFocus = document.activeElement;
  prefs.hidden = false;
  syncPrefRadios();
  document.addEventListener('keydown', prefsKeydown);
  var first = prefs.querySelector('[role=radio][aria-checked=true]') ||
              prefs.querySelector('button');
  if (first) first.focus();
}
function closePrefs() {
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
  if (e.key === 'Escape') {
    var ledgerEl = $('#ledger');
    if (ledgerEl && ledgerEl.classList.contains('open')) {
      closeLedger();
      if (ledgerBtnEl) ledgerBtnEl.focus();
    }
  }
});

function syncPrefRadios() {
  var current = {
    theme: root.dataset.themePref || 'system',
    lang: lang,
    motion: root.dataset.motion,
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
    root.dataset.motion = val;
    store('atrium.motion', val);
    // The clock drives itself; tell it to swap sweep for deadbeat.
    window.dispatchEvent(new Event('atrium:motionchange'));
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
  services.forEach(function (svc) {
    var a = $('#gate-' + svc.id);
    if (a) $('.g-desc', a).textContent = t(descKey(svc));
  });
  applyStatuses();
  applyStats();
  renderLedger();
  renderBulletin();
  relabelWorks();
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
  $('#dateline').textContent = fmt.format(new Date());
}

// Replay is now just a reload — every load plays the entrance, so there is no
// suppression stamp left to clear. ?entrance=1 is appended so the replay still
// works for someone browsing with motion set to reduced.
$('#replay').addEventListener('click', function () {
  var u = new URL(location.href);
  u.searchParams.set('entrance', '1');
  location.href = u.toString();
});

/* ========================================================================
   Boot
   ======================================================================== */
applyI18nStatic();
renderDateline();
renderGhosts();
buildRosetteKnurl();
buildDesk();
buildFloorInlay();
renderWorks();      // the dials stand engraved before the first reading
buildAisles();
renderBulletin();   // the case shows its empty rails before the feed lands
startWorks();
// Seed the inline --drive: without it the first throw's getDrive() would
// read the wing-attribute CSS rule AFTER setWing flips the attribute —
// from === target, so the ease and the 55% steam latch would both vanish.
setDrive(root.dataset.wing === 'bureau' ? 1 : 0);
lever.setAttribute('aria-checked', String(root.dataset.wing === 'bureau'));

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
  // Deep links run regardless of how the boot fetch fared.
  if (new URLSearchParams(location.search).get('prefs') === '1') openPrefs();
});

})();
