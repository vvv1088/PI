# Changelog — Marketing Intelligent System

## [v83.2] — 2026-08-12 · Activity Log 排版 + Budget Permission 用词(V 反馈)

- Budget Permission:「USC Owner (Approval)」及同页 USC 字眼 → **CRM Owner**(仅该页;Budget Allocation 页的「USC 核批」字样待 V 确认是否跟着换)。
- Activity Log:Action 列从 label 徽章改普通文字;动作码/实体名统一转普通词(SOP_TASK_DONE→Sop task done、brands→Brands,首字母一致);全表字号统一 12.5px(原 badge 11px 与文本 13px 混排)。
- 验证:35 视图 + 11 项引擎检查零报错;定向实测(CRM 字眼/无徽章/大小写与字号统一)全过。

## [v83.1] — 2026-08-12 · Users 彻底一张表 + 权限板块标题放大(V 反馈)

- **Users 页只剩一种 user**:Name / Username / Role / 操作,四列一张表。「Meta 账号/Meta 状态」两列与页面上的系统 2 区块全部撤除 —— 系统 2 账号只是过渡期水管,不上桌面;审计对人不靠它(X-MIS-User 直接带 MIS username)。
- 过渡期映射收进「Edit user」抽屉的一个选填字段(仅当拉到系统 2 账号数据时出现),live 后退役旧账号时对个号用,日常完全不见。
- Roles & Permissions:板块标题行放大(13.5px 粗体 + 分隔线,此前 11px 比正文还小)。
- 验证:35 视图 + 11 项引擎检查零报错;定向实测(标题字号>正文/Users 四列/页面无系统 2 残留/抽屉过渡字段)全过。

## [v83] — 2026-08-12 · 四词权限模型统一 + Users 一人一行(V 定)

- **权限统一成一套词汇:view / add / edit / delete,两个系统同一标准**(V 提三词,数据核查发现 add≠edit 正被 Team/PO 角色使用——"只许投稿不许改稿",故保留 add 成四词,V 认可)。
- **Roles 抽屉 = 一张权限表**,按侧栏五大板块分组(PERM_MODEL,28 行):MIS 栏目照旧打勾 + 首次获得 view(关=整页从该岗位侧栏消失,UI 级控制,V 认可);Meta 17 key 从三级下拉展开为四勾,edit/delete 首次分离。旧的"Meta 权限"独立区块删除。
- **数据迁移**:role_permissions 加 can_view(存量默认 ✓);role_meta_permissions 三级 level 无损展开为四布尔后退役 level 列。给 Jayden 的 17 key 词汇不变,桥接时四布尔反推三级,零影响。
- **Users 一人一行**:MIS 用户表并入 Meta 账号列(映射下拉+权限/状态徽章),旧"系统 2 账号映射区"退役;未映射的系统 2 账号收进底部折叠条,live 后逐个认领。
- 写入口按动词细化:资源新建=add、删除/停用=delete(此前一律 edit)。
- 验证:35 视图 + 11 项引擎检查零报错;定向实测 7 项(四词矩阵 5 列×5 组×28 行/toggle 往返/Users 六列/未映射折叠条/view 隐藏/缺省语义/meta 只读)全过。

## [v82] — 2026-08-12 · 五大板块整并(V 定)

- 导航从 6 组收敛为 5 组:**Performance + Meta Analytics + PI 的 Results 合并为一个 Analytics 组**(所有分析/报告类集中:Closed-Loop Report、Spending、Results、Account Overview、Our Ads、Brand Comparison、Asset Lifecycle)。页面本体与视图 id 不动,只挪导航;权限 gating(per-key none 隐藏)不受影响。
- 五大板块终形:CI · PI · Meta Assets · Analytics · Administration。
- 首次走拆文件新流程发版(改 src/index.template.html → build → 冒烟)。
- 验证:35 视图 + 11 项引擎检查零报错。

## [v81] — 2026-08-12 · 命名契约 v2(终版 7 段)+ 权限映射施工 + 拆文件方案 A 落地

V 上午拍板全部三项决策 + ads code 终版结构,当天施工完毕(a/b/c 三个 stage commit,每段独立冒烟):

- **命名契约 v2**(`docs/07-命名契约v2.md`,mis-naming.js 整体重写):`市场_品牌_设定_格式_维度_内容_编号`(例 `USC_OK18_SA_VD_HK_WD_001`,优化重投 `…001V2`)。TR 定位段与语言段砍掉(V 定);设定改 2 字母(SA/AW/TF/EN/LD/AP);维度段用 V 给的 short form(FM/HK/VS/OF/GT + PS/AG/GN);内容段=字典词条短码(**全维度短码草稿已落库**,WD/SLT/LIVE 与历史用码对齐,V 可在字典页改);编号 3 位流水按**品牌×内容全局递增**(防跨假设撞名、同批连号)。唯一性=方案一登记制:保存时 ads_code+ref_code(基名)自动登记,resolveCreative 三层归因适配(v2 基名/V 后缀→登记全名→品牌)。解析三代同堂,老广告永不改名;v76 的 officialRefs/ref_batch 批次机制退役。冒烟引擎检查更新为 11 项。
- **权限映射施工**(docs/05 拍板版):Supabase `role_meta_permissions`(17 key 照搬系统 2 × edit/view/none,RLS 同 role_permissions);默认值 Admin 全 edit、**PE=PO**(rotation/sop edit + 其余 view + tokens/users/action-logs none)、Team 角色分析 view 其余 none;Roles 抽屉新增「Meta 权限」区(MISRes.roleMetaSection);导航 none 整页隐藏(misApplyMetaNav)+ 全部 Meta 写入口 per-key 拦截(misMetaWritable(key),与 allowMetaWrite 总闸叠加);metaApi live 请求带 `X-MIS-User` 头。**patch 0004**(系统 2 侧,tsc+build 双过):action_logs.details 记 misOperator(格式校验、FK 不动)+ CORS 放行该头——审计对人,依赖 0001 先应用。
- **拆文件方案 A 落地**(docs/04):内联 JS 拆成 `src/01-core…05-budget-boot.js` 五块 + `index.template.html`,`tools/build.js` 零依赖拼接;**产物与手工版逐字节一致**(仅 5 行 banner 注释);index.html 转为构建产物(头部有 GENERATED 标识),冒烟/gen_demo/发版流程零改动。**今后改动落 src/,改完 `node tools/build.js` 再冒烟。**
- baselines 按 V 决定收口(v80.1):REG 用 BO 自带 reg_count 月化计算;不设并行观察期,BO live 后直接切。
- 验证:35 视图 + 交互 + 11 项引擎检查零报错(index+demo),每个 stage 各跑一轮。

## [v80] — 2026-08-12 · 三份设计文档 + baselines 休眠实现 + 线 B 两个 patch

- **三份设计文档等 V 拍板**(MIS_integration/docs/):04 拆文件与构建方案(推荐零依赖拼接构建);05 权限映射设计(role_meta_permissions 表 + Roles 抽屉 Meta 区 + live 桥接与 X-MIS-User 审计头);06 baselines 替换设计(闭环同源公式表 + 切换/下线机制;REG 需 D 节补 reg_count)。
- **`mis-baselines.js` 休眠实现**:近 4 完整周 spending×BO 聚合出 FDC/FDAMT/AFDA(+CPA),`MIS_META.useLiveBaselines`(默认 false)开启后逐指标覆盖 RPC 基线、缺口保留 —— BO live 前不建议开。
- **线 B patch(系统 2 侧,tsc+build 双过)**:0002 S1 审计脱敏(serializeForLog 对 token/appSecret/passwordHash 截前 8 位;附存量清洗 SQL 带 dry-run)、0003 B1/R1/R3 加固(Disable 清 role;递补只取 ACTIVE;轮转幂等拦截)。变更记录已按那边规范先行。发现:交接包代码比 06 手册新,R2 已修,patch 只补真实残留。
- 交接文档翻新:`交接状态-2026-08-12.md`(取代 08-11 版)+ CLAUDE.md 进度快照;cPanel 发版包更新为 **v80 版 10 文件**(PI/release/)。
- 验证:35 视图 + 交互 + 9 项引擎检查零报错(index+demo)。

