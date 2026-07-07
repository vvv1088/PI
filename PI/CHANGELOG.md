# Changelog — Marketing Intelligent System

> 版本纪律(新):**当前版本永远 = `PI/index.html`**;每次改动前先快照旧版到 `PI/versions/index_vN.html`,改完写一条 changelog。
> 不再用"工作目录里散落多个 index_vN"的旧做法 —— 那是之前版本混乱的根源。

## 基线血缘(2026-06-25 还原)

通过 md5 / 行数比对确认,历史是一条干净直线,无分叉:

```
v5(1906行) → v6(1906行) → v7(1919行,=v7_1 同一份) → v8(1962行,=v8_1 同一份) → v9(2002行) ← 当前基线
```

- `index_v7_1.html` 与 `index_v7.html` 字节相同;`index_v8_1.html` 与 `index_v8.html` 字节相同 —— `_1` 仅为重复另存的副本,非分叉版本。
- 历史导出文件仍留在 `~/Downloads/`(v5–v9),未改动;可随时自行清理。

## [v34] — 2026-07-07 · 团队反馈微调:Hypothesis 排版重构 + 排期入口归位 hypothesis(当前基线)

按团队看 demo 后的反馈调整。**纯前端 + 附加式 DB 列,不动现有数据。**

### Hypothesis 页
- **首列排版重构**:改成 `💡IDE-001`(小 idea 标记打头)→ `HYP-001`(编号)→ 陈述;**测试维度**(测·Hook)与**顾客阶段**(◑ 拉新)各自换到下一行显示(`.hcell-main` / `.hcell-sub`),不再全挤在一行。
- **顾客阶段单独成行**、紫色 pill 保持。

### Dictionary
- **隐去 `Metrics` 标签**(数据保留,只是不在标签栏显示——主指标下拉从 `BRAND_METRIC` 读、不依赖该字典);默认标签由 `Metrics` 改为 `Format`。少一个标签后 **Customer Stage 回到同一排**,不再单独换行。

### 素材预计排期:填写入口归位到 hypothesis
- 团队反馈「排期的填写入口应挂在 hypothesis」。**一个测试 = 一个上线/测试窗口,该假设下所有素材共用**,所以把入口从 Creatives 页(原每行「排期」按钮)移到 **New Hypothesis 表单**(基础卡新增「预计上线日 M/D」+「测试 period(天)」)。
- Creatives 页「预计排期」列改为**继承自所属假设**(`hypSchedOf()` 按 hyp code 匹配),仅展示、不再逐条编辑;移除每行「排期」按钮与 `setCreativeSchedule`。
- 列宽加宽 + 右留白,Format 起整体右移(解决排期列过挤)。
- DB:`hypotheses.plan_launch text` + `hypotheses.plan_test_days int`(nullable)。creatives 上的旧同名列保留但不再使用。

### demo 修正(都是演示种子问题,正式库无此问题)
- `mode:"op"` → 真实值 `新测试` / `主力运行`(原 `op` 无对应样式,显示成裸文字)。
- 假设状态 `已验证` → `已沉淀`(`已验证` 非正式状态、无 `st-*` 样式,显示成无圆点黑字;`已沉淀` 与其它状态同 UI)。
- 排期种子从素材移到假设(HYP-001 测试中·剩1天 / HYP-002 待判定 / HYP-003 还有5天开测 / HYP-006 测试中·剩10天 / 其余未排期)。
- 验证:index.html + demo `node --check` 通过;headless 实测——首列排版、mode/status 样式、Metrics 隐藏、Customer Stage 同排、素材排期继承假设,四态倒数全部正确渲染,无 pageerror。
- ⚠️ **需重新上传 `index.html` 到 cPanel 才在线上生效。**

## [v33] — 2026-07-07 · 顾客阶段(漏斗环节)+ 素材预计排期

两个团队讨论后确认的新功能。**纯前端 + 附加式 DB 列(nullable),不动现有数据。**

### 1. 顾客阶段 Customer Stage(挂在 hypothesis 层)
- 新 Dictionary 类别 **`Customer Stage`**,5 档漏斗(固定顺序):`Acquisition 拉新 / Activation 激活 / Retention 留存 / Repeat Conversion 复购转化 / Reactivation 唤回`。每条词条的「定义」写清了「实际 target 的顾客 · 广告目的 · 例子」(照团队截图的三栏,合进 descr 一格)。
- New Hypothesis 表单「基础」卡新增 **顾客阶段** 下拉(`hf-stage`,从 Dictionary 动态读、`stageOpts()`)。
- Hypothesis 列表:每条假设首列加紫色 pill `◑ <中文阶段>`(`stageZh()`);筛选栏加 **Stage 筛选**(`f-stage`,按漏斗顺序不按字母、`fillStageFilter()`);编辑时回填。
- 为什么挂 hypothesis 不挂 idea:一个 idea 会分叉出方向不同的多条 hypo(同一想法可拉新也可留存),阶段是「这次测试解决漏斗哪一环」的战略声明,属假设层。
- DB:`hypotheses.customer_stage text`(nullable);`dict_entries` 加 5 行 Customer Stage。

### 2. 素材预计排期(挂在 creative 层)
- 每条素材可填 **预计上线日**(M/D)+ **测试 period(天)**,系统自动算 **预计结束日** 与倒数(`schedCell()`)。
- Creatives 列表新增「预计排期」列:`7/12 → 7/19 · 7天` + 倒数徽章,颜色语义 <span>绿=测试中正常 / 黄=快开测·测试期到 / 红=该判定了</span>;未填显示「未排期」。
- 编辑:操作列加「排期」按钮,`setCreativeSchedule()` 两个 prompt(与现有 editAdsCode 同风格)写库。
- DB:`creatives.plan_launch text` + `creatives.plan_test_days int`(均 nullable)。

