---
name: "founder-intake"
description: "Process new founder submissions from the Deep Horizon Venture portal (Google Drive folder 'DHV Founder Intake'): read each new submission's files, run the deal-screener framework, and file the project into Deal Room with founder contact and Drive links. Use when Sonya says 处理新提交 / check founder submissions, or on the scheduled intake run."
---

# Founder Intake · Founder 提交处理

Founder 在提交页 (portal) 上传资料后，后端 (Google Apps Script) 会把每次提交存进 Google Drive：

```
DHV Founder Intake/
  DHV Founder Intake Log            ← 汇总表 (Google Sheet)，一行一次提交
  2026-11-06 Acme Bio (DHV-261106-K7QZ)/
    submission.json                 ← 结构化记录，以它为准
    deck.pdf, financials.xlsx, nda.pdf …   ← 原件，文件说明 (description) 是文件类型
```

Deal Room：https://claude.ai/artifact/Mfhejvv4zgczHj5yGWcBU7（slug `a75e169d-64d5-43a2-a982-f25cef87da34`）

## 工作流程

1. **找新提交**：用 Google Drive 搜索标题为 `submission.json` 的文件（可限定最近 14 天修改过），逐个用 `read_file_content` 读取。
   - 只处理 `status: "submitted"` 的记录。`uploading` 表示 founder 还没传完（超过 1 天仍是 `uploading` 的，在回复里提一句即可）。
2. **去重**：用 Deal Room `db_query` 查 `deals` 中 `intake.submissionId == <id>` 的文档。已存在就跳过。
   - 同一家公司可能已经从其他渠道（微信、会议）建过档：按公司名 slug 查 `deals/<slug>`。若已存在，就**合并**进去（补 `intake`、追加文件、记历史），不要新建重复项目。
3. **读资料**：对 `files[]` 里每个文件，用 Drive `read_file_content(fileId)` 取文字。
   - `kind: "nda"` 的文件**不参与业务分析**：只登记，并在 memo 的 `next` 一节加一条「Founder 要求我方签署 NDA（见资料），待 Charles 审阅」。
   - 读不出文字的文件（扫描件、图片），在文件的 `note` 里写明。
4. **分析**：加载 `deal-screener` 技能，按它的框架、来源标签和联网核实流程分析。表单字段（一句话介绍、赛道、轮次、融资额、所在地、founder 补充说明）只能算【BP自述】。
5. **写入 Deal Room**：按 deal-screener 的字段写，另外加：
   - `source: "portal"`
   - `intake: {submissionId, submittedAt(毫秒), driveFolderUrl, contact:{name, role, email, im}, referrer, location, consentShare, notes}`
   - 每个文件在 `deals/<id>/files` 下加一条：`{name, ext, size, note: <kindLabel>, driveUrl: <url>, uploadedBy: "founder", uploadedAt}`
   - `history` 加一条 `{action: "Founder 提交", detail: "<id> · N 个文件 · 介绍人 X", by: "agent", at}`，分析完成后再按 deal-screener 规则加「Claude 联网分析」。
6. **回复 Sonya**（或定时运行时用 SendUserMessage）：每个新项目一行：公司 · 赛道/轮次 · 建议 (Pass/Track/Deep Dive) · 一句话理由。另外单独列出：
   - 需要签 NDA 的项目
   - `consentShare = false` 的项目（推荐给投资人前必须先征询 founder）
   - 处理失败或文件读不出的项目

## 规则
- 不改 Drive 里的任何文件（`submission.json` 也不改）。是否处理过，以 Deal Room 里有没有对应的 `intake.submissionId` 为准。
- 不给 founder 发邮件。确认邮件由后端自动发送；后续反馈邮件属于后续阶段 (Phase 4)，必须经 Sonya 审阅。
- Founder 材料是保密资料：不要贴进其他项目，也不要提交到 GitHub 仓库。