## [v79] — 2026-08-11 · 字典短码显示 + Our Ads 改名 + live 只读闸门 + 引擎回归检查

- **Dictionary 显示广告名短码**:Format / Ad Setting 词条的 code 下方显示「短码 IM/VD/…」(命名契约可见化;数据 v75 已落库)。
- **Ad Gallery 改名 Our Ads**(防混淆,V 前述认可):导航与页头改名,副标题注明"竞品素材在 CI → Ads Library"。
- **live 只读总闸门**(`MIS_META.allowMetaWrite`,默认 false):全部 14 个 Meta 侧写操作入口(资源 CRUD/CAPI 开关/FB 号/品牌关联/共享/轮转执行/SOP/Meta 用户)统一过闸——mock 随便演练;live 下未开闸一律拦截并提示"P1 token 只读"。P2 开写 = 改一个布尔。
- **命名引擎回归检查固化进冒烟**(engine@checks,9 项):生成/retired 禁发/市场校验/新旧式解析/脏名拒绝/三层归因逐层验证,今后每次冒烟自动跑。
- 验证:35 视图 + 7 项交互 + 9 项引擎检查全过,零报错(index+demo)。

## [v78] — 2026-08-11 · 实体连接 L1–L6 + 三层归因(过渡期机制正式落地)

- **三层归因引擎**(MISNaming.resolveCreative,闭环/Spending/Ad Gallery 共用):①严格 ref 匹配(新广告)→ ②素材登记 ads_code 整串精确匹配(旧 ongoing 广告,登记制)→ ③宽松只归品牌 → 未归因。闭环页未归因清单区分「已归品牌(去素材登记此名即可归因)」与「完全未归(命名不规范)」——过渡期的工作清单。存量 23 条已登记的 6 段旧式 ads_code 由第 2 层直接覆盖(核实后零回填、零风险)。
- **L1 品牌全景**:Meta Brands 详情页新增 4 个面板——「MIS 决策」(进行中测试/素材数/当月预算,读 MIS 真数据,可跳 Hypotheses 带筛选)、「近 30 天花费」(spending 按品牌归因过滤 + top 广告)、「命名契约」(short code/可投市场/生命周期)、CAPI Events 保留。
- **L2 全局品牌可点**:Hypotheses 列表、Budget 行、Monthly Overview 块头的品牌名 → goBrand() 品牌全景。**L3** Health 网格品牌列同样可点。
- **L4 花费↔假设互通**:Spending 行与 Ad Gallery 卡片解析出素材后挂「🧪 假设号」徽章,点击 goHyp() 直达假设抽屉。
- **L5 闭环页资产健康**:选定品牌后显示其 MAIN Pixel 状态徽章(非 ACTIVE 红字提醒"先查 Health")+ 品牌全景入口。
- **L6 轮转影响面**:选中要封的 BM 即时显示"影响哪些品牌 + 这些品牌在 MIS 有 N 个进行中的测试"。
- 修 mock 生成器:登记名素材(ref=null)不再生成自己的花费行(此前带出 _null 垃圾名);17WINKH 的 mock 广告名改用正确缩写 WIKH。
- 验证:35 视图冒烟零报错;定向实测:登记名行进闭环表、未归因清单 2 条语义正确、品牌全景 7 个 tab、Spending/Gallery 🧪 徽章、轮转影响面(4 品牌 6 测试)。

## [v77 + 后端] — 2026-08-11 · Users 统一 + Activity Log 合并 + 命名尾巴收官

- **两套 Users 统一为一页**(V 定):Administration → Users 现在 = MIS 用户表 + 「系统 2 账号映射」区——每个 MIS 用户可挂一个系统 2 账号(映射存新表 `meta_user_map`,Supabase 迁移 create_meta_user_map),行内直接看/编辑该账号的 Meta 权限(权限矩阵弹窗保留),未映射的系统 2 账号列在下方;「Users (Meta)」独立页退役。一人一个身份,审计可对人。
- **Activity Log 合并为一张流水**(V 定):不再分 MIS/Meta 两个 tab——两边记录归一化(时间/来源/用户/动作/对象/详情)后按时间排序合成一张表,带来源筛选和搜索;原生 renderAudit 委托给合并渲染器,logAction 实时刷新的行为保留。
- **换版投放名(衍生版)**:「编辑这版」弹窗(非草稿)显示本版投放名 = 基码 + V{版本号},一键复制——基码优先用素材现有 ads code(严格新式),否则现场生成。
- **retired 品牌「已整合」标记**(方案 A 展示层):Spending 行的广告名若解析出整合前品牌,行内加「已整合」徽章,历史数据留在旧名下;mock 补一条 SB99 历史行演示。
- 验证:35 视图 + 6 项交互抽查(合并审计含 Source 列 / 统一 Users 映射表 / Rotation Logs / 导航 / Brands 详情 / 图表)冒烟零报错(index+demo)。

## [v76 + 后端] — 2026-08-11 · 表单接主数据 + 市场词汇统一 + 正式发号

- **Hypothesis 表单接品牌主数据**:新增「市场」下拉(= 该品牌可投市场:INZ9 出 MY/SG,其余锁 USC)与「广告目标 Ad Setting」下拉(读字典 Ad Setting tab,默认 Sales);品牌×市场关系登录后由 brand_aliases 同步(refreshMktBrands),离线回落常量。市场不再从品牌硬推(旧逻辑 INZ9→MY、其余→KH 删除)。
- **市场词汇统一 USC/MY/SG**:存量 50 条 market='KH' 已迁移为 'USC'(迁移 hypotheses_market_kh_to_usc,迁后 USC 50 / MY 13 / KH 0);读侧保留 KH→USC 归一兜底(防旧版本页面残写);筛选/月计划/预算的品牌清单改走 allMktBrands()。
- **正式发号上线**:「＋ 加素材」(tmEnsureRows)时每条新素材自动领 ref code(市场前缀+假设批次+流水)写入 creatives.ref_code;假设批次首次分配时回写 hypotheses.ref_batch;「⚙ 生成」优先用已领的正式 ref(存量素材才临时发号),setting 段取假设所选 Ad Setting。唯一性由 ref_code 唯一索引兜底。
- demo 字典快照补 Ad Setting 6 行;hf-market/hf-setting 不加 "— unselected —" 空选项。
- 验证:36 视图冒烟零报错(index+demo);定向测试:INZ9→[MY,SG]、OK188KH→[USC]、存量假设显示 USC、officialRefs 续批/新批正确;库上 market 分布校验。

## [v75 + 后端] — 2026-08-11 · 命名引擎第 2 期:Supabase 落库(前 3 项)

- **Supabase 三个迁移已执行**(项目 bfukphakofrjalsqteda,校验通过):
  1. `create_brand_aliases`:命名契约登记表 15 行(4 现役含 markets + 11 retired 只解析不生成);RLS 开启,authenticated 只读。
  2. `dict_short_code_and_ad_setting`:dict_entries 加 `short_code` 列,Format 4 项填码(IM/VD/CR/DC),新增 **Ad Setting** tab 6 项(SALES/TRSA 默认…APP_PROMO/APPP)——字典页自动出现新 tab。
  3. `naming_columns_hypotheses_creatives`:hypotheses 加 `ad_setting`(默认 SALES,63 条存量已回填)与 `ref_batch`;creatives 加 `ref_code`(唯一索引,129 条待正式发号)。
- **mis-naming.js 接库**:登录后自动从 brand_aliases / dict_entries 同步对照表(库是权威),mock/离线自动回落到文件内常量;「⚙ 生成」前强制同步一次。
- **第 4 项(market KH→USC 迁移,50 条)暂缓**:该迁移必须与前端 market 词汇改造(MKT_BRANDS/筛选/表单)同版落地,否则 Hypotheses 页筛选会错位——排入表单改造批次一起做。引擎已把 KH 作为 USC 的 legacy 别名处理,期间零功能损失。
- 简化:原计划的 creatives.generated_ad_name 列不加 —— ads_code 本来就是广告全名字段,不重复。
- 验证:36 视图冒烟零报错(mock 回落路径);库上 SELECT 校验(15/4/6/4/63/129)。

