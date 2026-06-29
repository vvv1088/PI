# Handoff — PI「New Hypothesis 重构」session 2(截至 v25,2026-06-28)

> 用法:整份贴进新 chat 开头,延续 V 和 Claude build PI 营销系统。

## 0. 立刻要知道的
- **工作文件 = `PI/index.html`**(单文件 ~2300 行,内联 CSS/JS)。**当前 = v25**。
- **分支 = `claude/new-hypothesis-spec-p1-pg2rm9`**(所有改动在这;`main` 还是最初的 `e408e07`,没动过)。
- **repo `vvv1088/PI` 已设为 public**。GitHub 默认看 main 是旧的,要切到这个分支。
- **预览(渲染)= githack**:`https://raw.githack.com/vvv1088/PI/claude/new-hypothesis-spec-p1-pg2rm9/PI/index.html?v=25`(改尾巴 query 强刷缓存)。
- **登录**:`eling`/`123123`(Admin)。
- **Supabase 项目**:`bfukphakofrjalsqteda`(CI/auth/PI 持久化,anon key 硬编码在 html);`kkypkudherpaxyoocyfa`(Ads Raw Data + baseline RPC `get_brand_baselines`)。
- **环境坑**:这个远程容器的代理**挡 supabase.co + 第三方 CDN**(curl 直连 000),所以 Claude **只能离线渲染**(playwright-core + stub supabase/Chart/marked);真登录/真数据要 V 在浏览器开 githack。**Supabase/n8n/Slack/github MCP 反复连断**——建 user / 跑 SQL / 改 n8n 全靠它,经常要等它回连。

## 1. 这个 session 做了什么(v15→v25,全在分支)
- **v15 P1a**:删素材矩阵卡;card1 删逐属性 select;加维度声明;「目标」整套(指标卡/改变X/目标值绝对+%/sentence slot/Baseline/容量/判定规则)逐字保留。
- **v16 指标按品牌方向锁**:OK188KH=`7-Day High-Value Rate`(锁定单选)、17WINKH=FDC/CPA、SBKH=待定、INZ9/其他=原样(FDC/REG/AFDA/FDAMT);防守底线 OK188/17WIN 锁 `Day-1 Quality Floor`(op `>` 只读);两指标下加浅灰算法标注(纯展示)。
- **v17–19**:指标区 UI 微调 + 格子对齐。
- **v20**:素材标签从「逐条 Creative Setup」搬到**假设级全宽页 `#v-tagmatrix`**(一个假设全部素材排成表对比);Setup 还原成只图/文案/状态/AdsCode。
- **v21**:抽屉去重;**HVR 占位基准 8%**(RPC 不产 HVR,`loadBaselines` 注入 `data['OK188KH']['7-Day High-Value Rate']={base:8,unit:'%',placeholder:true}`,卡上标「占位」)。
- **v22**:测试维度**单选→可多选**(存 `hypotheses.test_dim` 逗号分隔);**全组锁定**(没勾的维度一次设好、套用所有素材);**人群/年龄从素材标签上移到 New Hypothesis**(存 hypotheses.persona/age_range);对比页维度 7→5(`format/hook/visual_style/offer/game_type`)。
- **v23**:指标格子收窄(同测试类型宽);句子无基准显示「…」;抽屉「我相信…」改 3 排;表头 🔒/▲;测试维度**最多 2 个**;删「(T-编号…)」。
- **v24**:**选 1 维自动生成 1 行 / 2 维自动 4 行**(`tmEnsureRows`,只补不删);**对比页 Draft→Save 锁定** —— 不一致拦下不能锁(`checkHypoConsistency` 须 clean + 每条 Format/Hook 填全 + ≥2 条),锁定后整页只读、**仅 Admin 解锁**(锁标记存 `locked_tags._locked`);**Creative Setup/Edit 改 Draft(不校验)/Save(必填 图+Primary text+Headline+CTA+Description)**。
- **v25**:「素材管理 & 标签」(改名+顺序);红色「内容不一致」提醒移到「加素材」下方;**Draft/Save 全统一英文 + 移到页面右上角**(对比页 + Creative Drawer,跟 New Hypothesis 一致);**New Hypothesis 基础重排**(第一排 品牌/起因/证据,第二排 测试类型/人群/年龄段);**闲置 10 分钟无操作自动登出**(`resetIdleTimer`);**登录/登出写进 Activity Log**(`audit_log` section='auth')。

