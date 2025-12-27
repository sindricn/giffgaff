/**
 * Cloudflare Pages Function: Member Info
 * 路径: /api/member-info
 */

const GIFFGAFF_API = {
    GRAPHQL_URL: 'https://publicapi.giffgaff.com/gateway/graphql'
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MFA-Signature',
};

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

export async function onRequestPost({ request }) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        const mfaSignature = request.headers.get('X-MFA-Signature');

        console.log('[Member Info] Starting request');
        console.log('[Member Info] Access token present:', !!accessToken);
        console.log('[Member Info] MFA signature present:', !!mfaSignature);

        const query = `
            query getMemberProfileAndSim {
                memberProfile {
                    id
                    memberName
                    __typename
                }
                sim {
                    phoneNumber
                    status
                    __typename
                }
            }
        `;

        // 设备信息 headers（模拟 iOS App）
        const deviceHeaders = {
            'x-gg-app-os': 'iOS',
            'x-gg-app-os-version': '14',
            'x-gg-app-build-number': '722',
            'x-gg-app-device-manufacturer': 'apple',
            'x-gg-app-device-model': 'iphone15',
            'x-gg-app-version': '13.21.2'
        };

        // 浏览器 headers
        const browserHeaders = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Origin': 'https://www.giffgaff.com',
            'Referer': 'https://www.giffgaff.com/'
        };

        // 构建请求 headers（MFA signature 可选）
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...deviceHeaders,
            ...browserHeaders
        };

        // 只在有 MFA signature 时添加
        if (mfaSignature) {
            requestHeaders['X-MFA-Signature'] = mfaSignature;
        }

        const response = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Member Info] Request failed');
            console.error('[Member Info] Status:', response.status);
            console.error('[Member Info] Response:', errorText);
            return jsonResponse({
                error: 'Failed to fetch member info',
                details: errorText,
                status: response.status
            }, response.status);
        }

        const data = await response.json();
        console.log('[Member Info] Response received successfully');

        if (data.errors) {
            console.error('[Member Info] GraphQL errors:', data.errors);
            return jsonResponse({
                error: data.errors[0].message,
                details: data.errors
            }, 400);
        }

        const memberProfile = data.data.memberProfile;
        const sim = data.data.sim;

        console.log('[Member Info] Member ID:', memberProfile.id);
        console.log('[Member Info] Member Name:', memberProfile.memberName);

        return jsonResponse({
            memberId: memberProfile.id,
            memberName: memberProfile.memberName,
            phoneNumber: sim?.phoneNumber,
            simStatus: sim?.status
        });
    } catch (error) {
        console.error('[Member Info] Exception:', error);
        console.error('[Member Info] Error message:', error.message);
        console.error('[Member Info] Stack trace:', error.stack);
        return jsonResponse({
            error: 'Failed to fetch member info',
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
