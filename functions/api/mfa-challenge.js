/**
 * Cloudflare Pages Function: MFA Challenge
 * 路径: /api/mfa-challenge
 */

const GIFFGAFF_API = {
    MFA_CHALLENGE_URL: 'https://id.giffgaff.com/v4/mfa/challenge/me'
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
        const { channel } = await request.json();
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        console.log('[MFA Challenge] Starting request');
        console.log('[MFA Challenge] Channel:', channel || 'EMAIL');
        console.log('[MFA Challenge] Access token present:', !!accessToken);

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

        const response = await fetch(GIFFGAFF_API.MFA_CHALLENGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                ...browserHeaders
            },
            body: JSON.stringify({
                source: 'esim',
                preferredChannels: [channel || 'EMAIL']
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[MFA Challenge] Request failed');
            console.error('[MFA Challenge] Status:', response.status);
            console.error('[MFA Challenge] Response:', errorText);
            return jsonResponse({
                error: 'Failed to send MFA code',
                details: errorText,
                status: response.status
            }, response.status);
        }

        const data = await response.json();
        console.log('[MFA Challenge] Success');
        console.log('[MFA Challenge] Ref received:', data.ref);

        return jsonResponse({ success: true, ref: data.ref });
    } catch (error) {
        console.error('[MFA Challenge] Exception:', error);
        console.error('[MFA Challenge] Error message:', error.message);
        console.error('[MFA Challenge] Stack trace:', error.stack);
        return jsonResponse({
            error: 'Failed to send MFA code',
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