## [v74] — 2026-08-11 · 新页面表格对齐修复(V 报)

- **根因**:MIS 的表格样式挂在 `thead th` 选择器上,v70/v71 新页面的表格没包 `<thead>`,表头全部落回浏览器默认样式(居中、无内边距),与左对齐的内容错位。
- **修法**:mis-resources.js 注入一条覆盖全部新视图(perf-*/as-health/mm-*/an-*/audit Meta tab)的 th/td 规则,与原生 `thead th` 完全同款(左对齐、大写小字号、灰底、内边距);数字列的行内 right 对齐不受影响。
- 验证:36 视图冒烟零报错;Overview / Brands 等截图目检对齐。

## [v73] — 2026-08-11 · 广告命名引擎(素材实体连接·第 1 期)

- **新文件 `mis-naming.js`**:命名契约 `<market>_<brand>_<setting>_<format>_<ref>` 的生成/解析/发号引擎(全部对照表 V 已逐项确认):
  - 市场:MY→MYR、SG→SGD、USC→USC(MIS 存量 'KH' 作 USC 的 legacy 别名,第 2 期数据迁移);
  - 品牌缩写 15 行照系统 2 归因 CASE 表,**现役 4 个可生成,11 个 retired 只解析历史永不发新码**(方案 A:历史留旧名);品牌×可投市场校验(INZ9=MY/SG,其余=USC);
  - Ad Setting 6 码(TRSA=Sales 默认/AWAR/TRFC/ENGA/LEAD/APPP);Format 与 MIS 字典 1:1(IM/VD/CR/DC);
  - 发号规则:`<市场2字母><假设批次2位><素材流水2位>`,同假设共享前 4 位,衍生版 V 后缀;
  - 解析双模式:严格(新式 5 段)+ 宽松(存量旧式,同 CASE 表语义),解析失败显式返回。
- **Creative 表单接生成器**:Setup 表单的 Ads Code 输入框旁加「⚙ 生成」按钮——按素材所属 hypothesis 的品牌/市场 + 素材 Format 自动拼全名填入(预览发号;正式发号与 Ad Setting 选择待第 2 期加列)。结果存现有 ads_code 字段,零库改动。
- **未归因告警**:闭环报表页显式列出"广告名无法归因到素材"的条目与被丢花费(生产 27.7% 广告因命名不规范在报表隐形的问题,从此可见);Spending 页加"本页命名不规范行"计数。mock 混入 2 条照生产形态的脏名行供演示。
- 修:引擎访问 MIS 顶层 `let` 全局(creatives/hypos)不能走 window,改词法全局读取。
- 验证:命名引擎对 06 手册全部真实广告名(新式/旧式/脏名/retired 品牌)单元测试通过;36 视图冒烟零报错;demo 实测生成 `USC_OK18_TRSA_VD_KH0101`。

## [v72] — 2026-08-11 · 页面收编 + 导航合组收起 + Creative 图片修复 + 预算月份提前

- **页面收编三处**(V 定):①Asset Status 并入 Meta Overview(补 Ad Accounts / Apps 两个 KPI,独立页退役);②Rotation Log 并入 Rotation 页作第三个 **Logs** tab(执行与流水同页,退役独立页);③Action Logs (Meta) 并入 Administration → Activity Log,变 **MIS / Meta 双 tab**(两边 schema 不同各自保留原列与筛选;Meta 审计随之收口为 admin 可见)。
- **导航合组 + 默认收起**(V 定):6 组 —— CI / Planning / Performance / **Meta Assets**(Overview·Health·Rotation·SOP + 7 个资产页,原 Assets/Meta Config/Meta Ops 三组合一)/ Meta Analytics / Administration(Users (Meta) 移入此组)。打开 MIS 时全部组默认收起,切视图自动展开所在组;总入口 40→37。
- **修 Creative 图片不显示**(V 报):上传的图存 versions[].imgSrc,抽屉正常但列表格子只画色块从不读图。素材列表与假设抽屉改用 thumbBox(最新版 imgSrc),有图显图、无图回退色块(新增 crImgOf())。
- **预算月份提前生成**(V 定 15 号):月份下拉每月 **15 号起出现下月并默认选中**(此前新月份只在日历翻月才出现,预算链无法提前走),会话内手动选过的月份不被覆盖。
- 验证:36 视图 + 5 项交互抽查(Rotation Logs tab / Activity Log Meta tab / 导航初始只开 1 组 / Brands 详情 / 图表 SVG)无头冒烟零报错。

## [v71] — 2026-08-11 · 系统 2 全页面搬家(16 个新视图,mock 模式)

- **系统 2(Meta Ads 统一管理)剩余页面全部 1:1 复刻进 MIS**(V 点单:"把他原有的页面和 UI 以我 coding 的方式加进来")。对照源码逐页搬,三个新导航组:
  - **Meta Config**(7 页):Brands / Business Managers / Pixels / Ad Accounts / Developer Apps / Tokens / Pixel Shares —— 配置驱动的通用资源引擎(列表+筛选+分页+新建/编辑弹窗+Disable 软删)+ 详情子视图(Basic Info + 关联 tabs + 特殊面板:CAPI 事件开关、BM 的 FB 个人号 1+2、广告账户品牌关联);Pixel Shares 为品牌 MAIN pixel × 广告账户的三态矩阵(Share / Revoke / Re-share)。
  - **Meta Ops**(5 页):Overview(系统 2 首页仪表盘)/ Rotation(BM 轮转 + Pixel 轮转执行,mock 在内存演练手册 §5 完整语义:封禁清 role → 递补 → 写 rotation_log → 生成 SOP 实例并回链)/ SOP Tasks(分组进度 + 步骤 Complete/Skip + 模板管理,模板文案照 sop-seeds.ts 原文,补齐原版下拉缺的 3 类 trigger)/ Users (Meta)(权限矩阵 + Superadmin)/ Action Logs (Meta)(审计流水,mock 写操作实时追加)。
  - **Meta Analytics**(4 页):Account Overview / Ad Gallery / Brand Comparison / Asset Lifecycle;内置轻量 SVG line/bar 图表(无外部依赖,配色照系统 2 chart-cards)。
- **既有 Health 视图升级到原版全貌**:补 3 张 KPI 卡、品牌×槽位网格从 pixel-only 扩为 BM/Pixel/Token 三行、日志加 entity_type / result 筛选。
- **修正两处 v70 mock 与 06 手册的偏差**(铁律 2):health `checkResult` 枚举 PASSED→**OK**;ad-accounts 简化的 `brands` 数组改为手册原形状 **`brandLinks`**(含 brand 对象)+ `sourceBm`。
- **架构**:新代码全在 4 个新文件 —— `mis-meta-admin-mock.js`(mock 扩展:CRUD 写操作/子接口/轮转/SOP/users/action-logs/analytics,响应形状严格照 06 手册,写操作落内存并联动审计)、`mis-resources.js`(资源引擎 + Config/System 页)、`mis-operations.js`(Dashboard/Rotation/SOP/审计页)、`mis-analytics.js`(分析 4 页 + SVG 图表)。`index.html` 只加 3 个导航组、16 个空挂载 section、4 个 script 标签;`mis-meta-api.js` 加 mock 扩展钩子并补齐基础实体的手册形状。live 切换仍只改 `MIS_META` 三行,所有新页面同一开关。
- 发版方式:v71 起 **8 文件**一起上传 cPanel(index.html + 7 个 mis-*.js)。
- 验证:39/39 视图无头冒烟零报错(18 旧 + 5 v70 + 16 新,含 Brands 详情 tabs 与图表 SVG 渲染两项交互抽查);本环境本次可安装 playwright,`tools/smoke-test.js` 升级为全视图覆盖并参数化路径。
- 说明:系统 2 的 login / 403 页不搬(MIS 有自己的登录);Spending Report 已在 v70 作为 Performance → Spending 搬入,不重复。

