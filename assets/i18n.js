/* =====================================================================
   日英切り替え（KMC Trainer と NetLab で共通）
   - 画面に表示された日本語を辞書で英語に置き換える方式。ソースの日本語はそのまま残す
   - 言語は localStorage "kmc.lang"（同じサイト内で共有）。?lang=en / ?lang=ja でも切り替えられる
   - 辞書は I18N.add({ "日本語": "English" }, [[/正規表現/, "置換"]], ["断片", "fragment"]) で追加する
   ===================================================================== */
(function () {
  "use strict";
  const KEY = "kmc.lang";
  let lang = "ja";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "ja") localStorage.setItem(KEY, q);
    lang = localStorage.getItem(KEY) === "en" ? "en" : "ja";
  } catch (e) { /* storage unavailable: stay Japanese */ }
  const JP = /[぀-ヿ㐀-鿿！-｠]/;
  const dict = Object.create(null), rules = [], frags = [];
  const missing = new Set();
  const I = window.I18N = {
    lang, dict, rules, frags, missing,
    en: lang === "en",
    add(d, r, f) {
      if (d) Object.keys(d).forEach((k) => { dict[norm(k)] = d[k]; });
      if (r) r.forEach((x) => rules.push(x));
      if (f) { for (let i = 0; i < f.length; i += 2) frags.push([f[i], f[i + 1]]); frags.sort((a, b) => b[0].length - a[0].length); }
      // dictionaries added while the page is still loading are applied by the DOMContentLoaded walk;
      // walking earlier would let fragments half-translate text that a later dictionary knows in full
      if (I.en && document.body && document.readyState !== "loading") walk(document.body);
    },
    // translate one string (used by code that builds text itself, e.g. the AI tutor prompt)
    t(s) { return I.en ? (tr(String(s)) || String(s)) : String(s); },
    set(l) {
      try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
      try { if (window.top !== window && window.top.I18N) { window.top.location.reload(); return; } } catch (e) { /* cross-origin */ }
      location.reload();
    }
  };
  document.documentElement.lang = lang;
  function norm(s) { return String(s).replace(/\s+/g, " ").trim(); }
  function trLine(line) {
    const n = norm(line);
    if (!n || !JP.test(n)) return null;
    let out = dict[n];
    // string rules: Japanese left in a captured group ($1…$9) is looked up as well
    if (out == null) for (const [re, rep] of rules) {
      if (!re.test(n)) continue;
      out = typeof rep === "function" ? n.replace(re, rep)
        : n.replace(re, (...g) => rep.replace(/\$(\d)/g, (_, k) => { const s = g[+k]; return s == null ? "" : (JP.test(s) && trLine(s)) || s; }));
      break;
    }
    if (out == null) out = trPath(n);
    if (out == null) out = trParts(n);
    if (out == null && frags.length) {
      let x = n;
      for (const [a, b] of frags) if (x.indexOf(a) >= 0) x = x.split(a).join(b);
      if (x !== n) out = x;
    }
    if (out == null) { missing.add(n); return null; }
    const lead = line.match(/^\s*/)[0], trail = line.match(/\s*$/)[0];
    return lead + out + trail;
  }
  // "Monitoring > トポロジー で…": KMC writes menu paths with the katakana menu names, so turn the
  // path back into English and look up the rest of the line on its own
  let menu = null;
  function menuEn(s) {
    if (!menu) {
      const K = window.App && window.App.KANA;
      if (!K) return s;
      menu = { "{拠点}": "{site}" };
      Object.keys(K).forEach((en) => { if (en !== en.toUpperCase() || !menu[K[en]]) menu[K[en]] = en; });
    }
    return menu[s] || s;
  }
  // Generated tooltips glue several pieces together ("【Box】File Sharing ／ 88 人 ／ リスク Low").
  // Split them apart and translate each piece; give up if any piece is unknown.
  // "、" is outside the JP range, so pieces without other Japanese still need it turned into a comma
  const part = (s) => (JP.test(s) ? trLine(s) : s.replace(/、\s*/g, ", "));
  const PUNCT = { "［": "[", "］": "]", "（": " (", "）": ")", "：": ": ", "＋": "+", "・": " · ", "〜": "–", "／": " / ", "、": ", " };
  function both(a, b, join) { const x = part(a), y = part(b); return x == null || y == null ? null : x.trim() + join + y.trim(); }
  function trParts(n) {
    const kana = menuEn(n);
    if (kana !== n) return kana;
    // only full-width punctuation left: ［Apply］, PoP（Tokyo）, ＋ New, ST-1020 ・ 10/27
    const p = n.replace(/[［］（）：＋・〜／、]/g, (c) => PUNCT[c]).replace(/ {2,}/g, " ").replace(/\( /g, "(").trimEnd();
    if (!JP.test(p)) return p;
    let m = n.match(/^【([^】]+)】\s*(.*)$/);
    if (m) {
      const h = part(m[1]), r = m[2] ? part(m[2]) : "";
      return h == null || r == null ? null : "[" + h.trim() + "]" + (r ? " " + r.trim() : "");
    }
    // "A ／ B ／ C" and "ユーザー：x サイト：y 宛先：z"
    for (const [sep, join] of [[/\s*／\s*/, " / "], [/ (?=[぀-ヿ㐀-鿿]+：)/, "  "]]) {
      const ps = n.split(sep);
      if (ps.length > 1 && (join === " / " || ps.every((s) => s.indexOf("：") > 0))) { const ts = ps.map(part); return ts.some((t) => t == null) ? null : ts.map((t) => t.trim()).join(join); }
    }
    if ((m = n.match(/^(.+?。)(.+)$/))) return both(m[1], m[2], " ");
    if ((m = n.match(/^([^：]+)：\s*(.*)$/))) return both(m[1], m[2], ": ");
    if ((m = n.match(/^([A-Za-z][\w /&-]*): (.+)$/))) return both(m[1], m[2], ": ");
    return null;
  }
  function trPath(n) {
    const m = n.match(/^((?:[^\s>]+ >(?: |$))+)(.*)$/);
    if (!m) return null;
    const path = m[1].trim().replace(/ >$/, "").split(" > ").map(menuEn);
    if (path.some((s) => JP.test(s))) return null;
    let rest = m[2];
    if (JP.test(rest)) {
      const r = rest.match(/^(\S+)(.*)$/), head = menuEn(r[1]);
      if (head !== r[1] && !JP.test(r[2])) rest = head + r[2];
      else if ((rest = trLine(rest)) == null) return null;
    }
    return path.join(" > ") + " >" + (rest ? " " + rest : "");
  }
  function tr(s) {
    if (!JP.test(s)) return null;
    if (s.indexOf("\n") < 0) return trLine(s);
    let changed = false;
    const out = s.split("\n").map((l) => { const t = trLine(l); if (t != null) { changed = true; return t; } return l; }).join("\n");
    return changed ? out : null;
  }
  const SKIP = "script,style,textarea,.term .scr,[data-i18n-skip],input,.sbody > div:first-child,[id^=man-] > div";
  const ATTRS = ["placeholder", "title", "aria-label", "data-tip", "alt"];
  function doText(node) { const t = tr(node.data); if (t != null && t !== node.data) node.data = t; }
  function doAttrs(el) {
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v && JP.test(v)) { const t = tr(v); if (t != null) el.setAttribute(a, t); } }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!(root.parentElement && root.parentElement.closest(SKIP))) doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.matches(SKIP)) { if (root.tagName === "INPUT") doAttrs(root); return; }
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.nodeType === 1 && n.matches(SKIP) ? (n.tagName === "INPUT" ? (doAttrs(n), NodeFilter.FILTER_REJECT) : NodeFilter.FILTER_REJECT) : NodeFilter.FILTER_ACCEPT
    });
    let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  I.walk = walk;
  // KMC opened inside NetLab shows lab events and statuses, so it borrows the lab's dictionary too
  try {
    const P = window.parent !== window && window.parent.I18N;
    if (P && P !== I) { Object.keys(P.dict).forEach((k) => { dict[k] = P.dict[k]; }); P.rules.forEach((r) => rules.push(r)); P.frags.forEach((f) => frags.push(f)); frags.sort((a, b) => b[0].length - a[0].length); }
  } catch (e) { /* not same-origin */ }
  if (!I.en) { document.addEventListener("DOMContentLoaded", addToggle); return; }

  // KMC shows English menu labels as katakana in Japanese mode; in English mode keep the English
  if (window.App && window.App.kana) window.App.kana = (l) => l;
  const titleT = () => { const t = tr(document.title); if (t) document.title = t; };
  document.addEventListener("DOMContentLoaded", () => {
    titleT();
    walk(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "childList") m.addedNodes.forEach((x) => { if (x.nodeType === 3 ? !(x.parentElement && x.parentElement.closest(SKIP)) : true) walk(x); });
        else if (m.type === "characterData") { if (!(m.target.parentElement && m.target.parentElement.closest(SKIP))) doText(m.target); }
        else if (m.type === "attributes") doAttrs(m.target);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    addToggle();
  });
  function addToggle() {
    if (document.getElementById("langToggle")) return;
    const b = document.createElement("button");
    b.type = "button"; b.id = "langToggle";
    b.textContent = I.en ? "日本語" : "English";
    b.title = I.en ? "日本語で表示" : "Show in English";
    b.addEventListener("click", () => I.set(I.en ? "ja" : "en"));
    const host = document.getElementById("langSlot") || document.querySelector(".top-right");
    if (host) { b.className = host.id === "langSlot" ? "hbtn" : "lang-btn"; host.prepend(b); }
    else { b.className = "lang-btn lang-float"; document.body.append(b); }
  }

  /* ---------------- KMC 共通・ラボ連動画面の辞書 ---------------- */
  I.add({
    // KMC frame (top bar, side panel, missions widget)
    "学習用シミュレーター": "Training simulator", "操作要領": "How-to guide", "トレーニング": "Training", "研修ミッション": "Training missions", "免責事項・ご利用条件": "Disclaimer & terms of use",
    "メニューを開く": "Open menu", "メニューを閉じる": "Close menu", "メインメニュー": "Main menu", "アプリ一覧": "All screens", "アラート": "Alerts", "通知": "Notifications", "画面の見方": "Screen tour",
    "KMC Trainer（学習用）": "KMC Trainer (training)", "これは実機ではなく、練習用のシミュレーターです。": "This is not a real system; it is a practice simulator.",
    "すべての画面への近道を表示します。": "Shows shortcuts to every screen.", "図解の操作要領（手順書）を開きます。まず必須でやることも載っています。": "Opens the illustrated how-to guide, including what to do first.",
    "アカウントの重要なお知らせ（切断中の拠点など）を表示します。": "Shows important account notices (such as disconnected sites).",
    "最近の通知（設定変更・ミッション達成など）を表示します。未読の数がバッジに出ます。": "Shows recent notifications (changes, completed missions). The badge counts unread ones.",
    "画面の見方と、まず最初にやることをもう一度表示します。": "Shows the screen tour and first steps again.",
    "新機能・変更点のお知らせを表示します（研修版では研修サイトの更新履歴）。": "Shows what's new (the trainer's change history).",
    "研修ミッションのチェックリストを開きます。操作すると手順ごとにリアルタイムでチェックが付きます。": "Opens the training mission checklist. Steps are checked off live as you work.",
    "操作すると、手順ごとにリアルタイムでチェックが付きます。": "Steps are checked off live as you work.", "研修を開始する": "Start training", "開く →": "Open →",
    "KMC Trainer は操作の流れを学ぶための": "KMC Trainer is an", "非公式・非営利の学習用シミュレーター": "unofficial, non-commercial training simulator",
    "です。特定の製品ベンダーとは一切関係がなく、承認・監修も受けていません。名称・画面・番号・データはすべて架空のダミーで、実在の製品の画面を再現したものではありません。": "for learning how console workflows go. It is not affiliated with, approved by or reviewed by any product vendor. All names, screens, numbers and data are fictional and do not reproduce any real product's screens.",
    "はじめての方へ": "New here?", "画面の見方と、まず最初にやること": "How the screen works and what to do first", "ヒント：この画面で注意するポイント": "Tip: what to watch on this screen", "マウスを乗せると説明": "Hover for an explanation",
    "上部タブ": "Top tabs", "左メニュー": "Left menu", "作業エリア": "Work area",
    "ラボ連動中": "Lab-linked",
    "（NetLab）— Sites・Users・WAN / Internet Firewall の設定はラボに保存され、通信に反映されます。監視系の一部の画面は見本データです。": "(NetLab) — Sites, Users and WAN / Internet Firewall settings are saved to the lab and affect its traffic. Some monitoring pages still show sample data.",
    "ラボのイベント": "Lab events",
    "まだイベントはありません。Sokket の WAN を設定してトンネルが張られると記録されます。": "No events yet. They appear once a Sokket's WAN is configured and its tunnel comes up.",
    "SDP Client IP Range（ラボ）": "SDP Client IP Range (lab)",
    "Kato Client に配る IP 範囲（CIDR）": "IP range handed to Kato Client (CIDR)",
    "サイトの範囲と重ならないようにします。次の接続から反映されます。": "Must not overlap any site range. Applies from the next connection.",
    "ネットワークアドレスの CIDR（例 10.0.3.0/24）で入力してください。": "Enter a network address in CIDR form (e.g. 10.0.3.0/24).",
    "SDP の IP 範囲を保存しました。": "Saved the SDP IP range.",
    "サイトがありません。": "There are no sites.",
    "で作成してください。": "Create one first.",
    "まだ Sokket のシリアルが割り当てられていません。左の「Sokket」で割り当てます。": "No Sokket serial is assigned yet. Assign one under \"Sokket\" on the left.",
    "Sokket が PoP にトンネルを張れていません。Sokket のローカル管理画面（https://169.254.100.1）で WAN の IP と、上流ルーターの NAT・デフォルトルートを確認します。": "The Sokket cannot build its tunnel to the PoP. Check the WAN IP in the Sokket local UI (https://169.254.100.1) and the upstream router's NAT and default route.",
    "使用中": "In use",
    "Sokket が割り当てられていません": "No Sokket assigned",
    "作成後は変更できません（変更は作り直し）。": "Cannot be changed after creation (recreate the site instead).",
    "（なし）": "(none)",
    "（接続済み）": "(connected)",
    "（未接続）": "(not connected)",
    "ラボに見つかりません": "Not found in the lab",
    "まだ Sokket が割り当てられていません": "No Sokket assigned yet",
    "シリアル番号は Sokket の物理タブや、ローカル管理画面のダッシュボードで確認できます。": "Find the serial number on the Sokket's Physical tab or the local UI dashboard.",
    "High Availability（Sokket 2 台構成）": "High Availability (two Sokkets)",
    "HA をオンにしたときだけ使われます。": "Used only when HA is on.",
    "IPsec サイトの裏にある LAN です。": "The LAN behind the IPsec site.",
    "Sokket の LAN1 がつながるセグメント。": "The segment Sokket LAN1 connects to.",
    "Local IP（拠点ルーターの LAN 側 IP）": "Local IP (the site router's LAN address)",
    "Local IP（HA では VIP）": "Local IP (VIP when HA)",
    "LAN 側機器のゲートウェイになるアドレスです。": "The address LAN devices use as their gateway.",
    "例：VLAN20-USERS": "e.g. VLAN20-USERS", "例：10.0.1.0/24": "e.g. 10.0.1.0/24", "例：10.0.0.4": "e.g. 10.0.0.4", "例：198.51.100.30": "e.g. 198.51.100.30",
    "Native Range の中にある L3 スイッチ等のアドレス。": "Address of the L3 switch (or router) inside the Native Range.",
    "L3 スイッチやルーターの先にあるセグメントは Routed として登録しないと、Kato はその宛先を拠点へ届けられません。": "Segments behind an L3 switch or router must be registered as Routed, or Kato cannot deliver traffic for them to the site.",
    "Enable WAN2（2 本目の回線）": "Enable WAN2 (second line)",
    "Link State（いま使っている回線）": "Link State (line in use)",
    "回線冗長の確認：": "Testing line redundancy: ",
    "この拠点は HA（Sokket 2 台構成）ではありません。": "This site is not HA (two Sokkets).",
    "左の「Sokket」で High Availability をオンにし、Secondary の Sokket を割り当てます。": "Turn on High Availability under \"Sokket\" on the left and assign the secondary Sokket.",
    "VIP（Local IP）": "VIP (Local IP)",
    "Active と Standby を入れ替えます。実機では数秒〜数十秒、拠点の通信が途切れます。ラボでは Sokket の電源を切って試すこともできます。": "Swaps Active and Standby. On real gear the site loses traffic for a few seconds to tens of seconds. In the lab you can also test by powering a Sokket off.",
    "Active と Standby を入れ替えます。業務時間外に実施してください。": "Swaps Active and Standby. Do this outside business hours.",
    "実行": "Run",
    "切り替えました。": "Switched over.",
    "Kato PoP IP（相手先）": "Kato PoP IP (peer)",
    "ルーターの tunnel destination に指定するアドレスです。": "Use this as the router's tunnel destination.",
    "拠点ルーターの WAN のグローバル IP（PoP から見える送信元）。": "Public IP of the site router's WAN (the source the PoP sees).",
    "表示する": "Show",
    "IKEv1（ラボ未対応）": "IKEv1 (not supported in the lab)",
    "Peer（ルーター）": "Peer (router)",
    "ルーター側の設定例（Cisco IOS）": "Router example (Cisco IOS)",
    "（無効）": "(disabled)",
    "Site Name を入力してください。": "Enter a Site Name.",
    "HA では Primary と Secondary の両方を選んでください。": "With HA, choose both Primary and Secondary.",
    "同じ Sokket を両方に指定できません。": "The same Sokket cannot be both.",
    "Native Range はネットワークアドレスの CIDR（例 10.0.0.0/24）で入力してください。": "Enter the Native Range as a network address in CIDR form (e.g. 10.0.0.0/24).",
    "Local IP は Native Range の中のホストアドレスにしてください。": "The Local IP must be a host address inside the Native Range.",
    "保存しました。": "Saved.",
    "Subnet はネットワークアドレスの CIDR で入力してください。": "Enter the subnet as a network address in CIDR form.",
    "既存の範囲と重なっています。": "Overlaps an existing range.",
    "Routed 範囲を追加しました。": "Added the routed range.",
    "WAN の設定を保存しました。": "Saved the WAN settings.",
    "Primary・Secondary・VIP はすべて別のアドレスにしてください。": "Primary, Secondary and VIP must all be different addresses.",
    "HA の設定を保存しました。": "Saved the HA settings.",
    "Site Public IP を IP アドレスで入力してください。": "Enter the Site Public IP as an IP address.",
    "Pre-Shared Key は 8 文字以上にしてください。": "The pre-shared key must be at least 8 characters.",
    "IPsec の設定を保存しました。ルーターから次の IKE が届くと評価されます。": "Saved the IPsec settings. They are checked when the next IKE message arrives from the router.",
    "NetLab（実機ラボ）を開く": "Open NetLab (hands-on lab)",
    "Local IP は Native Range の中のアドレスにしてください。": "The Local IP must be inside the Native Range.",
    "例：10.30.0.1（空なら .1）": "e.g. 10.30.0.1 (.1 if empty)",
    "LAN 側機器のゲートウェイになる、Sokket（IPsec サイトでは拠点ルーター）の LAN 側アドレス。HA では VIP になります。": "LAN address of the Sokket (the site router for IPsec sites) that LAN devices use as their gateway. With HA it becomes the VIP."
  }, [
    [/^(.+?)(（接続済み）|（未接続）)$/, (m, a, b) => I.t(a) + " " + I.t(b)],
    [/^tunnel source <WAN インターフェース>$/, "tunnel source <WAN interface>"],
    [/^(.+?)\s+! 社内宛てをトンネルへ（(.*) 以外の拠点）$/, "$1   ! internal destinations into the tunnel (sites other than $2)"],
    [/^WAN1 を Active、WAN2 を Passive にして保存し、RT1 で$/, "Set WAN1 to Active and WAN2 to Passive, save, and run"],
    [/^を実行します。数秒で In Use が WAN2 に移り、拠点の通信は続きます。Active が複数あるときは WAN1 を優先し、Active がすべて落ちると Passive、最後に Last Resort を使います。$/, "on RT1. Within seconds In Use moves to WAN2 and the site keeps working. With several Active lines WAN1 is preferred; when every Active line is down Passive is used, and Last Resort comes last."],
    [/^どちらも Native Range（(.+)）の中にしてください。$/, "Both must be inside the Native Range ($1)."],
    [/^Gateway は Native Range（(.+)）の中のアドレスにしてください。$/, "The gateway must be inside the Native Range ($1)."],
    [/^サイト「(.+)」の範囲と重なっています。$/, "Overlaps the range of site \"$1\"."],
    [/^どちらも Native Range の中で、VIP（(.+)）とは別のアドレスにします。$/, "Both inside the Native Range, and different from the VIP ($1)."],
    [/^ルーターから PoP（(.+)）へ IKEv2 が届いていないか、設定が一致していません。IPsec 画面の状態と、ラボのイベントに出る理由を確認します。$/, "IKEv2 from the router is not reaching the PoP ($1), or the settings do not match. Check the IPsec page and the reason shown in the lab events."],
    [/^Sokket の割り当てを保存しました。(High Availability で各 Sokket の LAN IP を設定してください。)?$/, (m, a) => "Saved the Sokket assignment." + (a ? " Set each Sokket's LAN IP under High Availability." : "")],
    [/^保存しました。Firewall のルールで「Site: (.+)」を使っている場合は、ルールも直してください。$/, "Saved. If firewall rules use \"Site: $1\", update them too."]
  ]);
})();
