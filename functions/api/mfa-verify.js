/**
 * Cloudflare Pages Function: MFA Verify
 * 路径: /api/mfa-verify
 */

const GIFFGAFF_API = {
    MFA_VALIDATION_URL: 'https://id.giffgaff.com/v4/mfa/validation'
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

export async function onRequestPost({ request }) {
    try {
        const { code, ref } = await request.json();
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        console.log('[MFA Verify] Starting request');
        console.log('[MFA Verify] Code present:', !!code);
        console.log('[MFA Verify] Ref present:', !!ref);
        console.log('[MFA Verify] Access token present:', !!accessToken);

        // 浏览器 headers（模拟真实浏览器）
        const browserHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Origin': 'https://www.giffgaff.com',
            'Referer': 'https://www.giffgaff.com/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site'
        };

        const response = await fetch(GIFFGAFF_API.MFA_VALIDATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                ...browserHeaders
            },
            body: JSON.stringify({
                ref: ref,
                code: code
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[MFA Verify] Request failed');
            console.error('[MFA Verify] Status:', response.status);
            console.error('[MFA Verify] Response:', errorText);
            return jsonResponse({
                error: 'MFA verification failed',
                details: errorText,
                status: response.status
            }, response.status);
        }

        const data = await response.json();
        console.log('[MFA Verify] Success');
        console.log('[MFA Verify] Signature received:', !!data.signature);

        return jsonResponse({ mfa_signature: data.signature });
    } catch (error) {
        console.error('[MFA Verify] Exception:', error);
        console.error('[MFA Verify] Error message:', error.message);
        console.error('[MFA Verify] Stack trace:', error.stack);
        return jsonResponse({
            error: 'MFA verification failed',
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
