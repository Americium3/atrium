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
    'desc.fallback': 'A newly registered hall.',
    'stat.airing': '{n} AIRING TODAY', 'stat.watching': '{n} WATCHING',
    'stat.pending': '{n} UPDATES PENDING', 'stat.mods': '{n} MODS TRACKED',
    'stat.queue': 'QUEUE {done}/{total}', 'stat.invited': 'SENT {n}/{target}',
    'note.qb_auth': 'qBittorrent auth blocked — episode headlines disabled',
    'note.qb_down': 'qBittorrent unreachable — episode headlines paused',
    'note.daemon_stale': 'Sync daemon looks stalled',
    'note.fallback': 'Reading state files directly (server down)',
    'k.anime.premiere': 'Premiered',
    'k.anime.premiere.promoted': 'Premiered — auto-subscribed',
    'k.anime.completed': 'Finished — all {eps} episodes watched',
    'k.anime.completed.noeps': 'Finished — marked as watched',
    'k.anime.episode': 'Episode {ep} arrived',
    'k.anime.episode.noep': 'New episode arrived',
    'k.anime.unresolved': 'No release group matched yet',
    'k.anime.grace': 'Waiting for the preferred group',
    'k.mods.updated': 'Workshop update · {game}',
    'k.mods.downloaded': 'Update installed · {game}',
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
    appearance: 'APPEARANCE', language: 'LANGUAGE', motion: 'MOTION',
    onyx: 'ONYX', ivory: 'IVORY', system: 'FOLLOW SYSTEM',
    onyxDesc: 'Black & gold', ivoryDesc: 'Platinum & gold', systemDesc: 'Match the OS',
    motionFull: 'FULL', motionReduced: 'REDUCED',
    replay: 'REPLAY ENTRANCE',
    ariaTicker: 'Status band', ariaLever: 'Salon / Bureau wing',
    ariaFilter: 'Filter dispatches', ariaClose: 'Close',
    ariaGates: 'Gates', ariaLedger: 'Dispatches',
    salonWing: 'Play wing', bureauWing: 'Work wing'
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
    'desc.fallback': '新登记的厅室。',
    'stat.airing': '今日 {n} 部放送', 'stat.watching': '在看 {n} 部',
    'stat.pending': '{n} 个更新待装', 'stat.mods': '追踪 {n} 个 MOD',
    'stat.queue': '队列 {done}/{total}', 'stat.invited': '已发 {n}/{target}',
    'note.qb_auth': 'qBittorrent 拒绝访问——单集快讯已停用',
    'note.qb_down': 'qBittorrent 不可达——单集快讯暂停',
    'note.daemon_stale': '同步守护进程疑似卡住',
    'note.fallback': '服务器离线——正在直读状态文件',
    'k.anime.premiere': '开播',
    'k.anime.premiere.promoted': '开播——已自动订阅',
    'k.anime.completed': '完结——全 {eps} 话看完',
    'k.anime.completed.noeps': '完结——已标记看过',
    'k.anime.episode': '第 {ep} 话已入库',
    'k.anime.episode.noep': '新一话已入库',
    'k.anime.unresolved': '尚未匹配到字幕组源',
    'k.anime.grace': '等待首选字幕组中',
    'k.mods.updated': '创意工坊更新 · {game}',
    'k.mods.downloaded': '更新已入库 · {game}',
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
    appearance: '外观', language: '语言', motion: '动效',
    onyx: '黑金 · ONYX', ivory: '白金 · IVORY', system: '跟随系统',
    onyxDesc: '玄色与鎏金', ivoryDesc: '铂色与鎏金', systemDesc: '与操作系统一致',
    motionFull: '完整', motionReduced: '减弱',
    replay: '重播入场动画',
    ariaTicker: '状态带', ariaLever: '沙龙翼 / 事务翼切换',
    ariaFilter: '筛选快讯', ariaClose: '关闭',
    ariaGates: '门廊', ariaLedger: '快讯',
    salonWing: '娱乐翼 · 沙龙', bureauWing: '工作翼 · 事务所'
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
var KNOWN_SIGILS = { autopilot: 1, groundstation: 1, outreach: 1 };

