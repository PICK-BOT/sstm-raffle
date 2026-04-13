/**
 * Frost Survival 专用云存档 GAS
 * Web App 部署后可供前端调用，支持：
 * - 完整存档 save/load（主存档 + assets + gameplay + story）
 * - 快照备份与列表
 * - 论坛抓取日志记录
 * - 活跃日志记录
 *
 * 建议部署：
 * - 执行身份：我
 * - 访问权限：任何知道链接的人
 */
var APP_VERSION = "frost-survival-cloud-2026-04-13";

var SHEET_FULL = "冰霜完整存档";
var SHEET_SNAPSHOT = "冰霜存档快照";
var SHEET_FORUM_FETCH = "论坛抓取记录_冰霜";
var SHEET_ACTIVITY = "冰霜活跃日志";

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(obj, cb) {
  var callback = String(cb || "").trim();
  if (!callback) return json_(obj);
  var safe = callback.replace(/[^\w\.\$]/g, "");
  return ContentService
    .createTextOutput(safe + "(" + JSON.stringify(obj) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function parseParams_(e) {
  e = e || {};
  var out = {};
  if (e.parameter) {
    for (var k in e.parameter) if (e.parameter.hasOwnProperty(k)) out[k] = e.parameter[k];
  }
  return out;
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName(name);
  if (!ws) ws = ss.insertSheet(name);
  if (ws.getLastRow() === 0 && headers && headers.length) {
    ws.appendRow(headers);
    ws.setFrozenRows(1);
  }
  return ws;
}

function ensureSheets_() {
  getOrCreateSheet_(SHEET_FULL, [
    "UID", "更新时间", "客户端版本", "存档JSON", "素材JSON", "玩法JSON", "剧情JSON", "时间戳"
  ]);
  getOrCreateSheet_(SHEET_SNAPSHOT, [
    "UID", "日期", "时间", "存档JSON", "素材JSON", "玩法JSON", "剧情JSON", "时间戳"
  ]);
  getOrCreateSheet_(SHEET_FORUM_FETCH, [
    "日期", "时间", "UID", "起始日", "结束日", "回复数", "被引用数", "页数", "时间戳"
  ]);
  getOrCreateSheet_(SHEET_ACTIVITY, [
    "UID", "日期", "事件", "数值", "备注", "时间戳"
  ]);
}

function findUidRow_(ws, uid) {
  var last = ws.getLastRow();
  if (last <= 1) return -1;
  var vals = ws.getRange(2, 1, last - 1, 1).getValues();
  uid = String(uid || "").trim();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || "").trim() === uid) return i + 2;
  }
  return -1;
}

function nowDate_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function nowTime_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
}

function actionSaveFull_(p) {
  var uid = String(p.uid || p.user_id || "").trim();
  if (!uid) return { ok: false, error: "missing_uid", v: APP_VERSION };
  var ws = getOrCreateSheet_(SHEET_FULL, [
    "UID", "更新时间", "客户端版本", "存档JSON", "素材JSON", "玩法JSON", "剧情JSON", "时间戳"
  ]);
  var ts = String(p.ts || Date.now());
  var updatedAt = new Date().toISOString();
  var vals = [
    uid,
    updatedAt,
    String(p.client_ver || ""),
    String(p.save_json || "{}"),
    String(p.assets_json || "{}"),
    String(p.gameplay_json || "{}"),
    String(p.story_json || "{}"),
    ts
  ];
  var row = findUidRow_(ws, uid);
  if (row > 0) ws.getRange(row, 1, 1, vals.length).setValues([vals]);
  else ws.appendRow(vals);
  return { ok: true, v: APP_VERSION };
}

function actionLoadFull_(p) {
  var uid = String(p.uid || p.user_id || "").trim();
  if (!uid) return { ok: false, error: "missing_uid", v: APP_VERSION };
  var ws = getOrCreateSheet_(SHEET_FULL, [
    "UID", "更新时间", "客户端版本", "存档JSON", "素材JSON", "玩法JSON", "剧情JSON", "时间戳"
  ]);
  var row = findUidRow_(ws, uid);
  if (row < 0) return { ok: true, v: APP_VERSION, data: null };
  var r = ws.getRange(row, 1, 1, 8).getValues()[0];
  return {
    ok: true,
    v: APP_VERSION,
    data: {
      uid: r[0] || "",
      updated_at: r[1] || "",
      client_ver: r[2] || "",
      save_json: r[3] || "{}",
      assets_json: r[4] || "{}",
      gameplay_json: r[5] || "{}",
      story_json: r[6] || "{}",
      ts: r[7] || ""
    }
  };
}