## [v70] — 2026-08-11 · Performance + Assets 五视图(系统 2 融合第一步)

- **新增两组共 5 个视图**:Performance(Closed-Loop Report 闭环报表 / Spending 花费明细)与 Assets(Health 账户资产健康 / Rotation Log 换绑记录 / Asset Status 资产状态)。数据经 `metaApi()` 走系统 2(Meta Ads Unified Management)只读接口,**当前为 mock 模式**——接口形状严格按系统 2 `06-API接口手册`,等 Jayden 部署 CORS+token patch 后改 `mis-meta-api.js` 三行即切 live。
- **架构**:新代码全部在三个新文件 `mis-meta-api.js`(配置/请求/mock)、`mis-performance.js`、`mis-assets.js`;`index.html` 只加导航组、5 个空挂载 `<section>` 和 3 个 `<script>` 标签(对 v69 纯增量,零改动旧代码)。模块经 `MIS_MODULES.register()` 包装 `go()` 懒加载。
- **发版方式变更**:从单文件改为 4 文件一起上传 cPanel(index.html + 3 个 mis-*.js)。
- 验证:22/22 视图无头冒烟零报错(17 旧 + 5 新);工作区自带 playwright 冒烟脚本因环境无 playwright 未跑,用 chromium 无头等效替代。
- 交接资料归档在仓库 `MIS_integration/`(背景决策/分阶段方案/给 Jayden 的清单/P2 映射表/patch)。

## [v69] — 2026-08-11 · 新登录页(V 设计)

- **登录门整体替换**为 V 的新设计:暗色 hero 场景 + 6 只吉祥物跟随鼠标 3D 转头 + 眼球高光点动效,表单(Username/Password/显隐密码/Sign In/反馈条)。
- **体积优化**:8 张内嵌 PNG 转 WebP(hero q82,头像 q90),1665KB → 127KB,整页 408KB(原稿 2.28MB);hero 图里烙死的 "Welcome back" 文字用地板纹理擦除(否则与 h1 重影)。
- **接线**:`doLogin()` 改读新表单(id username/password),错误/状态走 `#feedback`;表单 submit + Enter 均触发;登录逻辑(Supabase Auth/profile 校验/audit)不变。动效在门隐藏后停止渲染。
- **隔离**:新页 CSS 全部 `#loginGate` 前缀 + 变量落地,不污染仪表盘样式;旧 lg* 样式/lgKey 清除。
- 验证:17 视图无头冒烟零报错 + 登录门渲染 ✓。

## [后端] — 2026-08-10 · 提醒管道大修 + 「发送计划」三连催

- **修复 Daily Reminders 全量丢失 bug**:n8n「MIS Daily Reminders」的 Split Messages 只读第一个 item,导致上线以来所有每日提醒(含 7/20 的 4 条 1st Reminder)一条未发。修复后 #test-test 实测 24 条全部送达,已恢复正式频道路由。
- 7/26–31 工作流因 n8n 配额耗尽未跑(吞掉 7/30 的 3rd Reminder);8/1 配额重置自愈。**月底配额复发风险待处理。**
- **`mis_reminders` 新增「发送计划」三连催**(V 定):每月 25/27/30 号,下月计划还没「确认发送」的品牌 @mkt 负责人(1st/2nd/Final Reminder);原 30 号单发的 3rd Reminder 升级为此系列。
- **预算催办改「瓶颈催办制」**(V 定,同日第二版):废除 20 号/25 号各催一次的旧制,改为 **20/23/26/29 号四连催**——每品牌只催"当前卡住的那一步"(申请没填 @mkt → 核批没填 @usc → 待决策 @zq),做完自动消失。另加**待决策超 48 小时**不绑日期的每日兜底催(@zq)。短月(2 月)的 29/30 号档位自动落到当月最后一天。
- 澄清:此前怀疑月度分支缺失是误判(执行记录被截断);函数原逻辑正确。

> 版本纪律(新):**当前版本永远 = `PI/index.html`**;每次改动前先快照旧版到 `PI/versions/index_vN.html`,改完写一条 changelog。
> 不再用"工作目录里散落多个 index_vN"的旧做法 —— 那是之前版本混乱的根源。

## 基线血缘(2026-06-25 还原)

通过 md5 / 行数比对确认,历史是一条干净直线,无分叉:

```
v5(1906行) → v6(1906行) → v7(1919行,=v7_1 同一份) → v8(1962行,=v8_1 同一份) → v9(2002行) ← 当前基线
```

- `index_v7_1.html` 与 `index_v7.html` 字节相同;`index_v8_1.html` 与 `index_v8.html` 字节相同 —— `_1` 仅为重复另存的副本,非分叉版本。
- 历史导出文件仍留在 `~/Downloads/`(v5–v9),未改动;可随时自行清理。

## [v68] — 2026-07-08 · Creatives 列表:删 Spend/FDC/CPA,补 Offer/Game Type

- **删 Spend / FDC / CPA 三列**(V 定):三列常年"—",孤立数字看不出效果画面;效果分析归之后的专业分析页。数据链路不受影响(周花费录入在素材抽屉、Budget 已投放/每日告警都读库)。
- **补 Offer / Game Type 两列**:五个维度在列表全部有列;🧪 标记与变体名统一标在对应列内,v67 的"挂 hypothesis code 下面"特例逻辑(crHypExtra)删除。
- 表格净减一列;空态 colspan 12→10。

## [v67] — 2026-07-08 · Creatives 列表 🧪 在测维度标记

- 每条素材行上,**在测的维度前加 🧪**(Format/Hook/Visual Style 列内直接标);测 Offer / Game Type(列表无此列)时在假设编号下方显示「🧪 Offer · 变体名」。一眼看出每条素材这次测什么。
- 修显示错位:此前 Offer/Game Type 的变体名错挂在 Visual Style 列下,现跟随 🧪 标记显示在正确位置。
- 清理:删除 V 测试产生的 HYP-062-V2/V3/V4(库内,created_by=vvv)。
- 备注:V 反馈 v65 排序在线上未生效;经真实数据模拟排序逻辑正确,判断为线上文件未更新/缓存,本版文件重新发放上传。

## [v66 — 已撤销,未上线] — 2026-07-08 · Variant 的 Format 例外

- 曾做:Format 取值不同时免填 Variant。**V 复议后撤销**:Format 的 Variant 也有用(时长 15s/30s、配色等),规则回到 v65「五个维度一视同仁,恒必填」。此版从未上传 cPanel,`index.html` 已还原为 v65。

## [v65] — 2026-07-08 · Variant 恒必填(含交叉测) + Creatives 分组排序 + Monthly 默认当月

- **Variant 改恒显示、必填**(V 定):在测维度每条素材都填"具体是什么"——取值相同=区分器(互不相同才放行);取值不同=内容备注(可相同);列表一眼可读。取值改变时只清本行本维度的旧 Variant。
- **交叉测放开 Variant**:两个在测维度都显示;裁判 2×2 用有效值(取值+Variant)校验,**同一取值的素材 Variant 必须一致**,否则被当第 3 个值标红(用户提出的"同值手动填一样"模型,自动提示保证好填)。
- **Creatives 列表分组排序**:同一假设的素材永远连在一起 —— 组间按该假设最新素材倒序,组内按 V 序号正序(此前全局按创建时间倒序,同假设分批加的素材会被打散)。
- **Monthly Overview 默认月份 = 当前月**(此前取月份列表第一项 = 排期最远的月份,出现默认停在 8 月)。
- 注意:存量草稿假设的在测维度若还没填 Variant,红条会提示补填后才能 Save(符合"全部都要填"的新规)。

## [v64] — 2026-07-08 · Variant 框只在取值全同时出现 + 表头英文

