# -*- coding: utf-8 -*-
import re, json, io, os
HERE=os.path.dirname(os.path.abspath(__file__))

SRC = os.path.join(HERE,'..','index.html')
OUT = os.path.join(HERE,'..','demo.html')

# ---------- reference data (real, from Supabase) ----------
ROLES = [
 {"id":"75753a49-110b-47c7-981f-2cb18ebca8ed","key":"admin","name":"Admin","is_admin":True},
 {"id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","key":"po","name":"Project Owner","is_admin":False},
 {"id":"01d33c0a-bb07-47a2-a3b0-4207383f8471","key":"pe","name":"Project Executive","is_admin":False},
 {"id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb","key":"role_1782743701757","name":"USC Team","is_admin":False},
]
PERMS = [
 {"role_id":"75753a49-110b-47c7-981f-2cb18ebca8ed","section":s,"can_add":True,"can_edit":True,"can_delete":(s!="dict")} for s in ["watchlist","pending","idea","hypo","creative","dict"]
] + [
 {"role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","section":"watchlist","can_add":True,"can_edit":True,"can_delete":False},
 {"role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","section":"pending","can_add":False,"can_edit":True,"can_delete":True},
 {"role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","section":"idea","can_add":True,"can_edit":True,"can_delete":True},
 {"role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","section":"hypo","can_add":True,"can_edit":True,"can_delete":True},
 {"role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","section":"creative","can_add":True,"can_edit":True,"can_delete":True},
 {"role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a","section":"dict","can_add":True,"can_edit":True,"can_delete":False},
 {"role_id":"01d33c0a-bb07-47a2-a3b0-4207383f8471","section":"idea","can_add":True,"can_edit":True,"can_delete":False},
 {"role_id":"01d33c0a-bb07-47a2-a3b0-4207383f8471","section":"creative","can_add":True,"can_edit":True,"can_delete":False},
 {"role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb","section":"watchlist","can_add":True,"can_edit":False,"can_delete":False},
 {"role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb","section":"idea","can_add":True,"can_edit":False,"can_delete":False},
 {"role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb","section":"hypo","can_add":True,"can_edit":False,"can_delete":False},
]
PROFILES = [
 {"id":"bd51fe10-0766-4ddf-b32f-8ac5c8b7bca6","username":"eling","name":"Eling","role_id":"75753a49-110b-47c7-981f-2cb18ebca8ed"},
 {"id":"5bea4914-67e8-4dcd-a07a-d4056e44abfa","username":"joey","name":"Joey","role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a"},
 {"id":"f86fea59-cfbe-493b-ada1-ecb194e751dd","username":"bryan","name":"Bryan","role_id":"ec3d5ce5-a64b-474d-a7c5-7ef29b12128a"},
 {"id":"7880da09-9dbb-45c0-971a-9c87f6ca5bfa","username":"gg","name":"GG","role_id":"01d33c0a-bb07-47a2-a3b0-4207383f8471"},
 {"id":"6c6838f4-90f5-400e-b4ff-fa536b15e0f4","username":"vny","name":"VNY","role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb"},
 {"id":"7e232ced-8131-4fa7-a9ff-9ff8dd9e266a","username":"zq","name":"ZQ","role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb"},
 {"id":"27dcb944-6723-49b8-a7f8-8a5c8f019b1d","username":"jk","name":"JK","role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb"},
 {"id":"bbf39184-9eb9-496a-bf05-4335e11ab712","username":"anna","name":"ANNA","role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb"},
 {"id":"99359606-f6f4-4e94-a037-8fbba00b37dd","username":"wj","name":"WJ","role_id":"3e03a76a-8410-45f5-a7c2-9b898150f9eb"},
]
DEMO_UID = "bd51fe10-0766-4ddf-b32f-8ac5c8b7bca6"  # eling / admin

# dict_entries: load the full real dictionary from the JSON we fetched
DICT = json.load(open(os.path.join(HERE,'dict_entries.json'),encoding='utf-8'))

def ts(d): return d+"T09:00:00+00:00"

