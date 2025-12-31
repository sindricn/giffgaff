/**
 * Giffgaff eSIM Tool - 主应用
 * 简化版本，核心功能保持不变
 */

// 配置
const CONFIG = {
    // Cloudflare Workers API endpoints
    API_BASE: window.location.origin,

    // OAuth 配置（CLIENT_SECRET 在后端 Worker，前端不需要）
    CLIENT_ID: '4a05bf219b3985647d9b9a3ba610a9ce',
    REDIRECT_URI: 'giffgaff://auth/callback/',

    OAUTH: {
        CLIENT_ID: '4a05bf219b3985647d9b9a3ba610a9ce',
        REDIRECT_URI: 'giffgaff://auth/callback/',
        AUTH_URL: 'https://id.giffgaff.com/oauth/authorize',
        SCOPE: 'read'  // Giffgaff 只接受 'read' 作为有效 scope
    },
    GIFFGAFF_API: 'https://publicapi.giffgaff.com/graphql'
};

// 状态管理
class StateManager {
    constructor() {
        this.state = this.loadFromStorage() || {
            accessToken: null,
            mfaSignature: null,
            mfaRef: null,
            memberId: null,
            esimStatus: null,
            activationCode: null,
            ssn: null,
            lpaString: null,
            cookie: null
        };
    }

    set(key, value) {
        this.state[key] = value;
        this.saveToStorage();
    }

    get(key) {
        return this.state[key];
    }

    saveToStorage() {
        try {
            localStorage.setItem('giffgaff_state', JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('giffgaff_state');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    clear() {
        this.state = {
            accessToken: null,
            mfaSignature: null,
            mfaRef: null,
            memberId: null,
            esimStatus: null,
            activationCode: null,
            ssn: null,
            lpaString: null,
            cookie: null
        };
        localStorage.removeItem('giffgaff_state');
    }
}

// UI控制器
class UIController {
    constructor() {
        this.currentStep = 1;
        this.initElements();
        this.initTabs();
    }

    initElements() {
        // 步骤元素
        this.steps = document.querySelectorAll('.step');
        this.stepCards = {
            1: document.getElementById('step-1'),
            2: document.getElementById('step-2'),
            3: document.getElementById('step-3'),
            4: document.getElementById('step-4')
        };

        // Tab切换
        this.tabs = document.querySelectorAll('.tab');
        this.tabContents = {
            oauth: document.getElementById('oauth-tab'),
            cookie: document.getElementById('cookie-tab')
        };
    }

    initTabs() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // 更新tab样式
        this.tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 显示对应内容
        Object.values(this.tabContents).forEach(content => content.classList.add('hidden'));
        this.tabContents[tabName].classList.remove('hidden');
    }

    showStep(step) {
        // 隐藏所有步骤卡片
        Object.values(this.stepCards).forEach(card => card.classList.add('hidden'));

        // 显示当前步骤
        this.stepCards[step]?.classList.remove('hidden');

        // 更新进度指示器
        this.steps.forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');
            if (index + 1 < step) {
                stepEl.classList.add('completed');
            } else if (index + 1 === step) {
                stepEl.classList.add('active');
            }
        });

        this.currentStep = step;
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.style.minWidth = '300px';
        alert.style.maxWidth = '500px';

        const icons = {
            info: 'ℹ️',
            success: '✓',
            warning: '⚠️',
            error: '✗'
        };

        alert.innerHTML = `
            <span>${icons[type]}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<div class="spinner"></div><span>处理中...</span>';
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText;
            button.disabled = false;
        }
    }

    showElement(id) {
        document.getElementById(id)?.classList.remove('hidden');
    }

    hideElement(id) {
        document.getElementById(id)?.classList.add('hidden');
    }
}

// OAuth处理器
class OAuthHandler {
    generateCodeVerifier() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        // PKCE 规范要求 Base64URL 编码，不是 hex
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    async startOAuthFlow() {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const state = this.generateState();

        // 保存到localStorage
        sessionStorage.setItem('oauth_code_verifier', codeVerifier);
        sessionStorage.setItem('oauth_state', state);

        const params = new URLSearchParams({
            client_id: CONFIG.OAUTH.CLIENT_ID,
            redirect_uri: CONFIG.OAUTH.REDIRECT_URI,
            response_type: 'code',
            scope: CONFIG.OAUTH.SCOPE,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        const authUrl = `${CONFIG.OAUTH.AUTH_URL}?${params.toString()}`;
        window.open(authUrl, '_blank');
    }

    async processCallback(callbackUrl) {
        const url = new URL(callbackUrl);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code || !state) {
            throw new Error('无效的回调URL');
        }

        const savedState = sessionStorage.getItem('oauth_state');
        if (state !== savedState) {
            throw new Error('State验证失败');
        }

        const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

        // 使用后端进行 token exchange（带完整浏览器伪装）
        console.log('Using backend token exchange with browser headers...');
        const response = await fetch(`${CONFIG.API_BASE}/api/token-exchange`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                code_verifier: codeVerifier,
                redirect_uri: CONFIG.OAUTH.REDIRECT_URI
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Token交换失败: ${errorData.error || errorData.details || '未知错误'}`);
        }

        const data = await response.json();
        return data.access_token;
    }
}

