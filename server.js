const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript',
  '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg',
  '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  
  // 默认返回 index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }
  
  const filePath = path.join(ROOT, pathname);
  const ext = path.extname(filePath).toLowerCase();
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('404:', pathname);
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`游戏服务器已启动: http://localhost:${PORT}`);
  console.log('请等待浏览器自动打开...');
  setTimeout(() => {
    exec('start http://localhost:8080');
  }, 800);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('端口 8080 已被占用，尝试直接打开浏览器...');
    exec('start http://localhost:8080');
  } else {
    console.error('服务器错误:', e);
  }
});