# ---------- crafted PI demo data ----------
IDEAS = [
 {"code":"IDE-001","txt":"竞品大量用「提款到账实拍」做钩子,我们也系统测一轮","src":"竞品情报","tags":["withdrawal_proof"],"pri":"高","status":"已立项","created_by":"Eling","created_at":ts("2026-06-10")},
 {"code":"IDE-002","txt":"真人出镜 vs 游戏画面截图,哪个 CTR 更高","src":"原创直觉","tags":["real_person","game_screenshot"],"pri":"中","status":"已立项","created_by":"Joey","created_at":ts("2026-06-12")},
 {"code":"IDE-003","txt":"体育赛事季,体育钩子叠加高赔率是否拉新更猛","src":"市场研究","tags":["sports","high_odds"],"pri":"高","status":"已立项","created_by":"Bryan","created_at":ts("2026-06-14")},
 {"code":"IDE-004","txt":"客服一线说很多人怕卡款,试「痛点反转」叙事","src":"一线反馈","tags":["pain_reversal"],"pri":"中","status":"待评估","created_by":"ANNA","created_at":ts("2026-06-18")},
 {"code":"IDE-005","txt":"分层红利 vs 首存红利对 AFDA 的影响","src":"内部数据","tags":["tier_bonus","fd_bonus"],"pri":"中","status":"已立项","created_by":"GG","created_at":ts("2026-06-08")},
 {"code":"IDE-006","txt":"数字人素材成本低,KH 竞品重度使用,值得一试","src":"竞品情报","tags":["ai_avatar"],"pri":"低","status":"搁置","created_by":"JK","created_at":ts("2026-05-28")},
 {"code":"IDE-007","txt":"复存激活:对流失玩家用「招财好运」新年向叙事","src":"原创直觉","tags":["redeposit","luck"],"pri":"低","status":"待评估","created_by":"ZQ","created_at":ts("2026-06-20")},
 {"code":"IDE-008","txt":"多图轮播 vs 单一视频,哪种 format 跑量更稳","src":"原创直觉","tags":["CAROUSEL","VIDEO"],"pri":"中","status":"已归档","created_by":"WJ","created_at":ts("2026-05-20")},
]

def hyp(code, brand, statement, test_type, metric, vf, vt, test_dim, locked, persona=None, age=None, status="草稿", idea_code=None, idea_label=None, evidence=None, guard=None, trigger=None, stage=None, mode="新测试", pl=None, pd=None):
    return {"code":code,"brand":brand,"statement":statement,"test_type":test_type,"metric":metric,
            "val_from":vf,"val_to":vt,"mode":mode,"market":"KH" if brand!="INZ9" else "MY","month":"Jun 2026",
            "test_dim":test_dim,"locked_tags":locked,"persona":persona,"age_range":age,"status":status,
            "idea_code":idea_code,"idea_label":idea_label,"evidence":evidence,"guard":guard,
            "trigger_type":trigger,"customer_stage":stage,"plan_launch":pl,"plan_test_days":pd,
            "owner":"Eling","capacity":"GREEN","tests":[],"verdict":None,
            "created_at":ts("2026-06-15"),"matrix":{}}