- 同步:`demo.html`(6 条假设各带阶段、4 条素材带排期演示 upcoming/testing/overdue/未排期);`dict_entries.json`(+5 → 104);`gen_demo.py` 生成器。
- 验证:index.html + demo 双双 `node --check` 通过;倒数逻辑单测 PASS;headless chromium 实测——假设页 4 种阶段 pill、素材页 4 种排期状态全部正确渲染,无 pageerror。
- ⚠️ **需重新上传 `index.html` 到 cPanel 才在线上生效**(DB 列已提前建好,上传后即可用)。

## [v32] — 2026-07-07 · Hypothesis 页筛选优化(默认全月 + Idea 关联/筛选)+ Ads 默认最新

团队反馈的 4 处 UI 优化,纯前端,不动后端/数据:

- **Hypothesis 月份筛选默认 6 月 → 全部** —— `#f-month` 默认选项从「Jun 2026」改为 `All Months`(value 空),进页面即看全部假设,不再被默认月份藏住。
- **Hypothesis 行内显示所挂 Idea(紧凑)** —— 每条假设首列在编号/陈述后加一枚小 pill `💡 <idea code>`(如 `💡 IDE-007`),`title` 悬浮显示完整来源标签(`来自想法: IDE-007 · 原创直觉`)。只显示 code 不显示全称,避免行太长太密;无关联想法的行不显示。
- **新增 Idea 筛选** —— 筛选栏加 `#f-idea` 下拉,`fillIdeaFilter()` 在每次 `renderHypo` 时按现有假设去重生成选项(option 值=idea code、显示=完整标签),选中后按 `(h.idea||'').split(' ')[0]===fi` 精确筛该想法下的所有假设。
- **Ads Library 默认排序 最长在投 → 最新** —— `#fSort` 默认选项从「Longest running」改为 `Sort: Newest`(value `new`,已存在的 `start_date` 降序逻辑),打开画廊先看最新广告。
- 验证:`node --check` 通过;`fillIdeaFilter` + 筛选谓词单测 PASS(去重/精确筛/月份筛均符合预期)。
- ⚠️ **需重新上传 `index.html` 到 cPanel 才在线上生效。**

## [v31] — 2026-06-29 · 修复「重置密码变回 123123」+ AI 周报想法接回

- **Bug 修复:Reset PW 改完变回 123123** —— `resetUserPw` 的 `prompt` 默认值原本预填 `'123123'`,管理员点「Reset PW」时框里已是 123123,没清空重打就确认 = 把密码设回 123123(手机尤甚)。改:默认值置空 + 最少 4 位校验(`np.length<4` 直接拦下不调 RPC) + 提示语明确。后端 `admin_set_password` / `is_admin()` 经验证完全正常,问题纯在前端预填值。
  - (另:已按 V 要求在后台直接改了 bryan/gg/joey 三个密码。)
- **AI 周报想法接回 Idea Pool** —— `ideas` 表新增 4 条 `created_by='AI'` 的精华想法(从本周 06-29 周报「值得测试的方向」提炼);并加 `ai_add_idea(p_txt,p_tags,p_pri,p_src)` SECURITY DEFINER RPC(anon 可执行、近 10 天同文案去重),供 n8n 每周自动写入。HTML 侧无需改动(AI 徽章 `by==='AI'` 一直都在)。
- 验证:`node --check` 通过;headless exit 0、无 pageerror。

## [v30] — 2026-06-29 · Finalize:独立 demo.html + 清空 production 测试数据

- **新增 `PI/demo.html`** —— 面向演示的自带数据版本,**完全不连后端**:
  - 用「内存 mock supabase」替换 CDN 的 supabase client(保留 marked / Chart CDN,浏览器内正常出图/渲染 markdown),app 业务逻辑零改动,与正式版完全一致。
  - 自动登录为 Admin(Eling),省去演示时的登录摩擦;mock 支持 select/insert/update/delete/upsert/rpc + auth,演示中可交互(改动只进内存、不落库)。
  - 种子数据覆盖各种情况:8 条 idea(各来源/优先级/状态)、6 条 hypothesis(OK188KH/17WINKH/SBKH/INZ9;素材/受众/Promotion;含 **clean / 干净 2×2 / crossbad(Format 三值)/ nodiff / undeclared** 五种一致性状态)、13 条 creative、10 条竞品广告(含**多值 Game Type**如 sports+live_casino、单值、null 的 `-`、🏆长青、NEW)、运营商/周报/发现候选/监测词等。
  - 安全:demo 里 n8n webhook 已置为 `PASTE_DEMO_DISABLED`,手动添加表单不会向生产发数据。
  - 生成器留档于 `PI/demo_src/`(`gen_demo.py` + `dict_entries.json`);index.html 改版后重跑即可同步 demo。
- **清空 production 测试数据**(Supabase `bfukphakofrjalsqteda`,按 V 确认范围):删 ideas / hypotheses / creatives / audit_log;保留 competitor_*、weekly_reports、dict_entries、profiles(9 用户)、roles/permissions。正式版自此从干净状态起步。
- 验证:headless chromium 跑 demo.html → 自动登录、各页渲染、无 pageerror;一致性状态实测 = 设计预期(clean/clean/crossbad/nodiff/undeclared)。

## [v29] — 2026-06-29 · Ads Library Game Type 接真实数据(多值中文 pill)

- **Game Type 显示/筛选接通**(完全参照 hook_type 处理):
  - 新增 `gameTypesOf(a)`(逗号 split/trim/去空,与 `hooksOf` 平行)、`GAME_ZH` 英中映射、`gameZh(code)`(先查 `DICT['Game Type']`,回退 `GAME_ZH`,再回退原值)。
  - 表格 Game Type 列:多值渲染成竖排多个中文 pill(`.hooks` 容器 + `pl style`),空值显示 `-`(原本只显示单个英文 key)。
  - 筛选:`filteredAds` 的 game_type 条件从整串 `===` 改为 `gameTypesOf(a).includes(选中值)`(多值按"包含"筛,与 hook 一致);KPI 走 `galRows` 自动联动。
  - 下拉:保持 DICT 驱动(value=英文 code、显示中文),补 `unknown→未知` 兜底项。
