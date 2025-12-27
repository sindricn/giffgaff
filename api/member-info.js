/**
 * Vercel Serverless Function: Member Info
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
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const mfaSignature = req.headers['x-mfa-signature'];

        console.log('[Vercel Member Info] Starting request');

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

        const deviceHeaders = {
            'x-gg-app-os': 'iOS',
            'x-gg-app-os-version': '14',
            'x-gg-app-build-number': '722',
            'x-gg-app-device-manufacturer': 'apple',
            'x-gg-app-device-model': 'iphone15',
            'x-gg-app-version': '13.21.2'
        };

        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Origin': 'https://www.giffgaff.com',
            'Referer': 'https://www.giffgaff.com/',
            ...deviceHeaders
        };

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
            console.error('[Vercel Member Info] Failed:', response.status);
            return res.status(response.status).json({
                error: 'Failed to fetch member info',
                details: errorText
            });
        }

        const data = await response.json();

        if (data.errors) {
            return res.status(400).json({
                error: data.errors[0].message,
                details: data.errors
            });
        }

        console.log('[Vercel Member Info] Success');

        return res.status(200).json({
            memberId: data.data.memberProfile.id,
            memberName: data.data.memberProfile.memberName,
            phoneNumber: data.data.sim?.phoneNumber,
            simStatus: data.data.sim?.status
        });
    } catch (error) {
        console.error('[Vercel Member Info] Exception:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch member info',
            details: error.message
        });
    }
}
