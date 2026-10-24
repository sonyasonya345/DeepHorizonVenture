---
name: "bilingual-terms"
description: "Use whenever writing Chinese analysis, memos or explanations involving biotech, pharma, medical, tech/AI, VC/finance or legal terms: write each term as 中文 (English) and grow the shared glossary."
---

# 专业术语中英对照 (Bilingual Terms)

## 何时使用
用中文写分析、Memo、尽调笔记、项目解读、邮件草稿时，只要涉及生物医药、医疗、科技/AI、投资金融或法律合规，就用这个技能。Deal Room、deal-screener、项目分析都会用到。

## 写法规则
1. 专业术语在每一节第一次出现时写成「中文 (English)」，用半角括号，括号前加一个空格。例如：逆折叠 (inverse folding)。
2. 有通用缩写时，写成「中文 (English Full Name, ABBR)」或「中文 (ABBR)」。例如：新药临床试验申请 (Investigational New Drug, IND)、获客成本 (CAC)。
3. 同一节再次出现时，只写中文或缩写。
4. 公司名、人名、产品名、期刊名不翻译，直接写原文，例如 Stanford、Nature、Fusion Fund。
5. 日常词不加英文；只给真正的专业词加，每节最多 8 个左右，避免满屏括号。
6. 机构第一次出现时写成「中文 (缩写)」，例如：美国食品药品监督管理局 (FDA)、美国外国投资委员会 (CFIUS)。
7. 括号里只放英文术语，不要放解释、年份或数字。解释直接写在正文里。

## 哪些算专业词
- 生物医药：药物形式 (modality)、靶点、临床分期、药代动力学 (PK)、监管路径（IND/NDA/BLA/510(k)）、疗效终点等
- 医疗：器械类别、适应症、报销 (reimbursement)、真实世界证据 (RWE) 等
- 科技/AI：模型、训练与推理、智能体 (AI agent)、检索增强生成 (RAG)、具身智能等
- 投资/金融：估值、条款、SAFE、清算优先权、获客成本 (CAC)、年度经常性收入 (ARR)、跑道 (runway) 等
- 法律/合规：CFIUS、出口管制 (EAR)、VIE、授权协议 (license agreement)、控制权变更 (change of control) 等

## 共享术语表（会自动进化）
术语表存在 Deal Room 的数据库里，collection 是 `glossary`。Deal Room 地址：https://claude.ai/artifact/Mfhejvv4zgczHj5yGWcBU7

每个文档的 id 是英文全称的 slug（小写，非字母数字的字符换成 `-`），字段如下：
`{zh, en, abbr, domain(生物医药|医疗|科技/AI|投资/金融|法律/合规|其他), zhDef(≤60字大白话), enDef(≤35 words), source("ai"|"user"), by, at(ms)}`

### 写之前
用 ArtifactData `list` 读取 `glossary`（limit 1000）。已有词条一律按术语表的中文译法和英文写法来写，`source: "user"` 的词条（合伙人修订过的）优先级最高。

### 写之后
1. 收集这次用到、但术语表里还没有的专业词。
2. 用 ArtifactData `batch` 一次写入（每批最多 50 条），附上中英释义，`source: "ai"`，`by: "agent"`。
3. 永远不要覆盖 `source: "user"` 的词条。更新已有词条时，必须带上读到的 `if_version`。
4. 发现 AI 生成的词条有误（比如中文里带了多余的字、释义不准），也直接修正。

### 从纠正中学习
Sonya 或合伙人纠正某个译法时，把对应词条更新为 `source: "user"`，以后都沿用这个写法。

## 页面里的悬停解释
Deal Room 页面会自动把「中文 (English)」格式的词标成可悬停，鼠标移上去会弹出中英双语释义；遇到术语表里没有的词，会自动调用 AI 生成释义并存入术语表。所以严格遵守上面的写法，悬停功能才会生效。