- **注意:需配套视图改动** —— `v_ads_gallery` 视图当前未 select `game_type`(底层 `competitor_ads.game_type` 已存在但全 null),所以前端读不到,显示仍会是 `-`,直到视图透出该列(见交接说明)。
- 验证:`node --check` 通过;headless exit 0、无 pageerror;逻辑单测:多值→两 pill、空→[]、unknown→未知、sports/live_casino 互筛命中同一条。

## [v28] — 2026-06-29 · 交叉测 2×2 网格校验

- **一致性裁判加 2 维交叉网格校验** —— 之前选 2 个维度时,裁判只检查「每个维度有没有变化(≥2 个值)」,所以某维度有 3+ 个值(例:Format = 单一静态图 / 单一视频 / 多图轮播)照样判 clean,漏报。现在 `checkHypoConsistency` 对 `dims.length===2` 追加干净 2×2 判定:**每维恰好 2 个值、4 种组合各出现一次、无留空**,否则报 `crossbad` 红条。
  - `over`(值超过 2 个的维度)→ 提示「把多出来的那条改成另一个值补齐」(对应你说的「多图轮播应变成单一静态图」)。
  - 每维 2 值但组合不齐(对角线/重复/缺格/留空)→ 提示「让 X × Y 的 4 种组合各出现一次」。
  - `judgeMeta` 加 `crossbad`(🔴 2×2 不齐);`tmSaveLock` 已按 `state!=='clean'` 拦截,crossbad 同样不能锁定。
- 验证:`node --check` 通过;headless exit 0、无 pageerror;逻辑单测 4 例(截图 3 值→crossbad/over=format、补齐→clean、对角线→crossbad、留空→crossbad)全部符合预期。

## [v27] — 2026-06-29 · 对比页三个 bug(红条陈旧 / 锁定组下拉 / Drawer 不收)

- **Bug 修复:一致性红条陈旧** —— `tmCellChange`(改素材维度下拉)之前只存 DB + 更新内存,**没重渲染**,所以把两条素材的在测维度改成不同值后,「内容不一致」红条仍停在改之前的「没差异」旧状态(误报)。末尾补 `renderTagMatrix()` 重算。已用 HYP-005 真实数据验证:hook 两条不同(fast_payout / withdrawal_proof)→ 判定应为 `clean`,修复后红条即消失。
- **Bug 修复:锁定组下拉显示 unselected** —— 「全组锁定」下拉原只读 `lockedTags[dim]`,即使所有素材本就同一个值、但没显式设过锁定,也显示 unselected(感觉"逻辑没接起来")。新增 `tmCommonVal(dim,cr)`:回退到「全部素材都相同」的那个值;素材间不一致时才留空(正确提示需统一)。
- **Bug 修复:Drawer 不收起** —— 从 Hypothesis 抽屉点「素材管理 & 标签 →」进对比页时,右侧抽屉不会自动关。`openTagMatrix` 开头补 `closeDrawer()`。
- 验证:`node --check` 通过;headless chromium exit 0、无 pageerror;`tmCommonVal`/`closeDrawer()` 已加载;一致性逻辑用真实数据单测为 `clean`。

## [v26] — 2026-06-29 · 登录页精简 + 对比页间距 + 取消勾选自动减行

- **登录页精简** —— 删掉标题下灰色副标题「Sign in」(`.lgsub` 元素+CSS)与底部「Use your assigned username & password · Issues? Contact your admin」(`.lghint` 元素+CSS);标题间距移到 `.lgbrand` 上,布局不塌。登录按钮保留。
- **对比页间距** —— 「内容不一致」红色提醒原仅 `margin-top:12px`,贴着下方素材表太密;补 `margin-bottom:18px` 拉开与表格的距离。
- **Bug 修复:取消勾选自动减行** —— 此前 `tmEnsureRows` 注释明说「只补不删」:1 维→1 条、1 维→2 维→4 条都对,但 2 维 untick 回 1 维时行数不回退(一直 4 条)。新增 `tmTrimRows(hyp,target)`:维度减少时把多出来的**空**素材行删掉(按 V 序号倒序优先删最新加的,只删 `versions`/`runs` 皆空的行,已填内容/已上线的保留),`tmToggleDim` 在 ensure 之后调用。所以 2→1 会回到 1 条(若某些行已填内容则保留那些,不毁数据)。
- 验证:`node --check` 通过;headless chromium 实测 exit 0、无 pageerror、登录卡渲染正常、被删元素已无、`tmTrimRows` 已加载。

## [v25] — 2026-06-28 · 命名/按钮统一 + 重排 + 安全

- **A** 对比页/入口按钮「管理素材 & 标签」→「**素材管理 & 标签**」(两处统一,顺序对调)。
- **B** 对比页红色「内容不一致」提醒从顶部移到「＋加素材」下方、表格上方。
- **C** Draft / Save 统一英文:Creative Setup/Edit「存草稿/保存」→「Draft / Save」;对比页「保存并锁定/解锁修改」→「Save / Draft」(New Hypothesis 本就是 Draft/Save)。语义:Draft=可随意改、Save=锁定不可改。
- **D** Draft/Save 操作移到**页面右上角**(对比页 header + Creative Drawer header),与 New Hypothesis 一致;移除底部按钮行。
- **E** New Hypothesis 基础重排:第一排 品牌 / 起因 / 证据;第二排 测试类型 / 人群 / 年龄段。
- **安全:闲置自动登出** —— 10 分钟无鼠标/键盘/点击/滚动 → `logout()`(`resetIdleTimer`,登录后启动、任意操作重置)。
- **Activity Log 加登录/登出** —— `doLogin` 成功记 `auth/login`、`logout` 记 `auth/logout`(写入 `audit_log`,含 user/time)。
- 验证:`node --check` 通过;无头实测 card1 顺序正确、idle timer 在、无 pageerror。
- 注:`知识类型`(你提到的第二排首项)我按现有「测试类型」字段放置、未改标签 —— 若要把它改名成「知识类型」告诉我。

