/**
 * Deep Horizon Venture · Founder Intake backend (Google Apps Script)
 *
 * What it does
 *   - Serves the founder portal page (doGet) and receives submissions (doPost / google.script.run).
 *   - Saves every submission into Google Drive:  DHV Founder Intake / <date> <company> (<id>) /
 *       submission.json   machine-readable record (Claude reads this)
 *       <uploaded files>  original files; each file's description holds its document type
 *   - Appends a row to the "DHV Founder Intake Log" sheet.
 *   - Emails the team a notification and the founder a confirmation.
 *
 * Setup: see docs/founder-portal.md. Run setup() once from the editor, then Deploy → Web app
 * (Execute as: Me · Who has access: Anyone).
 */

const CONFIG = {
  NOTIFY: ["sonya.yuechan.chen@gmail.com"],      // team inbox(es) that get a notice for each submission
  ROOT_FOLDER: "DHV Founder Intake",
  LOG_SHEET: "DHV Founder Intake Log",
  FUND_NAME: "Deep Horizon Venture",
  MAX_FILE_MB: 20,
  MAX_FILES: 15,
  MAX_CREATES_PER_HOUR: 40,                       // crude abuse guard for the public endpoint
  DEAL_ROOM_URL: "https://claude.ai/artifact/Mfhejvv4zgczHj5yGWcBU7",
};

const KIND_LABEL = {deck: "Pitch deck / BP", fin: "Financials", nda: "NDA (for us to sign)", tech: "Technical / IP", legal: "Legal / corporate", other: "Other"};
const FIELDS = ["company", "website", "oneLiner", "sector", "stage", "raise", "location", "name", "role", "email", "im", "referrer", "notes", "lang"];

/* ================= Entry points ================= */

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Submit Your Project · " + CONFIG.FUND_NAME)
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  let out;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action;
    delete body.action;
    out = api(action, body);
  } catch (err) {
    out = {ok: false, error: String(err && err.message || err)};
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Single dispatcher used by both doPost and google.script.run. Throws on error. */
function api(action, p) {
  p = p || {};
  if (action === "create") return createSubmission_(p);
  if (action === "upload") return uploadFile_(p);
  if (action === "finalize") return finalize_(p);
  throw new Error("Unknown action");
}

/* ================= Actions ================= */

function createSubmission_(p) {
  rateLimit_();
  const s = {};
  const src = p.submission || {};
  FIELDS.forEach(k => s[k] = clean_(src[k], k === "notes" ? 4000 : 300));
  s.consentShare = !!src.consentShare;
  ["company", "oneLiner", "sector", "stage", "name", "email"].forEach(k => { if (!s[k]) throw new Error("Missing " + k); });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) throw new Error("Invalid email");
  const planned = Array.isArray(p.files) ? p.files.slice(0, CONFIG.MAX_FILES) : [];
  if (!planned.length) throw new Error("No files");

  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const id = "DHV-" + Utilities.formatDate(now, tz, "yyMMdd") + "-" + randomCode_(4);
  const token = Utilities.getUuid();
  const folder = rootFolder_().createFolder(Utilities.formatDate(now, tz, "yyyy-MM-dd") + " " + s.company.slice(0, 60) + " (" + id + ")");

  const record = {
    id: id,
    status: "uploading",                // uploading → submitted (founder done) → filed (Claude wrote it into Deal Room)
    submittedAt: now.toISOString(),
    submission: s,
    plannedFiles: planned.map(f => ({name: clean_(f.name, 200), size: Number(f.size) || 0, kind: KIND_LABEL[f.kind] ? f.kind : "other"})),
    files: [],
    driveFolderId: folder.getId(),
    driveFolderUrl: folder.getUrl(),
  };
  folder.createFile("submission.json", JSON.stringify(record, null, 2), MimeType.PLAIN_TEXT);
  PropertiesService.getScriptProperties().setProperty("tok_" + id, JSON.stringify({token: token, folderId: folder.getId(), exp: Date.now() + 6 * 3600 * 1000}));
  return {ok: true, id: id, token: token};
}