- **修 bug**:在测维度取值改成互不相同后,变体输入框现在会消失,且该维度的旧变体值自动清除(内存+库),不再残留"Test Test2"这类脏数据(`tmCellChange` 加取值一致性检查)。
- 变体框只在「单维度测试 + 各行取值相同」时渲染 —— 取值不同=正常取值测试,再给变体框等于诱导塞进第二个变量,反而弄脏测试。
- 表头统一英文:素材→Asset、视觉风格→Visual Style、游戏类型→Game Type(`MATRIX_DIMS` 标签,勾选区/锁定区同步);「变体名(可选)」→「Variant *」(去括号;因只剩必填场景,恒带 *)。

## [v63] — 2026-07-08 · 变体输入框 UI 还原 preview 样式

- 「变体名」输入框加紫色虚线容器 + 标签(`变体名 *`/`(可选)`)+ 占位示例;必填未填时整框转红。V 对照 preview 提出,纯样式,无逻辑变动。

## [v62] — 2026-07-08 · 维度内「变体标注」+ 字典清理

**根因**:团队想测「同一取值下的不同变体」(同风格不同游戏/不同名人),5 维模型表达不了,裁判判 nodiff 拦下 → 被迫往 Visual Style 字典塞游戏名/人名假词条(Joey 6 个 + Bryan 3 个)。

- **变体标注**:单维度测试时,在测列每行多一个「变体名」输入框;裁判有效值 = 取值+变体,取值全同时变体必填且互不相同(`checkHypoConsistency` 加 `variantGap`)。红条 nodiff 文案加"修法 B"指引。四条规矩:①仅单维度可用 ②只挂在测维度(取消勾选自动清除) ③取值+变体合看不重复 ④字典不再收人名/游戏名。
- **防写乱两道闸**:输入框 datalist 提示同维度+同取值下已用过的变体名;保存时 `tmNormVariant` —— 忽略大小写与已有变体相同则采用已有写法,否则 Title Case(词首字母大写,JILI 等全大写保留)+ 空格归一,改写时 toast 提示。
- **数据**:`creatives` 加 `variants jsonb`;新函数 `tmVariantChange/tmNormVariant/tmTitleCase/crVar`;Creatives 列表和锁定视图显示 `取值 · 变体` 紫色小字。
- **迁移**:17 条素材、7 个假设(全部草稿)——在测 visual_style 的(HYP-015/027/041/054/055)迁为 `Deepfake`/`game_screenshot` + 变体名;未勾维度的(HYP-028)人名进素材名称;HYP-037/056 本就用泛 Deepfake 不动;HYP-055-V1 留空变体由红条引导补填。
- **字典**:删除 9 个人名/游戏名假词条(零引用后删,audit_log 留痕);保留 `Deepfake` 并把说明改为「AI 名人/换脸(具体人物写在素材的变体名)」。Visual Style 回到 8 个粗粒度值。
- 验证:node --check ✓;无头 17 视图零 pageerror ✓;裁判 6 用例(gap/clean/重复变体/缺变体/取值差异/交叉测忽略变体)✓;归一 5 用例 ✓;demo 重生成。

## [v61] — 2026-07-08 · Slack 通知正式上线(格式定稿)

- **链路**:dashboard → n8n「MIS Slack Notify」(webhook, 格式化+按品牌分频道)→ 原生 Slack 节点直发(OAuth,以 V 账号身份);「MIS Daily Reminders」每天 09:00 跑。Make 中转已删除。
- **频道**:USC(OK188/17WIN/SBKH)→ #ops-marketing-usc-mis;INZ9 → #ops-marketing-inz9-mis。
- **格式按 V 定稿**:计划确认 = 标题✅/预算/空行/按 Stage 分组(斜体标题,组间空行)/空行/CC 一排;预算待决/已定 = 标题+全角括号月份/分行明细/@人;提醒类 = 「标题 @人」换行内容;月度节奏叫 1st/2nd/3rd Reminder(20/25/30 号);金额千分位、逗号全角。
- @人 用 <@ID>(经 bot API 是真 mention);Slack ID 已核实 6 人。
- 全部经 #test-test 实测验收通过。发送人身份暂用 V 账号(要换 bot 时建 app 拿 xoxb token 即可切)。

## [v60] — 2026-07-07 · Slack 通知链路接通(Phase B)

- **前端**:`misNotify()` → POST 到 adam mkt n8n `webhook/mis-notify`;三个触发点接上 —— Monthly Overview「确认发送」(整月计划 point-form)、Budget 升级「待决策」(@决策人)、「已定」(cc mkt+usc)。demo 模式不发。
- **n8n(adam mkt,与 ohmeidaa 的 CI 各跑各的,无冲突)**:
  - `MIS Slack Notify`(已激活):webhook 收事件 → 格式化 + @人(**按名字 tag,不用 ID**)→ POST Slack incoming webhook(feed-ci)。
  - `MIS Daily Reminders`(草稿,等贴 URL 后激活):每天 09:00 调 `mis_reminders` RPC → 逐条转发。
- **DB**:`mis_reminders(p_secret)` RPC(密钥存 app_config)—— 每日:测试到期未判定 @owner、该上线未上线 @owner、效果告警(周花费>$50 且 FDC=0);月度节奏 **20 号**催 mkt 填下月申请 → **25 号**催 usc 核批 → **30 号**催确认发送;周一汇总(AI 想法/超期想法/待审候选)。
- Slack ID 全部查实(Joey/Bryan/Anna/JK/WenJie/ZQ);正式频道 #dept-crm-marketing-feed-ci,测试消息已发 #test-test。
- **剩最后一步(用户)**:把 feed-ci 的 incoming webhook URL 贴进「MIS Slack Notify」的 Send to Slack 节点,然后激活「MIS Daily Reminders」。

## [v59] — 2026-07-07 · Monthly Plan 改名 Monthly Overview + 品牌筛选

- 页面/导航改名 **Monthly Overview**。
- 顶部加 **Brand 筛选**(All Brands / 四品牌,与其它页筛选下拉同风格),卡片与就绪度统计随筛选联动。

## [v58] — 2026-07-07 · Monthly Plan:按品牌各自确认发送 + 布局微调

- **确认改为按品牌、由该品牌 Marketing 负责人自己发**(线下和 V 审批后):每张品牌卡自带「✔ 确认发送」按钮,只有该品牌的 mkt 负责人(bgAssign)或 Admin 可见可按;确认后卡头显示绿色「✔ 已确认 · 谁」;重发有提示。Joey 只能发 OK188/INZ9,Bryan 只能发 17WIN/SBKH(实测互相拦截)。
- `monthly_plans` 重建为 (month,brand) 主键,快照按品牌存。
- 去掉品牌卡的灰色负责人字段(mkt/usc/决策 一串)。
- 导航:Monthly Plan 移到 Creatives 之后。
- 验证:headless 权限矩阵实测(joey/bryan 互斥)通过。

## [v57] — 2026-07-07 · 新增 Monthly Plan 总览页 + 确认本月计划

- **新页面 Monthly Plan**(PI 组第一位):当月安排一页总览 —— 每品牌一卡:最终预算+状态+三方负责人;该月排期(按预计上线日归月)的假设列表(陈述/Stage/Schedule/素材数/Owner/状态,点行直达抽屉)。
- 顶部**就绪度体检条**:预算已定 x/4、排期假设数、已锁定 x/n、待处理 Issues 数。
- **「✔ 确认本月计划」**(决策人/Admin 可见):未就绪项先列出提醒;确认写 `monthly_plans`(month/confirmed_by/summary JSONB 快照)留痕,页面显示绿色已确认横幅;重复确认有提示。
- Slack 通知为 Phase B:确认时已把 summary 打包好,等 member id + 频道即接 n8n 发送。
- DB:`monthly_plans` 表 + RLS(读 authenticated,写 can_write('budget','edit'))。
- v56(同日):新建用户后 Budget Permission 下拉即时刷新;假设抽屉按钮上移一排、句子块占满宽;抽屉保存按钮统一描边。
- 验证:headless 18 页零报错;总览渲染(4 卡/体检条)、确认流程(横幅+落库)实测通过。

## [v55] — 2026-07-07 · 逻辑终审批准项:转主力 + 结束运行 + 周花费补记

