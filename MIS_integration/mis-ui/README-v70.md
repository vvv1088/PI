# MIS v70 — PERFORMANCE + ASSETS 模块（P1 UI，mock 驱动）

2026-08-11。融合系统 2 的第一批 UI：5 个新视图全部跑在 mock 上，接口通了改三行配置即切真数据。

## 文件清单（部署 = 这 4 个文件一起传 cPanel，从此按「文件夹」发版）

| 文件 | 说明 |
|---|---|
| `index.html` | v70。只加了三处：两个导航组（Performance / Assets）、5 个空视图挂载点、3 个 script 引用。**没有任何业务代码进入本文件** |
| `mis-meta-api.js` | 数据层：`metaApi()` 封装 + mock/live 开关 + 全部 mock 数据。响应结构严格对齐系统 2 的 06-API接口手册 |
| `mis-performance.js` | Closed-Loop Report（花费×FD/D7 落到 hypothesis/素材，ref code join）+ Spending 明细（分页/remark/CSV） |
| `mis-assets.js` | Health（品牌×槽位网格+体检流水）、Rotation Log、Asset Status 三个只读视图 |

## mock → live 切换（接入改造部署、拿到 token 后）

改 `mis-meta-api.js` 顶部三行：

```js
mode: 'live',
token: '<Jayden 发的 service token>',
allowRemarkEdit: false,   // 若 Jayden 开了 MIS_ALLOW_REMARK_PUT=1 则改 true
```

## 已知边界

1. **BO 数据（FD/D7）走占位路径** `/api/mis/bo-daily`——真通道等对接清单 D 节拍板后实现（新接口或 n8n webhook），届时只改 `mis-meta-api.js` 里这一个 mock 路由的 live 实现。
2. **素材注册表**（ref code → hypothesis/素材）mock 在 `/api/mis/creative-registry`——真实版直接读 Supabase `creatives` 表，闭环页代码不用动。
3. **新页面对所有登录用户可见**（P1 全只读，风险低）；进 PERM_SECTIONS 做细粒度权限放 P2。
4. 资产列表（pixels / ad-accounts / bms）的**字段名按 Prisma schema 推定**，首次 live 联调时对一遍实际 JSON（analytics/spending、health、rotation/logs 三个接口的字段是照手册原文写的，无此风险）。
5. 首次进入视图才拉数（懒加载），「↻ 刷新」手动重拉。

## 验证记录

- `node --check` 三个 JS 全过
- Chromium 无头冒烟：5 个视图全部渲染（visible=true、表格有内容）、console 零报错
- 截图见交付包外附带的 shot-*.png

## CHANGELOG 建议条目

> v70（2026-08-11）：新增 Performance（Closed-Loop Report / Spending）与 Assets（Health / Rotation Log / Asset Status）两组共 5 个视图，数据经 `metaApi()` 走系统 2 只读接口（当前 mock）。新代码全部在 mis-*.js 新文件，index.html 仅加挂载点。发版从单文件改为 4 文件一起上传。
