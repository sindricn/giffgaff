# Vercel 部署指南

由于 Cloudflare Pages Functions 被 Giffgaff 的 Incapsula WAF 拦截，我们添加了 Vercel 部署支持。

## 🚀 快速部署

### 方法 1: 一键部署（推荐）

1. 访问 [Vercel](https://vercel.com)
2. 登录你的 GitHub 账号
3. 点击 "New Project"
4. 导入此仓库：`https://github.com/sindricn/giffgaff`
5. 点击 "Deploy"
6. 等待部署完成

### 方法 2: CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

## ✅ 部署完成后

1. 获取你的 Vercel 域名（如：`https://giffgaff-xxx.vercel.app`）
2. 访问该域名测试
3. 尝试 OAuth 登录流程

## 📁 项目结构

```
/
├── api/                    # Vercel Serverless Functions
│   ├── token-exchange.js   # OAuth token 交换
│   ├── mfa-challenge.js    # MFA 发送验证码
│   ├── mfa-verify.js       # MFA 验证码验证
│   ├── member-info.js      # 获取会员信息
│   ├── request-esim.js     # 申请 eSIM（3步骤）
│   └── test.js             # 测试端点
├── functions/              # Cloudflare Pages Functions（Vercel忽略）
├── index.html              # 前端页面
├── app.js                  # 前端逻辑
└── vercel.json             # Vercel 配置
```

## 🔧 环境变量（可选）

在 Vercel 项目设置中添加：

- `GIFFGAFF_CLIENT_SECRET`: OAuth Client Secret（默认已包含）

## 🧪 测试

部署完成后访问：

```
https://your-domain.vercel.app/api/test
```

应该看到：
```json
{
  "success": true,
  "message": "Vercel Functions are working!",
  "platform": "Vercel"
}
```

## 🎯 为什么使用 Vercel？

- ✅ 不同的服务器 IP 地址池（可能绕过 Incapsula WAF）
- ✅ 更好的 TLS 指纹
- ✅ 与 Cloudflare 不同的基础设施
- ✅ 免费部署和托管

## 📝 注意事项

1. Vercel 免费版有调用限制，但对个人使用足够
2. 如果 Vercel 也被拦截，说明 Incapsula 检测的是其他特征
3. 两个平台可以同时使用，互为备份