HYPS = [
 # H1: OK188KH 单变量 Hook, 干净可比, 已锁定
 hyp("HYP-001","OK188KH","用「提款到账实拍」做主钩,能提升 7 天高价值率","素材","7-Day High-Value Rate","8","12","hook",
     {"hook":None,"format":"VIDEO","visual_style":"ugc","offer":"tier_bonus","game_type":"slots","_locked":True},
     persona="P1",age="A2534",status="测试中",idea_code="IDE-001",idea_label="IDE-001 · 提款到账系统测一轮",
     evidence="历史数据 + 竞品信号",guard="Day-1 Quality Floor",trigger="DATA",stage="Acquisition",pl="2026-07-01",pd=7),
 # H2: OK188KH 2维交叉 Format×Hook, 干净 2x2, 草稿
 hyp("HYP-002","OK188KH","Format 与 Hook 交叉,找出拉新最优组合","素材","7-Day High-Value Rate","8","11","format,hook",
     {"format":None,"hook":None,"visual_style":"game_screenshot","offer":"fd_bonus","game_type":"slots","_locked":False},
     persona="P0",age="ALL",status="草稿",idea_code="IDE-002",idea_label="IDE-002 · 真人vs截图",
     evidence="历史数据",guard="Day-1 Quality Floor",trigger="INTUITION",stage="Acquisition",pl="2026-06-28",pd=7),
 # H3: 17WINKH 2维交叉但 Format 三值 -> crossbad (演示新校验), 草稿
 hyp("HYP-003","17WINKH","体育钩子 × Format 找量","素材","FDC","12","18","format,hook",
     {"format":None,"hook":None,"visual_style":"real_person","offer":"tier_bonus","game_type":"sports","_locked":False},
     persona="P5",age="A2534",status="草稿",idea_code="IDE-003",idea_label="IDE-003 · 体育季",
     evidence="市场研究",guard="Day-1 Quality Floor",trigger="EVENT",stage="Acquisition",pl="2026-07-12",pd=7),
 # H4: SBKH 单变量 Visual Style 但素材没差异 -> nodiff, 草稿
 hyp("HYP-004","SBKH","换视觉风格能否提升 CTR","素材","FDC","10","15","visual_style",
     {"visual_style":None,"format":"VIDEO","hook":"big_win","offer":"fd_bonus","game_type":"live_casino","_locked":False},
     persona="P3",age="A1824",status="草稿",idea_code="IDE-002",idea_label="IDE-002 · 真人vs截图",
     evidence="纯直觉",guard="Day-1 Quality Floor",trigger="INTUITION",stage="Retention"),
 # H5: INZ9 受众测试
 hyp("HYP-005","INZ9","回流唤醒人群对复存激活更敏感","受众","FDC","14","20","",
     {"format":"VIDEO","hook":"promo_direct","visual_style":"official_design","offer":"redeposit","game_type":"slots"},
     persona="P7",age="A3544",status="已沉淀",idea_code="IDE-007",idea_label="IDE-007 · 复存激活",
     evidence="内部数据",guard="AFDA",trigger="DATA",stage="Reactivation",mode="主力运行"),
 # H6: OK188KH Promotion
 hyp("HYP-006","OK188KH","分层红利比首存红利带来更高 AFDA","Promotion","AFDA","6.87","8.5","",
     {"format":"IMAGE","hook":"promo_value","visual_style":"official_design","offer":"tier_bonus","game_type":"slots"},
     persona="P6",age="A45P",status="草稿",idea_code="IDE-005",idea_label="IDE-005 · 红利结构",
     evidence="内部数据",guard="AFDA",trigger="STRATEGY",stage="Repeat Conversion",pl="2026-07-03",pd=14),
]

def cr(gen, hyp_code, hyp_label, label, fmt, hook, vs, offer, gt, aud, age, status, versions=None, runs=None, pl=None, pd=None):
    return {"gen_code":gen,"ads_code":(gen.replace("HYP","USC") if status!="待上线" else None),"hyp_code":hyp_code,
            "hyp_label":hyp_label,"label":label,"thumb":None,"format":fmt,"hook":hook,"visual_style":vs,
            "offer":offer,"game_type":gt,"audience":aud,"age":age,"status":status,
            "spend":None,"fdc":None,"cpa":None,"stc":None,"plan_launch":pl,"plan_test_days":pd,
            "versions":versions or [],"runs":runs or [],"created_by":"Eling","created_at":ts("2026-06-16")}

V_FIRST=[{"v":1,"date":"2026-06-17","ev":"first","status":"saved","copy":{"headline":"3 分钟提款到账,实拍给你看","primary":"不卡款,真到账","cta":"立即体验"}}]

