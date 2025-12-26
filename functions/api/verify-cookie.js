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
        const { cookie } = await request.json();

        if (!cookie) {
            return jsonResponse({ error: 'Missing cookie' }, 400);
        }

        // 使用Cookie调用Giffgaff API验证
        const response = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify({
                query: `query { viewer { member { id } } }`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cookie validation failed:', errorText);
            return jsonResponse({
                error: 'Cookie validation failed',
                details: errorText
            }, response.status);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('Cookie validation errors:', data.errors);
            return jsonResponse({
                error: 'Invalid cookie',
                details: data.errors
            }, 400);
        }

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
