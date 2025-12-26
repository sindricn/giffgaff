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

        if (!code || !code_verifier) {
            return jsonResponse({ error: 'Missing code or code_verifier' }, 400);
        }

        const clientId = CONFIG.CLIENT_ID;
        const clientSecret = env.GIFFGAFF_CLIENT_SECRET || CONFIG.CLIENT_SECRET;

        console.log('OAuth Token Exchange:');
        console.log('- Using client ID:', clientId);
        console.log('- Client secret source:', env.GIFFGAFF_CLIENT_SECRET ? 'environment' : 'default config');

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

        // 调用 Giffgaff OAuth API
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-GB,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Origin': 'https://www.giffgaff.com',
                'Referer': 'https://www.giffgaff.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site'
            },
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange failed:', response.status, errorText);
            return jsonResponse({
                error: 'Token exchange failed',
                details: errorText,
                status: response.status
            }, response.status);
        }

        const data = await response.json();
        return jsonResponse(data);
    } catch (error) {
        console.error('Token exchange error:', error);
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