CREATIVES = [
 # H1 (hook varies) -> clean
 cr("HYP-001-V1","HYP-001","HYP-001 · 提款到账","素材 1","VIDEO","withdrawal_proof","ugc","tier_bonus","slots","P1","A2534","上线中",V_FIRST,[{"week":"2026-W25","spend":"320","fdc":"9","cpa":"35.6"}]),
 cr("HYP-001-V2","HYP-001","HYP-001 · 提款到账","素材 2","VIDEO","fast_payout","ugc","tier_bonus","slots","P1","A2534","上线中",V_FIRST,[{"week":"2026-W25","spend":"300","fdc":"7","cpa":"42.9"}]),
 # H2 (format x hook) -> clean 2x2 (VIDEO/IMAGE  x  withdrawal_proof/big_win)
 cr("HYP-002-V1","HYP-002","HYP-002 · Format×Hook","素材 1","VIDEO","withdrawal_proof","game_screenshot","fd_bonus","slots","P0","ALL","待上线",V_FIRST),
 cr("HYP-002-V2","HYP-002","HYP-002 · Format×Hook","素材 2","VIDEO","big_win","game_screenshot","fd_bonus","slots","P0","ALL","待上线",V_FIRST),
 cr("HYP-002-V3","HYP-002","HYP-002 · Format×Hook","素材 3","IMAGE","withdrawal_proof","game_screenshot","fd_bonus","slots","P0","ALL","待上线",V_FIRST),
 cr("HYP-002-V4","HYP-002","HYP-002 · Format×Hook","素材 4","IMAGE","big_win","game_screenshot","fd_bonus","slots","P0","ALL","待上线",V_FIRST),
 # H3 (format x hook) -> Format has 3 values -> crossbad
 cr("HYP-003-V1","HYP-003","HYP-003 · 体育季","素材 1","VIDEO","big_win","real_person","tier_bonus","sports","P5","A2534","待上线",V_FIRST),
 cr("HYP-003-V2","HYP-003","HYP-003 · 体育季","素材 2","IMAGE","big_win","real_person","tier_bonus","sports","P5","A2534","待上线",V_FIRST),
 cr("HYP-003-V3","HYP-003","HYP-003 · 体育季","素材 3","CAROUSEL","high_odds","real_person","tier_bonus","sports","P5","A2534","待上线",V_FIRST),
 cr("HYP-003-V4","HYP-003","HYP-003 · 体育季","素材 4","VIDEO","high_odds","real_person","tier_bonus","sports","P5","A2534","待上线",V_FIRST),
 # H4 (visual_style varies) but both same -> nodiff
 cr("HYP-004-V1","HYP-004","HYP-004 · 视觉风格","素材 1","VIDEO","big_win","game_screenshot","fd_bonus","live_casino","P3","A1824","待上线",V_FIRST),
 cr("HYP-004-V2","HYP-004","HYP-004 · 视觉风格","素材 2","VIDEO","big_win","game_screenshot","fd_bonus","live_casino","P3","A1824","待上线",V_FIRST),
 # H6 single creative (insufficient demo)
 cr("HYP-006-V1","HYP-006","HYP-006 · 红利结构","素材 1","IMAGE","promo_value","official_design","tier_bonus","slots","P6","A45P","待上线",V_FIRST),
]

# ---------- competitor ads (v_ads_gallery) ----------
def svg(label, color):
    s = ("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'>"
         "<rect width='160' height='120' fill='%23{c}'/>"
         "<text x='80' y='64' font-size='14' fill='white' text-anchor='middle' font-family='sans-serif'>{t}</text></svg>").format(c=color, t=label)
    import urllib.parse
    return "data:image/svg+xml,"+urllib.parse.quote(s)

def ad(aid, op, country, hook, sp, theme, style, gt, media, dur, start, last, cta, lang, page, color):
    return {"ad_archive_id":aid,"operator_name":op,"country":country,"page_id":aid+"_pg","page_name":page,
            "hook_type":hook,"selling_point":sp,"visual_style":style,"creative_theme":theme,
            "game_type":gt,"has_person":True,"has_money":True,"cta_type":cta,"cta_text":"Sign Up",
            "duration_days":dur,"start_date":start,"end_date":None,"ad_text":sp,
            "extracted_domain":op.lower()+".com","extracted_telegram":"@"+op.lower(),"extracted_ref_code":"REF"+aid[-3:],
            "language":lang,"media_type":media,"snapshot_url":"https://www.facebook.com/ads/library/",
            "image_url":svg((gt or 'NA').split(',')[0], color),"stored_image_url":None,"stored_video_url":None,
            "is_active":True,"last_seen":last,"first_seen":start}