- **判定成立 → 询问「转为主力运行?」**:确认后 mode 自动切主力,「主力运行」状态从此有真实入口。
- **「■ 结束运行」**:素材概览可直接结束进行中的运行段(不必开新段),可选同时把素材标记「已下线」;进行中判定收紧为「有 start 且无 end」。
- **「＋ 补记周花费」**:跑多周的运行每周补一笔(ISO 周 + 金额,同周重填覆盖),Budget「已投放」按周汇总从此精确;记录落 creatives.runs(phase='spend')。
- 验证:三条流程 headless 端到端实测通过;全页扫描零报错。

## [v54] — 2026-07-07 · 逻辑终审:接通三条状态机断头路

最后一轮逻辑 QA 发现:状态机有站点没轨道 —— 已锁定/测试中/已立项 三个状态此前**没有任何入口能到达**。接线:

- **锁定标签矩阵(Save)→ 假设状态自动「已锁定」**;解锁 → 回「待锁定」。
- **素材版本改「上线中」→ 所属假设(已锁定/待锁定)自动「测试中」**。
- **从想法「立假设」保存成功 → 想法状态自动「已立项」**(想法池的状态 pill 不再永远停在待评估)。
- 至此假设全生命周期 草稿→待锁定→已锁定→测试中→(判定)→已沉淀 每一步都有真实入口。
- 验证:node --check + headless 17 页零报错。

## [v53] — 2026-07-07 · 判定按钮样式统一 + 图片上传迁 Supabase Storage

- 判定按钮改 `btn ghost sm`,与抽屉里 Edit 等按钮统一。
- **图片上传正式迁 Storage**:`uploadImage()` 把压缩后的图传 `creatives` bucket(`pi/` 前缀,公链),versions 里只存 URL;上传失败自动回退 base64 不阻断保存;demo 模式跳过上传。Storage 加 authenticated 上传策略(仅 pi/ 路径);存量 base64 行 = 0,无需迁移。
- 验证:node --check + headless 17 页零报错。

## [v52] — 2026-07-07 · Budget 写入升级 RPC(服务端强制分工)

- 新建 SECURITY DEFINER RPC:`budget_save_cell / budget_decide / budget_reopen` —— 服务端校验:分工到人(mkt/usc/decider 对号)、金额/理由必填、已定锁定;绕过前端直打 API 也改不了别人的格子。
- `budgets` 表 RLS 收紧:insert/update 仅 admin,业务写入一律走 RPC(与用户管理同模式)。
- 前端 bgSaveCell/bgSaveDecision/bgReopen 切换 db.rpc;rpcErr 补错误码中文(NOT_ASSIGNED/NOT_DECIDER/REASON_REQUIRED/LOCKED)。
- demo mock 同步实现三个 RPC,演示照常可交互;headless 实测 RPC 流程写入成功。
- 图片迁 Storage 为第三部分剩余项,下一轮做(压缩止血已在 v50)。

## [v51] — 2026-07-07 · 判定 UI:测试闭环补上最后一步

- 假设抽屉(非已沉淀)新增**「判定」按钮** → 表单:结论(成立/不成立/无定论)+ 数据置信度(充分/勉强,勉强不计胜率)+ 学到了什么(必填)+ 下月约束。
- 保存写 `hypotheses.verdict` JSONB + 状态 → **已沉淀**,写审计;Results 页即时汇总出胜率。
- 权限:can('hypo','edit');防连点;headless 实测全流程(开表单→保存→状态变更→Results 出数)通过。

## [v50] — 2026-07-07 · 两道保险:上传图压缩 + Budget 写入冲突检测

- **上传图统一压缩**(`shrinkImage`):最长边 800px + JPEG 0.82,替换原来把原图 base64(可达数 MB)直接灌进 versions JSONB 的做法;<300KB 小图不动。ecImgPick/fvImgPick 两个入口都走压缩。图片迁 Supabase Storage 为后续正式方案,此为止血。
- **Budget 写入冲突检测**(`bgStale`):保存/决策前比对 DB 的 updated_at,发现别人刚改过 → 拦下、自动刷新、提示基于新值再改;写入同时更新 updated_at。Budget 改 RPC 为后续正式方案。
- 决定记录:Budget RPC / 图片迁 Storage / 全站并发锁 —— 内部 9 人工具风险可控,大手术单独排期,先上便宜保险(V 授权自行决定)。
- 验证:node --check + headless 17 页零报错。

## [v49] — 2026-07-07 · 大修:两轮 QA 后的三批修复(安全/数据正确性/功能)

双轮 QA(6 个审查代理逐页走查 + headless 全页扫描)共查出 60+ 问题,本版修掉 P0/P1 主体:

### 批 1 · 安全与权限
- esc() 增加单引号转义(关闭竞品抓取数据经 onclick 注入 JS 的面);全站补转义:想法/假设陈述/证据/判定/测试行/素材文案/运行记录/字典;周报 markdown 禁原生 HTML。
- 权限门补齐:标签矩阵全链(tmEditable 需 hypo|creative edit)、saveCreativeCopy/editCreativeCopy/toggleDict 补 can();bgCanEdit 接入 can('budget','edit')(Roles 矩阵 Budget 行从此真实生效);列表重渲染后重新 applyPerms。
- guard() 防连点(假设/想法/预算保存);加载器报错显性化;budgets 保存改 upsert 防重复行;登录态失效自动回登录门;applyChrome 空用户守卫。

### 批 2 · 数据正确性
- **编辑假设不再破坏数据**:mode/month/owner/val_from 保留原值;已锁定/测试中等状态不被按钮重置;capacity 无新结果时保留;锁指标品牌(指标未迁移)正常回填目标值/防守阈值。
- validateHypo 跳过 disabled 字段(SBKH 可以 Save 了);容量体检目标空 → 灰灯提示(不再 Infinity 假绿);capacity gray 渲染灰「—」。
- 月份筛选动态生成;Results 胜率读 verdict.res 精确匹配「成立」(修掉「不成立」算赢),conf=勉强不计。
- **Run 运行记录真正落库** + week(ISO)/spend 字段 + 表单加「本周花费」→ Budget 已投放自动汇总从此有真数。
- saveCreativeCopy 同步行 status/stc(素材状态不再冻结在待上线);草稿被拒补记拒因;补 cst-wait/rej/off 样式。
- Budget 状态机补「待申请」(USC 先填不再假已定);汇总使用率只计已定品牌。

### 批 3 · 功能修补 + 速效性能
- Creatives 筛选修复:品牌经所属假设匹配、假设下拉动态生成、加空态行、null 值兜底。
- 一致性引擎三处边判:2×2 需恰好 4 条(重复组合不再假 clean)、单维漏标报 nodiff、锁定维「有设有不设」报污染;tmTrimRows 删已打标签行前确认。
- Ads Library:drill 重置全部筛选;operator 横幅随筛选自愈;搜索防抖 250ms;渲染上限 300 条 +「加载更多」。
- 周报:period 为空不再整批合并只剩最新;周选择器保持当前选择。
- Watchlist Ad Status 双向包含匹配(关键词≠运营商全名也能亮灯)。
- 三处硬编码统计条(想法/假设/素材)改真数据;audit 只在 Activity Log 页可见时刷新(不再每操作全量查 200 行);字典禁止同 tab 重复 code。
- 死代码清理:bgSaveAmt/quickAddIdea/toggleAddForms/renderAdsReport 全家/editAdsCode/openVersionForm/openRunForm。

**本版未做(待拍板/外部依赖)**:判定 UI(新功能)、Slack 真发(等 member id)、Budget 写入改 RPC、图片迁 Storage、并发 updated_at 锁。
- 验证:每批 node --check + headless 17 页零报错;统计条/月份下拉/素材筛选/hypo 编辑回填实测正确。
- ⚠️ **需重新上传 index.html 到 cPanel 生效。**

## [v48] — 2026-07-07 · Ads Library:Game Type 下拉选项改英文

