<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="English"></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-A31F34?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

一个由 Cloudflare Workers 驱动的功能丰富、Serverless 且免费的 Uptime 监控及状态页面。

> 这是 [lyc8503/UptimeFlare](https://github.com/lyc8503/UptimeFlare) 的分支，用于监控 [waynecommand.com](https://waynecommand.com) 相关服务。

📢 **[[安全公告](https://github.com/lyc8503/UptimeFlare/security/advisories/GHSA-36q9-v7p3-vj6v) 2026/03/04]** 已修复可能泄露 `uptime.config.ts` 中监控配置和凭据的漏洞（CVE-2026-29779）。2025-09-21 至 2026-03-04 版本受影响。**强烈建议升级至最新版本。**

🎉 **[更新 2026/01/03]** UptimeFlare 已从 KV 迁移至 D1 数据库，Terraform Cloudflare Provider 升级至 v5，数据结构已优化以提高性能。

## ⭐功能

- 开源，易于部署（全程无需本地工具，耗时不到 10 分钟），且完全免费
- 监控功能
  - 最多支持 50 个 1 分钟精度的检查
  - 支持指定全球 [310+ 个城市](https://www.cloudflare.com/network/) 的监控节点
  - 支持 HTTP/HTTPS/TCP 端口监控
  - 最多 90 天的 uptime 历史记录和 uptime 百分比跟踪
  - 可自定义的 HTTP(s) 请求方法、头和主体
  - 可自定义的 HTTP(s) 状态码和关键字检查
  - 通过 Webhook 发送宕机通知（支持 json / x-www-form-urlencoded / param 三种格式）
  - 可自定义 Webhook 负载模板
  - 可自定义 TypeScript 回调（`onStatusChange`、`onIncident`）
- 状态页面
  - 所有类型监控的交互式 ping（响应时间）图表
  - 计划维护公告 & 事件历史页面
  - 响应式 UI，自适应 PC/手机屏幕及亮色/暗色系统主题
  - 多语言支持（英语 / 中文 / 法语 / 德语）
  - 配置选项丰富的状态页面
  - 可使用您自己的域名与 CNAME
  - 可选的密码认证（私人状态页面）
  - 用于获取实时状态数据的 JSON API
  - 兼容 Shields.io 的徽章 API

## 👀演示

在线演示：https://uptimeflare.pages.dev/

截图：

![桌面，浅色主题](docs/desktop.png)

## ⚡快速入门 / 📄文档

请参阅 [Wiki](https://github.com/lyc8503/UptimeFlare/wiki)

## 🚀升级已有部署

通过[简单的升级流程](https://github.com/lyc8503/UptimeFlare/wiki/Synchronize-updates-from-upstream)获取最新功能

## ⚙️开发者文档

如需贡献新功能或深度定制，请参阅[此文档](https://github.com/lyc8503/UptimeFlare/wiki/How-to-develop)。
