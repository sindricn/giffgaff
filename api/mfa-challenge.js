/**
 * Vercel Serverless Function: MFA Challenge
 */

const GIFFGAFF_API = {
    MFA_CHALLENGE_URL: 'https://id.giffgaff.com/v4/mfa/challenge/me'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { channel } = req.body;
        const accessToken = req.headers.authorization?.replace('Bearer ', '');

        console.log('[Vercel MFA Challenge] Starting request');
        console.log('[Vercel MFA Challenge] Channel:', channel || 'EMAIL');

        const appHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'giffgaff/1332 CFNetwork/1568.300.101 Darwin/24.2.0'
        };

        const response = await fetch(GIFFGAFF_API.MFA_CHALLENGE_URL, {
            method: 'POST',
            headers: appHeaders,
            body: JSON.stringify({
                source: 'esim',
                preferredChannels: [channel || 'EMAIL']
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Vercel MFA Challenge] Failed:', response.status);
            return res.status(response.status).json({
                error: 'Failed to send MFA code',
                details: errorText
            });
        }

        const data = await response.json();
        console.log('[Vercel MFA Challenge] Success');

        return res.status(200).json({ success: true, ref: data.ref });
    } catch (error) {
        console.error('[Vercel MFA Challenge] Exception:', error.message);
        return res.status(500).json({
            error: 'Failed to send MFA code',
            details: error.message
        });
    }
}