## [v24] — 2026-06-28 · 对比页 Draft/锁定 + Creative Draft/Save + 自动生成行

- **#1** New Hypothesis 人群/年龄未选 →「— unselected —」(`dimTabOpts` 空项统一,与其他字段一致)。
- **#2** Hypotheses 列表行去掉「干净/没差异/污染」小状态点(删 `judgeDot`)。
- **#3** 对比页标题「素材标签 & 对比」→「**管理素材 & 标签**」(与入口按钮统一)。
- **#4 选维度自动生成行**(`tmToggleDim` → `tmEnsureRows`):勾 1 维自动补到 1 条、勾 2 维补到 4 条(2×2 交叉,只补不删);手动「＋加素材」仍可加。
- **#5 / #7 对比页 Draft → 保存并锁定**:① 未锁=草稿态,所有控件可改、改即存;② **一致性提醒** banner(不一致显示红色),**「保存并锁定」前校验** —— 维度没勾 / <2 条 / Format·Hook 没填 / `checkHypoConsistency` 非 clean,任一不满足都 **toast 拦下、不能锁**;③ 锁定后(`locked_tags._locked=true`,复用 jsonb,免迁移)整页只读(复选框/锁定下拉/在测格/加素材全禁用),**仅 Admin 可见「🔓 解锁修改」**(`tmUnlock`)。
- **#6 Creative Setup/Edit Draft/Save**:`firstVersion` / `editCreativeCopy` 改为 **存草稿 + 保存** 双按钮 —— 存草稿不校验;保存校验「图 + Primary text + Headline + CTA + Description」必填(Ads Code 可留空),缺则 toast 拦(`creativeContentMissing`)。Setup 去掉「这一版结果」下拉,状态由按钮决定(草稿→待上线 / 保存→上线中)。
- 验证:`node --check` 通过;无头实测 —— 不一致拦锁、干净可锁、锁后只读+复选框禁用、Setup 双按钮 + 校验列出缺项,无 pageerror。
- 注:`setup_locked` 暂存于 `locked_tags._locked`(Supabase MCP 时断,免迁移);稳定后可提升为独立布尔列。

## [v23] — 2026-06-28 · UI 优化批次

- **指标 card2**:主指标 / 防守底线下拉收窄到 1/3 列宽(与「测试类型」同宽,不再撑满);目标值/%、阈值 op/figure 两小格保持 88px;改用 row3 网格,各有独立标签(目标值(绝对/%)、阈值)。
- **slot 句子**:无基准时由「(无基准·探索)」改为「…」(NH live + `val_from` 落库;抽屉对历史值做显示映射)。
- **假设详情抽屉**:① 顶部「我相信…会让…变为…」由 2 行 h2 改为 **3 排 slot**(我相信 / 会让…变为 / 因为),与 New Hypothesis 一致;② 下面 `新测试 / 待锁定` 状态条加 `margin-top:16px` 拉开距离;③ Creatives 卡按钮蓝色 → ghost、文案「打标签 & 对比」→「**管理素材 & 标签**」;④ 删「Tests · 测试记录」后的「(T-编号 = …)」注。
- **「管理素材 & 标签」对比页**:① 测试维度 **最多选 2 个**(单变量或交叉,超出 toast 拦);② 锁定面板说明去掉「—— 这就是为什么不会 A 做 A 的、B 做 B 的」;③ 表头去掉「全组锁定」字样,锁定列改为 `🔒 + 维度名`、在测列为 `名 + ▲在测`;④ 锁定格字体改黑色(原浅灰)、去掉每行的 🔒(表头有即可)。
- 验证:`node --check` 通过;无头实测 —— 句子无基准显示「…」、metric 收窄、表头 🔒/▲、锁定格黑字无 emoji、维度第 3 个被拦、抽屉 3 排 slot、(T-编号) 已无,无 pageerror。
- 确认:在对比页加 N 条素材 = 写进 `creatives` 表,Creatives 页面读同表 → 自动出现 N 条 row(同一份数据,非复制)。

## [v22] — 2026-06-28 · 多选测试维度 + 全组锁定 + 人群/年龄上移

> DB:`hypotheses` 加 `locked_tags jsonb`;`test_dim` 改存逗号分隔的多维度。
- **New Hypothesis card1**:删「测试维度」下拉 + 那段维度说明 remark;**加「人群」+「年龄段」**(词表动态读 DICT 的 Persona / Age Range),存到 hypotheses 的 persona / age_range。两者纳入必填。
- **对比页:测试维度改可多选**(`tmToggleDim`)—— 5 维(Format/Hook/视觉/Offer/游戏)复选框,勾 1 = 单变量、勾 ≥2 = 交叉测;存 hypotheses.test_dim(逗号分隔)。人群/年龄已移走,对比页维度 7→5。
- **对比页:全组锁定**(`tmSetLock`)—— 没勾的维度在「🔒 全组锁定」面板一次设好,自动写到该假设**所有**素材的该列(`.eq('hyp_code')` 批量),表格里灰显、不可改;`tmAddCreative` 新素材自动套用锁定值。表格:在测列=每条可选(紫),锁定列=🔒文本。
- **裁判**:`checkHypoConsistency` 改多维(每个在测维度应 distinct≥2;没勾的应一致);**对比页 + 抽屉的「一致性裁判」卡按 V 要求全部移除**,只保留 Hypotheses 列表行的小状态点(judgeDot)。删 `judgeHtml`(无引用)。
- 连带:`loadHypos` 解析 `testDims` 数组 + `lockedTags`;`saveHypothesis` 写 persona/age_range(不再写 test_dim,改由对比页管);`editHypothesis`/`renderHypo` pill/`openDrawer`(加人群/年龄行、维度改多选)同步。
- 验证:`node --check` 通过;无头实测 —— 表单无测试维度、人群/年龄从 DICT 填充;对比页 Hook=▲在测可选、其余 4 维🔒全组锁定文本、锁定面板 4 下拉、无裁判卡、无 pageerror。

