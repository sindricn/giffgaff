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

        const response = await fetch(GIFFGAFF_API.MFA_VALIDATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                ref: ref,
                code: code
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('MFA verification failed:', errorText);
            return jsonResponse({
                error: 'MFA verification failed',
                details: errorText
            }, response.status);
        }

        const data = await response.json();
        return jsonResponse({ mfa_signature: data.signature });
    } catch (error) {
        console.error('MFA verify error:', error);
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
