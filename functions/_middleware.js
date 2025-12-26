/**
 * Cloudflare Pages Functions 中间件
 * 处理所有请求的 CORS
 */

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MFA-Signature',
    'Access-Control-Max-Age': '86400',
};

export async function onRequest(context) {
    // 处理 OPTIONS 预检请求
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: CORS_HEADERS
        });
    }

    // 继续处理请求
    const response = await context.next();

    // 添加 CORS headers 到所有响应
    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        newHeaders.set(key, value);
    });

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}
