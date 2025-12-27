/**
 * Cloudflare Pages Function: Token Exchange
 * 路径: /api/token-exchange
 */

// OAuth 配置
const CONFIG = {
    CLIENT_ID: '4a05bf219b3985647d9b9a3ba610a9ce',
    CLIENT_SECRET: 'OQv4cfiyol8TvCW4yiLGj0c1AkTR3N2JfRzq7XGqMxk='
};

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * 处理 OPTIONS 请求（CORS 预检）
 */
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

/**
 * 处理 POST 请求
 */
export async function onRequestPost({ request, env }) {
    try {
        const { code, code_verifier, redirect_uri } = await request.json();

        console.log('[Token Exchange] Starting request');
        console.log('[Token Exchange] Code present:', !!code);
        console.log('[Token Exchange] Code verifier present:', !!code_verifier);
        console.log('[Token Exchange] Redirect URI:', redirect_uri || 'giffgaff://auth/callback/');

        if (!code || !code_verifier) {
            console.error('[Token Exchange] Missing required parameters');
            return jsonResponse({ error: 'Missing code or code_verifier' }, 400);
        }

        const clientId = CONFIG.CLIENT_ID;
        const clientSecret = env.GIFFGAFF_CLIENT_SECRET || CONFIG.CLIENT_SECRET;

        console.log('[Token Exchange] Using client ID:', clientId);
        console.log('[Token Exchange] Client secret source:', env.GIFFGAFF_CLIENT_SECRET ? 'environment' : 'default config');

        // 构建 Basic Auth header
        const credentials = `${clientId}:${clientSecret}`;
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(credentials);
        const base64 = btoa(String.fromCharCode(...encodedData));

        const tokenUrl = 'https://id.giffgaff.com/auth/oauth/token';
        const formData = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri || 'giffgaff://auth/callback/',
            code_verifier: code_verifier
        });

        // 完整的浏览器伪装 headers（尝试绕过 Incapsula WAF）
        const browserHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${base64}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Origin': 'https://www.giffgaff.com',
            'Referer': 'https://www.giffgaff.com/',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        console.log('[Token Exchange] Calling Giffgaff OAuth API with full browser headers...');

        // 调用 Giffgaff OAuth API
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: browserHeaders,
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Token Exchange] Request failed');
            console.error('[Token Exchange] Status:', response.status);
            console.error('[Token Exchange] Response:', errorText);
            return jsonResponse({
                error: 'Token exchange failed',
                details: errorText,
                status: response.status
            }, response.status);
        }

        const data = await response.json();
        console.log('[Token Exchange] Success');
        console.log('[Token Exchange] Access token received:', !!data.access_token);
        console.log('[Token Exchange] Token type:', data.token_type);

        return jsonResponse(data);
    } catch (error) {
        console.error('[Token Exchange] Exception:', error);
        console.error('[Token Exchange] Error message:', error.message);
        console.error('[Token Exchange] Stack trace:', error.stack);
        return jsonResponse({
            error: 'Token exchange failed',
            details: error.message
        }, 500);
    }
}

/**
 * 返回JSON响应
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        }
    });
}
