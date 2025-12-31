/**
 * Vercel Serverless Function: Token Exchange
 * 路径: /api/token-exchange
 */

// OAuth 配置
const CONFIG = {
    CLIENT_ID: '4a05bf219b3985647d9b9a3ba610a9ce',
    CLIENT_SECRET: process.env.GIFFGAFF_CLIENT_SECRET || 'OQv4cfiyol8TvCW4yiLGj0c1AkTR3N2JfRzq7XGqMxk='
};

export default async function handler(req, res) {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, code_verifier, redirect_uri } = req.body;

        console.log('[Vercel Token Exchange] Starting request');
        console.log('[Vercel Token Exchange] Code present:', !!code);
        console.log('[Vercel Token Exchange] Code verifier present:', !!code_verifier);

        if (!code || !code_verifier) {
            console.error('[Vercel Token Exchange] Missing required parameters');
            return res.status(400).json({ error: 'Missing code or code_verifier' });
        }

        const clientId = CONFIG.CLIENT_ID;
        const clientSecret = CONFIG.CLIENT_SECRET;

        console.log('[Vercel Token Exchange] Using client ID:', clientId);

        // 构建 Basic Auth header
        const credentials = `${clientId}:${clientSecret}`;
        const base64 = Buffer.from(credentials).toString('base64');

        const tokenUrl = 'https://id.giffgaff.com/auth/oauth/token';
        const formData = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri || 'giffgaff://auth/callback/',
            code_verifier: code_verifier
        });

        // 模拟 iOS App headers（避免触发 WAF）
        const appHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${base64}`,
            'User-Agent': 'giffgaff/1332 CFNetwork/1568.300.101 Darwin/24.2.0'
        };

        console.log('[Vercel Token Exchange] Calling Giffgaff OAuth API...');

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: appHeaders,
            body: formData.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Vercel Token Exchange] Request failed');
            console.error('[Vercel Token Exchange] Status:', response.status);
            console.error('[Vercel Token Exchange] Response:', errorText);
            return res.status(response.status).json({
                error: 'Token exchange failed',
                details: errorText,
                status: response.status
            });
        }

        const data = await response.json();
        console.log('[Vercel Token Exchange] Success');
        console.log('[Vercel Token Exchange] Access token received:', !!data.access_token);

        return res.status(200).json(data);
    } catch (error) {
        console.error('[Vercel Token Exchange] Exception:', error);
        console.error('[Vercel Token Exchange] Error message:', error.message);
        return res.status(500).json({
            error: 'Token exchange failed',
            details: error.message
        });
    }
}
