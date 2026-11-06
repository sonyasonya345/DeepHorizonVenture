# Founder 提交页 (Founder Portal) · 部署与使用

## 整体流程

```
Founder 打开提交页 ──► 填表 + 拖入文件（BP / 财务 / NDA / 技术 …）
        │
        ▼  Google Apps Script（以 Sonya 的 Google 账号运行）
  Drive: DHV Founder Intake/<日期> <公司> (<编号>)/   ← 原件 + submission.json
  Sheet: DHV Founder Intake Log                      ← 一行一次提交
  邮件：通知团队 + 给 founder 发确认（带编号）
        │
        ▼  Claude（founder-intake 技能，手动或定时运行）
  读 Drive 新提交 → deal-screener 框架分析 → 写入 Deal Room（含联系人、Drive 链接、投资人分享授权）
```

不需要服务器、API key 或任何付费账号。文件只存在你自己的 Google Drive 里。

## 一次性部署（约 10 分钟）

1. 打开 https://script.google.com ，**新建项目**，命名为 `DHV Founder Intake`。
2. **Code.gs**：把 `portal/apps-script/Code.gs` 的内容整个粘贴进去，覆盖默认内容。
   - 如需更改通知收件人，修改顶部的 `CONFIG.NOTIFY`。
3. **appsscript.json**：进入「项目设置」，勾选「在编辑器中显示 appsscript.json 清单文件」，再把 `portal/apps-script/appsscript.json` 的内容粘贴进去。
4. **Index.html**：点击「文件 +」→「HTML」，命名为 `Index`，把 `portal/index.html` 的内容整个粘贴进去。
5. 在函数下拉框中选择 `setup`，点击「运行」，然后按提示授权。
   - 如果出现「Google 尚未验证此应用」，点击「高级」→「前往 DHV Founder Intake」。这是你自己的脚本，可以放心授权。
   - 运行完成后，在执行日志里可以看到 Drive 文件夹和汇总表的链接。
6. 点击「部署」→「新建部署」→ 类型选择「网页应用 (Web app)」：
   - 执行身份：**我**
   - 谁可以访问：**任何人**
   - 部署后会得到一个以 `/exec` 结尾的网址，**这就是给 founder 的提交链接**。
7. 自测：用无痕窗口打开这个链接，提交一个测试项目，检查 Drive、汇总表和两封邮件是否都正常。

### 可选：用自己的域名

Apps Script 网址比较长，页面顶部还会显示 Google 的提示条。如果想用 `submit.<你的域名>` 这类地址：

1. 把 `portal/index.html` 里的 `const ENDPOINT = ""` 改成第 6 步得到的 `/exec` 网址。
2. 把 `portal/` 目录部署到 Netlify（拖拽上传即可），再绑定自定义域名。

### 可选：会后预约链接

把 `portal/index.html` 里的 `BOOKING_URL` 填成你的 Calendly 或 Cal.com 链接，提交成功页就会显示「预约通话时间」按钮。

## 修改后怎么更新

- 修改 `Code.gs` 或 `Index` 后：点击「部署」→「管理部署」→ 编辑（铅笔图标）→ 版本选「新版本」→「部署」。**网址保持不变**。
- 用 Netlify 托管的话：把 `portal/` 目录重新上传即可。

## 处理提交

在 Claude 里说「处理新提交」，Claude 会按 `skills/founder-intake/SKILL.md` 的流程处理。也可以设成定时任务，例如每个工作日上午自动运行一次。

## 限制与安全

- 每个文件最大 20 MB，每次提交最多 15 个文件。文件逐个上传，某个文件失败时，重试只会重传失败的那一个。
- 防滥用措施：
  - 隐藏的反机器人字段 (honeypot)
  - 每次提交有一次性上传令牌，6 小时内有效
  - 全站每小时最多 40 次新提交
- Gmail 个人账号每天最多发送 100 封邮件。每次提交发 2 封，所以每天约可处理 50 次提交。
- 提交页的访客看不到 Drive 文件夹，也看不到其他人的提交。
- NDA 只作为一种文件类型上传，不在这一阶段做电子签。