## [v21] — 2026-06-28 · 抽屉去重 + HVR 占位基准

- **假设详情抽屉**:删掉「一致性裁判」卡 + Creatives 卡底部那条说明 remark(裁判已在「打标签 & 对比」页,避免重复)。列表行状态点保留。
- **HVR 占位基准**(上线前先跑通功能,V 之后替换):`get_brand_baselines()` RPC 不产 7-Day High-Value Rate,故给 `data['OK188KH']['7-Day High-Value Rate']` 放占位 `{base:8,unit:'%',placeholder:true}`(loadBaselines 覆盖后再注入)。于是 OK188 baseline 自动显示「8 %」、目标值 %↔绝对值双向同步恢复;baseline 卡注明「⚠️ 占位基准(待数据管道接入 HVR)」。要换真值改 `data` 字面量 + loadBaselines 注入处(两处 base:8)。
- DICT 7 列下拉线上确认全部有词条 → `DIM_DICT_TAB` 映射正确,无需改。
- 验证:`node --check` 通过;无头实测 OK188 baseline=8%(占位)、%50→目标12、目标12→%50。

## [v20] — 2026-06-28 · 素材标签移到假设级「对比页」+ Setup 还原

> 反馈:逐条 Setup 里打标签没法对比。改为**一个假设的全部素材在同一页排成表对比**,顶部裁判实时。
- **Setup 还原**:`firstVersion` / `editCreativeCopy` 去掉「素材标签·7维」块,回到只 上传图/文案/状态/Ads Code;`saveFirstVersion` / `saveCreativeCopy` 去掉标签校验与写入(回原样)。删 `creativeTagBlock`/`readCreativeTags`/`validateCreativeTags`/`liveJudge`/`addCreativeSkeleton`(被取代)。
- **新建假设级全宽页**`#v-tagmatrix`(`openTagMatrix`/`renderTagMatrix`):一个假设的全部素材每条一行,7 维各一列下拉(词表动态读 DICT),已有值预填;`Format/Hook` 列标 `*`、空值红框;测试维度列高亮 + `▲测`。
- **改即存**(`tmCellChange`):改任一格 → 内存更新 + 顶部裁判**实时重判** + 写回 creatives 对应列(单列 update)。`tmAddCreative`「＋加素材」在本页建骨架并刷新。
- **入口**:假设详情抽屉 Creatives 卡的按钮改为「打标签 & 对比 →」`openTagMatrix(h.id)`;抽屉裁判卡 + 列表状态点(P2)保留。
- 验证(无头实测):矩阵 4 行×7 下拉=28 个、从 DICT 填充;改 V4 format→污染、全 hook 同→没在测它,顶部裁判三态实时切换正确;`node --check` 通过、无 pageerror。
- 注:creatives 标签仍存同样 7 列(format/hook/visual_style/offer/audience/age/game_type),裁判口径不变;DICT tab 名映射仍待线上核对(见 v18 注)。

## [v19] — 2026-06-28 · 指标格子对齐

- card2 指标重排为两行对齐网格:`主指标[长下拉] 目标值[88] %[88]` 与 `防守底线[长下拉] op[88] figure[88]` —— 第一格弹性长、右两格固定 88px,两行列对齐。标签右上角标「目标值(绝对 / %)」。

## [v18] — 2026-06-28 · P1b 素材标签 + P2 裁判

> 完成 SPEC 的 P1b(Creative Setup 打标签)+ P2(一致性裁判)。词表**动态读 DICT**(V 定)。
> ⚠️ **DICT tab 名假设**:`DIM_DICT_TAB` 把 7 维映射到 Dictionary tab —— `format→Format`、`hook→Hook`、`visual_style→Visual Style`、`offer→Offer`、`audience→Persona`、`age→Age Range`、`game_type→Game Type`。若某下拉为空 = tab 名与 `dict_entries.tab` 不符,改 `DIM_DICT_TAB` 即可(下拉会显示「Dictionary『X』无词条」提示)。

**P1b — 素材标签(Creative Setup)**
- `firstVersion` / `editCreativeCopy` 表单加「素材标签 · 7 维」区:7 个下拉(Format/Hook/视觉/Offer/人群/年龄/游戏),选项**动态从 `DICT[tab]`** 拉(filter active),已有值预填。
- **Hook + Format 必填**(红 `*`);`saveFirstVersion` / `saveCreativeCopy` 存前校验(缺则 toast 拦),标签写入 creatives 的 format/hook/visual_style/offer/audience/age/game_type 列。
- `loadCreatives` 映射这 7 列到 creative 对象;本地 `Object.assign` 同步。

**P2 — 一致性裁判(`checkHypoConsistency`,只警告不阻断)**
- 判定:声明维度(`test_dim`)在素材间 `distinct≥2`(该变)+ 其它 6 维各 `distinct≤1`(该一致)→ `clean`;声明维度无差异→ `nodiff`(没在测它);其它维度混了→ `polluted`(列冲突维度 + 修法);<2 条→ `insufficient`;无 test_dim→ `undeclared` 跳过。
- 展示:① **假设详情抽屉**加「一致性裁判」卡(逐维 ✓/✕ + 裁决 + 修法);② **假设列表行**状态点(干净/污染/没差异/待补素材);③ **Creative Setup 表单内实时**(`liveJudge`:改任一标签下拉 → 用「本条当前表单值 + 同假设其它已存素材」即时重判翻红)。
- 修法提示:`nodiff` → 让素材在该维度取不同值;`polluted` → 对齐混了的维度 / 或拆成多条假设。
- 验证(无头实测):裁判 clean/polluted(conflicts=[format,offer])/nodiff 三态正确;7 下拉从 DICT 填充 + 预填;liveJudge 改 format 实时翻红;Hook/Format 校验返回 [Format,Hook];`node --check` 通过、无 pageerror。

