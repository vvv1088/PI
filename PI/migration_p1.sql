-- ============================================================
-- New Hypothesis 重构 · P1 schema 迁移
-- 在 Supabase「Competitor Intelligence」项目(bfukphakofrjalsqteda)
-- 的 SQL editor 执行。幂等(IF NOT EXISTS),可重复跑。
-- ⚠️ 必须在部署新 index.html 之前执行 —— 否则立假设保存会因
--    test_dim 列不存在而失败。
-- ============================================================

-- 1) hypotheses:本次测的维度(单变量声明,值见前端 TEST_DIMS)
alter table public.hypotheses
  add column if not exists test_dim text;

-- 2) creatives:补齐 7 维标签列(format / hook / visual_style 已有)
--    用于 Creative Setup 打标签 + P2 裁判一致性检查。
alter table public.creatives add column if not exists audience  text;  -- 人群
alter table public.creatives add column if not exists age       text;  -- 年龄段
alter table public.creatives add column if not exists game_type text;  -- 游戏类型
alter table public.creatives add column if not exists offer     text;  -- Offer 优惠

-- 说明:
-- · matrix(jsonb)列保留不动 —— 前端已停止读写,留作历史。
-- · hypotheses 的 persona/format/hook/visual_style/age_range/game_type/offer
--   旧列保留不动(历史行仍有值;新行不再写入)。
