---
name: "deal-screener"
description: "Analyze an early-stage startup project (BP/deck/PDF/link/notes) with the 13-section VC framework, web-verify facts, and file the memo into Sonya's Deal Room artifact."
---

# Deal Screener · 早期项目分析

适用场景：Sonya 丢来一个项目（BP、deck、PDF、官网链接、微信聊天记录、会议笔记），或者说「看一下这个项目」「放进 Deal Room」「重新分析」。

Deal Room 地址：https://claude.ai/artifact/Mfhejvv4zgczHj5yGWcBU7

**同时加载 bilingual-terms 技能**：所有专业术语按「中文 (English)」写，并维护共享术语表。

## 基金背景
- 美元早期基金，以种子轮到 A 轮为主。
- 投资方向 (thesis)：AI 基础设施、机器人/具身智能、AI 生物医疗、AI 应用与 Agent、美国制造回流。
- 三位 GP：
  - Charles Cheng：法律与跨境
  - Sonya Chen：AI 与生态，药物研发 AI
  - Kai Jackie L：资本与基金管理

## 写作规则
- 中文为主，专业术语遵循 bilingual-terms 技能的写法。
- 「大白话」一节要让外行也能看懂，并给一个类比。
- 每个关键事实前加来源标签：
  - 【BP自述】：材料里公司自己说的
  - 【已核实】：外部核实过，并附上来源链接
  - 【推断】：我们自己的推理
  - 【待核实】：还没有依据，需要问创始人或进一步查证
- 每节用「- 」列表写，内容精炼。信息缺失时直接写缺什么、该问谁。

## 框架（memo 的 key）
- tldr：一页结论
- what：大白话讲这家公司做什么
- whynow：为什么是现在
- team：创始团队
- product：产品与壁垒
- traction：牵引力
- market：市场规模
- competition：竞争格局
- model：商业模式与单位经济
- round：本轮条款
- investors：现有投资人与背书
- geo：中美地缘与合规风险
- risks：风险与致命假设
- next：尽调问题与基金契合度

评分 1–5 分，权重如下：团队 (team) 30%、市场 (market) 20%、产品 (product) 15%、牵引力 (traction) 15%、条款 (terms) 10%、契合度 (fit) 10%。

## 工作流程
1. **读术语表**：用 ArtifactData `list` 读取 `glossary`。
2. **读材料**：
   - 读取用户新给的全部材料。
   - 如果是重新分析已有项目：读取 `deals/<id>` 和 `deals/<id>/files`，再用 Artifact `read` 加上 `path=<textAssetId>` 取回已提取的文字。
3. **联网核实**：
   - 创始人背景（LinkedIn、论文、过往公司）
   - 历轮融资和投资人（新闻、Crunchbase）
   - 竞品及其融资情况
   - 关键技术论文
   - 监管路径
   - 地缘风险
   - 核实通过的条目，把标签改成【已核实】并附上链接。
4. **写入 Deal Room**：
   - 新项目新建文档，id 用公司名的小写 slug。
   - 已有项目用 `update` 并带上 `if_version`。如果某节的 `memoMeta.<key>.by` 不是 "agent"，说明是合伙人改过的：先读它，把合伙人的内容合并进来，不要直接覆盖。
   - 字段：
     - name、oneLiner、sector、stage、website
     - status：只有新项目才设为 `new`
     - round：`{raise, preMoney, dilution, instrument, lead, existing}`
     - scores：每项 1–5
     - recommendation：`Pass` / `Track` / `Deep Dive`
     - memo：`{14 个 key}`
     - memoMeta：每节 `{by: "agent", at}`
     - memoSource："Claude 联网核实分析（Cowork）"
     - memoAt、updatedBy："agent"
     - updatedAt
5. **记历史**：在 `deals/<id>/history` 下新增一条 `{action: "Claude 联网分析", detail, by: "agent", at}`。
6. **更新术语表**：把新出现的术语批量写入 `glossary`（规则见 bilingual-terms 技能）。
7. **回复 Sonya**：
   - 一句话结论加建议
   - 和上一版相比改变了什么
   - 3 个最关键的待核实问题
   - 不要把整份 Memo 贴进聊天。