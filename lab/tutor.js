/* NetLab guide drawer: guided labs with automatic checks, manual, AI instructor. */
(function () {
'use strict';
const NL = window.NL, U = NL.util, ui = NL.ui, h = ui.h;
const D = n => NL.byName(n);
const I = (d, n) => (d && d.cfg.interfaces && d.cfg.interfaces[n]) || {};
const ipIs = (d, n, ip, mask) => { const i = I(d, n); return i.ip === ip && i.mask === mask; };
const upAdmin = (d, n) => d && !I(d, n).shutdown;
const pc = (d, ip, mask, gw) => !!d && d.cfg.ip === ip && d.cfg.mask === mask && (!gw || d.cfg.gw === gw);
const ok = new Set();       // "devId>dst" for successful pings
const cli = {};             // devId -> list of lines typed
NL.on('ping', (dev, dst, res) => { if (res.some(r => r.r === 'ok')) ok.add(dev.id + '>' + dst); });
NL.on('cli', (dev, line) => { if (dev) (cli[dev.id] = cli[dev.id] || []).push(line.trim().toLowerCase()); });
NL.on('change', w => { if (w === 'load') { ok.clear(); Object.keys(cli).forEach(k => delete cli[k]); } });
const pinged = (name, dst) => { const d = D(name); return !!d && ok.has(d.id + '>' + dst); };
const typed = (name, re) => { const d = D(name); return !!d && (cli[d.id] || []).some(l => re.test(l)); };
const sessIn = (name, modes) => { const d = D(name); return !!d && [...NL.ios.sessions].some(s => s.dev === d && !s.pending && modes.includes(s.mode)); };
const natOk = (d, wan) => d && I(d, 'GigabitEthernet0/0').natInside && I(d, 'GigabitEthernet0/1').natInside && I(d, 'GigabitEthernet0/2').natOutside &&
  d.cfg.nat.rules.some(r => r.kind === 'dynamic' && r.iface === 'GigabitEthernet0/2' && r.overload) && Object.values(d.cfg.acls).some(a => a.entries.some(e => e.action === 'permit' && e.src && (e.src.any || (e.src.a === '192.168.0.0' && e.src.w === '0.0.255.255'))));
const site = n => NL.cato.cfg().sites.find(s => s.name === n);
const kmcSite = n => ((NL.lab.kmc || {}).sites || []).find(s => s.name === n);
const defRoute = n => { const d = D(n); return !!d && d.cfg.routes.some(r => r.net === '0.0.0.0' && r.mask === '0.0.0.0'); };
const httpHits = new Set();
NL.on('http', (dev, ip, okk) => { if (okk) httpHits.add(dev.id + '>' + ip); });
const httpOk = (name, ip) => { const d = D(name); return !!d && httpHits.has(d.id + '>' + ip); };
const wanIs = (n, w, ip, gw) => { const d = D(n); return !!d && d.cfg.wan[w].mode === 'static' && d.cfg.wan[w].ip === ip && d.cfg.wan[w].gw === gw; };
const tun = n => { const d = D(n); return !!d && ['WAN1', 'WAN2'].some(w => NL.cato.tunUp(d, w)); };

const LABS = [
  {
    id: 'cisco', title: 'Cisco IOS はじめの一歩', scenario: 'cisco-basic', level: '入門',
    desc: 'CLI のモード、インターフェース設定、疎通確認、保存までをひと通り体験します。',
    steps: [
      { t: 'ルーターの CLI を開く', b: '<p>ワークスペースの <b>Router0</b> をクリックし、「CLI」タブを開きます。初回は起動メッセージのあと <code>initial configuration dialog?</code> と聞かれるので <code>no</code> と入力し、Enter をもう一度押します。</p><p>プロンプトが <code>Router&gt;</code> になればユーザー EXEC モードです。</p>', hint: 'no\n(Enter)', c: () => sessIn('Router0', ['u', 'p', 'c', 'i', 'r', 'l']) },
      { t: '特権 EXEC モードに入る', b: '<p><code>enable</code> で特権 EXEC モード（<code>Router#</code>）に入ります。<code>en</code> のように省略しても通ります。<code>?</code> を押すと、今使えるコマンドの一覧が出ます。</p>', hint: 'enable', c: () => sessIn('Router0', ['p', 'c', 'i', 'r', 'l']) || D('Router0').cfg.hostname !== 'Router' },
      { t: 'グローバル設定モードに入る', b: '<p><code>configure terminal</code>（省略形 <code>conf t</code>）で設定モード <code>Router(config)#</code> に入ります。ここから下の変更は即座に動作中の設定（running-config）に反映されます。</p>', hint: 'configure terminal', c: () => sessIn('Router0', ['c', 'i', 'r', 'l']) || D('Router0').cfg.hostname !== 'Router' },
      { t: 'ホスト名を R1 にする', b: '<p><code>hostname R1</code> と入力すると、プロンプトがすぐ <code>R1(config)#</code> に変わります。</p>', hint: 'hostname R1', c: () => D('Router0').cfg.hostname === 'R1' },
      { t: 'Gi0/0 に IP を付けて有効にする', b: '<p>ルーターのポートは初期状態で <b>shutdown</b>（無効）です。IP を付けて <code>no shutdown</code> しないと通信できません。</p><p>有効にすると <code>%LINK-5-CHANGED</code> などのログが出ます。</p>', hint: 'interface gigabitEthernet 0/0\nip address 192.168.1.1 255.255.255.0\nno shutdown\nexit', c: () => ipIs(D('Router0'), 'GigabitEthernet0/0', '192.168.1.1', '255.255.255.0') && upAdmin(D('Router0'), 'GigabitEthernet0/0') },
      { t: 'PC に IP を設定する', b: '<p>PC0 をクリック →「デスクトップ」→「IP 設定」で次のように入れます。PC1 も同じ要領です。</p><table><tr><th></th><th>IP</th><th>マスク</th><th>GW</th></tr><tr><td>PC0</td><td>192.168.1.10</td><td>255.255.255.0</td><td>192.168.1.1</td></tr><tr><td>PC1</td><td>192.168.1.11</td><td>255.255.255.0</td><td>192.168.1.1</td></tr></table>', c: () => pc(D('PC0'), '192.168.1.10', '255.255.255.0', '192.168.1.1') && pc(D('PC1'), '192.168.1.11', '255.255.255.0', '192.168.1.1') },
      { t: 'PC0 からルーターへ ping', b: '<p>PC0 の「コマンドプロンプト」で <code>ping 192.168.1.1</code>。最初の 1 回がタイムアウトするのは ARP 解決のためで、実機でもよくある動きです。</p><p>上の「シミュレーション」に切り替えてから ping すると、ARP と ICMP がどう流れるかを 1 コマずつ見られます。</p>', hint: 'ping 192.168.1.1', c: () => pinged('PC0', '192.168.1.1') },
      { t: '状態を確認する show コマンド', b: '<p>ルーターで <code>show ip interface brief</code> と <code>show running-config</code> を実行して、設定と状態を確認します。設定モードの中からは <code>do show ip int br</code> のように <code>do</code> を付けます。</p>', hint: 'show ip interface brief\nshow running-config', c: () => typed('Router0', /^(do )?sh(o|ow)? (ip int|run)/) },
      { t: 'パスワードを設定する', b: '<p>特権モード用に <code>enable secret</code>、コンソールにパスワードを設定します。<code>exit</code> でログアウトして、パスワードを聞かれることを確かめましょう。</p>', hint: 'configure terminal\nenable secret class\nline console 0\npassword cisco\nlogin\nend', c: () => { const c = D('Router0').cfg; return !!c.enableSecret && !!(c.lines.con || {}).password && !!(c.lines.con || {}).login; } },
      { t: '設定を保存する', b: '<p>running-config は電源を切ると消えます。<code>copy running-config startup-config</code>（または <code>write memory</code>）で NVRAM の startup-config に保存します。</p><p>保存後に「物理」タブで電源を入れ直すと、設定が残っていることを確認できます。</p>', hint: 'copy running-config startup-config\n(Enter)', c: () => { const s = D('Router0').startup; return !!s && s.hostname === 'R1' && !!(s.interfaces['GigabitEthernet0/0'] || {}).ip; } }
    ]
  },
  {
    id: 'diagram-cisco', title: '構成図ラボ ①  Cisco 部分とインターネット接続', scenario: 'diagram', level: '実践',
    desc: 'GW・RT1・RT2・L2SW・RT-C を CLI で設定し、拠点がインターネット（ISP）につながる状態にします。インターネット側（ISP・Web・Kato Cloud）は設定済みです。',
    steps: [
      { t: 'GW の基本設定と ISP への接続', b: '<p>GW は L3 スイッチ（3560）です。VLAN 1 の SVI に GW 側セグメントのアドレスを付け、Gi0/1 をルーテッドポートにして ISP とつなぎます。インターネット向けのデフォルトルートは ISP（192.0.2.1）へ向けます。</p>', hint: 'enable\nconfigure terminal\nhostname GW\nip routing\ninterface vlan 1\nip address 203.0.113.193 255.255.255.192\nno shutdown\ninterface g0/1\nno switchport\nip address 192.0.2.2 255.255.255.252\nno shutdown\nexit\nip route 0.0.0.0 0.0.0.0 192.0.2.1\nend', c: () => { const d = D('GW'); return d.cfg.ipRouting && ipIs(d, 'Vlan1', '203.0.113.193', '255.255.255.192') && ipIs(d, 'GigabitEthernet0/1', '192.0.2.2', '255.255.255.252') && d.cfg.routes.some(r => r.net === '0.0.0.0' && r.nh === '192.0.2.1'); } },
      { t: 'GW からインターネットへ ping', b: '<p>GW で <code>ping 198.51.100.10</code>（インターネット上の Web サーバー）。通れば GW までインターネットにつながっています。</p>', hint: 'ping 198.51.100.10', c: () => pinged('GW', '198.51.100.10') },
      { t: 'RT1 のインターフェース', b: '<p>Gi0/0 は Sokket M の WAN1、Gi0/1 は Sokket B の WAN1、Gi0/2 は GW 側です。3 つとも <code>no shutdown</code> を忘れずに。</p>', hint: 'enable\nconf t\nhostname RT1\ninterface g0/0\nip address 192.168.11.1 255.255.255.252\nno shutdown\ninterface g0/1\nip address 192.168.13.1 255.255.255.252\nno shutdown\ninterface g0/2\nip address 203.0.113.194 255.255.255.192\nno shutdown\nend', c: () => { const d = D('RT1'); return ipIs(d, 'GigabitEthernet0/0', '192.168.11.1', '255.255.255.252') && ipIs(d, 'GigabitEthernet0/1', '192.168.13.1', '255.255.255.252') && ipIs(d, 'GigabitEthernet0/2', '203.0.113.194', '255.255.255.192') && ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'GigabitEthernet0/2'].every(n => upAdmin(d, n)); } },
      { t: 'RT1 の NAT とデフォルトルート', b: '<p>Sokket の WAN（192.168.x.x）を GW 側のアドレスに PAT で変換し、インターネット向けのデフォルトルートを GW へ向けます。<b>デフォルトルートがないと、Sokket はインターネット上の PoP に届かず、トンネルが張れません。</b></p>', hint: 'conf t\ninterface g0/0\nip nat inside\ninterface g0/1\nip nat inside\ninterface g0/2\nip nat outside\nexit\nip access-list standard ACL-NAT-INSIDE\npermit 192.168.0.0 0.0.255.255\nexit\nip nat inside source list ACL-NAT-INSIDE interface g0/2 overload\nip route 0.0.0.0 0.0.0.0 203.0.113.193\nend', c: () => natOk(D('RT1')) && defRoute('RT1') },
      { t: 'RT2 も同様に', b: '<p>RT2 は Gi0/0 = 192.168.12.1（Sokket M の WAN2）、Gi0/1 = 192.168.14.1（Sokket B の WAN2）、Gi0/2 = 203.0.113.195 です。NAT とデフォルトルートも RT1 と同じ考え方です。</p>', hint: 'enable\nconf t\nhostname RT2\ninterface g0/0\nip address 192.168.12.1 255.255.255.252\nip nat inside\nno shutdown\ninterface g0/1\nip address 192.168.14.1 255.255.255.252\nip nat inside\nno shutdown\ninterface g0/2\nip address 203.0.113.195 255.255.255.192\nip nat outside\nno shutdown\nexit\nip access-list standard ACL-NAT-INSIDE\npermit 192.168.0.0 0.0.255.255\nexit\nip nat inside source list ACL-NAT-INSIDE interface g0/2 overload\nip route 0.0.0.0 0.0.0.0 203.0.113.193\nend', c: () => { const d = D('RT2'); return ipIs(d, 'GigabitEthernet0/0', '192.168.12.1', '255.255.255.252') && ipIs(d, 'GigabitEthernet0/1', '192.168.14.1', '255.255.255.252') && ipIs(d, 'GigabitEthernet0/2', '203.0.113.195', '255.255.255.192') && natOk(d) && defRoute('RT2'); } },
      { t: 'RT1・RT2 からインターネットへ ping', b: '<p>それぞれの CLI で <code>ping 198.51.100.10</code>。最初の 1 つが <code>.</code> になるのは ARP のためです。</p>', hint: 'ping 198.51.100.10', c: () => pinged('RT1', '198.51.100.10') && pinged('RT2', '198.51.100.10') },
      { t: 'L2SW の VLAN と SVI', b: '<p>Sokket がつながる Gi0/1-2 を VLAN 10、テスト用 PC#2 の Fa0/1 を VLAN 20 にします。VLAN 20 は L2SW の SVI でルーティングし、それ以外の宛先は Sokket の VIP（10.0.0.3）へ向けます。</p>', hint: 'enable\nconf t\nhostname L2SW\nvlan 10\nname SOCKET-LAN\nvlan 20\nname USERS\nexit\ninterface range g0/1 - 2\nswitchport mode access\nswitchport access vlan 10\ninterface fa0/1\nswitchport mode access\nswitchport access vlan 20\ninterface vlan 10\nip address 10.0.0.4 255.255.255.240\nno shutdown\ninterface vlan 20\nip address 10.0.1.1 255.255.255.0\nno shutdown\nexit\nip routing\nip route 0.0.0.0 0.0.0.0 10.0.0.3\nend', c: () => { const d = D('L2SW'); return !!d.vlans[10] && !!d.vlans[20] && I(d, 'GigabitEthernet0/1').accessVlan === 10 && I(d, 'GigabitEthernet0/2').accessVlan === 10 && I(d, 'FastEthernet0/1').accessVlan === 20 && ipIs(d, 'Vlan10', '10.0.0.4', '255.255.255.240') && ipIs(d, 'Vlan20', '10.0.1.1', '255.255.255.0') && d.cfg.ipRouting && d.cfg.routes.some(r => r.net === '0.0.0.0' && r.nh === '10.0.0.3'); } },
      { t: 'RT-C（拠点C）の基本設定', b: '<p>拠点C は Sokket を置かず、ルーター RT-C から IPsec で Kato Cloud につなぐ拠点です。まずインターネット側と LAN 側のアドレス、デフォルトルートを設定します（IPsec は構成図ラボ ② で設定します）。</p>', hint: 'enable\nconf t\nhostname RT-C\ninterface g0/0\nip address 198.51.100.30 255.255.255.0\nno shutdown\ninterface g0/1\nip address 10.0.4.1 255.255.255.0\nno shutdown\nexit\nip route 0.0.0.0 0.0.0.0 198.51.100.1\nend', c: () => { const d = D('RT-C'); return ipIs(d, 'GigabitEthernet0/0', '198.51.100.30', '255.255.255.0') && ipIs(d, 'GigabitEthernet0/1', '10.0.4.1', '255.255.255.0') && defRoute('RT-C'); } },
      { t: 'PC の設定', b: '<table><tr><th></th><th>IP / マスク</th><th>GW</th></tr><tr><td>PC#0</td><td>203.0.113.197 / 255.255.255.192</td><td>203.0.113.193</td></tr><tr><td>PC#1</td><td>10.0.2.2 / 255.255.255.0</td><td>10.0.2.1</td></tr><tr><td>PC#2</td><td>10.0.1.10 / 255.255.255.0</td><td>10.0.1.1</td></tr><tr><td>PC#3</td><td>10.0.4.10 / 255.255.255.0</td><td>10.0.4.1</td></tr></table>', c: () => pc(D('PC#0'), '203.0.113.197', '255.255.255.192', '203.0.113.193') && pc(D('PC#1'), '10.0.2.2', '255.255.255.0', '10.0.2.1') && pc(D('PC#2'), '10.0.1.10', '255.255.255.0', '10.0.1.1') && pc(D('PC#3'), '10.0.4.10', '255.255.255.0', '10.0.4.1') },
      { t: '設定を保存する', b: '<p>GW・RT1・RT2・L2SW・RT-C で <code>write memory</code>。</p>', hint: 'write memory', c: () => ['GW', 'RT1', 'RT2', 'L2SW', 'RT-C'].every(n => !!D(n).startup && D(n).startup.hostname === n) }
    ]
  },
  {
    id: 'cato', title: '構成図ラボ ②  はじめての Kato（Sokket・KMC・IPsec）', scenario: 'diagram-cisco', level: '実践',
    desc: 'Cisco 側は設定済みの状態から始めます。Sokket の初期設定（管理者登録・WAN）→ トンネル確立 → KMC でサイト作成とネットワーク連携 → 回線冗長 → IPsec サイト → SDP → Firewall → HA 試験の順に進めます。',
    steps: [
      { t: 'Kato の全体像をつかむ', b: '<p>Sokket は拠点に置く装置で、WAN からインターネット上の <b>PoP</b>（Kato Cloud の入口）へ暗号化トンネルを張ります。設定の大半はクラウドの管理画面 <b>KMC</b> で行い、Sokket 本体ではほぼ WAN の設定だけをします。Sokket を置かない拠点は、ルーターから PoP へ IPsec でつなぎます。</p><p>このラボでは「Kato Cloud」ノード（198.51.100.20）が PoP の役です。Kato・Sokket・KMC は学習用の架空の製品です。</p>', c: () => true },
      { t: 'Sokket M の MGMT ポートに PC をつなぐ', b: '<p>パレットから「ノート PC」を置き、ケーブル（自動）でノート PC の FastEthernet0 と <b>Sokket M の MGMT</b> をつなぎます。ノート PC の IP 設定は <b>DHCP</b> にします（DHCP サーバーがないので 169.254.x.x が自動で付きます）。</p>', c: () => { const m = D('Sokket M'); const pe = m && NL.peer(m.id, 'MGMT'); return !!pe && NL.kind(pe.dev) === 'pc'; } },
      { t: 'https://169.254.100.1 で管理者を登録', b: '<p>ノート PC の「デスクトップ」→「Web ブラウザ」で <code>https://169.254.100.1</code> を開きます。初回は管理者アカウントの登録画面が出るので、ユーザー名とパスワード（8 文字以上・英大文字・英小文字・数字を含む）を登録します。</p>', c: () => !!(D('Sokket M') || { cfg: {} }).cfg.admin },
      { t: 'Sokket M の WAN を静的 IP にする', b: '<p>ローカル管理画面の「WAN 設定」で次のように入れます。RT1/RT2 には DHCP サーバーがないので静的 IP です。</p><table><tr><th></th><th>IP / マスク</th><th>GW</th></tr><tr><td>WAN1</td><td>192.168.11.2 / 255.255.255.252</td><td>192.168.11.1</td></tr><tr><td>WAN2</td><td>192.168.12.2 / 255.255.255.252</td><td>192.168.12.1</td></tr></table>', c: () => wanIs('Sokket M', 'WAN1', '192.168.11.2', '192.168.11.1') && wanIs('Sokket M', 'WAN2', '192.168.12.2', '192.168.12.1') },
      { t: 'Sokket B と拠点B の Sokket も初期設定', b: '<p>同じ手順で管理者を登録し、WAN を設定します（Sokket の「ローカル WebUI」タブの近道を使っても構いません）。</p><table><tr><th>Sokket</th><th>WAN1</th><th>WAN2</th></tr><tr><td>Sokket B</td><td>192.168.13.2/30 gw .13.1</td><td>192.168.14.2/30 gw .14.1</td></tr><tr><td>Sokket 拠点B</td><td>203.0.113.196/26 gw .193</td><td>（未使用）</td></tr></table>', c: () => wanIs('Sokket B', 'WAN1', '192.168.13.2', '192.168.13.1') && wanIs('Sokket B', 'WAN2', '192.168.14.2', '192.168.14.1') && wanIs('Sokket 拠点B', 'WAN1', '203.0.113.196', '203.0.113.193') },
      { t: 'トンネル確立を確認する', b: '<p>数秒待つと Sokket が PoP にトンネルを張ります。ローカル管理画面のダッシュボード、または「診断」→「Kato Cloud 接続テスト」で確認します。RT1 で <code>show ip nat translations</code> を見ると、Sokket の UDP 443 の通信が 203.0.113.194 に変換されています。</p>', hint: 'RT1# show ip nat translations', c: () => tun('Sokket M') && tun('Sokket B') && tun('Sokket 拠点B') },
      { t: 'KMC でサイト「拠点A」を作る', b: '<p>上部の「KMC 管理画面」→ Network → Sites →［New］。Site Name「拠点A」、Connection Type「Sokket S160」、Enable WAN2 をオン、Native Range「10.0.0.0/28」、Local IP「10.0.0.3」で作成します。Local IP は LAN 側機器から見たゲートウェイで、HA 構成では VIP になります。</p>', c: () => { const s = kmcSite('拠点A'); return !!s && s.native === '10.0.0.0/28' && s.localIp === '10.0.0.3'; } },
      { t: 'Sokket を割り当てて HA を組む', b: '<p>拠点A を開き、左メニュー「Sokket」で Primary に Sokket M、HA をオンにして Secondary に Sokket B のシリアルを選んで保存します。次に「High Availability」で各 Sokket 自身の LAN IP を入れます。</p><table><tr><th>Primary LAN IP</th><td>10.0.0.1</td></tr><tr><th>Secondary LAN IP</th><td>10.0.0.2</td></tr></table><p>HA 状態が Ready になれば完了です。</p>', c: () => { const s = site('拠点A'); return !!s && s.primarySerial === (D('Sokket M') || {}).serial && s.secondarySerial === (D('Sokket B') || {}).serial && s.ha && s.ha.primaryIp === '10.0.0.1' && s.ha.secondaryIp === '10.0.0.2'; } },
      { t: 'サイトとネットワークを連携（Routed 範囲）', b: '<p>10.0.1.0/24 は L2SW の裏にあるので、Kato はそのままでは知りません。拠点A の「Networks」で Routed 範囲として登録し、ゲートウェイを L2SW の VLAN10 の IP（10.0.0.4）にします。</p>', c: () => { const s = site('拠点A'); return !!s && (s.ranges || []).some(r => r.cidr === '10.0.1.0/24' && r.gw === '10.0.0.4'); } },
      { t: 'サイト「拠点B」を作って Sokket を割り当て', b: '<table><tr><th>Native Range</th><td>10.0.2.0/24</td></tr><tr><th>Local IP</th><td>10.0.2.1</td></tr><tr><th>Primary Sokket</th><td>Sokket 拠点B</td></tr></table>', c: () => { const s = site('拠点B'); return !!s && s.nativeRange === '10.0.2.0/24' && s.localIp === '10.0.2.1' && s.primarySerial === (D('Sokket 拠点B') || {}).serial; } },
      { t: '拠点間で ping を通す', b: '<p>PC#1（拠点B）のコマンドプロンプトで <code>ping 10.0.0.4</code>（L2SW）と <code>ping 10.0.1.10</code>（PC#2）。KMC のサイト一覧でも拠点A・B が Connected になっています。シミュレーションモードで見ると、Kato のトンネルにパケットが包まれて PoP を通る様子が見えます。</p>', hint: 'ping 10.0.0.4\nping 10.0.1.10\ntracert 10.0.1.10', c: () => pinged('PC#1', '10.0.0.4') || pinged('PC#1', '10.0.1.10') },
      { t: '回線冗長を設定して確認する', b: '<p>拠点A の「WAN / Link」で WAN1 を Active、WAN2 を Passive にして保存します。Link State で WAN1 が「使用中」になっているのを確認したら、RT1 で <code>interface g0/0</code> → <code>shutdown</code> を実行して回線断を起こします。数秒で Sokket M が WAN2（RT2 経由）に切り替わり、PC#1 から PC#2 への ping も通り続けます。</p>', hint: 'RT1(config)# interface g0/0\nRT1(config-if)# shutdown', c: () => { const s = site('拠点A'), m = D('Sokket M'); return !!s && s.wan.WAN2.precedence === 'passive' && !!I(D('RT1'), 'GigabitEthernet0/0').shutdown && !!m && NL.cato.activeWan(m) === 'WAN2'; } },
      { t: 'ルーター RT-C の IPsec を設定する', b: '<p>RT-C から PoP（198.51.100.20）へ IKEv2 の IPsec トンネルを張ります。Tunnel0 は「ルートベース VPN（VTI）」で、Tunnel0 に向けたルートの通信が暗号化されます。下のコマンド例の PSK は KMC 側と同じ値にします。</p>', hint: 'conf t\ncrypto ikev2 proposal KATO-PROP\n encryption aes-cbc-256\n integrity sha256\n group 14\ncrypto ikev2 policy KATO-POL\n proposal KATO-PROP\ncrypto ikev2 keyring KATO-KEY\n peer KATO-POP\n  address 198.51.100.20\n  pre-shared-key Lab-Kato-PSK-2026\n  exit\ncrypto ikev2 profile KATO-IKE\n match identity remote address 198.51.100.20 255.255.255.255\n authentication remote pre-share\n authentication local pre-share\n keyring local KATO-KEY\ncrypto ipsec transform-set KATO-TS esp-aes 256 esp-sha256-hmac\n mode tunnel\ncrypto ipsec profile KATO-IPSEC\n set transform-set KATO-TS\n set ikev2-profile KATO-IKE\ninterface Tunnel0\n ip address 169.254.10.1 255.255.255.252\n tunnel source g0/0\n tunnel mode ipsec ipv4\n tunnel destination 198.51.100.20\n tunnel protection ipsec profile KATO-IPSEC\nexit\nip route 10.0.0.0 255.0.0.0 Tunnel0\nend', c: () => { const o = NL.ikeOffer(D('RT-C'), 'Tunnel0'); return !!o && !o.err; } },
      { t: 'KMC で IPsec サイト「拠点C」を作る', b: '<p>Sites →［New］で Connection Type を「IPsec IKEv2」、Native Range を 10.0.4.0/24 にして作成します。拠点C を開いて「IPsec」で次を入れて保存します。値がルーターと 1 つでも違うとトンネルは張れず、Events に理由が出ます。</p><table><tr><th>Site Public IP</th><td>198.51.100.30（RT-C の WAN）</td></tr><tr><th>Pre-Shared Key</th><td>Lab-Kato-PSK-2026</td></tr><tr><th>Encryption / Integrity / DH</th><td>AES-CBC-256 / SHA256 / 14</td></tr></table><p>RT-C で <code>show crypto session</code> が UP-ACTIVE になれば完了です。</p>', hint: 'RT-C# show crypto session\nRT-C# show crypto ikev2 sa\nRT-C# show ip interface brief', c: () => { const s = NL.cato.cfg().sites.find(x => x.ipsecSite && x.nativeRange === '10.0.4.0/24'); return !!s && NL.cato.siteStatus(s) === 'Connected'; } },
      { t: '拠点C から他拠点へ ping', b: '<p>PC#3 のコマンドプロンプトで <code>ping 10.0.2.2</code>（PC#1）。RT-C で <code>show crypto ipsec sa</code> を見ると、暗号化・復号したパケット数が増えています。</p>', hint: 'ping 10.0.2.2', c: () => pinged('PC#3', '10.0.2.2') || pinged('PC#3', '10.0.1.10') },
      { t: 'SDP ユーザーで PC#0 をつなぐ', b: '<p>KMC の Access → Users で user01@lab.local に SDP ライセンスが付いていることを確認します。PC#0 の「デスクトップ」→「Kato Client」でそのメールアドレスで接続すると、Client IP（10.0.3.x）が付きます。接続後、PC#0 から <code>ping 10.0.4.10</code>（PC#3）を試します。</p>', c: () => { const c = NL.rt(D('PC#0')).cato; return !!c && c.state === 'connected'; } },
      { t: 'WAN Firewall で通信を絞る（Publish まで）', b: '<p>KMC の Security → WAN Firewall で、初期ルール「All Sites ⇄ All Sites」を無効にし、［New］で「Source: Site: 拠点B / Destination: Site: 拠点A / Service: ICMP / Allow」のルールを追加します。<b>Save → Publish</b> するまで反映されません。</p><p>PC#1 → PC#2 の ping は通り、PC#2 → PC#1 は止まる（Events にブロックが記録される）ことを確かめます。</p>', c: () => { const p = (NL.lab.kmc['pol.wan'] || {}).published; if (!p) return false; return !p.rules.some(r => r.enabled && !(r.source || []).length && !(r.dest || []).length && r.action === 'Allow') && p.rules.some(r => r.enabled && (r.source || []).includes('Site: 拠点B') && (r.dest || []).includes('Site: 拠点A') && r.action === 'Allow'); } },
      { t: 'インターネットへ出る', b: '<p>PC#1 の「Web ブラウザ」で <code>http://198.51.100.10</code> を開きます。拠点B の通信はトンネルで PoP に届き、PoP からインターネットへ出ます（Internet Firewall が評価されます）。</p>', c: () => httpOk('PC#1', '198.51.100.10') },
      { t: 'HA のフェイルオーバー試験', b: '<p>Sokket M の「物理」タブで電源を OFF にします（KMC の High Availability にある［Test Failover］でも切り替えられます）。数秒で Sokket B が Active になり、VIP 10.0.0.3 を引き継ぎます。PC#1 から <code>ping 10.0.1.10</code> が引き続き通ることを確認しましょう。</p>', c: () => { const A = site('拠点A'); const b = D('Sokket B'); return !!A && !!b && NL.cato.activeSerial(A) === b.serial; } }
    ]
  },
  {
    id: 'vlan', title: 'VLAN とルーター・オン・ア・スティック', scenario: 'vlan', level: '基礎',
    desc: 'スイッチで VLAN を分け、ルーターのサブインターフェースで VLAN 間をルーティングします。',
    steps: [
      { t: 'VLAN を作ってポートを割り当てる', b: '<p>Switch0 で VLAN 10 と 20 を作り、Fa0/1-2 を VLAN 10、Fa0/3-4 を VLAN 20 にします。</p>', hint: 'enable\nconf t\nvlan 10\nvlan 20\nexit\ninterface range fa0/1 - 2\nswitchport mode access\nswitchport access vlan 10\ninterface range fa0/3 - 4\nswitchport mode access\nswitchport access vlan 20\nend', c: () => { const d = D('Switch0'); return !!d.vlans[10] && !!d.vlans[20] && [1, 2].every(i => I(d, 'FastEthernet0/' + i).accessVlan === 10) && [3, 4].every(i => I(d, 'FastEthernet0/' + i).accessVlan === 20); } },
      { t: 'ルーター側をトランクにする', b: '<p>Switch0 の Gi0/1 をトランクにします。<code>show interfaces trunk</code> で確認できます。</p>', hint: 'interface g0/1\nswitchport mode trunk', c: () => I(D('Switch0'), 'GigabitEthernet0/1').mode === 'trunk' },
      { t: 'サブインターフェースを作る', b: '<p>Router0 で Gi0/0 を有効にし、VLAN ごとのサブインターフェースを作ります。</p>', hint: 'enable\nconf t\ninterface g0/0\nno shutdown\ninterface g0/0.10\nencapsulation dot1Q 10\nip address 192.168.10.1 255.255.255.0\ninterface g0/0.20\nencapsulation dot1Q 20\nip address 192.168.20.1 255.255.255.0\nend', c: () => { const d = D('Router0'); return upAdmin(d, 'GigabitEthernet0/0') && I(d, 'GigabitEthernet0/0.10').dot1q === 10 && I(d, 'GigabitEthernet0/0.20').dot1q === 20 && ipIs(d, 'GigabitEthernet0/0.10', '192.168.10.1', '255.255.255.0') && ipIs(d, 'GigabitEthernet0/0.20', '192.168.20.1', '255.255.255.0'); } },
      { t: 'PC に IP を設定して VLAN 間 ping', b: '<p>PC-A 192.168.10.11、PC-B 192.168.10.12（GW .10.1）、PC-C 192.168.20.11、PC-D 192.168.20.12（GW .20.1）。PC-A から <code>ping 192.168.20.11</code>。</p>', c: () => pinged('PC-A', '192.168.20.11') }
    ]
  },
  {
    id: 'ospf', title: 'OSPF で経路を交換する', scenario: 'ospf', level: '基礎',
    desc: '3 台のルーターで OSPF エリア 0 を組み、経路の自動交換と障害時の迂回を確認します。',
    steps: [
      { t: 'インターフェースに IP を付ける', b: '<table><tr><th></th><th>Gi0/0</th><th>Gi0/1</th><th>Gi0/2</th></tr><tr><td>R1</td><td>10.1.12.1/30</td><td>10.1.13.1/30</td><td>192.168.1.1/24</td></tr><tr><td>R2</td><td>10.1.12.2/30</td><td>10.1.23.1/30</td><td>192.168.2.1/24</td></tr><tr><td>R3</td><td>10.1.13.2/30</td><td>10.1.23.2/30</td><td>—</td></tr></table><p>PC1 は 192.168.1.10（GW .1.1）、PC2 は 192.168.2.10（GW .2.1）。</p>', c: () => ipIs(D('R1'), 'GigabitEthernet0/0', '10.1.12.1', '255.255.255.252') && ipIs(D('R2'), 'GigabitEthernet0/1', '10.1.23.1', '255.255.255.252') && ipIs(D('R3'), 'GigabitEthernet0/1', '10.1.23.2', '255.255.255.252') },
      { t: 'OSPF を有効にする', b: '<p>3 台とも <code>router ospf 1</code> で、つながっているネットワークを area 0 で宣言します。ワイルドカードマスクはサブネットマスクの反転です。</p>', hint: 'router ospf 1\nnetwork 10.1.0.0 0.0.255.255 area 0\nnetwork 192.168.1.0 0.0.0.255 area 0', c: () => ['R1', 'R2', 'R3'].every(n => NL.ospfNbrs(D(n)).length >= 2) },
      { t: 'ルーティングテーブルを確認', b: '<p><code>show ip ospf neighbor</code> で FULL になっていること、<code>show ip route</code> に <code>O</code> の経路があることを確認します。</p>', hint: 'show ip ospf neighbor\nshow ip route ospf', c: () => typed('R1', /^(do )?sh(o|ow)? ip (ospf|route)/) || typed('R2', /^(do )?sh(o|ow)? ip (ospf|route)/) },
      { t: 'PC1 から PC2 へ ping', b: '', hint: 'ping 192.168.2.10', c: () => pinged('PC1', '192.168.2.10') },
      { t: '障害時の迂回を確認', b: '<p>R1 の Gi0/0 を <code>shutdown</code> して、もう一度 PC1 から ping します。R3 経由に切り替わって通ります。<code>tracert</code> で経路の変化も見てみましょう。</p>', c: () => !!I(D('R1'), 'GigabitEthernet0/0').shutdown && pinged('PC1', '192.168.2.10') }
    ]
  }
];

// ---------- manual
const MANUAL = [
  ['app', 'このアプリの使い方', `
<p>Packet Tracer のように、機器を置いて配線し、機器をクリックして CLI や設定画面で操作します。</p>
<table>
<tr><th>機器を置く</th><td>下のパレットから機器をクリックし、ワークスペースをクリック（ドラッグ＆ドロップも可）</td></tr>
<tr><th>配線する</th><td>下の「ケーブル」で種類を選ぶ → 機器 A をクリックしてポートを選ぶ → 機器 B をクリックしてポートを選ぶ</td></tr>
<tr><th>開く</th><td>選択ツールで機器をクリック。Cisco 機器は CLI、PC はデスクトップ、Sokket はローカル WebUI が開きます</td></tr>
<tr><th>移動・表示</th><td>機器をドラッグで移動。空いている所をドラッグでスクロール、ホイールで拡大縮小</td></tr>
<tr><th>削除・元に戻す</th><td>削除ツールで機器やケーブルをクリック。Ctrl+Z（ワークスペース上）で元に戻せます</td></tr>
<tr><th>PDU</th><td>封筒ツールで送信元 → 宛先の順にクリックすると ping を 1 発送り、結果を右下の一覧に記録します</td></tr>
<tr><th>検査</th><td>虫眼鏡ツールで機器をクリックすると ARP・MAC・ルーティング・NAT の表をその場で見られます</td></tr>
</table>
<h4>リアルタイムとシミュレーション</h4>
<p>リアルタイムでは 2 秒ごとに Kato のキープアライブや DHCP の再試行などが自動で動きます。シミュレーションに切り替えると時間が止まり、以後に発生したパケットがイベント一覧に記録されます。再生・1 コマ送りでパケットの移動を見たり、イベントをクリックして各レイヤーの中身を確かめたりできます。</p>
<h4>ケーブルの種類</h4>
<p>「自動」はどの組み合わせでもつながります。「ストレート」は PC・ルーターとスイッチの間、「クロス」は同種どうし（スイッチどうし、ルーターどうし、PC とルーター）で使います。種類を間違えるとリンクが赤のままになります。「コンソール」は PC の RS232 と Cisco 機器の Console をつなぎ、PC の「ターミナル」から CLI を操作できます。</p>
<h4>保存</h4>
<p>作業中のラボはブラウザに自動保存されます。別の端末でも続けたいときは「ファイル」→「クラウドに保存」、ファイルに残すときは「JSON をエクスポート」を使います。</p>`],
  ['ios', 'Cisco IOS の基本', `
<h4>モード</h4>
<table>
<tr><th>プロンプト</th><th>モード</th><th>入り方 / 抜け方</th></tr>
<tr><td><code>Router&gt;</code></td><td>ユーザー EXEC</td><td>ログイン直後。<code>enable</code> で次へ</td></tr>
<tr><td><code>Router#</code></td><td>特権 EXEC</td><td><code>configure terminal</code> で設定へ。<code>disable</code> で戻る</td></tr>
<tr><td><code>Router(config)#</code></td><td>グローバル設定</td><td><code>end</code> / Ctrl+Z で特権へ</td></tr>
<tr><td><code>Router(config-if)#</code></td><td>インターフェース設定</td><td><code>interface g0/0</code> など。<code>exit</code> で 1 つ戻る</td></tr>
<tr><td><code>Router(config-router)#</code></td><td>ルーティング設定</td><td><code>router ospf 1</code></td></tr>
<tr><td><code>Router(config-line)#</code></td><td>ライン設定</td><td><code>line console 0</code> / <code>line vty 0 4</code></td></tr>
</table>
<h4>入力のコツ</h4>
<ul><li><code>?</code> で使えるコマンドや次に入れる値が出ます（<code>sh?</code> は sh で始まるコマンド、<code>show ?</code> は show の次）。</li>
<li>Tab でコマンドを補完。<code>conf t</code>、<code>int g0/0</code>、<code>sh ip int br</code> のような省略形も通ります。</li>
<li>先頭に <code>no</code> を付けると設定を取り消せます。設定モードから show を打つときは <code>do show …</code>。</li>
<li>誤ったコマンドを EXEC モードで入れると、ホスト名として名前解決しようとして数秒待たされます。防ぐには <code>no ip domain-lookup</code>。</li></ul>
<h4>running-config と startup-config</h4>
<p>設定は即座に running-config（メモリ）に反映されます。電源を切ると消えるので、<code>copy running-config startup-config</code> で startup-config（NVRAM）に保存します。<code>show startup-config</code> で保存内容、<code>erase startup-config</code> と <code>reload</code> で初期化です。</p>
<h4>よく使う確認コマンド</h4>
<table>
<tr><td><code>show ip interface brief</code></td><td>IF の IP と up/down を一覧</td></tr>
<tr><td><code>show running-config</code></td><td>現在の設定</td></tr>
<tr><td><code>show ip route</code></td><td>ルーティングテーブル</td></tr>
<tr><td><code>show vlan brief</code></td><td>VLAN とポート</td></tr>
<tr><td><code>show interfaces trunk</code></td><td>トランクと許可 VLAN</td></tr>
<tr><td><code>show mac address-table</code></td><td>学習した MAC</td></tr>
<tr><td><code>show ip nat translations</code></td><td>NAT 変換表</td></tr>
<tr><td><code>show access-lists</code></td><td>ACL とヒット数</td></tr>
<tr><td><code>show cdp neighbors</code></td><td>隣接する Cisco 機器</td></tr>
<tr><td><code>show spanning-tree</code></td><td>STP のルートとポートの役割</td></tr>
<tr><td><code>show ip ospf neighbor</code></td><td>OSPF の隣接関係</td></tr>
</table>`],
  ['ios2', 'Cisco 設定レシピ', `
<h4>インターフェース</h4><pre>interface g0/0
 description to-RT1
 ip address 192.168.1.1 255.255.255.0
 no shutdown</pre>
<h4>VLAN とトランク（スイッチ）</h4><pre>vlan 10
 name SALES
interface range fa0/1 - 12
 switchport mode access
 switchport access vlan 10
interface g0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20</pre>
<p>3560 ではトランクの前に <code>switchport trunk encapsulation dot1q</code> が必要です。</p>
<h4>スタティックルート</h4><pre>ip route 10.0.0.0 255.255.255.0 192.168.1.2
ip route 10.0.0.0 255.255.255.0 192.168.2.2 250   ! フローティング（予備）
ip route 0.0.0.0 0.0.0.0 203.0.113.1              ! デフォルト</pre>
<h4>NAT（PAT）</h4><pre>interface g0/0
 ip nat inside
interface g0/2
 ip nat outside
access-list 1 permit 192.168.0.0 0.0.255.255
ip nat inside source list 1 interface g0/2 overload</pre>
<h4>DHCP サーバー</h4><pre>ip dhcp excluded-address 192.168.1.1 192.168.1.9
ip dhcp pool LAN
 network 192.168.1.0 255.255.255.0
 default-router 192.168.1.1
 dns-server 8.8.8.8</pre>
<p>別セグメントのクライアントには、ゲートウェイ側 IF に <code>ip helper-address &lt;DHCP サーバー&gt;</code>。</p>
<h4>ACL</h4><pre>access-list 100 permit icmp 192.168.1.0 0.0.0.255 any
access-list 100 deny ip any any
interface g0/0
 ip access-group 100 in</pre>
<h4>SSH</h4><pre>hostname R1
ip domain-name lab.local
crypto key generate rsa modulus 1024
username admin privilege 15 secret cisco
ip ssh version 2
line vty 0 4
 login local
 transport input ssh</pre>
<p>PC のコマンドプロンプトから <code>ssh -l admin 192.168.1.1</code>。</p>
<h4>OSPF</h4><pre>router ospf 1
 router-id 1.1.1.1
 network 10.1.0.0 0.0.255.255 area 0
 passive-interface g0/2</pre>`],
  ['kato', 'Kato の全体像', `
<div class="callout">Kato・Sokket・KMC（Kato Management Console）・Kato Client は、SASE の考え方を学ぶために作った<b>架空の製品</b>です。実在の企業・製品とは関係ありません。画面や用語は一般的な考え方を練習するための簡略化した例です。</div>
<p>SASE は、ネットワークとセキュリティをクラウドで提供する仕組みです。拠点やユーザーはそれぞれ最寄りの <b>PoP</b>（Kato Cloud の入口）へトンネルでつながり、拠点間の通信もインターネット向けの通信も PoP を経由します。</p>
<table>
<tr><th>Sokket</th><td>拠点に置くアプライアンス。WAN から PoP へトンネルを張り、LAN 側のゲートウェイになる。本体の設定はほぼ WAN と管理者だけ</td></tr>
<tr><th>KMC</th><td>クラウド側の管理画面。サイト、ネットワーク範囲、HA、回線の役割、ユーザー、Firewall を設定する</td></tr>
<tr><th>サイト</th><td>拠点の単位。Sokket をシリアル番号で割り当てる。Sokket を置かない拠点は IPsec サイトにする</td></tr>
<tr><th>Native Range / Local IP</th><td>Sokket の LAN がつながるセグメントと、その中で Sokket が持つアドレス（LAN 機器のゲートウェイ）</td></tr>
<tr><th>Routed 範囲</th><td>Native Range の先にある別セグメント。ゲートウェイ（L3 スイッチ等）を指定して登録する</td></tr>
<tr><th>SDP（Kato Client）</th><td>リモートの PC 用クライアント。KMC で SDP ライセンスを割り当てたユーザーだけが接続できる</td></tr>
<tr><th>WAN Firewall</th><td>サイト・ユーザー間の通信。許可したものだけ通す（既定は Block）</td></tr>
<tr><th>Internet Firewall</th><td>インターネット向けの通信。禁止したものだけ止める（既定は Allow）</td></tr>
</table>
<h4>導入の流れ（このラボ）</h4>
<ol><li>上流ルーターの準備：Sokket の WAN 側セグメント、NAT、インターネットへのデフォルトルート</li>
<li>Sokket の初期設定：MGMT ポートに PC をつなぎ https://169.254.100.1 で管理者登録、WAN を設定</li>
<li>Sokket が PoP に到達してトンネルが張られる</li>
<li>KMC でサイトを作り、Sokket をシリアルで割り当てる。Native Range・Local IP・Routed 範囲・HA・回線の役割を設定</li>
<li>Firewall のルールを整えて Publish し、疎通を確認する</li></ol>`],
  ['sokket', 'Sokket の初期設定とローカル管理画面', `
<p>Sokket には、現地作業や障害時に使うローカル管理画面があります。このラボでは MGMT ポートが <code>169.254.100.1/16</code> 固定です。</p>
<h4>開き方</h4>
<ol><li>PC（ノート PC）を Sokket の MGMT ポートにケーブルでつなぐ</li>
<li>PC の IP 設定を DHCP にする（DHCP サーバーがないので 169.254.x.x が自動で付く）</li>
<li>PC の Web ブラウザで <code>https://169.254.100.1</code> を開く</li></ol>
<p>Sokket の「ローカル WebUI」タブからも同じ画面を開けます（練習用の近道）。</p>
<h4>初回：管理者の登録</h4>
<p>初めて開くと管理者アカウントの登録画面が出ます。パスワードは 8 文字以上で、英大文字・英小文字・数字を含めます。以後はこのアカウントでログインします。3 回続けて失敗すると 30 秒ロックされます。</p>
<h4>画面の内容</h4>
<table>
<tr><th>ダッシュボード</th><td>PoP への接続、WAN ごとのトンネル、使用中の WAN、サイトと HA の状態</td></tr>
<tr><th>WAN 設定</th><td>WAN1 / WAN2 を DHCP か静的 IP に。静的なら IP・マスク・ゲートウェイ・DNS</td></tr>
<tr><th>LAN・管理ポート</th><td>LAN の IP は KMC から配られるので表示のみ。MGMT は固定</td></tr>
<tr><th>DNS・時刻</th><td>DNS サーバーと NTP サーバー</td></tr>
<tr><th>診断</th><td>WAN から ping、Kato Cloud 接続テスト（どこで止まっているかの目安を表示）</td></tr>
<tr><th>ログ・管理者・メンテナンス</th><td>操作ログ、パスワード変更、再起動、工場出荷時に戻す（RESET と入力）</td></tr>
</table>
<h4>トンネルが張れないとき</h4>
<ol><li>WAN のリンクと IP（ダッシュボード）</li><li>上流ルーターへの ping（診断で WAN のゲートウェイへ）</li><li>上流ルーターの NAT（<code>show ip nat translations</code>）とデフォルトルート（<code>show ip route</code>）</li><li>Kato Cloud（198.51.100.20）への ping</li></ol>`],
  ['kmc', 'KMC とラボの連動', `
<p>NetLab の「KMC 管理画面」は、KMC Trainer の画面をラボに連動させたものです。<b>ラボ連動中</b>の KMC で行った設定（サイト、Sokket の割り当て、ネットワーク範囲、HA、回線の役割、IPsec、ユーザー、WAN / Internet Firewall）は、ラボのファイルに保存され、シミュレーターの動きにそのまま反映されます。KMC Trainer を単体で開いた場合は、今までどおり見本データで動きます。</p>
<table>
<tr><th>Network → Sites</th><td>サイトの作成。Connection Type で Sokket か IPsec かを選ぶ</td></tr>
<tr><th>サイト → Snapshot</th><td>接続状態、Link State（WAN ごとのリンク・トンネル・使用中）、最近のイベント</td></tr>
<tr><th>サイト → Sokket</th><td>Primary / Secondary のシリアル割り当てと HA のオン・オフ</td></tr>
<tr><th>サイト → Networks</th><td>Native Range・Local IP、Routed 範囲の追加・削除</td></tr>
<tr><th>サイト → WAN / Link</th><td>WAN1・WAN2 の役割（Active / Passive / Last Resort）＝回線冗長</td></tr>
<tr><th>サイト → High Availability</th><td>各 Sokket の LAN IP、HA の状態、Test Failover</td></tr>
<tr><th>サイト → IPsec</th><td>IPsec サイトの Public IP・PSK・暗号方式</td></tr>
<tr><th>Security → WAN / Internet Firewall</th><td>Save → Publish して初めてラボに効く。App/Category を条件にしたルールはラボでは一致しない</td></tr>
</table>
<h4>回線冗長（WAN の役割）</h4>
<p>Active が複数あれば WAN1 を優先して使い、Active がすべて落ちると Passive、最後に Last Resort を使います。WAN2 を無効（Enable WAN2 がオフ）にしたサイトは WAN2 を使いません。RT1 の Gi0/0 を shutdown すると、Sokket M は WAN2 に切り替わります。</p>
<h4>HA</h4>
<p>2 台の Sokket が同じ LAN にいて、アクティブ側が VIP（Local IP）を持ちます。アクティブ側の電源断や全 WAN のトンネル断が約 6 秒続くと、スタンバイ側が引き継ぎます。戻りは自動では行いません。</p>`],
  ['ipsec', 'IPsec サイト（ルーター ⇄ PoP）', `
<p>Sokket を置けない拠点や既存ルーターを活かしたい拠点は、ルーターから PoP へ IPsec（IKEv2）でつなぎます。このラボの拠点C（RT-C）がその例です。ルーター側は<b>ルートベース VPN（VTI）</b>で、Tunnel0 に向けたルートの通信が暗号化されて PoP へ送られます。</p>
<h4>ルーター側（IOS）</h4><pre>crypto ikev2 proposal KATO-PROP
 encryption aes-cbc-256
 integrity sha256
 group 14
crypto ikev2 policy KATO-POL
 proposal KATO-PROP
crypto ikev2 keyring KATO-KEY
 peer KATO-POP
  address 198.51.100.20
  pre-shared-key Lab-Kato-PSK-2026
crypto ikev2 profile KATO-IKE
 match identity remote address 198.51.100.20 255.255.255.255
 authentication remote pre-share
 authentication local pre-share
 keyring local KATO-KEY
crypto ipsec transform-set KATO-TS esp-aes 256 esp-sha256-hmac
 mode tunnel
crypto ipsec profile KATO-IPSEC
 set transform-set KATO-TS
 set ikev2-profile KATO-IKE
interface Tunnel0
 ip address 169.254.10.1 255.255.255.252
 tunnel source GigabitEthernet0/0
 tunnel mode ipsec ipv4
 tunnel destination 198.51.100.20
 tunnel protection ipsec profile KATO-IPSEC
ip route 10.0.0.0 255.0.0.0 Tunnel0</pre>
<h4>KMC 側</h4>
<table><tr><th>Connection Type</th><td>IPsec IKEv2</td></tr><tr><th>Native Range</th><td>拠点の LAN（例 10.0.4.0/24）</td></tr><tr><th>Site Public IP</th><td>ルーターの WAN のグローバル IP（PoP から見える送信元）</td></tr><tr><th>Pre-Shared Key</th><td>ルーターの keyring と同じ値</td></tr><tr><th>Encryption / Integrity / DH</th><td>ルーターの proposal と transform-set に合わせる</td></tr></table>
<h4>確認と切り分け</h4>
<table>
<tr><td><code>show crypto session</code></td><td>UP-ACTIVE なら確立。DOWN なら理由も表示</td></tr>
<tr><td><code>show crypto ikev2 sa</code></td><td>IKE SA と、合意した暗号方式</td></tr>
<tr><td><code>show crypto ipsec sa</code></td><td>暗号化・復号したパケット数</td></tr>
<tr><td><code>show ip interface brief</code></td><td>Tunnel0 の Protocol が up か</td></tr>
</table>
<p>うまくいかないときは KMC の Events を見ます。「認証に失敗（PSK 不一致）」「IKE の提案が一致しない」「未登録の送信元（Public IP の誤り）」などの理由が出ます。</p>`],
  ['cato-flow', '構成図ラボのパケットの流れ', `
<p>PC#1（拠点B, 10.0.2.2）から PC#2（拠点A の VLAN20, 10.0.1.10）へ ping したとき：</p>
<ol><li>PC#1 → ゲートウェイ 10.0.2.1（拠点B の Sokket）</li>
<li>Sokket が「自サイトではない」と判断し、トンネル（UDP 443）に包んで GW → ISP 経由で PoP 198.51.100.20 へ送る</li>
<li>PoP が宛先 10.0.1.10 を拠点A の Routed 範囲と判定し、WAN Firewall を評価</li>
<li>PoP → 拠点A のアクティブ Sokket のトンネル宛て。宛先は RT1 の NAT 後のアドレス 203.0.113.194:ポート</li>
<li>RT1 が NAT を戻して 192.168.11.2（Sokket M の WAN1）へ</li>
<li>Sokket M が中身を取り出し、Routed 範囲のゲートウェイ 10.0.0.4（L2SW）へ転送 → L2SW が VLAN20 へルーティング</li></ol>
<p>拠点C（IPsec）宛ては、PoP が ESP（UDP 4500）で RT-C へ送り、RT-C が Tunnel0 で受けて LAN に転送します。インターネット宛ては、PoP が Internet Firewall を評価し、PoP のアドレスに変換してインターネットへ出します。</p>
<p>シミュレーションモードで ping を送ると、この流れをイベント一覧で 1 つずつ追えます。Kato・IPsec の行をクリックすると、トンネルの中身（元の ICMP）も表示されます。</p>`],
  ['limits', 'できること・できないこと', `
<h4>Cisco で再現しているもの</h4>
<p>モードとプロンプト、? ヘルプ、Tab 補完、省略形、<code>no</code>・<code>do</code>、<code>| include / exclude / begin / section</code>、エラー表示、running/startup-config と reload、インターフェース・サブインターフェース・SVI・ループバック・トンネル、VLAN・トランク・STP、スタティックルート（name・フローティング含む）、OSPF、NAT、ACL、DHCP、CDP、Telnet/SSH、IPsec（IKEv2・VTI・PSK）、ping/traceroute と主な show コマンド。</p>
<h4>まだ対応していないもの</h4>
<p>EIGRP・RIP・BGP、IPv6、EtherChannel、HSRP/VRRP、IKEv1・クリプトマップ方式の IPsec、証明書認証、ポートセキュリティ、QoS、debug。対応していないコマンドは <code>% Invalid input detected</code> になります。</p>
<h4>Kato で再現しているもの</h4>
<p>Sokket の管理者登録・WAN 設定・診断、PoP へのトンネル（NAT 越え）、サイト・Native Range・Routed 範囲、Sokket の割り当て、HA（VIP・フェイルオーバー）、回線冗長（Active / Passive / Last Resort）、IPsec サイト（IKEv2）、SDP ユーザーと Kato Client、WAN / Internet Firewall（Publish 後に反映）、イベント。</p>
<p>アプリケーション識別、IPS、DLP、帯域制御、複数 PoP 間の経路などは KMC の見本画面だけで、ラボの通信には影響しません。</p>`]
];
// English mode: swap in the English titles, steps and manual (tutor-en.js); the checks stay the same
const EN = window.I18N && I18N.en && NL.TUTOR_EN;
if (EN) {
  LABS.forEach(l => {
    const e = EN.labs[l.id]; if (!e) return;
    l.title = e.title; l.desc = e.desc;
    l.steps.forEach((s, i) => { const x = e.steps[i]; if (x) { s.t = x.t; s.b = x.b; } });
  });
  MANUAL.forEach(m => { if (EN.manual[m[0]]) m[2] = EN.manual[m[0]]; });
}

// ---------- state & render
const gst = { tab: 'labs', lab: null, chat: [], busy: null };
try { const s = JSON.parse(localStorage.getItem('netlab.guide') || '{}'); if (s.lab) gst.lab = s.lab; } catch (e) { /* storage unavailable */ }
const saveG = () => { try { localStorage.setItem('netlab.guide', JSON.stringify({ lab: gst.lab })); } catch (e) { /* ignore */ } };
let body, tabsEl;
function mount(el) {
  el.innerHTML = '';
  tabsEl = h('div', { class: 'tabs', role: 'tablist' });
  body = h('div', { class: 'gbody' });
  el.append(h('header', {}, h('h3', {}, 'ガイド'), h('button', { class: 'xbtn', 'aria-label': '閉じる', onclick: () => { el.hidden = true; NL.emit('guide', false); } }, '×')), tabsEl, body);
  render();
}
function render() {
  if (!body) return;
  tabsEl.innerHTML = '';
  [['labs', 'ガイド付きラボ'], ['manual', 'マニュアル'], ['ai', 'AI 講師']].forEach(([id, l]) => tabsEl.append(h('button', { role: 'tab', 'aria-selected': String(gst.tab === id), onclick: () => { gst.tab = id; render(); } }, l)));
  const keep = body.scrollTop;
  body.innerHTML = '';
  body.style.display = gst.tab === 'ai' ? 'grid' : '';
  ({ labs: rLabs, manual: rManual, ai: rAI })[gst.tab](body);
  if (gst.tab === 'labs') body.scrollTop = keep;
}
function rLabs(b) {
  const lab = LABS.find(l => l.id === gst.lab);
  if (!lab) {
    b.append(h('p', { style: 'color:var(--muted)' }, 'ラボを選ぶと手順と自動チェックが表示されます。サンプルを読み込むと作業中のラボは置き換わります（自動保存は上書きされます）。'));
    LABS.forEach(l => b.append(h('div', { class: 'labcard' }, h('h5', {}, l.title, ' ', h('span', { class: 'pill' }, l.level)), h('p', {}, l.desc), h('p', {}, l.steps.length + ' ステップ'),
      h('div', { class: 'row' }, h('button', { class: 'hbtn primary', onclick: () => { NL.app.loadScenario(l.scenario); gst.lab = l.id; saveG(); render(); } }, 'サンプルを読み込んで開始'),
        h('button', { class: 'hbtn', onclick: () => { gst.lab = l.id; saveG(); render(); } }, '今のラボで続ける')))));
    return;
  }
  const res = lab.steps.map(s => { try { return !!s.c(); } catch (e) { return false; } });
  const cur = res.indexOf(false);
  const done = res.filter(Boolean).length;
  b.append(h('div', { class: 'rowbtns' }, h('button', { class: 'linkbtn', onclick: () => { gst.lab = null; saveG(); render(); } }, '← ラボ一覧'), h('span', { style: 'color:var(--muted);font-size:12px' }, `${done} / ${lab.steps.length} 完了`)),
    h('h4', {}, lab.title), h('div', { class: 'progress' }, h('i', { style: `width:${Math.round(done * 100 / lab.steps.length)}%` })), enNote());
  const ol = h('ol', { class: 'steps' });
  lab.steps.forEach((s, i) => {
    const det = h('details', { class: 'step' + (res[i] ? ' done' : '') + (i === cur ? ' cur' : ''), open: i === cur ? true : null },
      h('summary', {}, h('span', { class: 'chk', 'aria-label': res[i] ? '完了' : '未完了' }, '✓'), h('span', {}, h('b', {}, (i + 1) + '. '), s.t)),
      h('div', { class: 'sbody' }, h('div', { html: s.b }),
        s.hint ? h('details', {}, h('summary', { style: 'color:var(--accent);cursor:pointer' }, 'コマンド例を見る'), h('pre', {}, s.hint)) : null,
        h('div', { class: 'rowbtns', style: 'margin-top:6px' }, NL.app.sampleOK() ? h('button', { class: 'linkbtn', onclick: () => { gst.tab = 'ai'; render(); ask(EN ? `About step ${i + 1} "${s.t}" of the guide "${lab.title}": looking at my current lab, what should I do and why? If it is not working, point out the cause.` : `ガイド「${lab.title}」のステップ ${i + 1}「${s.t}」について、今のラボの状態を見て、何をすればよいか・なぜそうするのかを教えてください。うまくいかない場合は原因も指摘してください。`); } }, 'AI 講師に聞く') : null)));
    ol.append(h('li', {}, det));
  });
  b.append(ol);
  if (cur === -1) b.append(h('div', { class: 'callout c', style: 'margin-top:10px' }, 'すべてのステップを完了しました。'));
}
// in English mode the long guide text is still Japanese; say so instead of leaving it unexplained
function enNote() {
  return window.I18N && I18N.en && !EN ? h('div', { class: 'callout c', 'data-i18n-skip': '' }, 'The step-by-step text and the manual body are still in Japanese. Titles, buttons and checks are in English; full English text is coming in a later update. You can also ask the AI tutor in English.') : null;
}
function rManual(b) {
  const toc = h('div', { class: 'toc' });
  const secs = MANUAL.map(([id, t, html]) => { const sec = h('section', { id: 'man-' + id }, h('h4', {}, t), h('div', { html })); toc.append(h('button', { onclick: () => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, t)); return sec; });
  b.append(enNote() || '', toc, ...secs);
}
function rAI(b) {
  const msgs = h('div', { class: 'msgs', 'aria-live': 'polite' });
  if (!gst.chat.length) msgs.append(h('div', { class: 'msg a' }, 'Cisco と Kato（架空の SASE）の操作について何でも聞いてください。今のラボの機器・設定・ログを見たうえで答えます。たとえば「拠点B から PC#2 に ping が通らない」「HA の VIP はどう決まる？」など。'));
  gst.chat.forEach(m => msgs.append(h('div', { class: 'msg ' + (m.role === 'user' ? 'u' : 'a') }, m.content)));
  if (gst.busy) msgs.append(gst.busy.el);
  const ta = h('textarea', { id: 'aiInput', placeholder: '質問を入力（Ctrl+Enter で送信）', 'aria-label': 'AI 講師への質問' });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
  const send = () => { const q = ta.value.trim(); if (!q) return; ta.value = ''; ask(q); };
  const quick = ['今のラボを診断して、問題点を教えて', '次に何をすればいい？', '直近の ping が失敗した理由は？', 'このラボの設定を解説して'];
  const avail = NL.app.sampleOK();
  b.append(h('div', { class: 'chat' }, msgs, h('div', { class: 'compose' },
    avail ? h('div', { class: 'quick' }, quick.map(q => h('button', { onclick: () => ask(q) }, q))) : h('p', { class: 'err-msg' }, 'この表示では AI 講師を使えません（claude.ai 上で開くと使えます）。マニュアルとガイド付きラボは使えます。'),
    ta, h('div', { class: 'rowbtns' }, h('button', { class: 'hbtn primary', disabled: !avail || gst.busy ? true : null, onclick: send }, '送信'),
      gst.busy ? h('button', { class: 'hbtn', onclick: () => gst.busy && gst.busy.ctl.abort() }, '停止') : null,
      gst.chat.length ? h('button', { class: 'linkbtn', onclick: () => { gst.chat = []; render(); } }, '会話をリセット') : null))));
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 0);
}
const RULES = `あなたは Cisco IOS と SASE（クラウド型ネットワーク・セキュリティ）を教える日本語の講師です。受講者はブラウザ上のネットワーク実機トレーナー「NetLab」で練習しています。NetLab の Kato・Sokket・KMC・Kato Client は学習用の架空の SASE 製品で、実在の製品とは関係ありません。
NetLab の仕様:
- Cisco 機器（2911 / ISR4331 ルーター、2960 / 3560 スイッチ）は IOS 風 CLI。対応: モード、? ヘルプ、| include 等、VLAN、トランク、STP、スタティック（name 付き含む）、OSPF、NAT/PAT、ACL、DHCP、Telnet/SSH、IPsec（IKEv2 proposal/policy/keyring/profile、ipsec transform-set/profile、interface Tunnel の VTI）、show crypto 各種。未対応: EIGRP/RIP/BGP、IPv6、HSRP、EtherChannel、IKEv1、crypto map、debug。
- インターネット: ISP ルーター（192.0.2.1）の先に 198.51.100.0/24 があり、Web サーバー 198.51.100.10 と Kato Cloud（PoP）198.51.100.20 がある。拠点のルーターにはデフォルトルートが必要。
- Sokket S160（WAN1/WAN2/LAN1/MGMT）。MGMT は 169.254.100.1/16 固定。PC を MGMT につなぎ DHCP（APIPA）で https://169.254.100.1 を開くとローカル管理画面。初回は管理者登録、その後 WAN（DHCP/静的）、DNS/NTP、診断、ログ、再起動・初期化。Sokket は PoP に UDP 443 で到達できるとトンネルを張る。WAN 側から受けた平文の通信は LAN に転送しない。
- KMC（ラボ連動）: Sites でサイト作成（Connection Type: Sokket S160 か IPsec IKEv2）、サイト詳細の Sokket（シリアル割り当て・HA）、Networks（Native Range・Local IP・Routed 範囲）、WAN / Link（WAN1/WAN2 の役割 Active/Passive/Last Resort）、High Availability（各 Sokket の LAN IP、Test Failover）、IPsec（Site Public IP・PSK・暗号方式）。Users の SDP ライセンス、WAN Firewall（既定 Block）と Internet Firewall（既定 Allow）は Save → Publish で反映。App/Category 条件のルールはラボでは一致しない。
回答の方針:
- 受講者のラボ状態（下に添付）を根拠に、具体的な機器名・コマンド・画面の操作手順で答える。推測は推測と書く。
- まず結論、次に手順、最後に「なぜそうするか」を短く。コマンドは行ごとに書く。
- Kato は架空の製品なので、実在の製品の仕様として断定しない。実機の作業は導入製品の公式ドキュメントで確認するよう添える。
- 長くても 400 字程度＋コマンド例に収める。`;
function labContext() {
  const L = [`# ラボ「${NL.lab.name}」の現在の状態`, `モード: ${NL.app.simMode() ? 'シミュレーション' : 'リアルタイム'}`];
  for (const d of NL.lab.devices) {
    const k = NL.kind(d);
    if (NL.isCisco(d)) {
      const rc = NL.ios.runConf(d, d.cfg).split('\n');
      const blocks = []; let cur = null;
      for (const l of rc) {
        if (l === '!' || /^(version|no service timestamps|ip flow-export|ip classless|end$)/.test(l) || /^ (duplex|speed) auto$/.test(l)) continue;
        if (/^\S/.test(l)) { cur = [l]; blocks.push(cur); } else if (cur) cur.push(l);
      }
      const txt = blocks.filter(b => !(b.length === 1 && /^interface /.test(b[0]))).map(b => b.join('\n')).join('\n');
      const up = Object.keys(d.cfg.interfaces).map(n => [n, NL.ifState(d, n)]).filter(([, s]) => s.proto === 'up').map(([n]) => U.shortIf(n));
      L.push(`\n## ${d.name}（${NL.MODELS[d.model].label}）電源 ${d.power ? 'ON' : 'OFF'}${d.startup ? '' : '、startup-config 未保存'}\n${txt}\n[up の IF] ${up.join(', ') || 'なし'}`);
      const nb = NL.ospfNbrs(d); if (nb.length) L.push('[OSPF 隣接] ' + nb.map(n => n.rid + '@' + n.ifn).join(', '));
    } else if (k === 'pc' || k === 'server') {
      const a = NL.hostAddr(d), c = NL.rt(d).cato;
      L.push(`\n## ${d.name}（${k}）IP ${a.ip || '未設定'}/${a.mask ? U.maskLen(a.mask) : '-'} GW ${a.gw || '-'}${d.cfg.dhcp ? '（DHCP）' : ''}${c ? ` / Kato Client ${c.state}${c.clientIp ? ' ' + c.clientIp : ''}${c.err ? '（' + c.err + '）' : ''}` : ''}`);
    } else if (k === 'socket') {
      const s = NL.cato.siteOf(d);
      L.push(`\n## ${d.name}（Sokket, シリアル ${d.serial}）電源 ${d.power ? 'ON' : 'OFF'} / サイト ${s ? s.site.name + ' ' + s.role : '未割当'}${s && s.site.secondarySerial ? (NL.cato.isActive(d) ? ' Active' : ' Standby') : ''}\n` +
        ['WAN1', 'WAN2'].map(w => { const c = d.cfg.wan[w], a = NL.socketWan(d, w); return `${w}: ${c.mode} ${a.ip || '-'}/${a.mask ? U.maskLen(a.mask) : '-'} gw ${a.gw || '-'} トンネル ${NL.cato.tunUp(d, w) ? 'UP' : 'DOWN'}`; }).join('\n'));
    } else if (k === 'pop') L.push(`\n## ${d.name}（Kato Cloud PoP）IP ${d.cfg.ip}/${d.cfg.mask ? U.maskLen(d.cfg.mask) : '-'} GW ${d.cfg.gw}`);
  }
  L.push('\n## 配線');
  NL.lab.links.forEach(l => { const a = NL.dev(l.a.d), b = NL.dev(l.b.d); L.push(`${a.name} ${l.a.p} <-> ${b.name} ${l.b.p}（${l.cable}${l.cable !== 'console' ? ', ' + (NL.portLinkUp(a, l.a.p) ? 'up' : 'down') : ''}）`); });
  const c = NL.cato.cfg();
  L.push('\n## KMC（ラボ連動）の設定', JSON.stringify({ sites: c.sites.map(s => ({ name: s.name, conn: s.conn, status: NL.cato.siteStatus(s), nativeRange: s.nativeRange, localIp: s.localIp, primary: (NL.devBySerial(s.primarySerial) || {}).name || s.primarySerial, secondary: (NL.devBySerial(s.secondarySerial) || {}).name || s.secondarySerial, ha: s.ha, wan: s.wan, ranges: s.ranges, ipsec: s.ipsec ? Object.assign({}, s.ipsec, { psk: s.ipsec.psk ? '(設定済み・' + s.ipsec.psk.length + '文字)' : '(未設定)' }) : undefined, ipsecState: s.ipsecSite ? NL.cato.ipsecState(s.id) : undefined, haStatus: s.secondarySerial ? NL.cato.haStatus(s).reason : undefined, links: s.ipsecSite ? undefined : NL.cato.linkState(s).map(l => `${l.wan} ${l.role} link:${l.link} tunnel:${l.tunnel}${l.inUse ? ' 使用中' : ''}`) })), sdpUsers: c.users.map(u => u.email), sdpRange: c.sdpRange, wanFw: c.wanFw, inetFw: c.inetFw }));
  L.push('\n## 直近のパケット破棄（新しい順）', NL.sim.drops.slice(0, 10).map(d => `${d.at}: ${d.reason}`).join('\n') || 'なし');
  L.push('\n## Kato イベント（新しい順）', NL.cato.events().slice(0, 8).map(e => `${e.time} ${e.type} ${e.site} ${e.msg}`).join('\n') || 'なし');
  const lab = LABS.find(l => l.id === gst.lab);
  if (lab) { const i = lab.steps.findIndex(s => { try { return !s.c(); } catch (e) { return true; } }); L.push(`\n## 進行中のガイド: ${lab.title} / 次のステップ: ${i < 0 ? '完了' : (i + 1) + '. ' + lab.steps[i].t}`); }
  return L.join('\n').slice(0, 90000);
}
async function ask(q) {
  if (gst.busy) return;
  const sample = await NL.app.sample();
  if (!sample) { ui.toast('この表示では AI 講師を使えません', true); return; }
  gst.tab = 'ai';
  gst.chat.push({ role: 'user', content: q });
  const el = h('div', { class: 'msg a' }, '考えています…');
  const ctl = new AbortController();
  gst.busy = { el, ctl };
  render();
  const en = window.I18N && I18N.en ? '\n\nIMPORTANT: the learner is using the English UI. Answer in English (keep device names, commands and Japanese site names such as 拠点A as they are).' : '';
  const turns = [{ role: 'user', content: RULES + en + '\n\n' + labContext() }, { role: 'assistant', content: 'ラボの状態を確認しました。質問をどうぞ。' }, ...gst.chat.slice(-12)];
  try {
    const r = await sample(turns, { cache: false, signal: ctl.signal, onText: ({ text }) => { el.textContent = text; const m = el.parentNode; if (m) m.scrollTop = m.scrollHeight; } });
    gst.chat.push({ role: 'assistant', content: r.text + (r.truncated ? '\n（途中で切れました。続きは「続けて」と送ってください）' : '') });
  } catch (e) {
    const msg = { not_granted: 'AI 講師の利用が許可されませんでした。', rate_limited: '混み合っています。少し待ってからもう一度送ってください。', cancelled: '（停止しました）', prompt_too_large: 'ラボが大きすぎて送れませんでした。機器を減らすか質問を短くしてください。' }[e && e.code] || '回答を取得できませんでした（' + ((e && e.code) || 'error') + '）。';
    gst.chat.push({ role: 'assistant', content: (e && e.text ? e.text + '\n\n' : '') + msg });
  } finally { gst.busy = null; render(); }
}
let t;
NL.on('change', () => { if (gst.tab !== 'labs' || !gst.lab) return; clearTimeout(t); t = setTimeout(() => { if (!document.querySelector('#guide').contains(document.activeElement)) render(); }, 600); });
NL.on('ping', () => { if (gst.tab === 'labs' && gst.lab) { clearTimeout(t); t = setTimeout(render, 300); } });
NL.on('cli', () => { if (gst.tab === 'labs' && gst.lab) { clearTimeout(t); t = setTimeout(render, 300); } });
NL.tutor = { mount, render, ask, labs: LABS, setLab: id => { gst.lab = id; saveG(); render(); }, openTab: tab => { gst.tab = tab; render(); } };
})();