ADS = [
 ad("AD001","BK8","KH","big_win,promo_direct","老虎机爆分,首存即送 188%","老虎机连线爆分动画","game_screenshot","slots","IMAGE",214,"2026-01-10","2026-06-28","SIGN_UP","chinese","BK8 Cambodia","7c4dff"),
 ad("AD002","M88","KH","withdrawal_proof,fast_payout","3 分钟极速提款,实拍到账","玩家手机实拍到账截图","ugc","live_casino","VIDEO",189,"2026-02-01","2026-06-27","MESSAGE_PAGE","chinese","M88 Official","00b8d4"),
 ad("AD003","FUN88","KH","high_odds,prediction","世界杯专享高赔,贴士必中","体育赛事赔率板","official_design","sports","IMAGE",45,"2026-06-25","2026-06-29","PLAY_GAME","english","FUN88 Sport","ff6e40"),
 ad("AD004","BK8","KH","big_win","真人荷官,百家乐大赢展示","真人荷官牌桌","real_person","live_casino,sports","VIDEO",96,"2026-04-12","2026-06-28","SIGN_UP","mixed","BK8 Live","26a69a"),
 ad("AD005","12BET","MY","trust_safety,license","持牌合规,安心提款","合规执照展示","official_design","slots","IMAGE",67,"2026-05-01","2026-06-26","SIGN_UP","malay","12BET MY","5c6bc0"),
 ad("AD006","M88","KH","testimonial","玩家见证:中了 5 万美金","玩家采访口播","ai_avatar","slots","VIDEO",12,"2026-06-26","2026-06-29","MESSAGE_PAGE","chinese","M88 Win","ab47bc"),
 ad("AD007","FUN88","KH","game_variety","上千款游戏,捕鱼老虎机一站玩","游戏大厅滚动","animation","fishing,slots","CAROUSEL",132,"2026-03-20","2026-06-25","PLAY_GAME","chinese","FUN88 Games","ec407a"),
 ad("AD008","WINBOX","MY","promo_value","彩票 4D 开奖,红利加码","4D 开奖号码","official_design","lottery","IMAGE",78,"2026-04-28","2026-06-27","SIGN_UP","malay","WINBOX 4D","78909c"),
 ad("AD009","BK8","KH","luck","新年招财,转运红包雨","红包雨动效","animation",None,"VIDEO",8,"2026-06-27","2026-06-29","SIGN_UP","chinese","BK8 CNY","d4a017"),
 ad("AD010","SBOTOP","KH","high_odds","斗鸡直播,实时投注","斗鸡赛事直播","real_person","cockfight","VIDEO",156,"2026-02-15","2026-06-28","PLAY_GAME","khmer","SBOTOP Arena","8d6e63"),
]

OPERATORS = [
 {"operator_name":"BK8","country":"KH","total_ads":124,"active_ads":89,"pages":6,"domains":4,"telegram_ads":40,"whatsapp_ads":12,"messenger_ads":30,"avg_duration_days":92,"first_seen":"2026-01-10","last_seen":"2026-06-28"},
 {"operator_name":"M88","country":"KH","total_ads":86,"active_ads":61,"pages":4,"domains":3,"telegram_ads":28,"whatsapp_ads":9,"messenger_ads":22,"avg_duration_days":78,"first_seen":"2026-01-18","last_seen":"2026-06-29"},
 {"operator_name":"FUN88","country":"KH","total_ads":73,"active_ads":52,"pages":5,"domains":3,"telegram_ads":19,"whatsapp_ads":7,"messenger_ads":18,"avg_duration_days":64,"first_seen":"2026-02-02","last_seen":"2026-06-29"},
 {"operator_name":"12BET","country":"MY","total_ads":41,"active_ads":22,"pages":2,"domains":2,"telegram_ads":8,"whatsapp_ads":15,"messenger_ads":6,"avg_duration_days":55,"first_seen":"2026-03-01","last_seen":"2026-06-26"},
]

REPORTS = [
 {"id":1,"generated_at":ts("2026-06-22"),"period":"2026-06-22","market":"USC (Cambodia)","report_md":"# USC 竞品周报 · 2026-06-22\n\n## 本周要点\n- **BK8** 持续加投老虎机爆分素材,活跃广告 89 条,环比 +12%。\n- **M88** 主打提款到账实拍(UGC),3 分钟到账叙事跑了 189 天仍在投——竞品验证过的赢家。\n- **FUN88** 借世界杯节点猛上体育高赔率素材(NEW)。\n\n## 钩子分布\n1. 大赢展示 122\n2. 优惠直给 156\n3. 提款到账 84\n\n## 行动建议\n- 我方 HYP-001(提款到账)方向与 M88 长青素材吻合,建议加速测试。\n- 体育季窗口短,17WINKH 体育钩子(HYP-003)宜尽快上线。"},
 {"id":2,"generated_at":ts("2026-06-22"),"period":"2026-06-22","market":"INZ9 (Malaysia)","report_md":"# INZ9 竞品周报 · 2026-06-22\n\n## 本周要点\n- **12BET** 主打持牌合规叙事,马来市场信任向。\n- **WINBOX** 4D 彩票开奖素材稳定投放。\n\n## 行动建议\n- 马来市场信任/执照钩子值得纳入测试池。"},
]

