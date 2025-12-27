/**
 * 测试 verify-cookie 的简化版本
 * 路径: /api/test-verify
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
    console.log('[Test Verify] OPTIONS request received');
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

export async function onRequestPost({ request }) {
    try {
        console.log('[Test Verify] POST request received');

        // 读取请求体
        const body = await request.json();
        console.log('[Test Verify] Request body:', JSON.stringify(body));

        const { cookie } = body;

        if (!cookie) {
            console.log('[Test Verify] No cookie provided');
            return jsonResponse({
                error: 'Missing cookie',
                received: body
            }, 400);
        }

        console.log('[Test Verify] Cookie length:', cookie.length);

        // 不调用外部 API，直接返回成功
        return jsonResponse({
            success: true,
            message: 'Test verify working',
            cookie_length: cookie.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Test Verify] Error:', error);
        return jsonResponse({
            error: 'Test verify failed',
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
