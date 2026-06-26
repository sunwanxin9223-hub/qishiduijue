/**
 * CDN加速 Service Worker — 首次安装后所有资源走 jsDelivr 国内节点
 */
const CDN = 'https://cdn.jsdelivr.net/gh/sunwanxin9223-hub/qishiduijue@master';

self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    // 只代理 GitHub Pages 的资源请求，跳过 API 和外部链接
    if (url.hostname.includes('github.io') || url.hostname.includes('sunwanxin9223-hub')) {
        // 只对 /qishiduijue/ 路径下的资源走 CDN
        if (url.pathname.startsWith('/qishiduijue/')) {
            const cdnUrl = CDN + url.pathname.replace('/qishiduijue/', '');
            e.respondWith(
                fetch(cdnUrl, { 
                    mode: 'cors',
                    credentials: 'omit'
                }).catch(() => fetch(e.request)) // CDN失败时回退到原站
            );
        }
    }
});