CANDIDATES = [
 {"id":"c1","page_id":"99887766","page_name":"NEW88 Khmer","extracted_domain":"new88.com","extracted_telegram":"@new88kh","sample_ad_archive_id":"X1","sample_ad_text":"老虎机大赢,首存 200%","country":"KH","source":"keyword_discovery","status":"pending","triage_note":None,"suggested_keyword":"老虎机","discovered_at":ts("2026-06-27")},
 {"id":"c2","page_id":"55443322","page_name":"LUCKY96","extracted_domain":"lucky96.net","extracted_telegram":"@lucky96","sample_ad_archive_id":"X2","sample_ad_text":"斗鸡直播投注","country":"KH","source":"signal_trace","status":"pending","triage_note":None,"suggested_keyword":"斗鸡","discovered_at":ts("2026-06-28")},
]

BRANDS = [
 {"id":1,"keyword":"老虎机","country":"KH","market":"USC","is_active":True,"source":"seed"},
 {"id":2,"keyword":"提款","country":"KH","market":"USC","is_active":True,"source":"seed"},
 {"id":3,"keyword":"体育","country":"KH","market":"USC","is_active":True,"source":"keyword_discovery"},
 {"id":4,"keyword":"4D","country":"MY","market":"INZ9","is_active":True,"source":"seed"},
]

AUDIT = [
 {"id":1,"user_id":DEMO_UID,"username":"eling","name":"Eling","section":"auth","action":"login","target":"","created_at":ts("2026-06-29")},
 {"id":2,"user_id":DEMO_UID,"username":"eling","name":"Eling","section":"hypo","action":"add","target":"HYP-002","created_at":ts("2026-06-15")},
 {"id":3,"user_id":DEMO_UID,"username":"eling","name":"Eling","section":"idea","action":"add","target":"IDE-001","created_at":ts("2026-06-10")},
 {"id":4,"user_id":"5bea4914-67e8-4dcd-a07a-d4056e44abfa","username":"joey","name":"Joey","section":"creative","action":"edit","target":"HYP-001-V1","created_at":ts("2026-06-17")},
]

# ---------- budget (每月各品牌:Marketing 申请 → USC 核批) ----------
def bud(month, brand, req, allo, spent, note=None):
    return {"month":month,"brand":brand,"requested":req,"allocated":allo,"spent":spent,"note":note}
BUDGETS = [
 # Jul 2026 —— 覆盖四种状态:已满足 / 部分核批 / 已满足 / 待核批
 bud("Jul 2026","OK188KH",30000,30000,18500,"主力品牌"),
 bud("Jul 2026","17WINKH",25000,20000,12000,"体育季想加码,核批未到位"),
 bud("Jul 2026","SBKH",15000,15000,9000,None),
 bud("Jul 2026","INZ9",12000,None,None,"MY 新市场,待 USC 核批"),
 # Jun 2026 —— 历史一条
 bud("Jun 2026","OK188KH",28000,28000,27200,"上月已结"),
 bud("Jun 2026","17WINKH",20000,18000,17600,None),
]

STORE = {
 "roles":ROLES,"role_permissions":PERMS,"profiles":PROFILES,"dict_entries":DICT,
 "ideas":IDEAS,"hypotheses":HYPS,"creatives":CREATIVES,"audit_log":AUDIT,"budgets":BUDGETS,
 "v_ads_gallery":ADS,"v_operator_intel":OPERATORS,"weekly_reports":REPORTS,
 "discovery_candidates":CANDIDATES,"monitor_brands":BRANDS,
}

