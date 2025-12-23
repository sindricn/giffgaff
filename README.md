# Giffgaff eSIM Tool

> 简洁高效的 Giffgaff eSIM 管理工具，采用极简 UI 设计，部署于 Cloudflare Pages

[![部署到 Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- ⚡ **零配置部署** - 无需任何环境变量，开箱即用
- 🔐 **双登录方式** - 支持 OAuth 2.0 和 Cookie 快速登录
- 📱 **完整 eSIM 流程** - 从申请到激活，一站式完成
- 🌐 **响应式设计** - 完美适配手机、平板和桌面
- 🚀 **全球加速** - Cloudflare 边缘网络，极速访问

## 🚀 快速部署

1. Fork 本项目到你的 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Workers & Pages → Create application → Pages → Connect to Git
4. 选择你的仓库
5. 点击 **Save and Deploy**（无需配置任何环境变量）

详细部署指南请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## 📖 使用说明

### OAuth 登录
1. 点击 "OAuth 登录" 按钮
2. 复制授权后的回调 URL
3. 粘贴并处理回调
4. 完成后续 MFA 验证

### Cookie 登录（更快捷）
1. 访问 [www.giffgaff.com](https://www.giffgaff.com) 并登录
2. 按 F12 打开开发者工具
3. 使用工具内提供的脚本获取 Cookie
4. 粘贴 Cookie 并登录

### 申请 eSIM
1. 完成登录（任意方式）
2. 完成 MFA 双因素验证
3. 点击 "申请 eSIM" 按钮
4. 获取 QR 码和激活链接

## 🔧 技术架构

- **前端**: 原生 HTML/CSS/JavaScript
- **后端**: Cloudflare Workers（API 代理）
- **部署**: Cloudflare Pages
- **API**: Giffgaff OAuth 2.0 + GraphQL


## ⚠️ 免责声明

**本项目仅供学习和个人使用，请遵守以下规定：**

- ❌ 本项目与 Giffgaff Limited 公司及其附属机构**没有任何官方关联**
- ⚠️ 使用本工具**风险自负**，作者不承担任何责任
- 📋 必须遵守 [Giffgaff 服务条款](https://www.giffgaff.com/terms)和适用法律
- 🚫 **禁止用于商业目的**或任何违反 Giffgaff 政策的活动
- 👤 **仅使用自己的 Giffgaff 账户**，不得滥用或攻击服务

使用本工具即表示您已阅读并同意本免责声明。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

本项目受 [Silentely/eSIM-Tools](https://github.com/Silentely/eSIM-Tools) 启发。

## 🙏 致谢

感谢 [Silentely](https://github.com/Silentely) 的项目灵感 [eSIM-Tools](https://github.com/Silentely/eSIM-Tools)


**Made with ❤️ for Giffgaff users**
