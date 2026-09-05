/* ============================================
   Soul Haven · Reader Sense — 状态/存储/信号/UI
   本地 localStorage，24h TTL，无 AI、无后端、无账号。
   ============================================ */
(function () {
  'use strict';

  var CORE = window.SoulHavenReaderCore;
  if (!CORE) { return; }

  var KEY = 'soulhaven_reader_v1';
  var WANT_OPTIONS = ['被允许休息', '被陪伴', '被安慰', '被接住', '被点醒', '被理解', '被允许独处', '被允许不完美', '被允许慢', '被允许不睡'];
  var storageOk = true;
  var state = CORE.defaultState();

  function $(id) { return document.getElementById(id); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { state = CORE.defaultState(); return; }
      var s = JSON.parse(raw);
      var now = Date.now();
      if (!s || !s.expiresAt || s.expiresAt < now) {
        state = CORE.defaultState();
        save();
      } else {
        state = s;
      }
    } catch (e) {
      storageOk = false;
      state = CORE.defaultState();
    }
  }

  function save() {
    var now = Date.now();
    state.updatedAt = now;
    state.expiresAt = now + CORE.TTL_MS;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { storageOk = false; }
  }

  function clearAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = CORE.defaultState();
  }

  function addNeed(need, strength, source) {
    var exists = null;
    state.currentNeeds.forEach(function (n) { if (n.need === need) { exists = n; } });
    if (exists) { exists.strength = Math.min(1, (exists.strength || 0.5) + 0.5); }
    else { state.currentNeeds.push({ need: need, strength: strength || 0.7, source: source || 'signal' }); }
    state.currentNeeds = state.currentNeeds.slice(0, 3);
  }

  function addTheme(theme, source) {
    if (!theme) { return; }
    var has = state.lifeSignals.some(function (s) { return s.theme === theme; });
    if (!has) { state.lifeSignals.push({ theme: theme, confidence: 'low', source: source || 'click' }); }
    state.lifeSignals = state.lifeSignals.slice(-6);
  }

  function recordRead(id, completed) {
    var arr = state.readingHistory.recentReads;
    var idx = -1;
    arr.forEach(function (r, i) { if (r.articleId === id) { idx = i; } });
    if (idx >= 0) { arr[idx] = { articleId: id, completed: !!completed, liked: null }; }
    else { arr.push({ articleId: id, completed: !!completed, liked: null }); }
    state.readingHistory.recentReads = arr.slice(-10);
  }

  function bumpIntent(kind) {
    state.intent[kind] = (state.intent[kind] || 0) + 1;
  }

  function feedback(msg) {
    var el = $('rs-feedback');
    if (!el) { return; }
    el.textContent = msg;
    el.hidden = false;
  }

  function makeButton(text, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rs-btn';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  // Language detection helper
  function getLang() {
    if (typeof SoulHavenLang !== 'undefined' && typeof SoulHavenLang.detect === 'function') {
      return SoulHavenLang.detect();
    }
    return 'zh'; // fallback
  }

  // UI strings for different languages
  var UI_STRINGS = {
    zh: {
      titleWithSignals: '今晚，也许适合你的是…',
      titleWithoutSignals: '今晚，先陪你随便读几篇',
      subWithSignals: '根据你刚刚的表达与停留，挑了几篇。',
      subWithoutSignals: '还没有太多关于你今晚的信号，先放几篇常被读的。',
      feedbackNotNow: '好，这篇先不推了。',
      feedbackAvoidTopic: '好，这个方向先不推了。',
      feedbackWantMore: function(need) { return '好，那我们往「' + need + '」这个方向再找几篇。'; },
      feedbackCleared: '已经清空了。之后会按你此刻的浏览重新开始。',
      buttonNotNow: '不是我想看的',
      buttonAvoidTopic: '暂时不想看这个方向'
    },
    en: {
      titleWithSignals: 'Tonight, maybe these are for you…',
      titleWithoutSignals: 'Tonight, let me keep you company with a few reads.',
      subWithSignals: 'Based on what you’ve just shared and lingered on, I picked these.',
      subWithoutSignals: 'Not much signal about tonight yet—here are a few often-read pieces.',
      feedbackNotNow: 'Okay, let’s skip this one for now.',
      feedbackAvoidTopic: 'Okay, let’s avoid this direction for now.',
      feedbackWantMore: function(need) { return 'Okay, let’s look for more in the «' + need + '» direction.'; },
      feedbackCleared: 'All cleared. We’ll restart based on your current browsing.',
      buttonNotNow: 'Not what I’m looking for',
      buttonAvoidTopic: 'Not this direction for now'
    }
  };

  // Need translations for display (internal state stays in Chinese for matching)
  var NEED_TRANSLATIONS = {
    zh: {
      '被允许休息': '被允许休息',
      '被允许不睡': '被允许不睡',
      '被陪伴': '被陪伴',
      '被安慰': '被安慰',
      '被理解': '被理解',
      '被接住': '被接住',
      '被允许独处': '被允许独处',
      '被允许不完美': '被允许不完美',
      '被允许慢': '被允许慢',
      '被点醒': '被点醒',
      '安静的共鸣': '安静的共鸣'
    },
    en: {
      '被允许休息': 'Allowed to rest',
      '被允许不睡': 'Allowed to not sleep',
      '被陪伴': 'To be accompanied',
      '被安慰': 'To be comforted',
      '被理解': 'To be understood',
      '被接住': 'To be held',
      '被允许独处': 'Allowed to be alone',
      '被允许不完美': 'Allowed to be imperfect',
      '被允许慢': 'Allowed to be slow',
      '被点醒': 'To be awakened',
      '安静的共鸣': 'Quiet resonance'
    }
  };

  function render() {
    var lang = getLang();
    var strings = UI_STRINGS[lang];
    var rec = CORE.compute(CORE.ARTICLES, state, 3);
    var title = $('rs-title');
    var sub = $('rs-subtitle');
    if (title) { title.textContent = rec.hasSignals ? strings.titleWithSignals : strings.titleWithoutSignals; }
    if (sub) { sub.textContent = rec.hasSignals ? strings.subWithSignals : strings.subWithoutSignals; }

    var box = $('rs-recs');
    if (!box) { return; }
    box.innerHTML = '';

    rec.results.forEach(function (item) {
      var art = item.article;
      var card = document.createElement('article');
      card.className = 'rs-card';

      var cat = document.createElement('span');
      cat.className = 'rs-cat';
      cat.textContent = (art.categories || []).join(' · ');

      var link = document.createElement('a');
      link.className = 'rs-card-link';
      link.href = art.href;
      link.textContent = art.title;

      var reason = document.createElement('p');
      reason.className = 'rs-reason';
      reason.textContent = item.reason;

      var expl = document.createElement('p');
      expl.className = 'rs-explain';
      expl.textContent = item.explain && item.explain.length ? ('为什么是这篇：' + item.explain.join('，') + '。') : '';

      var actions = document.createElement('div');
      actions.className = 'rs-actions';
      // Use translated button texts
      actions.appendChild(makeButton(strings.buttonNotNow, function () {
        if (state.explicit.notNow.indexOf(art.id) === -1) { state.explicit.notNow.push(art.id); }
        save(); feedback(strings.feedbackNotNow); render();
      }));
      actions.appendChild(makeButton(strings.buttonAvoidTopic, function () {
        var c = art.categories[0];
        if (state.explicit.avoidTopics.indexOf(c) === -1) { state.explicit.avoidTopics.push(c); }
        save(); feedback(strings.feedbackAvoidTopic); render();
      }));

      card.appendChild(cat);
      card.appendChild(link);
      card.appendChild(reason);
      card.appendChild(expl);
      card.appendChild(actions);
      box.appendChild(card);
    });

    renderWantChips(lang, strings);
  }

  function renderWantChips(lang, strings) {
    var wrap = $('rs-want-chips');
    if (!wrap) { return; }
    wrap.innerHTML = '';
    // We need to display the translated need but store the Chinese need
    WANT_OPTIONS.forEach(function (need) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rs-chip';
      // Display the translated need
      var trans = NEED_TRANSLATIONS[lang] && NEED_TRANSLATIONS[lang][need] ? NEED_TRANSLATIONS[lang][need] : need;
      b.textContent = trans;
      b.addEventListener('click', function () {
        if (state.explicit.wantMore.indexOf(need) === -1) { state.explicit.wantMore.push(need); }
        save(); 
        // Use the feedbackWantMore function which expects the original need (Chinese) for the message
        var feedbackMsg = strings.feedbackWantMore ? strings.feedbackWantMore(need) : ('好，那我们往「' + need + '」这个方向再找几篇。');
        feedback(feedbackMsg); 
        wrap.hidden = true; 
        render();
      });
      wrap.appendChild(b);
    });
  }

  function bindSignals() {
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!t) { return; }
      var href = t.getAttribute('href') || '';

      // 首页情绪入口（显式）
      if (t.classList && t.classList.contains('mood-card')) {
        var labelEl = t.querySelector('.mood-label');
        var label = labelEl ? labelEl.textContent.trim() : '';
        var map = CORE.MOOD_MAP[label];
        if (map) {
          addNeed(map.need, 1, 'home_emotion');
          addTheme(map.theme, 'home_emotion');
          bumpIntent('companion');
          save();
          render();
        }
        return;
      }

      // 分类/主题链接（主动选择）
      if (href.indexOf('?topic=') !== -1) {
        var m = href.match(/topic=([a-z0-9\-]+)/i);
        if (m && CORE.TOPIC_MAP[m[1]]) {
          addTheme(CORE.TOPIC_MAP[m[1]], 'topic_click');
          save();
          render();
        }
        return;
      }

      // 文章链接（阅读行为）
      if (/^article\/[^/]+\.html$/.test(href)) {
        var id = href.replace('article/', '').replace('.html', '');
        recordRead(id, false);
        var card = t.closest('.article-card, .article-card-featured, .rs-card');
        if (card) {
          var catEl = card.querySelector('.card-category, .rs-cat');
          if (catEl) { addTheme(catEl.textContent.trim(), 'article_click'); }
        }
        save();
      }
    });
  }

  function bindUI() {
    var wantBtn = $('rs-want-btn');
    if (wantBtn) {
      wantBtn.addEventListener('click', function () {
        var wrap = $('rs-want-chips');
        if (wrap) { wrap.hidden = !wrap.hidden; }
      });
    }
    var clearBtn = $('rs-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearAll(); feedback(UI_STRINGS[getLang()].feedbackCleared); render();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    load();
    bindUI();
    bindSignals();
    render();
  });

  window.SoulHavenReader = {
    version: CORE.VERSION,
    KEY: KEY,
    getState: function () { return state; },
    storageAvailable: function () { return storageOk; },
    render: render,
    reset: function () { clearAll(); render(); }
  };
})();