## 2. 数据模型 / DB(已 applied 到 bfukphakofrjalsqteda)
- `hypotheses`:加 `test_dim text`(逗号分隔多维度)、`locked_tags jsonb`(全组锁定值 + `_locked` 锁标记);persona/age_range 复用旧列存「人群/年龄」。
- `creatives`:加 `audience/age/game_type/offer`(format/hook/visual_style 已有)。audience/age 现已不用(上移到假设)。
- `DIM_DICT_TAB` 维度→DICT tab:format→Format、hook→Hook、visual_style→Visual Style、offer→Offer、audience→Persona、age→Age Range、game_type→Game Type(线上确认词表都有,映射正确)。

## 3. 关键函数(grep 定位,行号会漂)
- 表单:`resetHypoForm` `validateHypo` `saveHypothesis` `editHypothesis` `syncMetricByBrand` `onBrandChange` `updateAll`(指标+baseline+sentence+容量)。
- 对比页:`openTagMatrix` `renderTagMatrix` `tmToggleDim`(选维度+自动生成行+max2) `tmSetLock`(全组锁定批量套用) `tmCellChange` `tmAddCreative` `tmEnsureRows` `tmSaveLock`(锁定+校验拦) `tmUnlock`(Admin) `tmEditable` `checkHypoConsistency`(多维裁判,**只在 Save 锁定时拦,平时不挡**) `MATRIX_DIMS` `dimTabOpts` `dictName`。
- Creative:`firstVersion` `saveFirstVersion(i,mode)` `editCreativeCopy` `saveCreativeCopy(i,mode)` `creativeContentMissing`。
- auth:`doLogin` `logout` `resetIdleTimer` `logAction`(写 audit_log)。
- 加载:`loadHypos`(map testDims/lockedTags/persona/age) `loadCreatives`(map 标签列) `loadBaselines`(注入 HVR 占位)。

## 4. 开发流程约定(每次改 index.html)
① `cp index.html versions/index_vN.html` 快照 → ② 抽内联 JS(`awk` 在 `^<script>$`..`^</script>$` 间)跑 `node --check` → ③ 无头渲染验证(playwright-core + stub,代理挡 CDN 所以必须 stub supabase/Chart/marked) → ④ 写 `PI/CHANGELOG.md` → ⑤ commit + `git push -u origin claude/new-hypothesis-spec-p1-pg2rm9`。

## 5. 待办 / 待 V 定
**后台三项(卡 MCP,一连上立刻做):**
1. **建 5 个 user**:VNY/vny123、ZQ/zq123、JK/jk456、ANNA/an789、WJ/wj321,**role=`usc team`**(用 `admin_create_user` RPC:p_username 小写/p_name/p_password/p_role_key,或 app 内 Administration→Users→New User)。
2. **重跑 Weekly Summary**(N-Back/U-Back 中午没跑成)—— 先在 Supabase `bfukphakofrjalsqteda` 列 edge functions 找到生成 weekly summary 的那个,再触发。
3. **Game Type 扫描规则**:本周起扫新 Game Type、之前的不理 —— 定位 CI 扫描器(n8n / Supabase edge function)改配置。

**Slack(单独任务,V 说「等下再讲」):** CI 每周一发 Slack 的 weekly summary 格式优化成 **point-form / 易读**;生成它的代码在 Supabase 项目 `bfukphakofrjalsqteda`(多半 edge function),**还没定位到具体函数名**。

**待 V 决定:**
- 「测试类型」要不要改名「知识类型」(V 提过第二排首项叫知识类型,我先按测试类型放、没改标签)。
- 要不要把分支 **merge 到 `main`**(现 main 是旧版 e408e07;合了 github 默认页/链接才是新版)——未经 V 明确同意不动 main。
- **HVR 真 baseline**:要 V 定「高门槛」金额 + 加 cohort RPC(口径 = 同期新客 D1+D7 ≥ 高门槛 占比;注意 D1+D7 不能直接拿只含第2-7天的 D7 列),现是占位 8%。
- `setup_locked` 现寄存在 `locked_tags._locked`(免迁移),稳定后可提成独立布尔列。

**别踩的坑:** 只改 `PI/index.html`;代理挡 supabase.co/CDN(浏览器实测靠 githack,Claude 离线 stub 渲染);两个 supabase client(`db`=bfuk… / `adsDb`=kkyp…);裁判**只在 Save 锁定时拦**;Draft=随意改、Save=锁定后仅 Admin 改;对比页加 N 条素材 = 写 `creatives` 表,Creatives 页面读同表自动出现 N 条(同一份数据)。
