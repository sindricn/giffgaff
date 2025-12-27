/**
 * Vercel Serverless Function: MFA Verify
 */

const GIFFGAFF_API = {
    MFA_VALIDATION_URL: 'https://id.giffgaff.com/v4/mfa/validation'
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
        const { code, ref } = req.body;
        const accessToken = req.headers.authorization?.replace('Bearer ', '');

        console.log('[Vercel MFA Verify] Starting request');

        const browserHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Origin': 'https://www.giffgaff.com',
            'Referer': 'https://www.giffgaff.com/'
        };

        const response = await fetch(GIFFGAFF_API.MFA_VALIDATION_URL, {
            method: 'POST',
            headers: browserHeaders,
            body: JSON.stringify({ ref, code })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Vercel MFA Verify] Failed:', response.status);
            return res.status(response.status).json({
                error: 'MFA verification failed',
                details: errorText
            });
        }

        const data = await response.json();
        console.log('[Vercel MFA Verify] Success');

        return res.status(200).json({ mfa_signature: data.signature });
    } catch (error) {
        console.error('[Vercel MFA Verify] Exception:', error.message);
        return res.status(500).json({
            error: 'MFA verification failed',
            details: error.message
        });
    }
}
