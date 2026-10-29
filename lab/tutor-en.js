/* English text for the guided labs and the manual. tutor.js swaps these in when the UI language is English.
   Steps are listed in the same order as the Japanese labs in tutor.js. */
(function () {
'use strict';
const NL = window.NL;
NL.TUTOR_EN = {
  labs: {
    cisco: { title: 'First steps with Cisco IOS', desc: 'Walk through CLI modes, interface setup, connectivity checks and saving.', steps: [
      { t: 'Open the router CLI', b: '<p>Click <b>Router0</b> in the workspace and open the CLI tab. After the boot messages it asks <code>initial configuration dialog?</code>; type <code>no</code> and press Enter once more.</p><p>The <code>Router&gt;</code> prompt means you are in user EXEC mode.</p>' },
      { t: 'Enter privileged EXEC mode', b: '<p><code>enable</code> takes you to privileged EXEC mode (<code>Router#</code>). Abbreviations such as <code>en</code> also work. Press <code>?</code> to list the commands available right now.</p>' },
      { t: 'Enter global configuration mode', b: '<p><code>configure terminal</code> (short: <code>conf t</code>) enters <code>Router(config)#</code>. From here every change goes straight into the running configuration (running-config).</p>' },
      { t: 'Set the hostname to R1', b: '<p>Type <code>hostname R1</code>; the prompt changes to <code>R1(config)#</code> immediately.</p>' },
      { t: 'Give Gi0/0 an IP and enable it', b: '<p>Router ports start <b>shut down</b> (disabled). They pass no traffic until they have an IP address and you run <code>no shutdown</code>.</p><p>Enabling the port prints log messages such as <code>%LINK-5-CHANGED</code>.</p>' },
      { t: 'Configure the PCs', b: '<p>Click PC0 → Desktop → IP Configuration and enter the values below. Do the same for PC1.</p><table><tr><th></th><th>IP</th><th>Mask</th><th>GW</th></tr><tr><td>PC0</td><td>192.168.1.10</td><td>255.255.255.0</td><td>192.168.1.1</td></tr><tr><td>PC1</td><td>192.168.1.11</td><td>255.255.255.0</td><td>192.168.1.1</td></tr></table>' },
      { t: 'Ping the router from PC0', b: '<p>Run <code>ping 192.168.1.1</code> in PC0\'s Command Prompt. If the first one times out, that is ARP resolution, which happens on real gear too.</p><p>Switch to Simulation at the top before pinging to watch ARP and ICMP move one frame at a time.</p>' },
      { t: 'Check status with show commands', b: '<p>On the router, run <code>show ip interface brief</code> and <code>show running-config</code> to check configuration and status. From configuration mode, prefix them with <code>do</code>, as in <code>do show ip int br</code>.</p>' },
      { t: 'Set passwords', b: '<p>Set an <code>enable secret</code> for privileged mode and a console password. Log out with <code>exit</code> and confirm you are asked for the password.</p>' },
      { t: 'Save the configuration', b: '<p>The running-config disappears when power is lost. <code>copy running-config startup-config</code> (or <code>write memory</code>) saves it to the startup-config in NVRAM.</p><p>After saving, power-cycle the router from its Physical tab to confirm the settings survive.</p>' }
    ] },
    'diagram-cisco': { title: 'Diagram lab 1: Cisco side and internet access', desc: 'Configure GW, RT1, RT2, L2SW and RT-C from the CLI so the sites reach the internet (ISP). The internet side (ISP, Web, Kato Cloud) is already configured.', steps: [
      { t: 'GW basics and the ISP link', b: '<p>GW is a layer-3 switch (3560). Give the VLAN 1 SVI the GW-segment address, turn Gi0/1 into a routed port facing the ISP, and point the internet default route at the ISP (192.0.2.1).</p>' },
      { t: 'Ping the internet from GW', b: '<p>On GW run <code>ping 198.51.100.10</code> (the web server on the internet). If it succeeds, GW reaches the internet.</p>' },
      { t: 'RT1 interfaces', b: '<p>Gi0/0 faces Sokket M WAN1, Gi0/1 faces Sokket B WAN1 and Gi0/2 faces GW. Remember <code>no shutdown</code> on all three.</p>' },
      { t: 'RT1 NAT and default route', b: '<p>Translate the Sokket WAN addresses (192.168.x.x) to the GW-side address with PAT, and point the internet default route at GW. <b>Without a default route the Sokkets cannot reach the PoP on the internet, so no tunnel comes up.</b></p>' },
      { t: 'Same for RT2', b: '<p>RT2 uses Gi0/0 = 192.168.12.1 (Sokket M WAN2), Gi0/1 = 192.168.14.1 (Sokket B WAN2) and Gi0/2 = 203.0.113.195. NAT and the default route work the same way as on RT1.</p>' },
      { t: 'Ping the internet from RT1 and RT2', b: '<p>Run <code>ping 198.51.100.10</code> on each. A first <code>.</code> is ARP at work.</p>' },
      { t: 'L2SW VLANs and SVIs', b: '<p>Put Gi0/1-2 (to the Sokkets) in VLAN 10 and Fa0/1 (test PC#2) in VLAN 20. The L2SW routes VLAN 20 with its SVI and sends every other destination to the Sokket VIP (10.0.0.3).</p>' },
      { t: 'RT-C (site C) basics', b: '<p>Site C has no Sokket; router RT-C connects to Kato Cloud over IPsec instead. First set the internet and LAN addresses and the default route (IPsec comes in diagram lab 2).</p>' },
      { t: 'Configure the PCs', b: '<table><tr><th></th><th>IP / mask</th><th>GW</th></tr><tr><td>PC#0</td><td>203.0.113.197 / 255.255.255.192</td><td>203.0.113.193</td></tr><tr><td>PC#1</td><td>10.0.2.2 / 255.255.255.0</td><td>10.0.2.1</td></tr><tr><td>PC#2</td><td>10.0.1.10 / 255.255.255.0</td><td>10.0.1.1</td></tr><tr><td>PC#3</td><td>10.0.4.10 / 255.255.255.0</td><td>10.0.4.1</td></tr></table>' },
      { t: 'Save the configuration', b: '<p>Run <code>write memory</code> on GW, RT1, RT2, L2SW and RT-C.</p>' }
    ] },
    cato: { title: 'Diagram lab 2: First steps with Kato (Sokket, KMC, IPsec)', desc: 'Starts with the Cisco side configured. Sokket initial setup (admin, WAN) → tunnels → sites and networks in KMC → line redundancy → IPsec site → SDP → firewall → HA test.', steps: [
      { t: 'Get the big picture of Kato', b: '<p>A Sokket is the box you put at a site. From its WAN it builds an encrypted tunnel to a <b>PoP</b> (an entry point to Kato Cloud) on the internet. Most settings live in the cloud console, <b>KMC</b>; on the Sokket itself you mostly set up the WAN. Sites without a Sokket connect from a router to the PoP over IPsec.</p><p>In this lab the "Kato Cloud" node (198.51.100.20) plays the PoP. Kato, Sokket and KMC are fictional products made for learning.</p>' },
      { t: 'Connect a PC to Sokket M\'s MGMT port', b: '<p>Place a Laptop from the palette and connect its FastEthernet0 to <b>Sokket M\'s MGMT</b> port with an Auto cable. Set the laptop\'s IP configuration to <b>DHCP</b> (with no DHCP server it gets a 169.254.x.x address on its own).</p>' },
      { t: 'Register an administrator at https://169.254.100.1', b: '<p>On the laptop, open Desktop → Web Browser and go to <code>https://169.254.100.1</code>. The first visit shows the administrator registration page; register a username and a password (8+ characters with uppercase, lowercase and a digit).</p>' },
      { t: 'Give Sokket M static WAN IPs', b: '<p>In the local UI, open "WAN settings" and enter the values below. RT1 and RT2 run no DHCP server, so the addresses are static.</p><table><tr><th></th><th>IP / mask</th><th>GW</th></tr><tr><td>WAN1</td><td>192.168.11.2 / 255.255.255.252</td><td>192.168.11.1</td></tr><tr><td>WAN2</td><td>192.168.12.2 / 255.255.255.252</td><td>192.168.12.1</td></tr></table>' },
      { t: 'Initial setup of Sokket B and the site B Sokket', b: '<p>Register an administrator and set the WAN the same way (the Sokket\'s "Local web UI" tab is a fine shortcut).</p><table><tr><th>Sokket</th><th>WAN1</th><th>WAN2</th></tr><tr><td>Sokket B</td><td>192.168.13.2/30 gw .13.1</td><td>192.168.14.2/30 gw .14.1</td></tr><tr><td>Sokket 拠点B</td><td>203.0.113.196/26 gw .193</td><td>(unused)</td></tr></table>' },
      { t: 'Confirm the tunnels are up', b: '<p>After a few seconds the Sokkets build their tunnels to the PoP. Check the local UI dashboard, or Diagnostics → "Kato Cloud connection test". On RT1, <code>show ip nat translations</code> shows the Sokket\'s UDP 443 traffic translated to 203.0.113.194.</p>' },
      { t: 'Create site "拠点A" in KMC', b: '<p>Open "KMC console" at the top → Network → Sites → [New]. Use Site Name "拠点A" (site A), Connection Type "Sokket S160", turn on Enable WAN2, Native Range "10.0.0.0/28" and Local IP "10.0.0.3". The Local IP is the gateway LAN devices use; with HA it becomes the VIP.</p>' },
      { t: 'Assign the Sokkets and build HA', b: '<p>Open 拠点A and, under "Sokket" on the left, choose Sokket M as Primary, turn HA on and choose Sokket B\'s serial as Secondary, then save. Next, under "High Availability", enter each Sokket\'s own LAN IP.</p><table><tr><th>Primary LAN IP</th><td>10.0.0.1</td></tr><tr><th>Secondary LAN IP</th><td>10.0.0.2</td></tr></table><p>You are done when the HA status reads Ready.</p>' },
      { t: 'Link the site\'s networks (routed range)', b: '<p>10.0.1.0/24 sits behind the L2SW, so Kato does not know about it yet. Under 拠点A → "Networks", register it as a Routed range with the L2SW\'s VLAN 10 address (10.0.0.4) as the gateway.</p>' },
      { t: 'Create site "拠点B" and assign its Sokket', b: '<table><tr><th>Native Range</th><td>10.0.2.0/24</td></tr><tr><th>Local IP</th><td>10.0.2.1</td></tr><tr><th>Primary Sokket</th><td>Sokket 拠点B</td></tr></table>' },
      { t: 'Ping between sites', b: '<p>In PC#1\'s (site B) Command Prompt run <code>ping 10.0.0.4</code> (L2SW) and <code>ping 10.0.1.10</code> (PC#2). The KMC site list now shows 拠点A and 拠点B as Connected. In Simulation mode you can watch packets wrapped in the Kato tunnel and passing through the PoP.</p>' },
      { t: 'Set up and test line redundancy', b: '<p>Under 拠点A → "WAN / Link", set WAN1 to Active and WAN2 to Passive and save. Once Link State shows WAN1 "In use", cut the line: on RT1 run <code>interface g0/0</code> → <code>shutdown</code>. Within seconds Sokket M moves to WAN2 (through RT2) and the ping from PC#1 to PC#2 keeps working.</p>' },
      { t: 'Configure IPsec on router RT-C', b: '<p>Build an IKEv2 IPsec tunnel from RT-C to the PoP (198.51.100.20). Tunnel0 is a route-based VPN (VTI): traffic routed to Tunnel0 is encrypted. Use the same PSK as on the KMC side.</p>' },
      { t: 'Create IPsec site "拠点C" in KMC', b: '<p>Sites → [New]: set Connection Type to "IPsec IKEv2" and Native Range to 10.0.4.0/24. Open 拠点C, go to "IPsec", enter the values below and save. If even one value differs from the router, the tunnel stays down and Events shows the reason.</p><table><tr><th>Site Public IP</th><td>198.51.100.30 (RT-C\'s WAN)</td></tr><tr><th>Pre-Shared Key</th><td>Lab-Kato-PSK-2026</td></tr><tr><th>Encryption / Integrity / DH</th><td>AES-CBC-256 / SHA256 / 14</td></tr></table><p>You are done when <code>show crypto session</code> on RT-C reads UP-ACTIVE.</p>' },
      { t: 'Ping other sites from site C', b: '<p>In PC#3\'s Command Prompt run <code>ping 10.0.2.2</code> (PC#1). On RT-C, <code>show crypto ipsec sa</code> shows the encrypted and decrypted packet counters going up.</p>' },
      { t: 'Connect PC#0 as an SDP user', b: '<p>In KMC → Access → Users, check that user01@lab.local has an SDP license. On PC#0 open Desktop → "Kato Client" and connect with that email; it receives a client IP (10.0.3.x). Then try <code>ping 10.0.4.10</code> (PC#3) from PC#0.</p>' },
      { t: 'Restrict traffic with the WAN Firewall (through Publish)', b: '<p>In KMC → Security → WAN Firewall, disable the initial rule "All Sites ⇄ All Sites" and add a rule with [New]: Source "Site: 拠点B", Destination "Site: 拠点A", Service "ICMP", Allow. Nothing takes effect until you <b>Save → Publish</b>.</p><p>Confirm that PC#1 → PC#2 pings get through while PC#2 → PC#1 pings are blocked (Events records the block).</p>' },
      { t: 'Reach the internet', b: '<p>Open <code>http://198.51.100.10</code> in PC#1\'s Web Browser. Site B traffic reaches the PoP through the tunnel and leaves for the internet from there (the Internet Firewall is evaluated).</p>' },
      { t: 'HA failover test', b: '<p>Power off Sokket M from its Physical tab (or use [Test Failover] under High Availability in KMC). Within seconds Sokket B becomes Active and takes over the VIP 10.0.0.3. Confirm <code>ping 10.0.1.10</code> from PC#1 keeps working.</p>' }
    ] },
    vlan: { title: 'VLANs and router-on-a-stick', desc: 'Split VLANs on the switch and route between them with router subinterfaces.', steps: [
      { t: 'Create VLANs and assign ports', b: '<p>On Switch0 create VLANs 10 and 20, put Fa0/1-2 in VLAN 10 and Fa0/3-4 in VLAN 20.</p>' },
      { t: 'Make the router-facing port a trunk', b: '<p>Make Switch0\'s Gi0/1 a trunk. Check it with <code>show interfaces trunk</code>.</p>' },
      { t: 'Create subinterfaces', b: '<p>On Router0, enable Gi0/0 and create one subinterface per VLAN.</p>' },
      { t: 'Configure the PCs and ping between VLANs', b: '<p>PC-A 192.168.10.11 and PC-B 192.168.10.12 (GW .10.1); PC-C 192.168.20.11 and PC-D 192.168.20.12 (GW .20.1). From PC-A run <code>ping 192.168.20.11</code>.</p>' }
    ] },
    ospf: { title: 'Exchanging routes with OSPF', desc: 'Build OSPF area 0 on three routers and watch routes exchange and reroute around a failure.', steps: [
      { t: 'Address the interfaces', b: '<table><tr><th></th><th>Gi0/0</th><th>Gi0/1</th><th>Gi0/2</th></tr><tr><td>R1</td><td>10.1.12.1/30</td><td>10.1.13.1/30</td><td>192.168.1.1/24</td></tr><tr><td>R2</td><td>10.1.12.2/30</td><td>10.1.23.1/30</td><td>192.168.2.1/24</td></tr><tr><td>R3</td><td>10.1.13.2/30</td><td>10.1.23.2/30</td><td>—</td></tr></table><p>PC1 is 192.168.1.10 (GW .1.1) and PC2 is 192.168.2.10 (GW .2.1).</p>' },
      { t: 'Enable OSPF', b: '<p>On all three routers, start <code>router ospf 1</code> and declare the connected networks in area 0. A wildcard mask is the inverse of the subnet mask.</p>' },
      { t: 'Check the routing table', b: '<p>Use <code>show ip ospf neighbor</code> to confirm the neighbors are FULL, and <code>show ip route</code> to find routes marked <code>O</code>.</p>' },
      { t: 'Ping PC2 from PC1', b: '' },
      { t: 'Confirm rerouting around a failure', b: '<p>Shut down R1\'s Gi0/0 and ping again from PC1. Traffic now goes through R3. Use <code>tracert</code> to see the path change.</p>' }
    ] }
  },
  manual: {
    app: `
<p>As in Packet Tracer, you place devices, cable them, and click a device to work on it through its CLI or settings.</p>
<table>
<tr><th>Place a device</th><td>Click a device in the palette below, then click the workspace (drag and drop also works)</td></tr>
<tr><th>Cable</th><td>Pick a type under "Cable" → click device A and choose a port → click device B and choose a port</td></tr>
<tr><th>Open</th><td>With the Select tool, click a device. Cisco devices open the CLI, PCs open the Desktop, Sokkets open the local web UI</td></tr>
<tr><th>Move and view</th><td>Drag a device to move it. Drag empty space to scroll, use the wheel to zoom</td></tr>
<tr><th>Delete and undo</th><td>Click a device or cable with the Delete tool. Ctrl+Z (over the workspace) undoes</td></tr>
<tr><th>PDU</th><td>With the envelope tool, click the source and then the destination to send one ping; the result is listed at the bottom right</td></tr>
<tr><th>Inspect</th><td>With the magnifier tool, click a device to see its ARP, MAC, routing and NAT tables on the spot</td></tr>
</table>
<h4>Realtime and simulation</h4>
<p>In Realtime, Kato keepalives, DHCP retries and similar tasks run every 2 seconds. Switching to Simulation stops the clock and records every packet from then on in the event list. Play or step through to watch packets move, and click an event to inspect each layer.</p>
<h4>Cable types</h4>
<p>"Auto" works for any pair. "Straight" connects PCs and routers to switches; "Crossover" connects like devices (switch–switch, router–router, PC–router). With the wrong type the link stays red. "Console" connects a PC's RS232 to a Cisco device's Console port so you can use the CLI from the PC's Terminal.</p>
<h4>Saving</h4>
<p>Your lab is saved automatically in the browser. To keep a copy as a file, use File → "Export JSON" (and "Import JSON" to open it again).</p>`,
    ios: `
<h4>Modes</h4>
<table>
<tr><th>Prompt</th><th>Mode</th><th>Enter / leave</th></tr>
<tr><td><code>Router&gt;</code></td><td>User EXEC</td><td>Right after login. <code>enable</code> moves on</td></tr>
<tr><td><code>Router#</code></td><td>Privileged EXEC</td><td><code>configure terminal</code> to configure, <code>disable</code> to go back</td></tr>
<tr><td><code>Router(config)#</code></td><td>Global configuration</td><td><code>end</code> / Ctrl+Z back to privileged</td></tr>
<tr><td><code>Router(config-if)#</code></td><td>Interface configuration</td><td><code>interface g0/0</code> and so on. <code>exit</code> goes up one level</td></tr>
<tr><td><code>Router(config-router)#</code></td><td>Routing configuration</td><td><code>router ospf 1</code></td></tr>
<tr><td><code>Router(config-line)#</code></td><td>Line configuration</td><td><code>line console 0</code> / <code>line vty 0 4</code></td></tr>
</table>
<h4>Typing tips</h4>
<ul><li><code>?</code> lists available commands or the next value (<code>sh?</code> lists commands starting with sh; <code>show ?</code> lists what follows show).</li>
<li>Tab completes commands. Abbreviations like <code>conf t</code>, <code>int g0/0</code> and <code>sh ip int br</code> work.</li>
<li>Prefix a command with <code>no</code> to remove it. From configuration mode, run show commands as <code>do show …</code>.</li>
<li>A mistyped command in EXEC mode is treated as a hostname and you wait a few seconds for name resolution. <code>no ip domain-lookup</code> prevents that.</li></ul>
<h4>running-config and startup-config</h4>
<p>Changes apply immediately to the running-config (memory), which is lost at power-off. <code>copy running-config startup-config</code> saves it to the startup-config (NVRAM). <code>show startup-config</code> shows what is saved; <code>erase startup-config</code> plus <code>reload</code> resets the device.</p>
<h4>Useful show commands</h4>
<table>
<tr><td><code>show ip interface brief</code></td><td>Interface IPs and up/down at a glance</td></tr>
<tr><td><code>show running-config</code></td><td>Current configuration (add <code>| include</code> / <code>| section</code> to filter)</td></tr>
<tr><td><code>show ip route</code></td><td>Routing table</td></tr>
<tr><td><code>show vlan brief</code></td><td>VLANs and ports</td></tr>
<tr><td><code>show interfaces trunk</code></td><td>Trunks and allowed VLANs</td></tr>
<tr><td><code>show mac address-table</code></td><td>Learned MAC addresses</td></tr>
<tr><td><code>show ip nat translations</code></td><td>NAT table</td></tr>
<tr><td><code>show access-lists</code></td><td>ACLs and hit counts</td></tr>
<tr><td><code>show cdp neighbors</code></td><td>Neighboring Cisco devices</td></tr>
<tr><td><code>show spanning-tree</code></td><td>STP root and port roles</td></tr>
<tr><td><code>show ip ospf neighbor</code></td><td>OSPF adjacencies</td></tr>
<tr><td><code>show crypto session</code></td><td>IPsec tunnel status</td></tr>
</table>`,
    ios2: `
<h4>Interface</h4><pre>interface g0/0
 description to-RT1
 ip address 192.168.1.1 255.255.255.0
 no shutdown</pre>
<h4>VLANs and trunks (switch)</h4><pre>vlan 10
 name SALES
interface range fa0/1 - 12
 switchport mode access
 switchport access vlan 10
interface g0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20</pre>
<p>On a 3560, configure <code>switchport trunk encapsulation dot1q</code> before trunk mode.</p>
<h4>Static routes</h4><pre>ip route 10.0.0.0 255.255.255.0 192.168.1.2
ip route 10.0.0.0 255.255.255.0 192.168.2.2 250   ! floating (backup)
ip route 0.0.0.0 0.0.0.0 203.0.113.1              ! default</pre>
<h4>NAT (PAT)</h4><pre>interface g0/0
 ip nat inside
interface g0/2
 ip nat outside
ip access-list standard ACL-NAT-INSIDE
 permit 192.168.0.0 0.0.255.255
ip nat inside source list ACL-NAT-INSIDE interface g0/2 overload</pre>
<h4>DHCP server</h4><pre>ip dhcp excluded-address 192.168.1.1 192.168.1.9
ip dhcp pool LAN
 network 192.168.1.0 255.255.255.0
 default-router 192.168.1.1
 dns-server 8.8.8.8</pre>
<p>For clients on another segment, add <code>ip helper-address &lt;DHCP server&gt;</code> on their gateway interface.</p>
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
<p>From a PC\'s Command Prompt: <code>ssh -l admin 192.168.1.1</code>.</p>
<h4>OSPF</h4><pre>router ospf 1
 router-id 1.1.1.1
 network 10.1.0.0 0.0.255.255 area 0
 passive-interface g0/2</pre>`,
    kato: `
<div class="callout">Kato, Sokket, KMC (Kato Management Console) and Kato Client are <b>fictional products</b> made for learning SASE concepts. They are not related to any real company or product. Screens and terms are simplified examples for practicing general ideas.</div>
<p>SASE delivers networking and security from the cloud. Sites and users each connect through a tunnel to their nearest <b>PoP</b> (an entry point to Kato Cloud), and both site-to-site and internet traffic pass through the PoP.</p>
<table>
<tr><th>Sokket</th><td>The appliance at a site. Builds a tunnel from its WAN to the PoP and acts as the LAN gateway. On the box itself you mostly set the WAN and an administrator</td></tr>
<tr><th>KMC</th><td>The cloud console. Configure sites, network ranges, HA, line roles, users and firewalls</td></tr>
<tr><th>Site</th><td>One location. Sokkets are assigned by serial number; sites without a Sokket become IPsec sites</td></tr>
<tr><th>Native Range / Local IP</th><td>The segment the Sokket\'s LAN connects to, and the Sokket\'s address in it (the LAN devices\' gateway)</td></tr>
<tr><th>Routed range</th><td>Another segment behind the Native Range. Register it with its gateway (an L3 switch or similar)</td></tr>
<tr><th>SDP (Kato Client)</th><td>Client for remote PCs. Only users given an SDP license in KMC can connect</td></tr>
<tr><th>WAN Firewall</th><td>Traffic between sites and users. Only what you allow passes (default Block)</td></tr>
<tr><th>Internet Firewall</th><td>Traffic to the internet. Only what you block is stopped (default Allow)</td></tr>
</table>
<h4>Rollout in this lab</h4>
<ol><li>Prepare the upstream routers: the Sokket WAN segments, NAT and a default route to the internet</li>
<li>Sokket initial setup: connect a PC to the MGMT port, register an administrator at https://169.254.100.1, set the WAN</li>
<li>The Sokket reaches the PoP and its tunnel comes up</li>
<li>In KMC, create sites and assign Sokkets by serial. Set the Native Range, Local IP, routed ranges, HA and line roles</li>
<li>Tidy up the firewall rules, Publish them, and check connectivity</li></ol>`,
    sokket: `
<p>A Sokket has a local web UI for on-site work and troubleshooting. In this lab the MGMT port is fixed at <code>169.254.100.1/16</code>.</p>
<h4>Opening it</h4>
<ol><li>Connect a PC (laptop) to the Sokket\'s MGMT port with a cable</li>
<li>Set the PC\'s IP configuration to DHCP (with no DHCP server it gets a 169.254.x.x address on its own)</li>
<li>Browse to <code>https://169.254.100.1</code> from the PC</li></ol>
<p>The Sokket\'s "Local web UI" tab opens the same page (a practice shortcut).</p>
<h4>First visit: register an administrator</h4>
<p>The first visit shows the administrator registration page. Passwords need 8+ characters with uppercase, lowercase and a digit. Afterwards, log in with that account. Three failures in a row lock the page for 30 seconds.</p>
<h4>What is on each page</h4>
<table>
<tr><th>Dashboard</th><td>PoP connection, tunnel per WAN, WAN in use, site and HA status</td></tr>
<tr><th>WAN settings</th><td>WAN1 / WAN2 as DHCP or static. Static needs IP, mask, gateway and DNS</td></tr>
<tr><th>LAN & management ports</th><td>LAN addresses come from KMC, so they are read-only here. MGMT is fixed</td></tr>
<tr><th>DNS & time</th><td>DNS servers and the NTP server</td></tr>
<tr><th>Diagnostics</th><td>Ping from a WAN, and a Kato Cloud connection test that hints where things stop</td></tr>
<tr><th>Logs, Administrator, Maintenance</th><td>Activity log, password change, reboot, factory reset (type RESET)</td></tr>
</table>
<h4>When no tunnel comes up</h4>
<ol><li>WAN link and IP (dashboard)</li><li>Ping the upstream router (Diagnostics, to the WAN gateway)</li><li>The upstream router\'s NAT (<code>show ip nat translations</code>) and default route (<code>show ip route</code>)</li><li>Ping Kato Cloud (198.51.100.20)</li></ol>`,
    kmc: `
<p>NetLab\'s "KMC console" is the KMC Trainer console linked to the lab. Settings you make in KMC while it is <b>lab-linked</b> (sites, Sokket assignment, network ranges, HA, line roles, IPsec, users, WAN / Internet Firewall) are saved in the lab file and drive the simulator directly. KMC Trainer opened on its own still runs on its sample data.</p>
<table>
<tr><th>Network → Sites</th><td>Create sites. Connection Type chooses Sokket or IPsec</td></tr>
<tr><th>Site → Snapshot</th><td>Connection status, Link State (link, tunnel and in-use per WAN), recent events</td></tr>
<tr><th>Site → Sokket</th><td>Primary / Secondary serial assignment and HA on/off</td></tr>
<tr><th>Site → Networks</th><td>Native Range, Local IP, and adding or removing routed ranges</td></tr>
<tr><th>Site → WAN / Link</th><td>Role of WAN1 and WAN2 (Active / Passive / Last Resort) = line redundancy</td></tr>
<tr><th>Site → High Availability</th><td>Each Sokket\'s LAN IP, HA status, Test Failover</td></tr>
<tr><th>Site → IPsec</th><td>Public IP, PSK and ciphers of an IPsec site</td></tr>
<tr><th>Security → WAN / Internet Firewall</th><td>Takes effect in the lab only after Save → Publish. Rules that match on App/Category never match in the lab</td></tr>
</table>
<h4>Line redundancy (WAN roles)</h4>
<p>With several Active lines, WAN1 is preferred. When every Active line is down, Passive is used, and Last Resort comes last. A site with WAN2 disabled (Enable WAN2 off) never uses WAN2. Shut down RT1\'s Gi0/0 and Sokket M moves to WAN2.</p>
<h4>HA</h4>
<p>Two Sokkets share a LAN and the active one holds the VIP (Local IP). If the active Sokket loses power or all its WAN tunnels for about 6 seconds, the standby takes over. There is no automatic failback.</p>`,
    ipsec: `
<p>Sites that cannot host a Sokket, or that want to keep an existing router, connect from the router to the PoP over IPsec (IKEv2). Site C (RT-C) in this lab is an example. The router side is a <b>route-based VPN (VTI)</b>: traffic routed to Tunnel0 is encrypted and sent to the PoP.</p>
<h4>Router side (IOS)</h4><pre>crypto ikev2 proposal KATO-PROP
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
<h4>KMC side</h4>
<table><tr><th>Connection Type</th><td>IPsec IKEv2</td></tr><tr><th>Native Range</th><td>The site LAN (e.g. 10.0.4.0/24)</td></tr><tr><th>Site Public IP</th><td>The public IP of the router\'s WAN (the source the PoP sees)</td></tr><tr><th>Pre-Shared Key</th><td>Same value as the router keyring</td></tr><tr><th>Encryption / Integrity / DH</th><td>Match the router\'s proposal and transform set</td></tr></table>
<h4>Checking and troubleshooting</h4>
<table>
<tr><td><code>show crypto session</code></td><td>UP-ACTIVE means established; DOWN also shows a reason</td></tr>
<tr><td><code>show crypto ikev2 sa</code></td><td>The IKE SA and the negotiated ciphers</td></tr>
<tr><td><code>show crypto ipsec sa</code></td><td>Encrypted and decrypted packet counts</td></tr>
<tr><td><code>show ip interface brief</code></td><td>Whether Tunnel0\'s protocol is up</td></tr>
</table>
<p>If it does not come up, check Events in KMC. It gives reasons such as "authentication failed (PSK mismatch)", "no matching IKE proposal" or "unregistered source (wrong Public IP)".</p>`,
    'cato-flow': `
<p>When PC#1 (site B, 10.0.2.2) pings PC#2 (site A, VLAN 20, 10.0.1.10):</p>
<ol><li>PC#1 → gateway 10.0.2.1 (the site B Sokket)</li>
<li>The Sokket sees the destination is not local, wraps the packet in its tunnel (UDP 443) and sends it via GW → ISP to the PoP 198.51.100.20</li>
<li>The PoP matches 10.0.1.10 to site A\'s routed range and evaluates the WAN Firewall</li>
<li>The PoP sends it to the tunnel of site A\'s active Sokket, addressed to RT1\'s NATed address 203.0.113.194:port</li>
<li>RT1 reverses the NAT and forwards it to 192.168.11.2 (Sokket M WAN1)</li>
<li>Sokket M unwraps it and forwards it to the routed range gateway 10.0.0.4 (L2SW), which routes it into VLAN 20</li></ol>
<p>Traffic for site C (IPsec) leaves the PoP as ESP (UDP 4500) to RT-C, which receives it on Tunnel0 and forwards it to its LAN. Internet traffic is checked by the Internet Firewall, translated to the PoP\'s address and sent to the internet.</p>
<p>Send a ping in Simulation mode to follow this flow one event at a time. Click a Kato or IPsec row to see what is inside the tunnel (the original ICMP).</p>`,
    limits: `
<h4>Cisco features covered</h4>
<p>Modes and prompts, ? help, Tab completion, abbreviations, <code>no</code> and <code>do</code>, <code>| include / exclude / begin / section</code>, error markers, running/startup-config and reload, interfaces, subinterfaces, SVIs, loopbacks and tunnels, VLANs, trunks and STP, static routes (including name and floating routes), OSPF, NAT, ACLs, DHCP, CDP, Telnet/SSH, IPsec (IKEv2, VTI, PSK), ping/traceroute and the main show commands.</p>
<h4>Not supported yet</h4>
<p>EIGRP, RIP and BGP, IPv6, EtherChannel, HSRP/VRRP, IKEv1 and crypto-map IPsec, certificate authentication, port security, QoS and debug. Unsupported commands return <code>% Invalid input detected</code>.</p>
<h4>Kato features covered</h4>
<p>Sokket administrator registration, WAN settings and diagnostics, tunnels to the PoP (through NAT), sites, Native Range and routed ranges, Sokket assignment, HA (VIP and failover), line redundancy (Active / Passive / Last Resort), IPsec sites (IKEv2), SDP users and Kato Client, WAN / Internet Firewall (effective after Publish), and events.</p>
<p>Application identification, IPS, DLP, bandwidth control and routing between multiple PoPs exist only as sample screens in KMC and do not affect lab traffic.</p>`
  }
};
})();
