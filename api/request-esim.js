/**
 * Vercel Serverless Function: Request eSIM
 */

const GIFFGAFF_API = {
    GRAPHQL_URL: 'https://publicapi.giffgaff.com/gateway/graphql'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MFA-Signature');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { memberId } = req.body;
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const mfaSignature = req.headers['x-mfa-signature'];

        console.log('[Vercel Request eSIM] Starting process');

        const deviceHeaders = {
            'x-gg-app-os': 'iOS',
            'x-gg-app-os-version': '14',
            'x-gg-app-build-number': '722',
            'x-gg-app-device-manufacturer': 'apple',
            'x-gg-app-device-model': 'iphone15',
            'x-gg-app-version': '13.21.2'
        };

        const baseHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-MFA-Signature': mfaSignature,
            'User-Agent': 'giffgaff/1332 CFNetwork/1568.300.101 Darwin/24.2.0',
            ...deviceHeaders
        };

        // 步骤1: 预订eSIM
        console.log('[Vercel Request eSIM] Step 1: Reserving eSIM');
        const reserveResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({
                query: `
                    mutation reserveESim($input: ESimReservationInput!) {
                        reserveESim: reserveESim(input: $input) {
                            esim {
                                ssn
                                activationCode
                            }
                        }
                    }
                `,
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
            console.error('[Vercel Request eSIM] Reserve failed');
            return res.status(reserveResponse.status).json({
                error: 'Failed to reserve eSIM',
                details: errorText
            });
        }

        const reserveData = await reserveResponse.json();
        if (reserveData.errors) {
            return res.status(400).json({
                error: reserveData.errors[0].message,
                details: reserveData.errors
            });
        }

        const { ssn, activationCode } = reserveData.data.reserveESim.esim;
        console.log('[Vercel Request eSIM] Step 1 complete');

        // 步骤2: 交换SIM卡
        console.log('[Vercel Request eSIM] Step 2: Swapping SIM');
        const swapResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({
                query: `
                    mutation SwapSim($activationCode: String!, $mfaSignature: String!) {
                        swapSim(activationCode: $activationCode, mfaSignature: $mfaSignature) {
                            new {
                                ssn
                                activationCode
                            }
                        }
                    }
                `,
                variables: {
                    activationCode: activationCode,
                    mfaSignature: mfaSignature
                }
            })
        });

        if (!swapResponse.ok) {
            const errorText = await swapResponse.text();
            console.error('[Vercel Request eSIM] Swap failed');
            return res.status(swapResponse.status).json({
                error: 'Failed to swap SIM',
                details: errorText
            });
        }

        const swapData = await swapResponse.json();
        if (swapData.errors) {
            return res.status(400).json({
                error: swapData.errors[0].message,
                details: swapData.errors
            });
        }

        console.log('[Vercel Request eSIM] Step 2 complete');

        // 步骤3: 获取eSIM下载令牌
        console.log('[Vercel Request eSIM] Step 3: Getting download token');
        const tokenResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({
                query: `
                    query eSimDownloadToken($ssn: String!) {
                        eSimDownloadToken(ssn: $ssn) {
                            lpaString
                        }
                    }
                `,
                variables: { ssn: ssn }
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('[Vercel Request eSIM] Get token failed');
            return res.status(tokenResponse.status).json({
                error: 'Failed to get eSIM download token',
                details: errorText
            });
        }

        const tokenData = await tokenResponse.json();
        if (tokenData.errors) {
            return res.status(400).json({
                error: tokenData.errors[0].message,
                details: tokenData.errors
            });
        }

        console.log('[Vercel Request eSIM] All steps complete!');

        return res.status(200).json({
            activationCode,
            ssn,
            lpaString: tokenData.data.eSimDownloadToken.lpaString
        });
    } catch (error) {
        console.error('[Vercel Request eSIM] Exception:', error.message);
        return res.status(500).json({
            error: 'Failed to request eSIM',
            details: error.message
        });
    }
}
