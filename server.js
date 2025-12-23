/**
 * 简单的本地开发服务器
 * 不需要 Wrangler，使用 Node.js 原生模块
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME 类型映射
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 模拟的 API 端点（开发环境）
const API_HANDLERS = {
    '/api/token-exchange': async (req) => {
        console.log('⚠️  开发模式：token-exchange 需要实际的 Giffgaff API');
        return { error: 'Development mode: Connect to actual API or deploy to Cloudflare' };
    },
    '/api/verify-cookie': async (req) => {
        console.log('⚠️  开发模式：verify-cookie 需要实际的 Giffgaff API');
        return { error: 'Development mode: Connect to actual API or deploy to Cloudflare' };
    }
};

const server = createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MFA-Signature');

    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 处理 API 请求（开发模式提示）
    if (req.url.startsWith('/api/')) {
        const handler = API_HANDLERS[req.url];
        if (handler) {
            const result = await handler(req);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
    }

    // 处理静态文件
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = join(__dirname, filePath);

    if (!existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 Giffgaff eSIM 本地开发服务器          ║
╚════════════════════════════════════════════╝

✅ 服务器运行在: http://localhost:${PORT}
📱 在浏览器打开查看界面

⚠️  开发模式说明:
   - 前端界面可以正常预览
   - API 功能需要部署到 Cloudflare 才能完整使用
   - 或者在 app.js 中直接调用 Giffgaff API

💡 提示:
   - 修改代码后刷新浏览器即可看到效果
   - 按 Ctrl+C 停止服务器
   - 准备部署时运行: npm run deploy

`);
});
