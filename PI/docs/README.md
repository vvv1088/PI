# Marketing Intelligence System — 文档索引

整套系统 = **CI**(竞品情报) + **PI**(测试规划) + **Administration**，一个单文件 dashboard（`PI/index.html`）+ Supabase + n8n + AI 模型。

| # | 文档 | 给谁 / 什么时候看 |
|---|---|---|
| 00 | [transparency](00_transparency.md) | 所有人（尤其 USC/决策人）：系统如何用透明代替汇报、想了解什么去哪看 |
| 01 | [architecture](01_architecture.md) | 工程：整体架构、数据流、为什么这么建 |
| 02 | [code_style_guide](02_code_style_guide.md) | 写/改代码前：约定、命名、模式 |
| 03 | [code_map](03_code_map.md) | 找 bug / 做扩展：函数在哪、字段是什么、workflow 节点、RPC、排查入口 |
| 04 | [user_guide](04_user_guide.md) | 所有人：白话，每页干嘛、按钮点了会怎样 |
| 05 | [CHANGELOG](05_CHANGELOG.md) | 改动史：CI track + PI track（合并版；PI 逐版细节见根目录 `PI/CHANGELOG.md`） |
| 06 | [runbook](06_runbook.md) | 运维：上线、重跑 workflow、改用户/密码、清数据、轮换 key |
| 07 | [security](07_security.md) | 安全审查 / 改权限：认证、RLS、RPC、密钥清单 |
| 08 | [setup_new_env](08_setup_new_env.md) | 从零搭一套（staging / 灾备 / 交接） |

> 数据全在 Supabase `bfukphakofrjalsqteda`（基线在 `kkypkudherpaxyoocyfa`，仅 `get_brand_baselines`）。
> CI n8n @ n8n.ohmediaa.com；PI n8n @ adammkt.app.n8n.cloud。
