/**
 * Cloudflare Worker - Giffgaff eSIM API
 * 处理所有后端API请求
 */

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MFA-Signature',
};

// OAuth 配置（用于后端 Token Exchange）
// 注意：CLIENT_SECRET 从环境变量读取，不应硬编码
const CONFIG = {
    CLIENT_ID: '4a05bf219b3985647d9b9a3ba610a9ce'
};

// Giffgaff API 端点（API 代理模式）
const GIFFGAFF_API = {
    GRAPHQL_URL: 'https://publicapi.giffgaff.com/graphql',
    MFA_URL: 'https://api.giffgaff.com/v1/mfa'
};

/**
 * 处理请求的主函数
 */
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
    }

    // API 代理路由（参考 Netlify redirects 方式）
    try {
        // Giffgaff ID API 代理（OAuth 认证）
        if (path.startsWith('/api/giffgaff-id/')) {
            return await proxyRequest(request, 'https://id.giffgaff.com', '/api/giffgaff-id/');
        }

        // Giffgaff Public API 代理（GraphQL）
        if (path.startsWith('/api/giffgaff-public/')) {
            return await proxyRequest(request, 'https://publicapi.giffgaff.com', '/api/giffgaff-public/');
        }

        // Giffgaff Main API 代理（MFA）
        if (path.startsWith('/api/giffgaff/')) {
            return await proxyRequest(request, 'https://api.giffgaff.com', '/api/giffgaff/');
        }

        // 保留的后端功能（OAuth Token Exchange + Cookie 验证等）
        if (path === '/api/token-exchange') {
            return await handleTokenExchange(request, env);
        } else if (path === '/api/verify-cookie') {
            return await handleVerifyCookie(request, env);
        } else if (path === '/api/mfa-challenge') {
            return await handleMFAChallenge(request, env);
        } else if (path === '/api/mfa-verify') {
            return await handleMFAVerify(request, env);
        } else if (path === '/api/member-info') {
            return await handleMemberInfo(request, env);
        } else if (path === '/api/request-esim') {
            return await handleRequestESim(request, env);
        }

        // 对于非 API 请求，返回静态资源
        return env.ASSETS.fetch(request);
    } catch (error) {
        console.error('Error:', error);
        return jsonResponse({ error: error.message }, 500);
    }
}

/**
 * API 代理函数 - 透传请求到 Giffgaff API
 * 类似 Netlify redirects 功能
 */
async function proxyRequest(request, targetBaseUrl, pathPrefix) {
    const url = new URL(request.url);

    // 移除路径前缀，构建目标 URL
    const targetPath = url.pathname.replace(pathPrefix, '/');
    const targetUrl = targetBaseUrl + targetPath + url.search;

    // 复制请求头（排除一些不需要的）
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('origin', targetBaseUrl);

    // 设置 User-Agent（模拟 iOS 官方应用）
    // 浏览器端无法设置 User-Agent，必须在 Worker 端设置
    headers.set('User-Agent', 'giffgaff/1332 CFNetwork/1568.300.101 Darwin/24.2.0');

    // 转发请求
    const proxyResponse = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
    });

    // 复制响应头并添加 CORS
    const responseHeaders = new Headers(proxyResponse.headers);

    // 删除会触发浏览器认证对话框的 header
    responseHeaders.delete('www-authenticate');
    responseHeaders.delete('WWW-Authenticate');

    // 添加 CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        responseHeaders.set(key, value);
    });

    return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: responseHeaders
    });
}

/**
 * OAuth Token Exchange（后端处理）
 * 前端只发送 code 和 code_verifier，后端添加 Basic Auth
 */
async function handleTokenExchange(request, env) {
    try {
        const { code, code_verifier, redirect_uri } = await request.json();

        if (!code || !code_verifier) {
            return jsonResponse({ error: 'Missing code or code_verifier' }, 400);
        }

        const clientId = CONFIG.CLIENT_ID;
        // 从环境变量读取 CLIENT_SECRET（原始 UUID 格式）
        const clientSecret = env.GIFFGAFF_CLIENT_SECRET;

        console.log('Environment check:');
        console.log('- env object exists:', !!env);
        console.log('- CLIENT_SECRET exists:', !!clientSecret);
        console.log('- CLIENT_SECRET type:', typeof clientSecret);
        console.log('- CLIENT_SECRET value (masked):', clientSecret ? clientSecret.substring(0, 4) + '****' + clientSecret.substring(clientSecret.length - 4) : 'undefined');

        if (!clientSecret) {
            console.error('GIFFGAFF_CLIENT_SECRET environment variable not set');
            return jsonResponse({
                error: 'Server configuration error',
                details: 'GIFFGAFF_CLIENT_SECRET not configured'
            }, 500);
        }

        // 构建 Basic Auth header: Base64(clientId:clientSecret)
        const credentials = `${clientId}:${clientSecret}`;
        console.log('Credentials string (masked):', clientId + ':' + clientSecret.substring(0, 4) + '****');

        const encoder = new TextEncoder();
        const encodedData = encoder.encode(credentials);
        const base64 = btoa(String.fromCharCode(...encodedData));

        console.log('Basic Auth Base64 (first 20 chars):', base64.substring(0, 20) + '...');

        const tokenUrl = 'https://id.giffgaff.com/auth/oauth/token';

        const formData = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri || 'giffgaff://auth/callback/',
            code_verifier: code_verifier
        });

        console.log('=== Token Exchange Debug Info ===');
        console.log('URL:', tokenUrl);
        console.log('ClientID:', clientId);
        console.log('ClientSecret (first 8 chars):', clientSecret?.substring(0, 8) + '...');
        console.log('ClientSecret length:', clientSecret?.length);
        console.log('Authorization header:', `Basic ${base64}`);
        console.log('Authorization header length:', base64?.length);
        console.log('Form data string:', formData.toString());
        console.log('Form data params:', {
            grant_type: 'authorization_code',
            code: code?.substring(0, 10) + '... (length: ' + code?.length + ')',
            redirect_uri: redirect_uri || 'giffgaff://auth/callback/',
            code_verifier: code_verifier?.substring(0, 10) + '... (length: ' + code_verifier?.length + ')'
        });

        // 调用 Giffgaff OAuth API
        // 尝试更完整的浏览器headers来绕过Imperva WAF
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-GB,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Origin': 'https://www.giffgaff.com',
                'Referer': 'https://www.giffgaff.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site'
            },
            body: formData.toString()
        });

        console.log('Response status:', response.status, response.statusText);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
        const errorText = await response.text();
        return jsonResponse({
            error: 'Token exchange failed',
            details: errorText,
            status: response.status
        }, response.status);
    }

        const data = await response.json();
        return jsonResponse(data);
    } catch (error) {
        console.error('Token exchange error:', error);
        return jsonResponse({
            error: 'Token exchange failed',
            details: error.message
        }, 500);
    }
}

