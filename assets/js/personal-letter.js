/* ============================================
   Soul Haven · Personal Letter — MVP 前端逻辑
   说明：
   - 纯本地模拟，不接入真实 AI、不调用任何网络接口。
   - 用户输入只保存在当前页面内存中，不写入存储、不上传。
   - 为未来预留：安全接口 safetyCheck()、支付成功回调 purchase.onSuccess()。
   ============================================ */
(function () {
  'use strict';

  var DATA = window.SoulHavenLetterData;
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* ---------- 安全接口（MVP 为关键词启发式，仅示意） ---------- */
  var CRISIS_KEYWORDS = ['自杀','想死','不想活','活不下去','结束生命','伤害自己','自残','轻生','了断','没有活下去','撑不下去了','不想活了'];

  function safetyCheck(input) {
    if (!input || typeof input !== 'string') { return { status: 'safe', matched: [] }; }
    var text = input.toLowerCase();
    var matched = CRISIS_KEYWORDS.filter(function (k) { return text.indexOf(k) !== -1; });
    return { status: matched.length ? 'needsReview' : 'safe', matched: matched };
  }

  /* ---------- 会话状态（内存态，不落库） ---------- */
  var state = {
    sessionId: '',
    stage: 'entry',
    trial: true,
    userExpression: '',
    answers: [],
    track: null,
    inferredProfile: null,
    letter: null,
    letterId: null,
    safety: { status: 'safe', matched: [] },
    purchase: { status: 'coming_soon', provider: null, letterId: null }
  };

  function makeId() {
    return 'pl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function todayLabel() {
    var d = new Date();
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function shorten(text, max) {
    max = max || 46;
    var t = (text || '').replace(/\s+/g, ' ').trim();
    var cut = t.slice(0, max);
    return t.length > max ? cut + '…' : cut;
  }

  /* ---------- 主题/人物理解（本地启发式，非心理诊断） ---------- */
  function detectTrack(text) {
    var best = DATA.tracks[0], bestScore = 0;
    DATA.tracks.forEach(function (track) {
      var score = 0;
      track.keywords.forEach(function (kw) { if (text.indexOf(kw) !== -1) { score += 1; } });
      if (score > bestScore) { bestScore = score; best = track; }
    });
    return best;
  }

  function inferPersonality(text) {
    if (/怪自己|是不是我|我不够好|都怪我|我的问题/.test(text)) { return '习惯先把问题归到自己身上'; }
    if (/理性|不太会说|不想麻烦别人|自己消化|说不出口/.test(text)) { return '习惯独自消化，很少向人开口'; }
    return '习惯把事情放在心里，慢慢地、一个人想';
  }

  function inferProfile(text, track) {
    var personality = inferPersonality(text);
    var profile = {
      emotionalTone: track.mood,
      lifeSituation: track.situation,
      personalityTone: personality,
      visualMood: track.theme,
      envelopeProfile: {
        theme: track.theme,
        texture: 'css-generated',
        label: DATA.themes[track.theme].label
      }
    };
    return profile;
  }

  /* ---------- 页面/阶段控制 ---------- */
  function go(stage) {
    state.stage = stage;
    $$('.pl-stage').forEach(function (el) {
      var show = el.getAttribute('data-stage') === stage;
      if (show) { el.removeAttribute('hidden'); } else { el.setAttribute('hidden', ''); }
    });
    var node = $('pl-' + stage);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setStep(step) {
    $$('.pl-step').forEach(function (el) {
      var on = el.getAttribute('data-step') === step;
      el.classList.toggle('is-on', on);
    });
  }

  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------- 信封视觉 ---------- */
  function renderEnvelope() {
    var env = $('pl-envelope');
    env.setAttribute('data-pl-theme', state.inferredProfile.envelopeProfile.theme);
    var monogram = $('pl-env-monogram');
    if (monogram) { monogram.textContent = '墨'; }
    var dateEl = $('pl-env-date');
    if (dateEl) { dateEl.textContent = todayLabel() + ' · Soul Haven'; }
  }

  /* ---------- 对话渲染 ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function addUserBubble(text) {
    var box = $('pl-transcript');
    var div = document.createElement('div');
    div.className = 'pl-bubble pl-user';
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function addSoulBubble(html) {
    var box = $('pl-transcript');
    var div = document.createElement('div');
    div.className = 'pl-bubble pl-soul';
    div.innerHTML = '<span class="pl-soul-badge" aria-hidden="true">墨</span><div class="pl-soul-text">' + html + '</div>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  var chipsBox = null;
  var composer = null;

  function clearComposer() {
    if (chipsBox) { chipsBox.innerHTML = ''; chipsBox = null; }
    if (composer) { composer.parentNode.removeChild(composer); composer = null; }
  }

  function buildChips(list, onPick) {
    clearComposer();
    chipsBox = document.createElement('div');
    chipsBox.className = 'pl-chips';
    list.forEach(function (chip) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pl-chip';
      b.textContent = chip.text;
      b.addEventListener('click', function () { onPick(chip); });
      chipsBox.appendChild(b);
    });
    $('pl-chat-area').appendChild(chipsBox);
  }

  function buildComposer(placeholder, onSend, withSkip) {
    if (!composer) {
      composer = document.createElement('div');
      composer.className = 'pl-composer';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'pl-composer-input';
      input.placeholder = placeholder || '在这里写给我…';
      input.setAttribute('autocomplete', 'off');
      var send = document.createElement('button');
      send.type = 'button';
      send.className = 'pl-btn pl-btn-soft';
      send.textContent = '发送';
      composer.appendChild(input);
      composer.appendChild(send);
      $('pl-chat-area').appendChild(composer);
      var submit = function () {
        var v = input.value.trim();
        if (!v) { input.focus(); return; }
        onSend(v);
      };
      send.addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      later(function () { input.focus(); }, 250);
    }
    if (withSkip) {
      var skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'pl-skip';
      skip.textContent = '这个问题先跳过';
      skip.addEventListener('click', function () { onSend(null); });
      composer.appendChild(skip);
    }
  }

  var busy = false;
  function lock() { busy = true; }
  function unlock() { busy = false; }

  /* ---------- 对话流程 ---------- */
  var expectedQ = null;

  function startChat() {
    addUserBubble(state.userExpression);
    addSoulBubble('我读完了。谢谢你愿意把这些字写下来。');
    later(function () {
      askOpening();
    }, 500);
  }

  function askOpening() {
    var track = state.track;
    addSoulBubble(esc(track.opening({ short: shorten(state.userExpression) })));
    later(function () {
      askQ1();
    }, 420);
  }

  function askQ1() {
    var track = state.track;
    expectedQ = { qid: 'q1' };
    addSoulBubble(esc(track.q1.text));
    buildChips(track.q1.chips, function (chip) {
      clearComposer();
      onAnswer('q1', chip.text, chip.value);
    });
    buildComposer('也可以用自己的话回答', function (v) {
      clearComposer();
      onAnswer('q1', v, 'custom');
    });
  }

  function askQ2() {
    var track = state.track;
    expectedQ = { qid: 'q2' };
    addSoulBubble(esc(track.q2({ short: shorten(state.userExpression) })));
    buildComposer('想到什么就写什么', function (v) {
      clearComposer();
      if (v === null) { onAnswer('q2', null, 'skipped'); }
      else { onAnswer('q2', v, 'custom'); }
    }, true);
  }

  function onAnswer(qid, text, value) {
    if (busy) { return; }
    lock();
    clearComposer();
    if (text !== null && text !== undefined) {
      state.answers.push({ qid: qid, text: text, value: value });
      addUserBubble(text);
    } else {
      addSoulBubble('没关系，那就不问这个了。');
    }
    later(function () {
      unlock();
      if (qid === 'q1') { askQ2(); }
      else { finishChat(); }
    }, 550);
  }

  function finishChat() {
    var track = state.track;
    addSoulBubble('嗯，我大概知道你现在站在哪里了。让我一个人安静地坐一会儿，为你写一封信。');
    later(function () {
      buildLetter();
      go('reading');
      runReading();
    }, 650);
  }

  /* ---------- 理解过渡（不展示诊断词汇） ---------- */
  function runReading() {
    var lines = $('pl-reading-lines');
    if (lines) { lines.innerHTML = ''; }
    var steps = ['我在慢慢读你写下的字……', '试着理解你现在站在哪里……', '为你挑一张信纸……'];
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var delay = reduce ? 240 : 760;
    steps.forEach(function (text, i) {
      later(function () {
        if (lines) {
          var p = document.createElement('p');
          p.className = 'pl-reading-line';
          p.textContent = text;
          lines.appendChild(p);
        }
        if (i === steps.length - 1) {
          later(function () {
            renderEnvelope();
            go('envelope');
          }, reduce ? 300 : 900);
        }
      }, delay * (i + 1));
    });
  }

  function skipReading() {
    clearTimers();
    renderEnvelope();
    go('envelope');
  }

  /* ---------- 写信（本地组合示范文本） ---------- */
  function buildLetter() {
    var track = state.track;
    state.inferredProfile = inferProfile(state.userExpression + ' ' + state.answers.map(function (a) { return a.text || ''; }).join(' '), track);
    var letter = track.buildLetter({
      short: shorten(state.userExpression),
      answers: state.answers,
      profile: state.inferredProfile
    });
    state.letter = letter;
    state.letterId = makeId();
    state.purchase.letterId = state.letterId;
  }

  function showLetter() {
    var letter = state.letter;
    $('pl-letter-first').textContent = letter.firstLine;
    var body = $('pl-letter-body');
    body.innerHTML = '';
    (letter.paragraphs || []).forEach(function (para) {
      if (!para) { return; }
      var p = document.createElement('p');
      p.textContent = para;
      body.appendChild(p);
    });
    var sign = document.createElement('p');
    sign.className = 'pl-letter-sign';
    sign.textContent = '—— Soul Haven（墨白）';
    body.appendChild(sign);
    if (letter.figure) {
      var fig = document.createElement('p');
      fig.className = 'pl-letter-fig';
      fig.textContent = '＊关于「' + letter.figure.name + '」：' + letter.figure.fact + '（来源：' + letter.figure.source + '；' + letter.figure.note + '）';
      body.appendChild(fig);
    }
    $('pl-env-date-final').textContent = todayLabel() + ' · Soul Haven';
  }

  /* ---------- 拆信 ---------- */
  var opened = false;
  function openEnvelope() {
    if (opened || state.stage !== 'envelope') { return; }
    opened = true;
    var env = $('pl-envelope');
    env.classList.add('is-open');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    later(function () {
      showLetter();
      go('letter');
    }, reduce ? 350 : 1450);
  }

  /* ---------- 付费入口（预留接口，不做真实支付） ---------- */
  function requestPurchase() {
    var tip = $('pl-pay-tip');
    if (tip) {
      tip.textContent = '完整私人信尚未开放。这是本地 MVP 演示，不会产生任何支付；未来这里会进入「单封私人信」的购买流程。';
      tip.removeAttribute('hidden');
    }
    return { ok: false, reason: 'coming_soon', letterId: state.purchase.letterId };
  }

  /* 支付成功回调预留：下一阶段由真实支付回调调用 */
  function markPurchaseSuccess(payload) {
    payload = payload || {};
    state.purchase.status = 'paid';
    state.purchase.provider = payload.provider || null;
    state.purchase.transactionId = payload.transactionId || null;
    // 未来：解锁「完整私人信」的深度追问与完整信件（本阶段不实现）
    return { ok: true, letterId: state.letterId };
  }

  /* ---------- 危机提示 ---------- */
  function showCrisis() {
    go('crisis');
  }

  /* ---------- 重置 ---------- */
  function resetAll() {
    clearTimers();
    state.sessionId = makeId();
    state.stage = 'entry';
    state.userExpression = '';
    state.answers = [];
    state.track = null;
    state.inferredProfile = null;
    state.letter = null;
    state.letterId = null;
    state.purchase = { status: 'coming_soon', provider: null, letterId: null };
    expectedQ = null;
    opened = false;
    var t = $('pl-transcript'); if (t) { t.innerHTML = ''; }
    var area = $('pl-chat-area'); if (area) { area.innerHTML = ''; }
    clearComposer();
    var env = $('pl-envelope'); if (env) { env.classList.remove('is-open'); }
    $('pl-expression-input').value = '';
    var lines = $('pl-reading-lines'); if (lines) { lines.innerHTML = ''; }
    var tip = $('pl-pay-tip'); if (tip) { tip.setAttribute('hidden', ''); }
    go('entry');
  }

  /* ---------- 启动 ---------- */
  function bindEvents() {
    $('pl-start').addEventListener('click', function () { go('express'); });
    $('pl-express-next').addEventListener('click', submitExpression);
    $('pl-skip-wait').addEventListener('click', skipReading);
    $('pl-envelope').addEventListener('click', openEnvelope);
    $('pl-envelope').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); } });
    $('pl-cta-full').addEventListener('click', function () { requestPurchase(); });
    $$('.pl-restart').forEach(function (b) { b.addEventListener('click', resetAll); });
    var input = $('pl-expression-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitExpression(); }
    });
  }

  function submitExpression() {
    var input = $('pl-expression-input');
    var text = input.value.trim();
    if (!text) {
      var hint = $('pl-express-hint');
      hint.textContent = '不用想得很清楚，先写下一句就好。';
      hint.removeAttribute('hidden');
      input.focus();
      return;
    }
    state.userExpression = text;
    state.safety = safetyCheck(text);
    if (state.safety.status === 'needsReview') { showCrisis(); return; }
    state.track = detectTrack(text);
    setStep('chat');
    go('chat');
    later(function () { startChat(); }, 350);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!DATA) { return; }
    state.sessionId = makeId();
    bindEvents();
  });

  /* 对外暴露：便于下一阶段接入真实 AI / 支付 / 安全服务 */
  window.SoulHavenLetter = {
    version: '1.0.0',
    isMock: true,
    safetyCheck: safetyCheck,
    getState: function () { return state; },
    purchase: {
      request: requestPurchase,
      onSuccess: markPurchaseSuccess
    }
  };
})();