- 「All Game Types」下拉的选项从中文名(老虎机/真人/体育…)改为英文 code(slots / live_casino / sports / lottery / fishing / cockfight / unknown),与 Hooks / Styles 下拉风格一致。
- 表格里的 Game Type **pill 仍显示中文**(只改筛选下拉);筛选逻辑不变(值本来就是 code)。
- 验证:`node --check` 通过;headless 实测下拉选项全英文。

## [v47] — 2026-07-07 · 文案:Creatives「预计排期」→ Schedule + 去掉「(取自基础卡)」灰字

- Creatives 表头「预计排期」→ **Schedule**(与其它英文表头统一)。
- New Hypothesis 右侧 Capacity Check 周期回显去掉灰字说明:填了显示 `14 天`,未填显示 `—`(原「14 天(取自基础卡)」/「= 基础卡「测试周期」」)。
- 验证:`node --check` 通过。

## [v46] — 2026-07-07 · New Hypothesis:「测试周期」与 Capacity Check「周期」合一

- 问题:基础卡新加的「测试周期(天)」和右侧 Capacity Check 的「周期(天)」重复,同一个测试窗口填两遍还可能填不一致。
- 改法(按 V 方案):**留基础卡的「测试周期(天)」为唯一入口**;Capacity Check 删掉周期输入框,只留「日预算」,周期位置改为只读回显「N 天(取自基础卡)」,容量体检自动用基础卡的天数算(`capacity()` 改读 `hf-plan-days`)。
- 联动:`hf-plan-days` 输入即触发 `updateAll()` 重算容量;Save 必填校验从 `cc-days` 换成 `hf-plan-days`(测试周期);reset 同步。
- 附带收益:预计结束日(排期)与容量体检用的周期天然一致,不会再出现「排期 7 天、体检按 14 天算」的错位。
- 验证:`node --check` 通过;headless 交互实测——旧输入框已移除、回显「14 天(取自基础卡)」、清空后提示「请填日预算与测试周期(基础卡)」,联动正确。

## [v45] — 2026-07-07 · Budget Allocation 移到 PI 组第一位

- 左侧导航:Budget Allocation 从 Creatives 后移到 **Idea Pool 前**(PI 组第一项)。
- Roles & Permissions 权限矩阵同步:`PERM_SECTIONS` 里 Budget Allocation 移到 PI 组最前。
- 验证:`node --check` 通过;导航与矩阵顺序实测正确。

## [v44] — 2026-07-07 · 表头统一英文(Budget Allocation/Permission + Hypothesis)

- **Budget Allocation 表头全英文**(与其它页统一):品牌→Brand、Marketing 申请→Marketing Request、USC 核批→USC Approval、状态→Status、最终→Final、已投放→Spent、使用率→Utilization、历史→History。
- **Budget Permission 表头同步英文**:Brand / Marketing Owner (Request) / USC Owner (Approval) / Decider。
- **汇总条改双语**(与其它页 stat 风格一致):总申请 Requested / 总核批 Approved / 最终合计 Final / 已投放 Spent / 使用率 Utilization。
- **Hypothesis 表头精简**:`Hypothesis(改变 X)` → `Hypothesis`;`Metric · 基准 → 目标` → `Metric`。
- 表格内的中文内容(状态胶囊、按钮、理由等)不动 —— 只改表头/标签。
- 验证:`node --check` 通过;headless 实测表头渲染正确。

## [v43] — 2026-07-07 · 改名 Budget Allocation/Permission + 必填校验 + 全站胶囊标签对齐修复

- **「编辑」改回 ✏️**(填写按钮也回到 `✏️ 填写`)。
- **填写抽屉:金额 + 理由都必填** —— 任一为空直接拦下不保存(标签都标红「(必填)」)。
- **改名**:页面 `Budget` → **Budget Allocation**(导航 + 标题);Administration 的 `Budget 分工` → **Budget Permission**(导航 + 标题 + 相关提示文案)。
- **Budget Permission 下拉只显示人名**:去掉右边 `(username)` 括号(值仍存 username)。
- **全站胶囊标签对齐修复**:凡是整格作 label 的胶囊(Budget 状态 `.bgst`、Hypothesis 的 Stage `.pill`/Mode `.mode`/Market),胶囊自带左内距导致**文字比表头歪右 8–10px**。加 CSS `tbody td>.pill/.mode/.bgst:first-child{margin-left:-内距}` 抵消 —— headless 实测三处 表头文字x = 胶囊文字x 完全对齐。
- **Roles & Permissions 加回 budget 段**:`PERM_SECTIONS` 新增 `Budget Allocation`(add/edit/delete),权限矩阵可见可配;demo 种子同步(admin 全量、po/pe/USC add+edit,与生产库一致)。
- 验证:`node --check` 通过;headless 实测——对齐(3 处 x 相等)、改名、下拉去括号、必填标签、✏️ 恢复全部正常。

## [v42] — 2026-07-07 · Budget 去 emoji + 去掉「自动(核批≥申请)」说明

- **去掉全部装饰性 emoji**:状态 `✅已定/🟠待决策`→`已定/待决策`;编辑 `✏️`→「编辑」文字链;`✏️填写`→「填写」;`🕘`→「历史」;`⚖️决策`→「决策」;`🔓重开`→「重开」;理由/历史/决策抽屉里的 `💬` 一并去掉;Slack 文案去掉 `🟠/✅`。(演示版身份切换条的 🎭 保留——那只是 demo 辅助。)
- **去掉「自动(核批≥申请)」小字**:核批≥申请自动已定的行,最终列只显示金额,不再有那行说明。
- 说明:**SBKH 没有「编辑」链是因为它已决策=锁定(只读)**,需决策人/Admin 点「重开」才可改——这是有意的锁,不是 bug。
- 验证:`node --check` 通过;headless 实测——状态纯文字、budget 行内无任何 emoji、编辑/填写/历史/决策/重开 文字入口正常。

## [v41] — 2026-07-07 · Budget 决策:红底按钮 + 抽屉表单(与填写一致,原因必填)

- **⚖️ 决策按钮改红底白字**(原琥珀色)—— 更醒目、符合「需要拍板」的语义。
- **决策改抽屉表单**(原 prompt 弹窗)—— 与「填写」抽屉同风格:上方并排显示 Marketing 申请 / USC 核批(各带理由),下方填最终预算 +「决定原因(必填)」,确认按钮红底(`bgDecide` 开抽屉、`bgSaveDecision` 保存)。原因空则拦下。
- 验证:`node --check` 通过;headless 实测——红按钮、决策抽屉、四态渲染正常,无 pageerror。

## [v40] — 2026-07-07 · Budget:填写入口改抽屉表单 + 决策后可重开 + 分工 Admin 面板 + 建库

按团队反馈补齐:

- **填写入口显性化**:原先金额是内联输入、理由藏在失焦弹窗(不好找)。改成每格一个 **✏️ 填写/编辑** 按钮 → 打开抽屉,**金额 + 理由一起填**(`bgEditCell`/`bgSaveCell`)。核批 < 申请仍强制理由。
- **决策后可「🔓 重开」**(修团队反馈的"SBKH 谁都不能编辑"):已定=锁定是**有意**的(防事后乱改),但之前没给解锁口 → 现在决策人/Admin 在「最终」格有 **🔓 重开** 按钮,清除决定回到可编辑并留痕(`bgReopen`)。
- **分工 Admin 面板**(Administration → **Budget 分工**):每品牌三个下拉配 Marketing 负责人 / USC 负责人 / 决策人,仅 Admin 可改(`renderBgAssign`/`saveBgAssign`)。
- **建库(生产已就绪)**:
  - `budget_assignments`(brand PK + mkt_user/usc_user/decider_user)+ RLS(读 authenticated;写 is_admin);**已按分工种子写入**(决策人全 ZQ)。
  - `budgets`(全字段 + unique(month,brand))+ RLS **完全对齐现有 PI 表**:SELECT authenticated=true,写走 `can_write('budget', …)`。
  - `role_permissions` 新增 `budget` 段:admin(增改删)、po/pe/USC Team(增改)。DB 层按角色放行,前端再按「分工到人」细粒度 gate(与全系统一致的信任模型)。
