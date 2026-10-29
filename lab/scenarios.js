/* NetLab preset labs. Each build() starts from an empty lab, places devices, cables them, and optionally configures them.
   Public addresses use the documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24). */
(function (G) {
'use strict';
const NL = G.NL;
const add = (model, x, y, name) => NL.addDevice(model, x, y, { name });
const link = (a, ap, b, bp, cable) => { const r = NL.connect(a, ap, b, bp, cable || 'auto'); if (typeof r === 'string') console.warn(r, a.name, ap, b.name, bp); return r; };
const ios = (dev, lines) => { NL.ios.batch(dev, ['configure terminal', ...lines, 'end']); dev.startup = NL.util.clone(dev.cfg); };
const host = (dev, ip, mask, gw) => { Object.assign(dev.cfg, { ip, mask, gw }); };
const PSK = 'Lab-Kato-PSK-2026';

function diagramTopology() {
  const L = {};
  L.isp = add('2911', 640, -90, 'ISP');
  L.inet = add('2960', 960, -90, 'INET-SW');
  L.web = add('server', 1160, -180, 'Web');
  L.pop = add('pop', 1160, -40, 'Kato Cloud');
  L.rtc = add('2911', 1380, -90, 'RT-C');
  L.pc3 = add('pc', 1380, 100, 'PC#3');
  L.gw = add('3560', 640, 110, 'GW');
  L.pc0 = add('pc', 230, 250, 'PC#0');
  L.rt1 = add('2911', 470, 290, 'RT1');
  L.rt2 = add('2911', 810, 290, 'RT2');
  L.sm = add('x1500', 470, 500, 'Sokket M');
  L.sb = add('x1500', 810, 500, 'Sokket B');
  L.sw = add('3560', 640, 680, 'L2SW');
  L.pc2 = add('pc', 640, 840, 'PC#2');
  L.sc = add('x1500', 1150, 330, 'Sokket 拠点B');
  L.pc1 = add('pc', 1150, 540, 'PC#1');
  link(L.isp, 'GigabitEthernet0/0', L.gw, 'GigabitEthernet0/1');
  link(L.isp, 'GigabitEthernet0/1', L.inet, 'GigabitEthernet0/1');
  link(L.web, 'FastEthernet0', L.inet, 'FastEthernet0/1');
  link(L.pop, 'eth0', L.inet, 'FastEthernet0/2');
  link(L.rtc, 'GigabitEthernet0/0', L.inet, 'FastEthernet0/3');
  link(L.rtc, 'GigabitEthernet0/1', L.pc3, 'FastEthernet0');
  link(L.gw, 'FastEthernet0/1', L.rt1, 'GigabitEthernet0/2');
  link(L.gw, 'FastEthernet0/2', L.rt2, 'GigabitEthernet0/2');
  link(L.gw, 'FastEthernet0/3', L.sc, 'WAN1');
  link(L.gw, 'FastEthernet0/4', L.pc0, 'FastEthernet0');
  link(L.rt1, 'GigabitEthernet0/0', L.sm, 'WAN1');
  link(L.rt2, 'GigabitEthernet0/0', L.sm, 'WAN2');
  link(L.rt1, 'GigabitEthernet0/1', L.sb, 'WAN1');
  link(L.rt2, 'GigabitEthernet0/1', L.sb, 'WAN2');
  link(L.sm, 'LAN1', L.sw, 'GigabitEthernet0/1');
  link(L.sb, 'LAN1', L.sw, 'GigabitEthernet0/2');
  link(L.sw, 'FastEthernet0/1', L.pc2, 'FastEthernet0');
  link(L.sc, 'LAN1', L.pc1, 'FastEthernet0');
  // the internet side is infrastructure, so it comes configured
  ios(L.isp, ['hostname ISP', 'no ip domain-lookup',
    'interface g0/0', 'description to-GW', 'ip address 192.0.2.1 255.255.255.252', 'no shutdown', 'exit',
    'interface g0/1', 'description INTERNET', 'ip address 198.51.100.1 255.255.255.0', 'no shutdown', 'exit',
    'ip route 203.0.113.192 255.255.255.192 192.0.2.2']);
  ios(L.inet, ['hostname INET-SW', 'no ip domain-lookup']);
  host(L.web, '198.51.100.10', '255.255.255.0', '198.51.100.1');
  L.web.cfg.html = '<h1>example.net</h1><p>インターネット上の Web サーバー（198.51.100.10）です。ここが見えればインターネットにつながっています。</p>';
  Object.assign(L.pop.cfg, { ip: '198.51.100.20', mask: '255.255.255.0', gw: '198.51.100.1' });
  NL.lab.notes.push(
    { id: 'n1', x: 470, y: 400, text: '拠点A（Sokket HA 構成）' },
    { id: 'n2', x: 1150, y: 430, text: '拠点B' },
    { id: 'n3', x: 230, y: 330, text: 'リモート（Kato Client）' },
    { id: 'n4', x: 960, y: 40, text: 'GW 側セグメント 203.0.113.192/26' },
    { id: 'n5', x: 960, y: -170, text: 'インターネット（ISP 網 198.51.100.0/24）' },
    { id: 'n6', x: 1380, y: 180, text: '拠点C（IPsec サイト）' }
  );
  return L;
}

function configureCisco(L) {
  ios(L.gw, ['hostname GW', 'ip routing', 'interface vlan 1', 'ip address 203.0.113.193 255.255.255.192', 'no shutdown', 'exit',
    'interface g0/1', 'no switchport', 'ip address 192.0.2.2 255.255.255.252', 'no shutdown', 'exit',
    'ip route 0.0.0.0 0.0.0.0 192.0.2.1',
    'ip route 10.0.0.0 255.255.255.240 203.0.113.194', 'ip route 10.0.0.0 255.255.255.240 203.0.113.195 250',
    'ip route 10.0.1.0 255.255.255.0 203.0.113.194', 'ip route 10.0.1.0 255.255.255.0 203.0.113.195 250',
    'ip route 10.0.2.0 255.255.255.0 203.0.113.196', 'ip route 10.0.3.0 255.255.255.0 203.0.113.197']);
  const rt = (d, name, a, b, wan, socketM, socketB) => ios(d, ['hostname ' + name,
    'interface g0/0', `ip address ${a} 255.255.255.252`, 'ip nat inside', 'no shutdown', 'exit',
    'interface g0/1', `ip address ${b} 255.255.255.252`, 'ip nat inside', 'no shutdown', 'exit',
    'interface g0/2', `ip address ${wan} 255.255.255.192`, 'ip nat outside', 'no shutdown', 'exit',
    'ip access-list standard ACL-NAT-INSIDE', 'permit 192.168.0.0 0.0.255.255', 'exit',
    'ip nat inside source list ACL-NAT-INSIDE interface g0/2 overload',
    'ip route 0.0.0.0 0.0.0.0 203.0.113.193',
    `ip route 10.0.0.0 255.255.255.240 ${socketM} name SITEA-VLAN10-SOCKET-M`, `ip route 10.0.0.0 255.255.255.240 ${socketB} 200 name SITEA-VLAN10-SOCKET-B`,
    `ip route 10.0.1.0 255.255.255.0 ${socketM} name SITEA-VLAN20-SOCKET-M`, `ip route 10.0.1.0 255.255.255.0 ${socketB} 200 name SITEA-VLAN20-SOCKET-B`]);
  rt(L.rt1, 'RT1', '192.168.11.1', '192.168.13.1', '203.0.113.194', '192.168.11.2', '192.168.13.2');
  rt(L.rt2, 'RT2', '192.168.12.1', '192.168.14.1', '203.0.113.195', '192.168.12.2', '192.168.14.2');
  ios(L.sw, ['hostname L2SW', 'vlan 10', 'name SOCKET-LAN', 'exit', 'vlan 20', 'name USERS', 'exit',
    'interface range g0/1 - 2', 'switchport mode access', 'switchport access vlan 10', 'exit',
    'interface fa0/1', 'switchport mode access', 'switchport access vlan 20', 'exit',
    'interface vlan 10', 'ip address 10.0.0.4 255.255.255.240', 'no shutdown', 'exit',
    'interface vlan 20', 'ip address 10.0.1.1 255.255.255.0', 'no shutdown', 'exit',
    'ip routing', 'ip route 0.0.0.0 0.0.0.0 10.0.0.3']);
  ios(L.rtc, ['hostname RT-C',
    'interface g0/0', 'description to-INTERNET', 'ip address 198.51.100.30 255.255.255.0', 'no shutdown', 'exit',
    'interface g0/1', 'description LAN', 'ip address 10.0.4.1 255.255.255.0', 'no shutdown', 'exit',
    'ip route 0.0.0.0 0.0.0.0 198.51.100.1']);
  host(L.pc0, '203.0.113.197', '255.255.255.192', '203.0.113.193');
  host(L.pc1, '10.0.2.2', '255.255.255.0', '10.0.2.1');
  host(L.pc2, '10.0.1.10', '255.255.255.0', '10.0.1.1');
  host(L.pc3, '10.0.4.10', '255.255.255.0', '10.0.4.1');
  NL.touch('cfg');
}
function configureIpsecRouter(L) {
  ios(L.rtc, ['crypto ikev2 proposal KATO-PROP', 'encryption aes-cbc-256', 'integrity sha256', 'group 14', 'exit',
    'crypto ikev2 policy KATO-POL', 'proposal KATO-PROP', 'exit',
    'crypto ikev2 keyring KATO-KEY', 'peer KATO-POP', 'address 198.51.100.20', 'pre-shared-key ' + PSK, 'exit', 'exit',
    'crypto ikev2 profile KATO-IKE', 'match identity remote address 198.51.100.20 255.255.255.255', 'authentication remote pre-share', 'authentication local pre-share', 'keyring local KATO-KEY', 'exit',
    'crypto ipsec transform-set KATO-TS esp-aes 256 esp-sha256-hmac', 'mode tunnel', 'exit',
    'crypto ipsec profile KATO-IPSEC', 'set transform-set KATO-TS', 'set ikev2-profile KATO-IKE', 'exit',
    'interface Tunnel0', 'ip address 169.254.10.1 255.255.255.252', 'ip mtu 1400', 'ip tcp adjust-mss 1360', 'tunnel source g0/0', 'tunnel mode ipsec ipv4', 'tunnel destination 198.51.100.20', 'tunnel protection ipsec profile KATO-IPSEC', 'exit',
    'ip route 10.0.0.0 255.0.0.0 Tunnel0']);
}
function configureKato(L) {
  const wan = (d, w, ip, mask, gw) => Object.assign(d.cfg.wan[w], { mode: 'static', ip, mask, gw, dns: '' });
  wan(L.sm, 'WAN1', '192.168.11.2', '255.255.255.252', '192.168.11.1');
  wan(L.sm, 'WAN2', '192.168.12.2', '255.255.255.252', '192.168.12.1');
  wan(L.sb, 'WAN1', '192.168.13.2', '255.255.255.252', '192.168.13.1');
  wan(L.sb, 'WAN2', '192.168.14.2', '255.255.255.252', '192.168.14.1');
  wan(L.sc, 'WAN1', '203.0.113.196', '255.255.255.192', '203.0.113.193');
  [L.sm, L.sb, L.sc].forEach(d => { d.cfg.admin = { user: 'admin', pw: 'Kato-Lab-2026' }; });
  L.pc0.cfg.catoEmail = 'user01@lab.local';
  const base = (id, name, native, localIp) => ({ id, name, type: 'Branch', conn: 'Sokket S160', country: 'Japan', city: 'Tokyo', tz: 'Asia/Tokyo', native, localIp, ha: false, serials: { primary: '', secondary: '' }, haIps: { primary: '', secondary: '' },
    wan1: { name: 'WAN1', isp: 'RT1 経由', down: 100, up: 100, role: 'Active' }, wan2: { name: 'WAN2', isp: 'RT2 経由', down: 100, up: 100, role: 'Active' }, ranges: [], license: 'Japan - 100 Mbps', pop: '—', status: 'Pending' });
  const a = base('sA', '拠点A', '10.0.0.0/28', '10.0.0.3');
  Object.assign(a, { type: 'Headquarters', ha: true, serials: { primary: L.sm.serial, secondary: L.sb.serial }, haIps: { primary: '10.0.0.1', secondary: '10.0.0.2' }, ranges: [{ id: 'r1', name: 'VLAN20-USERS', cidr: '10.0.1.0/24', gw: '10.0.0.4' }] });
  const b = base('sB', '拠点B', '10.0.2.0/24', '10.0.2.1');
  Object.assign(b, { city: 'Osaka', serials: { primary: L.sc.serial, secondary: '' }, wan1: { name: 'WAN1', isp: 'GW 直結', down: 100, up: 100, role: 'Active' }, wan2: null });
  const c = base('sC', '拠点C', '10.0.4.0/24', '10.0.4.1');
  Object.assign(c, { conn: 'IPsec IKEv2', city: 'Nagoya', wan1: { name: 'WAN1', isp: 'RT-C', down: 50, up: 50, role: 'Active' }, wan2: null,
    ipsec: { sitePublicIp: '198.51.100.30', psk: PSK, ike: 'IKEv2', enc: 'AES-CBC-256', integ: 'SHA256', dh: 14 } });
  NL.lab.kmc.sites = [a, b, c];
  NL.touch('cfg');
}

NL.scenarios = [
  {
    id: 'diagram', name: '構成図ラボ（配線済み・未設定）', desc: '構成図どおりに機器を置いて配線だけ済ませた状態です。ISP・Web・Kato Cloud（インターネット側）だけ設定済みで、GW・RT・L2SW・Sokket・拠点C のルーター・PC を自分で設定して完成させます。',
    build() { NL.loadLab(NL.newLab('構成図ラボ')); diagramTopology(); NL.touch('topo'); }
  },
  {
    id: 'diagram-cisco', name: '構成図ラボ（Cisco 設定済み・Kato 未設定）', desc: 'GW・RT1・RT2・L2SW・RT-C の基本設定と PC の設定まで済んだ状態です。Sokket の初期設定、KMC でのサイト作成、RT-C の IPsec から始められます。',
    build() { NL.loadLab(NL.newLab('構成図ラボ（Kato 練習）')); configureCisco(diagramTopology()); }
  },
  {
    id: 'diagram-done', name: '構成図ラボ（完成形）', desc: '答え合わせ用です。数秒で Sokket のトンネルと RT-C の IPsec が張られ、拠点A・B・C・Kato Client の間と、インターネットの Web サーバーへ通信できます。',
    build() { NL.loadLab(NL.newLab('構成図ラボ（完成形）')); const L = diagramTopology(); configureCisco(L); configureIpsecRouter(L); configureKato(L); }
  },
  {
    id: 'cisco-basic', name: 'Cisco 入門ラボ', desc: 'ルーター 1 台・スイッチ 1 台・PC 2 台の小さな構成です。PC0 からはコンソールケーブルでルーターにつながっています。',
    build() {
      NL.loadLab(NL.newLab('Cisco 入門ラボ'));
      const r = add('2911', 520, 180, 'Router0');
      const s = add('2960', 520, 380, 'Switch0');
      const p0 = add('pc', 340, 560, 'PC0');
      const p1 = add('pc', 700, 560, 'PC1');
      link(r, 'GigabitEthernet0/0', s, 'GigabitEthernet0/1');
      link(p0, 'FastEthernet0', s, 'FastEthernet0/1');
      link(p1, 'FastEthernet0', s, 'FastEthernet0/2');
      link(p0, 'RS232', r, 'Console', 'console');
      NL.touch('topo');
    }
  },
  {
    id: 'vlan', name: 'VLAN とルーター・オン・ア・スティック', desc: 'スイッチ 1 台に VLAN 10 と VLAN 20 の PC を 2 台ずつ。ルーターのサブインターフェースで VLAN 間ルーティングを練習します。',
    build() {
      NL.loadLab(NL.newLab('VLAN ラボ'));
      const r = add('2911', 560, 160, 'Router0');
      const s = add('2960', 560, 360, 'Switch0');
      const pcs = [['PC-A', 300], ['PC-B', 480], ['PC-C', 660], ['PC-D', 840]].map(([n, x]) => add('pc', x, 560, n));
      link(r, 'GigabitEthernet0/0', s, 'GigabitEthernet0/1');
      pcs.forEach((p, i) => link(p, 'FastEthernet0', s, 'FastEthernet0/' + (i + 1)));
      NL.lab.notes.push({ id: 'n1', x: 390, y: 640, text: 'VLAN 10: 192.168.10.0/24' }, { id: 'n2', x: 750, y: 640, text: 'VLAN 20: 192.168.20.0/24' });
      NL.touch('topo');
    }
  },
  {
    id: 'ospf', name: 'OSPF 練習（ルーター 3 台）', desc: '3 台のルーターを三角形に接続し、両端に PC を置いた構成です。OSPF で経路を交換させてみましょう。',
    build() {
      NL.loadLab(NL.newLab('OSPF ラボ'));
      const a = add('2911', 400, 220, 'R1'), b = add('2911', 760, 220, 'R2'), c = add('2911', 580, 460, 'R3');
      const p1 = add('pc', 220, 420, 'PC1'), p2 = add('pc', 940, 420, 'PC2');
      link(a, 'GigabitEthernet0/0', b, 'GigabitEthernet0/0');
      link(a, 'GigabitEthernet0/1', c, 'GigabitEthernet0/0');
      link(b, 'GigabitEthernet0/1', c, 'GigabitEthernet0/1');
      link(a, 'GigabitEthernet0/2', p1, 'FastEthernet0');
      link(b, 'GigabitEthernet0/2', p2, 'FastEthernet0');
      NL.lab.notes.push({ id: 'n1', x: 580, y: 150, text: 'R1-R2 10.1.12.0/30・R1-R3 10.1.13.0/30・R2-R3 10.1.23.0/30' });
      NL.touch('topo');
    }
  },
  {
    id: 'blank', name: '空のラボ', desc: '何も置かれていないワークスペースです。下のパレットから機器を置いて自由に組み立てます。',
    build() { NL.loadLab(NL.newLab('新しいラボ')); }
  }
];
NL.scenario = id => NL.scenarios.find(s => s.id === id);
NL.LAB_PSK = PSK;
})(typeof window !== 'undefined' ? window : globalThis);
