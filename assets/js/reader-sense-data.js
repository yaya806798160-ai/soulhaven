/* ============================================
   Soul Haven · Reader Sense — 纯数据与评分引擎（无 DOM，可单测）
   依据：docs/Soul-Haven-Reader-Sense-v1.0.md
   ============================================ */
(function () {
  'use strict';

  var VERSION = '1.2.1';
  var TTL_MS = 24 * 60 * 60 * 1000; // 24h

  /* 情绪入口 → 当下需求 + 主题（显式信号） */
  var MOOD_MAP = {
    '有些低落': { need: '被接住', theme: '情绪自救' },
    '感到焦虑': { need: '被安慰', theme: '焦虑应对' },
    '觉得很累': { need: '被允许休息', theme: '自我和解' },
    '说不上来': { need: '被陪伴', theme: '情绪自救' }
  };

  /* 分类参数 → 主题 */
  var TOPIC_MAP = {
    'qingxu-zijiu': '情绪自救',
    'jiaolv-yingdui': '焦虑应对',
    'renji-guanxi': '人际关系',
    'ziwo-hejie': '自我和解',
    'shenye-diantai': '深夜电台',
    'yuedu-zhiyu': '阅读治愈',
    'dushu-shiguang': '独处时光',
    'chongxin-chufa': '重新出发'
  };

  /* 候选文章池（内容特征，人工维护） */
  var ARTICLES = [
    { id: 'reading-notes', href: 'article/reading-notes.html', title: '那些睡不着的夜晚，我都做了什么', categories: ['深夜电台'], needs: ['被陪伴', '被允许不睡', '被安慰'], themes: ['深夜失眠'], intent: 'companion', intensity: 1, afterFeel: '平缓', lang: 'zh' },
    { id: 'unspoken-emotions', href: 'article/unspoken-emotions.html', title: '那些说不出口的情绪，都去了哪里', categories: ['情绪自救'], needs: ['被理解', '被接住'], themes: ['情绪', '身体信号'], intent: 'companion', intensity: 2, afterFeel: '释然', lang: 'zh' },
    { id: 'morning-ritual', href: 'article/morning-ritual.html', title: '一个人吃饭，一个人散步，也很好', categories: ['独处时光'], needs: ['被允许独处', '被接住'], themes: ['独处'], intent: 'companion', intensity: 1, afterFeel: '释然', lang: 'zh' },
    { id: 'no-effort-today', href: 'article/no-effort-today.html', title: '今天不想努力，也可以', categories: ['自我和解'], needs: ['被允许休息'], themes: ['疲惫', '休息'], intent: 'companion', intensity: 1, afterFeel: '安抚', lang: 'zh' },
    { id: 'slow-living', href: 'article/slow-living.html', title: '我也在学着和不完美的自己和解', categories: ['焦虑应对'], needs: ['被允许不完美', '被接住'], themes: ['焦虑', '自我接纳'], intent: 'companion', intensity: 2, afterFeel: '释然', lang: 'zh' },
    { id: 'creative-tools', href: 'article/creative-tools.html', title: '学会说「不」之后，我的世界安静了', categories: ['人际关系'], needs: ['被点醒'], themes: ['关系', '边界'], intent: 'insight', intensity: 2, afterFeel: '启发', lang: 'zh' },
    { id: 'reread-old-book', href: 'article/reread-old-book.html', title: '重读一本旧书，像和老朋友重逢', categories: ['阅读治愈'], needs: ['被陪伴', '安静的共鸣'], themes: ['阅读', '时间'], intent: 'companion', intensity: 1, afterFeel: '温暖', lang: 'zh' },
    { id: 'restart-year', href: 'article/restart-year.html', title: '重新出发的第一年，我把「完美」放下了', categories: ['重新出发'], needs: ['被允许慢', '被点醒', '被接住'], themes: ['重新开始', '与旧自己和好'], intent: 'companion', intensity: 1, afterFeel: '释然', lang: 'zh' }
  ];

  /* 需求 → 推荐理由文案（自然、克制） */
  var REASON_BY_NEED = {
    '被允许休息': '如果你今晚不太想解决什么，也许可以先读这一篇。',
    '被允许不睡': '这篇不催你睡，只是想陪你度过今晚。',
    '被陪伴': '这篇不是要给你答案，是想在旁边陪你一会儿。',
    '被安慰': '如果今晚有点难，这一篇或许能轻轻接住你。',
    '被理解': '这一篇说的，也许正是你此刻没说出口的部分。',
    '被接住': '这一篇，想轻轻接住现在的你。',
    '被允许独处': '一个人也没关系，这一篇陪你慢慢待一会儿。',
    '被允许不完美': '今晚可以不完美，这一篇想让你松一口气。',
    '被允许慢': '不着急，这一篇陪你慢慢来。',
    '被点醒': '今晚你可能不是需要安慰，是需要有人把话说透一点。',
    '安静的共鸣': '这一篇不喧哗，只是安静地懂你。'
  };
  var REASON_BY_INTENT = {
    companion: '这篇不急着给你答案，只是想陪你坐一会儿。',
    insight: '这一篇，或许能给你一个不一样的角度。',
    action: '这一篇，想给你一点今晚就能用上的力气。'
  };

  function makeId() {
    return 'rs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function defaultState(now) {
    now = now || Date.now();
    return {
      schemaVersion: 1,
      sessionId: makeId(),
      updatedAt: now,
      expiresAt: now + TTL_MS,
      currentNeeds: [],          // [{need, strength, source}]
      lifeSignals: [],           // [{theme, confidence:'low', source}]
      intent: { companion: 0, insight: 0, action: 0 },
      intensityTolerance: 2,     // 1 light, 2 balanced, 3 heavy
      readingHistory: { recentReads: [], skipped: [] },
      explicit: { notNow: [], wantMore: [], avoidTopics: [] },
      confidence: 'low'
    };
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function topIntent(state) {
    var i = state.intent || {};
    var max = 0, key = null;
    ['companion', 'insight', 'action'].forEach(function (k) {
      if ((i[k] || 0) > max) { max = i[k] || 0; key = k; }
    });
    return max === 0 ? null : key;
  }

  function hasAny(article, list) {
    var pool = (article.needs || []).concat(article.themes || [], article.categories || []);
    for (var i = 0; i < list.length; i++) { if (pool.indexOf(list[i]) !== -1) { return true; } }
    return false;
  }

  /* 可解释评分：纯函数，结果可复现 */
  function scoreArticle(article, state) {
    if (state.explicit && state.explicit.avoidTopics) {
      var av = (article.themes || []).concat(article.categories || []);
      if (state.explicit.avoidTopics.some(function (t) { return av.indexOf(t) !== -1; })) { return null; }
    }
    if (state.explicit && state.explicit.notNow && state.explicit.notNow.indexOf(article.id) !== -1) { return null; }

    var score = 0;
    var matchedNeeds = [];

    (state.currentNeeds || []).forEach(function (n) {
      if ((article.needs || []).indexOf(n.need) !== -1) {
        var s = clamp(n.strength || 0.5, 0, 1);
        score += 10 * s;
        matchedNeeds.push(n.need);
      }
    });

    var want = (state.explicit && state.explicit.wantMore) || [];
    if (want.length && hasAny(article, want)) { score += 12; }

    var intent = topIntent(state);
    if (intent && article.intent === intent) { score += 8; }
    else if (intent === 'insight' && article.intent === 'companion') { score += 2; }
    else if (intent === 'companion' && article.intent === 'insight') { score += 2; }

    var st = typeof state.intensityTolerance === 'number' ? state.intensityTolerance : 2;
    score += Math.max(0, 8 - 3 * Math.abs(st - (article.intensity || 1)));

    var reads = (state.readingHistory && state.readingHistory.recentReads) || [];
    var read = reads.filter(function (r) { return r.articleId === article.id; });
    if (read.length) {
      score += read.some(function (r) { return r.completed; }) ? -12 : -6;
    }

    return { article: article, score: Math.round(score * 100) / 100, matchedNeeds: matchedNeeds };
  }

  function reasonFor(result, state) {
    var art = result.article;
    if (result.matchedNeeds && result.matchedNeeds.length) {
      var need = result.matchedNeeds[0];
      if (REASON_BY_NEED[need]) { return REASON_BY_NEED[need]; }
    }
    var intent = topIntent(state);
    if (intent && REASON_BY_INTENT[intent]) { return REASON_BY_INTENT[intent]; }
    return REASON_BY_INTENT[art.intent] || REASON_BY_INTENT.companion;
  }

  function explainFor(result, state) {
    var parts = [];
    if (result.matchedNeeds && result.matchedNeeds.length) {
      parts.push('回应了你此刻的「' + result.matchedNeeds[0] + '」');
    }
    if (result.article.themes && result.article.themes.length) {
      parts.push('主题：' + result.article.themes[0]);
    }
    if (state.explicit && state.explicit.wantMore && state.explicit.wantMore.length) {
      parts.push('你选择了「' + state.explicit.wantMore[0] + '」');
    }
    return parts;
  }

  function compute(articles, state, k) {
    articles = articles || ARTICLES;
    k = k || 3;
    var scored = articles.map(function (a) { return scoreArticle(a, state); }).filter(Boolean);
    scored.sort(function (x, y) { return y.score - x.score; });
    var top = scored.slice(0, k).map(function (r) {
      return {
        article: r.article,
        score: r.score,
        matchedNeeds: r.matchedNeeds,
        reason: reasonFor(r, state),
        explain: explainFor(r, state)
      };
    });
    return { results: top, hasSignals: !!(state.currentNeeds && state.currentNeeds.length) || !!(state.explicit && (state.explicit.wantMore.length || state.explicit.avoidTopics.length || state.explicit.notNow.length)) };
  }

  window.SoulHavenReaderCore = {
    VERSION: VERSION,
    TTL_MS: TTL_MS,
    MOOD_MAP: MOOD_MAP,
    TOPIC_MAP: TOPIC_MAP,
    ARTICLES: ARTICLES,
    REASON_BY_NEED: REASON_BY_NEED,
    REASON_BY_INTENT: REASON_BY_INTENT,
    defaultState: defaultState,
    compute: compute
  };
})();