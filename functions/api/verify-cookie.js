/**
 * Cloudflare Pages Function: Verify Cookie
 * 路径: /api/verify-cookie
 */

const GIFFGAFF_API = {
    GRAPHQL_URL: 'https://publicapi.giffgaff.com/gateway/graphql'
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

export async function onRequestPost({ request }) {
    try {
        console.log('[Verify Cookie] POST request received');
        console.log('[Verify Cookie] Request method:', request.method);
        console.log('[Verify Cookie] Request headers:', JSON.stringify([...request.headers]));

        const body = await request.json();
        console.log('[Verify Cookie] Request body parsed');

        const { cookie } = body;

        if (!cookie) {
            console.error('[Verify Cookie] No cookie provided');
            return jsonResponse({ error: 'Missing cookie' }, 400);
        }

        console.log('[Verify Cookie] Cookie received, length:', cookie.length);

        // 使用Cookie调用Giffgaff API验证
        console.log('[Verify Cookie] Calling Giffgaff API...');

        // 模拟 iOS App headers（避免触发 WAF）
        const appHeaders = {
            'Content-Type': 'application/json',
            'Cookie': cookie,
            'User-Agent': 'giffgaff/1332 CFNetwork/1568.300.101 Darwin/24.2.0'
        };

        const response = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: appHeaders,
            body: JSON.stringify({
                query: `query { viewer { member { id } } }`
            })
        });

        console.log('[Verify Cookie] Giffgaff API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Verify Cookie] Giffgaff API failed');
            console.error('[Verify Cookie] Status:', response.status);
            console.error('[Verify Cookie] Response:', errorText);
            return jsonResponse({
                error: 'Cookie validation failed',
                details: errorText,
                status: response.status
            }, response.status);
        }

        const data = await response.json();
        console.log('[Verify Cookie] Giffgaff API response received');

        if (data.errors) {
            console.error('[Verify Cookie] GraphQL errors:', data.errors);
            return jsonResponse({
                error: 'Invalid cookie',
                details: data.errors
            }, 400);
        }

        console.log('[Verify Cookie] Cookie validation successful');

        // 返回一个临时token（使用 btoa 而不是 Buffer）
        const access_token = btoa(cookie);

        return jsonResponse({
            access_token: access_token
        });
    } catch (error) {
        console.error('Verify cookie error:', error);
        return jsonResponse({
            error: 'Cookie verification failed',
            details: error.message
        }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        }
    });
}
