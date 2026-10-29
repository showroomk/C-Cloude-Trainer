/* =====================================================================
   KMC Trainer ⇄ NetLab ラボ連動
   - lab/index.html の中（同じオリジンの iframe）で開かれたときだけ動く
   - サイト・ユーザー・SDP 範囲・WAN / Internet Firewall の保存先はラボのファイル（app.js の App.db が切り替える）
   - ここでは、ラボの実際の状態を表示する画面と、ラボでしか意味のない設定画面を追加する
   ===================================================================== */
(function () {
  "use strict";
  const App = window.App;
  if (!App) return;
  // ICMP is useful in the lab and harmless in the standalone trainer
  if (App.opt && App.opt.services.indexOf("ICMP") < 0) App.opt.services.unshift("ICMP");
  const NL = App.LAB;
  if (!NL) return;
  const esc = App.esc;
  const L = () => NL.cato;
  const isIP = (s) => NL.util.isIP(String(s || "").trim());
  const redraws = [];
  App.labRedraw = (fn) => redraws.push(fn);
  App.labRefresh = () => {
    const a = document.activeElement;
    if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return;
    redraws.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  };
  App.liveSite = (id) => L().siteById(id);
  App.liveStatus = (s) => { const c = L().siteById(s.id); return c ? L().siteStatus(c) : "Pending"; };
  App.popName = () => L().cfg().popName;

  // pickers draw from what exists in the lab
  App.opt.sources = () => {
    const users = App.users(), groups = [];
    users.forEach((u) => (u.groups || []).forEach((g) => { if (groups.indexOf(g) < 0) groups.push(g); }));
    return ["SDP Users (all)"].concat(groups.map((g) => "Group: " + g), users.filter((u) => u.sdp).map((u) => "User: " + u.email),
      App.sites().map((s) => "Site: " + s.name), App.sites().map((s) => "IP Range: " + s.native).filter((x) => !/undefined/.test(x)));
  };
  App.opt.destinations = () => App.sites().map((s) => "Site: " + s.name)
    .concat(App.sites().reduce((a, s) => a.concat((s.ranges || []).map((r) => "IP Range: " + r.cidr)), []), ["Host: Web (198.51.100.10)", "SDP Users (all)"]);

  /* ---------------- 画面上部の連動バナー ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.createElement("div");
    bar.className = "lab-banner";
    bar.innerHTML = "<b>ラボ連動中</b>（NetLab）— Sites・Users・WAN / Internet Firewall の設定はラボに保存され、通信に反映されます。監視系の一部の画面は見本データです。";
    document.body.prepend(bar);
    const page = document.body.dataset.page;
    if (page === "sites") sitesExtras();
    if (page === "users") usersExtras();
  });

  function eventsCard(filter) {
    const ev = L().events().filter((e) => !filter || e.site === filter || e.msg.indexOf(filter) >= 0).slice(0, 30);
    return App.card("ラボのイベント", ev.length ? App.table(["Time", "Type", "Site", "Detail"], ev.map((e) => ({ cells: [esc(e.time), esc(e.type), esc(e.site), esc(e.msg)] })))
      : '<p class="muted" style="padding:14px">まだイベントはありません。Sokket の WAN を設定してトンネルが張られると記録されます。</p>', { flush: true });
  }
  function sitesExtras() {
    const main = document.getElementById("main") || document.querySelector("main");
    if (!main) return;
    const box = document.createElement("div");
    box.style.marginTop = "14px";
    main.appendChild(box);
    const draw = () => { box.innerHTML = eventsCard(); };
    draw(); App.labRedraw(draw);
  }
  function usersExtras() {
    const main = document.getElementById("main") || document.querySelector("main");
    if (!main) return;
    const box = document.createElement("div");
    box.innerHTML = App.card("SDP Client IP Range（ラボ）", '<div class="card-b" style="max-width:560px"><div class="field"><label for="sdpRange">Kato Client に配る IP 範囲（CIDR）</label><input class="input mono" id="sdpRange" value="' + esc(App.db.get("sdpRange", "10.0.3.0/24")) + '"><span class="help">サイトの範囲と重ならないようにします。次の接続から反映されます。</span></div><button class="btn btn-primary" type="button" id="sdpSave">Save</button></div>');
    main.prepend(box);
    document.getElementById("sdpSave").onclick = () => {
      const p = NL.util.parseCidr(document.getElementById("sdpRange").value);
      if (!p || p.net !== p.addr) { App.toast("ネットワークアドレスの CIDR（例 10.0.3.0/24）で入力してください。", "ng"); return; }
      App.db.set("sdpRange", p.net + "/" + p.len);
      App.audit("Users", "Update", "SDP Client IP Range", p.net + "/" + p.len);
      App.toast("SDP の IP 範囲を保存しました。", "ok");
    };
  }

  /* ---------------- サイト詳細（ラボ連動版） ---------------- */
  App.labSitePage = function () {
    const id = App.db.get("selectedSite", (App.sites()[0] || {}).id);
    let view = "snapshot";
    const get = () => App.sites().find((s) => s.id === id);
    const save = (mut, what) => {
      const all = App.sites(); const t = all.find((s) => s.id === id);
      if (!t) return;
      mut(t); App.db.set("sites", all);
      App.audit("Sites", "Update", t.name, what);
    };
    if (!get()) { document.addEventListener("DOMContentLoaded", () => { document.getElementById("view").innerHTML = '<div class="card"><div class="card-b">サイトがありません。<a href="sites.html">Sites</a> で作成してください。</div></div>'; }); return; }
    const isIpsec = () => /IPsec/.test(get().conn);
    const views = () => [
      ["SITE MONITORING", [["snapshot", "Snapshot", "target"], ["events", "Events", "list"]]],
      ["SITE CONFIGURATION", isIpsec()
        ? [["general", "General", "site"], ["networks", "Networks", "route"], ["ipsec", "IPsec", "key"]]
        : [["general", "General", "site"], ["socket", "Sokket", "socket"], ["networks", "Networks", "route"], ["wan", "WAN / Link", "gauge"], ["ha", "High Availability", "nodes"]]]
    ];
    const status = () => App.liveStatus(get());
    App.customSidebar = function () {
      const st = status();
      return '<a class="side-item" href="sites.html">' + App.icon("back") + "<span>" + App.kana("All Sites") + "</span></a>" +
        '<div class="side-site"><b>' + esc(get().name) + '</b><span class="dot ' + (st === "Connected" ? "ok" : st === "Disconnected" ? "ng" : "warn") + '"></span>' + st + "</div>" +
        views().map((sec) => '<div class="side-sec"><h6>' + App.kana(sec[0]) + "</h6>" + sec[1].map((it) => '<button type="button" class="side-item" data-view="' + it[0] + '">' + App.icon(it[2]) + "<span>" + App.kana(it[1]) + "</span></button>").join("") + "</div>").join("");
    };
    const badge = (st) => st === "Connected" ? '<span class="badge b-ok">Connected</span>' : st === "Disconnected" ? '<span class="badge b-ng">Disconnected</span>' : '<span class="badge b-warn">Pending</span>';
    function header(title) {
      const s = get(), st = status();
      let alert = "";
      if (st !== "Connected") {
        const hint = isIpsec()
          ? "ルーターから PoP（" + esc(L().popIp() || "—") + "）へ IKEv2 が届いていないか、設定が一致していません。IPsec 画面の状態と、ラボのイベントに出る理由を確認します。"
          : (!(s.serials || {}).primary ? "まだ Sokket のシリアルが割り当てられていません。左の「Sokket」で割り当てます。" : "Sokket が PoP にトンネルを張れていません。Sokket のローカル管理画面（https://169.254.100.1）で WAN の IP と、上流ルーターの NAT・デフォルトルートを確認します。");
        alert = '<div class="alert-bar"' + (st === "Pending" ? ' style="background:var(--warn-soft);color:#8a5200;border-color:#f1d49a"' : "") + ">" + App.icon("alert") + "<div>" + hint + "</div></div>";
      }
      return '<div class="site-head"><h1>' + esc(s.name) + ' <span class="muted">/ ' + title + "</span></h1>" + badge(st) + "</div>" + alert;
    }
    const field = (label, inner, help) => '<div class="field"><label>' + label + "</label>" + inner + (help ? '<span class="help">' + help + "</span>" : "") + "</div>";
    const input = (idn, val, extra) => '<input class="input" id="' + idn + '" value="' + esc(val == null ? "" : val) + '" ' + (extra || "") + ">";
    const select = (idn, opts, val) => '<select class="select" id="' + idn + '">' + opts.map((o) => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(l) + "</option>"; }).join("") + "</select>";
    const R = {
      snapshot() {
        const s = get(), c = L().siteById(id);
        let body = '<div class="card"><div class="card-h"><h2>Device Overview</h2></div><dl class="kv" style="margin:0">' +
          "<div><dt>Connection Type</dt><dd>" + esc(s.conn) + "</dd></div><div><dt>Status</dt><dd>" + badge(status()) + "</dd></div>" +
          "<div><dt>Connected PoP</dt><dd>" + (status() === "Connected" ? esc(App.popName()) : "—") + "</dd></div>" +
          '<div><dt>Native Range</dt><dd class="mono">' + esc(s.native) + '</dd></div><div><dt>Local IP</dt><dd class="mono">' + esc(s.localIp) + "</dd></div>";
        if (!isIpsec() && c) {
          const act = NL.devBySerial(L().activeSerial(c));
          body += "<div><dt>Active Sokket</dt><dd>" + (act ? esc(act.name) + ' <span class="mono muted">' + esc(act.serial) + "</span>" : "—") + "</dd></div><div><dt>HA</dt><dd>" + (s.ha ? esc(L().haStatus(c).reason) : "Single Sokket") + "</dd></div>";
        }
        body += "</dl></div>";
        if (!isIpsec() && c) {
          const ls = L().linkState(c);
          body += App.card("Link State（WAN）", App.table(["Interface", "Role", "Link", "Tunnel", "In Use", "WAN IP"], ls.length ? ls.map((l) => ({ cells: [l.wan, roleLabel(l.role),
            l.link ? '<span class="badge b-ok">Up</span>' : '<span class="badge b-ng">Down</span>', l.tunnel ? '<span class="badge b-ok">Up</span>' : '<span class="badge b-ng">Down</span>',
            l.inUse ? '<span class="badge b-info">使用中</span>' : '<span class="muted">—</span>', '<span class="mono">' + esc(l.ip || "—") + "</span>"] })) : [], { empty: "Sokket が割り当てられていません" }), { flush: true });
        }
        if (isIpsec()) body += ipsecStatusCard();
        return header("Snapshot") + body + eventsCard(s.name);
      },
      events() { return header("Events") + eventsCard(get().name); },
      general() {
        const s = get();
        return header("General") + '<div class="card"><div class="card-b" style="max-width:640px"><div class="row2">' + field("Site Name", input("gName", s.name)) + field("Site Type", select("gType", ["Branch", "Headquarters", "Data Center", "Cloud Data Center"], s.type)) + "</div>" +
          '<div class="row2">' + field("Connection Type", input("gConn", s.conn, "readonly"), "作成後は変更できません（変更は作り直し）。") + field("License", input("gLic", s.license, "readonly")) + "</div>" +
          '<div class="row2">' + field("Country / City", input("gLoc", s.country + " / " + s.city, "readonly")) + field("Time Zone", input("gTz", s.tz, "readonly")) + "</div>" +
          '<button class="btn btn-primary" id="gSave" type="button">Save</button></div></div>';
      },
      socket() {
        const s = get(), c = L().siteById(id), inv = L().inventory();
        const opts = (cur) => [["", "（なし）"]].concat(inv.filter((i) => !i.site || i.site.id === id).map((i) => [i.serial, i.serial + "  " + i.dev.name + (i.connected ? "（接続済み）" : i.seen ? "" : "（未接続）")]));
        const rows = [["Primary", (s.serials || {}).primary], ["Secondary", s.ha ? (s.serials || {}).secondary : ""]].filter((r) => r[1]).map((r) => {
          const d = NL.devBySerial(r[1]);
          const act = d && c && L().activeSerial(c) === d.serial;
          return { cells: [r[0], '<span class="mono">' + esc(r[1]) + "</span>", d ? esc(d.name) : '<span class="muted">ラボに見つかりません</span>',
            d && ["WAN1", "WAN2"].some((w) => L().tunUp(d, w)) ? '<span class="badge b-ok">' + (s.ha ? (act ? "Active" : "Ready") : "Online") + "</span>" : '<span class="badge b-ng">Offline</span>', "9.9.0-TRN"] };
        });
        return header("Sokket") + App.card("Sokkets", App.table(["Role", "Serial", "Lab Device", "Status", "Version"], rows, { empty: "まだ Sokket が割り当てられていません" }), { flush: true }) +
          '<div class="card"><div class="card-h"><h2>Assign Sokket</h2></div><div class="card-b" style="max-width:640px">' +
          field("Primary Sokket", select("sPri", opts((s.serials || {}).primary), (s.serials || {}).primary), "シリアル番号は Sokket の物理タブや、ローカル管理画面のダッシュボードで確認できます。") +
          '<label class="switch" style="margin:4px 0 10px"><input type="checkbox" id="sHa" ' + (s.ha ? "checked" : "") + '><span class="track"></span>High Availability（Sokket 2 台構成）</label>' +
          field("Secondary Sokket", select("sSec", opts((s.serials || {}).secondary), (s.serials || {}).secondary), "HA をオンにしたときだけ使われます。") +
          '<button class="btn btn-primary" id="sSave" type="button">Save</button></div></div>';
      },
      networks() {
        const s = get();
        const rows = [{ cells: ["LAN1", "Native", '<span class="mono">' + esc(s.native) + "</span>", '<span class="mono">' + esc(s.localIp) + "</span>", ""] }].concat((s.ranges || []).map((r) => ({ cells: [esc(r.name), "Routed", '<span class="mono">' + esc(r.cidr) + "</span>", '<span class="mono">' + esc(r.gw) + "</span>", '<button class="btn" type="button" data-delrange="' + esc(r.id) + '">Delete</button>'] })));
        return header("Networks") + App.card("LAN Interfaces / Ranges", App.table(["Name", "Type", "Subnet", "Local IP / Gateway", ""], rows), { flush: true }) +
          '<div class="grid2"><div class="card" style="margin-top:0"><div class="card-h"><h2>Native Range</h2></div><div class="card-b">' +
          field("Native Range (CIDR)", input("nRange", s.native, 'class="input mono"'), isIpsec() ? "IPsec サイトの裏にある LAN です。" : "Sokket の LAN1 がつながるセグメント。") +
          field(isIpsec() ? "Local IP（拠点ルーターの LAN 側 IP）" : (s.ha ? "Local IP（HA では VIP）" : "Local IP"), input("nLocal", s.localIp), "LAN 側機器のゲートウェイになるアドレスです。") +
          '<button class="btn btn-primary" id="nSave" type="button">Save</button></div></div>' +
          '<div class="card" style="margin-top:0"><div class="card-h"><h2>Add Routed Range</h2></div><div class="card-b">' +
          field("Name", input("rName", "", 'placeholder="例：VLAN20-USERS"')) + field("Subnet (CIDR)", input("rCidr", "", 'placeholder="例：10.0.1.0/24"')) +
          field("Gateway", input("rGw", "", 'placeholder="例：10.0.0.4"'), "Native Range の中にある L3 スイッチ等のアドレス。") +
          '<button class="btn btn-primary" id="rAdd" type="button">Add</button></div></div></div>' +
          '<div class="tip"><span>L3 スイッチやルーターの先にあるセグメントは Routed として登録しないと、Kato はその宛先を拠点へ届けられません。</span></div>';
      },
      wan() {
        const s = get(), c = L().siteById(id);
        const roles = [["Active", "Active"], ["Passive", "Passive"], ["Last Resort", "Last Resort"]];
        const ls = c ? L().linkState(c) : [];
        return header("WAN / Link") + '<div class="card"><div class="card-h"><h2>WAN Interfaces</h2></div><div class="card-b" style="max-width:720px">' +
          '<div class="row2">' + field("WAN1 Role", select("w1Role", roles, (s.wan1 || {}).role || "Active")) + field("WAN1 Bandwidth Down / Up (Mbps)", input("w1Bw", ((s.wan1 || {}).down || 100) + " / " + ((s.wan1 || {}).up || 100))) + "</div>" +
          '<label class="switch" style="margin:4px 0 10px"><input type="checkbox" id="w2On" ' + (s.wan2 ? "checked" : "") + '><span class="track"></span>Enable WAN2（2 本目の回線）</label>' +
          '<div class="row2">' + field("WAN2 Role", select("w2Role", roles, (s.wan2 || {}).role || "Active")) + field("WAN2 Bandwidth Down / Up (Mbps)", input("w2Bw", ((s.wan2 || {}).down || 100) + " / " + ((s.wan2 || {}).up || 100))) + "</div>" +
          '<button class="btn btn-primary" id="wSave" type="button">Save</button></div></div>' +
          App.card("Link State（いま使っている回線）", App.table(["Interface", "Role", "Link", "Tunnel", "In Use"], ls.map((l) => ({ cells: [l.wan, roleLabel(l.role), l.link ? '<span class="badge b-ok">Up</span>' : '<span class="badge b-ng">Down</span>', l.tunnel ? '<span class="badge b-ok">Up</span>' : '<span class="badge b-ng">Down</span>', l.inUse ? '<span class="badge b-info">使用中</span>' : '<span class="muted">—</span>'] })), { empty: "Sokket が割り当てられていません" }), { flush: true }) +
          '<div class="tip"><span><b>回線冗長の確認：</b>WAN1 を Active、WAN2 を Passive にして保存し、RT1 で <span class="mono">interface g0/0 → shutdown</span> を実行します。数秒で In Use が WAN2 に移り、拠点の通信は続きます。Active が複数あるときは WAN1 を優先し、Active がすべて落ちると Passive、最後に Last Resort を使います。</span></div>';
      },
      ha() {
        const s = get(), c = L().siteById(id);
        if (!s.ha) return header("High Availability") + '<div class="card"><div class="card-b"><p><b>この拠点は HA（Sokket 2 台構成）ではありません。</b></p><p class="muted" style="margin-top:6px">左の「Sokket」で High Availability をオンにし、Secondary の Sokket を割り当てます。</p></div></div>';
        const r = c ? L().haStatus(c) : { ready: false, reason: "—" };
        const act = c ? NL.devBySerial(L().activeSerial(c)) : null;
        return header("High Availability") + '<div class="card"><div class="card-h"><h2>HA Status</h2>' + (r.ready ? '<span class="badge b-ok">Ready</span>' : '<span class="badge b-warn">' + esc(r.reason) + "</span>") + "</div>" +
          '<dl class="kv" style="margin:0"><div><dt>VIP（Local IP）</dt><dd class="mono">' + esc(s.localIp) + "</dd></div><div><dt>Active</dt><dd>" + (act ? esc(act.name) : "—") + "</dd></div></dl></div>" +
          '<div class="card"><div class="card-h"><h2>Sokket LAN IPs</h2></div><div class="card-b" style="max-width:640px"><div class="row2">' +
          field("Primary LAN IP", input("hPri", (s.haIps || {}).primary)) + field("Secondary LAN IP", input("hSec", (s.haIps || {}).secondary)) + "</div>" +
          '<p class="help" style="margin-bottom:10px">どちらも Native Range の中で、VIP（' + esc(s.localIp) + "）とは別のアドレスにします。</p>" +
          '<button class="btn btn-primary" id="hSave" type="button">Save</button></div></div>' +
          App.card("Failover Test", '<p class="muted" style="margin:0 0 12px">Active と Standby を入れ替えます。実機では数秒〜数十秒、拠点の通信が途切れます。ラボでは Sokket の電源を切って試すこともできます。</p><button class="btn btn-primary" id="haTest" type="button">Test Failover</button>');
      },
      ipsec() {
        const s = get(), p = s.ipsec || {};
        return header("IPsec") + '<div class="card"><div class="card-h"><h2>IPsec Tunnel（IKEv2）</h2></div><div class="card-b" style="max-width:720px">' +
          '<div class="row2">' + field("Kato PoP IP（相手先）", input("iPop", L().popIp(), "readonly"), "ルーターの tunnel destination に指定するアドレスです。") + field("Site Public IP", input("iPub", p.sitePublicIp, 'placeholder="例：198.51.100.30"'), "拠点ルーターの WAN のグローバル IP（PoP から見える送信元）。") + "</div>" +
          '<div class="row2">' + field("Pre-Shared Key", input("iPsk", p.psk, 'type="password" autocomplete="off"'), '<label><input type="checkbox" id="iShow"> 表示する</label>') + field("IKE Version", select("iIke", [["IKEv2", "IKEv2"], ["IKEv1", "IKEv1（ラボ未対応）"]], p.ike || "IKEv2")) + "</div>" +
          '<div class="row2">' + field("Encryption", select("iEnc", ["AES-CBC-256", "AES-CBC-128", "AES-GCM-256"], p.enc || "AES-CBC-256")) + field("Integrity", select("iInt", ["SHA256", "SHA384", "SHA1"], p.integ || "SHA256")) + "</div>" +
          '<div class="row2">' + field("DH Group", select("iDh", ["14", "19", "20", "5", "2"], String(p.dh || 14))) + "<div></div></div>" +
          '<button class="btn btn-primary" id="iSave" type="button">Save</button></div></div>' + ipsecStatusCard() +
          App.card("ルーター側の設定例（Cisco IOS）", '<pre class="mono" style="margin:0;padding:12px 14px;white-space:pre;overflow-x:auto;font-size:12px">' + esc(routerExample(p)) + "</pre>", { flush: true });
      }
    };
    function roleLabel(r) { return { active: "Active", passive: "Passive", "last-resort": "Last Resort", disabled: "（無効）" }[r] || r; }
    function ipsecStatusCard() {
      const st = L().ipsecState(id);
      return App.card("Tunnel Status", '<dl class="kv" style="margin:0"><div><dt>State</dt><dd>' + (st && st.state === "up" ? '<span class="badge b-ok">Up</span>' : '<span class="badge b-ng">Down</span>') + "</dd></div>" +
        '<div><dt>Peer（ルーター）</dt><dd class="mono">' + esc(st && st.peer || "—") + "</dd></div><div><dt>Up Since</dt><dd>" + (st && st.since ? App.fmt(st.since) : "—") + "</dd></div>" +
        "<div><dt>Last Error</dt><dd>" + esc(st && st.state !== "up" && st.err || "—") + "</dd></div></dl>");
    }
    function routerExample(p) {
      const enc = { "AES-CBC-256": ["aes-cbc-256", "esp-aes 256"], "AES-CBC-128": ["aes-cbc-128", "esp-aes 128"], "AES-GCM-256": ["aes-gcm-256", "esp-gcm 256"] }[p.enc || "AES-CBC-256"];
      const integ = { SHA256: ["sha256", "esp-sha256-hmac"], SHA384: ["sha384", "esp-sha384-hmac"], SHA1: ["sha1", "esp-sha-hmac"] }[p.integ || "SHA256"];
      const pop = L().popIp() || "<PoP IP>", s = get();
      return ["crypto ikev2 proposal KATO-PROP", " encryption " + enc[0], (p.enc === "AES-GCM-256" ? " prf " : " integrity ") + integ[0], " group " + (p.dh || 14),
        "crypto ikev2 policy KATO-POL", " proposal KATO-PROP", "crypto ikev2 keyring KATO-KEY", " peer KATO-POP", "  address " + pop, "  pre-shared-key " + (p.psk || "<PSK>"),
        "crypto ikev2 profile KATO-IKE", " match identity remote address " + pop + " 255.255.255.255", " authentication remote pre-share", " authentication local pre-share", " keyring local KATO-KEY",
        "crypto ipsec transform-set KATO-TS " + enc[1] + (p.enc === "AES-GCM-256" ? "" : " " + integ[1]), " mode tunnel", "crypto ipsec profile KATO-IPSEC", " set transform-set KATO-TS", " set ikev2-profile KATO-IKE",
        "interface Tunnel0", " ip address 169.254.10.1 255.255.255.252", " tunnel source <WAN インターフェース>", " tunnel mode ipsec ipv4", " tunnel destination " + pop, " tunnel protection ipsec profile KATO-IPSEC",
        "ip route 10.0.0.0 255.0.0.0 Tunnel0   ! 社内宛てをトンネルへ（" + (s.native || "") + " 以外の拠点）"].join("\n");
    }
    function bind() {
      const $ = (x) => document.getElementById(x);
      const on = (x, fn) => { const e = $(x); if (e) e.onclick = fn; };
      const ng = (m) => { App.toast(m, "ng"); return false; };
      on("gSave", () => {
        const nm = $("gName").value.trim(); if (!nm) return ng("Site Name を入力してください。");
        const old = get().name;
        save((t) => { t.name = nm; t.type = $("gType").value; }, "General");
        App.toast("保存しました。" + (old !== nm ? "Firewall のルールで「Site: " + old + "」を使っている場合は、ルールも直してください。" : ""), "ok", 6000); show(view);
      });
      on("sSave", () => {
        const p = $("sPri").value, ha = $("sHa").checked, sec = $("sSec").value;
        if (ha && (!p || !sec)) return ng("HA では Primary と Secondary の両方を選んでください。");
        if (p && p === sec) return ng("同じ Sokket を両方に指定できません。");
        save((t) => { t.serials = { primary: p, secondary: ha ? sec : "" }; t.ha = ha; t.haIps = t.haIps || { primary: "", secondary: "" }; }, "Sokket: " + (p || "none") + (ha ? " / " + sec : ""));
        App.toast("Sokket の割り当てを保存しました。" + (ha ? "High Availability で各 Sokket の LAN IP を設定してください。" : ""), "ok", 6000); show(view);
      });
      on("nSave", () => {
        const p = NL.util.parseCidr($("nRange").value), lip = $("nLocal").value.trim();
        if (!p || p.net !== p.addr) return ng("Native Range はネットワークアドレスの CIDR（例 10.0.0.0/24）で入力してください。");
        if (!isIP(lip) || !NL.util.inCidr(lip, p) || lip === p.net) return ng("Local IP は Native Range の中のホストアドレスにしてください。");
        const clash = App.sites().find((s) => s.id !== id && overlaps(s.native, p));
        if (clash) return ng("サイト「" + clash.name + "」の範囲と重なっています。");
        save((t) => { t.native = p.net + "/" + p.len; t.localIp = lip; }, "Native Range: " + p.net + "/" + p.len + " / Local IP " + lip);
        App.toast("保存しました。", "ok"); show(view);
      });
      on("rAdd", () => {
        const p = NL.util.parseCidr($("rCidr").value), gw = $("rGw").value.trim(), s = get();
        if (!p || p.net !== p.addr) return ng("Subnet はネットワークアドレスの CIDR で入力してください。");
        if (!NL.util.inCidr(gw, s.native)) return ng("Gateway は Native Range（" + s.native + "）の中のアドレスにしてください。");
        if (App.sites().some((x) => overlaps(x.native, p) || (x.ranges || []).some((r) => overlaps(r.cidr, p)))) return ng("既存の範囲と重なっています。");
        save((t) => { t.ranges = (t.ranges || []).concat([{ id: App.uid(), name: $("rName").value.trim() || p.net + "/" + p.len, cidr: p.net + "/" + p.len, gw }]); }, "Routed Range 追加: " + p.net + "/" + p.len + " via " + gw);
        App.toast("Routed 範囲を追加しました。", "ok"); show(view);
      });
      document.querySelectorAll("[data-delrange]").forEach((b) => { b.onclick = () => { save((t) => { t.ranges = (t.ranges || []).filter((r) => r.id !== b.dataset.delrange); }, "Routed Range 削除"); show(view); }; });
      on("wSave", () => {
        const bw = (v) => { const m = String(v).split("/").map((x) => parseInt(x, 10)); return { down: m[0] || 100, up: m[1] || m[0] || 100 }; };
        const w2 = $("w2On").checked;
        save((t) => {
          t.wan1 = Object.assign({}, t.wan1 || { name: "WAN1", isp: "" }, { role: $("w1Role").value }, bw($("w1Bw").value));
          t.wan2 = w2 ? Object.assign({}, t.wan2 || { name: "WAN2", isp: "" }, { role: $("w2Role").value }, bw($("w2Bw").value)) : null;
        }, "WAN: WAN1 " + $("w1Role").value + (w2 ? " / WAN2 " + $("w2Role").value : " / WAN2 無効"));
        App.toast("WAN の設定を保存しました。", "ok"); show(view);
      });
      on("hSave", () => {
        const a = $("hPri").value.trim(), b = $("hSec").value.trim(), s = get();
        if (!NL.util.inCidr(a, s.native) || !NL.util.inCidr(b, s.native)) return ng("どちらも Native Range（" + s.native + "）の中にしてください。");
        if (a === b || a === s.localIp || b === s.localIp) return ng("Primary・Secondary・VIP はすべて別のアドレスにしてください。");
        save((t) => { t.haIps = { primary: a, secondary: b }; }, "HA LAN IP: " + a + " / " + b);
        App.toast("HA の設定を保存しました。", "ok"); show(view);
      });
      on("haTest", () => {
        App.modal({ title: "Test Failover", body: "Active と Standby を入れ替えます。業務時間外に実施してください。", ok: "実行", onOk: () => {
          const err = L().forceFailover(L().siteById(id));
          if (err) App.toast(err, "ng"); else { App.audit("Sites", "HA Failover Test", get().name, "手動切替"); App.toast("切り替えました。", "ok"); }
          show("ha");
        } });
      });
      const sh = $("iShow"); if (sh) sh.onchange = () => { $("iPsk").type = sh.checked ? "text" : "password"; };
      on("iSave", () => {
        const pub = $("iPub").value.trim(), psk = $("iPsk").value;
        if (!isIP(pub)) return ng("Site Public IP を IP アドレスで入力してください。");
        if (psk.length < 8) return ng("Pre-Shared Key は 8 文字以上にしてください。");
        save((t) => { t.ipsec = { sitePublicIp: pub, psk, ike: $("iIke").value, enc: $("iEnc").value, integ: $("iInt").value, dh: +$("iDh").value }; }, "IPsec: " + pub + " " + $("iEnc").value + "/" + $("iInt").value + "/DH" + $("iDh").value);
        App.toast("IPsec の設定を保存しました。ルーターから次の IKE が届くと評価されます。", "ok", 6000); show(view);
      });
    }
    function overlaps(a, p) {
      const q = NL.util.parseCidr(a); if (!q) return false;
      const m = NL.util.n2ip(NL.util.len2mask(Math.min(q.len, p.len)));
      return NL.util.netOf(q.net, m) === NL.util.netOf(p.net, m);
    }
    function show(v) {
      view = v;
      document.getElementById("view").innerHTML = (R[v] || R.snapshot)();
      document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
      bind();
    }
    App.labRedraw(() => { if (["snapshot", "events", "socket", "wan", "ha", "ipsec"].indexOf(view) >= 0) show(view); });
    document.addEventListener("DOMContentLoaded", () => {
      const cs = document.getElementById("crumbSite"); if (cs) cs.textContent = get().name;
      document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { show(b.dataset.view); document.body.classList.remove("side-open"); }));
      show(view);
    });
  };
})();
// inside the lab, the menu entry that opens the lab would nest it in itself
if (window.App && window.App.LAB) document.addEventListener("DOMContentLoaded", () => { document.querySelectorAll('a[href="lab/index.html"]').forEach((a) => a.remove()); });
