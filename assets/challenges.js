/* =====================================================================
   KMC Trainer トレーニング課題データ
   ---------------------------------------------------------------------
   課題（チャレンジ）を追加・変更するときは、このファイルだけを編集します。
   動かす仕組みは assets/trainer.js にあります。

   ■ 課題
     id        : 一意のID
     mode      : "guided"（ガイドあり：スポットライトで案内）
                 "chat"  （ガイドなし：チャット通知センターで課題だけを伝える）
     track     : 同じテーマの課題をまとめるコース。guided → chat の順に並べる
     level     : 表示用の難易度（1〜3）
     requires  : 先にクリアしておくとよい課題ID（未クリアだと「おすすめしない」表示）
     next      : クリア後に案内する課題ID（ステップアップ先）
     title / goal / intro / outro / est : 表示文

   ■ 手順（steps）
     id     : 手順ID（back で戻り先に指定する）
     label  : チェックリスト・履歴に出る短い名前
     say    : ガイドの吹き出し／ボットが伝える「次のタスク」
     hint   : ［ヒント］を押したとき、ボットが教える具体的な場所
     nav    : true なら「page の画面を開く」手順（タブ・左メニューを自動で案内）
     page   : この手順を行う画面（違う画面にいるときは、まずその画面へ案内）
     target : ハイライト／正しいクリック先の候補（配列なら先頭から順に探す）
                "acc:見出し" … 右パネルのアコーディオン見出し
                "row:文字列" … 一覧の行（tr.clickable）でその文字を含むもの
     focus  : 誤操作のヒント文に入る名前（例：「［New］ボタン」）
     allow  : 誤操作と見なさない追加のセレクタ
     done   : 完了条件（下記）
     needs  : この手順を続けるための前提条件。満たさなくなったら back の手順まで戻る
     back   : needs を満たさないときの戻り先の手順ID
     fail   : done のイベントは来たが where / test を満たさなかったときのヒント
     hold   : 入力系の条件を「入力が止まってから何ミリ秒後」に判定するか

   ■ 条件（done / needs）
     { page: "x.html" }                         … その画面を開いている
     { exists: "セレクタ" }                      … 要素が表示されている
     { enabled: "セレクタ" }                     … ボタンが押せる状態
     { value: "セレクタ", filled: true }         … 入力欄に何か入っている
     { value: "セレクタ", equals: "Block" }      … 選択値が一致
     { value: "セレクタ", pattern: "正規表現" }    … 入力値が形式に合う
     { event: "policy:apply", match: {key:"ifw"}, where: {action:"Block"}, test: fn }
         … 画面の操作イベント。where はルールの中身、test は自由な判定
     { any: [条件, 条件] }                       … どれか1つ

   ■ 主なイベント（assets/app.js が App.emit で発行）
     policy:new / policy:apply / policy:save / policy:discard / policy:publish / policy:enable  { key }
       key … ifw（Internet FW） wan（WAN FW） tls nr（Network Rules） ccp（Client Connectivity）
     mission:new / mission:add / mission:done  { id }  … 研修ミッションの手順
     panel:open { title } / panel:close / modal:open { title }
   ===================================================================== */
