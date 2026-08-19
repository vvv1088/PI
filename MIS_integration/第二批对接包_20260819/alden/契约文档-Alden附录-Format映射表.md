# 契约文档 · Alden 附录:Format 映射表

> **(MIS Format × Visual Style) → Jira Format 菜单选项**。流 A 自动开票的翻译表,消费方 = **Alden 的开票 automation**(开票计价用)。
> 与 Jayden 无关——他的链路在事件产生前就结束,本表不进发 Jayden 的对接包。
> 配套契约:`契约文档v1-cdf_events与brand_notify_roster.md`(cdf_events payload 素材清单里每条素材带 `format` 与 `visual_style`,开票时按组合查本表取默认档)。2026-08-19,V 定稿。

## 映射表(定稿)

| MIS Format | Visual Style | → Jira Format 选项(默认档) |
|---|---|---|
| IMAGE | ai_avatar | AI Image – Standard |
| IMAGE | deepfake | Deepfake – Single face |
| IMAGE | real_person / ugc / game_screenshot / winner_showcase / official_design | Single Image |
| IMAGE | animation | GIF Animation |
| VIDEO | ai_avatar | AI Avatar Video – Single |
| VIDEO | deepfake | Deepfake – Single face |
| VIDEO | real_person / ugc | Video Editing – Full edit |
| VIDEO | game_screenshot / winner_showcase | Video Editing – Simple cut |
| VIDEO | animation / official_design | Motion Graphics |
| CAROUSEL | 任意 | Carousel (set of 6) |
| DCO | 任意 | 按 payload 素材清单逐条映射(DCO 是投放格式非素材形态) |

## 规则三条

1. 映射给的是**默认档**,Designer 拉票时改选类型/档位是合法动作;
2. **GIF 不进 MIS Format 字典**(PI 与 CI scraper 对齐,GIF 类需求归 VIDEO;Jira 菜单保留 GIF Animation 选项供改选);
3. 新增字典值 = 改此表 + 通知 Alden。