function uploadFile_(p) {
  const ctx = auth_(p);
  const bytes = Utilities.base64Decode(String(p.data || ""));
  if (!bytes.length) throw new Error("Empty file");
  if (bytes.length > CONFIG.MAX_FILE_MB * 1024 * 1024) throw new Error("File too large");
  const kind = KIND_LABEL[p.kind] ? p.kind : "other";
  const name = clean_(p.name, 200) || "file";
  const folder = DriveApp.getFolderById(ctx.folderId);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const rec = readRecord_(folder);
    if (rec.files.length >= CONFIG.MAX_FILES) throw new Error("Too many files");
    // Retries of the same file replace the earlier copy instead of duplicating it
    const prior = rec.files.find(f => f.name === name);
    if (prior) { try { DriveApp.getFileById(prior.fileId).setTrashed(true); } catch (e) {} rec.files = rec.files.filter(f => f !== prior); }
    const file = folder.createFile(Utilities.newBlob(bytes, clean_(p.mime, 120) || "application/octet-stream", name));
    file.setDescription(KIND_LABEL[kind]);
    rec.files.push({name: name, kind: kind, kindLabel: KIND_LABEL[kind], size: bytes.length, mime: file.getMimeType(), fileId: file.getId(), url: file.getUrl()});
    writeRecord_(folder, rec);
  } finally {
    lock.releaseLock();
  }
  return {ok: true};
}

function finalize_(p) {
  const ctx = auth_(p);
  const folder = DriveApp.getFolderById(ctx.folderId);
  const rec = readRecord_(folder);
  if (!rec.files.length) throw new Error("No files uploaded");
  rec.status = "submitted";
  rec.completedAt = new Date().toISOString();
  writeRecord_(folder, rec);
  // The files are safe in Drive at this point; a failing log or email must not make the founder retry.
  [logRow_, notifyTeam_, confirmFounder_].forEach(fn => { try { fn(rec); } catch (err) { console.error(fn.name + ": " + err); } });
  PropertiesService.getScriptProperties().deleteProperty("tok_" + rec.id);
  return {ok: true, id: rec.id};
}

/* ================= Helpers ================= */

function auth_(p) {
  const raw = PropertiesService.getScriptProperties().getProperty("tok_" + String(p.id || ""));
  if (!raw) throw new Error("Unknown or expired submission");
  const ctx = JSON.parse(raw);
  if (ctx.token !== p.token || Date.now() > ctx.exp) throw new Error("Unknown or expired submission");
  return ctx;
}

function readRecord_(folder) {
  const it = folder.getFilesByName("submission.json");
  if (!it.hasNext()) throw new Error("Record missing");
  return JSON.parse(it.next().getBlob().getDataAsString());
}

function writeRecord_(folder, rec) {
  const it = folder.getFilesByName("submission.json");
  if (it.hasNext()) it.next().setContent(JSON.stringify(rec, null, 2));
  else folder.createFile("submission.json", JSON.stringify(rec, null, 2), MimeType.PLAIN_TEXT);
}

function rootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("ROOT_FOLDER_ID");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(CONFIG.ROOT_FOLDER);
  props.setProperty("ROOT_FOLDER_ID", f.getId());
  return f;
}

function logSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("LOG_SHEET_ID");
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  const ss = SpreadsheetApp.create(CONFIG.LOG_SHEET);
  DriveApp.getFileById(ss.getId()).moveTo(rootFolder_());
  const sh = ss.getSheets()[0];
  sh.appendRow(["Submitted", "ID", "Company", "One-liner", "Sector", "Stage", "Raise", "Founder", "Email", "WeChat/WhatsApp/Phone", "Referrer", "Share with investors", "Files", "Drive folder"]);
  sh.setFrozenRows(1);
  props.setProperty("LOG_SHEET_ID", ss.getId());
  return sh;
}

function logRow_(rec) {
  const s = rec.submission;
  logSheet_().appendRow([new Date(rec.submittedAt), rec.id, s.company, s.oneLiner, s.sector, s.stage, s.raise, s.name + (s.role ? " (" + s.role + ")" : ""), s.email, s.im, s.referrer,
    s.consentShare ? "Yes" : "No", rec.files.map(f => "[" + f.kindLabel + "] " + f.name).join("\n"), rec.driveFolderUrl]);
}

