# 数据模型（Artifact db）

所有时间字段都是毫秒时间戳。`by` 字段为用户 id；由 Claude 在 Cowork 里写入的记录，`by` 为 `"agent"`。

## deals/{dealId}
- `name`, `oneLiner`, `sector`, `stage`, `website`
- `status`：`new` | `tracking` | `dd` | `ic` | `invested` | `pass`
- `round`：`{raise, preMoney, dilution, instrument, lead, existing}`
- `scores`：`{team, market, product, traction, terms, fit}`，每项 1–5，0 表示未知
- `recommendation`：`Pass` | `Track` | `Deep Dive`
- `memo`：`{tldr, what, whynow, team, product, traction, market, competition, model, round, investors, geo, risks, next}`
- `memoMeta.<key>`：`{by, at}`
- `memoSource`, `memoAt`
- `createdBy`, `createdAt`, `updatedBy`, `updatedAt`
- `sourceEvent`：`{id, name}`，仅从会议线索转入的项目有

子集合：
- `files`：`{name, ext, size, assetId, textAssetId, chars, note, uploadedBy, uploadedAt}`
- `comments`：`{text, by, at, fromChat?}`
- `history`：`{action, detail, by, at}`

## events/{eventId}
- `name`, `date`（YYYY-MM-DD）, `location`
- `type`：峰会 | 论坛 | 路演 | 闭门会 | 展会 | 学术会议 | 其他
- `summary`（markdown 列表）, `themes[]`
- `pains[]`：`{sector, pain, who, detail, quote, speaker, severity(1–5), current, opportunity}`
- `companies[]`：`{name, sector, what, stage, signals, website, fit(高|中|低), fitReason, dealId?}`
- `people[]`：`{name, title, org, role, takeaways, followUp}`
- `extractedAt`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`

子集合：
- `files`：结构同 deals 的 `files`

## research/{hashId(sector)}
- `{sector, text, n, by, at}`：按行业跨会议生成的行业洞察

## glossary/{slug(en)}
- `{zh, en, abbr, domain, zhDef, enDef, source("ai"|"user"), by, at}`
- `source: "user"` 的词条由合伙人修订过，AI 不得覆盖。
