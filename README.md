# Deep Horizon Venture · Deal Room

Deal Room 是基金内部的早期项目尽调与行业投研工具，包含两部分：
- **项目 Pipeline**：拖入 BP 自动建档，按「投资要点 + 13 节」框架生成投资备忘录 (Investment Memo)，支持资料、智能问答、团队讨论和变更记录。
- **会议与行业投研**：拖入会议或峰会笔记，自动提取人物、公司和行业痛点，汇总成跨会议的行业痛点库，并能生成行业洞察。

线上版本（私有 Claude Artifact）：https://claude.ai/artifact/Mfhejvv4zgczHj5yGWcBU7

## 目录结构

| 路径 | 内容 |
|---|---|
| `app/deal-room.html` | 网页本体，单文件，HTML + CSS + JS |
| `skills/` | Claude（Cowork）技能：`deal-screener` 项目分析、`bilingual-terms` 中英术语、`bilingual-hover-glossary` 术语悬停解释 |
| `docs/data-model.md` | 数据库结构说明 |

## 两人协作流程

1. 先 `git pull`，再从 `main` 拉一个分支：`git checkout -b feature/<名字>`。
2. 修改 `app/deal-room.html`。可以直接用浏览器打开文件预览界面；数据库、上传、AI 等功能只在 claude.ai 上线后才可用。
3. `git commit`，然后 `git push -u origin feature/<名字>`，在 GitHub 上开 Pull Request，由另一位合伙人审阅后合并。
4. **发布**：合并到 `main` 后，在 Cowork 里告诉 Claude「把 app/deal-room.html 发布到 Deal Room」。Claude 会更新上面那个 Artifact，链接保持不变。

注意：
- 项目、会议、术语表等**数据存在 Artifact 的数据库里**，不在这个仓库里。改代码不会丢数据。
- `db` 集合名称和字段结构请不要随意改名。如需调整，请先更新 `docs/data-model.md`。
- 不要往仓库里提交 BP、尽调材料或任何项目机密文件。

## 技能（Skills）

`skills/` 下是 Claude 技能的副本，方便版本管理。改完后，在 Cowork 里让 Claude 用新内容更新对应技能。
