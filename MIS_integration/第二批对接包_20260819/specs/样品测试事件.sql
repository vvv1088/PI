-- 样品测试事件:cdf_events 联调数据(供 Alden 消费端开发/联调)
-- 全部 is_test = true —— 正式轮询条件是 ticket_key is null AND is_test = false,
-- 所以这批样品不会被生产链路捡走;联调时 Alden 侧临时放开 is_test 过滤即可。
-- 前置:契约文档 v1 的 cdf_events 已建表。幂等:重复执行会插重复行,
-- 联调完统一 delete from cdf_events where is_test = true; 清场。

-- 1. new_hypo:新假设开测,带素材清单(常规主链路,有 hypo 有素材编号)
insert into cdf_events (event_kind, trigger_type, payload, is_test) values (
  'create', 'new_hypo',
  jsonb_build_object(
    'hypothesis_id', 'H-2608-01',
    'hypothesis_statement', 'INZ9 UGC 素材对新客 FD 成本优于官方设计',
    'brand', 'INZ9',
    'test_dim', 'visual_style',
    'plan_launch', '2026-08-25',
    'creatives', jsonb_build_array(
      jsonb_build_object('creative_code','AD-INZ9-201','format','VIDEO','hook','免费旋转','visual_style','UGC','variant','Handheld Selfie'),
      jsonb_build_object('creative_code','AD-INZ9-202','format','VIDEO','hook','免费旋转','visual_style','Official Design','variant','Studio Polish')
    ),
    'detected_at', '2026-08-19T08:00:00.000Z'
  ), true);

-- 2. disapproved:人工升级形态(无 hypo 孤票,带 ad_id/ad_name;Approver 按名册取 owner)
insert into cdf_events (event_kind, trigger_type, payload, is_test) values (
  'create', 'disapproved',
  jsonb_build_object(
    'ad_id', '120210000000000001',
    'ad_name', 'MY_INZ9_UGC_0812_v3',
    'brand', 'INZ9',
    'account_id', '1998765220809792',
    'rejection_category', 'GAMBLING_POLICY',
    'detected_at', '2026-08-19T06:30:00.000Z',
    'hypothesis_id', null,
    'creative_code', null
  ), true);

-- 3. scale_winner:测试胜出,放量需要补产同款素材
insert into cdf_events (event_kind, trigger_type, payload, is_test) values (
  'create', 'scale_winner',
  jsonb_build_object(
    'hypothesis_id', 'H-2608-03',
    'creative_code', 'AD-WIKH-042',
    'ref_code', 'KH0202',
    'brand', '17WINKH',
    'winning_dim', 'hook',
    'winning_value', '真人证言 · 大奖',
    'metrics', jsonb_build_object('spend', 347.48, 'fd', 31, 'cpa', 11.21, 'window', '2026-07-29~2026-08-11'),
    'ask', '同 hook 追加 3 个变体放量',
    'detected_at', '2026-08-19T02:00:00.000Z'
  ), true);

-- 4. underperform:在投素材跑输,需要替换素材
insert into cdf_events (event_kind, trigger_type, payload, is_test) values (
  'create', 'underperform',
  jsonb_build_object(
    'hypothesis_id', 'H-2608-02',
    'creative_code', 'AD-INZ9-110',
    'ref_code', 'MY1201',
    'brand', 'INZ9',
    'metrics', jsonb_build_object('spend', 323.16, 'fd', 25, 'cpa', 12.93, 'baseline_cpa', 9.50),
    'reason', 'CPA 连续 7 天高于品牌基线 30% 以上',
    'ask', '同 hypothesis 下换 visual style 重做 2 个',
    'detected_at', '2026-08-19T02:00:00.000Z'
  ), true);

-- 5. account_incident:账户级事故(封号/受限),素材需整体迁移重上
insert into cdf_events (event_kind, trigger_type, payload, is_test) values (
  'create', 'account_incident',
  jsonb_build_object(
    'account_id', '992331220507779',
    'account_name', 'OK188KH-ACC-03',
    'brand', 'OK188KH',
    'old_status', 1,
    'new_status', 2,
    'status_text', 'DISABLED',
    'affected_ads', jsonb_build_array('120210000000000011','120210000000000012'),
    'ask', '在投素材清单确认 + 新账户重上优先级排期',
    'detected_at', '2026-08-19T05:00:00.000Z'
  ), true);

-- 联调核对:应返回 5 行,五种 trigger_type 各一
select trigger_type, count(*) from cdf_events where is_test group by 1 order by 1;