function notifyTeam_(rec) {
  const s = rec.submission;
  const rows = [
    ["Company", s.company + (s.website ? " · " + s.website : "")], ["One-liner", s.oneLiner], ["Sector / stage", s.sector + " · " + s.stage + (s.raise ? " · raising " + s.raise : "")],
    ["Location", s.location], ["Founder", s.name + (s.role ? ", " + s.role : "") + " · " + s.email + (s.im ? " · " + s.im : "")], ["Referred by", s.referrer],
    ["Share with investors", s.consentShare ? "Yes" : "No — ask first"], ["Notes", s.notes],
  ].filter(r => r[1]);
  const files = rec.files.map(f => "<li><b>" + esc_(f.kindLabel) + "</b> · <a href=\"" + f.url + "\">" + esc_(f.name) + "</a> (" + Math.round(f.size / 1024) + " KB)</li>").join("");
  const html = "<div style=\"font-family:system-ui,sans-serif;font-size:14px;line-height:1.55\">" +
    "<p>New founder submission <b>" + rec.id + "</b>.</p><table cellpadding=\"4\" style=\"border-collapse:collapse\">" +
    rows.map(r => "<tr><td style=\"color:#5A6762;vertical-align:top\">" + esc_(r[0]) + "</td><td>" + esc_(r[1]).replace(/\n/g, "<br>") + "</td></tr>").join("") +
    "</table><p><b>Files</b></p><ul>" + files + "</ul>" +
    "<p><a href=\"" + rec.driveFolderUrl + "\">Open Drive folder</a> · <a href=\"" + CONFIG.DEAL_ROOM_URL + "\">Deal Room</a></p>" +
    "<p style=\"color:#5A6762\">Claude will pick this up on the next intake run and file a memo into Deal Room.</p></div>";
  MailApp.sendEmail({to: CONFIG.NOTIFY.join(","), subject: "[DHV Intake] " + s.company + " · " + s.stage + " · " + s.sector, htmlBody: html, replyTo: s.email, name: CONFIG.FUND_NAME + " Intake"});
}

function confirmFounder_(rec) {
  const s = rec.submission;
  const zh = s.lang === "zh";
  const list = rec.files.map(f => "<li>" + esc_(f.name) + "</li>").join("");
  const html = zh
    ? "<div style=\"font-family:system-ui,sans-serif;font-size:14px;line-height:1.6\"><p>" + esc_(s.name) + "，你好：</p><p>我们已收到 <b>" + esc_(s.company) + "</b> 的项目资料，提交编号 <b>" + rec.id + "</b>。合伙人审阅后会与你联系，通常在 3 个工作日内。</p><p>已收到的文件：</p><ul>" + list + "</ul><p>如需补充材料，直接回复这封邮件即可。</p><p>" + CONFIG.FUND_NAME + "</p></div>"
    : "<div style=\"font-family:system-ui,sans-serif;font-size:14px;line-height:1.6\"><p>Hi " + esc_(s.name) + ",</p><p>Thanks for sharing <b>" + esc_(s.company) + "</b> with us. Your reference is <b>" + rec.id + "</b>. A partner will review your materials and get back to you, usually within 3 business days.</p><p>Files received:</p><ul>" + list + "</ul><p>To add anything, just reply to this email.</p><p>" + CONFIG.FUND_NAME + "</p></div>";
  MailApp.sendEmail({to: s.email, subject: (zh ? "已收到你的项目资料 · " : "We received your materials · ") + s.company + " (" + rec.id + ")", htmlBody: html, replyTo: CONFIG.NOTIFY[0], name: CONFIG.FUND_NAME});
}

function rateLimit_() {
  const c = CacheService.getScriptCache();
  const key = "creates_" + Utilities.formatDate(new Date(), "UTC", "yyyyMMddHH");
  const n = Number(c.get(key) || 0) + 1;
  if (n > CONFIG.MAX_CREATES_PER_HOUR) throw new Error("Busy, please try again later");
  c.put(key, String(n), 3700);
}

function clean_(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max || 300); }
function esc_(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c])); }
function randomCode_(n) { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

/* ================= One-time setup & maintenance ================= */

/** Run once from the editor: authorizes Drive/Sheets/Mail and creates the folder + log sheet. */
function setup() {
  const f = rootFolder_();
  const sh = logSheet_();
  Logger.log("Intake folder: " + f.getUrl());
  Logger.log("Log sheet:     " + sh.getParent().getUrl());
}

/** Optional: time-driven trigger (daily) to clear expired upload tokens. */
function cleanupTokens() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  Object.keys(all).filter(k => k.indexOf("tok_") === 0).forEach(k => { try { if (JSON.parse(all[k]).exp < Date.now()) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); } });
}