// MFA处理器
class MFAHandler {
    async sendMFACode(accessToken, channel = 'EMAIL') {
        const response = await fetch(`${CONFIG.API_BASE}/api/mfa-challenge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ channel })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || '发送验证码失败');
        }

        const data = await response.json();
        return data.ref;
    }

    async verifyMFACode(accessToken, code, ref) {
        const response = await fetch(`${CONFIG.API_BASE}/api/mfa-verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ code, ref })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || '验证码验证失败');
        }

        const data = await response.json();
        return data.mfa_signature;
    }
}

// eSIM服务
class ESimService {
    async getMemberInfo(accessToken, mfaSignature) {
        const response = await fetch(`${CONFIG.API_BASE}/api/member-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-MFA-Signature': mfaSignature
            }
        });

        if (!response.ok) {
            throw new Error('获取会员信息失败');
        }

        return await response.json();
    }

    async requestESim(accessToken, mfaSignature, memberId) {
        const response = await fetch(`${CONFIG.API_BASE}/api/request-esim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-MFA-Signature': mfaSignature
            },
            body: JSON.stringify({ memberId })
        });

        if (!response.ok) {
            throw new Error('申请eSIM失败');
        }

        return await response.json();
    }

    generateQRCode(lpaString) {
        const container = document.getElementById('qrcode-container');
        container.innerHTML = '';

        // 使用第三方API生成二维码
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lpaString)}`;

        const img = document.createElement('img');
        img.src = qrUrl;
        img.alt = 'eSIM QR Code';
        img.style.maxWidth = '100%';

        container.appendChild(img);
    }

    displayESimInfo(data) {
        const infoContainer = document.getElementById('esim-info');
        infoContainer.innerHTML = `
            <div style="background: var(--bg-primary); padding: 20px; border-radius: 8px;">
                <p style="margin-bottom: 12px;"><strong>激活码:</strong> <code>${data.activationCode}</code></p>
                <p style="margin-bottom: 12px;"><strong>SSN:</strong> <code>${data.ssn}</code></p>
                <p style="margin-bottom: 0;"><strong>LPA字符串:</strong></p>
                <code style="word-break: break-all; display: block; margin-top: 8px; padding: 12px; background: white; border-radius: 6px;">
                    ${data.lpaString}
                </code>
            </div>
        `;
    }
}

// 时间检查工具
class TimeChecker {
    constructor() {
        this.isWithinServiceTime = true;
        this.userConfirmedOutsideTime = false;
    }

    /**
     * 判断是否是英国夏令时
     * 英国夏令时(BST): 3月最后一个周日 01:00 至 10月最后一个周日 01:00
     */
    isBST(date) {
        const year = date.getUTCFullYear();

        // 3月最后一个周日
        const marchLastSunday = new Date(Date.UTC(year, 2, 31));
        marchLastSunday.setUTCDate(31 - marchLastSunday.getUTCDay());
        marchLastSunday.setUTCHours(1, 0, 0, 0);

        // 10月最后一个周日
        const octoberLastSunday = new Date(Date.UTC(year, 9, 31));
        octoberLastSunday.setUTCDate(31 - octoberLastSunday.getUTCDay());
        octoberLastSunday.setUTCHours(1, 0, 0, 0);

        return date >= marchLastSunday && date < octoberLastSunday;
    }

    /**
     * 获取英国时区信息
     */
    getUKTime() {
        const now = new Date();
        const isDST = this.isBST(now);

        // 英国时区偏移（相对于UTC）
        const ukOffsetHours = isDST ? 1 : 0;

        return {
            isDST: isDST,
            timezone: isDST ? 'BST' : 'GMT',
            offsetHours: ukOffsetHours
        };
    }

    /**
     * 检查是否在服务时间内
     */
    checkServiceTime() {
        const now = new Date();
        const { isDST, timezone, offsetHours } = this.getUKTime();

        // 获取 UTC 时间
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();

        // 转换为英国时间
        const ukHours = (utcHours + offsetHours) % 24;
        const ukMinutes = utcMinutes;
        const totalMinutes = ukHours * 60 + ukMinutes;

        // 服务时间: 04:30 - 21:30
        const startMinutes = 4 * 60 + 30;  // 270 分钟
        const endMinutes = 21 * 60 + 30;   // 1290 分钟

        const isWithinTime = totalMinutes >= startMinutes && totalMinutes <= endMinutes;

        return {
            isWithinTime,
            timezone,
            isDST,
            ukHours,
            ukMinutes
        };
    }

    /**
     * 格式化时间显示（用于北京时间）
     */
    formatTime(date) {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    /**
     * 格式化英国时间显示
     */
    formatUKTime() {
        const now = new Date();
        const { offsetHours } = this.getUKTime();

        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const utcSeconds = now.getUTCSeconds();

        // 转换为英国时间
        const ukHours = (utcHours + offsetHours) % 24;

        return `${String(ukHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(utcSeconds).padStart(2, '0')}`;
    }

    /**
     * 更新页面时间显示
     */
    updateTimeDisplay() {
        const now = new Date();
        const { isWithinTime, timezone } = this.checkServiceTime();

        // 更新北京时间（本地时间）
        document.getElementById('beijing-time').textContent = this.formatTime(now);

        // 更新英国时间
        document.getElementById('uk-time').textContent =
            `${this.formatUKTime()} (${timezone})`;

        // 更新状态显示
        const statusEl = document.getElementById('time-status');
        const alertEl = document.getElementById('time-alert');

        if (isWithinTime) {
            statusEl.innerHTML = '<span>状态:</span><strong style="color: var(--success)">✓ 可以操作</strong>';
            alertEl.className = 'time-alert ok';
            alertEl.querySelector('.time-alert-icon').textContent = '✓';
            alertEl.querySelector('.time-alert-title').textContent = '服务时间内';
            alertEl.querySelector('.time-alert-text').innerHTML =
                '<strong>当前在服务时间内，可以正常操作</strong><br>' +
                '<small style="opacity: 0.9;">（英国时间 04:30 - 21:30，自动识别夏令时/冬令时）</small>';
        } else {
            statusEl.innerHTML = '<span>状态:</span><strong style="color: var(--warning)">⚠ 服务时间外</strong>';
            alertEl.className = 'time-alert warning';
            alertEl.querySelector('.time-alert-icon').textContent = '⏰';
            alertEl.querySelector('.time-alert-title').textContent = '服务时间提醒';
            alertEl.querySelector('.time-alert-text').innerHTML =
                '<strong>官方 eSIM 切换服务时间为上午 4:30 至晚上 9:30</strong><br>' +
                '<small style="opacity: 0.9;">（英国时间 04:30 - 21:30，自动识别夏令时/冬令时）</small>';
        }

        this.isWithinServiceTime = isWithinTime;
    }

    /**
     * 显示时间警告弹窗
     */
    showTimeWarning() {
        return new Promise((resolve) => {
            const modal = document.getElementById('time-warning-modal');
            modal.classList.add('show');

            const continueBtn = document.getElementById('modal-continue');
            const cancelBtn = document.getElementById('modal-cancel');

            const handleContinue = () => {
                modal.classList.remove('show');
                this.userConfirmedOutsideTime = true;
                continueBtn.removeEventListener('click', handleContinue);
                cancelBtn.removeEventListener('click', handleCancel);
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.remove('show');
                continueBtn.removeEventListener('click', handleContinue);
                cancelBtn.removeEventListener('click', handleCancel);
                resolve(false);
            };

            continueBtn.addEventListener('click', handleContinue);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }

    /**
     * 检查操作权限
     */
    async checkBeforeOperation() {
        // 如果在服务时间内，直接允许
        if (this.isWithinServiceTime) {
            return true;
        }

        // 如果用户已经确认过，不再提示
        if (this.userConfirmedOutsideTime) {
            return true;
        }

        // 显示警告弹窗
        return await this.showTimeWarning();
    }
}

// 主应用类
class App {
    constructor() {
        this.state = new StateManager();
        this.ui = new UIController();
        this.oauth = new OAuthHandler();
        this.mfa = new MFAHandler();
        this.esim = new ESimService();
        this.timeChecker = new TimeChecker();

        this.init();
    }

    init() {
        this.bindEvents();
        this.restoreSession();
        this.startTimeMonitoring();
    }

    /**
     * 启动时间监控
     */
    startTimeMonitoring() {
        // 立即更新一次
        this.timeChecker.updateTimeDisplay();

        // 每秒更新时间
        setInterval(() => {
            this.timeChecker.updateTimeDisplay();
        }, 1000);
    }

    bindEvents() {
        // 复制脚本按钮
        document.getElementById('copy-oauth-script')?.addEventListener('click', () => {
            const script = document.getElementById('oauth-script').textContent;
            this.copyToClipboard(script, 'OAuth监听脚本');
        });

        document.getElementById('copy-cookie-script')?.addEventListener('click', () => {
            const script = document.getElementById('cookie-script').textContent;
            this.copyToClipboard(script, 'Cookie获取脚本');
        });

        // OAuth登录
        document.getElementById('oauth-login-btn')?.addEventListener('click', () => {
            this.handleOAuthLogin();
        });

        document.getElementById('process-callback-btn')?.addEventListener('click', () => {
            this.handleOAuthCallback();
        });

        // Cookie登录
        document.getElementById('verify-cookie-btn')?.addEventListener('click', () => {
            this.handleCookieLogin();
        });

        // MFA
        document.getElementById('send-mfa-btn')?.addEventListener('click', () => {
            this.handleSendMFA();
        });

        document.getElementById('verify-mfa-btn')?.addEventListener('click', () => {
            this.handleVerifyMFA();
        });

        // eSIM申请
        document.getElementById('request-esim-btn')?.addEventListener('click', () => {
            this.handleRequestESim();
        });
    }

    /**
     * 复制文本到剪贴板
     */
    async copyToClipboard(text, name) {
        try {
            await navigator.clipboard.writeText(text);
            this.ui.showAlert(`✅ ${name}已复制到剪贴板`, 'success');
        } catch (error) {
            console.error('复制失败:', error);
            this.ui.showAlert(`❌ 复制失败，请手动复制`, 'error');
        }
    }

    async handleOAuthLogin() {
        // 检查服务时间
        const canProceed = await this.timeChecker.checkBeforeOperation();
        if (!canProceed) {
            return;
        }

        try {
            await this.oauth.startOAuthFlow();
            this.ui.showElement('oauth-callback-section');
            this.ui.showAlert('请在新窗口完成登录，然后返回粘贴回调URL', 'info');
        } catch (error) {
            this.ui.showAlert(error.message, 'error');
        }
    }

    async handleOAuthCallback() {
        const btn = document.getElementById('process-callback-btn');
        const callbackUrl = document.getElementById('callback-url').value.trim();

        if (!callbackUrl) {
            this.ui.showAlert('请输入回调URL', 'warning');
            return;
        }

        try {
            this.ui.setButtonLoading(btn, true);
            const accessToken = await this.oauth.processCallback(callbackUrl);
            this.state.set('accessToken', accessToken);
            this.ui.showAlert('登录成功！', 'success');
            this.ui.showStep(2);
        } catch (error) {
            this.ui.showAlert(error.message, 'error');
        } finally {
            this.ui.setButtonLoading(btn, false);
        }
    }

    async handleCookieLogin() {
        // 检查服务时间
        const canProceed = await this.timeChecker.checkBeforeOperation();
        if (!canProceed) {
            return;
        }

        const btn = document.getElementById('verify-cookie-btn');
        const cookie = document.getElementById('cookie-input').value.trim();

        if (!cookie) {
            this.ui.showAlert('请输入Cookie', 'warning');
            return;
        }

        try {
            this.ui.setButtonLoading(btn, true);

            // 验证Cookie并获取token
            const response = await fetch(`${CONFIG.API_BASE}/api/verify-cookie`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookie })
            });

            if (!response.ok) {
                throw new Error('Cookie验证失败');
            }

            const data = await response.json();
            this.state.set('accessToken', data.access_token);
            this.state.set('cookie', cookie);

            this.ui.showAlert('Cookie验证成功！', 'success');
            this.ui.showStep(2);
        } catch (error) {
            this.ui.showAlert(error.message, 'error');
        } finally {
            this.ui.setButtonLoading(btn, false);
        }
    }

    async handleSendMFA() {
        // 检查服务时间
        const canProceed = await this.timeChecker.checkBeforeOperation();
        if (!canProceed) {
            return;
        }

        const btn = document.getElementById('send-mfa-btn');
        const channel = document.getElementById('mfa-channel').value;
        const accessToken = this.state.get('accessToken');

        if (!accessToken) {
            this.ui.showAlert('请先登录', 'warning');
            return;
        }

        try {
            this.ui.setButtonLoading(btn, true);
            const ref = await this.mfa.sendMFACode(accessToken, channel);
            this.state.set('mfaRef', ref); // 保存 ref 用于后续验证
            this.ui.showElement('mfa-code-section');
            this.ui.showAlert(`验证码已发送到您的${channel === 'EMAIL' ? '邮箱' : '手机'}`, 'success');
        } catch (error) {
            this.ui.showAlert(error.message, 'error');
        } finally {
            this.ui.setButtonLoading(btn, false);
        }
    }

    async handleVerifyMFA() {
        const btn = document.getElementById('verify-mfa-btn');
        const code = document.getElementById('mfa-code').value.trim();
        const accessToken = this.state.get('accessToken');
        const mfaRef = this.state.get('mfaRef');

        if (!code) {
            this.ui.showAlert('请输入验证码', 'warning');
            return;
        }

        if (!mfaRef) {
            this.ui.showAlert('请先发送验证码', 'warning');
            return;
        }

        try {
            this.ui.setButtonLoading(btn, true);
            const mfaSignature = await this.mfa.verifyMFACode(accessToken, code, mfaRef);
            this.state.set('mfaSignature', mfaSignature);

            // 获取会员信息
            const memberInfo = await this.esim.getMemberInfo(accessToken, mfaSignature);
            this.state.set('memberId', memberInfo.memberId);

            this.ui.showAlert('验证成功！', 'success');
            this.ui.showStep(3);
        } catch (error) {
            this.ui.showAlert(error.message, 'error');
        } finally {
            this.ui.setButtonLoading(btn, false);
        }
    }

    async handleRequestESim() {
        // 检查服务时间
        const canProceed = await this.timeChecker.checkBeforeOperation();
        if (!canProceed) {
            return;
        }

        const btn = document.getElementById('request-esim-btn');
        const accessToken = this.state.get('accessToken');
        const mfaSignature = this.state.get('mfaSignature');
        const memberId = this.state.get('memberId');

        if (!accessToken || !mfaSignature || !memberId) {
            this.ui.showAlert('请完成前面的步骤', 'warning');
            return;
        }

        try {
            this.ui.setButtonLoading(btn, true);
            const esimData = await this.esim.requestESim(accessToken, mfaSignature, memberId);

            this.state.set('activationCode', esimData.activationCode);
            this.state.set('ssn', esimData.ssn);
            this.state.set('lpaString', esimData.lpaString);

            this.ui.showStep(4);
            this.esim.generateQRCode(esimData.lpaString);
            this.esim.displayESimInfo(esimData);
            this.ui.showAlert('eSIM申请成功！', 'success');
        } catch (error) {
            this.ui.showAlert(error.message, 'error');
        } finally {
            this.ui.setButtonLoading(btn, false);
        }
    }

    restoreSession() {
        const accessToken = this.state.get('accessToken');
        const mfaSignature = this.state.get('mfaSignature');
        const memberId = this.state.get('memberId');
        const lpaString = this.state.get('lpaString');

        if (lpaString) {
            this.ui.showStep(4);
            this.esim.generateQRCode(lpaString);
            this.esim.displayESimInfo({
                activationCode: this.state.get('activationCode'),
                ssn: this.state.get('ssn'),
                lpaString: lpaString
            });
        } else if (memberId && mfaSignature) {
            this.ui.showStep(3);
        } else if (accessToken) {
            this.ui.showStep(2);
        }
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
