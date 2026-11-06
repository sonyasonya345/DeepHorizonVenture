# 前沿人才 · 研究 Agent

页面（`app/deal-room.html`，「前沿人才」板块）只负责把人加进 `talent` 集合并标记 `research: "queued"`：
- 只贴链接（LinkedIn / 个人主页 / 实验室页 / 公司团队页，可多个）→ 每个链接建一个人，名字先从网址推断
- 贴介绍/名单/文章 → 照旧提取，新增的人同样排队调研
- 详情页「让 Agent 调研 / 重新调研」按钮 → 重新排队

研究 Agent 是一个 claude.ai 定时任务（每小时），上网调研后写回：

| 字段 | 内容 |
|---|---|
| name / title / org / affiliations / type / field / area / famousFor / ventures | 基本信息与行业板块 |
| bio | 核心介绍，4–7 行「- 」列表，最后一行【推断】与基金方向的相关性 |
| network | 关键人脉 `[{name, relation, org, note, url}]`，只写有公开证据的关系 |
| sources | `[{label, url}]` 调研来源 |
| research | `queued → running → done / failed`，`researchedAt`、`researchNote` |

不覆盖 `note`、`status`、`photoId`。
