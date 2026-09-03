/* ============================================
   Soul Haven · Language — 双语语言偏好（Phase C）
   优先级：用户手动选择 > 浏览器语言 > 默认中文
   不依赖 IP 地理定位；不因误判强制切换。
   ============================================ */
(function () {
  'use strict';
  var KEY = 'soulhaven_lang';
  var VERSION = '1.2.0';

  function readPref() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writePref(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }
  function browserPrefersEn() {
    try {
      var l = (navigator.language || navigator.userLanguage || '').toLowerCase();
      return l.indexOf('en') === 0;
    } catch (e) { return false; }
  }
  function detect() {
    var p = readPref();
    if (p === 'en' || p === 'zh') { return p; }
    return browserPrefersEn() ? 'en' : 'zh';   // 无法判断时默认中文
  }
  function set(lang) { writePref(lang); }

  /* 在中文首页：若浏览器偏好英文且用户未手动选择过，显示一次克制的英文入口提示 */
  function maybeBanner() {
    if (detect() !== 'en') { return; }
    if (readPref()) { return; }            // 已手动选择过（含选择过中文）
    if (document.getElementById('lang-banner')) { return; }
    try {
      var b = document.createElement('div');
      b.id = 'lang-banner';
      b.setAttribute('role', 'status');
      b.innerHTML = '<span>Prefer reading in English? </span><a href="en/">Read in English →</a><button type="button" id="lang-banner-close" aria-label="关闭">×</button>';
      document.body.appendChild(b);
      var close = document.getElementById('lang-banner-close');
      if (close) {
        close.addEventListener('click', function () {
          writePref('zh');                 // 用户选择留在中文
          b.parentNode.removeChild(b);
        });
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () { maybeBanner(); });

  window.SoulHavenLang = {
    VERSION: VERSION,
    KEY: KEY,
    detect: detect,
    set: set,
    readPref: readPref,
    browserPrefersEn: browserPrefersEn
  };
})();