/**
 * Cookie验证
 */
async function handleVerifyCookie(request, env) {
    const { cookie } = await request.json();

    // 使用Cookie调用Giffgaff API验证
    const response = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie
        },
        body: JSON.stringify({
            query: `query { viewer { member { id } } }`
        })
    });

    if (!response.ok) {
        throw new Error('Cookie validation failed');
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error('Invalid cookie');
    }

    // 返回一个临时token（可以用cookie作为token）
    return jsonResponse({
        access_token: Buffer.from(cookie).toString('base64')
    });
}

/**
 * 发送MFA验证码
 */
async function handleMFAChallenge(request, env) {
    const { channel } = await request.json();
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    const response = await fetch(`${GIFFGAFF_API.MFA_URL}/challenge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            channel: channel,
            action: 'SIM_SWAP'
        })
    });

    if (!response.ok) {
        throw new Error('Failed to send MFA code');
    }

    const data = await response.json();
    return jsonResponse({ success: true, challengeId: data.challengeId });
}

/**
 * 验证MFA代码
 */
async function handleMFAVerify(request, env) {
    const { code } = await request.json();
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    const response = await fetch(`${GIFFGAFF_API.MFA_URL}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            code: code
        })
    });

    if (!response.ok) {
        throw new Error('MFA verification failed');
    }

    const data = await response.json();
    return jsonResponse({ mfa_signature: data.signature });
}

/**
 * 获取会员信息
 */
async function handleMemberInfo(request, env) {
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const mfaSignature = request.headers.get('X-MFA-Signature');

    const query = `
        query {
            viewer {
                member {
                    id
                    username
                    profile {
                        firstName
                        lastName
                    }
                    activeMembership {
                        msisdn
                    }
                }
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
        throw new Error('Failed to fetch member info');
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error(data.errors[0].message);
    }

    const member = data.data.viewer.member;
    return jsonResponse({
        memberId: member.id,
        username: member.username,
        firstName: member.profile.firstName,
        lastName: member.profile.lastName,
        msisdn: member.activeMembership?.msisdn
    });
}

/**
 * 申请eSIM
 */
async function handleRequestESim(request, env) {
    const { memberId } = await request.json();
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const mfaSignature = request.headers.get('X-MFA-Signature');

    // 步骤1: 预订eSIM
    const reserveMutation = `
        mutation {
            reserveEsim(input: { memberId: "${memberId}" }) {
                activationCode
                ssn
            }
        }
    `;

    const reserveResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-MFA-Signature': mfaSignature
        },
        body: JSON.stringify({ query: reserveMutation })
    });

    if (!reserveResponse.ok) {
        throw new Error('Failed to reserve eSIM');
    }

    const reserveData = await reserveResponse.json();

    if (reserveData.errors) {
        throw new Error(reserveData.errors[0].message);
    }

    const { activationCode, ssn } = reserveData.data.reserveEsim;

    // 步骤2: 激活eSIM（自动激活）
    const activateMutation = `
        mutation {
            activateEsim(input: {
                activationCode: "${activationCode}",
                ssn: "${ssn}"
            }) {
                success
                lpaString
            }
        }
    `;

    const activateResponse = await fetch(GIFFGAFF_API.GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-MFA-Signature': mfaSignature
        },
        body: JSON.stringify({ query: activateMutation })
    });

    if (!activateResponse.ok) {
        throw new Error('Failed to activate eSIM');
    }

    const activateData = await activateResponse.json();

    if (activateData.errors) {
        throw new Error(activateData.errors[0].message);
    }

    const lpaString = activateData.data.activateEsim.lpaString;

    return jsonResponse({
        activationCode,
        ssn,
        lpaString
    });
}

/**
 * 返回JSON响应
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        }
    });
}

// Cloudflare Workers入口
export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};
