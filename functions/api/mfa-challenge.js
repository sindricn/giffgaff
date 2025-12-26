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

        const response = await fetch(GIFFGAFF_API.MFA_CHALLENGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                source: 'esim',
                preferredChannels: [channel || 'EMAIL']
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('MFA challenge failed:', errorText);
            return jsonResponse({
                error: 'Failed to send MFA code',
                details: errorText
            }, response.status);
        }

        const data = await response.json();
        return jsonResponse({ success: true, ref: data.ref });
    } catch (error) {
        console.error('MFA challenge error:', error);
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