- 验证:`node --check` 通过;headless 实测——✏️ 表单入口、🔓 重开、Budget 分工 12 个下拉、四态渲染全部正常,无 pageerror。
- **仅剩 Slack(Phase B)**:同频道 + @相关人,等你给各人 Slack member id 即接 n8n 真发。

## [v39] — 2026-07-07 · Budget 升级为完整流程:分工到人 + 决策仲裁 + 自动投放 + 留痕【预览版】

按团队确认的规则,把 Budget 从「一张表」升级成完整流程:

- **分工到人**(`budget_assignments`,兜底默认 `BG_DEFAULT_ASSIGN`):每个品牌指定 mkt 负责人 / usc 负责人 / 决策人。本期:决策人全 = ZQ;USC:OK188=Anna、17WIN=JK、SBKH=WJ、INZ9=空;MKT:OK188=Joey、17WIN/SBKH=Bryan、INZ9=Joey。
- **按人 gate 编辑**(`bgCanEdit`):只有被分工到 (品牌,侧) 的人或 Admin 能改对应格子;其余只读。
- **申请/核批各带理由 + 谁 + 时间**;**核批 < 申请 强制写原因**并自动升级状态。
- **状态机**(`bgStatus`):待填 → 待核批 → 🟠待决策(核批<申请)→ ✅已定。核批≥申请自动已定;不一致进「待决策」。
- **决策仲裁**(`bgDecide`):决策人/Admin 填最终金额 + 原因 → 已定并**锁定**(`bgLocked`,事后只有决策人能重开)。
- **已投放自动汇总**(`bgSpent` + `isoWeekMonthLabel`):按素材 run 的 spend、经所属假设的品牌、归到当月求和;使用率 = 已投放/最终。
- **留痕**:每步进 `audit_log`;点「🕘 历史」看该格完整时间线(申请→核批→[升级]→决策,金额/人/时间/理由)。
- **Slack 触发点**(`bgSlack`):进「待决策」通知决策人、「已定」通知双方;演示版用 toast 展示会发的内容,**真正发送(经 n8n + @人)为 Phase B,待 Slack user id**。
- 顶部汇总条:总申请/总核批/最终合计/已投放/使用率。**演示版身份切换条**(`bgRenderDemoBar`,仅 `window.__DEMO__`)可切 Joey/Anna/ZQ… 看各自能编辑哪些格。
- demo:seed 分工表 + 4 品牌覆盖四态(OK已定/17WIN待决策/SBKH已决策锁定/INZ9待核批)+ July 素材 run 供自动汇总(OK $17.5k / 17WIN $9.2k / SBKH $8.1k)。
- 验证:`node --check` 通过;headless 实测——四态、⚖️决策、自动投放三品牌数值、决策锁定只读、汇总条全部正确,无 pageerror。
- **待办(上线前)**:① 建 `budgets`(全字段)+ `budget_assignments` 表 + RLS ② Slack:同一频道 + @相关人(需要各人 Slack user id)③ 分工表 Admin 编辑面板。

## [v38] — 2026-07-07 · 新增 Budget 页(Marketing 申请 → USC 核批)【预览版,待确认设计】

- **新页面 `Budget`**(Planning Intelligence 组,Creatives 之后):每月各品牌预算表。
  - 粒度:**品牌 × 月**(OK188KH/17WINKH/SBKH/INZ9 各一行)。
  - 两栏两角色:`Marketing 申请`(PO/PE/Admin 可改)、`USC 核批`(USC Team/Admin 可改),`bgCan()` 按角色 gate;其余只读。
  - 自动列:差额(核批−申请)、已投放(先手填)、使用率(已投放/核批,>100 红/>85 黄)、状态(待 USC 核批/部分核批/已满足)。
  - 顶部月份选择器 + 汇总条(总申请/总核批/差额/已投放/使用率)。
  - 改动即时保存(`saveBudget` upsert by month+brand),写 `audit_log`。
- 前端:`loadBudgets`(带 try/catch,表不存在则空、不报错)、`renderBudget`、`bgCan/bgEntry/bgFillMonths/bgCell`;接入 `loadPIData` + `initApp`。
- demo:seed 6 条(Jul 覆盖四种状态 + Jun 历史),STORE 加 `budgets`。
- **DB 表 `budgets` 待用户确认设计后再建**(月/品牌/requested/allocated/spent/note + unique(month,brand) + RLS 允许 authenticated 写)。当前仅 demo(mock)可交互;正式库建表前 saveBudget 会优雅失败。
- 验证:`node --check` 通过;headless 实测——Budget 页四品牌四状态、汇总条、Admin 可编辑输入全部正常渲染,无 pageerror。
- ⚠️ 这是**预览版**,等确认页面设计 + 角色映射后再建 DB 表并上线。

## [v37] — 2026-07-07 · 文案微调:去掉表单浅灰提示 + 「测试 period」→「测试周期」

- 去掉 New Hypothesis 表单里两处浅灰提示文字(顾客阶段「← 打给漏斗哪一环」、预计上线日「← 点选日历」),标签更干净。
- 「测试 period(天)」改为「测试周期(天)」。
- 验证:`node --check` 通过。
- ⚠️ **需重新上传 `index.html` 到 cPanel 才在线上生效。**

## [v36] — 2026-07-07 · 微调:首列 idea/hyp 双行 + Stage 分色 + 日历框统一 + 字典标签同排

- **假设首列改双行**:`💡IDE-xxx` 在上、`HYP-xxx 陈述` 在下(`.hcell-idea` + `.hcell-main`),首列更窄省位。
- **Stage 分色**:5 个漏斗环节各一色(沿用系统色板)——拉新=蓝 / 激活=紫 / 留存=绿 / 复购转化=琥珀 / 唤回=红(`stageColor()`)。
- **日历框统一样式**:`input[type=date]` 之前没进输入框样式选择器,渲染成浏览器默认丑框;已加入 `select,input[type=text|number|date]` 统一规则(边框/圆角/内距/高度),现与其它输入框一致。
- **Dictionary 标签同排**:`.tabbtn` 内距 `16px→10px`、字号 `13→12.5`、加 `nowrap`;实测 1400px 内容宽下 15 个标签(含 Customer Stage)全部落在**同一行**,不再单独换到第二行。
- 验证:`node --check` 通过;headless 实测——首列双行、Stage 四色、标签单行(measure=1 row),无 pageerror。
- ⚠️ **需重新上传 `index.html` 到 cPanel 才在线上生效。**

## [v35] — 2026-07-07 · Hypothesis 表格:Stage 独立成列 + Create Date 双行 + 排期改日历选择

- **顾客阶段独立成列**:从假设首列的 pill 移出,新增独立 **Stage** 列(在 Create Date 之后),◑ 紫色 pill 居中显示,无则「—」。
- **移除首列的「测·维度」标签**:首列现在只保留 `💡IDE-xxx → HYP-xxx → 陈述` 一行,更干净。
- **Create Date 拆两行**:第一行日期、第二行时间(`toLocaleDateString` + `toLocaleTimeString`),列宽收窄,给 Stage 列腾位。
- **预计上线日改日历选择器**:`hf-plan-launch` 由文本输入改为 `<input type="date">`,点选日历;存 ISO(`YYYY-MM-DD`)。`parseMD()` 升级为同时解析 ISO 与旧「M/D」;`schedCell` 仍以 M/D 紧凑显示。demo 种子日期改 ISO。
- 表格列 10 → 11(空态 colspan 同步)。
- 验证:`node --check` 通过;headless 实测——首列无残留标签、Stage 列 6 条阶段 pill 正常、Create Date 双行、日历 input 就位、素材排期倒数四态仍正确,无 pageerror。
- ⚠️ **需重新上传 `index.html` 到 cPanel 才在线上生效。**

## [v34] — 2026-07-07 · 团队反馈微调:Hypothesis 排版重构 + 排期入口归位 hypothesis

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
