# 🚀 Cloudflare 部署指南

## 📋 部署前准备

> **✅ 无需任何准备！**:
> - **无需配置任何环境变量**
> - **无需获取 API 密钥**
> - 直接部署即可使用所有功能（OAuth + Cookie 登录）

### 技术架构说明（无需操作）

本项目采用 **API 代理方式**，参考原项目的 Netlify redirects 实现：

**工作原理：**
1. **前端发送请求**: `POST /api/giffgaff-id/oauth/token`
2. **Cloudflare Worker 代理**: 转发到 `https://id.giffgaff.com/oauth/token`
3. **CLIENT_SECRET 在前端**: 已内置在 `app.js` 中，通过代理安全发送
4. **无需后端配置**: 所有凭证已预配置，开箱即用

**代理路由：**
- `/api/giffgaff-id/*` → `https://id.giffgaff.com/*` (OAuth 认证)
- `/api/giffgaff-public/*` → `https://publicapi.giffgaff.com/*` (GraphQL API)
- `/api/giffgaff/*` → `https://api.giffgaff.com/*` (MFA 验证)

**与原项目对比：**

| 项目 | 代理方式 | CLIENT_SECRET 位置 | 环境变量 |
|------|----------|-------------------|----------|
| **原项目** | Netlify redirects | 前端代码 | 无需配置 |
| **当前项目** | Cloudflare Worker | 前端代码 | 无需配置 |

> **✅ 优势**:
> - 无需获取或配置任何密钥
> - 部署后立即可用
> - OAuth 和 Cookie 登录都支持

### 文件检查（可选）

确认以下核心文件存在：

- ✅ `index.html` - 前端页面
- ✅ `app.js` - 前端逻辑（包含 CLIENT_SECRET）
- ✅ `worker.js` - Cloudflare Worker API 代理
- ✅ `.gitignore` - Git 忽略配置

## 🚀 部署步骤

### 通过 Cloudflare Dashboard 部署

这是**最简单**的部署方式，不需要安装任何 CLI 工具。

#### 步骤 1: 提交代码到 GitHub

```bash
# 1. 检查将要提交的文件
git status

# 2. 确认 .env 和其他敏感文件不在列表中
# 3. 提交代码
git add .
git commit -m "Deploy to Cloudflare"
git push origin main
```

#### 步骤 2: 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单选择 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**

#### 步骤 3: 连接 GitHub 仓库

1. 授权 Cloudflare 访问你的 GitHub
2. 选择 `giffgaff` 仓库
3. 点击 **Begin setup**

#### 步骤 4: 配置构建设置

```
Project name: giffgaff-esim (或你喜欢的名称)
Production branch: main
Build command: (留空)
Build output directory: .
```

> **说明**: 这是一个纯静态项目 + Worker，不需要构建过程，**无需配置任何环境变量**。

#### 步骤 5: 保存并部署

直接点击 **Save and Deploy**，无需配置任何环境变量！

#### 步骤 6: 等待部署完成

- Cloudflare 会自动部署你的项目
- 大约 1-2 分钟后部署完成
- 你会获得一个 `*.pages.dev` 域名

#### 步骤 7: 验证部署

访问部署的 URL（类似 `https://giffgaff-esim.pages.dev`），检查：

- ✅ 页面正常加载
- ✅ UI 样式正确（黑白 + 金黄色主题）
- ✅ 导航栏链接可用
- ✅ 服务时间显示正确
- ✅ **OAuth 登录可用**（通过 API 代理）
- ✅ **Cookie 登录可用**（无需配置）

## 🔧 后续配置

### 配置自定义域名（可选）

1. 在 Pages 项目中，点击 **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入域名（如 `esim.yourdomain.com`）
4. 按提示添加 DNS 记录

### 自动部署

配置完成后，每次推送到 GitHub main 分支，Cloudflare 会自动重新部署。

```bash
# 以后更新代码只需：
git add .
git commit -m "Update features"
git push origin main
# Cloudflare 自动部署！
```

## 🔍 常见问题

### Q1: 需要配置 CLIENT_SECRET 吗？

**不需要！** 本项目已采用 API 代理方式，CLIENT_SECRET 已内置在前端代码中，通过 Cloudflare Worker 代理安全发送。

- ✅ OAuth 登录：开箱即用
- ✅ Cookie 登录：开箱即用
- ✅ 无需任何环境变量配置

### Q2: 如何获取 Cookie？

在工具的 **Cookie 登录** 标签页有详细教程，包含：
- 自动获取脚本
- 手动获取步骤
- Cookie 格式说明

### Q3: Cookie 多久过期？

通常 24-48 小时，过期后需要重新获取。

### Q4: 这个工具合法吗？

- ✅ 个人使用、学习目的是合法的
- ✅ 使用自己的 Giffgaff 账户是合法的
- ❌ 不要用于商业目的
- ❌ 不要滥用或攻击 Giffgaff 服务

### Q5: OAuth 登录失败怎么办？

**可能原因**:
- Cloudflare Worker 代理未正常工作
- Giffgaff API 临时不可用

**解决方法**:
1. 尝试使用 **Cookie 登录方式** 替代
2. 检查浏览器控制台是否有错误信息
3. 确认项目已正确部署到 Cloudflare Pages

### Q6: 部署后页面正常但 API 不工作？

**检查项**:
- `worker.js` 文件是否在项目根目录
- `wrangler.toml` 配置是否正确
- 尝试使用 Cookie 登录方式

**调试**:
```javascript
// 在浏览器控制台测试
fetch('/api/verify-cookie', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({cookie: 'your_cookie_here'})
})
.then(r => r.json())
.then(console.log)
```

## 📊 监控和维护

### 查看访问统计

1. Pages 项目 → **Analytics**
2. 查看访问量、带宽使用、成功率等

### 查看实时日志

1. Pages 项目 → **Functions**
2. 点击 **Real-time logs**
3. 实时查看 Worker 日志输出

## 🔒 安全提示

1. **保护你的 Cookie**
   - Cookie 相当于登录凭证
   - 不要分享给他人
   - 定期更新（24-48 小时后过期）

2. **监控异常访问**
   - 定期查看 Cloudflare Analytics
   - 注意异常流量模式

3. **关于 CLIENT_SECRET**
   - 本项目使用 API 代理方式
   - CLIENT_SECRET 在前端是公开的（类似原项目）
   - 通过 Cloudflare Worker 代理保护 API 调用
   - 无需担心密钥泄露（这是设计方式）

## 📝 部署清单

提交到 GitHub 前确认：

- [ ] `worker.js` 包含 API 代理逻辑
- [ ] `app.js` 包含 CLIENT_SECRET 配置
- [ ] 本地测试通过（可选）
- [ ] 代码已提交到 GitHub
- [ ] 无需配置任何环境变量

---

**部署成功后，你将拥有：**
- ✅ 全球 CDN 加速访问
- ✅ 自动 HTTPS 证书
- ✅ 无限流量和带宽
- ✅ GitHub 自动部署
- ✅ 实时日志监控
- ✅ **OAuth 登录**（通过 API 代理）
- ✅ **Cookie 登录**（无需配置）
- ✅ 零配置，开箱即用

---

**相关资源：**
- [原项目 - Silentely/eSIM-Tools](https://github.com/Silentely/eSIM-Tools)
- [Giffgaff 社区 - OAuth API 讨论](https://community.giffgaff.com/d/33136073-giffgaff-oauth-api)
- [Giffgaff 社区 - Developer API](https://community.giffgaff.com/t5/Contribute/giffgaff-developer-API/td-p/16901937)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