## [v17] — 2026-06-28 · 指标区 UI 微调

- 「本次测的维度 — …」标签 → 改为简洁的 **「测试维度」**。
- 指标区格子统一:目标值(绝对+%)与护栏 figure 输入框改为弹性填充、对齐;防守底线整行放满宽,避免 `Day-1 Quality Floor` 被截断。
- 去掉防守底线下拉里的中文括号注 `(第一天自主保底)`,只留 `Day-1 Quality Floor`。
- 复核(无头实测,非改动):**目标值 %↔绝对值双向同步**正常(INZ9 基准14:%50→21、值14→%0);**容量体检随预算/周期实时重算**正常(30/14天 🟡 → 100 🟢)。两者在 OK188 上看似无反应,是因 7-Day High-Value Rate「基准待定」+ 无单位成本(figure/基准 TBD、管道未提供)→ 无可换算的参照,**非 bug、不假填**。

## [v16] — 2026-06-28 · 指标按品牌方向锁定

> 范围严格限定:只改「指标」区(主指标名单 / 防守底线 / 算法标注 + 目标值挪位)。不碰判定层级、观察期、双轴护栏、诊断字段、任何阈值数字(figure 是独立下一步,本期一律 TBD)。

- **布局**:目标值(绝对 + %)从 card3 搬到 **card2**(主指标右侧);card3「假设」去掉目标值字段,只留 sentence + 改变 X + 理由。
- **主指标按品牌锁定**(`syncMetricByBrand` + `onBrandChange`,品牌 onchange 触发):
  - `OK188KH`(高价值)→ 只有 `7-Day High-Value Rate(7 天大脚率)`,锁定单选(disabled)。
  - `17WINKH`(走量)→ `FDC` / `CPA` 二选一。
  - `SBKH`(待定)→ disabled「待定(方向未定)」,不给名单。
  - `INZ9` 及非 USC 三品牌 → **完全原样**(FDC/REG/AFDA/FDAMT)。
- **防守底线**:`OK188`/`17WIN` 锁为 `Day-1 Quality Floor`(指标名 disabled、比较符固定 `>` 只读),figure 仍可填(现 TBD);移除这两个品牌的 AFDA。`INZ9`/其他原样(AFDA/FDC/CPA/D7CR、≥/≤)。
- **算法标注**(浅灰小字、纯展示、不参与计算/校验,`#metric-algo` / `#guard-algo`):
  - High-Value Rate → `同期新客中,7 天总存款 ≥ 高门槛 的人数 ÷ 新客总数 × 100%`
  - Day-1 Quality Floor → `同期新客中,第一天自己存款 > 最低线 的人数 ÷ 新客总数 × 100%`
  - 「高门槛」「最低线」保留文字、不填数字。
- **连带**:① sentence 的指标名跟随当前主指标(不再写死 FDC);② Baseline 跟随主指标 —— High-Value Rate 现数据管道无基准 → 显示「基准待定」并标注、**不假填**(⚠️ 见下「待 V/数据」)。
- **切品牌即清旧数值**:进 OK188/17WIN/SBKH 时清空 目标值/%/护栏 figure,不把旧指标的数字(FDC 18/80%、AFDA ≥4)平移到新指标;`editHypothesis` 同理(锁定品牌不回填被替换指标的数值)。
- **校验**:figure 本期 TBD —— 目标值 / 护栏阈值仅对非锁定品牌(INZ9/其他)仍必填;OK188/17WIN/SBKH 留空可存(草稿无校验;SBKH 因无合法指标,只能存草稿、到不了「待锁定」)。
- 验证:`node --check` 通过;无头浏览器渲染 OK188 / 17WIN 两态,锁定 / 名单 / op / 算法标注 / Baseline 全部对上,无 pageerror。
- **⚠️ 待 V / 数据**:`get_brand_baselines()` RPC 只返回 FDC/REG/AFDA/FDAMT,**不含 7-Day High-Value Rate**;HVR 是 7 天 cohort 指标,现管道算不出其基准 → 已按你要求留空标注、不假填。要它的 baseline,需新增 cohort 口径的取数(D1+D7、高门槛 figure 定了之后)。

## [v15] — 2026-06-28 · New Hypothesis 重构 P1a(假设端)

> SPEC:`SPEC_hypothesis_redesign.md`(标签优先 + 维度声明 + 裁判 + Results)。本次只做 P1 的「假设端」:删素材矩阵、加维度声明、素材改逐条建骨架。Creative Setup 打标签(P1b)、裁判(P2)、Results 聚合(P3)未做。
> ⚠️ **依赖 DB 迁移**:部署前必须先在 Supabase 跑 `migration_p1.sql`(加 `hypotheses.test_dim` + `creatives` 的 audience/age/game_type/offer 列),否则立假设保存失败。

