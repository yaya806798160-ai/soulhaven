/* ============================================
   墨白小栈 — 交互脚本
   治愈系 · 温暖文艺风格
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileMenu();
  initReadingProgress();
  initScrollAnimations();
  initCategoryFilter();
  initCopyShareLink();
  initSubscribeForm();
  initTopicParam();
});

/* ---------- 暗色模式切换 ---------- */
function initThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  // 读取保存的主题
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggle.textContent = '☀️';
  } else {
    toggle.textContent = '🌙';
  }

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      toggle.textContent = '🌙';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      toggle.textContent = '☀️';
    }
  });
}

/* ---------- 移动端菜单 ---------- */
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.navbar-links');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
  });

  // 点击链接后关闭菜单
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
    });
  });

  // 点击页面其他地方关闭
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
    }
  });
}

/* ---------- 阅读进度条 ---------- */
function initReadingProgress() {
  const bar = document.querySelector('.reading-progress');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  });
}

/* ---------- 滚动渐入动画 ---------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  if (elements.length === 0) return;

  // 先给所有元素添加 loaded 类，确保内容可见
  elements.forEach(el => el.classList.add('loaded'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ---------- 文章分类筛选 ---------- */
function initCategoryFilter() {
  const buttons = document.querySelectorAll('.category-filter button');
  if (buttons.length === 0) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.category;
      const items = document.querySelectorAll('.article-list-item');

      items.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
          item.style.display = 'flex';
          // 触发渐入动画
          item.classList.add('fade-in');
          setTimeout(() => item.classList.add('visible'), 50);
        } else {
          item.style.display = 'none';
          item.classList.remove('visible');
        }
      });

      // 检查是否为空
      const visibleItems = document.querySelectorAll('.article-list-item[style*="display: flex"], .article-list-item:not([style*="display: none"])');
      const emptyState = document.querySelector('.empty-state');
      const realVisible = Array.from(visibleItems).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none';
      });

      if (realVisible.length === 0 && emptyState) {
        emptyState.style.display = 'block';
      } else if (emptyState) {
        emptyState.style.display = 'none';
      }
    });
  });
}

/* ---------- 复制分享链接 ---------- */
function initCopyShareLink() {
  const btn = document.querySelector('.share-copy-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const original = btn.textContent;
      btn.textContent = '✓ 已复制';
      btn.style.color = 'var(--color-pine)';
      btn.style.borderColor = 'var(--color-pine)';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    });
  });
}

/* ---------- 图片懒加载 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  if ('loading' in HTMLImageElement.prototype) return; // 原生支持

  // 降级方案：Intersection Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });

  lazyImages.forEach(img => observer.observe(img));
});

/* ---------- 订阅表单（本地记录 + 温柔反馈，后端接入前先保存在本机） ---------- */
function initSubscribeForm() {
  const form = document.getElementById('subscribe-form');
  if (!form) return;
  const emailInput = document.getElementById('subscribe-email');
  const feedback = document.getElementById('subscribe-feedback');
  if (!emailInput || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = emailInput.value.trim();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      feedback.textContent = '请填写一个有效的邮箱地址，好吗？';
      feedback.hidden = false;
      emailInput.focus();
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem('mobaixz_waitlist') || '[]');
      if (!list.includes(val)) {
        list.push(val);
        localStorage.setItem('mobaixz_waitlist', JSON.stringify(list));
      }
    } catch (err) { /* 隐私模式下忽略 */ }
    feedback.textContent = '收到了。谢谢你愿意把心事放在这里——第一封信，会写给你。';
    feedback.hidden = false;
    form.reset();
  });
}

/* ---------- 文章列表按分类参数筛选（首页情绪卡/主题标签/探索卡跳转用） ---------- */
function initTopicParam() {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic');
  if (!topic) return;
  const btn = document.querySelector('.category-filter button[data-category="' + topic + '"]');
  if (btn) btn.click();
}
