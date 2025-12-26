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

        const response = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-MFA-Signature': mfaSignature
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch member info:', errorText);
            return jsonResponse({
                error: 'Failed to fetch member info',
                details: errorText
            }, response.status);
        }

        const data = await response.json();

        if (data.errors) {
            return jsonResponse({
                error: data.errors[0].message,
                details: data.errors
            }, 400);
        }

        const memberProfile = data.data.memberProfile;
        const sim = data.data.sim;

        return jsonResponse({
            memberId: memberProfile.id,
            memberName: memberProfile.memberName,
            phoneNumber: sim?.phoneNumber,
            simStatus: sim?.status
        });
    } catch (error) {
        console.error('Member info error:', error);
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
