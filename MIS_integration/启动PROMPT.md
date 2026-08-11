# Claude Code 启动 Prompt（第一次会话贴这个）

```
我在做「MIS 融合系统 2」项目，本目录是 MIS 侧工作区，2026-08-11 从上一个
Claude 会话交接过来。请按下面的方式协作。

【第一步：先读，不要动手】
1. CLAUDE.md —— 工作区须知，铁律和当前进度都在里面
2. docs/00-背景与决策.md —— 完整上下文与防反复清单，读完你就拥有全部决策背景
3. docs/03-P2搬家映射表.md —— 施工图
4. mis-ui/README-v70.md —— 当前 UI 版本说明
（系统 2 的仓库在 ../Meta_Ads_Unified_Management_System，那边有它自己的
CLAUDE.md；涉及系统 2 代码时先读它，规矩以它为准。）

读完给我一份 200 字以内的总结：现在处于哪个阶段、什么已完成、
下一步能独立推进的是什么、被什么外部依赖阻塞。不要提改进建议。

【协作方式】
- 用中文，技术名词保留英文
- 动手前先说清楚改什么、为什么，等我确认；一次只做一件事
- 不确定就查文件，不要猜；查不到就问我
- 觉得我判断有问题就直说

【MIS UI 改动流程】
- 新代码一律进新文件（mis-*.js），index.html 只加挂载点
- mock 响应结构照系统 2 的 docs/handover/06-API接口手册.md 原文写
- 改完必跑 mis-ui/tools/smoke-test.js（需 playwright；5 视图渲染 +
  console 零报错才算过），没跑就明说没验证
- 发版 = 整个文件夹传 cPanel；改版前做文件夹快照

【系统 2 侧改动流程】
- 在 ../Meta_Ads_Unified_Management_System 里做，遵循那边的 CLAUDE.md：
  npx tsc --noEmit 和 npm run build 必过；commit 写根因→证据→改法→验证；
  先记 _变更记录.md 再改正文；产出 patch 交 Jayden，不碰生产

【当前最可能的任务（按优先级）】
1. Jayden 回复对接清单后：按其答复接 live（mis-meta-api.js 改三行）、
   实现 BO 通道 live 路由、按 E 节打勾结果核对字段
2. 不依赖他就能做：权限映射设计、拆文件+最简构建方案（P2 前必须）、
   baselines 替换设计、v70 合回 PI 正式仓库并上 cPanel（mock 模式先给团队看）

先做第一步，读完给我总结。
```
