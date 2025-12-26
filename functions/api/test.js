/**
 * 简单的测试 Function
 * 路径: /api/test
 */

export async function onRequest() {
    return new Response(JSON.stringify({
        success: true,
        message: 'Functions are working!',
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