window.addEventListener('pagehide', function () {
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

function playEntrance() {
  buildRays();
  var at = function (ms, fn) { entranceTimers.push(setTimeout(fn, ms)); };
  entrance.classList.add('play');
  at(500, function () { entrance.classList.add('doors'); });
  at(830, function () { entrance.classList.add('seam'); });
  at(970, function () { entrance.classList.add('open'); });
  at(1500, function () { entrance.classList.add('word'); });
  at(1800, function () {
    // Signature moment: the drawn circle flies and docks as the rosette.
    // The masthead is still in its rise-in "from" state (translateY(14px))
    // at this instant, so compensate to hit the settled rosette position.
    var mono = $('#monogram').getBoundingClientRect();
    var burst = $('.e-burst').getBoundingClientRect();
    entrance.style.setProperty('--dock-x',
      (mono.left + mono.width / 2 - (burst.left + burst.width / 2)) + 'px');
    entrance.style.setProperty('--dock-y',
      (mono.top + mono.height / 2 - (burst.top + burst.height / 2) - 14) + 'px');
    entrance.style.setProperty('--dock-s',
      String(mono.width / (burst.width * 0.23)));
    entrance.classList.add('dock');
  });
  at(2100, function () { entrance.classList.add('done-fade'); });
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
    var sig = KNOWN_SIGILS[svc.sigil] ? svc.sigil : 'fallback';
    face.appendChild(svgUse('sigil', '0 0 96 96', '#sig-' + sig));
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

  active.forEach(function (svc, i) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    a.classList.add('active'); a.classList.remove('receded');
    a.style.setProperty('--slot-x', ((i - (active.length - 1) / 2) * spacing) + 'px');
    a.style.setProperty('--slot-s', '1');
    a.style.setProperty('--side', '0');
    // Receding gates lead by 80ms; each group cascades at 60ms.
    a.style.setProperty('--slot-delay', initial ? '0ms' : (80 + i * 60) + 'ms');
  });
  // Flanks tuck just inside the stage; z-order lets them slip behind the
  // active pair rather than bleed into the Ledger column.
  var edge = W / 2 - gateW * 0.31;
  receded.forEach(function (svc, i) {
    var a = $('#gate-' + svc.id);
    if (!a) return;
    a.classList.add('receded'); a.classList.remove('active');
    // Alternate flanks; extra flankmates on a side step inward so they
    // never stack exactly on top of each other.
    var side = (receded.length === 1) ? 1 : (i % 2 === 0 ? -1 : 1);
    var rank = Math.floor(i / 2);
    a.style.setProperty('--slot-x', (side * (edge - rank * gateW * 0.5)) + 'px');
    a.style.setProperty('--slot-s', '0.62');
    a.style.setProperty('--slot-delay', initial ? '0ms' : (i * 60) + 'ms');
    a.style.setProperty('--side', String(side));   // triptych inward tilt
  });
}

var resizeT;
window.addEventListener('resize', function () {
  clearTimeout(resizeT);
  resizeT = setTimeout(function () { layoutStage(true); }, 120);
});

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
  var apply = function () {
    root.dataset.wing = w;
    store('atrium.wing', w);
    lever.setAttribute('aria-checked', String(w === 'bureau'));
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
lever.addEventListener('click', function () {
  setWing(root.dataset.wing === 'salon' ? 'bureau' : 'salon');
});
lever.addEventListener('keydown', function (e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    setWing(root.dataset.wing === 'salon' ? 'bureau' : 'salon');
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
}

function statText(svc) {
  var s = stats[svc.id] || {};
  if (svc.id === 'autopilot') {
    if (s.airing > 0) return t('stat.airing', { n: s.airing });
    if (s.watching !== undefined) return t('stat.watching', { n: s.watching });
  } else if (svc.id === 'groundstation') {
    if (s.pending > 0) return t('stat.pending', { n: s.pending });
    if (s.mods !== undefined) return t('stat.mods', { n: s.mods });
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
    case 'anime.episode':
      return { head: p.show, detail: t(p.ep ? 'k.anime.episode' : 'k.anime.episode.noep', p) };
    case 'anime.unresolved':
      return { head: p.title, detail: t('k.anime.unresolved'), warn: true };
    case 'anime.grace':
      return { head: p.title, detail: t('k.anime.grace') };
    case 'mods.updated':
      return { head: p.title, detail: t('k.mods.updated', p) + (p.note ? ' — ' + p.note : '') };
    case 'mods.downloaded':
      return { head: p.title, detail: t('k.mods.downloaded', p) };
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
  var sigName = KNOWN_SIGILS[d.origin] ? d.origin : 'fallback';
  sig.setAttribute('href', '#sig-' + sigName);
  sig.setAttribute('class', 'm-sig');
  svg.appendChild(sig);
  medal.appendChild(svg);
  li.appendChild(medal);   // outside the clipped layers — overhangs the spine
  a.appendChild(el('div', 'pl-head'));
  a.appendChild(el('div', 'pl-detail'));
  a.appendChild(el('div', 'pl-time num'));
  frame.appendChild(a);
  li.appendChild(frame);
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
  // Remove plaques whose dispatch left the window/filter
  Object.keys(plaqueEls).forEach(function (id) {
    if (!shown.some(function (d) { return d.id === id; })) {
      if (plaqueEls[id].parentNode) plaqueEls[id].parentNode.removeChild(plaqueEls[id]);
      delete plaqueEls[id];
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
      ol.appendChild(el('li', 'daybreak display', t(bucket)));
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
    if (fresh && !firstFeed) li.classList.add('arrive');
  });
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
      firstFeed = false;
    }
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

function syncPrefRadios() {
  var current = {
    theme: root.dataset.themePref || 'system',
    lang: lang,
    motion: root.dataset.motion
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
  else if (pref === 'motion') { root.dataset.motion = val; store('atrium.motion', val); }
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
  renderTicker();
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

$('#replay').addEventListener('click', function () {
  try { localStorage.removeItem('atrium.entered'); } catch (e) {}
  location.reload();
});

/* ========================================================================
   Boot
   ======================================================================== */
applyI18nStatic();
renderDateline();
renderGhosts();
lever.setAttribute('aria-checked', String(root.dataset.wing === 'bureau'));

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
