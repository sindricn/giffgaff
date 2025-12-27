/**
 * Vercel Serverless Function: Test Endpoint
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
        success: true,
        message: 'Vercel Functions are working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        platform: 'Vercel'
    });
}
