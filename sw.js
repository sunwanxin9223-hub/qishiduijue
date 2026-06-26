/**
 * 自毁 Service Worker — 安装后立即注销自己
 * 用于清除旧的 CDN 重定向 SW
 */
self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    // 立即注销，不再拦截任何请求
    e.waitUntil(self.registration.unregister());
});
