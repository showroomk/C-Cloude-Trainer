/* =====================================================================
   KMC Trainer 共通スクリプト
   - 画面の枠（上部タブ・左メニュー）の描画
   - 学習データの保存（localStorage。使えない環境ではページ内メモリ）
   - トースト / モーダル / 右パネル / ポップアップメニュー
   - ポリシー画面エンジン（Apply → Save → Publish / Discard / Compare）
   - 研修ミッション
   ===================================================================== */
(function () {
  "use strict";
  const App = (window.App = {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  App.$ = $; App.$$ = $$;

  /* ---------------- イベントバス（トレーニング機能が画面の操作を受け取る） ----------------
     App.on("policy:apply", fn) / App.on("*", fn(name, data)) / App.emit(name, data) */
  const BUS = {};
  App.on = (name, fn) => { (BUS[name] = BUS[name] || []).push(fn); return () => { BUS[name] = BUS[name].filter((f) => f !== fn); }; };
  App.emit = (name, data = {}) => {
    (BUS[name] || []).forEach((fn) => { try { fn(data, name); } catch (e) { console.error(e); } });
    (BUS["*"] || []).forEach((fn) => { try { fn(data, name); } catch (e) { console.error(e); } });
  };
  const trainingOn = () => document.body && document.body.classList.contains("tr-on");
  App.trainingOn = trainingOn;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  App.esc = esc;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  App.clone = clone;
  const uid = () => "x" + Math.random().toString(36).slice(2, 9);
  App.uid = uid;

  /* ---------------- 保存 ---------------- */
  const PREFIX = "kmcTrainer.v2.";
  const mem = {};
  App.db = {
    get(key, seed) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        if (v !== null) return JSON.parse(v);
      } catch (e) { if (key in mem) return clone(mem[key]); }
      if (key in mem) return clone(mem[key]);
      const s = typeof seed === "function" ? seed() : seed;
      if (s === undefined || s === null) return s;
      App.db.set(key, s);
      return clone(s);
    },
    set(key, value) {
      mem[key] = clone(value);
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* メモリのみ */ }
    },
    resetAll() {
      Object.keys(mem).forEach((k) => delete mem[k]);
      try {
        Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* noop */ }
    }
  };

  App.trainee = () => App.db.get("trainee", { name: "研修 太郎", email: "trainee@example.com" });

  /* ---------------- 日時 ---------------- */
  const pad = (n) => String(n).padStart(2, "0");
  App.fmt = (t) => { const d = new Date(t); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  App.fmtShort = (t) => { const d = new Date(t); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------------- アイコン ---------------- */
  const P = {
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    table: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 10h16M10 10v9"/>',
    nodes: '<circle cx="12" cy="6" r="2.2"/><circle cx="6" cy="17" r="2.2"/><circle cx="18" cy="17" r="2.2"/><path d="M12 8.2v3M10.5 12.5l-3 3M13.5 12.5l3 3"/>',
    grid: '<path d="M5 5h3v3H5zM10.5 5h3v3h-3zM16 5h3v3h-3zM5 10.5h3v3H5zM10.5 10.5h3v3h-3zM16 10.5h3v3h-3zM5 16h3v3H5zM10.5 16h3v3h-3zM16 16h3v3h-3z"/>',
    route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8"/>',
    list: '<path d="M5 6h14M5 12h14M5 18h14"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/>',
    hex: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>',
    check: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
    site: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 2 6 5.5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5S9.5 6.1 12 3.5z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    fire: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.8 2.5-5 .3 1.6 1 2.6 2 3 0-3 .5-5.5.5-8z"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
    ip: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9v6M11 15V9h2.5a1.8 1.8 0 0 1 0 3.6H11"/>',
    key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L19 4M16 7l2 2M14 9l2 2"/>',
    admin: '<circle cx="10" cy="8" r="3.5"/><path d="M3 20c0-3.9 3.1-7 7-7 1.4 0 2.6.4 3.7 1"/><circle cx="18" cy="17" r="2.5"/><path d="M18 13v1.5M18 19.5V21M14 17h1.5M20.5 17H22"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    refresh: '<path d="M19 8a8 8 0 1 0 1 5"/><path d="M19 3v5h-5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>',
    alert: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v5M12 16h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    locate: '<circle cx="12" cy="12" r="5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    shrink: '<path d="M14 10l6-6M14 10h4.5M14 10V5.5M10 14l-6 6M10 14H5.5M10 14v4.5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    socket: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 12h.01M10 12h.01M14 12h3"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-1 8.5z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8M8 11h6"/>'
  };
  App.icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.list}</svg>`;

  /* ---------------- ナビゲーション定義 ----------------
     href が null の項目は「研修版では未収録」としてトースト表示 */
  const NAV = {
    monitoring: { label: "Monitoring", home: "topology.html", sections: [
      { t: "INVESTIGATION", items: [
        ["topology", "Topology", "topology.html", "target"], ["events", "Events", "events.html", "bars"],
        ["sites-overview", "Sites Overview", "sites-overview.html", "table"], ["sdp-overview", "SDP Users Overview", "sdp-overview.html", "nodes"],
        ["app-analytics", "App Analytics", "app-analytics.html", "grid"], ["routing-table", "Routing Table", "routing-table.html", "route"],
        ["audit-trail", "Audit Trail", "audit-trail.html", "list"]] },
      { t: "DASHBOARDS", items: [
        ["security-threats", "Security Threats", "security-threats.html", "shield"], ["mitre", "MITRE ATT&CK", "mitre.html", "shield"], ["cloud-apps", "Cloud Apps", "cloud-apps.html", "hex"],
        ["dlp-dashboard", "DLP", "dlp-dashboard.html", "shield"], ["saas-security", "SaaS Security API", "saas-security.html", "shield"], ["sdp-dashboard", "SDP Users", "sdp-dashboard.html", "nodes"], ["network-dashboard", "Network Dashboard", "network-dashboard.html", "grid"]] },
      { t: "PRACTICES ASSESSMENT", items: [["best-practices", "Best Practices", "best-practices.html", "check"]] },
      { t: "DETECTION & RESPONSE", items: [["stories-dashboard", "Stories Dashboard", "stories-dashboard.html", "table"], ["stories-workbench", "Stories Workbench", "stories-workbench.html", "shield"]] }
    ] },
    network: { label: "Network", home: "sites.html", sections: [
      { t: "SITES", items: [["sites", "Sites", "sites.html", "site"], ["groups", "Groups", "groups.html", "grid"]] },
      { t: "ROUTING & OPTIMIZATION", items: [
        ["network-rules", "Network Rules", "network-rules.html", "route"],
        ["bandwidth", "Bandwidth Management", "bandwidth.html", "gauge"],
        ["ip-allocation", "IP Allocation", "ip-allocation.html", "ip"],
        ["dns", "DNS Settings", "dns-settings.html", "globe"]] }
    ] },
    access: { label: "Access", home: "users.html", sections: [
      { t: "USERS", items: [["users", "Users", "users.html", "users"], ["directory", "Directory Services", "directory-services.html", "nodes"]] },
      { t: "CLIENT POLICIES", items: [
        ["client-connectivity", "Client Connectivity Policy", "client-connectivity.html", "key"],
        ["posture", "Device Posture", "device-posture.html", "check"]] }
    ] },
    security: { label: "Security", home: "internet-firewall.html", sections: [
      { t: "KATO FIREWALLS", items: [
        ["internet-firewall", "Internet Firewall", "internet-firewall.html", "fire"],
        ["wan-firewall", "WAN Firewall", "wan-firewall.html", "fire"]] },
      { t: "THREAT PROTECTION", items: [
        ["tls", "TLS Inspection", "tls-inspection.html", "lock"],
        ["threat", "Threat Prevention", "threat-prevention.html", "shield"], ["casb", "Application Control", "app-control.html", "hex"], ["dlp", "Data Protection", "data-protection.html", "shield"]] }
    ] },
    assets: { label: "Assets", home: "device-inventory.html", sections: [
      { t: "ASSETS", items: [["device-inventory", "Device Inventory", "device-inventory.html", "grid"]] }
    ] },
    administration: { label: "Administration", home: "administrators.html", sections: [
      { t: "ADMINISTRATION", items: [
        ["administrators", "Administrators", "administrators.html", "admin"],
        ["license", "License", "license.html", "key"], ["api", "API Keys", "api-keys.html", "key"]] },
      { t: "TRAINING", items: [["whats-new", "What's New", "whats-new.html", "bell"]] }
    ] }
  };
  App.NAV = NAV;
  /* 左ナビの表示名（カタカナ）。データ上は英語名のまま持ち、表示とツールチップで使い分ける */
  const KANA = {"INVESTIGATION": "インベスティゲーション", "DASHBOARDS": "ダッシュボード", "PRACTICES ASSESSMENT": "プラクティス・アセスメント", "DETECTION & RESPONSE": "ディテクション・アンド・レスポンス", "SITES": "サイト", "ROUTING & OPTIMIZATION": "ルーティング・アンド・オプティマイゼーション", "USERS": "ユーザー", "CLIENT POLICIES": "クライアント・ポリシー", "THREAT PROTECTION": "スレット・プロテクション", "ASSETS": "アセット", "ADMINISTRATION": "アドミニストレーション", "TRAINING": "トレーニング", "SITE MONITORING": "サイト・モニタリング", "SITE CONFIGURATION": "サイト・コンフィギュレーション", "Topology": "トポロジー", "Events": "イベント", "Sites Overview": "サイト・オーバービュー", "SDP Users Overview": "エスディーピーユーザー・オーバービュー", "App Analytics": "アプリ・アナリティクス", "Routing Table": "ルーティング・テーブル", "Audit Trail": "オーディット・トレイル", "Security Threats": "セキュリティ・スレット", "MITRE ATT&CK": "マイター・アタック", "Cloud Apps": "クラウド・アプリ", "DLP": "ディーエルピー", "SaaS Security API": "サース・セキュリティ・エーピーアイ", "SDP Users": "エスディーピーユーザー", "Network Dashboard": "ネットワーク・ダッシュボード", "Best Practices": "ベスト・プラクティス", "Stories Dashboard": "ストーリーズ・ダッシュボード", "Stories Workbench": "ストーリーズ・ワークベンチ", "Sites": "サイト", "Groups": "グループ", "Network Rules": "ネットワーク・ルール", "Bandwidth Management": "バンドウィドス・マネジメント", "IP Allocation": "アイピー・アロケーション", "DNS Settings": "ディーエヌエス・セッティング", "Users": "ユーザー", "Directory Services": "ディレクトリ・サービス", "Client Connectivity Policy": "クライアント・コネクティビティ・ポリシー", "Device Posture": "デバイス・ポスチャー", "Internet Firewall": "インターネット・ファイアウォール", "WAN Firewall": "ワン・ファイアウォール", "TLS Inspection": "ティーエルエス・インスペクション", "Threat Prevention": "スレット・プリベンション", "Application Control": "アプリケーション・コントロール", "Data Protection": "データ・プロテクション", "Device Inventory": "デバイス・インベントリー", "Administrators": "アドミニストレーター", "License": "ライセンス", "API Keys": "エーピーアイ・キー", "What's New": "ワッツ・ニュー", "All Sites": "オール・サイト", "Snapshot": "スナップショット", "Network Analytics": "ネットワーク・アナリティクス", "Real-Time": "リアルタイム", "General": "ジェネラル", "Sokket": "ソケット", "Networks": "ネットワーク", "High Availability": "ハイ・アベイラビリティ", "KATO FIREWALLS": "ファイアウォール"};
  App.KANA = KANA;
  App.kana = (label) => KANA[label] || label;
  const sideTip = (label) => { const t = (typeof TIPS !== "undefined" && TIPS[label]) || ""; return (t ? t + "\n" : "") + "（英語表記：" + label + "）"; };
  App.sideTip = sideTip;

  function renderShell() {
    const body = document.body;
    const tab = body.dataset.tab;
    const page = body.dataset.page;
    const main = $("#main");
    if (!main || !tab) return;

    const top = document.createElement("header");
    top.className = "topbar";
    top.innerHTML = `
      <button class="top-ico menu-btn" id="menuBtn" type="button" aria-label="メニューを開く">${App.icon("menu")}</button>
      <a class="logo" href="topology.html" title="KMC Trainer（学習用）"><b>KMC TRAINER</b><small>学習用シミュレーター</small></a>
      <button class="apps-btn" type="button" id="appsBtn" aria-label="アプリ一覧" data-tip="すべての画面への近道を表示します。">${App.icon("grid")}</button>
      <nav class="tabs" aria-label="メインメニュー">
        ${Object.entries(NAV).map(([k, v]) => `<a href="${v.home}" class="${k === tab ? "active" : ""}">${v.label}</a>`).join("")}
      </nav>
      <div class="top-right">
        <a class="guide-btn" href="guide.html" data-tip="図解の操作要領（手順書）を開きます。まず必須でやることも載っています。">${App.icon("book")}<span>操作要領</span></a>
        <span class="train-pill" data-tip="これは実機ではなく、練習用のシミュレーターです。">TRAINING</span>
        <a class="whatsnew" href="whats-new.html" data-tip="新機能・変更点のお知らせを表示します（研修版では研修サイトの更新履歴）。">What's New</a>
        <button class="top-ico" type="button" id="alertBtn" aria-label="アラート" data-tip="アカウントの重要なお知らせ（切断中の拠点など）を表示します。">${App.icon("alert")}<span class="top-badge" id="alertBadge" hidden></span></button>
        <button class="top-ico" type="button" id="bellBtn" aria-label="通知" data-tip="最近の通知（設定変更・ミッション達成など）を表示します。未読の数がバッジに出ます。">${App.icon("bell")}<span class="top-badge" id="bellBadge" hidden></span></button>
        <button class="top-ico" type="button" id="helpBtn" aria-label="画面の見方" data-tip="画面の見方と、まず最初にやることをもう一度表示します。">${App.icon("help")}</button>
      </div>`;
    body.insertBefore(top, body.firstChild);

    const side = document.createElement("aside");
    side.className = "sidebar";
    side.id = "sidebar";
    const custom = typeof App.customSidebar === "function" ? App.customSidebar() : null;
    side.innerHTML = `<button class="side-toggle" type="button" id="sideToggle" aria-label="メニューを閉じる">${App.icon("menu")}</button>` +
      (custom || NAV[tab].sections.map((s) => `
        <div class="side-sec"><h6 title="${esc(s.t)}">${esc(App.kana(s.t))}</h6>
          ${s.items.map(([id, label, href, ic]) => href
            ? `<a class="side-item ${id === page ? "active" : ""}" href="${href}" data-tip="${esc(sideTip(label))}">${App.icon(ic)}<span>${esc(App.kana(label))}</span></a>`
            : `<button type="button" class="side-item na" data-na="${esc(App.kana(label))}" data-tip="${esc(sideTip(label))}">${App.icon(ic)}<span>${esc(App.kana(label))}</span></button>`).join("")}
        </div>`).join(""));
    body.insertBefore(side, main);

    // パンくず
    const crumb = body.dataset.crumb;
    if (crumb) {
      const c = document.createElement("div");
      c.className = "crumb";
      c.innerHTML = `<a href="index.html">Accounts</a><span class="sep">/</span>${crumb}`;
      main.insertBefore(c, main.firstChild);
    }
    const note = document.createElement("p");
    note.className = "foot-note";
    note.innerHTML = "KMC Trainer は操作の流れを学ぶための<b>非公式・非営利の学習用シミュレーター</b>です。特定の製品ベンダーとは一切関係がなく、承認・監修も受けていません。名称・画面・番号・データはすべて架空のダミーです。実際の作業の判断根拠にせず、必ず公式ドキュメントを確認してください。<a href=\"disclaimer.html\">免責事項・ご利用条件</a>";
    main.appendChild(note);

    document.addEventListener("click", (e) => {
      const na = e.target.closest("[data-na]");
      if (na) { e.preventDefault(); App.toast(`「${na.dataset.na || na.textContent.trim() || "この機能"}」は研修版では未収録です（実機には存在します）。`, "warn"); }
    });
    $("#helpBtn").addEventListener("click", () => App.tour());
    $("#appsBtn").addEventListener("click", (e) => App.flyout(e.currentTarget, "すべての画面", Object.values(NAV).map((v) => `<div class="fly-sec"><b>${v.label}</b>${v.sections.flatMap((s) => s.items).map(([, l, h]) => `<a href="${h}">${esc(App.kana(l))}</a>`).join("")}</div>`).join(""), "wide"));
    const down = App.sites().filter((x) => x.status !== "Connected");
    if (down.length) { $("#alertBadge").hidden = false; $("#alertBadge").textContent = down.length; }
    $("#alertBtn").addEventListener("click", (e) => App.flyout(e.currentTarget, "Account Alerts", down.length ? down.map((x) => `<a class="fly-item" href="site.html" data-sel="${x.id}"><span class="dot ${x.status === "Disconnected" ? "ng" : "warn"}"></span><span><b>${esc(x.name)}</b> は ${x.status === "Disconnected" ? "切断中です" : "Sokket 未接続です"}<small>${x.status === "Disconnected" ? "Snapshot で原因を確認してください" : "現地で Sokket を接続してください"}</small></span></a>`).join("") : '<p class="muted" style="padding:10px 14px">重要なお知らせはありません。</p>'));
    $("#bellBtn").addEventListener("click", (e) => openBell(e.currentTarget));
    updateBell();
    document.addEventListener("click", (e) => { const a = e.target.closest("[data-sel]"); if (a) App.db.set("selectedSite", a.dataset.sel); });
    $("#menuBtn").addEventListener("click", () => body.classList.toggle("side-open"));
    $("#sideToggle").addEventListener("click", () => {
      if (matchMedia("(max-width: 900px)").matches) body.classList.remove("side-open");
      else App.toast("サイドメニューの折りたたみは研修版では省略しています。", "warn");
    });
    main.addEventListener("click", () => body.classList.remove("side-open"));
  }

  /* ---------------- トースト（リッチ版） ----------------
     App.toast(本文, 種類 ok|warn|ng|info|mission, 表示ms, { title, action:{label,href|run}, icon }) */
  const TOAST_ICON = { ok: "check", warn: "alert", ng: "alert", info: "help", mission: "flag" };
  const TOAST_TITLE = { ok: "完了", warn: "次の操作が必要です", ng: "確認してください", info: "お知らせ", mission: "ミッション達成" };
  App.toast = (msg, type = "ok", ms = 4200, opt = {}) => {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    // 同じグループの古いトーストは置き換える（重なりすぎ防止）
    (opt.clear || []).concat(opt.group ? [opt.group] : []).forEach((g) => $$(`.toast[data-group="${g}"]`, box).forEach((x) => x.remove()));
    while (box.children.length >= 3) box.firstElementChild.remove();
    const t = document.createElement("div");
    t.className = "toast " + type;
    if (opt.group) t.dataset.group = opt.group;
    const title = opt.title === undefined ? TOAST_TITLE[type] : opt.title;
    t.innerHTML = `<span class="t-ico">${App.icon(opt.icon || TOAST_ICON[type] || "check")}</span>
      <div class="t-body">${title ? `<b class="t-title">${esc(title)}</b>` : ""}<div class="t-msg">${msg}</div>${opt.action ? `<a class="t-act" href="${opt.action.href || "#"}">${esc(opt.action.label)} →</a>` : ""}</div>
      <button class="t-x" type="button" aria-label="閉じる">×</button><i class="t-bar" style="animation-duration:${ms}ms"></i>`;
    box.appendChild(t);
    const kill = () => { if (!t.isConnected) return; t.classList.add("out"); setTimeout(() => t.remove(), 220); };
    t.querySelector(".t-x").addEventListener("click", kill);
    if (opt.action && opt.action.run) t.querySelector(".t-act").addEventListener("click", (e) => { e.preventDefault(); opt.action.run(); kill(); });
    const bar = t.querySelector(".t-bar");
    bar.addEventListener("animationend", kill);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(kill, ms);
    return t;
  };

  /* ---------------- 紙吹雪（成功演出） ---------------- */
  App.confetti = (x, y, n = 90, spread = 1) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas");
    c.className = "confetti"; c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const g = c.getContext("2d");
    const cols = ["#0b66f0", "#3fa6c2", "#e58a00", "#f2c14e", "#6d86a2", "#d6333b", "#7a5bc0"];
    if (x == null) { x = innerWidth / 2; y = innerHeight / 3; }
    const ps = Array.from({ length: n }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2 * spread, v = 5 + Math.random() * 7;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] };
    });
    const t0 = performance.now();
    (function frame(t) {
      const k = (t - t0) / 1700;
      g.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => { p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); });
      if (k < 1) requestAnimationFrame(frame); else c.remove();
    })(t0);
  };
  App.burstFrom = (el, n) => { if (!el || !el.getBoundingClientRect) return App.confetti(null, null, n); const r = el.getBoundingClientRect(); App.confetti(r.left + r.width / 2, r.top + r.height / 2, n); };

  /* ---------------- 通知センター（ベル） ---------------- */
  App.notify = (n) => {
    const list = App.db.get("notifs", seedNotifs);
    list.unshift(Object.assign({ t: Date.now(), read: false, kind: "ok" }, n));
    App.db.set("notifs", list.slice(0, 60));
    updateBell();
  };
  function seedNotifs() {
    const now = Date.now();
    return [{ t: now - 2.6 * 3600e3, title: "AWS-TKY-VPC が切断されました", body: "Snapshot で原因を確認してください。", href: "site.html", kind: "ng", read: false, sel: "s3" },
      { t: now - 20 * 3600e3, title: "Internet Firewall：Revision #3 が公開されました", body: "yamada.admin@example.co.jp", href: "audit-trail.html", kind: "ok", read: true }];
  }
  function updateBell() {
    const b = $("#bellBadge"); if (!b) return;
    const n = App.db.get("notifs", seedNotifs).filter((x) => !x.read).length;
    b.hidden = !n; b.textContent = n > 9 ? "9+" : n;
    const bell = $("#bellBtn"); if (bell) { bell.classList.remove("ring"); void bell.offsetWidth; if (n) bell.classList.add("ring"); }
  }
  App.updateBell = updateBell;
  function openBell(anchor) {
    const list = App.db.get("notifs", seedNotifs);
    App.flyout(anchor, "Notifications", (list.length ? list.slice(0, 12).map((x, i) => `<a class="fly-item ${x.read ? "" : "unread"}" href="${x.href || "#"}" data-ni="${i}" ${x.sel ? `data-sel="${x.sel}"` : ""}><span class="dot ${x.kind === "ng" ? "ng" : x.kind === "mission" ? "warn" : "ok"}"></span><span><b>${esc(x.title)}</b>${x.body ? `<small>${esc(x.body)}</small>` : ""}<small>${App.fmtShort(x.t)}</small></span></a>`).join("") : '<p class="muted" style="padding:10px 14px">通知はありません。</p>') +
      '<div class="fly-foot"><button class="btn btn-text" type="button" id="readAll">すべて既読にする</button><a class="fly-more" href="audit-trail.html">Audit Trail →</a></div>');
    const f = $(".flyout");
    if (!f) return;
    f.addEventListener("click", (e) => {
      const it = e.target.closest("[data-ni]");
      if (it) { const l = App.db.get("notifs", seedNotifs); if (l[+it.dataset.ni]) { l[+it.dataset.ni].read = true; App.db.set("notifs", l); } updateBell(); if (it.getAttribute("href") === "#") e.preventDefault(); }
      if (e.target.closest("#readAll")) { const l = App.db.get("notifs", seedNotifs); l.forEach((x) => (x.read = true)); App.db.set("notifs", l); updateBell(); $$(".fly-item.unread", f).forEach((x) => x.classList.remove("unread")); }
    });
  }

  /* ---------------- モーダル（confirm の代わり） ---------------- */
  App.modal = ({ title, body, ok = "OK", cancel = "Cancel", danger = false, onOk }) => {
    const m = document.createElement("div");
    m.className = "modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="modal-card"><h3>${esc(title)}</h3><div class="mb">${body}</div>
      <div class="mf">${cancel ? `<button class="btn" data-c>${esc(cancel)}</button>` : ""}<button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-o>${esc(ok)}</button></div></div>`;
    document.body.appendChild(m);
    App.emit("modal:open", { title });
    const close = () => m.remove();
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.hasAttribute("data-c")) close();
      if (e.target.hasAttribute("data-o")) { close(); onOk && onOk(); }
    });
    m.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    $("[data-o]", m).focus();
  };

  /* ---------------- ポップアップメニュー ---------------- */
  App.pop = (anchor, items) => {
    $$(".pop").forEach((p) => p.remove());
    const p = document.createElement("div");
    p.className = "pop";
    p.innerHTML = items.map((it, i) => `<button type="button" data-i="${i}" class="${it.danger ? "danger" : ""}">${esc(it.label)}</button>`).join("");
    document.body.appendChild(p);
    const r = anchor.getBoundingClientRect();
    const w = p.offsetWidth;
    p.style.top = Math.min(r.bottom + 4, innerHeight - p.offsetHeight - 8) + "px";
    p.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
    const off = (e) => { if (!p.contains(e.target)) { p.remove(); document.removeEventListener("mousedown", off); } };
    setTimeout(() => document.addEventListener("mousedown", off));
    p.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      p.remove(); document.removeEventListener("mousedown", off);
      items[+b.dataset.i].run();
    });
  };

  /* ---------------- フォーム部品 ----------------
     field: {key,label,type:text|select|picker|toggle|textarea|number|info, options, help, req, showIf(model), rerender} */
  function fieldHTML(f, model) {
    const v = model[f.key];
    const id = "f_" + f.key;
    const opts = typeof f.options === "function" ? f.options(model) : (f.options || []);
    const lab = `<label for="${id}" class="${f.req ? "req" : ""}">${esc(f.label)}</label>`;
    const help = f.help ? `<span class="help">${f.help}</span>` : "";
    switch (f.type) {
      case "info": return `<div class="tip">${f.html}</div>`;
      case "toggle":
        return `<div class="field"><label class="switch"><input type="checkbox" id="${id}" data-k="${f.key}" ${v ? "checked" : ""}><span class="track"></span>${esc(f.label)}</label>${help}</div>`;
      case "check":
        return `<div class="field"><label class="check"><input type="checkbox" id="${id}" data-k="${f.key}" ${v ? "checked" : ""}>${esc(f.label)}</label>${help}</div>`;
      case "select":
        return `<div class="field">${lab}<select class="select" id="${id}" data-k="${f.key}">${opts.map((o) => {
          const [val, txt] = Array.isArray(o) ? o : [o, o];
          return `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(txt)}</option>`;
        }).join("")}</select>${help}</div>`;
      case "textarea":
        return `<div class="field">${lab}<textarea class="input" id="${id}" data-k="${f.key}">${esc(v)}</textarea>${help}</div>`;
      case "picker": {
        const arr = Array.isArray(v) ? v : [];
        return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="picker" data-pk="${f.key}">
          <div class="chips">${arr.length ? arr.map((x, i) => `<span class="chip">${esc(x)}<button type="button" data-rm="${i}" aria-label="${esc(x)}を削除">×</button></span>`).join("") : `<span class="chip any">${esc(f.anyLabel || "Any")}</span>`}</div>
          <div class="picker-add"><select class="select" id="${id}" aria-label="${esc(f.label)}を追加"><option value="">＋ 追加する対象を選択…</option>${opts.filter((o) => !arr.includes(o)).map((o) => `<option>${esc(o)}</option>`).join("")}</select></div>
          </div>${help}</div>`;
      }
      default:
        return `<div class="field">${lab}<input class="input" id="${id}" data-k="${f.key}" type="${f.type === "number" ? "number" : "text"}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" autocomplete="off">${help}</div>`;
    }
  }
  function summarize(sec, model) {
    if (sec.summary) return sec.summary(model);
    const vals = sec.fields.filter((f) => f.type === "picker").map((f) => (model[f.key] || []).length ? model[f.key].join(", ") : "Any");
    if (vals.length) return vals.join(" / ");
    const s = sec.fields.find((f) => f.type === "select");
    return s ? (Array.isArray(model[s.key]) ? "" : model[s.key]) : "";
  }

  /* ---------------- 右側パネル ----------------
     App.panel({title, model, sections:[{title, fields, open}], applyLabel, onApply(model)→bool, onDelete, extraFooter}) */
  App.panel = (cfg) => {
    App.closePanel();
    const model = cfg.model;
    const scrim = document.createElement("div"); scrim.className = "scrim";
    const el = document.createElement("aside"); el.className = "panel"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", cfg.title);
    const openState = cfg.sections.map((s, i) => s.open !== undefined ? s.open : i === 0);
    function draw() {
      el.innerHTML = `<div class="panel-h"><h3>${esc(cfg.title)}</h3><button class="x" type="button" data-close aria-label="閉じる">×</button></div>
        <div class="panel-b">${cfg.intro ? `<div class="tip" style="margin-top:12px">${cfg.intro}</div>` : ""}
        ${cfg.sections.map((s, i) => {
          const fields = s.fields.filter((f) => !f.showIf || f.showIf(model));
          if (!fields.length || (s.showIf && !s.showIf(model))) return "";
          return `<div class="acc ${openState[i] ? "open" : ""}" data-s="${i}">
            <button type="button" class="acc-h" data-acc="${i}">${App.icon("chev", "chev")}${esc(s.title)}<span class="sum">${esc(summarize(s, model))}</span></button>
            <div class="acc-b">${fields.map((f) => fieldHTML(f, model)).join("")}</div></div>`;
        }).join("")}</div>
        <div class="panel-f">${cfg.onDelete ? `<button class="btn btn-danger left" type="button" data-del>${App.icon("trash")}Delete</button>` : ""}
          <button class="btn" type="button" data-close>Cancel</button>
          <button class="btn btn-primary" type="button" data-apply>${esc(cfg.applyLabel || "Apply")}</button></div>`;
    }
    const allFields = () => cfg.sections.flatMap((s) => s.fields);
    function read() {
      $$("[data-k]", el).forEach((inp) => {
        const f = allFields().find((x) => x.key === inp.dataset.k);
        if (!f) return;
        model[f.key] = inp.type === "checkbox" ? inp.checked : (f.type === "number" ? Number(inp.value) : inp.value);
      });
    }
    draw();
    document.body.append(scrim, el);
    App.emit("panel:open", { title: cfg.title });
    const firstInput = $(".panel-b input.input, .panel-b select", el);
    if (firstInput) firstInput.focus();
    el.addEventListener("click", (e) => {
      const acc = e.target.closest("[data-acc]");
      if (acc) { read(); const i = +acc.dataset.acc; openState[i] = !openState[i]; draw(); return; }
      const rm = e.target.closest("[data-rm]");
      if (rm) { read(); const k = rm.closest("[data-pk]").dataset.pk; model[k].splice(+rm.dataset.rm, 1); draw(); return; }
      if (e.target.closest("[data-close]")) { App.closePanel(); return; }
      if (e.target.closest("[data-del]")) { cfg.onDelete(); return; }
      if (e.target.closest("[data-apply]")) {
        read();
        const ok = cfg.onApply(model);
        if (ok !== false) App.closePanel();
      }
    });
    el.addEventListener("change", (e) => {
      const pk = e.target.closest("[data-pk]");
      if (pk && e.target.value) { read(); const k = pk.dataset.pk; model[k] = (model[k] || []).concat(e.target.value); draw(); return; }
      const f = allFields().find((x) => x.key === e.target.dataset.k);
      if (f && f.rerender) { read(); draw(); }
    });
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") App.closePanel(); });
    scrim.addEventListener("click", App.closePanel);
    return { el, model, redraw: () => { read(); draw(); } };
  };
  App.closePanel = () => { const had = !!$(".panel"); $$(".panel, .scrim").forEach((n) => n.remove()); if (had) App.emit("panel:close", {}); };

  /* ---------------- 監査ログ（Audit Trail） ---------------- */
  App.audit = (module, action, object, detail = "") => {
    const list = App.db.get("audit", seedAudit);
    const me = App.trainee();
    list.unshift({ t: Date.now(), admin: me.email || "trainee@example.com", module, action, object, detail, mine: true });
    App.db.set("audit", list.slice(0, 300));
    App.notify({ title: module + "：" + action + (object ? "（" + object + "）" : ""), body: detail ? String(detail).slice(0, 80) : "", href: "audit-trail.html", kind: action === "Delete" ? "ng" : "ok", read: false });
    App.step("audit_check", "change");
  };
  function seedAudit() {
    const now = Date.now(), h = 3600e3;
    return [
      { t: now - 20 * h, admin: "yamada.admin@example.co.jp", module: "Internet Firewall", action: "Publish", object: "Revision #3", detail: "ルール「Block Uncategorized」を追加" },
      { t: now - 45 * h, admin: "msp-operator@partner.example", module: "Sites", action: "Update", object: "JP-OSA-BR01", detail: "WAN2 を Last Resort（LTE）に変更" },
      { t: now - 70 * h, admin: "yamada.admin@example.co.jp", module: "Administrators", action: "Create", object: "msp-operator@partner.example", detail: "Role: Editor" }
    ];
  }
  App.seedAudit = seedAudit;

  /* =====================================================================
     研修ミッション（手順ごとのチェックリスト）
     steps: [キー, 表示名, ハイライトする要素（CSSセレクタ or 関数）]
     キー "visit" はその画面を開いたとき、"done" はミッション完了時に自動でチェックされます。
     ===================================================================== */
  const rowOf = (txt) => () => $$("tbody tr.clickable").find((tr) => tr.textContent.includes(txt));
  App.MISSIONS = [
    { id: "start", t: "研修を開始する", href: "index.html", steps: [["done", "名前を入力して［研修を開始］", "#startForm button[type=submit]"]] },
    { id: "topo_site", t: "Topology から切断中の拠点を開く", href: "topology.html", steps: [["visit", "Monitoring > トポロジー を開く"], ["done", "赤い拠点（AWS-TKY-VPC）をクリック", '.node[data-id="s3"]']] },
    { id: "events_block", t: "Events を Action = Block で絞り込む", href: "events.html", steps: [["visit", "Monitoring > イベント を開く"], ["done", "左の FIELDS で Action の Block に［+］", () => $('[data-inc="action"][data-v="Block"]') || $('[data-fld="action"]')]] },
    { id: "ifw_allow", t: "Internet Firewall に Allow ルールを追加して Publish", href: "internet-firewall.html", steps: [["visit", "Security > インターネット・ファイアウォール を開く"], ["new", "［New］でパネルを開く", "#btnNew"], ["apply", "名前を入れ Action = Allow で［Apply］", ".panel [data-apply]"], ["save", "［Save］で未公開リビジョンに保存", "#btnSave"], ["done", "［Publish］→ 確認画面でも［Publish］", () => $(".modal [data-o]") || $("#btnPublish")]] },
    { id: "wan_rule", t: "WAN Firewall に許可ルールを追加して Publish", href: "wan-firewall.html", steps: [["visit", "Security > ワン・ファイアウォール を開く"], ["new", "［New］でパネルを開く", "#btnNew"], ["apply", "Action = Allow のルールを［Apply］", ".panel [data-apply]"], ["save", "［Save］", "#btnSave"], ["done", "［Publish］→［Publish］", () => $(".modal [data-o]") || $("#btnPublish")]] },
    { id: "tls_bypass", t: "TLS Inspection を有効化し、Bypass ルールを追加して Publish", href: "tls-inspection.html", steps: [["visit", "Security > ティーエルエス・インスペクション を開く"], ["enable", "「Enable TLS Inspection」をオン", ".enable-row .switch"], ["apply", "［New］→ Action = Bypass で［Apply］", () => $(".panel [data-apply]") || $("#btnNew")], ["save", "［Save］", "#btnSave"], ["done", "［Publish］→［Publish］", () => $(".modal [data-o]") || $("#btnPublish")]] },
    { id: "ip_alloc", t: "固定の送信元IPを割り当てる", href: "ip-allocation.html", steps: [["visit", "Network > アイピー・アロケーション を開く"], ["add", "Location を選んで［Allocate］", "#add"], ["done", "［Save］でIPを確定", "#save"]] },
    { id: "nr_nat", t: "Network Rule で NAT に Allocated IP を指定して Publish", href: "network-rules.html", steps: [["visit", "Network > ネットワーク・ルール を開く"], ["new", "［New］→ New Rule", () => $(".pop button") || $("#btnNew")], ["apply", "Internet ルールで Route/NAT = NAT にして［Apply］", ".panel [data-apply]"], ["save", "［Save］", "#btnSave"], ["done", "［Publish］→［Publish］", () => $(".modal [data-o]") || $("#btnPublish")]] },
    { id: "nr_qos", t: "Web会議ルールの Bandwidth Priority を上げて Publish", href: "network-rules.html", steps: [["visit", "Network > ネットワーク・ルール を開く"], ["apply", "「Web Conferencing」を開き p255 以外にして［Apply］", () => $(".panel [data-apply]") || rowOf("Web Conferencing")()], ["save", "［Save］", "#btnSave"], ["done", "［Publish］→［Publish］", () => $(".modal [data-o]") || $("#btnPublish")]] },
    { id: "site_add", t: "新しい拠点（サイト）を追加する", href: "sites.html", steps: [["visit", "Network > サイト を開く"], ["new", "［New］で Add Site を開く", "#btnNew"], ["done", "Site Name と Native Range を入れて［Apply］", ".panel [data-apply]"]] },
    { id: "admin_add", t: "管理者アカウントを追加する", href: "administrators.html", steps: [["visit", "Administration > アドミニストレーター を開く"], ["new", "［New］で Create Administrator を開く", "#new"], ["done", "［Apply］（研修版は何を入れても可）", ".panel [data-apply]"]] },
    { id: "ccp_rule", t: "Client Connectivity Policy にルールを追加して Publish", href: "client-connectivity.html", steps: [["visit", "Access > クライアント・コネクティビティ・ポリシー を開く"], ["new", "［New］でパネルを開く", "#btnNew"], ["apply", "条件と Action を決めて［Apply］", ".panel [data-apply]"], ["save", "［Save］", "#btnSave"], ["done", "［Publish］→［Publish］", () => $(".modal [data-o]") || $("#btnPublish")]] },
    { id: "audit_check", t: "Audit Trail で自分の変更を確認する", href: "audit-trail.html", steps: [["change", "どこかの画面で設定を1つ変更（Save など）"], ["done", "Monitoring > オーディット・トレイル を開いて確認"]] },
    { id: "dns_fwd", t: "社内ドメインの DNS 転送先を設定する", href: "dns-settings.html", steps: [["visit", "Network > ディーエヌエス・セッティング を開く"], ["add", "Domain と DNS Server を入れて［＋ Add］", "#add"], ["done", "［Save］", "#save"]] },
    { id: "bp_check", t: "Best Practices の未対応項目を1つ開いて対処する", href: "best-practices.html", steps: [["visit", "Monitoring > ベスト・プラクティス を開く"], ["done", "Failed の項目の［対処する］", "[data-fix]"]] }
  ];
  const MBY = (id) => App.MISSIONS.find((m) => m.id === id);
  const curPage = () => (location.pathname.split("/").pop() || "index.html").replace(/\?.*$/, "") || "index.html";
  const isDone = (id) => !!App.db.get("missions", {})[id];
  const stepsOf = (id) => (App.db.get("msteps", {})[id] || {});
  App.missionProgress = (id) => { const m = MBY(id); if (!m) return [0, 0]; const st = stepsOf(id), d = isDone(id); const n = m.steps.filter(([k]) => d || st[k]).length; return [n, m.steps.length]; };

  /* 手順をチェック（同じ手順は1回だけ） */
  App.step = (id, key, opt = {}) => {
    if (key !== "done") App.emit("mission:" + key, { id });
    const m = MBY(id);
    if (!m || isDone(id) || !m.steps.some(([k]) => k === key)) return false;
    const all = App.db.get("msteps", {});
    all[id] = all[id] || {};
    if (all[id][key]) return false;
    all[id][key] = Date.now();
    App.db.set("msteps", all);
    if (key === "done") { App.complete(id); return true; }
    const lab = m.steps.find(([k]) => k === key)[1];
    if (!opt.quiet && !trainingOn()) {
      const [a, b] = App.missionProgress(id);
      const nx = m.steps.find(([k]) => !all[id][k]);
      App.toast(`<span class="t-step">✓ ${esc(lab)}</span>${nx ? `<span class="t-next">次：${esc(nx[1])}</span>` : ""}`, "info", 3600, { title: `ミッション進行中 ${a}/${b}：${m.t}`, icon: "flag", group: "step" });
    }
    refreshMissionUI(id, key);
    return true;
  };
  App.unstep = (id, keys) => {
    if (isDone(id)) return;
    const all = App.db.get("msteps", {});
    if (!all[id]) return;
    let changed = false;
    keys.forEach((k) => { if (all[id][k]) { delete all[id][k]; changed = true; } });
    if (changed) { App.db.set("msteps", all); refreshMissionUI(id); }
  };

  App.complete = (id) => {
    App.emit("mission:done", { id });
    const done = App.db.get("missions", {});
    if (done[id]) return;
    done[id] = Date.now();
    App.db.set("missions", done);
    const m = MBY(id);
    if (!m) return;
    const all = App.db.get("msteps", {}); all[id] = all[id] || {}; m.steps.forEach(([k]) => { all[id][k] = all[id][k] || Date.now(); }); App.db.set("msteps", all);
    const n = App.MISSIONS.filter((x) => done[x.id]).length, tot = App.MISSIONS.length;
    const next = App.MISSIONS.find((x) => !done[x.id]);
    App.notify({ title: "ミッション達成：" + m.t, body: n + " / " + tot + " 完了", href: next ? next.href : "guide.html", kind: "mission" });
    if (n === tot) App.db.set("gradPending", true);
    setTimeout(() => {
      App.burstFrom($(".mission-fab"), 110);
      App.toast(`<b>${esc(m.t)}</b><div class="t-prog"><i style="width:${(n / tot) * 100}%"></i></div><span class="t-next">${n} / ${tot} 完了${next ? "　次：" + esc(next.t) : ""}</span>`, "mission", 7000,
        { title: "ミッション達成！", group: "mission", clear: ["step"], action: next ? { label: "次のミッションへ", href: next.href } : { label: "操作要領で復習", href: "guide.html" } });
      if (n === tot) setTimeout(App.graduation, 900);
    }, 350);
    refreshMissionUI(id, "done", true);
  };

  /* すべて完了したときの修了画面 */
  App.graduation = () => {
    if ($(".cert")) return;
    App.db.set("gradPending", false);
    const done = App.db.get("missions", {}), me = App.trainee();
    const ts = Object.values(done).sort();
    const mins = ts.length ? Math.max(1, Math.round((ts[ts.length - 1] - ts[0]) / 60000)) : 0;
    App.confetti(innerWidth * 0.25, innerHeight * 0.5, 140); App.confetti(innerWidth * 0.75, innerHeight * 0.5, 140);
    App.modal({ title: "研修修了おめでとうございます！", ok: "閉じる", cancel: "",
      body: `<div class="cert"><p class="cert-eyebrow">KMC TRAINER 修了証</p><p class="cert-name">${esc(me.name)} さん</p><p>Kato 管理画面の基本操作 ${App.MISSIONS.length} ミッションをすべて達成しました。</p>
        <dl><div><dt>所要時間</dt><dd>約 ${mins} 分</dd></div><div><dt>達成日</dt><dd>${App.fmt(Date.now()).slice(0, 10)}</dd></div></dl>
        <p class="muted">次は実機の画面で、操作要領PDFの「まず必須でやること」から始めましょう。</p></div>` });
  };

  function missionLis(done) {
    const page = curPage();
    return App.MISSIONS.map((m, i) => {
      const d = !!done[m.id], st = stepsOf(m.id);
      const [a, b] = App.missionProgress(m.id);
      const here = m.href === page;
      return `<li class="${d ? "done" : ""} ${here && !d ? "here" : ""}" data-mid="${m.id}"><span class="mk">${d ? "✓" : i + 1}</span>
        <div style="min-width:0;flex:1"><div class="mt">${esc(m.t)}${here && !d ? ' <span class="badge b-info">この画面</span>' : ""}</div>
        <div class="mprog"><i style="width:${(a / b) * 100}%"></i></div>
        <ul class="msteps">${m.steps.map(([k, l]) => `<li class="${d || st[k] ? "ok" : ""}" data-sk="${k}"><span>${d || st[k] ? "✓" : "○"}</span>${esc(l)}</li>`).join("")}</ul>
        <div class="mp">${a} / ${b} 手順　${here ? "" : `<a href="${m.href}">開く →</a>`}</div></div></li>`;
    }).join("");
  }
  function renderMissions() {
    const done = App.db.get("missions", {});
    const n = App.MISSIONS.filter((m) => done[m.id]).length;
    let fab = $(".mission-fab");
    if (!fab) {
      fab = document.createElement("button");
      fab.className = "mission-fab"; fab.type = "button"; fab.setAttribute("aria-expanded", "false");
      fab.dataset.tip = "研修ミッションのチェックリストを開きます。操作すると手順ごとにリアルタイムでチェックが付きます。";
      document.body.appendChild(fab);
      fab.addEventListener("click", () => {
        const d = $(".missions");
        d.hidden = !d.hidden;
        fab.setAttribute("aria-expanded", String(!d.hidden));
        document.body.classList.toggle("drawer-open", !d.hidden);
        try { sessionStorage.setItem(PREFIX + "drawer", d.hidden ? "0" : "1"); } catch (e) { /* noop */ }
        if (!d.hidden) { const h = $(".mlist li.here", d); if (h) h.scrollIntoView({ block: "nearest" }); }
      });
    }
    fab.innerHTML = `${App.icon("flag")}研修ミッション<span class="prog">${n} / ${App.MISSIONS.length}</span>`;
    let d = $(".missions");
    if (!d) {
      d = document.createElement("section"); d.className = "missions"; d.hidden = true; d.setAttribute("aria-label", "研修ミッション");
      document.body.appendChild(d);
      try { if (sessionStorage.getItem(PREFIX + "drawer") === "1") { d.hidden = false; fab.setAttribute("aria-expanded", "true"); document.body.classList.add("drawer-open"); } } catch (e) { /* noop */ }
      d.addEventListener("click", (e) => {
        if (e.target.closest("[data-reset]")) {
          App.modal({ title: "研修データのリセット", body: "追加したルール・拠点・管理者、ミッションの達成状況をすべて初期状態に戻します。", ok: "リセット", danger: true,
            onOk: () => { App.db.resetAll(); location.href = "index.html"; } });
        }
        if (e.target.closest("[data-hide]")) { d.hidden = true; fab.setAttribute("aria-expanded", "false"); document.body.classList.remove("drawer-open"); try { sessionStorage.setItem(PREFIX + "drawer", "0"); } catch (er) { /* noop */ } }
      });
    }
    d.innerHTML = `<div class="missions-h"><h3>研修ミッション <span class="muted" style="font-weight:400;font-size:12px">${n} / ${App.MISSIONS.length} 完了</span></h3><p>操作すると、手順ごとにリアルタイムでチェックが付きます。</p>
      <div class="mbar"><i style="width:${(n / App.MISSIONS.length) * 100}%"></i></div></div>
      <ol class="mlist">${missionLis(done)}</ol>
      <div class="missions-f"><button class="btn btn-text" type="button" data-reset data-tip="追加したルール・拠点・管理者と、ミッションの達成状況を初期状態に戻します。">研修データをリセット</button><a class="btn" href="guide.html">${App.icon("book")}操作要領</a><button class="btn" type="button" data-hide>閉じる</button></div>`;
  }
  function refreshMissionUI(id, key, big) {
    renderMissions();
    renderTracker();
    const fab = $(".mission-fab");
    if (fab) { fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.remove("big"); fab.classList.add("bump"); if (big) fab.classList.add("big"); }
    if (id && key) {
      $$(`[data-mid="${id}"] [data-sk="${key}"]`).forEach((el) => { el.classList.add("just"); });
      $$(`.tracker [data-sk="${key}"]`).forEach((el) => el.classList.add("just"));
    }
  }

  /* ---------- この画面のミッション（左下のトラッカー）＋ 次に押す場所のハイライト ---------- */
  let trackerCollapsed = false;
  try { trackerCollapsed = sessionStorage.getItem(PREFIX + "trk") === "0"; } catch (e) { /* noop */ }
  function pageMissions() { const page = curPage(); return App.MISSIONS.filter((m) => m.href === page && !isDone(m.id)); }
  let trackerIdx = 0;
  function renderTracker() {
    if (!document.body.dataset.tab) return;
    let el = $(".tracker");
    const list = pageMissions();
    if (!list.length) {
      if (el) {
        const justDone = App.MISSIONS.filter((m) => m.href === curPage());
        if (justDone.length && !el.classList.contains("cleared")) { el.classList.add("cleared"); el.innerHTML = `<div class="trk-h">${App.icon("check")}<b>この画面のミッションはすべて達成！</b><button class="t-x" type="button" aria-label="閉じる" data-trk-close>×</button></div>`; el.querySelector("[data-trk-close]").onclick = () => el.remove(); setTimeout(() => el && el.remove(), 6000); }
        else if (!justDone.length) el.remove();
      }
      clearCoach(); return;
    }
    if (trackerIdx >= list.length) trackerIdx = 0;
    const m = list[trackerIdx], st = stepsOf(m.id);
    const [a, b] = App.missionProgress(m.id);
    const nextStep = m.steps.find(([k]) => !st[k]);
    if (!el) {
      el = document.createElement("aside"); el.className = "tracker"; el.setAttribute("aria-label", "この画面のミッション");
      const main = $("#main"), crumb = $("#main > .crumb");
      if (main) main.insertBefore(el, crumb ? crumb.nextSibling : main.firstChild); else document.body.appendChild(el);
    }
    el.classList.remove("cleared");
    el.classList.toggle("min", trackerCollapsed);
    el.innerHTML = trackerCollapsed
      ? `<button type="button" class="trk-pill" data-trk-open data-tip="この画面のミッションの手順を表示します。">${App.icon("flag")}ミッション ${a}/${b}：${esc(nextStep ? nextStep[1] : "")}</button>`
      : `<div class="trk-h">${App.icon("flag")}<b>この画面のミッション</b>${list.length > 1 ? `<button class="btn btn-text" type="button" data-trk-next data-tip="この画面の別のミッションに切り替えます。">${trackerIdx + 1}/${list.length} ▸</button>` : ""}<button class="t-x" type="button" aria-label="小さくする" data-trk-min data-tip="小さく折りたたみます。">–</button></div>
        <div class="trk-t">${esc(m.t)}<span class="muted">　${a} / ${b} 手順</span></div><div class="mprog"><i style="width:${(a / b) * 100}%"></i></div>
        <ol class="trk-steps">${m.steps.map(([k, l], i) => `<li class="${st[k] ? "ok" : nextStep && nextStep[0] === k ? "next" : ""}" data-sk="${k}" data-tip="${esc("手順 " + (i + 1) + "：" + l + (st[k] ? "（完了）" : nextStep && nextStep[0] === k ? "（次にやること）" : "（未完了）"))}"><span>${st[k] ? "✓" : i + 1}</span>${esc(l)}</li>`).join("")}</ol>
        <label class="check trk-coach"><input type="checkbox" id="coachOn" ${coachOff ? "" : "checked"}>次に押す場所を光らせる</label>`;
    const q = (s) => el.querySelector(s);
    if (q("[data-trk-min]")) q("[data-trk-min]").onclick = () => { trackerCollapsed = true; try { sessionStorage.setItem(PREFIX + "trk", "0"); } catch (e) { /* noop */ } renderTracker(); };
    if (q("[data-trk-open]")) q("[data-trk-open]").onclick = () => { trackerCollapsed = false; try { sessionStorage.setItem(PREFIX + "trk", "1"); } catch (e) { /* noop */ } renderTracker(); };
    if (q("[data-trk-next]")) q("[data-trk-next]").onclick = () => { trackerIdx++; renderTracker(); };
    if (q("#coachOn")) q("#coachOn").onchange = (e) => { coachOff = !e.target.checked; try { sessionStorage.setItem(PREFIX + "coach", coachOff ? "0" : "1"); } catch (er) { /* noop */ } applyCoach(); };
    applyCoach();
  }
  let coachOff = false;
  try { coachOff = sessionStorage.getItem(PREFIX + "coach") === "0"; } catch (e) { /* noop */ }
  function clearCoach() { $$(".coach-target").forEach((x) => x.classList.remove("coach-target")); }
  function applyCoach() {
    clearCoach();
    if (coachOff || trackerCollapsed || trainingOn()) return;
    const list = pageMissions(); if (!list.length) return;
    const m = list[Math.min(trackerIdx, list.length - 1)], st = stepsOf(m.id);
    const nx = m.steps.find(([k]) => !st[k]);
    if (!nx || !nx[2]) return;
    const el = typeof nx[2] === "function" ? nx[2]() : $(nx[2]);
    if (el) el.classList.add("coach-target");
  }
  let coachRaf = 0;
  function coachWanted() {
    if (coachOff || trackerCollapsed || trainingOn()) return null;
    const list = pageMissions(); if (!list.length) return null;
    const m = list[Math.min(trackerIdx, list.length - 1)], st = stepsOf(m.id);
    const nx = m.steps.find(([k]) => !st[k]);
    if (!nx || !nx[2]) return null;
    return typeof nx[2] === "function" ? nx[2]() : $(nx[2]);
  }
  const coachObs = new MutationObserver(() => { if (coachRaf) return; coachRaf = requestAnimationFrame(() => { coachRaf = 0; const w = coachWanted(), cur = $(".coach-target"); if (w !== cur) applyCoach(); }); });

  /* ポリシー画面の操作 → ミッションの手順 */
  const POLICY_MISSIONS = {
    ifw: [["ifw_allow", (r) => r.action === "Allow"]],
    wan: [["wan_rule", (r) => r.action === "Allow"]],
    tls: [["tls_bypass", (r) => r.action === "Bypass"]],
    nr: [["nr_nat", (r) => r.ruleType === "Internet" && r.routeNat === "NAT" && !!r.natIp], ["nr_qos", (r) => r.enabled && r.prio !== "p255" && (r.app || []).some((a) => /Teams|Zoom/.test(a))]],
    ccp: [["ccp_rule", () => true]]
  };
  App.policyEvent = (key, ev, data) => {
    App.emit("policy:" + ev, { key, rule: ev === "apply" ? data : undefined, value: ev === "enable" ? data : undefined, published: ev === "publish" ? data : undefined });
    (POLICY_MISSIONS[key] || []).forEach(([id, pred]) => {
      if (isDone(id)) return;
      const st = stepsOf(id);
      if (ev === "new") App.step(id, "new");
      else if (ev === "apply") {
        if (pred(data)) App.step(id, "apply");
        else if (!st.apply) {
          const m = MBY(id), lab = (m.steps.find(([k]) => k === "apply") || [])[1];
          if (lab) setTimeout(() => App.toast(`このルールはミッションの条件に合っていません。<br><b>条件：</b>${esc(lab)}`, "info", 5200, { title: "ミッションのヒント", group: "hint" }), 500);
        }
      } else if (ev === "enable") { if (data) App.step(id, "enable"); }
      else if (ev === "save") { if (st.apply) App.step(id, "save"); }
      else if (ev === "discard") {
        if (st.apply || st.save) { App.unstep(id, ["apply", "save", "new"]); App.toast("Discard したため、このミッションの Apply 以降の手順が未完了に戻りました。", "warn", 5000, { title: "ミッションの手順が戻りました", group: "policy" }); }
      }
    });
  };

  /* ---------- 画面ごとの初回ポップアップ（この画面の使い方） ---------- */
  App.pageHelp = (force) => {
    const page = document.body.dataset.page;
    if (!page || !document.body.dataset.tab) return;
    const seen = App.db.get("pageSeen", {});
    if (!force && (seen[page] || App.db.get("pageHelpOff", false) || trainingOn())) return;
    $$(".page-help").forEach((x) => x.remove());
    const h1 = $(".page-title h1, .site-head h1, #main h1");
    const title = (h1 ? h1.textContent.replace(/\s+/g, " ").replace(/この画面の使い方$/, "").trim() : document.title.replace(/\s*\|\s*KMC Trainer$/, ""));
    const tip = $("#main .tip");
    const ms = App.MISSIONS.filter((m) => m.href === curPage());
    const el = document.createElement("aside");
    el.className = "page-help"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "この画面の使い方");
    el.innerHTML = `<div class="ph-h">${App.icon("help")}<b>この画面の使い方</b><button class="t-x" type="button" aria-label="閉じる" data-ph-close>×</button></div>
      <p class="ph-title">${esc(title)}</p>
      ${tip ? `<div class="ph-body">${tip.innerHTML}</div>` : ""}
      <ul class="ph-list"><li>ボタン・表の行・グラフにマウスを乗せると説明が出ます。</li>${ms.length ? ms.map((m) => `<li>この画面のミッション：<b>${esc(m.t)}</b>${isDone(m.id) ? "（達成済み）" : "（左下に手順を表示中）"}</li>`).join("") : ""}</ul>
      <div class="ph-f"><label class="check"><input type="checkbox" id="phOff">今後どの画面でも自動で出さない</label><button class="btn btn-primary" type="button" data-ph-ok>わかった</button></div>`;
    document.body.appendChild(el);
    const close = () => { seen[page] = Date.now(); App.db.set("pageSeen", seen); if ($("#phOff", el).checked) App.db.set("pageHelpOff", true); el.classList.add("out"); setTimeout(() => el.remove(), 200); };
    el.querySelector("[data-ph-close]").onclick = close; el.querySelector("[data-ph-ok]").onclick = close;
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  };

  App.renderMissions = renderMissions;

  /* ---------------- 上部バーのドロップダウン ---------------- */
  App.flyout = (anchor, title, html, cls = "") => {
    const ex = $(".flyout"); if (ex) { const same = ex.dataset.for === anchor.id; ex.remove(); if (same) return; }
    const f = document.createElement("div");
    f.className = "flyout " + cls; f.dataset.for = anchor.id || "";
    f.innerHTML = `<div class="fly-h">${esc(title)}</div><div class="fly-b">${html}</div>`;
    document.body.appendChild(f);
    const r = anchor.getBoundingClientRect();
    f.style.top = r.bottom + 6 + "px";
    f.style.left = Math.max(8, Math.min(r.right - f.offsetWidth, innerWidth - f.offsetWidth - 8)) + "px";
    const off = (e) => { if (!f.contains(e.target) && !anchor.contains(e.target)) { f.remove(); document.removeEventListener("mousedown", off); } };
    setTimeout(() => document.addEventListener("mousedown", off));
  };

  /* ---------------- 表示部品（タイル・棒グラフ・ドーナツ・表） ---------------- */
  App.tiles = (arr) => `<div class="tiles">${arr.map((t) => `<div class="tile ${t.tone || ""}" data-tip="${esc(t.tip || t.label)}"><span class="tl">${esc(t.label)}</span><b class="tv">${esc(t.value)}</b>${t.sub ? `<span class="ts">${esc(t.sub)}</span>` : ""}</div>`).join("")}</div>`;
  App.bars = (items, opt = {}) => {
    const max = opt.max || Math.max(1, ...items.map((i) => i.value));
    return `<div class="bars">${items.map((i) => `<div class="bar-row" data-tip="${esc(i.tip || i.label + "：" + i.value + (opt.unit || ""))}"><span class="bl">${esc(i.label)}</span><span class="bt"><i style="width:${Math.max(2, (i.value / max) * 100)}%;background:${i.color || "var(--brand)"}"></i></span><span class="bv">${esc(i.text || i.value + (opt.unit || ""))}</span></div>`).join("")}</div>`;
  };
  App.donut = (segs, center, sub) => {
    const tot = segs.reduce((a, b) => a + b.value, 0) || 1;
    let ang = -Math.PI / 2, out = "";
    const R = 52, r = 34, cx = 64, cy = 64;
    segs.forEach((sg) => {
      const a2 = ang + (sg.value / tot) * Math.PI * 2;
      const big = a2 - ang > Math.PI ? 1 : 0;
      const p = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
      const d = sg.value >= tot ? `M${cx},${cy - R}A${R},${R} 0 1 1 ${cx - 0.01},${cy - R}L${cx - 0.01},${cy - r}A${r},${r} 0 1 0 ${cx},${cy - r}Z` : `M${p(R, ang)}A${R},${R} 0 ${big} 1 ${p(R, a2)}L${p(r, a2)}A${r},${r} 0 ${big} 0 ${p(r, ang)}Z`;
      out += `<path d="${d}" fill="${sg.color}" data-tip="${esc(sg.tip || sg.label + "：" + sg.value + "（" + Math.round((sg.value / tot) * 100) + "%）")}"/>`;
      ang = a2;
    });
    return `<div class="donut"><svg viewBox="0 0 128 128" role="img" aria-label="${esc(center)}">${out}<text x="64" y="64" text-anchor="middle" font-size="18" font-weight="500" fill="#2b2f33">${esc(center)}</text><text x="64" y="80" text-anchor="middle" font-size="9" fill="#6b7178">${esc(sub || "")}</text></svg>
      <ul>${segs.map((sg) => `<li data-tip="${esc(sg.tip || sg.label + "：" + sg.value)}"><i style="background:${sg.color}"></i>${esc(sg.label)}<b>${sg.value}</b></li>`).join("")}</ul></div>`;
  };
  App.table = (cols, rows, opt = {}) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr class="${r.cls || ""}" ${r.tip ? `data-tip="${esc(r.tip)}"` : ""} ${r.attr || ""}>${r.cells.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length}" class="muted" style="text-align:center;padding:22px">${esc(opt.empty || "データがありません")}</td></tr>`}</tbody></table></div>`;
  App.card = (title, body, opt = {}) => `<div class="card ${opt.cls || ""}" ${opt.tip ? `data-tip="${esc(opt.tip)}"` : ""}><div class="card-h"><h2>${title}</h2>${opt.right || ""}</div><div class="${opt.flush ? "" : "card-b"}">${body}</div></div>`;
  App.sev = (s) => `<span class="badge ${s === "Critical" || s === "High" ? "b-ng" : s === "Medium" ? "b-warn" : "b-gray"}">${esc(s)}</span>`;
  App.timeRange = (id = "tr", def = "24h") => `<select class="select" id="${id}" style="width:auto" aria-label="期間" data-tip="表示する期間を切り替えます。">${[["1h", "Last 1 Hour"], ["24h", "Last 24 Hours"], ["7d", "Last 7 Days"], ["30d", "Last 30 Days"]].map(([v, l]) => `<option value="${v}" ${v === def ? "selected" : ""}>${l}</option>`).join("")}</select>`;

  /* ---------------- 共通マスタ（選択肢） ---------------- */
  App.sites = () => App.db.get("sites", seedSites);
  function seedSites() {
    return [
      { id: "s1", name: "JP-TKY-HQ", type: "Headquarters", conn: "Sokket S170", country: "Japan", city: "Tokyo", tz: "Asia/Tokyo", status: "Connected", pop: "TYO-PoP-1", native: "10.10.0.0/24", localIp: "10.10.0.1", ha: true,
        wan1: { name: "WAN1", isp: "NTT East（光）", down: 500, up: 500, role: "Active" }, wan2: { name: "WAN2", isp: "KDDI（光）", down: 300, up: 300, role: "Active" }, license: "Japan - 500 Mbps", connectedSince: Date.now() - 19 * 864e5 },
      { id: "s2", name: "JP-OSA-BR01", type: "Branch", conn: "Sokket S160 LTE", country: "Japan", city: "Osaka", tz: "Asia/Tokyo", status: "Connected", pop: "OSA-PoP-1", native: "10.20.0.0/24", localIp: "10.20.0.1", ha: false,
        wan1: { name: "WAN1", isp: "NTT West（光）", down: 200, up: 200, role: "Active" }, wan2: { name: "LTE", isp: "docomo（LTE）", down: 50, up: 20, role: "Last Resort" }, license: "Japan - 200 Mbps", connectedSince: Date.now() - 6 * 864e5 },
      { id: "s3", name: "AWS-TKY-VPC", type: "Cloud Data Center", conn: "vSokket AWS", country: "Japan", city: "Tokyo", tz: "Asia/Tokyo", status: "Disconnected", pop: "—", native: "172.16.0.0/16", localIp: "172.16.0.10", ha: false,
        wan1: { name: "WAN1", isp: "AWS", down: 100, up: 100, role: "Active" }, wan2: null, license: "Japan - 100 Mbps", disconnectedAt: Date.now() - 2.6 * 3600e3 }
    ];
  }
  App.seedSites = seedSites;
  App.users = () => App.db.get("users", () => {
    const h = 3600e3, now = Date.now();
    const U = (first, last, email, groups, sdp, connected, origin, last_t, os) => ({ id: uid(), first, last, email, groups, sdp, connected, origin, lastConn: last_t ? now - last_t : null, os });
    return [
      U("一郎", "鈴木", "suzuki@example.co.jp", ["営業部", "全社員"], true, true, "SCIM", 0.2 * h, "Windows 11"),
      U("花子", "田中", "tanaka@example.co.jp", ["営業部", "全社員"], true, true, "SCIM", 0.5 * h, "macOS 15"),
      U("健", "山田", "yamada@example.co.jp", ["情報システム部", "全社員"], true, false, "SCIM", 20 * h, "Windows 11"),
      U("美咲", "佐藤", "sato@example.co.jp", ["経理部", "全社員"], true, false, "SCIM", 52 * h, "Windows 11"),
      U("大輔", "高橋", "takahashi@example.co.jp", ["情報システム部", "全社員"], true, false, "SCIM", 6 * h, "iOS 18"),
      U("由美", "伊藤", "ito@example.co.jp", ["経理部", "全社員"], false, false, "SCIM", null, ""),
      U("Partner", "Vendor", "vendor01@partner.example", ["業務委託"], true, false, "Manual", 120 * h, "Windows 10")
    ];
  });
  App.opt = {
    sources: () => ["SDP Users (all)", "Group: 全社員", "Group: 営業部", "Group: 情報システム部", "User: suzuki@example.co.jp", "User: tanaka@example.co.jp"]
      .concat(App.sites().map((s) => "Site: " + s.name)).concat(["IP Range: 10.10.0.0/24"]),
    destinations: () => App.sites().map((s) => "Site: " + s.name).concat(["Host: FileServer (10.10.0.20)", "Host: ERP (172.16.1.10)", "SDP Users (all)"]),
    apps: ["Category: Gambling", "Category: Anonymizers", "Category: Malware", "Category: Phishing", "Category: Uncategorized", "Category: Social Networks",
      "Category: Streaming Media", "Category: Financial Services", "Category: Health & Medicine",
      "App: Microsoft 365", "App: Microsoft Teams", "App: Zoom", "App: Box", "App: Salesforce", "App: YouTube", "App: Dropbox", "App: Windows Update",
      "Domain: partner-portal.example.net", "Domain: legacy-app.example.co.jp"],
    services: ["HTTP", "HTTPS", "SMB", "RDP", "SSH", "DNS", "SIP", "TCP/8443"],
    locations: ["Tokyo", "Osaka", "Sapporo", "Singapore", "Hong Kong", "Los Angeles", "Frankfurt"],
    posture: () => { const d = App.db.get("posture", null); return d ? d.profiles.map((p) => p.name) : ["Corporate Device (Domain Joined)", "Antivirus Running", "OS Up to Date", "Disk Encryption"]; },
    platforms: ["Windows", "macOS", "iOS", "Android", "Linux"],
    countries: ["Japan", "United States", "Singapore", "China"],
    usersGroups: ["Group: 全社員", "Group: 営業部", "Group: 情報システム部", "Group: 業務委託", "User: suzuki@example.co.jp"]
  };

  App.stories = () => App.db.get("stories", () => {
    const h = 3600e3, now = Date.now();
    return [
      { id: "ST-1042", title: "感染端末からの C&C 通信の疑い", sev: "Critical", status: "Open", owner: "", user: "yamada@example.co.jp", host: "PC-IT-0231", t: now - 3 * h, verdict: "",
        ind: ["宛先 198.51.100.77（既知の C&C サーバ）", "DNS トンネリングの兆候", "同じ端末から 96 回の接続試行"], tl: [[3, "IPS：Known C&C communication を検知・ブロック", 1], [2.6, "同じ端末から DNS トンネリングの兆候", 1], [2, "通信は継続（すべてブロック）", 0]],
        rec: "端末をネットワークから切り離してウイルススキャン。ブロックされているため外部への通信は成功していません。" },
      { id: "ST-1039", title: "フィッシングサイトへの連続アクセス", sev: "High", status: "Open", owner: "", user: "suzuki@example.co.jp", host: "PC-SL-0112", t: now - 9 * h, verdict: "",
        ind: ["フィッシング判定ドメイン 5 件", "メール内リンクからのアクセス"], tl: [[9, "phishing-login.test へのアクセスをブロック", 1], [8.5, "類似ドメインへのアクセスをブロック（4 件）", 1]],
        rec: "本人にパスワードを入力していないか確認。入力していればパスワード変更と MFA の再設定。" },
      { id: "ST-1031", title: "個人クラウドストレージへの大量アップロード", sev: "Medium", status: "In Progress", owner: "trainee@example.com", user: "tanaka@example.co.jp", host: "PC-SL-0140", t: now - 26 * h, verdict: "",
        ind: ["Dropbox へ 2.1 GB", "DLP：クレジットカード番号を検知"], tl: [[26, "Dropbox へのアップロード開始", 0], [25.5, "DLP がカード番号を検知しブロック", 1]],
        rec: "上長に業務上の必要性を確認。不要なら Application Control で個人ストレージへのアップロードを禁止。" },
      { id: "ST-1020", title: "社外端末の不審な国からの接続", sev: "Low", status: "Closed", owner: "yamada.admin@example.co.jp", user: "vendor01@partner.example", host: "VENDOR-LT01", t: now - 70 * h, verdict: "Benign",
        ind: ["Singapore からの接続"], tl: [[70, "Singapore から Kato Client で接続", 0]], rec: "出張のため問題なし（確認済み）。" }
    ];
  });

  /* ---------------- SVG 折れ線チャート ---------------- */
  App.lineChart = (series, opt = {}) => {
    const W = 520, H = 190, L = 44, R = 12, T = 12, B = 26;
    const n = series[0].data.length;
    const max = opt.max || Math.max(1, ...series.flatMap((s) => s.data)) * 1.15;
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const m = max / p; return (m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
    const x = (i) => L + (i / (n - 1)) * (W - L - R);
    const y = (v) => T + (1 - v / nice) * (H - T - B);
    let g = "";
    for (let k = 0; k <= 4; k++) {
      const v = (nice / 4) * k, yy = y(v);
      g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#eceff2"/><text x="${L - 6}" y="${yy + 3}" text-anchor="end">${+v.toFixed(v < 10 ? 1 : 0)}</text>`;
    }
    const labels = opt.labels || [];
    labels.forEach((lb, i) => { if (lb) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${lb}</text>`; });
    const paths = series.map((s) => {
      const d = s.data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      const area = s.fill ? `<path d="${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="${s.color}" opacity=".10"/>` : "";
      return area + `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="1.6"/>`;
    }).join("");
    // 各時点に透明な縦帯を置き、マウスを乗せるとその時点の値を表示
    const cw = (W - L - R) / (n - 1);
    const hov = series[0].data.map((_, i) => {
      const lab = (opt.full && opt.full[i]) || labels[i] || "#" + (i + 1);
      const vals = series.map((s) => (s.name || "値") + "：" + s.data[i] + " " + (opt.unit || "")).join(" ／ ");
      const note = opt.note ? opt.note(i) : "";
      return `<rect class="hov" x="${(x(i) - cw / 2).toFixed(1)}" y="${T}" width="${cw.toFixed(1)}" height="${H - T - B}" fill="transparent" data-tip="${esc("【" + lab + "】" + vals + (note ? "\n" + note : ""))}"/>`;
    }).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.title || "chart")}">${g}<text x="${L}" y="9" text-anchor="start">${esc(opt.unit || "")}</text>${paths}${hov}</svg>`;
  };
  App.rand = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  /* =====================================================================
     ポリシー画面エンジン
     cfg: {key, title, seed(){rules,enabled}, columns:[{h, v(rule)}], sections, newRule(), lockedTop:[], implicitBottom:{label, cells},
           hasEnable, enableLabel, enableWarnOff, onPublish(pub, prev), newMenu}
     ===================================================================== */
  App.policy = (cfg) => {
    const root = $(cfg.mount);
    const load = () => App.db.get("pol." + cfg.key, () => ({ published: cfg.seed(), draft: null, rev: cfg.startRev || 3 }));
    let st = load();
    let work = clone(st.draft || st.published);
    let dirty = false;
    let viewPublished = false;
    let q = "";
    let lastChanged = null;

    function save() { st.draft = clone(work); App.db.set("pol." + cfg.key, st); dirty = false; }
    function plain(h) { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " ").trim(); }
    function ruleTip(r, i, showing) {
      const parts = cfg.columns.filter((c) => c.h !== "Name").map((c) => c.h + "：" + (plain(c.v(r)) || "—"));
      const pub = st.published.rules.find((x) => x.id === r.id);
      let state;
      if (!pub) state = "未公開の新しいルール（Publish するまで効きません）";
      else if (JSON.stringify(Object.assign({}, pub, { _new: undefined })) !== JSON.stringify(Object.assign({}, r, { _new: undefined }))) state = "公開中の内容から変更あり（未公開）";
      else state = "公開中（全社に反映済み）";
      return "【#" + (i + 1) + " " + r.name + "】" + (r.enabled ? "有効" : "無効：評価されません") + "\n" + parts.join(" ／ ") +
        "\n状態：" + state + "\n上から " + (i + 1) + " 番目に評価されます。クリックで編集、⋮ で移動・削除。";
    }

    function render() {
      const showing = viewPublished ? st.published : work;
      const ro = viewPublished && !!st.draft;
      const hasDraft = !!st.draft;
      let banner;
      if (ro) banner = `<div class="status-banner pub">${App.icon("lock")}公開中のポリシー（Revision #${st.rev}）を表示しています。編集するには上のリストで自分の未公開リビジョンを選んでください。</div>`;
      else if (dirty) banner = `<div class="status-banner dirty">${App.icon("alert")}<b>未保存の変更があります。</b>［Save］で自分の未公開リビジョンに保存してください。このまま他の画面に移ると変更は失われます。</div>`;
      else if (hasDraft) banner = `<div class="status-banner draft">${App.icon("lock")}<b>未公開リビジョン（保存済み）</b>：まだ全社には反映されていません。他の管理者からは見えず、変更したルールはロックされます。［Publish］で反映します。</div>`;
      else banner = `<div class="status-banner pub">${App.icon("check")}公開中のポリシー（Revision #${st.rev}）です。変更すると自分専用の未公開リビジョンが作られます。</div>`;

      const rows = showing.rules.map((r, i) => ({ r, i })).filter(({ r }) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
      const cols = cfg.columns;
      const colspan = cols.length + 3;
      root.innerHTML = `<div class="card">
        <div class="pol-bar">
          <select class="select rev-select" id="revSel" aria-label="リビジョン">
            <option value="pub" ${viewPublished || !(hasDraft || dirty) ? "selected" : ""}>Published Revision #${st.rev}（Active）</option>
            ${hasDraft || dirty ? `<option value="draft" ${!viewPublished ? "selected" : ""}>Unpublished Revision（${esc(App.trainee().name)}）</option>` : ""}
          </select>
          <div class="search">${App.icon("search")}<input class="input" id="polSearch" placeholder="Search rules" value="${esc(q)}" aria-label="ルールを検索"></div>
          <div class="btn-group" style="margin-left:auto">
            <button class="btn" id="btnNew" ${ro ? "disabled" : ""}>${App.icon("plus")}New</button>
            <button class="btn" id="btnCompare" ${hasDraft || dirty ? "" : "disabled"}>Compare View</button>
            <button class="btn" id="btnDiscard" ${(hasDraft || dirty) && !ro ? "" : "disabled"}>Discard</button>
            <button class="btn" id="btnSave" ${dirty ? "" : "disabled"}>Save</button>
            <button class="btn btn-primary" id="btnPublish" ${hasDraft && !dirty && !ro ? "" : "disabled"} title="${dirty ? "先に Save してください" : ""}">Publish</button>
          </div>
        </div>
        ${banner}
        ${cfg.hasEnable ? `<div class="enable-row"><label class="switch"><input type="checkbox" id="polEnable" ${showing.enabled ? "checked" : ""} ${ro ? "disabled" : ""}><span class="track"></span>${esc(cfg.enableLabel)}</label>
          <span class="muted">${showing.enabled ? (cfg.enabledText || "有効") : `<span style="color:var(--ng)">${cfg.disabledText || "無効"}</span>`}</span>${cfg.enableExtra || ""}</div>` : ""}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px">#</th><th style="width:52px">On</th>${cols.map((c) => `<th>${c.h}</th>`).join("")}<th style="width:36px"></th></tr></thead><tbody>
        ${(cfg.lockedTop || []).length ? `<tr class="sec-row"><td colspan="${colspan}">${esc(cfg.lockedTopTitle || "Default Rules")}</td></tr>` +
          cfg.lockedTop.map((r) => `<tr class="locked" data-locked data-tip="${esc("【既定の除外ルール】" + r.name + "\nKato が管理するルールで、一番上で評価されます。編集・削除はできません。")}"><td>${App.icon("lock")}</td><td></td>${cols.map((c) => `<td>${c.v(r)}</td>`).join("")}<td></td></tr>`).join("") : ""}
        ${cfg.userSectionTitle ? `<tr class="sec-row"><td colspan="${colspan}">${esc(cfg.userSectionTitle)}</td></tr>` : ""}
        ${rows.length ? rows.map(({ r, i }) => `<tr class="clickable ${r.enabled ? "" : "disabled-rule"} ${lastChanged === r.id ? "flash" : ""}" data-i="${i}" data-tip="${esc(ruleTip(r, i, showing))}">
            <td class="num">${i + 1}</td>
            <td><label class="switch" title="ルールの有効/無効"><input type="checkbox" data-en="${i}" ${r.enabled ? "checked" : ""} ${ro ? "disabled" : ""} aria-label="${esc(r.name)}を有効化"><span class="track"></span></label></td>
            ${cols.map((c) => `<td>${c.v(r)}</td>`).join("")}
            <td><button class="kebab" type="button" data-more="${i}" aria-label="その他の操作" ${ro ? "disabled" : ""}>⋮</button></td></tr>`).join("")
          : `<tr><td colspan="${colspan}" class="muted" style="text-align:center;padding:22px">${q ? "一致するルールがありません" : "ルールがありません。［New］で追加します。"}</td></tr>`}
        ${cfg.implicitBottom ? `<tr class="sec-row"><td colspan="${colspan}">Default Rules</td></tr>
          <tr class="locked" data-locked data-tip="${esc(cfg.implicitBottom.tip || "【既定ルール】どのルールにも一致しなかった通信に適用されます。編集できません。")}"><td>${App.icon("lock")}</td><td></td>${cfg.implicitBottom.cells.map((c) => `<td>${c}</td>`).join("")}<td></td></tr>` : ""}
        </tbody></table></div></div>`;
      lastChanged = null;
      bind();
    }

    function markDirty(id) { dirty = true; viewPublished = false; lastChanged = id || null; render(); }

    function openRule(i) {
      const isNew = i === -1;
      if (isNew) App.policyEvent(cfg.key, "new");
      const model = isNew ? cfg.newRule() : clone(work.rules[i]);
      model.position = isNew ? 1 : i + 1;
      const total = work.rules.length + (isNew ? 1 : 0);
      const general = { title: "General", open: true, fields: [
        { key: "name", label: "Name", req: true, placeholder: "例：IFW-営業-partner-portal-Allow-CHG1021" },
        { key: "enabled", label: "Enabled", type: "toggle" },
        { key: "position", label: cfg.positionLabel || "Position（Rule Order）", type: "select", options: Array.from({ length: total }, (_, k) => [k + 1, `${k + 1}${k === 0 ? "（一番上）" : k === total - 1 ? "（一番下）" : ""}`]),
          help: "ルールは上から順に評価され、最初に一致したルールが適用されます。" }
      ].concat(cfg.generalExtra || []), summary: (m) => `#${m.position}` };
      App.panel({
        title: (isNew ? "Add " : "Edit ") + (cfg.ruleNoun || "Rule"),
        model,
        intro: cfg.panelIntro,
        sections: [general].concat(cfg.sections),
        onApply(m) {
          if (!String(m.name || "").trim()) { App.toast("Name を入力してください。", "ng"); return false; }
          if (cfg.validate) { const err = cfg.validate(m); if (err) { App.toast(err, "ng"); return false; } }
          const pos = Math.max(1, Math.min(total, +m.position || 1)) - 1;
          delete m.position;
          if (isNew) { m.id = uid(); m._new = true; work.rules.splice(pos, 0, m); }
          else { work.rules.splice(i, 1); work.rules.splice(pos, 0, m); }
          App.toast("一覧に反映しました（黄色の帯＝未保存）。次は画面上部の<b>［Save］</b>です。", "warn", 5000, { title: "Apply 完了：まだ保存されていません", group: "policy", clear: ["step"] });
          markDirty(m.id);
          App.policyEvent(cfg.key, "apply", m);
        },
        onDelete: isNew ? null : () => { work.rules.splice(i, 1); App.closePanel(); App.toast("ルールを削除しました（未保存）。", "warn"); markDirty(); }
      });
    }

    function diffList() {
      const a = st.published.rules, b = work.rules;
      const out = [];
      b.forEach((r, i) => {
        const old = a.find((x) => x.id === r.id);
        if (!old) out.push(`<li><span class="badge b-ok">追加</span> #${i + 1} ${esc(r.name)}</li>`);
        else {
          const o = clone(old), n = clone(r); delete o._new; delete n._new;
          if (JSON.stringify(o) !== JSON.stringify(n)) out.push(`<li><span class="badge b-info">変更</span> #${i + 1} ${esc(r.name)}</li>`);
          else if (a.indexOf(old) !== i) out.push(`<li><span class="badge b-gray">移動</span> ${esc(r.name)}：#${a.indexOf(old) + 1} → #${i + 1}</li>`);
        }
      });
      a.forEach((r) => { if (!b.find((x) => x.id === r.id)) out.push(`<li><span class="badge b-block">削除</span> ${esc(r.name)}</li>`); });
      if (cfg.hasEnable && st.published.enabled !== work.enabled) out.push(`<li><span class="badge b-info">変更</span> ${esc(cfg.enableLabel)}：${st.published.enabled ? "ON" : "OFF"} → ${work.enabled ? "ON" : "OFF"}</li>`);
      return out;
    }

    function bind() {
      $("#revSel", root).addEventListener("change", (e) => {
        if (dirty && e.target.value === "pub") { App.toast("未保存の変更があります。先に［Save］または［Discard］してください。", "warn"); e.target.value = "draft"; return; }
        viewPublished = e.target.value === "pub"; render();
      });
      $("#polSearch", root).addEventListener("input", (e) => { q = e.target.value; const pos = e.target.selectionStart; render(); const s = $("#polSearch", root); s.focus(); s.setSelectionRange(pos, pos); });
      $("#btnNew", root).addEventListener("click", (e) => cfg.newMenu ? App.pop(e.currentTarget, [{ label: "New Rule", run: () => openRule(-1) }, { label: "New Section", run: () => App.toast("セクションの作成は研修版では省略しています。", "warn") }]) : openRule(-1));
      $("#btnSave", root).addEventListener("click", () => {
        save();
        App.audit(cfg.title, "Save", "Unpublished Revision", diffList().length + " 件の変更を保存");
        App.toast("自分専用の未公開リビジョンに保存しました（青い帯）。<b>まだ全社には反映されていません。</b>最後に<b>［Publish］</b>を押します。", "warn", 6500, { title: "Save 完了：あと Publish だけ", group: "policy", clear: ["step"] });
        render();
        App.policyEvent(cfg.key, "save");
      });
      $("#btnDiscard", root).addEventListener("click", () => App.modal({
        title: "Discard Revision", body: "未公開リビジョンの変更をすべて破棄し、公開中のポリシーに戻します。<br>この操作は取り消せません。", ok: "Discard", danger: true,
        onOk: () => { st.draft = null; App.db.set("pol." + cfg.key, st); work = clone(st.published); dirty = false; viewPublished = false; App.toast("未公開リビジョンを破棄し、公開中のポリシーに戻しました。", "ok", 4200, { title: "Discard 完了", group: "policy" }); render(); App.policyEvent(cfg.key, "discard"); }
      }));
      $("#btnPublish", root).addEventListener("click", () => {
        const diffs = diffList();
        App.modal({
          title: "Publish Revision",
          body: `次の変更をアカウント全体のポリシーに反映します。<b>公開は取り消せません。</b><ul style="padding-left:18px;margin:8px 0 0">${diffs.join("") || "<li>変更なし</li>"}</ul>`,
          ok: "Publish",
          onOk: () => {
            const prev = clone(st.published);
            work.rules.forEach((r) => delete r._new);
            st.published = clone(work); st.draft = null; st.rev += 1;
            App.db.set("pol." + cfg.key, st);
            App.audit(cfg.title, "Publish", `Revision #${st.rev}`, diffs.map((d) => d.replace(/<[^>]+>/g, "")).join(" / "));
            const pb = $("#btnPublish", root);
            App.burstFrom(pb, 70);
            App.toast(`緑の帯＝全社に反映済みです。<ul class="t-list">${diffs.slice(0, 4).join("")}</ul>`, "ok", 6500, { title: `Revision #${st.rev} を公開しました`, group: "policy", clear: ["step"], action: { label: "Audit Trail で確認", href: "audit-trail.html" } });
            if (cfg.onPublish) cfg.onPublish(st.published, prev);
            App.policyEvent(cfg.key, "publish", st.published);
            render();
            const card = root.querySelector(".card"); if (card) { card.classList.remove("published-flash"); void card.offsetWidth; card.classList.add("published-flash"); }
          }
        });
      });
      $("#btnCompare", root).addEventListener("click", () => {
        const diffs = diffList();
        App.modal({ title: "Compare View（公開中 ⇔ 自分の変更）", body: diffs.length ? `<ul style="padding-left:18px;margin:0;display:grid;gap:6px">${diffs.join("")}</ul>` : "公開中のポリシーとの差分はありません。", ok: "閉じる", cancel: "" });
      });
      const en = $("#polEnable", root);
      if (en) en.addEventListener("change", () => {
        const apply = () => { work.enabled = en.checked; markDirty(); App.policyEvent(cfg.key, "enable", work.enabled); };
        if (!en.checked && cfg.enableWarnOff) {
          en.checked = true;
          App.modal({ title: "無効化の確認", body: cfg.enableWarnOff, ok: "無効にする", danger: true, onOk: () => { en.checked = false; apply(); } });
        } else apply();
      });
      $$("tr.clickable", root).forEach((tr) => tr.addEventListener("click", (e) => {
        if (e.target.closest(".switch, .kebab")) return;
        if (viewPublished && st.draft) { App.toast("公開中のリビジョンは閲覧専用です。", "warn"); return; }
        openRule(+tr.dataset.i);
      }));
      $$("tr[data-locked]", root).forEach((tr) => tr.addEventListener("click", () => App.toast("Kato が管理する既定ルールのため編集できません。", "warn")));
      $$("[data-en]", root).forEach((c) => c.addEventListener("change", () => { const r = work.rules[+c.dataset.en]; r.enabled = c.checked; markDirty(r.id); }));
      $$("[data-more]", root).forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = +b.dataset.more;
        App.pop(b, [
          { label: "Edit", run: () => openRule(i) },
          { label: "Move Up", run: () => { if (i > 0) { [work.rules[i - 1], work.rules[i]] = [work.rules[i], work.rules[i - 1]]; markDirty(work.rules[i - 1].id); } } },
          { label: "Move Down", run: () => { if (i < work.rules.length - 1) { [work.rules[i + 1], work.rules[i]] = [work.rules[i], work.rules[i + 1]]; markDirty(work.rules[i + 1].id); } } },
          { label: "Duplicate", run: () => { const c = clone(work.rules[i]); c.id = uid(); c.name += " (copy)"; c._new = true; work.rules.splice(i + 1, 0, c); markDirty(c.id); } },
          { label: "Delete", danger: true, run: () => { work.rules.splice(i, 1); markDirty(); } }
        ]);
      }));
    }

    window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
    render();
    return { state: () => st };
  };

  /* 表示用ヘルパー */
  App.chipsCell = (arr, any = "Any") => (arr && arr.length ? arr.map((x) => `<span class="chip">${esc(x)}</span>`).join(" ") : `<span class="muted">${any}</span>`);
  App.actionBadge = (a) => {
    const m = { Allow: "b-allow", Block: "b-block", Prompt: "b-prompt", Bypass: "b-prompt", Inspect: "b-info" };
    const cls = m[a] || (String(a).startsWith("Allow") ? "b-allow" : String(a).startsWith("Block") ? "b-block" : "b-info");
    return `<span class="badge ${cls}">${esc(a)}</span>`;
  };

  /* =====================================================================
     ツールチップ（ボタンにマウスを乗せると簡単な説明を表示）
     優先順位：data-tip ＞ 下の辞書（ボタンの文字で引く）＞ title ＞ アイコンだけのボタンの aria-label
     ===================================================================== */
  const TIPS = {
    // 上部タブ
    "Monitoring": "監視とログ。Topology（全体図）、Events（ログ）、Audit Trail（操作履歴）があります。",
    "Network": "拠点（Sites）、経路と優先度（Network Rules）、帯域、固定IP の設定です。",
    "Access": "ユーザー管理と、リモート接続（Kato Client）を許可する条件の設定です。",
    "Security": "Internet / WAN Firewall と TLS Inspection などのセキュリティ設定です。",
    "Assets": "端末の一覧（Device Inventory）など、資産の情報を確認します。",
    "Administration": "管理者アカウントの追加・権限・MFA リセットを行います。",
    // サイドメニュー
    "Topology": "拠点と接続中のリモートユーザーを図で表示します。毎朝の健康確認はここから。",
    "Events": "通信・セキュリティ・接続のログを検索します。「なぜ見られない？」の調査に使います。",
    "Audit Trail": "管理者の操作履歴（誰が・いつ・何を変えたか）を表示します。",
    "Sites": "拠点（サイト）の一覧・追加・監視を行います。",
    "Network Rules": "通信ごとの経路、優先度（QoS）、出口（Route Via / NAT）を決めます。",
    "Bandwidth Management": "帯域の優先度プロファイル（Priority と制限値）を管理します。",
    "IP Allocation": "自社専用の固定送信元IP（Allocated IP）を割り当てます。",
    "Users": "ユーザー一覧と SDP ライセンス（リモート接続の権利）を確認します。",
    "Directory Services": "SCIM / LDAP で IdP や AD からユーザーを同期する設定です。",
    "Client Connectivity Policy": "Kato Client でのリモート接続を許可する条件（端末の状態など）を決めます。",
    "Internet Firewall": "インターネット向け通信の許可・ブロック。最後は「全部許可」の既定ルール。",
    "WAN Firewall": "社内（拠点・ユーザー・クラウド）間の通信制御。最後は「全部遮断」の既定ルール。",
    "TLS Inspection": "HTTPS を復号して検査する設定と、検査しない（Bypass）ルールです。",
    "Administrators": "管理者アカウントの一覧・追加・権限・MFA リセットを行います。",
    "All Sites": "拠点の一覧に戻ります。",
    "Sites Overview": "全拠点の状態・帯域・品質を一覧で比較します。",
    "SDP Users Overview": "リモートユーザーの接続状況（誰が・どこから・いつ）を一覧します。",
    "App Analytics": "どのアプリがどれだけ使われているかを分析します。",
    "Routing Table": "拠点ごとの経路（どの宛先へどこを通るか）を確認します。",
    "Security Threats": "ブロックした脅威の件数・種類・対象を確認するダッシュボード。",
    "MITRE ATT&CK": "検知した攻撃を MITRE ATT&CK の戦術・技術に当てはめて表示します。",
    "Cloud Apps": "社内で使われているクラウドサービス（シャドーIT 含む）を可視化します。",
    "DLP": "機密情報の持ち出し検知（DLP）の状況を表示します。",
    "SaaS Security API": "Microsoft 365 などと API 連携し、公開リンクなどの設定リスクを確認します。",
    "SDP Users": "リモートユーザーの利用状況（OS・バージョン・国）のダッシュボード。",
    "Network Dashboard": "全拠点の通信量と回線品質をまとめて表示します。",
    "Best Practices": "推奨設定ができているかを採点し、未対応の項目を案内します。",
    "Stories Dashboard": "XDR が関連付けたインシデント（ストーリー）の一覧と傾向。",
    "Stories Workbench": "ストーリーを1件ずつ調査・対応する作業画面。",
    "Groups": "拠点やホストをまとめた「グループ」を管理します。ルールで使うと保守が楽になります。",
    "DNS Settings": "DNS サーバと、社内ドメインの転送先（Domain Forwarding）を設定します。",
    "Device Posture": "端末の状態チェック（OS・ウイルス対策など）と、その組み合わせのプロファイルを管理します。",
    "Threat Prevention": "IPS・アンチマルウェア・DNS 保護などの脅威防御を設定します。",
    "Application Control": "SaaS の操作（アップロード等）を許可・ブロックするルール（CASB）。",
    "Data Protection": "機密データ（カード番号など）の持ち出しを検知・ブロックするルール（DLP）。",
    "Device Inventory": "Kato が把握している端末の一覧（OS・利用者・状態）。",
    "License": "契約しているライセンスの内容と使用状況を確認します。",
    "API Keys": "API・自動化（Terraform など）用のキーを発行・管理します。",
    "What's New": "研修サイトの更新内容と、実機の新機能の確認方法。",
    "Real-Time": "この拠点の通信を1秒ごとにリアルタイム表示します。",
    "High Availability": "Sokket 2台構成（HA）の状態と切り替え試験。",
    "Snapshot": "Sokket の状態、回線の Up/Down、遅延、接続履歴を確認します。",
    "Network Analytics": "スループット、パケットロス、遅延、ジッタのグラフを確認します。",
    "General": "サイト名・種別・ライセンス・タイムゾーンなどの基本設定です。",
    "Sokket": "Sokket 本体の情報と、Sokket WebUI・再起動・RMA 交換などの操作です。",
    "Networks": "Native Range（拠点のLAN）と Routed Range（L3スイッチの先）を確認します。",
    // ポリシー画面の操作
    "New": "新しいルール（項目）を追加します。右側に入力パネルが開きます。",
    "＋ New": "新しい項目を追加します。右側に入力パネルが開きます。",
    "Save": "変更を自分専用の「未公開リビジョン」に保存します。まだ全社には反映されません。",
    "Publish": "保存した変更を全社に反映します。公開は取り消せないので、内容を見直してから押します。",
    "Discard": "未公開の変更をすべて捨てて、公開中の状態に戻します（取り消し不可）。",
    "Compare View": "公開中のポリシーと自分の変更の違い（追加・変更・削除・移動）を表示します。",
    "Apply": "パネルの内容を一覧に反映します。ポリシー画面ではこの後に Save → Publish が必要です。",
    "Cancel": "入力内容を捨ててパネルを閉じます。",
    "Delete": "この項目を削除します。ポリシーの場合は Save → Publish するまで反映されません。",
    "⋮": "編集・上下移動・複製・削除のメニューを開きます。",
    "Edit": "このルールを編集します。",
    // 各画面
    "Export Events": "絞り込んだイベントを CSV に出力します（研修版では出力しません）。",
    "Clear all": "すべてのフィルターを外します。",
    "Sokket WebUI": "Sokket のローカル管理画面を開きます（実機では自動ログイン）。",
    "Actions ▾": "選択中の項目に対する操作（MFA リセット、Sokket WebUI など）を選びます。",
    "＋ Allocate": "選んだロケーションの固定IPを1つ追加します。［Save］で確定します。",
    "Download Root Certificate": "TLS Inspection 用のルート証明書を取得します。全端末に配布が必要です。",
    "New SCIM App": "IdP（Entra ID など）と SCIM で連携する設定を追加します。",
    "＋ New SCIM App": "IdP（Entra ID など）と SCIM で連携する設定を追加します。",
    "Sync Status": "SCIM 同期の最新状況を確認します。",
    "研修を開始": "名前とメールは何を入れても進めます。入力内容はこのブラウザ内にだけ保存されます。",
    "閉じる": "このパネルを閉じます。"
  };
  /* 列見出し（th）の解説 */
  const COLTIPS = {
    "#": "評価の順番。上から順に照合され、最初に一致したルールが使われます。",
    "On": "ルールの有効/無効。オフのルールは評価されません。",
    "Name": "ルール・項目の名前。命名規則と申請番号を入れると後で追いやすくなります。",
    "Source": "通信の送信元（誰・どこから）。空欄は Any（すべて）。",
    "Destination": "通信の宛先。空欄は Any（すべて）。",
    "Destination / Detail": "通信の宛先、または接続イベントの詳細。",
    "Dir": "方向。→ は送信元から宛先の片方向、⇄ は双方向。",
    "App/Category": "対象のアプリ・カテゴリ・ドメイン。複数あれば OR（どれか一致）。",
    "Service/Port": "対象のサービスやポート（SMB、HTTPS など）。",
    "Action": "一致したときの動作。Allow＝許可、Block＝遮断、Prompt＝警告して続行可。",
    "Track": "Events にログを残すかどうか。",
    "Time": "日時、またはルールが有効な時間帯。",
    "Rule Type": "WAN＝社内間の通信、Internet＝インターネット向けの通信。",
    "Bandwidth Priority": "混雑時の優先度。数字が小さいほど先に流れます（既定は p255）。",
    "Transport": "Primary / Secondary の経路。通常は Kato（バックボーン経由）。",
    "Route/NAT": "インターネットへの出口。Route Via＝指定 PoP から、NAT＝自社専用 IP から出す。",
    "Status": "拠点・管理者などの現在の状態。",
    "Site Type": "拠点の種類（アイコンが変わるだけ）。",
    "Connection Type": "接続方式（Sokket の型番・vSokket・IPsec）。",
    "Location": "拠点の所在地。最寄り PoP とメンテナンス時間帯に影響。",
    "Connected PoP": "今つながっている Kato の接続拠点。",
    "Native Range": "拠点 LAN のアドレス範囲。他拠点と重複不可。",
    "License": "拠点に割り当てた帯域ライセンス。",
    "Users/Groups": "ルールの対象ユーザー・グループ。",
    "Platforms": "対象 OS。",
    "Countries": "接続元の国。",
    "Device Posture Profiles": "端末の状態条件（会社PC・AV 稼働など）。",
    "SDP License": "リモート接続の権利。Assigned でないと Kato Client で接続できません。",
    "Client Status": "Kato Client の接続状態。",
    "Last Connected": "最後にリモート接続した日時。",
    "Origin": "ユーザーの登録元。SCIM＝IdP から自動同期、Manual＝手動作成。",
    "Role": "権限。Editor＝変更可、Viewer＝閲覧のみ。回線の場合は Active / Last Resort。",
    "MFA": "多要素認証の状態。Pending は本人の再登録待ち。",
    "Password Expiry": "パスワードの有効期限ポリシー。",
    "Last Login": "最後に管理画面へログインした日時。",
    "Admin": "操作した管理者。",
    "Module": "操作された画面（機能）。",
    "Object": "操作対象。",
    "Details": "変更内容の要約。",
    "Event Type": "イベントの種類（Security / Connectivity / Routing など）。",
    "Sub-Type": "種類の内訳（Internet Firewall、IPS、Link Quality など）。",
    "Rule": "一致したルール名。どのルールで止められたかはここを見ます。",
    "IP Address": "割り当てられた自社専用の送信元 IP。",
    "Location (PoP)": "IP が属する PoP の場所。",
    "Allocated": "割り当てた日時。",
    "Used in Network Rules": "この IP を NAT に使っている Network Rule。",
    "Priority": "優先度（2〜254）。数字が小さいほど優先。",
    "Limits": "帯域制限のかけ方。",
    "Upload Limit": "上り方向の上限。", "Download Limit": "下り方向の上限。",
    "Interface": "Sokket の回線ポート。", "ISP": "回線事業者。",
    "Link Status": "回線の Up / Down。", "Media Connected": "ケーブルが挿さっているか。",
    "RTT": "PoP までの往復遅延（小さいほど良い）。", "Bandwidth (Down/Up)": "設定している回線帯域。", "Speed / Duplex": "リンク速度と全二重/半二重。",
    "Email": "ログインID・連絡先のメールアドレス。", "Groups": "所属グループ（IdP から同期）。", "OS": "接続端末の OS。",
    "Identity Provider": "連携している IdP。", "Last Sync": "最後に同期した日時。", "Synced Users": "同期されたユーザー数。",
    "Serial": "Sokket 本体のシリアル番号。", "Model": "Sokket の型番。", "Version": "Sokket のソフトウェアバージョン。",
    "Subnet": "アドレス範囲。", "Local IP": "Sokket の LAN 側 IP。", "DHCP": "DHCP の動作（サーバ／リレー）。",
    "Site": "拠点（サイト）の名前。", "Health": "回線品質から判定した拠点の状態（良好／品質注意／切断中）。", "Bandwidth Usage": "契約帯域に対する使用率。85% 以上は増速の検討対象。",
    "Packet Loss (%)": "パケットロス率。1% 以上は要注意。", "RTT (ms)": "PoP までの往復遅延。", "Jitter (ms)": "遅延の揺らぎ。5ms 以上は Web会議・電話に影響。", "Active Hosts": "通信している端末数。", "Top App": "通信量が一番多いアプリ。", "PoP": "接続している Kato の PoP。",
    "User": "ユーザー（メールアドレス）。", "Connected Since / Last": "接続開始時刻、または最後に接続した時刻。", "Client Version": "Kato Client のバージョン。古いものは更新を案内。", "Country": "接続元の国。",
    "Application": "アプリ・サービス名。", "Category": "アプリやチェック項目の分類。", "Traffic": "通信量。", "Users": "利用者数。", "Risk": "リスクの高さ。", "Risk Score": "リスクの高さ（10 が最も高い）。",
    "Prefix": "宛先のアドレス範囲。", "Next Hop": "次に通る場所。", "Type": "種類。", "Origin": "どこから来た経路・登録元か。",
    "Threats": "脅威の件数。", "Main Type": "主な脅威の種類。", "Signature": "検知した攻撃パターンの名前。", "Severity": "重大度（Critical が最も高い）。", "Count": "件数。",
    "Destination": "通信の宛先。", "Data Type": "検知した機密データの種類。", "SaaS": "API 連携しているクラウドサービス。", "Issue": "見つかった問題。", "Owner": "持ち主・担当者。", "Last Scan": "最後にスキャンした日時。",
    "Check": "推奨設定の項目。", "Result": "Passed＝満たしている、Failed＝未対応。", "Why it matters": "その設定が必要な理由。",
    "ID": "ストーリーの番号。", "Title": "ストーリーの内容。", "User / Host": "関係するユーザーと端末。", "Created": "作成日時。",
    "Description": "説明。", "Members": "グループに含まれる拠点・ホスト。", "Used in": "このグループ・プロファイルを使っているルール。",
    "Domain": "転送するドメイン。", "DNS Server": "転送先の DNS サーバ。", "Condition": "チェックの条件。", "Pass Rate": "条件を満たす端末の割合。", "Profile": "プロファイル名。", "Device Checks（AND）": "すべて満たす必要があるチェック。",
    "Engine": "脅威防御のエンジン。", "What it does": "エンジンの役割。", "Mode": "Block＝止める、Monitor＝記録のみ、Off＝無効。", "Reason": "例外にした理由・申請番号。",
    "Hostname": "端末名。", "Posture": "端末の状態チェックの結果。", "Service": "セキュリティサービス。", "Note": "補足。", "Assigned": "割り当て状況。",
    "Permission": "API キーの権限。View＝読み取り、Edit＝変更可。", "Allowed IPs": "API キーを使える接続元 IP。", "Expires": "有効期限。", "Last Used": "最後に使われた日時。", "Data Profile": "検知するデータの種類。", "Activity": "SaaS 内の操作（アップロードなど）。",
    "Host": "端末。", "Main App": "主なアプリ。", "Mbps": "いまの通信量。", "Interface": "Sokket の回線ポート。",
    "番号": "図中の番号に対応します。", "場所": "画面上の場所。", "役割": "その場所でできること。", "項目": "入力項目。", "入力のポイント": "間違えやすい点。"
  };
  /* 表の中の状態語 → 現状の説明 */
  const STATES = [
    ["Disconnected", "切断中：Kato Cloud に接続していません。Snapshot で回線と接続履歴を確認します。"],
    ["Pending", "未接続：サイトは作成済みですが、Sokket がまだ接続されていません。"],
    ["Invited", "招待中：招待メール送信済み。本人が有効化すると Active になります。"],
    ["Waiting for IdP", "IdP 側でプロビジョニングを開始するのを待っています。"],
    ["Offline", "Sokket がオフラインです。"],
    ["Down", "回線が切れています。"],
    ["Standby", "待機中：予備回線（Last Resort）として、他の回線が全部切れたときだけ使われます。"],
    ["Disabled", "無効化されたユーザーです。接続できません。"],
    ["Block", "遮断：この通信・ルールはブロックです。"],
    ["Prompt", "警告：ユーザーが同意すれば続行できます。"],
    ["Bypass", "検査しない（TLS 復号の対象外）。"],
    ["Inspect", "TLS を復号して検査します。"],
    ["Connected", "接続中：正常に Kato Cloud とつながっています。"],
    ["Active", "有効：正常に利用中です。"],
    ["Assigned", "SDP ライセンスあり：リモート接続できます。"],
    ["Allow", "許可：この通信・ルールは許可です。"],
    ["Up", "回線は正常（Up）です。"]
  ];
  function rowTip(tr) {
    if (tr.dataset.tip) return tr.dataset.tip;
    if (tr.classList.contains("sec-row")) return "区切り：" + tr.textContent.trim();
    const table = tr.closest("table");
    if (!table || !tr.closest("tbody")) return "";
    const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const cells = [...tr.children];
    if (cells.length === 1) return "【空の一覧】" + tr.textContent.trim() + "\n項目を追加すると、ここに並びます。";
    const parts = [];
    cells.forEach((td, i) => {
      let v = (td.innerText || td.textContent || "").replace(/\s+/g, " ").trim();
      const sw = td.querySelector('input[type="checkbox"]');
      if (sw && !v) v = sw.checked ? "有効" : "無効";
      const h = heads[i] || "";
      if (!v || !h || h === "#" || v === "▸" || v === "▾" || v === "⋮") return;
      if (parts.length < 6) parts.push(h + "：" + v.slice(0, 60));
    });
    const all = cells.map((c) => c.textContent.trim()).join(" | ");
    const st = STATES.find(([k]) => new RegExp("(^|[^A-Za-z])" + k + "([^A-Za-z]|$)").test(all));
    let out = (table.classList.contains("mini") ? "【解説】" : "【現状】") + parts.join(" ／ ");
    if (st) out += "\n" + st[1];
    if (tr.classList.contains("locked")) out += "\n既定ルールのため編集できません。";
    else if (tr.classList.contains("clickable")) out += "\nクリックで詳細・編集を開きます。";
    return out;
  }
  App.SIDE_TIPS = TIPS;
  let tipEl = null, tipTimer = null, tipFor = null, mouse = { x: 0, y: 0 };
  function tipText(el) {
    if (el.dataset && el.dataset.tip) return el.dataset.tip;
    if (el.getAttribute && el.getAttribute("title") && !(el instanceof SVGElement)) { el.dataset.tip = el.title; el.removeAttribute("title"); return el.dataset.tip; }
    if (el.tagName === "TR") return rowTip(el);
    const txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (el.tagName === "TH") {
      const key = txt.replace(/\s*[▲▼]$/, "");
      if (!key) return "";
      return "列「" + key + "」：" + (COLTIPS[key] || "この列の値です。行にマウスを乗せると、その行の内容と状態がまとめて表示されます。") + (el.dataset.sort ? "\nクリックで並べ替えできます。" : "");
    }
    if (el.matches && el.matches(".kv > div")) {
      const dt = el.querySelector("dt"), dd = el.querySelector("dd");
      const k = dt ? dt.textContent.trim() : "";
      const KV = { "Connection Type": "接続方式。", "Connected": "PoP に連続して接続している時間。短いと頻繁に切れている可能性があります。", "Connected PoP": "今つながっている PoP。", "Sokket Version": "Sokket のソフトウェアのバージョン（自動更新）。", "Last Update": "Sokket が PoP から最後に更新を受けてからの時間。", "Native Range": "拠点 LAN のアドレス範囲。" };
      return "【現状】" + k + "：" + (dd ? dd.textContent.trim() : "") + (KV[k] ? "\n" + KV[k] : "");
    }
    if (TIPS[txt]) return TIPS[txt];
    const first = txt.split(" ")[0];
    if (!txt && el.getAttribute && el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    if (el.classList && el.classList.contains("mission-fab")) return "練習の課題リストを開きます。操作するとチェックが付きます。";
    if (el.closest && el.closest(".switch")) return "オン（青）で有効、オフ（灰色）で無効です。";
    return TIPS[first] && first.length > 2 ? TIPS[first] : "";
  }
  function showTip(el, text) {
    text = text || tipText(el);
    if (!text) return;
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tipbox"; tipEl.setAttribute("role", "tooltip"); tipEl.id = "tipbox"; document.body.appendChild(tipEl); }
    tipEl.textContent = text;
    tipEl.hidden = false;
    let r = el.getBoundingClientRect();
    // 大きな要素（行・図など）はマウスの位置に出す
    if ((r.height > 44 || r.width > 420 || el.tagName === "TR") && mouse.x) r = { left: mouse.x - 1, right: mouse.x + 1, top: mouse.y - 10, bottom: mouse.y + 10, width: 2, height: 20 };
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let top = r.bottom + 8, above = false;
    if (top + h > innerHeight - 8) { top = r.top - h - 8; above = true; }
    let left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
    tipEl.style.top = Math.max(8, top) + "px"; tipEl.style.left = left + "px";
    tipEl.classList.toggle("above", above);
    tipEl.style.setProperty("--ax", Math.max(10, Math.min(w - 10, r.left + r.width / 2 - left)) + "px");
    if (el.setAttribute) el.setAttribute("aria-describedby", "tipbox");
  }
  function hideTip() { clearTimeout(tipTimer); if (tipEl) tipEl.hidden = true; if (tipFor && tipFor.removeAttribute) tipFor.removeAttribute("aria-describedby"); tipFor = null; }
  App.hideTip = hideTip;
  const TIP_SEL = "button, a.btn, a.side-item, .tabs a, .guide-btn, .switch, [data-tip], .node, .train-pill, tbody tr, thead th, .kv > div";
  function findTip(target) {
    let el = target.closest ? target.closest(TIP_SEL) : null;
    while (el) {
      if (el.closest(".pop, .tipbox")) return null;
      const t = tipText(el);
      if (t) return { el, t };
      el = el.parentElement ? el.parentElement.closest(TIP_SEL) : null;
    }
    return null;
  }
  document.addEventListener("mousemove", (e) => { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.addEventListener("mouseover", (e) => {
    const f = findTip(e.target);
    const el = f ? f.el : null;
    if (el === tipFor) return;
    hideTip();
    if (!f) return;
    tipFor = el;
    tipTimer = setTimeout(() => showTip(el, f.t), 380);
  });
  document.addEventListener("mouseout", (e) => { if (tipFor && !tipFor.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener("focusin", (e) => { if (!e.target.matches || !e.target.matches(":focus-visible")) return; const f = findTip(e.target); if (f) { hideTip(); tipFor = f.el; mouse = { x: 0, y: 0 }; showTip(f.el, f.t); } });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("mousedown", hideTip);
  document.addEventListener("scroll", hideTip, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });

  /* =====================================================================
     初回の「画面の見方」ポップアップ（右上の ? でいつでも再表示）
     ===================================================================== */
  App.tour = () => {
    $$(".tour").forEach((n) => n.remove());
    const m = document.createElement("div");
    m.className = "modal tour";
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "tourTitle");
    const TT = ["", "① 上部タブ：大きな分類を切り替えます。", "② 左メニュー：タブの中の画面を選びます。", "③ 作業エリア：一覧で状態を確認し、New や行のクリックで編集します。", "④ ボタンや表の行、図にマウスを乗せると、このような説明が出ます。", "⑤ 操作要領：図解の手順書を開きます。", "⑥ 研修ミッション：練習の課題リスト。"];
    const C = (n, x, y) => `<g data-tip="${TT[n]}"><circle cx="${x}" cy="${y}" r="11" fill="#e58a00"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${n}</text></g>`;
    m.innerHTML = `<div class="tour-card">
      <p class="tour-eyebrow">はじめての方へ</p>
      <h2 id="tourTitle">画面の見方と、まず最初にやること</h2>
      <div class="tour-grid">
        <svg viewBox="0 0 420 250" class="tour-fig" role="img" aria-label="画面の構成図">
          <rect x="1" y="1" width="418" height="248" rx="6" fill="#f4f5f7" stroke="#c9ced4"/>
          <rect x="1" y="1" width="418" height="30" rx="6" fill="#fff" stroke="#e1e4e8"/>
          <rect x="1" y="1" width="78" height="30" fill="#0b66f0"/><text x="10" y="20" font-size="10" fill="#fff" font-weight="700">KMC TRAINER</text>
          <text x="96" y="20" font-size="9.5" fill="#0b66f0" font-weight="700">Monitoring</text><rect x="94" y="27" width="52" height="3" fill="#0b66f0"/>
          <text x="154" y="20" font-size="9.5" fill="#2b2f33">Network  Access  Security  …</text>
          <rect x="318" y="9" width="58" height="14" rx="7" fill="#e8f1ff" stroke="#0b66f0"/><text x="347" y="19" font-size="8.5" text-anchor="middle" fill="#0b66f0">操作要領</text>
          <circle cx="398" cy="16" r="7" fill="none" stroke="#2b2f33"/><text x="398" y="19.5" font-size="9" text-anchor="middle">?</text>
          <rect x="1" y="31" width="78" height="218" fill="#fff" stroke="#e1e4e8"/>
          <text x="9" y="50" font-size="7.5" fill="#6b7178">インベスティゲーション</text>
          <rect x="1" y="56" width="78" height="16" fill="#e8f1ff"/><rect x="1" y="56" width="3" height="16" fill="#0b66f0"/><text x="12" y="67" font-size="8.5">トポロジー</text>
          <text x="12" y="85" font-size="8.5">イベント</text><text x="12" y="101" font-size="7.5">オーディット・トレイル</text>
          <rect x="92" y="44" width="314" height="24" rx="2" fill="#fffbea" stroke="#f1df9b"/><text x="100" y="60" font-size="8.5" fill="#6c5300">ヒント：この画面で注意するポイント</text>
          <rect x="92" y="76" width="314" height="150" rx="2" fill="#fff" stroke="#e1e4e8"/>
          <rect x="256" y="84" width="34" height="14" rx="2" fill="#fff" stroke="#c9ced4"/><text x="273" y="94" font-size="8" text-anchor="middle">New</text>
          <rect x="294" y="84" width="34" height="14" rx="2" fill="#fff" stroke="#c9ced4"/><text x="311" y="94" font-size="8" text-anchor="middle">Save</text>
          <rect x="332" y="84" width="44" height="14" rx="2" fill="#0b66f0"/><text x="354" y="94" font-size="8" text-anchor="middle" fill="#fff">Publish</text>
          <rect x="300" y="100" width="98" height="20" rx="2" fill="#2b2f33"/><text x="349" y="113" font-size="7.5" text-anchor="middle" fill="#fff">マウスを乗せると説明</text>
          <path d="M311 98l4 3h-8z" fill="#2b2f33"/>
          ${[0, 1, 2, 3].map((k) => `<rect x="100" y="${128 + k * 22}" width="290" height="14" fill="${k % 2 ? "#fff" : "#f6f8fa"}"/>`).join("")}
          <rect x="316" y="226" width="96" height="18" rx="9" fill="#263238"/><text x="364" y="238" font-size="8" text-anchor="middle" fill="#fff">研修ミッション 0/15</text>
          ${C(1, 120, 10)}${C(2, 40, 120)}${C(3, 220, 160)}${C(4, 395, 120)}${C(5, 330, 36)}${C(6, 300, 226)}
        </svg>
        <ol class="tour-legend">
          <li><b>上部タブ</b>：大きな分類（Monitoring・Network・Security など）を切り替えます。</li>
          <li><b>左メニュー</b>：タブの中の画面を選びます。</li>
          <li><b>作業エリア</b>：一覧で状態を確認し、［New］や行のクリックで編集します。</li>
          <li><b>ボタンの説明</b>：ボタンやメニューにマウスを乗せると、何をするボタンか表示されます。</li>
          <li><b>操作要領</b>：図解の手順書を開きます。迷ったらここ。</li>
          <li><b>研修ミッション</b>：練習の課題リスト。操作すると自動でチェックが付きます。</li>
        </ol>
      </div>
      <div class="must">
        <h3>まず最初に、必ずやること</h3>
        <ol>
          <li><span>1</span><div><b>変更の反映ルールを覚える</b>：Apply → <b>Save</b> → <b>Publish</b>。Save だけでは反映されません。</div></li>
          <li><span>2</span><div><b>Topology で全体を確認</b>：赤い拠点（切断）がないかを見るのが毎日の第一歩です。</div></li>
          <li><span>3</span><div><b>トレーニングはチュートリアルから</b>：右上の［トレーニング］を開き、光る場所を順に押して流れを体験。クリアしたら「ガイドなし」の実践チャレンジに進みます。</div></li>
        </ol>
      </div>
      <div class="tour-f"><label class="check"><input type="checkbox" id="tourNo" checked>次回から自動で表示しない</label>
        <a class="btn" href="guide.html#must">${App.icon("book")}操作要領を開く</a><button class="btn btn-primary" type="button" data-go>はじめる</button></div>
    </div>`;
    document.body.appendChild(m);
    const close = () => {
      if ($("#tourNo", m).checked) App.db.set("tourSeen", true);
      m.remove();
      App.emit("tour:close", {});
      setTimeout(() => { if (!(App.trainer && App.trainer.claimsStartup())) App.pageHelp(); }, 250);
    };
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-go]")) close(); if (e.target.closest("a.btn")) App.db.set("tourSeen", true); });
    m.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    $("[data-go]", m).focus();
  };

  /* ---------------- 起動 ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderShell();
    if (!document.body.dataset.nomission) {
      // この画面を開いたことを「visit」手順としてチェック（通知は出さない）
      App.MISSIONS.filter((m) => m.href === curPage()).forEach((m) => App.step(m.id, "visit", { quiet: true }));
      renderMissions();
      renderTracker();
      coachObs.observe(document.body, { childList: true, subtree: true });
    }
    // 見出しの横に「この画面の使い方」ボタン
    const pt = $(".page-title, .site-head");
    if (pt && document.body.dataset.tab) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn btn-text ph-open"; b.dataset.tip = "この画面の使い方をもう一度表示します。";
      b.innerHTML = App.icon("help") + "この画面の使い方";
      b.onclick = () => App.pageHelp(true);
      pt.appendChild(b);
    }
    if (App.db.get("gradPending", false)) setTimeout(App.graduation, 700);
    else if (!document.body.dataset.notour && !App.db.get("tourSeen", null)) setTimeout(App.tour, 250);
    else setTimeout(() => { if (!(App.trainer && App.trainer.claimsStartup())) App.pageHelp(); }, 400);
    // 別のタブでの操作もリアルタイムに反映
    window.addEventListener("storage", (e) => {
      if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
      const k = e.key.slice(PREFIX.length);
      if (k === "missions" || k === "msteps") { renderMissions(); renderTracker(); }
      if (k === "notifs") updateBell();
    });
  });
})();
