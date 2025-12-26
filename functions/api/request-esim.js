/**
 * Cloudflare Pages Function: Request eSIM
 * 路径: /api/request-esim
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
        const { memberId } = await request.json();
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        const mfaSignature = request.headers.get('X-MFA-Signature');

        console.log('Starting eSIM request process for member:', memberId);

        // 步骤1: 预订eSIM
        const reserveMutation = `
            mutation reserveESim($input: ESimReservationInput!) {
                reserveESim: reserveESim(input: $input) {
                    id
                    memberId
                    reservationStartDate
                    reservationEndDate
                    status
                    esim {
                        ssn
                        activationCode
                        deliveryStatus
                        associatedMemberId
                        __typename
                    }
                    __typename
                }
            }
        `;

        const deviceHeaders = {
            'x-gg-app-os': 'iOS',
            'x-gg-app-os-version': '14',
            'x-gg-app-build-number': '722',
            'x-gg-app-device-manufacturer': 'apple',
            'x-gg-app-device-model': 'iphone15',
            'x-gg-app-version': '13.21.2'
        };

        const reserveResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-MFA-Signature': mfaSignature,
                ...deviceHeaders
            },
            body: JSON.stringify({
                query: reserveMutation,
                variables: {
                    input: {
                        memberId: memberId,
                        userIntent: 'SWITCH'
                    }
                }
            })
        });

        if (!reserveResponse.ok) {
            const errorText = await reserveResponse.text();
            console.error('Failed to reserve eSIM:', errorText);
            return jsonResponse({
                error: 'Failed to reserve eSIM',
                details: errorText
            }, reserveResponse.status);
        }

        const reserveData = await reserveResponse.json();

        if (reserveData.errors) {
            console.error('Reserve eSIM GraphQL errors:', reserveData.errors);
            return jsonResponse({
                error: reserveData.errors[0].message,
                details: reserveData.errors
            }, 400);
        }

        const { ssn, activationCode } = reserveData.data.reserveESim.esim;
        console.log('eSIM reserved successfully');

        // 步骤2: 交换SIM卡
        const swapMutation = `
            mutation SwapSim($activationCode: String!, $mfaSignature: String!) {
                swapSim(activationCode: $activationCode, mfaSignature: $mfaSignature) {
                    old {
                        ssn
                        activationCode
                        __typename
                    }
                    new {
                        ssn
                        activationCode
                        __typename
                    }
                    __typename
                }
            }
        `;

        const swapResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-MFA-Signature': mfaSignature,
                ...deviceHeaders
            },
            body: JSON.stringify({
                query: swapMutation,
                variables: {
                    activationCode: activationCode,
                    mfaSignature: mfaSignature
                }
            })
        });

        if (!swapResponse.ok) {
            const errorText = await swapResponse.text();
            console.error('Failed to swap SIM:', errorText);
            return jsonResponse({
                error: 'Failed to swap SIM',
                details: errorText
            }, swapResponse.status);
        }

        const swapData = await swapResponse.json();

        if (swapData.errors) {
            console.error('Swap SIM GraphQL errors:', swapData.errors);
            return jsonResponse({
                error: swapData.errors[0].message,
                details: swapData.errors
            }, 400);
        }

        console.log('SIM swap successful');

        // 步骤3: 获取eSIM下载令牌
        const tokenQuery = `
            query eSimDownloadToken($ssn: String!) {
                eSimDownloadToken(ssn: $ssn) {
                    id
                    host
                    matchingId
                    lpaString
                    __typename
                }
            }
        `;

        const tokenResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-MFA-Signature': mfaSignature,
                ...deviceHeaders
            },
            body: JSON.stringify({
                query: tokenQuery,
                variables: {
                    ssn: ssn
                }
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Failed to get eSIM download token:', errorText);
            return jsonResponse({
                error: 'Failed to get eSIM download token',
                details: errorText
            }, tokenResponse.status);
        }

        const tokenData = await tokenResponse.json();

        if (tokenData.errors) {
            console.error('Get token GraphQL errors:', tokenData.errors);
            return jsonResponse({
                error: tokenData.errors[0].message,
                details: tokenData.errors
            }, 400);
        }

        const lpaString = tokenData.data.eSimDownloadToken.lpaString;
        console.log('eSIM download token retrieved successfully');

        return jsonResponse({
            activationCode,
            ssn,
            lpaString
        });
    } catch (error) {
        console.error('Request eSIM error:', error);
        return jsonResponse({
            error: 'Failed to request eSIM',
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
