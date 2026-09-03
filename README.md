# SoulHavenWeb — 墨白小栈网站（长期维护源码）

> 治愈系文字陪伴站 · 与 Soul Haven YouTube 疗愈频道联动
> 维护起始：2026-08-25（接管自 WorkBuddy 创建的站点，源码以线上预览为准重建）

## 目录结构
```
index.html            首页（共情改版：情绪入口/写给你的一封信/读者心声/共情文案/主题分类）
about.html            关于墨白（治愈系定位）
support.html          支持墨白（微信赞赏码 / Ko-fi / 付费信件专栏筹备中 / FAQ）
articles/index.html   文章列表（8 大主题分类筛选，支持 ?topic= 参数）
article/*.html        8 篇文章（墨白口吻的治愈系散文）
assets/css/style.css  全局样式（含暗色模式）
assets/js/main.js     交互脚本（主题/菜单/筛选/订阅本地记录/分类参数）
assets/images/        占位封面 SVG + favicon.svg + og-cover.png + support/support-qr.jpg
maintenance/          维护文档（content-guide.md 内容契约 / 变现方案.md 变现与决策记录）
robots.txt / sitemap.xml  SEO
```

## 8 大内容分类（与首页主题一致）
情绪自救 qingxu-zijiu / 焦虑应对 jiaolv-yingdui / 人际关系 renji-guanxi / 自我和解 ziwo-hejie / 深夜电台 shenye-diantai / 阅读治愈 yuedu-zhiyu / 独处时光 dushu-shiguang / 重新出发 chongxin-chufa

## 8 篇文章
slow-living（焦虑应对）· reading-notes（深夜电台）· creative-tools（人际关系）· morning-ritual（独处时光）· restart-year（重新出发）· reread-old-book（阅读治愈）· unspoken-emotions（情绪自救）· no-effort-today（自我和解）

## 维护约定
- 不改品牌定位：治愈/共情是唯一定位。
- 新文章先定 slug/标题/分类/日期/封面，再按 content-guide.md 的「墨白的声音」写正文（700–1100 字）。
- 上一篇/下一篇按日期循环串联，新增文章时更新全部相关 nav。
- 每页保持：canonical + og 标签 + JSON-LD + favicon；og:image 用绝对 URL。
- 发布域名目前为预览域名 ab54b4328fe8f1786.sh5.agentos-app.net，正式域名确定后需全局替换（canonical/og/sitemap/robots）。
- 订阅表单当前为本地记录（localStorage），后端接入点已留（#subscribe-form / initSubscribeForm）。
- 社交入口：YouTube https://www.youtube.com/@sandy-yaya（Soul Haven 频道）；邮箱 yaya806798160@163.com（真实邮箱，2026-09-01 已替换全站占位）。
- 灯塔统计脚本保持 async 加载，勿阻塞渲染。