- **删素材矩阵卡(card4)** + `matrix()` 函数 + `updateAll` 里的 `matrix()` 调用。
- **card1 删逐属性 select**:`hf-format`/`hf-persona`/`hf-age`/`hf-game`/`hf-vs`/`hf-hook`/`hf-offer`(连带 `offerRow` + `hookChange()` 及其 3 处调用)——这些属性下沉为 Creative 标签。**留** `hf-brand`(baseline key)。
- **card1 加「本次测的维度」下拉 `hf-dim`**:选项 = `TEST_DIMS` 白名单 7 维(Format/Hook/视觉/Offer/人群/年龄/游戏),key 与 creatives 标签列名对齐(供 P2 裁判)。默认 unselected,Save 必填(沿用 v12 防漏填)。
- **目标整套逐字保留**:指标卡、改变 X、目标值(绝对+%)、`#sentence` slot、Baseline 卡、容量体检、判定规则 —— 一行未动(SPEC 硬约束)。
- **素材生成改逐条建骨架**:`saveHypothesis` 删「按 matrix.total 批量生成 creative」循环;hypothesis row 不再写 format/hook/vs/persona/age/game/offer/matrix,改写 `test_dim`。新增详情抽屉「＋ 加素材」按钮(`addCreativeSkeleton`)逐条建 creative 骨架(挂 hyp_code + V 编号),团队再去 Creative Setup 打标签 / 填图文。**注**:删 auto-gen 后这是当前唯一的 creative 创建入口。
- **联动收口**:`resetHypoForm`/`validateHypo`/`editHypothesis` 去掉已删字段、加 `hf-dim`;`loadHypos` map `test_dim`→`testDim`(旧列映射保留作历史兼容);`renderHypo` 列表加维度 pill;`openDrawer` 把「目标人群」行换成「本次测维度」、加 `applyPerms()`。
- **未改**:`renderResults`(P3 重写,现仍兼容 null hook/vs)、Creative Setup 表单(P1b 加标签)、裁判(P2)。
- 验证:抽内联 JS `node --check` 通过;未做浏览器实测(本环境无 Supabase MCP / 无法起预览)。
- **待 V 定**:① card1 的 hf-type/hf-trigger/hf-evi 去留(本版先保留);② P1b Creative Setup 标签下拉的词表来源(复用原硬编码列表 vs 动态读 DICT)。

## [v14] — 2026-06-26
- **未选品牌时 baseline 文案**:`updateAll` 加 `else if(!brand)` 分支,未选品牌显示「请先选择品牌」而非误导性的「无基准·探索」(后者仅在选了品牌但该品牌无数据时出现)。
- **INZ9 币种标注**:RPC 给 INZ9 的 AFDA/FDAMT 单位返回 `RM`/`RM/周`(USC 维持 `$`/`$/周`),表单 baseline 显示该单位 —— 免团队把 INZ9 的 165 误读成美元。背景:广告费两边均 USD(故 CPA/cost 可跨品牌比),首存额各自本币(USC USD / INZ9 MYR,不可直接比),已 V 确认。

## [v13] — 2026-06-26

- **Hypothesis 列表「Create Date」列**:创建时间从 code 下方副标题 → 改为 Hypothesis 与 Metric 之间的独立列(表头 `Create Date`;空态 colspan 9→10)。
- **Baseline 实时数据接入(新模块)** —— 口径据 Vny《USC业务指标术语表》+ 30 天窗口:
  - Ads Raw Data 项目(`kkypkudherpaxyoocyfa`)新建 `SECURITY DEFINER` RPC `get_brand_baselines()`(anon/authenticated EXECUTE),按品牌返回 FDC/REG/AFDA/FDAMT 的 base+cost+unit;USC 用 raw 列、INZ9 用 `_adj` 归因列;窗口 = 各表 `max("Date")` 往前 30 天(`>`,30 个日历日)。
  - HTML 加第二个 supabase client `adsDb` + `loadBaselines()`,登录后拉 RPC 替换硬编码 `data`(`const`→`let`)。17WINKH/SBKH 原为 null,现有真实值。
  - 三重验证:Database Optimizer subagent 起草+只读验证 → 我独立重跑聚合逐数对上 → applied 后 service 调用 + anon key curl 实调,均确认。
- **协作**:本模块按硬规则派了 Database Optimizer subagent(此前 v10–v12 单文件外科改动一直自己下刀+复核,已向 V 说明并待其定 delegation 偏好)。

**已知 / 待 V·Vny 确认**:
- **INZ9 的 AFDA≈165 / FDAMT≈4045** 远高于 USC(AFDA 5~6)—— 几乎确定是币种不同(KH vs MYR),不影响每品牌自洽的 baseline/容量体检,但跨品牌 AFDA/FDAMT 不可直接比;请确认是币种而非数据 bug。
- baseline 聚合经 anon key 可读(behind cPanel + 登录门);只暴露聚合,不暴露原始会员明细。
- 上线前清测试数据(idea/hypothesis/creative,只留 AI scan)仍待做。
- v13 未做浏览器实测(RPC 已 anon curl 实证可调)。

## [v12] — 2026-06-25

v11 团队实测反馈第二轮。纯前端,数据模型不变。

- **#2 Creative Edit 修复**:`editCreativeCopy` 末尾自开抽屉 —— 修掉从列表点 Edit"没反应"(v11 ⑧ 引入,内容塞进了关着的抽屉)。
- **#3 Hypothesis 创建时间**:`loadHypos` 取 `created_at`,详情抽屉显示「创建时间」。
- **#4 表单按钮改名**:「存草稿」→ `Draft`、「完成草稿 → 待锁定」→ `Save`。
- **#5 New Hypothesis 防漏填**:
  - `prepHypoSelects`/`resetHypoForm` —— 打开表单时所有 select 默认 `— unselected —`、输入框清空(保留 placeholder);`promote`/`editHypothesis` 调用。
  - `validateHypo` —— Save(待锁定)校验全部必填,缺项给字段加红 `*`(`.reqstar`)+ 红框(`.reqbad`)并 toast,**不保存**;Draft(草稿)不校验。移除原 `if(!x)` 硬拦。
  - 必填 = 除「理由」(idea 自动锁定)外全部;**防守底线改必填**并去掉「无」选项;Offer 仅 Hook=优惠直给 时出现且必填。
  - `matrix`/`capacity` 加空值守卫(显示 `—` / 「请填日预算与周期」,不再出 NaN);`resetHypoForm` 隐藏 offerRow 防残留误判。
- **Idea Pool**:
  - 加 **Delete**(`delIdea`):仅「**自己提出**(`by===当前用户`)+ **未衍生 hypothesis**」可删;AI/别人的无删除。
  - **手动想法 Tag 必填**:编辑器 Tag 标「必填」、改提示;`saveIdea` 校验 Tag 非空。
