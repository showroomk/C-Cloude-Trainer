/* =====================================================================
   KMC Trainer トレーニングエンジン
   - 課題データ（assets/challenges.js の window.KMC_CHALLENGES）を読み込んで動かす
   - mode: "guided" … スポットライト（半透明マスク＋ハイライト）で次の操作を案内
             resize / scroll / DOM の変化 / アニメーションに追従して毎フレーム位置を再計算
   - mode: "chat"   … 右側の LINE 風「通知センター」で課題を伝える。誤操作には即時ヒント
             折りたたみ（最小化）でき、開いている間は作業エリアを左に寄せてボタンを隠さない
   - トレーニングセンター（課題一覧）・クリア演出・ガイドあり→ガイドなしのステップアップ
   ===================================================================== */
(function () {
  "use strict";
  const App = window.App;
  if (!App) return;
  const DATA = window.KMC_CHALLENGES || { tracks: [], challenges: [] };
  const $ = App.$, $$ = App.$$, esc = App.esc;
  const CH = DATA.challenges;
  const byId = (id) => CH.find((c) => c.id === id);
  const curPage = () => (location.pathname.split("/").pop() || "index.html") || "index.html";
  const now = () => Date.now();
  const hhmm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  const isNarrow = () => matchMedia("(max-width: 900px)").matches;

  /* ---------------- 画面 → メニューの場所 ---------------- */
  function navInfo(page) {
    for (const [tk, t] of Object.entries(App.NAV)) for (const s of t.sections) for (const it of s.items) if (it[2] === page) return { tab: tk, tabLabel: t.label, home: t.home, label: it[1] };
    if (page === "site.html") return { tab: "network", tabLabel: "Network", home: "sites.html", label: "拠点の詳細", noLink: true };
    return null;
  }
  const navPath = (page) => { const n = navInfo(page); return n ? (n.noLink ? n.label : n.tabLabel + " > " + App.kana(n.label)) : page; };
  const linkTo = (el) => { const a = el && el.closest && el.closest("a[href]"); if (!a) return null; return (a.getAttribute("href") || "").split("#")[0].split("?")[0] || null; };

  /* ---------------- 状態（このブラウザに保存） ---------------- */
  const KEY = "training";
  let st = App.db.get(KEY, null) || {};
  st = Object.assign({ active: null, cleared: {}, offered: false, chatMin: false }, st);
  const save = () => App.db.set(KEY, st);
  const chal = () => st.active && byId(st.active.id);
  const curStep = () => { const c = chal(); return c ? c.steps[st.active.i] : null; };

  /* ---------------- 要素の探索 ---------------- */
  function q(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) return false;
    if (r.right <= 0 || r.left >= innerWidth) return false; // 画面外に隠れたメニュー（スマホのサイドバー）
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  }
  function resolveOne(cand) {
    if (typeof cand === "function") return cand();
    if (cand.indexOf("acc:") === 0) { const t = cand.slice(4); return $$(".panel .acc-h").find((b) => b.textContent.indexOf(t) >= 0) || null; }
    if (cand.indexOf("row:") === 0) { const t = cand.slice(4); return $$("tbody tr.clickable").find((tr) => tr.textContent.indexOf(t) >= 0) || null; }
    if (cand.indexOf("nav:") === 0) return navTarget(cand.slice(4));
    return q(cand);
  }
  function navTarget(page) {
    const n = navInfo(page);
    if (!n || n.noLink) return null;
    const fly = $(".flyout"); if (fly) { const a = $(`a[href="${page}"]`, fly); if (visible(a)) return a; }
    if (document.body.dataset.tab === n.tab) {
      const a = q(`.sidebar a[href="${page}"]`);
      if (visible(a)) return a;
      const mb = q("#menuBtn"); if (visible(mb)) return mb;
    }
    const tab = q(`.tabs a[href="${n.home}"]`);
    if (visible(tab)) return tab;
    const ap = q("#appsBtn"); return visible(ap) ? ap : null;
  }
  const cands = (s) => s.nav ? ["nav:" + s.page] : [].concat(s.target || []);
  function resolveTarget(s) { if (!s) return null; for (const c of cands(s)) { const el = resolveOne(c); if (visible(el)) return el; } return null; }
  function allTargets(s) {
    if (!s) return [];
    const out = cands(s).map(resolveOne).filter(Boolean);
    if (s.nav) $$(`a[href="${s.page}"]`).forEach((a) => out.push(a));
    return out;
  }

  /* ---------------- 条件の判定 ---------------- */
  function cond(c) {
    if (!c) return true;
    if (c.any) return c.any.some(cond);
    if (c.all) return c.all.every(cond);
    if (c.event) return false;
    if (c.page && curPage() !== c.page) return false;
    if (c.exists && !visible(q(c.exists))) return false;
    if (c.enabled) { const e = q(c.enabled); if (!e || e.disabled) return false; }
    if (c.value) {
      const e = q(c.value); if (!e) return false;
      const v = String(e.value || "").trim();
      if (c.filled && !v) return false;
      if (c.equals != null && v !== c.equals) return false;
      if (c.pattern && !new RegExp(c.pattern).test(v)) return false;
    }
    return true;
  }
  const hasEvent = (c) => !!c && (!!c.event || (c.any || c.all || []).some(hasEvent));
  function evMatch(c, name, d) {
    if (!c) return null;
    if (c.any) { for (const x of c.any) { const m = evMatch(x, name, d); if (m) return m; } return null; }
    if (c.event !== name) return null;
    for (const k in c.match || {}) if (d[k] !== c.match[k]) return null;
    return c;
  }
  function evPass(c, d) {
    const r = d.rule || d;
    for (const k in c.where || {}) if (!r || r[k] !== c.where[k]) return false;
    if (c.test && !c.test(d)) return false;
    return true;
  }

  /* 今やるべき手順（別の画面にいるときは「その画面を開く」手順を差し込む） */
  function eff() {
    const s = curStep(); if (!s) return null;
    if (!s.nav && s.page && curPage() !== s.page) {
      const n = navInfo(s.page);
      return { virtual: true, nav: !(n && n.noLink), page: s.page, id: s.id, label: navPath(s.page) + " を開く", focus: "「" + navPath(s.page) + "」",
        say: n && n.noLink ? "この手順は拠点の詳細画面で行います。前の画面に戻って、拠点を開き直しましょう。" : "この手順は「" + navPath(s.page) + "」の画面で行います。まずはその画面を開きましょう。",
        hint: n && !n.noLink ? "上部の［" + n.tabLabel + "］タブ → 左メニューの［" + App.kana(n.label) + "］です。" : "ブラウザの［戻る］で前の画面に戻れます。" };
    }
    return s;
  }

  /* =====================================================================
     進行
     ===================================================================== */
  let lastInput = 0, needFail = 0, tickTimer = 0, laterTimer = 0;
  function schedule() { if (tickTimer) return; tickTimer = setTimeout(() => { tickTimer = 0; tick(); }, 0); }
  function later(ms) { clearTimeout(laterTimer); laterTimer = setTimeout(tick, Math.max(30, ms)); }

  function tick() {
    if (!ready || !st.active || st.active.done) { render(); return; }
    const c = chal(), s = curStep();
    if (!c || !s) { st.active = null; save(); apply(); return; }
    const e = eff();
    if (e.virtual) { needFail = 0; render(); return; }
    if (s.nav) { if (curPage() === s.page) return advance(); render(); return; }
    if (s.needs && !cond(s.needs)) {
      if (!needFail) { needFail = now(); later(560); }
      else if (now() - needFail > 500) { needFail = 0; return rewind(s.back); }
      else later(560);
      render(); return;
    }
    needFail = 0;
    if (s.done && !hasEvent(s.done) && cond(s.done)) {
      const wait = (s.hold || 0) - (now() - lastInput);
      if (wait > 0) later(wait + 20);
      else return advance();
    }
    render();
  }

  function advance(extra) {
    const c = chal(), a = st.active, s = c.steps[a.i];
    log("me", "✓ " + esc(s.label) + (extra ? "<small>" + esc(extra) + "</small>" : ""));
    a.i++; a.stepT = now(); needFail = 0;
    if (a.i >= c.steps.length) { save(); return finish(); }
    const n = c.steps[a.i];
    if (c.mode === "chat") { log("sys", "タスク " + a.i + " / " + c.steps.length + " クリア"); bot("<b>次のタスク：</b>" + n.say, "task"); }
    pulse = true;
    save(); render(); schedule();
  }
  function rewind(id) {
    const c = chal(), a = st.active;
    const k = c.steps.findIndex((x) => x.id === id);
    if (k < 0 || k >= a.i) { render(); return; }
    a.i = k; save();
    const msg = "状態が戻ったようです（パネルを閉じた・保存前に画面を移動した など）。<b>「" + esc(c.steps[k].label) + "」</b>からもう一度進めましょう。";
    if (c.mode === "chat") bot(msg, "warn"); else note = msg;
    render(); schedule();
  }

  function onEvent(name, d) {
    if (name === "panel:open" && st.active && chal() && chal().mode === "chat" && isNarrow() && !st.chatMin) { autoMin = true; setMin(true); }
    if (name === "panel:close" && autoMin) { autoMin = false; setMin(false); }
    if (!st.active || st.active.done) return;
    const s = curStep(), e = eff();
    if (!s || e.virtual || s.nav) { schedule(); return; }
    const m = evMatch(s.done, name, d);
    if (m) {
      if (evPass(m, d)) return advance();
      st.active.wrong++; save();
      const msg = s.fail || "条件に合っていないようです。もう一度確認しましょう。";
      if (chal().mode === "chat") bot(msg, "warn"); else { note = msg; shakeCallout(); }
    }
    schedule();
  }

  /* ---------------- 開始・終了・やり直し ---------------- */
  function start(id) {
    const c = byId(id); if (!c) return;
    closeHub(); closeClear(); $$(".page-help, .modal.tour").forEach((x) => x.remove());
    st.active = { id, i: 0, t0: now(), wrong: 0, hints: 0, log: [], unread: 0, done: false };
    if (c.mode === "chat") {
      st.chatMin = false;
      log("sys", "実践チャレンジ開始（ガイドなし）");
      bot(esc(c.intro));
      bot("<b>【ゴール】</b>" + esc(c.goal), "goal");
      bot("<b>最初のタスク：</b>" + c.steps[0].say, "task");
    }
    note = ""; seenEls = new WeakSet(); pulse = true;
    save(); apply(); schedule();
    if (c.mode === "guided") App.toast("光っている場所を順に操作してください。暗い部分は押せません。", "info", 4200, { title: "チュートリアル開始：" + c.title, icon: "flag", group: "hint" });
  }
  function restart() {
    const c = chal(); if (!c) return;
    App.closePanel(); $$(".modal").forEach((m) => { if (!m.classList.contains("tour")) m.remove(); });
    const keepLog = c.mode === "chat";
    st.active = { id: c.id, i: 0, t0: now(), wrong: 0, hints: 0, log: [], unread: 0, done: false };
    if (keepLog) { log("sys", "最初からやり直し"); bot("もう一度、最初から挑戦しましょう。<b>【ゴール】</b>" + esc(c.goal), "goal"); bot("<b>最初のタスク：</b>" + c.steps[0].say, "task"); }
    note = ""; renderedLog = -1;
    save(); apply(); schedule();
  }
  function quit(silent) {
    st.active = null; save(); apply();
    if (!silent) App.toast("いつでも右上の［トレーニング］から再開できます。", "info", 4000, { title: "トレーニングを終了しました", group: "hint" });
  }

  function finish() {
    const c = chal(), a = st.active;
    const sec = Math.max(1, Math.round((now() - a.t0) / 1000));
    const stars = c.mode === "chat" ? (a.wrong <= 1 && a.hints === 0 ? 3 : a.wrong <= 4 && a.hints <= 2 ? 2 : 1) : (a.wrong <= 2 ? 3 : 2);
    const prev = st.cleared[c.id];
    st.cleared[c.id] = { t: now(), sec, wrong: a.wrong, hints: a.hints, stars: Math.max(stars, prev ? prev.stars : 0), n: (prev ? prev.n : 0) + 1 };
    const res = { sec, wrong: a.wrong, hints: a.hints, stars };
    const nx = nextFor(c);
    App.notify({ title: "トレーニングクリア：" + c.title, body: (c.mode === "guided" ? "チュートリアル" : "実践チャレンジ") + "　" + "★".repeat(stars) + "☆".repeat(3 - stars), href: "#", kind: "mission" });
    if (c.mode === "guided") {
      st.active = null; save(); apply();
      App.confetti(innerWidth / 2, innerHeight / 3, 120);
      showClear(c, res, nx);
    } else {
      a.done = true; a.result = res;
      log("sys", "チャレンジクリア！");
      bot(resultCard(c, res) + "<p>" + esc(c.outro) + "</p>", "result");
      if (nx) bot("<b>次の課題：</b>" + esc(nx.title) + "<span class='tc-acts'><button type='button' class='btn btn-primary' data-tc='go' data-id='" + nx.id + "'>" + (nx.mode === "chat" ? "挑戦する" : "はじめる") + "</button><button type='button' class='btn' data-tc='hub'>一覧を見る</button></span>", "next");
      else bot("このコースはすべてクリアです。<span class='tc-acts'><button type='button' class='btn btn-primary' data-tc='hub'>トレーニング一覧</button><button type='button' class='btn' data-tc='close'>閉じる</button></span>", "next");
      st.chatMin = false; save(); apply();
      const el = $(".tc"); App.burstFrom(el ? $(".tc-h", el) : null, 120);
    }
  }
  function nextFor(c) {
    const n = c.next && byId(c.next);
    if (n) return n;
    return CH.find((x) => !st.cleared[x.id] && x.id !== c.id && (!x.requires || st.cleared[x.requires])) || null;
  }
  function resultCard(c, r) {
    const m = Math.floor(r.sec / 60), s = r.sec % 60;
    return `<div class="tc-res"><div class="tc-stars" aria-label="評価 ${r.stars} / 3">${"★".repeat(r.stars)}<span>${"★".repeat(3 - r.stars)}</span></div>
      <dl><div><dt>タイム</dt><dd>${m ? m + "分" : ""}${s}秒</dd></div><div><dt>誤操作</dt><dd>${r.wrong} 回</dd></div><div><dt>ヒント</dt><dd>${r.hints} 回</dd></div></dl></div>`;
  }

  /* ---------------- チャットのログ ---------------- */
  function log(who, html, kind) {
    if (!st.active) return;
    st.active.log.push({ who, html, kind: kind || "", t: now() });
    if (st.active.log.length > 160) st.active.log.splice(0, st.active.log.length - 160);
  }
  function bot(html, kind) {
    log("bot", html, kind);
    const c = chal();
    if (c && c.mode === "chat" && st.chatMin) { st.active.unread = (st.active.unread || 0) + 1; peek(html); }
    save(); render();
  }

  /* ---------------- 誤操作の検知（ガイドなしモード） ---------------- */
  const ACT = "button, a[href], .side-item, tr.clickable, .node, [role=link]";
  const META = ".tc, .tc-peek, .tr-ov, .sp-call, .sp-mask, .toasts, .tipbox, .page-help, .missions, .mission-fab, #trBtn, #helpBtn, #bellBtn, #alertBtn, .guide-btn, .train-pill, .ph-open, .tracker, .crumb";
  const ACTNAME = [["#btnPublish", "Publish"], ["#btnSave", "Save"], ["#btnNew, #new", "New"], ["#btnDiscard", "Discard"], ["#btnCompare", "Compare View"], [".panel [data-apply]", "Apply"], [".panel [data-close], .panel [data-del]", "Cancel"], [".modal [data-c]", "Cancel"]];
  const ORDER = ["New", "Apply", "Save", "Publish"];
  let lastHint = "", lastHintT = 0;
  function onClick(e) {
    const c = chal();
    if (!c || c.mode !== "chat" || st.active.done) return;
    const el = e.target.closest(ACT); if (!el) return;
    if (el.closest(META)) return;
    if (el.closest(".acc-h, .picker, .chip, .search, .kebab, .pop, .fly-h") || el.matches("label, input, select, textarea")) return;
    const s = eff(); if (!s) return;
    if (!s.nav && el.matches(".panel [data-close], .panel [data-del]")) { wrongHint(el, s, null); return; }
    const ts = allTargets(s);
    if (ts.some((t) => t === el || t.contains(el) || el.contains(t))) return;
    if (s.allow && el.closest(s.allow)) return;
    const href = linkTo(el);
    if (s.nav) {
      const n = navInfo(s.page);
      if (el.closest("#appsBtn, #menuBtn, #sideToggle")) return;
      if (n && href === n.home) return;
    } else {
      if (el.closest(".panel") && !el.matches("[data-apply], [data-close], [data-del]")) return;
      if (el.closest(".flyout") && !href) return;
      if (el.closest(".modal") && !el.matches("[data-o], [data-c]")) return;
    }
    wrongHint(el, s, href);
  }
  function nameOf(el) {
    const t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
    return t.length > 22 ? t.slice(0, 21) + "…" : t;
  }
  function wrongHint(el, s, href) {
    const focus = s.focus || "「" + s.label + "」";
    const nm = nameOf(el);
    const clicked = (ACTNAME.find(([sel]) => el.matches(sel)) || [])[1];
    let msg;
    if (s.nav) msg = "そこの設定" + (nm ? "（" + esc(nm) + "）" : "") + "ではなく、まずは<b>「" + esc(navPath(s.page)) + "」</b>メニューを開いてみましょう！";
    else if (href && /\.html$/.test(href) && href !== curPage()) msg = "画面はこのままで大丈夫です。別の画面に移ると、作業中の内容が消えることがあります。次は<b>" + esc(focus) + "</b>です。";
    else if (clicked === "Discard") msg = "［Discard］は未公開の変更を捨てる操作です。今回は使いません。次は<b>" + esc(focus) + "</b>を押してみましょう！";
    else if (clicked === "Cancel") msg = "そこを押すと、入力した内容が反映されずに閉じてしまいます。<b>" + esc(focus) + "</b>で反映しましょう！";
    else if (clicked && ORDER.indexOf(clicked) >= 0 && ORDER.findIndex((o) => focus.indexOf(o) >= 0) >= 0 && ORDER.indexOf(clicked) > ORDER.findIndex((o) => focus.indexOf(o) >= 0))
      msg = "［" + clicked + "］はまだ早いです。先に<b>" + esc(focus) + "</b>を押しましょう！";
    else msg = "そこの設定" + (nm ? "（" + esc(nm) + "）" : "") + "ではなく、まずは<b>" + esc(focus) + "</b>を操作してみましょう！";
    const t = now();
    if ((msg === lastHint && t - lastHintT < 4000) || t - lastHintT < 700) return;
    lastHint = msg; lastHintT = t;
    st.active.wrong++;
    bot(msg, "wrong");
    const box = $(".tc"); if (box) { box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake"); }
  }

  /* =====================================================================
     表示
     ===================================================================== */
  let ready = false, note = "", pulse = false, autoMin = false, seenEls = new WeakSet();

  function apply() {
    const c = chal();
    const b = document.body;
    b.classList.toggle("tr-on", !!c);
    b.classList.toggle("tr-guided", !!c && c.mode === "guided");
    b.classList.toggle("tr-chat", !!c && c.mode === "chat");
    if (!c || c.mode !== "guided") teardownSpot();
    if (!c || c.mode !== "chat") teardownChat();
    if (c && c.mode === "guided") buildSpot();
    if (c && c.mode === "chat") buildChat();
    updateBtn();
    render();
  }

  /* ---------- 上部バーの［トレーニング］ボタン ---------- */
  function addTopBtn() {
    const tr = $(".top-right"); if (!tr || $("#trBtn")) return;
    const bt = document.createElement("button");
    bt.type = "button"; bt.id = "trBtn"; bt.className = "tr-btn";
    bt.dataset.tip = "トレーニング（ガイドありのチュートリアル／ガイドなしの実践チャレンジ）を開きます。実践チャレンジ中は、通知センター（チャット）の表示・折りたたみを切り替えます。";
    bt.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c1.5 1.5 3.2 2.2 5 2.2s3.5-.7 5-2.2v-4.5"/><path d="M21 9v5"/></svg><span class="tr-lbl">トレーニング</span><span class="top-badge" hidden></span>';
    tr.insertBefore(bt, $("#alertBtn") || tr.firstChild);
    bt.addEventListener("click", () => {
      const c = chal();
      if (c && c.mode === "chat") { autoMin = false; setMin(!st.chatMin ? true : false); }
      else openHub();
    });
  }
  function updateBtn() {
    const bt = $("#trBtn"); if (!bt) return;
    const c = chal();
    const n = c && c.mode === "chat" ? (st.active.unread || 0) : 0;
    const bd = $(".top-badge", bt); bd.hidden = !n; bd.textContent = n > 9 ? "9+" : n;
    bt.classList.toggle("on", !!c);
    bt.setAttribute("aria-pressed", String(!!c && c.mode === "chat" && !st.chatMin));
    $(".tr-lbl", bt).textContent = c ? (c.mode === "chat" ? (st.chatMin ? "通知センター" : "折りたたむ") : "チュートリアル中") : "トレーニング";
  }

  /* ---------- スポットライト（ガイドありモード） ---------- */
  let spot = null, raf = 0, lastKey = "", findSince = 0;
  function buildSpot() {
    if (spot) return;
    spot = {};
    ["t", "b", "l", "r"].forEach((k) => { const d = document.createElement("div"); d.className = "sp-mask"; d.dataset.side = k; d.addEventListener("click", maskClick); document.body.appendChild(d); spot[k] = d; });
    spot.ring = document.createElement("div"); spot.ring.className = "sp-ring"; document.body.appendChild(spot.ring);
    spot.call = document.createElement("div"); spot.call.className = "sp-call"; spot.call.setAttribute("role", "dialog"); spot.call.setAttribute("aria-live", "polite");
    document.body.appendChild(spot.call);
    spot.call.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sp]"); if (!b) return;
      if (b.dataset.sp === "quit") quit();
      if (b.dataset.sp === "restart") restart();
    });
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", layout, true);
    window.addEventListener("orientationchange", layout);
    lastKey = ""; loop();
  }
  function teardownSpot() {
    if (!spot) return;
    cancelAnimationFrame(raf); raf = 0;
    ["t", "b", "l", "r", "ring", "call"].forEach((k) => spot[k] && spot[k].remove());
    window.removeEventListener("resize", layout);
    window.removeEventListener("scroll", layout, true);
    window.removeEventListener("orientationchange", layout);
    spot = null;
  }
  /* 毎フレーム：対象の位置・サイズ・画面サイズが変わったら再配置（アニメーション中のパネルにも追従） */
  function loop() {
    if (!spot) return;
    const el = resolveTarget(eff());
    const r = el ? el.getBoundingClientRect() : null;
    const key = r ? [r.left, r.top, r.width, r.height].map((v) => Math.round(v)).join(",") : "none";
    if (key + "|" + innerWidth + "x" + innerHeight !== lastKey) layout();
    if (!el && findSince && now() - findSince > 1500 && callKey.slice(-4) !== "lost") renderCallout();
    raf = requestAnimationFrame(loop);
  }
  function layout() {
    if (!spot) return;
    const s = eff();
    const el = resolveTarget(s);
    const W = innerWidth, H = innerHeight, pad = 6;
    let r = null;
    if (el) {
      const b = el.getBoundingClientRect();
      lastKey = [b.left, b.top, b.width, b.height].map((v) => Math.round(v)).join(",") + "|" + W + "x" + H;
      if (!seenEls.has(el)) {
        seenEls.add(el);
        if (b.top < 56 || b.bottom > H - 8) { try { el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" }); } catch (e) { el.scrollIntoView(); } }
      }
      r = { l: Math.max(0, b.left - pad), t: Math.max(0, b.top - pad), r: Math.min(W, b.right + pad), b: Math.min(H, b.bottom + pad) };
      if (r.r <= r.l || r.b <= r.t) r = null;
      findSince = 0;
    } else { lastKey = "none|" + W + "x" + H; if (!findSince) findSince = now(); }
    const set = (d, x, y, w, h) => { d.style.left = x + "px"; d.style.top = y + "px"; d.style.width = Math.max(0, w) + "px"; d.style.height = Math.max(0, h) + "px"; };
    if (r) {
      set(spot.t, 0, 0, W, r.t); set(spot.b, 0, r.b, W, H - r.b);
      set(spot.l, 0, r.t, r.l, r.b - r.t); set(spot.r, r.r, r.t, W - r.r, r.b - r.t);
      set(spot.ring, r.l, r.t, r.r - r.l, r.b - r.t); spot.ring.hidden = false;
    } else {
      set(spot.t, 0, 0, W, H); ["b", "l", "r"].forEach((k) => set(spot[k], 0, 0, 0, 0)); spot.ring.hidden = true;
    }
    placeCallout(r, W, H);
  }
  function placeCallout(r, W, H) {
    const c = spot.call;
    const cw = Math.min(340, W - 24);
    c.style.width = cw + "px";
    const ch = c.offsetHeight, gap = 14, m = 12;
    let x, y, pos;
    if (!r) { x = (W - cw) / 2; y = Math.max(m, (H - ch) / 2); pos = "none"; }
    else if (r.b + gap + ch <= H - m) { y = r.b + gap; pos = "below"; }
    else if (r.t - gap - ch >= m) { y = r.t - gap - ch; pos = "above"; }
    else if (r.r + gap + cw <= W - m) { x = r.r + gap; y = Math.min(Math.max(m, r.t), H - ch - m); pos = "right"; }
    else if (r.l - gap - cw >= m) { x = r.l - gap - cw; y = Math.min(Math.max(m, r.t), H - ch - m); pos = "left"; }
    else { y = r.t > H / 2 ? m : H - ch - m; pos = "none"; }
    if (x === undefined) x = Math.min(Math.max(m, (r.l + r.r) / 2 - cw / 2), W - cw - m);
    c.style.left = Math.round(x) + "px"; c.style.top = Math.round(y) + "px";
    c.dataset.pos = pos;
    if (r && (pos === "below" || pos === "above")) c.style.setProperty("--ax", Math.round(Math.min(Math.max(18, (r.l + r.r) / 2 - x), cw - 18)) + "px");
    if (r && (pos === "left" || pos === "right")) c.style.setProperty("--ay", Math.round(Math.min(Math.max(16, (r.t + r.b) / 2 - y), ch - 16)) + "px");
  }
  let callKey = "";
  function renderCallout() {
    const c = chal(), s = eff(); if (!spot || !c || !s) return;
    const i = st.active.i, n = c.steps.length;
    const lost = !resolveTarget(s) && findSince && now() - findSince > 1500;
    const key = [c.id, i, s.virtual ? "v" : "", note, lost ? "lost" : ""].join("|");
    if (key === callKey) return;
    callKey = key;
    spot.call.innerHTML = `<div class="sp-top"><span class="sp-badge">ガイドあり</span><span class="sp-n">チュートリアル ${Math.min(i + 1, n)} / ${n}</span></div>
      <div class="sp-prog"><i style="width:${(i / n) * 100}%"></i></div>
      <p class="sp-label">${esc(s.label)}</p>
      <p class="sp-say">${s.say}</p>
      ${note ? `<p class="sp-note">${note}</p>` : ""}
      ${lost ? `<p class="sp-note">操作する場所が見つかりません。画面を少し動かすか、［最初から］を押してください。</p>` : ""}
      <div class="sp-f"><button type="button" class="btn btn-text" data-sp="restart" data-tip="このチュートリアルを1手順目からやり直します。">最初から</button><button type="button" class="btn" data-sp="quit" data-tip="ガイドを終了して、自由に操作できる状態に戻します。">ガイドを終了</button></div>`;
    if (pulse && spot.ring) { spot.ring.classList.remove("go"); void spot.ring.offsetWidth; spot.ring.classList.add("go"); pulse = false; }
    lastKey = ""; // 吹き出しの高さが変わるので再配置
  }
  function maskClick() {
    if (!st.active) return;
    st.active.wrong++; save();
    const s = eff();
    note = "暗い部分は押せません。光っている<b>" + esc(s && s.focus ? s.focus : "場所") + "</b>を操作してください。";
    callKey = ""; renderCallout(); shakeCallout();
  }
  function shakeCallout() { if (!spot) return; callKey = ""; renderCallout(); spot.call.classList.remove("shake"); void spot.call.offsetWidth; spot.call.classList.add("shake"); }

  /* ---------- チャット風 通知センター（ガイドなしモード） ---------- */
  const AV = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#0b66f0"/><rect x="8" y="10" width="16" height="13" rx="4" fill="#fff"/><circle cx="13" cy="16.5" r="1.8" fill="#0b66f0"/><circle cx="19" cy="16.5" r="1.8" fill="#0b66f0"/><path d="M16 10V6.5" stroke="#fff" stroke-width="1.6"/><circle cx="16" cy="6" r="1.6" fill="#f2c14e"/></svg>';
  let chat = null, renderedLog = -1, statusKey = "";
  function buildChat() {
    if (chat) return;
    chat = document.createElement("aside");
    chat.className = "tc"; chat.setAttribute("aria-label", "トレーニング通知センター");
    chat.innerHTML = `<header class="tc-h"><span class="tc-av">${AV}</span><div class="tc-who"><b>トレーナー</b><small>実践チャレンジ・ガイドなし</small></div>
        <div class="tc-hb"><button type="button" data-tc="reset" aria-label="最初からやり直す" data-tip="このチャレンジを最初からやり直します。">↺</button><button type="button" data-tc="min" aria-label="折りたたむ" data-tip="通知センターを折りたたみます。右上の［通知センター］でいつでも開けます。">–</button><button type="button" data-tc="quit" aria-label="チャレンジをやめる" data-tip="このチャレンジをやめます。">×</button></div></header>
      <div class="tc-st"></div>
      <div class="tc-log" role="log" aria-live="polite"></div>
      <div class="tc-q"><button type="button" data-tc="hint" data-tip="今のタスクの具体的な場所を教えてもらいます（評価が少し下がります）。">💡 ヒント</button><button type="button" data-tc="status" data-tip="今の進み具合と、次にやることを確認します。">今の状況は？</button><button type="button" data-tc="reset" data-tip="このチャレンジを最初からやり直します。">最初からやり直す</button></div>`;
    document.body.appendChild(chat);
    chat.addEventListener("click", chatClick);
    renderedLog = -1; statusKey = "";
  }
  function teardownChat() {
    if (chat) { chat.remove(); chat = null; }
    document.body.classList.remove("tc-open");
    $$(".tc-peek").forEach((x) => x.remove());
  }
  function setMin(v) {
    st.chatMin = !!v;
    if (!v && st.active) st.active.unread = 0;
    save(); render(); updateBtn();
    if (!v && chat) { const lg = $(".tc-log", chat); lg.scrollTop = lg.scrollHeight; $$(".tc-peek").forEach((x) => x.remove()); }
  }
  function chatClick(e) {
    const b = e.target.closest("[data-tc]"); if (!b) return;
    const a = st.active, c = chal(); if (!a || !c) return;
    const k = b.dataset.tc;
    if (k === "min") { autoMin = false; setMin(true); return; }
    if (k === "close" || (k === "quit" && a.done)) { quit(true); return; }
    if (k === "hub") { quit(true); openHub(); return; }
    if (k === "go") { start(b.dataset.id); return; }
    if (a.done) return;
    if (k === "hint") { const s = eff(); a.hints++; log("me", "ヒントをください"); bot("💡 " + (s.hint || s.say), "hint"); return; }
    if (k === "status") { log("me", "今の状況は？"); bot(statusText(), "status"); return; }
    if (k === "reset") { log("me", "最初からやり直したい"); bot("最初からやり直しますか？ これまでの進み具合は消えます。<span class='tc-acts'><button type='button' class='btn btn-primary' data-tc='reset-yes'>はい、最初から</button><button type='button' class='btn' data-tc='no'>続ける</button></span>", "ask"); return; }
    if (k === "quit") { bot("このチャレンジをやめますか？<span class='tc-acts'><button type='button' class='btn btn-danger' data-tc='quit-yes'>やめる</button><button type='button' class='btn' data-tc='no'>続ける</button></span>", "ask"); return; }
    if (k === "reset-yes") { restart(); return; }
    if (k === "quit-yes") { quit(); return; }
    if (k === "no") { b.closest(".tc-acts").innerHTML = "<small class='muted'>続けます</small>"; markAsked(); return; }
  }
  function markAsked() { const L = st.active.log; for (let i = L.length - 1; i >= 0; i--) if (L[i].kind === "ask") { L[i].html = L[i].html.replace(/<span class='tc-acts'>[\s\S]*<\/span>$/, "<small class='muted'>→ 続けます</small>"); L[i].kind = "asked"; break; } save(); renderedLog = -1; render(); }
  function situation() {
    const h1 = $(".page-title h1, .site-head h1, #main h1");
    const parts = [(h1 ? h1.textContent.replace(/この画面の使い方/, "").trim() : document.title.replace(/\s*\|.*$/, "")) + " を表示中"];
    if ($(".panel")) parts.push("設定パネルを開いています");
    if ($(".modal:not(.tour)")) parts.push("確認画面を表示中");
    if ($(".status-banner.dirty")) parts.push("未保存の変更あり");
    else if ($(".status-banner.draft")) parts.push("未公開（保存済み）の変更あり");
    return parts.join("／");
  }
  function statusText() {
    const c = chal(), a = st.active, s = eff();
    return `<b>進み具合：</b>${a.i} / ${c.steps.length} タスク完了<br><b>現在の状況：</b>${esc(situation())}<br><b>次のタスク：</b>${s.say}`;
  }
  function renderChat() {
    const c = chal(), a = st.active;
    if (!chat || !c) return;
    const open = !st.chatMin;
    chat.hidden = !open;
    document.body.classList.toggle("tc-open", open);
    // 状況パネル（変化したときだけ書き換え）
    const s = a.done ? null : eff();
    const dots = c.steps.map((x, i) => `<i class="${i < a.i || a.done ? "ok" : i === a.i ? "cur" : ""}" title="${esc(x.label)}"></i>`).join("");
    const html = `<p class="tc-t">${esc(c.title)}</p><div class="tc-dots" aria-label="${a.done ? c.steps.length : a.i} / ${c.steps.length} タスク完了">${dots}<span>${a.done ? c.steps.length : a.i} / ${c.steps.length}</span></div>
      <dl><div><dt>現在の状況</dt><dd>${esc(situation())}</dd></div><div><dt>次のタスク</dt><dd>${a.done ? "クリア！ おつかれさまでした" : s.say}</dd></div></dl>`;
    if (html !== statusKey) { statusKey = html; $(".tc-st", chat).innerHTML = html; }
    // ログ（増えた分だけ追加）
    const lg = $(".tc-log", chat);
    if (renderedLog < 0 || renderedLog > a.log.length) { lg.innerHTML = ""; renderedLog = 0; }
    if (renderedLog < a.log.length) {
      const frag = document.createDocumentFragment();
      a.log.slice(renderedLog).forEach((m, k) => {
        const d = document.createElement("div");
        const fresh = renderedLog > 0 || a.log.length - k <= 3;
        d.className = "tc-m " + m.who + (m.kind ? " k-" + m.kind : "") + (fresh ? " in" : "");
        if (m.who === "sys") d.innerHTML = `<span>${m.html}</span>`;
        else if (m.who === "bot") d.innerHTML = `<span class="tc-av sm">${AV}</span><div class="tc-b">${m.html}</div><time>${hhmm(m.t)}</time>`;
        else d.innerHTML = `<time>既読<br>${hhmm(m.t)}</time><div class="tc-b">${m.html}</div>`;
        frag.appendChild(d);
      });
      lg.appendChild(frag);
      renderedLog = a.log.length;
      lg.scrollTop = lg.scrollHeight;
    }
    chat.classList.toggle("done", !!a.done);
    $$(".tc-q button", chat).forEach((b) => { b.disabled = !!a.done; });
  }
  function peek(html) {
    const bt = $("#trBtn"); if (!bt) return;
    $$(".tc-peek").forEach((x) => x.remove());
    const p = document.createElement("button");
    p.type = "button"; p.className = "tc-peek";
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const txt = tmp.textContent.replace(/\s+/g, " ").trim();
    p.innerHTML = `<span class="tc-av sm">${AV}</span><span>${esc(txt.length > 70 ? txt.slice(0, 69) + "…" : txt)}</span>`;
    document.body.appendChild(p);
    const r = bt.getBoundingClientRect();
    p.style.top = r.bottom + 8 + "px";
    p.style.right = Math.max(8, innerWidth - r.right) + "px";
    p.onclick = () => { autoMin = false; setMin(false); p.remove(); };
    setTimeout(() => { p.classList.add("out"); setTimeout(() => p.remove(), 250); }, 5200);
  }

  function render() {
    updateBtn();
    const c = chal();
    if (!c) return;
    if (c.mode === "guided") { renderCallout(); layout(); }
    else renderChat();
  }

  /* =====================================================================
     トレーニングセンター（課題の一覧）
     ===================================================================== */
  function closeHub() { $$(".tr-ov.hub").forEach((x) => x.remove()); }
  function openHub(opt = {}) {
    closeHub();
    const ov = document.createElement("div");
    ov.className = "tr-ov hub"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "trHubT");
    const a = st.active, ac = chal();
    const first = CH.find((x) => x.mode === "guided" && !st.cleared[x.id]);
    const card = (c) => {
      const cl = st.cleared[c.id];
      const req = c.requires && !st.cleared[c.requires] ? byId(c.requires) : null;
      const isG = c.mode === "guided";
      return `<article class="trc ${isG ? "g" : "c"} ${cl ? "cleared" : ""} ${req ? "locked" : ""}" data-id="${c.id}">
        <div class="trc-top"><span class="trc-mode">${isG ? "ガイドあり" : "ガイドなし"}</span><span class="trc-kind">${isG ? "チュートリアル" : "実践チャレンジ"}</span><span class="trc-lv" aria-label="難易度 ${c.level}">${"●".repeat(c.level)}${"○".repeat(3 - c.level)}</span></div>
        <h4>${esc(c.title)}</h4><p>${esc(c.goal)}</p>
        <div class="trc-f">${cl ? `<span class="trc-ok">クリア ${"★".repeat(cl.stars)}<span>${"★".repeat(3 - cl.stars)}</span></span>` : req ? `<span class="trc-req">🔒 先に「${esc(req.title)}」がおすすめ</span>` : `<span class="muted">${esc(c.est)}・${c.steps.length} 手順</span>`}
          <button type="button" class="btn ${cl ? "" : "btn-primary"}" data-start="${c.id}">${cl ? "もう一度" : req ? "それでも挑戦" : isG ? "はじめる" : "挑戦する"}</button></div></article>`;
    };
    ov.innerHTML = `<div class="tr-card">
      <button class="t-x tr-x" type="button" aria-label="閉じる" data-close>×</button>
      <p class="tr-eye">TRAINING CENTER</p><h2 id="trHubT">トレーニング</h2>
      <p class="tr-lead">まず<b>ガイドあり</b>で操作の流れを体験し、クリアしたら<b>ガイドなし</b>の実践チャレンジで、自分の力で同じ作業ができるか試します。</p>
      <div class="tr-modes">
        <div class="trm g"><b>① ガイドあり（チュートリアル）</b><span>画面が暗くなり、次に押す場所だけがスポットライトで光ります。光った場所を順に押すだけ。</span></div>
        <span class="trm-arr" aria-hidden="true">→</span>
        <div class="trm c"><b>② ガイドなし（実践チャレンジ）</b><span>右側の通知センター（チャット）に課題が届きます。間違えるとその場でヒント。いつでも最初からやり直せます。</span></div>
      </div>
      ${ac ? `<div class="tr-now"><b>進行中：</b>${esc(ac.title)}（${a.i} / ${ac.steps.length}）<span><button type="button" class="btn btn-primary" data-resume>続ける</button><button type="button" class="btn" data-stop>やめる</button></span></div>`
        : opt.welcome && first ? `<div class="tr-now welcome"><b>はじめての方へ：</b>まずは「${esc(first.title)}」のチュートリアルから始めましょう。<span><button type="button" class="btn btn-primary" data-start="${first.id}">チュートリアルを始める</button></span></div>` : ""}
      ${DATA.tracks.map((t) => { const list = CH.filter((c) => c.track === t.id); if (!list.length) return ""; return `<section class="tr-track"><h3>${esc(t.title)}</h3><p class="muted">${esc(t.lead)}</p>
        <div class="tr-path">${list.map((c, i) => (i ? `<span class="tr-up" aria-hidden="true"><i>ステップ<br>アップ</i>→</span>` : "") + card(c)).join("")}</div></section>`; }).join("")}
      <div class="tr-foot"><button type="button" class="btn btn-text" data-wipe data-tip="トレーニングのクリア記録だけを消します（ルールなどの研修データは残ります）。">クリア記録をリセット</button><span class="muted">${Object.keys(st.cleared).length} / ${CH.length} クリア</span><button type="button" class="btn" data-close>閉じる</button></div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest("[data-close]")) { closeHub(); return; }
      const s = e.target.closest("[data-start]");
      if (s) {
        const c = byId(s.dataset.start);
        if (st.active && st.active.id !== c.id) quit(true);
        start(c.id); return;
      }
      if (e.target.closest("[data-resume]")) { closeHub(); if (chal() && chal().mode === "chat") setMin(false); return; }
      if (e.target.closest("[data-stop]")) { quit(); closeHub(); return; }
      if (e.target.closest("[data-wipe]")) { st.cleared = {}; save(); openHub(); }
    });
    ov.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHub(); });
    const f = $(opt.welcome ? ".tr-now [data-start]" : "[data-close]", ov); if (f) f.focus();
  }

  /* ---------- クリア画面（ガイドあり → ガイドなしへのステップアップ） ---------- */
  function closeClear() { $$(".tr-ov.clear").forEach((x) => x.remove()); }
  function showClear(c, r, nx) {
    closeClear();
    const ov = document.createElement("div");
    ov.className = "tr-ov clear"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "trClrT");
    const step = nx && nx.mode === "chat";
    ov.innerHTML = `<div class="tr-card sm">
      <div class="tr-medal" aria-hidden="true">✓</div>
      <p class="tr-eye">TUTORIAL CLEAR</p><h2 id="trClrT">チュートリアル クリア！</h2>
      <p class="tr-sub">${esc(c.title)}</p>
      ${resultCard(c, r)}
      <p class="tr-outro">${esc(c.outro)}</p>
      ${nx ? `<div class="tr-next ${step ? "step" : ""}"><p class="tr-next-h">${step ? "次はガイドなしで挑戦してみよう！" : "次の課題"}</p>
        <b>${esc(nx.title)}</b><span>${esc(nx.goal)}</span>
        ${step ? `<small>今度はスポットライトは出ません。右側の通知センターに届く課題を見ながら、自分で操作します。迷ったら［ヒント］が使えます。</small>` : ""}</div>` : ""}
      <div class="tr-foot">${nx ? `<button type="button" class="btn btn-primary" data-go="${nx.id}">${step ? "ガイドなしで挑戦する" : "次の課題へ"}</button>` : ""}<button type="button" class="btn" data-hub>トレーニング一覧</button><button type="button" class="btn btn-text" data-close>閉じる</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest("[data-close]")) { closeClear(); return; }
      const g = e.target.closest("[data-go]"); if (g) { start(g.dataset.go); return; }
      if (e.target.closest("[data-hub]")) { closeClear(); openHub(); }
    });
    ov.addEventListener("keydown", (e) => { if (e.key === "Escape") closeClear(); });
    const f = $("[data-go], [data-hub]", ov); if (f) f.focus();
  }

  /* ---------------- 起動時：最初の案内を誰が出すか ---------------- */
  function claimsStartup() {
    if (!document.body.dataset.tab) return false;
    if (st.active) return true;
    if (!st.offered && App.db.get("tourSeen", null)) {
      st.offered = true; save();
      setTimeout(() => openHub({ welcome: true }), 60);
      return true;
    }
    return false;
  }

  /* ---------------- 監視 ---------------- */
  const queue = [];
  App.on("*", (d, name) => { if (!ready) { queue.push([name, d]); return; } onEvent(name, d); });
  const OWN = ".tc, .tc-peek, .sp-mask, .sp-ring, .sp-call, .tr-ov, .toasts, .tipbox, .confetti";
  let moRaf = 0;
  const mo = new MutationObserver((recs) => {
    if (!st.active || moRaf) return;
    if (recs.every((r) => { const t = r.target.nodeType === 1 ? r.target : r.target.parentElement; return t && t.closest && t.closest(OWN); })) return;
    moRaf = requestAnimationFrame(() => { moRaf = 0; tick(); });
  });
  function init() {
    if (!document.body.dataset.tab) { queue.length = 0; return; }
    addTopBtn();
    ready = true;
    apply();
    queue.splice(0).forEach(([n, d]) => onEvent(n, d));
    schedule();
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "disabled", "hidden"] });
    document.addEventListener("click", onClick, true);
    document.addEventListener("input", () => { lastInput = now(); if (st.active) later(((curStep() || {}).hold || 0) + 40); }, true);
    document.addEventListener("change", () => { lastInput = now(); schedule(); }, true);
    window.addEventListener("resize", () => { if (chat) render(); });
    window.addEventListener("storage", (e) => {
      if (e.key !== "kmcTrainer.v2." + KEY) return;
      const fresh = App.db.get(KEY, null); if (!fresh) return;
      const same = JSON.stringify(fresh.active && [fresh.active.id, fresh.active.i]) === JSON.stringify(st.active && [st.active.id, st.active.i]);
      st = Object.assign({ active: null, cleared: {}, offered: false, chatMin: false }, fresh);
      if (!same) { renderedLog = -1; callKey = ""; }
      apply();
    });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));

  App.trainer = {
    data: DATA, start, restart, quit, openHub, claimsStartup,
    state: () => JSON.parse(JSON.stringify(st)),
    step: () => eff(),
    layout
  };
})();