# ---------- mock harness (JS) ----------
HARNESS = """<script>
/* ===== DEMO MODE — 自带数据的内存 mock,替换 Supabase,不连任何后端 ===== */
window.__DEMO__ = true;
window.__STORE__ = %%STORE%%;
const __UID__ = "%%UID%%";
function __clone(x){return JSON.parse(JSON.stringify(x));}
function __qb(table){
  let op='select', payload=null, filters=[], single=false, orderSpec=null, limitN=null, conflict=null;
  const store=window.__STORE__;
  function match(row){return filters.every(function(f){var t=f[0],c=f[1],v=f[2];
    return t==='eq'?row[c]===v : t==='in'?(v.indexOf(row[c])>=0) : t==='gte'?(row[c]>=v) : t==='neq'?row[c]!==v : true;});}
  function run(){
    var base=store[table]||(store[table]=[]);
    if(op==='select'){
      var out=base.filter(match);
      if(orderSpec){var c=orderSpec[0],asc=orderSpec[1];out=out.slice().sort(function(a,b){var x=a[c],y=b[c];return (x>y?1:x<y?-1:0)*(asc?1:-1);});}
      if(limitN!=null)out=out.slice(0,limitN);
      return single?{data:(out[0]||null),error:null}:{data:__clone(out),error:null};
    }
    if(op==='insert'||op==='upsert'){
      var added=payload.map(function(r){var row=Object.assign({},r);
        if(row.id==null)row.id='demo_'+Math.random().toString(36).slice(2);
        if(row.created_at==null)row.created_at=new Date().toISOString();return row;});
      if(op==='upsert'&&conflict){var keys=conflict.split(',').map(function(s){return s.trim();});
        added.forEach(function(r){var i=base.findIndex(function(e){return keys.every(function(k){return e[k]===r[k];});});
          if(i>=0)base[i]=Object.assign(base[i],r);else base.push(r);});}
      else added.forEach(function(r){base.push(r);});
      return single?{data:__clone(added[0]||null),error:null}:{data:__clone(added),error:null};
    }
    if(op==='update'){base.filter(match).forEach(function(r){Object.assign(r,payload);});return {data:null,error:null};}
    if(op==='delete'){store[table]=base.filter(function(r){return !match(r);});return {data:null,error:null};}
    return {data:null,error:null};
  }
  const self={
    select:function(){return self;}, insert:function(r){op='insert';payload=Array.isArray(r)?r:[r];return self;},
    update:function(o){op='update';payload=o;return self;}, upsert:function(r,opt){op='upsert';payload=Array.isArray(r)?r:[r];conflict=opt&&opt.onConflict;return self;},
    delete:function(){op='delete';return self;}, eq:function(c,v){filters.push(['eq',c,v]);return self;},
    neq:function(c,v){filters.push(['neq',c,v]);return self;}, in:function(c,v){filters.push(['in',c,v]);return self;},
    gte:function(c,v){filters.push(['gte',c,v]);return self;}, order:function(c,o){orderSpec=[c,!(o&&o.ascending===false)];return self;},
    limit:function(n){limitN=n;return self;}, single:function(){single=true;return self;},
    maybeSingle:function(){single=true;return self;},
    then:function(res,rej){try{res(run());}catch(e){if(rej)rej(e);else res({data:null,error:e});}}
  };
  return self;
}
async function __rpc(fn,args){
  if(fn==='get_brand_baselines')return {data:null,error:null};
  if(fn==='admin_create_user'){var id='demo_'+Math.random().toString(36).slice(2);
    var role=(window.__STORE__.roles.find(function(r){return r.key===args.p_role_key;})||{});
    window.__STORE__.profiles.push({id:id,username:(args.p_username||'').toLowerCase(),name:args.p_name||args.p_username,role_id:role.id});
    return {data:id,error:null};}
  return {data:null,error:null};
}
const __mockClient={
  from:function(t){return __qb(t);}, rpc:function(fn,args){return __rpc(fn,args);},
  auth:{
    getUser:async function(){return {data:{user:{id:__UID__}}};},
    getSession:async function(){return {data:{session:{user:{id:__UID__}}}};},
    signInWithPassword:async function(){return {data:{user:{id:__UID__}},error:null};},
    signOut:async function(){return {error:null};},
    onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}};}
  }
};
window.supabase={createClient:function(){return __mockClient;}};
</script>"""

def main():
    src = io.open(SRC, encoding='utf-8').read()
    store_json = json.dumps(STORE, ensure_ascii=False)
    harness = HARNESS.replace('%%STORE%%', store_json).replace('%%UID%%', DEMO_UID)
    # replace the supabase CDN script tag with the harness (keep marked + chart CDNs so they load in browser)
    pat = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
    assert pat in src, "supabase CDN tag not found"
    out = src.replace(pat, harness, 1)
    # neuter the real n8n webhook in the demo so the manual-add form can't post to production
    out = out.replace('const WEBHOOK_URL="https://n8n.ohmediaa.com/webhook/manual-add";',
                      'const WEBHOOK_URL="PASTE_DEMO_DISABLED";')
    # add a small DEMO banner note in the title bar brand (optional, harmless)
    io.open(OUT, 'w', encoding='utf-8').write(out)
    print("demo.html written:", len(out), "bytes; store tables:", list(STORE.keys()))

main()
