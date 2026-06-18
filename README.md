<div align="right">
  <a title="English" href="README.md"><img src="https://img.shields.io/badge/-English-A31F34?style=for-the-badge" alt="English" /></a>
  <a title="简体中文" href="README_zh-CN.md"><img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# ✔[UptimeFlare](https://github.com/lyc8503/UptimeFlare)

A more advanced, serverless, and free uptime monitoring & status page solution, powered by Cloudflare Workers, complete with a user-friendly interface.

> This is a fork of [lyc8503/UptimeFlare](https://github.com/lyc8503/UptimeFlare), used for monitoring [waynecommand.com](https://waynecommand.com) services.

📢 **[[SECURITY ADVISORY](https://github.com/lyc8503/UptimeFlare/security/advisories/GHSA-36q9-v7p3-vj6v) 2026/03/04]** A vulnerability (CVE-2026-29779) that could expose monitor configuration and credentials in `uptime.config.ts` to clients was fixed. Versions between 2025-09-21 and 2026-03-04 are affected. **Affected users are strongly advised to upgrade to the latest version.**

🎉 **[UPDATE 2026/01/03]** UptimeFlare has been migrated from KV to D1 Database. The Terraform Cloudflare provider is updated to v5 and the data structure has been optimized for better performance.

## ⭐Features

- Open-source, easy to deploy (in under 10 minutes, no local tools required), and free
- Monitoring capabilities
  - Up to 50 checks at 1-minute intervals
  - Geo-specific checks from over [310 cities](https://www.cloudflare.com/network/) worldwide
  - Support for HTTP/HTTPS/TCP port monitoring
  - Up to 90-day uptime history and uptime percentage tracking
  - Customizable request methods, headers, and body for HTTP(s)
  - Custom status code & keyword checks for HTTP(s)
  - Downtime notification via Webhook (multi-format: json / x-www-form-urlencoded / param)
  - Customizable Webhook with flexible payload templating
  - Customizable TypeScript callbacks (`onStatusChange`, `onIncident`)
- Status page
  - Interactive ping (response time) chart for all types of monitors
  - Scheduled maintenances alerts & Incident history page
  - Responsive UI that adapts to your system theme
  - Multi-language support (English / Chinese / French / German)
  - Customizable status page
  - Use your own domain with CNAME
  - Optional password authentication (private status page)
  - JSON API for fetching realtime status data
  - Shields.io-compatible badge API

## 👀Demo

Live demo: https://uptimeflare.pages.dev/

Screenshots:

![Desktop, Light theme](docs/desktop.png)

## ⚡Quickstart / 📄Documentation

Please refer to [Wiki](https://github.com/lyc8503/UptimeFlare/wiki)

## 🚀Upgrade existing deployments

Get the latest features right away with the [simple upgrade process](https://github.com/lyc8503/UptimeFlare/wiki/Synchronize-updates-from-upstream)

## ⚙️Docs for developer

To contribute new features or customize your deployment further, see [here](https://github.com/lyc8503/UptimeFlare/wiki/How-to-develop).

## New features (TODOs)

- [x] Specify region for monitors
- [x] TCP `opened` promise
- [x] ~~Self-host Dockerfile~~
- [x] Incident history
- [x] Improve `checkLocationWorkerRoute` and fix possible `proxy failed`
- [x] Groups
- [x] Remove old incidents
- [x] Compatibility date update
- [x] Scheduled Maintenance
- [x] Cloudflare D1 database
- [x] Scheduled maintenances (via IIFE)
- [x] Universal Webhook upgrade
- [x] i18n
- [x] Customizable footer
- [x] New header logo
- [x] Improve CPU time usage
- [x] Globalping integration
- [x] Concurrent checks with p-limit
- [x] Error reason tracking in incidents
- [x] Grace period improvements
- [ ] SSL certificate checks
- [ ] ICMP via proxy?
- [ ] Multi-region orchestration improvements
