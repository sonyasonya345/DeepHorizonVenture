---
name: "bilingual-hover-glossary"
description: "Use when building any HTML page or artifact for Sonya that contains 中文 (English) professional terms: add hover popups with Chinese and English definitions backed by the shared glossary."
---

# 术语悬停双语解释 (Hover Glossary)

## 目的
页面上凡是「中文 (English)」格式的专业词，鼠标悬停或键盘聚焦时，都会弹出一个小卡片，内容是：中文名 · English · 缩写、中文大白话释义、英文释义、领域和来源。手机上点一下就能看。

## 数据来源（按优先级）
1. 页面声明了 `db` capability 并且就是 Deal Room 本身时，直接订阅 `glossary` collection。
2. 其他独立页面（报告、Dashboard 等）：发布前先用 ArtifactData 从 Deal Room（https://claude.ai/artifact/Mfhejvv4zgczHj5yGWcBU7）读取 `glossary`，只把页面里实际用到的词条以 JSON 形式内联进页面，不要整张表都塞进去。
3. 页面里出现了术语表没有的词：先按 bilingual-terms 技能补进 Deal Room 的术语表，再内联。

## 实现要点（参考 Deal Room 页面里的实现）
- 识别：渲染文本时用正则匹配 `([一-鿿][一-鿿·]{0,13})\s?[（(]([A-Za-z][^()（）]{0,60}?)[)）]`。
  - 中文部分可能多带了前面的字。如果术语表里该词条的 `zh` 是匹配到的中文的后缀，就只标这个后缀；否则在「的是了将把从做让被」这几个字的最后一处切开。
- 查找：key 等于英文第一段的 slug；找不到时，再按中文名或缩写查。
- 包裹：`<span class="term" tabindex="0" data-k="key">中文 (English)</span>`，样式是虚线下划线加 `cursor: help`。
- 弹层：只用一个 `position: fixed` 的 `div[role=tooltip]`。
  - 在 mouseover / focusin 时显示，mouseout / focusout / Escape / 滚动时隐藏。
  - 用 `aria-describedby` 关联到当前词。
  - 位置：默认在词下方 6px，并限制在视口内；下方放不下就放到上方。
- 样式：颜色全部来自主题 token，深色和浅色主题都要可读；宽度不超过 `min(340px, 100vw - 16px)`。
- 内容一律用 textContent 或转义后再插入，术语表数据当作不可信数据处理。

## 不要做
- 不要给页面里每一个英文单词都加悬停，只处理「中文 (English)」格式的词。
- 不要在页面加载时自动大批量调用 AI 生成释义：独立页面应该在发布前就把释义补齐；Deal Room 页面会以小批量、去重的方式后台补齐。