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

        // 模拟 iOS App headers（避免触发 WAF）
        const appHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'giffgaff/1332 CFNetwork/1568.300.101 Darwin/24.2.0'
        };

        const response = await fetch(GIFFGAFF_API.MFA_VALIDATION_URL, {
            method: 'POST',
            headers: appHeaders,
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
