/**
 * SSTM 论坛抓取（对齐 hexa_master_3d：GAS fetch_url → Frost-Survival-proxy）
 * 配置：window.FrostForumConfig = { gasUrl, proxyPrefix }
 */
(function () {
  const cfg = window.FrostForumConfig || {};
  const GAS_URL = String(cfg.gasUrl || "").trim();
  const FORUM_PROXY =
    String(cfg.proxyPrefix || "").trim() ||
    "https://sstm-raffle.vercel.app/Frost-Survival-proxy?url=";
  const NOVICE_FORUM_RE = /forum\/32[-\/]/;
  const FETCH_MS = 35000;

  function isoDateLocalFromTs_(ts) {
    const d = new Date(ts);
    return d.toISOString().slice(0, 10);
  }

  function withTimeout(promise, ms, errMsg) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(errMsg || "操作超时")), ms);
      promise.then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  function proxyOkText_(text) {
    return text && text.length > 80 && (text.indexOf("<") >= 0 || /profile|ipsQuote|cProfileContent/i.test(text));
  }

  function gasJsonp_(params, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (!GAS_URL) {
        reject(new Error("missing_gas_url"));
        return;
      }
      const cb = "ff_gas_cb_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
      let done = false;
      const tid = setTimeout(() => {
        if (done) return;
        done = true;
        try {
          delete window[cb];
        } catch (_) {}
        const sc = document.getElementById(cb + "_s");
        if (sc) sc.remove();
        reject(new Error("gas_timeout"));
      }, timeoutMs || FETCH_MS);
      window[cb] = (data) => {
        if (done) return;
        done = true;
        clearTimeout(tid);
        try {
          delete window[cb];
        } catch (_) {}
        const sc = document.getElementById(cb + "_s");
        if (sc) sc.remove();
        if (data && data.ok) resolve(data);
        else reject(new Error((data && data.error) || "gas_err"));
      };
      const qs = Object.keys(params)
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
        .join("&");
      const s = document.createElement("script");
      s.id = cb + "_s";
      s.src = GAS_URL + "?" + qs + "&callback=" + cb + "&_t=" + Date.now();
      s.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(tid);
        try {
          delete window[cb];
        } catch (_) {}
        s.remove();
        reject(new Error("gas_load_fail"));
      };
      document.head.appendChild(s);
    });
  }

  async function fetchViaGas_(url) {
    const data = await gasJsonp_({ action: "fetch_url", url: url }, FETCH_MS);
    const text = (data && (data.html || data.contents)) || "";
    if (proxyOkText_(text)) return text;
    throw new Error((data && data.error) || "gas_proxy_empty");
  }

  async function fetchViaVercel_(bustUrl) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
    try {
      const resp = await fetch(FORUM_PROXY + encodeURIComponent(bustUrl), {
        signal: ctrl.signal,
        referrerPolicy: "no-referrer",
        credentials: "omit",
      });
      if (!resp.ok) throw new Error("网络错误 " + resp.status);
      const text = await resp.text();
      if (!proxyOkText_(text)) throw new Error("empty_response");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  async function ffProxyGet(url, noCache) {
    const sk = "ffSstm_px_" + url;
    if (!noCache) {
      try {
        const hit = sessionStorage.getItem(sk);
        if (hit) return hit;
      } catch (_) {}
    }
    const bustUrl = url + (url.includes("?") ? "&" : "?") + "_bust=" + Date.now();
    if (GAS_URL) {
      try {
        const text = await fetchViaGas_(url);
        try {
          sessionStorage.setItem(sk, text);
        } catch (_) {}
        return text;
      } catch (e) {
        console.warn("[frost-proxy] GAS FAIL:", e.message || e);
      }
    }
    try {
      const text = await fetchViaVercel_(bustUrl);
      try {
        sessionStorage.setItem(sk, text);
      } catch (_) {}
      return text;
    } catch (e) {
      console.warn("[frost-proxy] Vercel FAIL:", e.message || e);
      throw new Error("所有中转站均不可用（GAS + Frost-Survival-proxy 均失败）");
    }
  }

  async function ffGetSlug(uid) {
    const html = await ffProxyGet(
      "https://sstm.moe/?app=core&module=members&controller=profile&id=" + uid
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/profile\/(\d+-[^\/\?#"]+)/);
      if (m && m[1].startsWith(String(uid) + "-")) return m[1];
    }
    throw new Error("无法获取用户 slug，请确认 UID 正确");
  }

  function incKey_(uid, startDate, endDate, keySuffix) {
    return "ffSstmInc_" + uid + "_" + startDate + "_" + endDate + (keySuffix || "");
  }
  function loadInc_(uid, startDate, endDate, keySuffix) {
    try {
      return JSON.parse(localStorage.getItem(incKey_(uid, startDate, endDate, keySuffix)) || "null");
    } catch (e) {
      return null;
    }
  }
  function saveInc_(uid, startDate, endDate, keySuffix, data) {
    try {
      localStorage.setItem(incKey_(uid, startDate, endDate, keySuffix), JSON.stringify(data));
    } catch (e) {
      /* ignore */
    }
  }

  function loadPageIndex_(slug) {
    try {
      return JSON.parse(localStorage.getItem("ffSstm_pageidx_" + slug) || "{}");
    } catch (e) {
      return {};
    }
  }
  function savePageIndex_(slug, idx) {
    try {
      localStorage.setItem("ffSstm_pageidx_" + slug, JSON.stringify(idx));
    } catch (e) {
      /* ignore */
    }
  }

  async function ffScrapeRange_(uid, slug, startDate, endDate, keySuffix, scrapeOpts) {
    const opts = scrapeOpts || {};
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : function () {};
    const maxPages = Number(opts.maxPages) > 0 ? Number(opts.maxPages) : 80;
    let citeBudget;
    if (opts.maxCitationChecks === 0) citeBudget = 0;
    else if (opts.maxCitationChecks == null) citeBudget = Number.POSITIVE_INFINITY;
    else citeBudget = Number.isFinite(Number(opts.maxCitationChecks)) ? Number(opts.maxCitationChecks) : 18;

    function normRangeDate_(s) {
      if (!s) return "";
      const t = String(s).trim().replace(/\//g, "-").slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
    }
    const startStr = normRangeDate_(startDate);
    const endStr = normRangeDate_(endDate) || isoDateLocalFromTs_(Date.now());

    const todayStr = isoDateLocalFromTs_(Date.now());
    const useIncremental = !startStr || endStr >= todayStr;
    const prev = useIncremental ? loadInc_(uid, startStr || "", endStr || "", keySuffix) : null;
    const lastTs = useIncremental && prev ? prev.lastTs || 0 : 0;
    let replies = prev ? prev.replies || 0 : 0;
    let emojiReacts = prev ? prev.emojiReacts || 0 : 0;
    const citedIds = new Set(prev ? prev.citations || [] : []);
    const repliesByDay = prev && prev.repliesByDay && typeof prev.repliesByDay === "object" ? prev.repliesByDay : {};
    const citedDayById = prev && prev.citedDayById && typeof prev.citedDayById === "object" ? prev.citedDayById : {};

    const ccKey = "ffSstm_cc_" + uid;
    let cache;
    try {
      cache = new Map(Object.entries(JSON.parse(localStorage.getItem(ccKey) || "{}")));
    } catch (e) {
      cache = new Map();
    }

    const pageIndex = loadPageIndex_(slug);
    const indexedPages = Object.keys(pageIndex)
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    let page = 1;
    if (endStr && indexedPages.length) {
      for (const p of indexedPages) {
        const ts = new Date(pageIndex[p]).getTime();
        if (!Number.isFinite(ts) || ts <= 0) continue;
        const pd = isoDateLocalFromTs_(ts);
        if (pd > endStr) page = p;
        else break;
      }
      if (page > 1) onProgress("已根据缓存快速跳至第 " + page + " 页附近…");
    }
    let done = false;
    let newLastTs = lastTs;

    while (!done) {
      if (page > maxPages) {
        onProgress("已达本轮页数上限，先显示目前统计；可再按同步继续。");
        break;
      }
      onProgress(
        citeBudget === Number.POSITIVE_INFINITY
          ? "读取发帖列表 第 " + page + " 页…（引用验证：无上限）"
          : "读取发帖列表 第 " + page + " 页…（引用验证剩余 " + citeBudget + " 次）"
      );

      const url =
        page === 1
          ? "https://sstm.moe/profile/" +
            slug +
            "/content/?type=forums_topic_post&change_section=1"
          : "https://sstm.moe/profile/" +
            slug +
            "/content/page/" +
            page +
            "/?type=forums_topic_post";
      const html = await ffProxyGet(url, true);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const items = doc.querySelectorAll("ol.cProfileContent > li");
      if (!items.length) break;
      try {
        const firstTimeEl = doc.querySelector("ol.cProfileContent > li time[datetime]");
        const dt = firstTimeEl ? firstTimeEl.getAttribute("datetime") : "";
        if (dt) {
          pageIndex[page] = dt;
          savePageIndex_(slug, pageIndex);
        }
      } catch (e) {
        /* ignore */
      }
      let foundNew = false;
      let minPostDayOnPage = null;
      const toCheck = [];

      for (const item of items) {
        const te = item.querySelector("time[datetime]");
        if (!te) continue;
        const ts = new Date(te.getAttribute("datetime")).getTime();
        const postDay = isoDateLocalFromTs_(ts);
        if (minPostDayOnPage === null || postDay < minPostDayOnPage) minPostDayOnPage = postDay;
        if (postDay > endStr) continue;
        if (startStr && postDay < startStr) {
          done = true;
          break;
        }
        if (lastTs > 0 && ts <= lastTs) {
          done = true;
          break;
        }
        foundNew = true;
        if (ts > newLastTs) newLastTs = ts;

        const fa = item.querySelector("p.ipsType_light a[href]");
        if (!fa || !NOVICE_FORUM_RE.test(fa.getAttribute("href") || "")) continue;
        replies++;
        repliesByDay[postDay] = Math.max(0, Number(repliesByDay[postDay] || 0)) + 1;

        item.querySelectorAll(".ipsReact_reactCount").forEach((el) => {
          const title = el.getAttribute("_title") || el.title || "";
          if (title.includes("顶(+1)")) {
            const n = parseInt(el.textContent.trim(), 10);
            if (!isNaN(n)) emojiReacts += n;
          }
        });

        const bq = item.querySelector(".ipsQuote");
        if (!bq) continue;
        const c2 = bq.getAttribute("data-ipsquote-contentcommentid");
        const t2 = bq.getAttribute("data-ipsquote-contentid");
        if (c2 && t2) toCheck.push({ cid: c2, tid: t2, day: postDay });
      }

      if (toCheck.length && citeBudget > 0) {
        for (const x of toCheck) {
          if (citeBudget <= 0) {
            onProgress("引用验证已达本轮上限，回复数仍会保存；可再次同步继续验证引用。");
            break;
          }
          if (citedIds.has(x.cid)) continue;
          if (cache.has(x.cid)) {
            if (cache.get(x.cid)) {
              citedIds.add(x.cid);
              if (!citedDayById[x.cid]) citedDayById[x.cid] = x.day || endStr;
            }
            continue;
          }
          citeBudget -= 1;
          try {
            const qUrl =
              "https://sstm.moe/?app=core&module=system&controller=content&do=find&content_class=forums_Topic&content_id=" +
              x.tid +
              "&content_commentid=" +
              x.cid;
            const qHtml = await ffProxyGet(qUrl, true);
            if (!/forum\/32[-\/]/.test(qHtml)) {
              cache.set(x.cid, false);
              continue;
            }
            const qDoc = new DOMParser().parseFromString(qHtml, "text/html");
            const el = qDoc.querySelector("article#elComment_" + x.cid);
            if (!el) {
              cache.set(x.cid, false);
              continue;
            }
            const qs = qDoc.querySelectorAll('.ipsQuote[data-ipsquote-userid="' + uid + '"]');
            const ok = Array.from(qs).some((q) => !q.parentElement.closest(".ipsQuote"));
            cache.set(x.cid, ok);
            if (ok) {
              citedIds.add(x.cid);
              if (!citedDayById[x.cid]) citedDayById[x.cid] = x.day || endStr;
            }
          } catch (e) {
            cache.set(x.cid, false);
          }
          await new Promise((r) => setTimeout(r, 90));
        }
      } else if (toCheck.length && citeBudget <= 0) {
        onProgress("本轮跳过引用网络验证，仅更新回复计数。");
      }

      if (done) break;
      if (!foundNew) {
        if (minPostDayOnPage && endStr && minPostDayOnPage > endStr) {
          onProgress("本页帖子均晚于统计结束日，继续翻页查找区间内发言…");
        } else {
          break;
        }
      }
      const next = doc.querySelector(
        "li.ipsPagination_next:not(.ipsPagination_inactive) a,[rel='next']"
      );
      if (!next) break;
      page++;
      await new Promise((r) => setTimeout(r, 220));
    }

    try {
      localStorage.setItem(ccKey, JSON.stringify(Object.fromEntries(cache)));
    } catch (e) {
      /* ignore */
    }

    const citesByDay = {};
    citedIds.forEach(function (cid) {
      const d = String(citedDayById[cid] || "");
      if (!d) return;
      citesByDay[d] = Math.max(0, Number(citesByDay[d] || 0)) + 1;
    });

    saveInc_(uid, startStr || "", endStr || "", keySuffix, {
      lastTs: useIncremental ? newLastTs : 0,
      replies,
      citations: [...citedIds],
      emojiReacts,
      repliesByDay,
      citedDayById,
    });

    onProgress("统计完成：回复 " + replies + " · 引用 " + citedIds.size);
    return { replies, citations: citedIds.size, emojiReacts, repliesByDay, citesByDay };
  }

  async function scrapeRange(uid, startDate, endDate, keySuffix, options) {
    const opt = options && typeof options === "object" ? options : {};
    const onProgress = typeof opt.onProgress === "function" ? opt.onProgress : function () {};
    const overallMs = Number(opt.overallMs) > 0 ? Number(opt.overallMs) : 240000;
    const maxPages = Number(opt.maxPages) > 0 ? Number(opt.maxPages) : 80;
    let maxCitationChecks;
    if (opt.maxCitationChecks === 0) maxCitationChecks = 0;
    else if (opt.maxCitationChecks == null) maxCitationChecks = null;
    else {
      const n = Number(opt.maxCitationChecks);
      maxCitationChecks = Number.isFinite(n) && n > 0 ? n : null;
    }

    return withTimeout(
      (async () => {
        onProgress("连线代理：取得个人页 slug…");
        const slug = await withTimeout(ffGetSlug(uid), 20000, "取得个人页逾时");
        onProgress("已取得资料，开始扫描列表…");
        return ffScrapeRange_(uid, slug, startDate, endDate, keySuffix || "_ffshop", {
          onProgress,
          maxPages,
          maxCitationChecks,
        });
      })(),
      overallMs,
      "同步逾时：请把起迄都设成「今天」后重试，或使用快速同步。"
    );
  }

  window.SstmForumScrape = { scrapeRange, FORUM_PROXY, NOVICE_FORUM_RE, ffProxyGet };
})();