function actionSaveSnapshot_(p) {
  var uid = String(p.uid || p.user_id || "").trim();
  if (!uid) return { ok: false, error: "missing_uid", v: APP_VERSION };
  var ws = getOrCreateSheet_(SHEET_SNAPSHOT, [
    "UID", "日期", "时间", "存档JSON", "素材JSON", "玩法JSON", "剧情JSON", "时间戳"
  ]);
  ws.appendRow([
    uid,
    nowDate_(),
    nowTime_(),
    String(p.save_json || "{}"),
    String(p.assets_json || "{}"),
    String(p.gameplay_json || "{}"),
    String(p.story_json || "{}"),
    String(p.ts || Date.now())
  ]);
  return { ok: true, v: APP_VERSION };
}

function actionListSnapshots_(p) {
  var uid = String(p.uid || p.user_id || "").trim();
  if (!uid) return { ok: false, error: "missing_uid", v: APP_VERSION };
  var page = Math.max(1, Number(p.page || 1));
  var pageSize = Math.max(1, Math.min(100, Number(p.page_size || 20)));
  var ws = getOrCreateSheet_(SHEET_SNAPSHOT, [
    "UID", "日期", "时间", "存档JSON", "素材JSON", "玩法JSON", "剧情JSON", "时间戳"
  ]);
  var rows = ws.getDataRange().getValues();
  var list = [];
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0] || "").trim() !== uid) continue;
    list.push({
      uid: rows[i][0] || "",
      date: rows[i][1] || "",
      time: rows[i][2] || "",
      ts: rows[i][7] || "",
      save_json: rows[i][3] || "{}",
      assets_json: rows[i][4] || "{}",
      gameplay_json: rows[i][5] || "{}",
      story_json: rows[i][6] || "{}"
    });
  }
  var start = (page - 1) * pageSize;
  return {
    ok: true,
    v: APP_VERSION,
    data: {
      total: list.length,
      page: page,
      page_size: pageSize,
      list: list.slice(start, start + pageSize)
    }
  };
}

function actionForumFetchLog_(p) {
  var ws = getOrCreateSheet_(SHEET_FORUM_FETCH, [
    "日期", "时间", "UID", "起始日", "结束日", "回复数", "被引用数", "页数", "时间戳"
  ]);
  ws.appendRow([
    nowDate_(),
    nowTime_(),
    String(p.uid || p.user_id || ""),
    String(p.startDate || ""),
    String(p.endDate || ""),
    Number(p.reply_count || p.replies || 0),
    Number(p.citation_count || p.citations || 0),
    String(p.page || ""),
    String(p.ts || Date.now())
  ]);
  return { ok: true, v: APP_VERSION };
}

function actionActivityLog_(p) {
  var uid = String(p.uid || p.user_id || "").trim();
  var dateStr = String(p.date || nowDate_());
  if (!uid) return { ok: false, error: "missing_uid", v: APP_VERSION };
  var ws = getOrCreateSheet_(SHEET_ACTIVITY, [
    "UID", "日期", "事件", "数值", "备注", "时间戳"
  ]);
  ws.appendRow([
    uid,
    dateStr,
    String(p.event || ""),
    Number(p.value || 0),
    String(p.note || ""),
    String(p.ts || Date.now())
  ]);
  return { ok: true, v: APP_VERSION };
}

function routeAction_(p) {
  var action = String(p.action || "").trim();
  if (action === "ping") return { ok: true, v: APP_VERSION };
  if (action === "save_full") return actionSaveFull_(p);
  if (action === "load_full") return actionLoadFull_(p);
  if (action === "save_snapshot") return actionSaveSnapshot_(p);
  if (action === "list_snapshots") return actionListSnapshots_(p);
  if (action === "forum_fetch_log") return actionForumFetchLog_(p);
  if (action === "activity_log") return actionActivityLog_(p);
  return { ok: false, error: "unknown_action", v: APP_VERSION };
}

function doGet(e) {
  try {
    ensureSheets_();
    var p = parseParams_(e);
    var cb = String((p && p.callback) || "").trim();
    return jsonp_(routeAction_(p), cb);
  } catch (err) {
    return json_({ ok: false, error: String(err), v: APP_VERSION });
  }
}

function doPost(e) {
  try {
    ensureSheets_();
    var data = {};
    try {
      data = JSON.parse(((e.postData || {}).contents) || "{}");
    } catch (_) {
      data = {};
    }
    return json_(routeAction_(data));
  } catch (err) {
    return json_({ ok: false, error: String(err), v: APP_VERSION });
  }
}