(function () {
  "use strict";
  const CIDR = "^\\d{1,3}(\\.\\d{1,3}){3}\\/(\\d|[12]\\d|3[01])$";
  const panelOpen = { exists: ".panel" };

  window.KMC_CHALLENGES = {
    version: 1,
    tracks: [
      { id: "fw", title: "ファイアウォールのルール変更", lead: "Apply → Save → Publish の流れを体で覚える、いちばん大事なコースです。" },
      { id: "site", title: "拠点と管理者の追加", lead: "新しい拠点の準備と、管理者の追加・監査ログの確認。" },
      { id: "mon", title: "監視と切り分け", lead: "ログの絞り込みと、切断中の拠点の調べ方。" },
      { id: "adv", title: "応用チャレンジ", lead: "ガイドなしで通信の優先度を変えます。" }
    ],
    challenges: [
      /* ---------------- コース1：ファイアウォール ---------------- */
      {
        id: "fw-guided", mode: "guided", track: "fw", level: 1, est: "約3分", next: "fw-chat",
        title: "Internet Firewall にブロックルールを追加して公開する",
        goal: "Internet Firewall に Action = Block のルールを作り、Save → Publish まで行う",
        intro: "光っている場所を順番に押すだけで、ルール変更の一連の流れを体験できます。",
        outro: "Apply（一覧に反映）→ Save（自分の下書きに保存）→ Publish（全社に公開）の3段階が、Kato のポリシー変更の基本です。",
        steps: [
          { id: "open", nav: true, page: "internet-firewall.html", label: "Security > インターネット・ファイアウォール を開く",
            say: "上部の［Security］タブを押し、左メニューの［インターネット・ファイアウォール］を開きます。", done: { page: "internet-firewall.html" } },
          { id: "new", page: "internet-firewall.html", target: "#btnNew", focus: "［New］ボタン", label: "［New］で新しいルールを作る",
            say: "［New］を押すと、右から新しいルールの設定パネルが開きます。", done: { event: "policy:new", match: { key: "ifw" } } },
          { id: "name", page: "internet-firewall.html", target: "#f_name", label: "Name にルール名を入力", needs: panelOpen, back: "new", hold: 900,
            say: "Name 欄にルール名を入力します（例：IFW-Gambling-Block）。入力を止めると次に進みます。", done: { value: "#f_name", filled: true } },
          { id: "action", page: "internet-firewall.html", target: ["#f_action", "acc:Action"], label: "Action を Block に変更", needs: panelOpen, back: "new",
            say: "パネル下部の［Action］見出しを開き、Action を［Block］に変えます。", done: { value: "#f_action", equals: "Block" } },
          { id: "apply", page: "internet-firewall.html", target: ".panel [data-apply]", focus: "［Apply］ボタン", label: "［Apply］で一覧に反映", needs: panelOpen, back: "new",
            say: "［Apply］で一覧に反映します。この時点ではまだ保存されていません（黄色の帯）。",
            done: { event: "policy:apply", match: { key: "ifw" }, where: { action: "Block" } },
            fail: "Action が Block になっていませんでした。もう一度［New］から作り直しましょう。" },
          { id: "save", page: "internet-firewall.html", target: "#btnSave", focus: "［Save］ボタン", label: "［Save］で保存", needs: { enabled: "#btnSave" }, back: "new",
            say: "［Save］で、自分専用の未公開リビジョンに保存します。まだ全社には反映されません。", done: { event: "policy:save", match: { key: "ifw" } } },
          { id: "publish", page: "internet-firewall.html", target: "#btnPublish", focus: "［Publish］ボタン", label: "［Publish］を押す", needs: { enabled: "#btnPublish" }, back: "new",
            say: "Save だけでは効きません。［Publish］で全社に公開します。", done: { event: "modal:open", match: { title: "Publish Revision" } } },
          { id: "confirm", page: "internet-firewall.html", target: ".modal [data-o]", focus: "確認画面の［Publish］", label: "確認画面で［Publish］", needs: { exists: ".modal" }, back: "publish",
            say: "変更内容（追加されるルール）を確認して、もう一度［Publish］を押します。公開は取り消せません。", done: { event: "policy:publish", match: { key: "ifw" } } }
        ]
      },
      {
        id: "fw-chat", mode: "chat", track: "fw", level: 2, est: "約4分", requires: "fw-guided", next: "adv-qos",
        title: "WAN Firewall で拠点間の通信をブロックする",
        goal: "WAN Firewall に Action = Block のルールを追加し、全社に公開する",
        intro: "今度はガイドなしです。チュートリアルと同じ流れを、別の画面（WAN Firewall）で自分の力でやってみましょう。迷ったら［ヒント］を押してください。",
        outro: "WAN Firewall は拠点間・VPNユーザー間の通信、Internet Firewall はインターネット向けの通信を制御します。どちらも Apply → Save → Publish です。",
        steps: [
          { id: "open", nav: true, page: "wan-firewall.html", label: "WAN Firewall を開く",
            say: "まずは、拠点どうしの通信を制御するファイアウォールの画面を開いてください。",
            hint: "上部の［Security］タブ → 左メニュー「ファイアウォール」の［ワン・ファイアウォール］です。", done: { page: "wan-firewall.html" } },
          { id: "new", page: "wan-firewall.html", target: "#btnNew", focus: "［New］ボタン", label: "新しいルールを作り始める", allow: "tr.clickable",
            say: "新しいルールの作成を始めてください。", hint: "一覧の右上にあるボタン群の［New］です。",
            done: { any: [{ event: "policy:new", match: { key: "wan" } }, { event: "panel:open" }] } },
          { id: "apply", page: "wan-firewall.html", target: ".panel [data-apply]", focus: "パネルの［Apply］", allow: ".panel", label: "Action = Block のルールを Apply", needs: panelOpen, back: "new",
            say: "ルール名を付け、Action を Block にして一覧に反映してください。",
            hint: "パネル下部の［Action］見出しを開くと Block を選べます。最後にパネル右下の［Apply］。",
            done: { event: "policy:apply", match: { key: "wan" }, where: { action: "Block" } },
            fail: "反映されたルールの Action が Block ではありません。その行をクリックして開き直し、Action を Block にして［Apply］しましょう。" },
          { id: "save", page: "wan-firewall.html", target: "#btnSave", focus: "［Save］ボタン", label: "下書きとして保存", needs: { enabled: "#btnSave" }, back: "new",
            say: "一覧に反映できました。でも、まだ保存されていません。次はどうしますか？", hint: "黄色の帯は「未保存」です。上の［Save］を押します。",
            done: { event: "policy:save", match: { key: "wan" } } },
          { id: "publish", page: "wan-firewall.html", target: ["#btnPublish", ".modal [data-o]"], focus: "［Publish］ボタン", label: "全社に公開", needs: { any: [{ enabled: "#btnPublish" }, { exists: ".modal" }] }, back: "new",
            say: "保存できました。最後に、この変更を全社に反映してください。", hint: "［Publish］→ 確認画面でもう一度［Publish］です。",
            done: { event: "policy:publish", match: { key: "wan" } } }
        ]
      },

      /* ---------------- コース2：拠点と管理者 ---------------- */
      {
        id: "site-guided", mode: "guided", track: "site", level: 1, est: "約2分", next: "site-chat",
        title: "新しい拠点（サイト）を追加する",
        goal: "Sites で拠点を1つ追加する（Site Name と Native Range を入力）",
        intro: "ゼロタッチ導入の準備として、拠点を先に作っておく手順を体験します。",
        outro: "作った拠点は Sokket が接続されるまで Pending と表示されます。Native Range は他拠点と重複させないのが鉄則です。",
        steps: [
          { id: "open", nav: true, page: "sites.html", label: "Network > サイト を開く",
            say: "上部の［Network］タブを押すと、拠点の一覧（Sites）が開きます。", done: { page: "sites.html" } },
          { id: "new", page: "sites.html", target: "#btnNew", focus: "［＋ New］ボタン", label: "［New］で Add Site を開く",
            say: "［＋ New］で、拠点を追加するパネルを開きます。", done: { event: "panel:open", match: { title: "Add Site" } } },
          { id: "name", page: "sites.html", target: "#f_name", label: "Site Name を入力", needs: panelOpen, back: "new", hold: 900,
            say: "Site Name を入力します。例：JP-NGO-BR02（国-都市-拠点の順にすると探しやすい）", done: { value: "#f_name", filled: true } },
          { id: "native", page: "sites.html", target: ["#f_native", "acc:LAN Interface Settings"], label: "Native Range を入力", needs: panelOpen, back: "new", hold: 900,
            say: "［LAN Interface Settings］を開き、Native Range に 10.77.0.0/24 のような CIDR を入力します。", done: { value: "#f_native", pattern: CIDR } },
          { id: "apply", page: "sites.html", target: ".panel [data-apply]", focus: "［Apply］ボタン", label: "［Apply］で拠点を作成", needs: panelOpen, back: "new",
            say: "［Apply］で拠点を作成します。一覧に Pending の拠点が増えれば成功です。", done: { event: "mission:done", match: { id: "site_add" } } }
        ]
      },
      {
        id: "site-chat", mode: "chat", track: "site", level: 2, est: "約3分", requires: "site-guided",
        title: "管理者を追加し、監査ログで確認する",
        goal: "新しい管理者アカウントを1つ追加し、その操作が Audit Trail に記録されたことを確認する",
        intro: "新しく入ったチームメンバー用に、管理画面のアカウントを用意する場面です。ガイドなしで進めましょう。",
        outro: "管理者の追加・変更はすべて Audit Trail に残ります。「誰が・いつ・何を変えたか」を後から追えるのが大切です。",
        steps: [
          { id: "open", nav: true, page: "administrators.html", label: "管理者の一覧を開く",
            say: "まずは、管理画面にログインできる人（管理者）の一覧画面を開いてください。",
            hint: "上部の［Administration］タブ →［アドミニストレーター］です。", done: { page: "administrators.html" } },
          { id: "new", page: "administrators.html", target: "#new", focus: "［＋ New］ボタン", label: "管理者の作成を始める",
            say: "新しい管理者の作成を始めてください。", hint: "一覧の右上にある［＋ New］です。", done: { event: "mission:new", match: { id: "admin_add" } } },
          { id: "apply", page: "administrators.html", target: ".panel [data-apply]", focus: "パネルの［Apply］", allow: ".panel", label: "管理者を作成", needs: panelOpen, back: "new",
            say: "名前・メールアドレス・Role を入れて作成してください（研修版は何を入れても進めます）。",
            hint: "Role は最小権限が原則。迷ったら Viewer。最後にパネル右下の［Apply］です。", done: { event: "mission:done", match: { id: "admin_add" } } },
          { id: "audit", nav: true, page: "audit-trail.html", label: "Audit Trail で記録を確認",
            say: "作成できました。最後に、今の操作が監査ログに記録されたか確認しましょう。",
            hint: "［Monitoring］タブ → 左メニュー「インベスティゲーション」の［オーディット・トレイル］です。", done: { page: "audit-trail.html" } }
        ]
      },

      /* ---------------- コース3：監視 ---------------- */
      {
        id: "mon-guided", mode: "guided", track: "mon", level: 1, est: "約1分", next: "mon-chat",
        title: "Events でブロックされた通信だけを表示する",
        goal: "Events のフィルタで Action = Block に絞り込む",
        intro: "「つながらない」と言われたときに最初に見る、Events の絞り込みを体験します。",
        outro: "Block のログを見れば、どのルールで止まったか（Rule 列）が分かります。問い合わせ対応の第一歩です。",
        steps: [
          { id: "open", nav: true, page: "events.html", label: "Monitoring > イベント を開く",
            say: "上部の［Monitoring］タブから、左メニューの［イベント］を開きます。", done: { page: "events.html" } },
          { id: "field", page: "events.html", target: '[data-fld="action"]', label: "FIELDS の［Action］を開く",
            say: "左の FIELDS 一覧から［Action］を押して、値の一覧を開きます。", done: { exists: '[data-inc="action"][data-v="Block"]' } },
          { id: "plus", page: "events.html", target: '[data-inc="action"][data-v="Block"]', label: "Block の［+］で絞り込む", needs: { exists: '[data-inc="action"][data-v="Block"]' }, back: "field",
            say: "Block の行の［+］を押すと、「Action = Block」のフィルタが追加されます。", done: { event: "mission:done", match: { id: "events_block" } } }
        ]
      },
      {
        id: "mon-chat", mode: "chat", track: "mon", level: 2, est: "約2分", requires: "mon-guided",
        title: "切断中の拠点を見つけて、回線の状況を調べる",
        goal: "Topology で切断中の拠点を特定し、その拠点の Network Analytics を開く",
        intro: "朝の点検で「どこか拠点が落ちていないか」を確認する場面です。",
        outro: "切断中の拠点は Topology で赤く表示されます。詳細画面の Snapshot と Network Analytics で、回線の状態を確認しましょう。",
        steps: [
          { id: "open", nav: true, page: "topology.html", label: "全拠点の接続状態を表示",
            say: "全拠点の接続状態を、地図のように一覧できる画面を開いてください。",
            hint: "［Monitoring］タブ →［トポロジー］です。", done: { page: "topology.html" } },
          { id: "node", page: "topology.html", target: '.node[data-id="s3"]', focus: "赤く表示された拠点", label: "切断中の拠点を開く", allow: ".legend-row",
            say: "切断している拠点を探して、その拠点の詳細を開いてください。",
            hint: "赤い拠点（AWS-TKY-VPC）をクリックすると、拠点の詳細画面に移ります。", done: { event: "mission:done", match: { id: "topo_site" } } },
          { id: "analytics", page: "site.html", target: '[data-view="analytics"]', focus: "左メニューの［ネットワーク・アナリティクス］", label: "Network Analytics を開く",
            say: "詳細画面が開きました。回線の通信量や品質のグラフを表示してください。",
            hint: "左メニューの［ネットワーク・アナリティクス］です。", done: { exists: '[data-view="analytics"].active' } }
        ]
      },

      /* ---------------- コース4：応用 ---------------- */
      {
        id: "adv-qos", mode: "chat", track: "adv", level: 3, est: "約4分", requires: "fw-chat",
        title: "Web会議の通信を優先させる",
        goal: "Network Rules の Web会議ルールの Bandwidth Priority を p255 以外（高い優先度）にして公開する",
        intro: "「Web会議がカクつく」という相談への対応です。ネットワークルールで優先度を上げましょう。",
        outro: "Bandwidth Priority は数字が小さいほど優先されます。音声・映像は高い優先度（小さい数字）が基本です。",
        steps: [
          { id: "open", nav: true, page: "network-rules.html", label: "ネットワークルールを開く",
            say: "通信の経路や優先度を決めるルールの画面を開いてください。",
            hint: "［Network］タブ → 左メニュー「ルーティング・アンド・オプティマイゼーション」の［ネットワーク・ルール］です。", done: { page: "network-rules.html" } },
          { id: "edit", page: "network-rules.html", target: "row:Web Conferencing", focus: "「Web Conferencing」の行", label: "Web会議のルールを開く",
            say: "Web会議（Teams / Zoom）用の既存ルールを探して、編集画面を開いてください。",
            hint: "一覧の「Web Conferencing」の行をクリックします。新しく作る必要はありません。", done: { event: "panel:open", match: { title: "Edit Network Rule" } } },
          { id: "apply", page: "network-rules.html", target: ".panel [data-apply]", focus: "パネルの［Apply］", allow: ".panel", label: "優先度を上げて Apply", needs: panelOpen, back: "edit",
            say: "優先度（Bandwidth Priority）を上げて、一覧に反映してください。",
            hint: "パネルの中の Bandwidth Priority を p255 以外（例：p10）にして［Apply］します。",
            done: { event: "policy:apply", match: { key: "nr" }, test: function (d) { return d.rule && d.rule.prio !== "p255" && (d.rule.app || []).some(function (a) { return /Teams|Zoom/.test(a); }); } },
            fail: "優先度が p255（最低）のまま、または Web会議以外のルールでした。「Web Conferencing」を開き直しましょう。" },
          { id: "save", page: "network-rules.html", target: "#btnSave", focus: "［Save］ボタン", label: "下書きとして保存", needs: { enabled: "#btnSave" }, back: "edit",
            say: "反映できました。次はどうしますか？", hint: "上の［Save］で保存します。", done: { event: "policy:save", match: { key: "nr" } } },
          { id: "publish", page: "network-rules.html", target: ["#btnPublish", ".modal [data-o]"], focus: "［Publish］ボタン", label: "全社に公開", needs: { any: [{ enabled: "#btnPublish" }, { exists: ".modal" }] }, back: "edit",
            say: "最後に全社へ反映してください。", hint: "［Publish］→ 確認画面の［Publish］です。", done: { event: "policy:publish", match: { key: "nr" } } }
        ]
      }
    ]
  };
})();