- **(round-2 小修)**:Hypothesis 创建时间也显示在列表行(`renderHypo`,之前只在详情抽屉);Idea「编辑」也加归属门 —— 只能编辑自己提出的(`renderPool` 按钮 + `openIdeaEditor` 双重校验)。

**已知 / 留待**:
- 「AI 扫描不给手动想法打 Tag」在 **n8n**(后端),本轮未动 —— 需要时用 n8n MCP 另开。
- Idea 删除的"只能删自己的"目前是前端 UX 门;真隔离需 RLS 行级策略(随权限隔离一起做)。
- Edit 回填 month/market/mode 按编辑时重算(可接受)。
- v12 未做浏览器实测 —— 待 V 刷新点测(尤其表单校验流程)。

## [v11] — 2026-06-25

v10 团队实测反馈修复(6 项)。纯前端,数据模型 `gen_code`/`ads_code` 不变(只是把 `ads_code` 填写入口从行内挪进表单)。

- **#1 Watchlist「No ads」**:Ad Status 无匹配 ads 数据时由 "—" 改显 `No ads`(`renderBrands`)。
- **#2 Idea Tag 选择器网格化**:`.tagpick` 改 CSS grid 等宽列(`minmax(190px,1fr)`)+ `.tagopt` flex 填满,位置统一不再杂乱。
- **#5 Hypothesis Edit/Delete 移到右上角**:与「我相信…」标题同排、右对齐(`openDrawer`)。
- **删除逻辑重构(解决 Human Error 矛盾)**:删除门槛从"有无 creative"改为"creative 有没有被动过" —— 所有 creative 都是空骨架(无 `versions`、无 `runs`)时可删,并**级联删除空骨架**;任一 creative 被用过(填版本 / 有 run)则禁删,提示改用 Edit。`canDel` 控制 Delete 按钮显隐。
- **#6/#7 Ads Code 改表单录入**:列表第1列空值显示 `pending`(纯标签,去掉点不动的 prompt 按钮);Ads Code 输入框加进 Setup(`firstVersion`)+ Edit(`editCreativeCopy`)表单,保存写 `ads_code`(两处均预填现值,防覆盖)。

**已知 / 留待**:
- `editAdsCode` 函数现已无调用方(孤立),保留未删(无害)。
- 级联删除需要 `creative:delete` 权限——非 Admin 若只有 `hypo:delete`,会因 RLS 删失败(不产生孤儿,整体回滚报错)。
- v11 未做浏览器实测——待 V 刷新点测。

## [v10] — 2026-06-25

团队上线前 fix pass,8 项(基于 v9,详见 `SPEC_v10_fixpass.md`)。纯前端,数据模型 `gen_code`/`ads_code` 零改动。

- **① CI Watchlist Ad Status**:`lifeBadge` 拆三档 —— ≤14d Active / 15–30d **Dormant**(琥珀 ld)/ >30d Inactive / 无匹配 ads 数据 "—"。
- **② Idea Tag 选择器**:`.tagpick` 去掉 `max-height/overflow`,全部 tag 一次显示、铺满留白。
- **③ Hypothesis 理由锁定**:从 idea 立假设时 `hf-why` = idea 文案、只读;仅 Edit 模式可改(以 `window._promoteIdea` 判定)。
- **④ 「我相信」大方块修复**:`.slot.empty` 补 `padding:2px 8px`,挡掉通用 `.empty{padding:40px}` 串台(根因是 CSS 串台,非旧版——先前误判已纠正)。
- **⑤ Hypothesis 删除 + 编辑**:详情抽屉加 Edit(回填表单 → `saveHypothesis` 走 UPDATE,保留 idea 挂钩/created_by,不重生成 creative)+ Delete(仅无 creative 的草稿可删,否则显示「已挂 N 个 creative · 不可删」)。
- **⑥⑦ Creative 列表两列**:第1列空出供手填 Ads Code(空显「＋ Ads Code」虚线占位);第2列显示系统码 `gen_code`,可点跳回上层 Hypothesis(新增 `linkHyp`/`gotoHypo`)。
- **⑧ Setup/Edit 按钮**:列表无版本→Setup、有版本→Edit(均 ghost 统一);抽屉「填第一版/保存第一版」→ Setup/Save、`openCreative` 同步。

**已知限制 / 留待**:
- Edit 回填:format/game/vs/offer 用 token 匹配 option、evi 用文本匹配,已防字段静默回归;month/market/mode 会按编辑时重算(可接受)。
- 「手动新建假设」死代码(line 940)未清(不可达,V 决定保留)。
- creative `runs` 仍未持久化(§5 遗留,不在本轮)。
- Ads Library `select('*')` 仍无分页 —— 数据大了会重,本轮有意缓做。
- v10 未做浏览器实测 —— 待 V 部署/本地刷新点测。

## [v9] — 2026-06-25

- 状态:唯一最新版;内联 JS(1143 行)`node --check` 通过。
- 来源:`~/Downloads/index_v9.html`(158199 B,md5 `9b9547046851dcf6c602e9c2c5c0a98d`)。
- 基于 v8 的 5 项改动(详见 handoff §5):Idea 编辑入口、Idea 手动 Tag 多选、Creative 旧版"上线中"修复 + `saveVersion` 持久化、Creative 列表"去填第一版"CTA、Users 列重排。
- ⚠️ 已知未做:浏览器内 auth 流程实测;creative `runs` 未持久化(仍内存);`pe` 缺 `creative:edit`。

## [基线确立] — 2026-06-25

- 工作目录从 `PI/index_v8.html`(过期)切换到 `PI/index.html`(= v9 权威副本)。
- `PI/index_v8.html` → 归档至 `PI/versions/index_v8.html`;v9 快照存 `PI/versions/index_v9.html`。
- 确立单一基线规则:当前 = `PI/index.html`,字节核验与 `~/Downloads/index_v9.html` 一致。
