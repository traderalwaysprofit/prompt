"use strict";
const $ = s => document.querySelector(s);
const pick = a => a[Math.floor(Math.random()*a.length)];
const rnd  = (a,b) => a + Math.random()*(b-a);
const rndi = (a,b) => Math.floor(rnd(a,b+1));
const fmtRp = n => "Rp " + n.toLocaleString("id-ID");

/* ---------- ikon SVG inline ---------- */
const P = {
  monitor:'<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M9 20h6M12 16v4"/>',
  cctv:'<path d="M3 7l13-4 1.6 5.2L4.6 12.2z"/><path d="M6.8 12.5l1 3.5a3 3 0 005.8-1.6l-.5-1.7"/><path d="M17.7 5.5L21 4"/>',
  finger:'<path d="M12 11.5a2.5 2.5 0 012.5 2.5c0 2.3-.4 4.3-1.3 6"/><path d="M9.5 14a2.5 2.5 0 012.5-2.5"/><path d="M7 14a5 5 0 018.6-3.5"/><path d="M4.5 13.5A7.5 7.5 0 0112 6"/><path d="M12 20.5c-.5 0-1-.5-1-1.5"/>',
  wifi:'<rect x="3" y="14" width="18" height="6.5" rx="1.2"/><path d="M7 17.2h.01M10.5 17.2h.01"/><path d="M8 14V7.5M16 14V7.5"/><path d="M5.5 7.5a9 9 0 0113 0"/>',
  printer:'<path d="M7 8V3.5h10V8"/><rect x="4" y="8" width="16" height="8" rx="1.2"/><rect x="7.5" y="13" width="9" height="7.5"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  bug:'<circle cx="12" cy="13.5" r="5"/><path d="M12 8.5V6M8.6 10L6 7.5M15.4 10L18 7.5M7 13.5H3.5M20.5 13.5H17M8.6 17l-2.6 2.5M15.4 17l2.6 2.5"/>',
  download:'<path d="M12 3v10M8 9.5l4 4 4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>',
  remote:'<rect x="2.5" y="3.5" width="19" height="13" rx="1.5"/><path d="M9 20.5h6M12 16.5v4"/><path d="M10.5 7.5l4.5 4-2.3.6 1.3 2.6-1.4.7-1.3-2.6-1.8 1.7z" fill="currentColor" stroke="none"/>',
  power:'<path d="M12 3v8"/><path d="M6.3 6.5a8 8 0 1011.4 0"/>',
  coins:'<circle cx="8.5" cy="8.5" r="5.5"/><path d="M14.5 7a5.5 5.5 0 11-7 7"/>',
  star:'<path d="M12 2.5l3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.8l-6 3.2 1.2-6.7L2.3 9.6l6.7-1z"/>',
  wrench:'<path d="M14.7 6.3a1 1 0 001.4 0l3.8-3.8a6 6 0 01-8 8l-6.9 6.9a2.1 2.1 0 003 3l6.9-6.9a6 6 0 008-8l-3.8 3.8a1 1 0 00-1.4 0z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>'
};
const ic = (n,s=16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n]||''}</svg>`;

/* ---------- audio (WebAudio, tanpa aset) ---------- */
let AC=null;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(f,dur=.08,type="square",vol=.05,delay=0){
  if(state.mute) return;
  const c=ac(); if(!c) return;
  try{
    const o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(vol,c.currentTime+delay);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime+delay); o.stop(c.currentTime+delay+dur+.02);
  }catch(e){}
}
const sfx={
  click:()=>tone(760,.04,"square",.03),
  snap:()=>{tone(520,.06,"square",.06);tone(880,.08,"square",.05,.05);},
  ring:()=>{tone(1180,.09,"triangle",.06);tone(1180,.09,"triangle",.06,.16);},
  ok:()=>{[660,830,990].forEach((f,i)=>tone(f,.12,"triangle",.06,i*.09));},
  bad:()=>{tone(220,.16,"sawtooth",.06);tone(160,.22,"sawtooth",.06,.1);},
  stamp:()=>tone(140,.09,"square",.07),
  power:()=>{tone(180,.25,"triangle",.06);tone(540,.2,"triangle",.05,.18);}
};

/* ---------- data ---------- */
const PEOPLE=[
  ["Bu Sari","Keuangan"],["Pak Budi","HRD"],["Andi","Gudang"],["Rina","Marketing"],
  ["Pak Dedi","Operasional"],["Sinta","Customer Care"],["Mas Joko","Security"],["Bu Ratna","Purchasing"],
  ["Dewi","Legal"],["Ferdi","Sales"]
];
const PRIO=["RENDAH","SEDANG","TINGGI"];
const SLA_BY_PRIO=[320,230,150];
const PRIO_MULT=[0.8,1,1.5];

const TYPES={
  pc:     {label:"Setup PC",           icon:"monitor", base:40,
           notes:["PC baru tiba dari vendor, belum disetel sama sekali.",
                  "PC dipindah meja oleh petugas mover, semua kabelnya jadi lepas.",
                  "Unit kerja baru untuk karyawan kontrak, tolong disiapkan hari ini."]},
  cctv:   {label:"Setup CCTV",         icon:"cctv", base:55,
           notes:["Kamera gudang belum menyala, arahkan supaya memantau titik penting.",
                  "Bos minta area kasir & pintu terpantau. Atur sudut kameranya.",
                  "Dua kamera baru terpasang tapi belum diarahkan ke target."]},
  absen:  {label:"Setup Mesin Absensi",icon:"finger", base:50,
           notes:["Mesin absen baru datang, karyawan belum bisa absen sama sekali.",
                  "Ganti mesin absen lama yang rusak. Jangan sampai absen manual lagi."]},
  router: {label:"Setup Router",       icon:"wifi", base:60,
           notes:["WiFi kantor sering putus-putus, minta dikonfigurasi ulang dari nol.",
                  "Router baru terpasang, belum disetel. Kredensial internet ada di memo."]},
  printer:{label:"Setup Printer",      icon:"printer", base:45,
           notes:["Printer baru belum ada driver-nya, tolong dipasang.",
                  "Printer faktur diganti unit baru, siapkan sampai bisa tes cetak."]},
  hw:     {label:"Troubleshoot Hardware",icon:"cpu", base:65,
           notes:["PC rusak, gejalanya aneh sekali. Diagnosa dulu sebelum tindakan.",
                  "Komputer meja kerja bermasalah, katanya bukan software-nya."]},
  sw:     {label:"Troubleshoot Software",icon:"bug", base:55,
           notes:["Ada masalah di software, layar menampilkan error. Solusinya harus tepat.",
                  "PC-nya error terus, klien sudah panik. Pilih penanganan yang benar."]},
  install:{label:"Instalasi Software", icon:"download", base:50,
           notes:["Instal aplikasi di PC klien. CATATAN: jangan ikut menginstal penawaran tambahan apa pun!"]},
  remote: {label:"Remote Desktop",     icon:"remote", base:70,
           notes:["PC klien jauh di lantai dua dan dia sedang rapat. Tangani lewat remote saja."]}
};

const PRINTER_MODELS=["Epson L3210","Canon G2010","HP LaserJet P1102","Brother DCP-T520W"];
const PAPERS=["A4","F4"];
const APPS=[
  {name:"OfficeSuite 2021",ver:"21.0.4"},{name:"AkuntanKu Pro",ver:"8.2"},
  {name:"DesignStd 7",ver:"7.1.2"},{name:"BrowserKantor",ver:"112.0"}
];
const BUNDLES=[
  ["SearchHelper Toolbar","mempercepat pencarian (kata mereka)"],
  ["SuperClean Pro 2010","'membersihkan' registry sejak 2010"],
  ["WeatherBlaster","cuaca kota lain, wajib punya"],
  ["PDFReaderPlus","versi plus-nya plus"]
];
const HW_CASES=[
  {sym:"Saat dinyalakan, speaker bunyi <b>beep panjang 3 kali</b>. Lampu kipas menyala, tapi layar tidak muncul apa-apa.",
   culprit:"RAM", finding:"<b>RAM:</b> kaki RAM berdebu dan seating-nya longgar. Gejala beep 3x = RAM tidak terdeteksi.",
   acts:[["Cabut, bersihkan kaki, pasang kembali (reseat)",true],["Ganti thermal paste processor",false],["Format ulang Windows",false]]},
  {sym:"Tombol power ditekan, <b>tidak ada lampu sama sekali</b>, kipas tidak berputar. Seperti tidak ada listrik.",
   culprit:"PSU", finding:"<b>PSU:</b> output 12V tidak keluar saat diukur. Unit power supply mati total.",
   acts:[["Ganti unit PSU",true],["Instal ulang driver chipset",false],["Bersihkan kipas processor",false]]},
  {sym:"PC <b>mati sendiri setelah 10–15 menit dipakai</b>, terutama saat cuaca panas. Casing terasa hangat sekali.",
   culprit:"KIPAS", finding:"<b>Pendingin:</b> kipas processor tersendat debu tebal dan suhu mencapai 95°C sebelum shutdown.",
   acts:[["Bersihkan kipas & ganti thermal paste",true],["Tambah RAM 8GB",false],["Matikan antivirus agar tidak berat",false]]},
  {sym:"Layar biru muncul <b>saat menyalin file besar</b>, dan ada suara <b>'klik klik klik'</b> dari dalam casing.",
   culprit:"HDD", finding:"<b>HDD:</b> bad sector bertambah dan suara klik = kepala baca mulai rusak.",
   acts:[["Backup data & ganti harddisk",true],["Defragment harddisk",false],["Ganti kabel monitor",false]]},
  {sym:"Tampilan layar <b>bergaris dan penuh artefak warna</b>, kadang crash saat buka aplikasi desain.",
   culprit:"GPU", finding:"<b>GPU:</b> kartu grafis overheat, kipasnya macet. Artefak = VGA mulai rusak.",
   acts:[["Bersihkan kipas VGA / ganti kartu",true],["Tambah RAM 16GB",false],["Ganti keyboard & mouse",false]]}
];
const SW_CASES=[
  {bsod:true, code:"CRITICAL_PROCESS_DIED", txt:"Komputer klien menampilkan layar biru berulang setelah update Windows semalam.",
   ch:[["Instal ulang Windows dari awal (2 hari kerja)",false,"Instal ulang selesai… masalahnya tetap muncul. Waktu terbuang."],
       ["Boot Safe Mode, uninstall update terbaru",true,"Update bermasalah dicopot. Sistem kembali normal."],
       ["Ganti RAM karena curiga RAM rusak",false,"RAM diganti… layar biru masih muncul. Bukan RAM."]]},
  {bsod:false, code:"Situs lambat dibuka", txt:"Internet 'lambat' padahal speedtest lancar — hanya situs tertentu yang gagal, termasuk login sistem kantor.",
   ch:[["Ganti DNS ke 8.8.8.8 / 1.1.1.1",true,"DNS lama ISP bermasalah. Setelah diganti, semua situs terbuka."],
       ["Beli dan pasang router baru",false,"Router baru terpasang mahal… masalahnya sama saja. Bukan router."],
       ["Instal ulang driver LAN",false,"Driver dipasang ulang, hasilnya nihil. Bukan drivernya."]]},
  {bsod:false, code:"Aplikasi crash saat dibuka", txt:"Aplikasi 'AkuntanKu' selalu crash 3 detik setelah dibuka. Sudah dicoba restart berkali-kali.",
   ch:[["Bersihkan cache aplikasi lalu instal ulang",true,"Cache korup dibersihkan, aplikasi dipasang ulang. Berjalan normal."],
       ["Ganti monitor saja, siapa tahu",false,"Monitor baru terpasang. Aplikasi tetap crash. Tentu saja."],
       ["Matikan antivirus secara permanen",false,"Antivirus dimatikan… aplikasi tetap crash, dan sekarang rawan virus."]]},
  {bsod:false, code:"Update stuck 30%", txt:"Windows Update mentok di 30% selama 4 jam. Klien sudah menekan tombol power sembarangan 2 kali.",
   ch:[["Restart service Windows Update & bersihkan cache update",true,"Service di-reset, cache korup dihapus. Update jalan sampai selesai."],
       ["Paksa matikan berkali-kali sampai kebetulan berhasil",false,"Percobaan paksa ke-3… kini ada perbaikan disk berjalan. Bagus."],
       ["Nonaktifkan update Windows selamanya",false,"Update dimatikan. Besok ada tiket baru: 'kenapa kena virus?'"]]},
  {bsod:false, code:"Popup iklan terus-menerus", txt:"Setiap buka browser, popup iklan muncul di layar bahkan saat browser ditutup.",
   ch:[["Scan malware & reset pengaturan browser",true,"Adware ditemukan di ekstensi palsu dan dibersihkan. Popup hilang."],
       ["Ganti keyboard, mungkin tombolnya nyangkut",false,"Keyboard diganti… popup tetap muncul. Bukan keyboard."],
       ["Matikan firewall supaya tidak 'bentrok'",false,"Firewall dimatikan. Popup bertambah 3 kali lipat."]]}
];
const REMOTE_MAL={
  junk:["skripsi_gratis_FINAL(1).exe","crack_activator_99.exe","setup_player_terbaru.exe","hadiah_undian.exe"],
  good:["LAPORAN-MEI.xlsx","foto_rapat_2024.zip","absensi_rekap.pdf"]
};
const REMOTE_PROC=[
  {n:"cloud_miner_x.exe",cpu:"98%",mem:"412 MB",junk:true},
  {n:"notavirus_sus_banget.exe",cpu:"47%",mem:"188 MB",junk:true},
  {n:"chrome.exe",cpu:"12%",mem:"1,2 GB",neutral:true},
  {n:"explorer.exe",cpu:"2%",mem:"86 MB",neutral:true},
  {n:"csrss.exe",cpu:"0.3%",mem:"4 MB",sys:true},
  {n:"winlogon.exe",cpu:"0.1%",mem:"6 MB",sys:true},
  {n:"svchost.exe",cpu:"1%",mem:"22 MB",sys:true}
];

/* ---------- state ---------- */
const START_MIN=540, END_MIN=1050, MIN_PER_TICK=7;
const state={
  phase:"start", day:1, timeMin:START_MIN, money:0, rep:50, level:1, xp:0,
  career:0, mute:false, tickets:[], active:null, seq:41,
  spawnPlan:[], doneToday:0, lateToday:0, overtime:false, ending:false,
  catCount:{}
};
let tickTimer=null;
let best={money:0,day:0};

function ticketEventPayload(t){
  return t ? { id:t.id, type:t.type, dept:t.dept, prio:t.prio, status:t.status } : null;
}
function emitMejaEvent(name,detail={}){
  document.dispatchEvent(new CustomEvent(`mejait:${name}`,{detail}));
}
try{ best=JSON.parse(localStorage.getItem("mejait_best"))||best; }catch(e){}
function saveBest(){
  if(state.money>best.money||state.day>best.day){
    best={money:Math.max(best.money,state.money),day:Math.max(best.day,state.day)};
    try{localStorage.setItem("mejait_best",JSON.stringify(best));}catch(e){}
  }
}

/* ---------- toast & log ---------- */
function toast(msg,type="ok"){
  const d=document.createElement("div");
  d.className="toast "+type; d.innerHTML=msg;
  $("#toasts").appendChild(d);
  setTimeout(()=>{d.style.opacity="0";d.style.transition="opacity .4s";setTimeout(()=>d.remove(),400);},3400);
}
function logLine(msg,cls="info"){
  const feed=$("#logFeed"); if(!feed) return;
  const h=Math.floor(state.timeMin/60), m=state.timeMin%60;
  const p=document.createElement("p");
  p.innerHTML=`<span class="t">${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}</span><span class="${cls}">${msg}</span>`;
  feed.prepend(p);
  while(feed.children.length>40) feed.lastChild.remove();
}

/* ---------- tiket ---------- */
function makeTicket(type,prio){
  const T=TYPES[type], [nm,dept]=pick(PEOPLE);
  const t={ id:"TKT-"+String(state.seq++).padStart(4,"0"), type, prio,
    from:nm, dept, note:pick(T.notes), status:"open", gone:false,
    sla:SLA_BY_PRIO[prio], slaLeft:SLA_BY_PRIO[prio], detail:{} };
  switch(type){
    case "router":
      t.detail={ssid:"KANTOR-"+pick(["LT1","LT2","GUDANG","HRD"]),user:"itkantor",pass:"internet2024"};
      t.note+=" Beri nama WiFi sesuai memo."; break;
    case "printer":
      t.detail={model:pick(PRINTER_MODELS),paper:pick(PAPERS)};
      t.note+=` Untuk cetak ${t.detail.paper==="F4"?"faktur ukuran F4":"dokumen ukuran A4"}.`; break;
    case "absen":{
      const j=pick([7,8,9]); t.detail={in:j,out:j+9};
      t.note+=` Shift karyawan: masuk ${String(j).padStart(2,"0")}:00, pulang ${String(j+9).padStart(2,"0")}:00.`; break;}
    case "hw": t.detail.caseIdx=rndi(0,HW_CASES.length-1); break;
    case "sw": t.detail.caseIdx=rndi(0,SW_CASES.length-1); break;
    case "install":
      t.detail.app=pick(APPS);
      let b1=pick(BUNDLES), b2=pick(BUNDLES);
      while(b2===b1) b2=pick(BUNDLES);
      t.detail.bundles=[b1,b2]; break;
    case "remote": t.detail.scen=pick(["mal","proc"]); break;
  }
  return t;
}
function memoFor(t){
  const T=TYPES[t.type];
  const row=(k,v)=>`<div class="row">${k}: <b>${v}</b></div>`;
  let tech="";
  switch(t.type){
    case "router":
      tech=row("Koneksi WAN","PPPoE")+row("PPPoE user",t.detail.user)+row("PPPoE pass",t.detail.pass)+row("SSID wajib",t.detail.ssid);
      break;
    case "printer":
      tech=row("Model printer",t.detail.model)+row("Ukuran kertas",t.detail.paper);
      break;
    case "absen":
      tech=row("Jam masuk",String(t.detail.in).padStart(2,"0")+":00")+row("Jam pulang",String(t.detail.out).padStart(2,"0")+":00");
      break;
    case "install":
      tech=row("Aplikasi",t.detail.app.name+" v"+t.detail.app.ver)+row("Larangan","JANGAN instal penawaran tambahan");
      break;
    case "remote":
      tech=row("Target",t.detail.scen==="mal"?"Bersihkan file jahat di folder Downloads, lalu full scan":"Akhiri proses asing yang memakan CPU, jangan sentuh proses sistem");
      break;
    case "hw":
      tech=row("Gejala utama","Lihat panel diagnosa →")+row("Metode","Periksa komponen yang tepat, lalu tindakan yang tepat");
      break;
    case "sw":
      tech=row("Kode error","“"+SW_CASES[t.detail.caseIdx].code+"”")+row("Metode","Pilih solusi yang benar, solusi salah memakan waktu");
      break;
    default: tech=row("Catatan","Ikuti instruksi di panel kerja");
  }
  return `
    <h4>MEMO KLIEN</h4>
    <div class="memo-card">
      <div class="mc-head"><span>#${t.id}</span><span>${PRIO[t.prio]}</span></div>
      <div class="mc-cat">${ic(T.icon,15)} ${T.label}</div>
      <div class="mc-from">${t.from} — Dept. ${t.dept}</div>
      <div class="mc-note">“${t.note}”</div>
    </div>
    <div class="tech">${tech}</div>
    <div class="wf-hint">SLA tiket ini <b style="color:var(--green)">dibekukan</b> selagi kamu mengerjakannya,
    tapi tiket lain tetap berjalan. Kerjakan cepat &amp; tepat.</div>`;
}

/* ---------- render ---------- */
function elapsedMin(){ return state.timeMin-START_MIN; }
function fmtClock(m){ return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }
function fmtSla(s){ s=Math.max(0,s); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }

function renderHUD(){
  $("#hudClock").textContent=fmtClock(state.timeMin);
  $("#bigClock").innerHTML=Math.floor(state.timeMin/60)+"<small>:"+String(state.timeMin%60).padStart(2,"0")+"</small>";
  $("#hudDay").textContent="HARI "+String(state.day).padStart(2,"0");
  $("#dayLine").textContent="HARI "+String(state.day).padStart(2,"0")+" — JAM KERJA 09:00–17:30";
  $("#hudMoney").innerHTML=ic("coins",15)+" <b>"+fmtRp(state.money)+"</b>";
  $("#hudRep").innerHTML=ic("star",15)+" <b>"+state.rep+"</b>/100";
  $("#sideMoney").textContent=fmtRp(state.money);
  $("#lvChip").textContent="LV "+state.level;
  $("#repTxt").textContent=state.rep+"/100";
  $("#repMeter").querySelector("i").style.width=state.rep+"%";
  $("#repMeter").classList.toggle("low",state.rep<25);
  $("#xpTxt").textContent=state.xp+"/"+(state.level*100);
  const xb=$("#xpBar");
  if(xb) xb.style.width=Math.min(100,state.xp/(state.level*100)*100)+"%";
  $("#stDone").textContent=state.doneToday;
  $("#stLate").textContent=state.lateToday;
  $("#stCareer").textContent=state.career;
}
function renderCounters(){
  const open=state.tickets.filter(t=>t.status==="open").length;
  const act=state.tickets.filter(t=>t.status==="active").length;
  const done=state.tickets.filter(t=>t.status==="done").length;
  const late=state.tickets.filter(t=>t.status==="late"||t.status==="failed").length;
  $("#ledger").innerHTML=
    `<span>TERBUKA <b class="lc-open">${open}</b></span><span>DIPROSES <b class="lc-act">${act}</b></span>`+
    `<span>SELESAI <b class="lc-done">${done}</b></span><span>TELAT <b class="lc-late">${late}</b></span>`;
  $("#qCount").textContent=state.tickets.filter(t=>!t.gone&&t.status!=="done").length;
  $("#catBars").innerHTML=Object.keys(TYPES).map(k=>{
    const n=state.catCount[k]||0;
    return `<div class="row">${ic(TYPES[k].icon,13)}<span class="lbl">${TYPES[k].label}</span>`+
           `<span class="bar"><i style="width:${Math.min(100,n*25)}%"></i></span><b>${n}</b></div>`;
  }).join("");
}
function ticketHTML(t){
  const T=TYPES[t.type];
  const pct=Math.max(0,t.slaLeft/t.sla*100);
  const cls=pct<20?"crit":pct<50?"warn":"";
  return `
  <div class="ticket p${t.prio}" data-id="${t.id}">
    <div class="tk-head"><span>#${t.id}</span><span class="prio-tag">${PRIO[t.prio]}</span></div>
    <div class="tk-cat">${ic(T.icon,17)} ${T.label}</div>
    <div class="tk-from">${t.from} — Dept. ${t.dept}</div>
    <div class="tk-note">“${t.note}”</div>
    <div class="tk-sla"><span style="font-size:9.5px;letter-spacing:.12em">SLA</span>
      <span class="bar"><i class="${cls}" style="width:${pct}%"></i></span>
      <time>${fmtSla(t.slaLeft)}</time></div>
    ${t.status==="open"?`<button class="tk-go">KERJAKAN ▸</button>`:""}
    ${t.status==="late"?`<div class="stamp">Terlambat</div>`:""}
  </div>`;
}
function renderTickets(){
  const list=$("#queueList");
  const vis=state.tickets.filter(t=>!t.gone&&t.status!=="done"&&t.status!=="failed");
  list.innerHTML=vis.length?vis.map(ticketHTML).join(""):
    `<div class="queue-empty">${state.overtime?"Semua tiket tertangani.<br>Segera tutup kas!":"Tidak ada tiket.<br>Nikmati kopimu sekarang."}</div>`;
  list.querySelectorAll(".tk-go").forEach(b=>{
    b.onclick=()=>{ sfx.click(); openWork(b.closest(".ticket").dataset.id); };
  });
}
function updateSlaBars(){
  state.tickets.forEach(t=>{
    if(t.status!=="open") return;
    const el=document.querySelector(`.ticket[data-id="${t.id}"]`); if(!el) return;
    const pct=Math.max(0,t.slaLeft/t.sla*100);
    const bar=el.querySelector(".bar i");
    bar.style.width=pct+"%";
    bar.className=pct<20?"crit":pct<50?"warn":"";
    el.querySelector("time").textContent=fmtSla(t.slaLeft);
  });
}

/* ---------- loop utama ---------- */
function spawnTicket(){
  const t=makeTicket(pick(Object.keys(TYPES)),weightedPrio());
  state.tickets.push(t);
  emitMejaEvent("ticket-spawned",ticketEventPayload(t));
  sfx.ring();
  logLine(`Tiket masuk <b>#${t.id}</b> — ${TYPES[t.type].label} (${PRIO[t.prio]})`,"warn");
  renderTickets(); renderCounters();
}
function tick(){
  if(state.phase!=="work") return;
  state.timeMin+=MIN_PER_TICK;
  while(state.spawnPlan.length && state.spawnPlan[0]<=elapsedMin() && state.timeMin<END_MIN){
    state.spawnPlan.shift();
    spawnTicket();
  }
  state.tickets.forEach(t=>{ if(t.status==="open"){ t.slaLeft--; if(t.slaLeft<=0) markLate(t); } });
  renderHUD(); updateSlaBars();
  if(state.timeMin>=END_MIN){
    if(state.active && !state.overtime){
      state.overtime=true;
      $("#otBadge").classList.remove("hidden");
      toast("<b>LEMBUR!</b> Jam kerja habis tapi kamu masih mengerjakan tiket. Selesaikan!","warn");
      logLine("MELEBIHI JAM KERJA — mode lembur aktif","warn");
    } else if(!state.active && !state.ending){
      endDay();
    }
  }
}
function weightedPrio(){
  const r=Math.random();
  if(r<0.22+state.level*0.02) return 2;
  if(r<0.62) return 1;
  return 0;
}

/* ---------- telat / gagal / progres ---------- */
function markLate(t){
  t.status="late"; t.slaLeft=0;
  sfx.bad();
  addRep(-5); state.lateToday++;
  logLine(`SLA HABIS — tiket #${t.id} terlambat! Reputasi −5`,"bad");
  toast(`Tiket <b>#${t.id}</b> terlambat! Klien komplain ke Bos.`,"bad");
  renderTickets(); renderCounters(); renderHUD();
  setTimeout(()=>{ t.gone=true; if(state.phase!=="over"){renderTickets();renderCounters();} },5200);
  if(state.rep<=0) gameOver();
}
function addRep(n){
  state.rep=Math.max(0,Math.min(100,state.rep+n));
  if(state.rep<=0) gameOver();
}
function addXp(n){
  state.xp+=n;
  while(state.xp>=state.level*100){
    state.xp-=state.level*100; state.level++;
    sfx.ok();
    toast(`<b>NAIK LEVEL → LV ${state.level}!</b> Tiket lebih banyak &amp; bayaran lebih besar.`);
    logLine("PROMOSI — Level "+state.level+". Gaji naik, beban kerja juga.","ok");
  }
}

/* ================================================================
   MESIN MINIGAME — ctx: {done(success,opt), pen(sec,msg), cleanup(fn)}
   ================================================================ */
function makeCtx(t){
  const ctx={ t, _done:false, _clean:[],
    cleanup(fn){ this._clean.push(fn); },
    pen(sec,msg){
      t.slaLeft=Math.max(1,t.slaLeft-sec);
      if(msg) toast(msg,"warn"); sfx.bad();
    },
    done(success=true,opt={}){
      if(ctx._done) return; ctx._done=true;
      ctx._clean.forEach(f=>{try{f()}catch(e){}});
      resolveTicket(t,success,opt);
    }};
  return ctx;
}
const BUILD={};

/* ---------------- 1) SETUP PC ---------------- */
BUILD.pc=function(stage,ctx){
  const CABLES=[
    {id:"power",label:"Kabel Power",color:"#222"},
    {id:"hdmi", label:"Kabel HDMI", color:"#333"},
    {id:"lan",  label:"Kabel LAN (RJ45)",color:"#c9a13b"},
    {id:"usb",  label:"Kabel Keyboard (USB)",color:"#444"},
    {id:"audio",label:"Kabel Audio",color:"#4a7c3f"}
  ];
  stage.innerHTML=`
    <div class="mg-title">Pasang Kabel PC</div>
    <div class="mg-sub">Seret kabel dari rak ke port yang benar di belakang CPU. Kabel salah port akan ditolak.</div>
    <div class="pc-wrap">
      <div class="pc-stage" id="pcStage">
        <svg viewBox="0 0 330 370">
          <rect x="60" y="8" width="250" height="354" fill="#1c2113" stroke="#3c452e" stroke-width="2"/>
          <rect x="80" y="26" width="210" height="170" fill="#12150c" stroke="#2e3524" stroke-width="1.5"/>
          <text x="185" y="216" fill="#4d5539" font-size="10" text-anchor="middle" font-family="IBM Plex Mono">PANEL BELAKANG — CPU-0${rndi(1,9)}</text>
          <g stroke="#8b9377" stroke-width="1.5" fill="#0b0e07">
            <circle class="pc-port" data-p="power" cx="100" cy="52" r="8"/>
            <path class="pc-port" data-p="hdmi" d="M225 44h26l-5 16h-16z"/>
            <rect class="pc-port" data-p="lan" x="92" y="96" width="16" height="14"/>
            <rect class="pc-port" data-p="usb" x="130" y="99" width="22" height="9"/>
            <circle class="pc-port" data-p="audio" cx="100" cy="150" r="5"/>
          </g>
          <g fill="#4d5539" font-size="8" font-family="IBM Plex Mono">
            <text x="118" y="55">POWER</text><text x="258" y="55">HDMI</text>
            <text x="114" y="106">LAN</text><text x="158" y="107">USB</text><text x="112" y="153">AUDIO</text>
          </g>
          <rect x="80" y="238" width="210" height="104" fill="#0b0e07" stroke="#2e3524" stroke-width="1.5"/>
          <circle id="pcLed" cx="100" cy="290" r="7" fill="#39421f"/>
          <text x="120" y="294" fill="#4d5539" font-size="9" font-family="IBM Plex Mono" id="pcLedTxt">STANDBY</text>
        </svg>
        <svg id="pcWires" viewBox="0 0 330 370" style="pointer-events:none"></svg>
      </div>
      <div class="pc-tray" id="pcTray"></div>
    </div>
    <div class="mg-foot">
      <button class="btn primary" id="pcPower" disabled>${ic("power",14)} NYALAKAN PC</button>
      <span class="mg-status" id="pcStatus">0 / 5 kabel terpasang</span>
    </div>`;
  const tray=stage.querySelector("#pcTray"), wires=stage.querySelector("#pcWires"),
        stg=stage.querySelector("#pcStage");
  const connected=new Set();
  function drawWire(id,x1,y1,x2,y2,color,ghost){
    let p=wires.querySelector(`[data-w="${id}"]`);
    if(!p){ p=document.createElementNS("http://www.w3.org/2000/svg","path"); wires.appendChild(p); }
    p.setAttribute("data-w",id);
    p.setAttribute("fill","none"); p.setAttribute("stroke",color);
    p.setAttribute("stroke-width",ghost?4:5); p.setAttribute("stroke-linecap","round");
    if(ghost){ p.setAttribute("class","ghost-line"); p.setAttribute("opacity",".55"); }
    const midY=Math.min(y1,y2)+Math.max(30,Math.abs(y1-y2)*.5);
    p.setAttribute("d",`M${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
  }
  CABLES.forEach(c=>{
    const d=document.createElement("div");
    d.className="cable-item"; d.dataset.p=c.id;
    d.innerHTML=`<span class="plug" style="background:${c.color}"></span><span>${c.label}</span>`;
    tray.appendChild(d);
    d.addEventListener("pointerdown",ev=>{
      if(connected.has(c.id)) return;
      ev.preventDefault();
      try{ d.setPointerCapture(ev.pointerId); }catch(e){}
      const move=e=>{
        const r=stg.getBoundingClientRect();
        const x=e.clientX-r.left, y=e.clientY-r.top;
        let near=null;
        stg.querySelectorAll(".pc-port").forEach(p=>{
          if(p.dataset.done||p.dataset.p!==c.id) return;
          const pr=p.getBoundingClientRect();
          const px=pr.left+pr.width/2-r.left, py=pr.top+pr.height/2-r.top;
          const isNear=Math.hypot(px-x,py-y)<34;
          p.classList.toggle("near",isNear);
          if(isNear) near=p;
        });
        drawWire("ghost",300,368,x,y,c.color,true);
        d._near=near;
      };
      const up=()=>{
        d.removeEventListener("pointermove",move); d.removeEventListener("pointerup",up);
        d.removeEventListener("pointercancel",up);
        const near=d._near;
        stg.querySelectorAll(".pc-port").forEach(p=>p.classList.remove("near"));
        const g=wires.querySelector('[data-w="ghost"]'); if(g) g.remove();
        if(near){
          near.dataset.done="1";
          const r=stg.getBoundingClientRect(), pr=near.getBoundingClientRect();
          const px=pr.left+pr.width/2-r.left, py=pr.top+pr.height/2-r.top;
          drawWire(c.id,px,py,px,368,c.color,false);
          connected.add(c.id);
          sfx.snap();
          d.classList.add("done");
          stage.querySelector("#pcStatus").textContent=connected.size+" / 5 kabel terpasang";
          stage.querySelector("#pcStatus").className="mg-status ok";
          if(connected.size===5){
            stage.querySelector("#pcPower").disabled=false;
            stage.querySelector("#pcStatus").textContent="Semua kabel pas. Siap dinyalakan.";
          }
        } else { sfx.click(); }
        d._near=null;
      };
      d.addEventListener("pointermove",move);
      d.addEventListener("pointerup",up);
      d.addEventListener("pointercancel",up);
    });
  });
  stage.querySelector("#pcPower").onclick=()=>{
    sfx.power();
    stage.querySelector("#pcLed").setAttribute("fill","#a8e04a");
    stage.querySelector("#pcLedTxt").textContent="POST OK — BOOTING…";
    setTimeout(()=>ctx.done(true),1100);
  };
};

/* ---------------- 2) SETUP CCTV ---------------- */
BUILD.cctv=function(stage,ctx){
  stage.innerHTML=`
    <div class="mg-title">Arahkan Kamera CCTV</div>
    <div class="mg-sub">Atur PAN dan TILT tiap kamera sampai kerucut pandang mengunci titik target (pintu &amp; kasir).</div>
    <div class="cctv-wrap">
      <div class="cctv-left">
        <svg id="cvSvg" viewBox="0 0 460 268" style="width:100%;background:#0b0e07;border:1.5px solid var(--line2)">
          <g stroke="#2e3524" stroke-width="1"><path d="M0 60h460M0 120h460M0 180h460M0 240h460M80 0v268M160 0v268M240 0v268M320 0v268M400 0v268"/></g>
          <rect x="78" y="212" width="34" height="30" fill="#2e3524" stroke="#8b9377" stroke-width="1.5"/>
          <text x="95" y="258" fill="#8b9377" font-size="9" text-anchor="middle" font-family="IBM Plex Mono">PINTU</text>
          <rect x="312" y="206" width="40" height="34" fill="#2e3524" stroke="#8b9377" stroke-width="1.5"/>
          <text x="332" y="256" fill="#8b9377" font-size="9" text-anchor="middle" font-family="IBM Plex Mono">KASIR</text>
          <rect x="180" y="100" width="90" height="60" fill="#1c2113" stroke="#2e3524" stroke-width="1.5"/>
          <text x="225" y="134" fill="#4d5539" font-size="9" text-anchor="middle" font-family="IBM Plex Mono">RAK GUDANG</text>
          <path id="wedgeA" fill="rgba(168,224,74,.14)" stroke="#a8e04a" stroke-width="1.2"/>
          <path id="wedgeB" fill="rgba(232,179,75,.13)" stroke="#e8b34b" stroke-width="1.2"/>
          <g><rect x="43" y="23" width="26" height="14" fill="#3c452e"/><circle cx="55" cy="37" r="5" fill="#3c452e"/>
            <text x="55" y="16" fill="#a8e04a" font-size="9" text-anchor="middle" font-family="IBM Plex Mono">CAM-A</text></g>
          <g><rect x="393" y="23" width="26" height="14" fill="#3c452e"/><circle cx="405" cy="37" r="5" fill="#3c452e"/>
            <text x="405" y="16" fill="#e8b34b" font-size="9" text-anchor="middle" font-family="IBM Plex Mono">CAM-B</text></g>
          <circle id="tgtA" cx="95" cy="226" r="9" fill="none" stroke="#e05a4e" stroke-width="2" stroke-dasharray="3 3"/>
          <circle id="tgtB" cx="332" cy="220" r="9" fill="none" stroke="#e05a4e" stroke-width="2" stroke-dasharray="3 3"/>
        </svg>
      </div>
      <div class="cctv-ctrl">
        <div class="cam-box"><h5><span>KAMERA A — PINTU</span><span class="lock" id="lkA">BELUM KUNCI</span></h5>
          <div class="slider-row"><span>PAN</span><input type="range" id="panA" min="0" max="359" value="0"><b id="panAv">0°</b></div>
          <div class="slider-row"><span>TILT</span><input type="range" id="tiltA" min="0" max="90" value="10"><b id="tiltAv">10</b></div></div>
        <div class="cam-box"><h5><span>KAMERA B — KASIR</span><span class="lock" id="lkB">BELUM KUNCI</span></h5>
          <div class="slider-row"><span>PAN</span><input type="range" id="panB" min="0" max="359" value="180"><b id="panBv">180°</b></div>
          <div class="slider-row"><span>TILT</span><input type="range" id="tiltB" min="0" max="90" value="10"><b id="tiltBv">10</b></div></div>
        <button class="btn primary wide" id="cvRec" disabled>MULAI REKAM</button>
      </div>
    </div>`;
  const CAM={A:{x:55,y:37,tx:95,ty:226},B:{x:405,y:37,tx:332,ty:220}};
  const lock={A:false,B:false};
  function angDiff(a,b){ let d=Math.abs(a-b)%360; return d>180?360-d:d; }
  function update(){
    ["A","B"].forEach(k=>{
      const pan=+stage.querySelector("#pan"+k).value, tilt=+stage.querySelector("#tilt"+k).value;
      stage.querySelector("#pan"+k+"v").textContent=pan+"°";
      stage.querySelector("#tilt"+k+"v").textContent=tilt;
      const c=CAM[k], half=13, r=150+tilt*1.4;
      const a1=(pan-half)*Math.PI/180, a2=(pan+half)*Math.PI/180;
      stage.querySelector("#wedge"+k).setAttribute("d",
        `M${c.x} ${c.y} L${c.x+r*Math.cos(a1)} ${c.y+r*Math.sin(a1)} A${r} ${r} 0 0 1 ${c.x+r*Math.cos(a2)} ${c.y+r*Math.sin(a2)} Z`);
      const dx=c.tx-c.x, dy=c.ty-c.y, dist=Math.hypot(dx,dy);
      const tAng=Math.atan2(dy,dx)*180/Math.PI;
      const ok=angDiff(pan,(tAng+360)%360)<=14 && Math.abs(dist-(110+tilt*1.55))<=26;
      if(ok!==lock[k]){
        lock[k]=ok; sfx.snap();
        const tg=stage.querySelector("#tgt"+k);
        tg.setAttribute("stroke",ok?"#a8e04a":"#e05a4e");
        tg.setAttribute("fill",ok?"rgba(168,224,74,.25)":"none");
        if(ok) tg.removeAttribute("stroke-dasharray"); else tg.setAttribute("stroke-dasharray","3 3");
        stage.querySelector("#lk"+k).textContent=ok?"TERKUNCI ✓":"BELUM KUNCI";
      }
    });
    stage.querySelector("#cvRec").disabled=!(lock.A&&lock.B);
  }
  stage.querySelectorAll("input[type=range]").forEach(r=>r.addEventListener("input",update));
  const idealA=Math.atan2(CAM.A.ty-CAM.A.y,CAM.A.tx-CAM.A.x)*180/Math.PI+360;
  const idealB=Math.atan2(CAM.B.ty-CAM.B.y,CAM.B.tx-CAM.B.x)*180/Math.PI+360;
  stage.querySelector("#panA").value=Math.round(idealA+pick([-1,1])*rnd(35,90))%360;
  stage.querySelector("#panB").value=Math.round(idealB+pick([-1,1])*rnd(35,90))%360;
  stage.querySelector("#tiltA").value=rndi(5,30);
  stage.querySelector("#tiltB").value=rndi(5,30);
  update();
  stage.querySelector("#cvRec").onclick=()=>{
    const b=stage.querySelector("#cvRec");
    b.innerHTML='<span class="rec-dot"></span> MEREKAM…'; b.disabled=true;
    sfx.snap(); setTimeout(()=>ctx.done(true),1600);
  };
};

/* ---------------- 3) MESIN ABSENSI ---------------- */
BUILD.absen=function(stage,ctx){
  const d=ctx.t.detail;
  stage.innerHTML=`
    <div class="mg-title">Daftarkan Sidik Jari</div>
    <div class="mg-sub">Tekan &amp; TAHAN tombol scan sampai progress penuh. Melepas terlalu cepat = scan gagal. Lakukan untuk 3 jari.</div>
    <div class="fp-grid">
      <div>
        <div class="fp-slots" id="fpSlots">
          <div class="fp-slot">JARI 1</div><div class="fp-slot">JARI 2</div><div class="fp-slot">JARI 3</div>
        </div>
        <div style="margin-top:18px;display:inline-block">
          <button class="hold-btn" id="fpHold"><span class="fill" id="fpFill"></span><span style="position:relative">TEKAN &amp; TAHAN UNTUK SCAN</span></button>
        </div>
      </div>
      <div id="fpStep2" class="hidden">
        <div class="mg-title" style="font-size:13px">Atur Jam Kerja</div>
        <div class="mg-sub">Sesuaikan shift sesuai memo klien.</div>
        <div style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:18px">
          <div><div class="field" style="margin-bottom:6px"><label>JAM MASUK</label></div>
            <div class="stepper"><button id="inMinus">−</button><b id="inVal">08:00</b><button id="inPlus">+</button></div></div>
          <div><div class="field" style="margin-bottom:6px"><label>JAM PULANG</label></div>
            <div class="stepper"><button id="outMinus">−</button><b id="outVal">17:00</b><button id="outPlus">+</button></div></div>
        </div>
        <button class="btn primary" id="fpSave">SIMPAN KE MESIN</button>
      </div>
    </div>
    <div class="mg-foot"><span class="mg-status" id="fpStatus">Siap memindai jari ke-1…</span></div>`;
  let done=0, prog=0, timer=null;
  const btn=stage.querySelector("#fpHold"), fill=stage.querySelector("#fpFill");
  function fpSvg(){
    let p=""; for(let i=0;i<6;i++){const r=6+i*4.5, a=rnd(0,6.28);
      p+=`<path d="M ${18+r*Math.cos(a)} ${20+r*Math.sin(a)} a ${r} ${r} 0 1 1 ${2*r*0.9} 0" fill="none" stroke="currentColor" stroke-width="1.3"/>`;}
    return `<svg width="42" height="40" viewBox="0 0 40 40" style="color:var(--green)">${p}</svg>`;
  }
  function start(e){
    e.preventDefault();
    if(done>=3||timer) return;
    try{ btn.setPointerCapture(e.pointerId); }catch(err){}
    timer=setInterval(()=>{
      prog+=2.1; fill.style.width=Math.min(100,prog)+"%";
      if(prog>=100) stop();
    },25);
  }
  function stop(){
    if(!timer) return;
    clearInterval(timer); timer=null;
    if(prog>=100){
      sfx.snap();
      const slot=stage.querySelectorAll(".fp-slot")[done];
      slot.innerHTML=fpSvg(); slot.classList.add("on");
      done++; prog=0; fill.style.width="0%";
      stage.querySelector("#fpStatus").textContent=done<3?`Jari ke-${done} terdaftar. Lanjut…`:"Semua jari terdaftar!";
      stage.querySelector("#fpStatus").className="mg-status ok";
      if(done===3){ btn.disabled=true; stage.querySelector("#fpStep2").classList.remove("hidden"); }
    } else {
      prog=0; fill.style.width="0%";
      ctx.pen(5,"Scan gagal — jari dilepas terlalu cepat. (SLA −5 dtk)");
      stage.querySelector("#fpStatus").textContent="Scan gagal, ulangi. Tekan & TAHAN.";
      stage.querySelector("#fpStatus").className="mg-status bad";
    }
  }
  btn.addEventListener("pointerdown",start);
  btn.addEventListener("pointerup",stop);
  btn.addEventListener("pointerleave",stop);
  btn.addEventListener("pointercancel",stop);
  let vi=d.in, vo=d.out;
  const pad=n=>String(((n%24)+24)%24).padStart(2,"0")+":00";
  stage.querySelector("#inMinus").onclick=()=>{vi=(vi+23)%24;stage.querySelector("#inVal").textContent=pad(vi);sfx.click();};
  stage.querySelector("#inPlus").onclick =()=>{vi=(vi+1)%24; stage.querySelector("#inVal").textContent=pad(vi);sfx.click();};
  stage.querySelector("#outMinus").onclick=()=>{vo=(vo+23)%24;stage.querySelector("#outVal").textContent=pad(vo);sfx.click();};
  stage.querySelector("#outPlus").onclick =()=>{vo=(vo+1)%24; stage.querySelector("#outVal").textContent=pad(vo);sfx.click();};
  stage.querySelector("#fpSave").onclick=()=>{
    if(vi===d.in&&vo===d.out){ sfx.ok(); ctx.done(true); }
    else { ctx.pen(8,"Jam kerja tidak sesuai memo! (SLA −8 dtk)"); }
  };
};

/* ---------------- 4) ROUTER ---------------- */
BUILD.router=function(stage,ctx){
  const d=ctx.t.detail;
  stage.innerHTML=`
    <div class="mg-title">Panel Admin Router — 192.168.1.1</div>
    <div class="mg-sub">Isi konfigurasi sesuai memo klien. Semua centang hijau baru bisa di-APPLY.</div>
    <div style="display:grid;grid-template-columns:1fr 250px;gap:24px;max-width:760px">
      <div>
        <div class="field"><label>MODE WAN</label>
          <select class="inp" id="rtMode"><option value="">— pilih —</option><option>DHCP</option><option>PPPoE</option><option>Static IP</option></select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>PPPOE USER</label><input class="inp" id="rtUser" autocomplete="off"></div>
          <div class="field"><label>PPPOE PASSWORD</label><input class="inp" id="rtPass" type="password" autocomplete="off"></div>
        </div>
        <div class="field"><label>SSID (NAMA WIFI)</label><input class="inp" id="rtSsid" autocomplete="off"></div>
        <div class="field"><label>PASSWORD WIFI <span id="rtStrength" style="letter-spacing:0"></span></label><input class="inp" id="rtWifi" autocomplete="off"></div>
        <div class="field"><label>SERVER DHCP</label>
          <div style="display:flex;align-items:center;gap:12px"><div class="switch" id="rtDhcp"><i></i></div><span id="rtDhcpTxt" style="font-size:12px;color:var(--dim)">MATI</span></div></div>
        <button class="btn primary" id="rtApply" disabled>APPLY KONFIGURASI</button>
      </div>
      <div class="checklist" id="rtCheck"></div>
    </div>
    <div class="progline hidden" id="rtProg"><i></i></div>
    <div class="mg-foot"><span class="mg-status" id="rtStatus">Menunggu konfigurasi…</span></div>`;
  const st={mode:false,user:false,pass:false,ssid:false,wifi:false,dhcp:false};
  function drawCheck(){
    stage.querySelector("#rtCheck").innerHTML=[
      ["mode","Mode WAN = PPPoE"],["user","PPPoE user sesuai memo"],["pass","PPPoE password sesuai memo"],
      ["ssid","SSID sama persis dengan memo"],["wifi","Password WiFi ≥ 8 karakter & ada angka"],["dhcp","DHCP server aktif"]
    ].map(([k,l])=>`<div class="ci ${st[k]?"on":""}"><span class="bx">${st[k]?"✓":""}</span>${l}</div>`).join("");
  }
  function refresh(){
    const all=Object.values(st).every(Boolean);
    stage.querySelector("#rtApply").disabled=!all;
    stage.querySelector("#rtStatus").textContent=all?"Semua siap. Klik APPLY.":"Lengkapi sampai semua centang hijau.";
    stage.querySelector("#rtStatus").className="mg-status"+(all?" ok":"");
  }
  function mark(id,ok){ st[id]=ok; drawCheck(); refresh(); }
  stage.querySelector("#rtMode").onchange=e=>{ sfx.click();
    mark("mode",e.target.value==="PPPoE");
    e.target.style.borderColor=e.target.value==="PPPoE"?"var(--green)":""; };
  stage.querySelector("#rtUser").oninput=e=>mark("user",e.target.value.trim().toLowerCase()===d.user);
  stage.querySelector("#rtPass").oninput=e=>mark("pass",e.target.value.trim().toLowerCase()===d.pass);
  stage.querySelector("#rtSsid").oninput=e=>mark("ssid",e.target.value.trim().toUpperCase()===d.ssid.toUpperCase());
  stage.querySelector("#rtWifi").oninput=e=>{
    const v=e.target.value;
    const ok=v.length>=8&&/\d/.test(v);
    stage.querySelector("#rtStrength").textContent=v?(ok?"[KUAT]":"[LEMAH]"):"";
    stage.querySelector("#rtStrength").style.color=ok?"var(--green)":"var(--red)";
    mark("wifi",ok); };
  stage.querySelector("#rtDhcp").onclick=function(){
    this.classList.toggle("on"); sfx.click();
    const on=this.classList.contains("on");
    stage.querySelector("#rtDhcpTxt").textContent=on?"AKTIF":"MATI";
    mark("dhcp",on); };
  stage.querySelector("#rtApply").onclick=function(){
    this.disabled=true;
    const bar=stage.querySelector("#rtProg"); bar.classList.remove("hidden");
    const lines=["Menyimpan konfigurasi WAN…","Menerapkan SSID: "+d.ssid+"…","Me-restart radio WiFi…"];
    let i=0;
    const iv=setInterval(()=>{
      bar.querySelector("i").style.width=((i+1)/3*100)+"%";
      stage.querySelector("#rtStatus").textContent=lines[i];
      tone(500+i*140,.07,"square",.04);
      if(++i>=3){ clearInterval(iv); sfx.ok();
        stage.querySelector("#rtStatus").textContent="Konfigurasi tersimpan. WiFi menyebar.";
        stage.querySelector("#rtStatus").className="mg-status ok";
        setTimeout(()=>ctx.done(true),650); }
    },520);
    ctx.cleanup(()=>clearInterval(iv));
  };
  drawCheck(); refresh();
};

/* ---------------- 5) PRINTER ---------------- */
BUILD.printer=function(stage,ctx){
  const d=ctx.t.detail;
  const drivers=[...PRINTER_MODELS].sort(()=>Math.random()-.5);
  stage.innerHTML=`
    <div class="mg-title">Pasang Printer Baru</div>
    <div class="mg-sub">Ikuti langkahnya — cek memo untuk model &amp; ukuran kertas.</div>
    <div class="pr-steps" id="prSteps"><i class="on"></i><i></i><i></i></div>
    <div id="prBody"></div>
    <div class="mg-foot"><span class="mg-status" id="prStatus"></span></div>`;
  const body=stage.querySelector("#prBody"), st=stage.querySelector("#prStatus");
  function dots(n){ stage.querySelectorAll("#prSteps i").forEach((el,i)=>el.classList.toggle("on",i<=n)); }
  function step1(){
    dots(0); st.textContent="Pilih driver yang sesuai model di memo.";
    body.innerHTML=`<div class="chip-select">${drivers.map(m=>`<button data-m="${m}">${m} — Full Driver v${rndi(1,9)}.${rndi(0,9)}</button>`).join("")}</div>`;
    body.querySelectorAll("button").forEach(b=>b.onclick=()=>{
      if(b.dataset.m===d.model){ b.classList.add("sel-ok"); sfx.snap(); st.textContent="Driver tepat!"; st.className="mg-status ok"; setTimeout(step2,500); }
      else{ b.classList.add("sel-bad"); b.disabled=true; ctx.pen(8,"Driver salah — uninstall lagi makan waktu. (SLA −8 dtk)"); st.textContent="Itu bukan modelnya. Cek memo!"; st.className="mg-status bad"; }
    });
  }
  function step2(){
    dots(1); st.textContent="Pilih ukuran kertas lalu sejajarkan pengaturnya.";
    const target=rnd(30,70);
    body.innerHTML=`
      <div class="field" style="max-width:340px"><label>UKURAN KERTAS</label>
        <div class="chip-select">${PAPERS.concat(["A5"]).map(p=>`<button data-p="${p}">${p}</button>`).join("")}</div></div>
      <div class="field" style="max-width:420px"><label>SEJAJARKAN PENGATUR KERTAS — geser ke area stabilo</label>
        <div class="slider-row" style="grid-template-columns:1fr 40px"><input type="range" id="prSlide" min="0" max="100" value="0"><b id="prSlideV">0</b></div>
        <div class="progline" style="position:relative"><i style="width:0"></i>
          <span style="position:absolute;top:-3px;left:${target}%;width:12%;height:14px;background:rgba(168,224,74,.3);border:1.5px dashed var(--green)"></span></div></div>
      <button class="btn primary" id="prLoad">MASUKKAN KERTAS</button>`;
    const slide=body.querySelector("#prSlide");
    slide.oninput=()=>body.querySelector("#prSlideV").textContent=slide.value;
    body.querySelector("#prLoad").onclick=()=>{
      st.textContent="Pilih ukuran kertas sesuai memo dulu!"; st.className="mg-status bad";
    };
    body.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{
      if(b.dataset.p===d.paper){
        b.classList.add("sel-ok"); sfx.snap();
        st.textContent="Kertas benar. Sekarang sejajarkan pengaturnya lalu masukkan."; st.className="mg-status ok";
        body.querySelector("#prLoad").onclick=()=>{
          if(Math.abs(+slide.value-target)<=7){ sfx.snap(); st.textContent="Kertas masuk lurus."; st.className="mg-status ok"; setTimeout(step3,450); }
          else{ ctx.pen(4,"Kertas miring — sejajarkan pengaturnya dulu! (SLA −4 dtk)"); st.className="mg-status bad"; }
        };
      } else { b.classList.add("sel-bad"); b.disabled=true; ctx.pen(6,"Salah ukuran kertas. (SLA −6 dtk)"); }
    });
  }
  function step3(){
    dots(2);
    body.innerHTML=`<button class="btn primary" id="prTest">CETAK HALAMAN UJI</button><div id="prOut"></div>`;
    st.textContent="Langkah terakhir: tes cetak.";
    body.querySelector("#prTest").onclick=function(){
      this.disabled=true; st.textContent="Mencetak…"; st.className="mg-status";
      let p=0; const iv=setInterval(()=>{
        p+=rnd(8,18); tone(300+p,.04,"square",.02);
        st.textContent="Mencetak… "+Math.min(100,Math.round(p))+"%";
        if(p>=100){ clearInterval(iv); sfx.ok();
          st.textContent="Hasil cetak sempurna."; st.className="mg-status ok";
          body.querySelector("#prOut").innerHTML=`<div class="testpage"><b>${d.model}</b> — Test Page
            <div class="tp-line"></div><div class="tp-line"></div><div class="tp-line" style="width:60%"></div>
            OK — warna: hitam pekat, tidak ada garis.</div>`;
          setTimeout(()=>ctx.done(true),900); }
      },260);
      ctx.cleanup(()=>clearInterval(iv));
    };
  }
  step1();
};

/* ---------------- 6) TROUBLESHOOT HARDWARE ---------------- */
BUILD.hw=function(stage,ctx){
  const c=HW_CASES[ctx.t.detail.caseIdx];
  const parts=["RAM","PSU","HDD","GPU","KIPAS","KABEL POWER"];
  stage.innerHTML=`
    <div class="mg-title">Diagnosa Hardware</div>
    <div class="mg-sub">Baca gejalanya, periksa komponen yang kamu curigai. Pemeriksaan komponen yang salah memakan waktu.</div>
    <div class="hw-wrap">
      <div>
        <div class="hw-case"><h5>GEJALA YANG DILAPORKAN</h5><p>${c.sym}</p></div>
        <div class="hw-parts">${parts.map(p=>`<button class="btn" data-p="${p}">PERIKSA ${p}</button>`).join("")}</div>
        <div class="hw-result" id="hwRes">Hasil pemeriksaan akan muncul di sini.</div>
      </div>
      <div>
        <svg viewBox="0 0 200 220" width="180" style="display:block;margin:0 auto">
          <rect x="40" y="8" width="120" height="204" fill="#1c2113" stroke="#3c452e" stroke-width="2"/>
          <rect x="56" y="26" width="88" height="60" fill="#0b0e07" stroke="#2e3524"/>
          <circle id="hwLed" cx="70" cy="190" r="6" fill="#e05a4e"><animate attributeName="opacity" values="1;.2;1" dur="0.8s" repeatCount="indefinite"/></circle>
          <text x="86" y="194" fill="#8b9377" font-size="9" font-family="IBM Plex Mono">ERROR STATE</text>
          <g fill="#39421f"><rect x="60" y="110" width="80" height="8"/><rect x="60" y="126" width="80" height="8"/><rect x="60" y="142" width="80" height="8"/></g>
        </svg>
        <div id="hwActs" style="display:grid;gap:9px;margin-top:14px"></div>
      </div>
    </div>
    <div class="mg-foot"><span class="mg-status" id="hwStatus">Pilih komponen untuk diperiksa.</span></div>`;
  let found=false;
  stage.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{
    sfx.click();
    const res=stage.querySelector("#hwRes");
    if(b.dataset.p===c.culprit && !found){
      found=true;
      res.className="hw-result found";
      res.innerHTML=c.finding;
      stage.querySelector("#hwStatus").textContent="Komponen bermasalah ditemukan! Pilih tindakan perbaikan.";
      stage.querySelector("#hwStatus").className="mg-status ok";
      const acts=stage.querySelector("#hwActs");
      const shuffled=[...c.acts].sort(()=>Math.random()-.5);
      acts.innerHTML=shuffled.map((a,i)=>`<button class="btn ${a[1]?"primary":""}" data-a="${i}">${a[0]}</button>`).join("");
      acts.querySelectorAll("button").forEach(ab=>ab.onclick=()=>{
        const act=shuffled[+ab.dataset.a];
        if(act[1]){ sfx.ok(); stage.querySelector("#hwLed").setAttribute("fill","#a8e04a");
          stage.querySelector("#hwStatus").textContent="Perbaikan berhasil!";
          setTimeout(()=>ctx.done(true),800); }
        else{ ctx.pen(12,"Tindakan salah — buang-buang waktu. (SLA −12 dtk)");
          stage.querySelector("#hwStatus").textContent="Tindakan itu tidak relevan dengan temuannya."; stage.querySelector("#hwStatus").className="mg-status bad"; }
      });
    } else if(!found){
      res.className="hw-result";
      res.textContent=`${b.dataset.p}: pemeriksaan selesai — tidak ditemukan kelainan.`;
      ctx.pen(7,"Komponen ini sehat. Waktu pemeriksaan terbuang. (SLA −7 dtk)");
    } else { res.className="hw-result found"; res.innerHTML=c.finding; }
  });
};

/* ---------------- 7) TROUBLESHOOT SOFTWARE ---------------- */
BUILD.sw=function(stage,ctx){
  const c=SW_CASES[ctx.t.detail.caseIdx];
  stage.innerHTML=`
    <div class="mg-title">Penanganan Masalah Software</div>
    <div class="mg-sub">Satu solusi benar. Solusi yang salah menghabiskan waktu klien (SLA berkurang).</div>
    <div class="sw-screen">
      ${c.bsod
        ?`<div class="sw-bsod"><div class="code">:( &nbsp;${c.code}</div><br>${c.txt}<br><br><span style="font-size:11px;opacity:.8">Kumpulkan info error, lalu cari solusi di panel bawah.</span></div>`
        :`<div class="sw-dialog"><div class="bar">ERROR — AplikasiSistem.exe</div><b>${c.code}</b><br><br>${c.txt}</div>`}
    </div>
    <div class="sw-choices" id="swCh">
      ${c.ch.map((x,i)=>`<button data-i="${i}">${x[0]}</button>`).join("")}
    </div>
    <div class="progline hidden" id="swProg"><i></i></div>
    <div class="mg-foot"><span class="mg-status" id="swStatus"></span></div>`;
  stage.querySelectorAll("#swCh button").forEach(b=>b.onclick=()=>{
    const ch=c.ch[+b.dataset.i];
    if(ch[1]){
      b.classList.add("sel-ok"); sfx.snap();
      stage.querySelectorAll("#swCh button").forEach(x=>x.disabled=true);
      const prog=stage.querySelector("#swProg"); prog.classList.remove("hidden");
      const st=stage.querySelector("#swStatus"); st.textContent=ch[2]; st.className="mg-status ok";
      let p=0; const iv=setInterval(()=>{ p+=6; prog.querySelector("i").style.width=Math.min(100,p)+"%";
        if(p>=100){ clearInterval(iv); sfx.ok(); setTimeout(()=>ctx.done(true),400); } },90);
      ctx.cleanup(()=>clearInterval(iv));
    } else {
      b.classList.add("tried"); b.disabled=true; ctx.pen(12,"Masalah masih berlanjut… (SLA −12 dtk)");
      stage.querySelector("#swStatus").textContent=ch[2];
      stage.querySelector("#swStatus").className="mg-status bad";
    }
  });
};

/* ---------------- 8) INSTALASI SOFTWARE ---------------- */
BUILD.install=function(stage,ctx){
  const d=ctx.t.detail;
  let bundlesInstalled=0, step=0;
  stage.innerHTML=`
    <div class="mg-title">Instal ${d.app.name}</div>
    <div class="mg-sub">Jalankan wizard installer. INGAT MEMO: klien melarang keras aplikasi tambahan ikut terpasang.</div>
    <div class="inst-win" id="instWin"></div>
    <div class="mg-foot"><span class="mg-status" id="inStatus">Ikuti wizard-nya. Hati-hati di langkah penawaran…</span></div>`;
  const win=stage.querySelector("#instWin");
  function render(){
    if(step===0) win.innerHTML=`
      <div class="inst-title"><span>Setup — ${d.app.name} v${d.app.ver}</span><span>— □ ✕</span></div>
      <div class="inst-body"><h4>Selamat Datang</h4>
        Wizard ini akan memasang <b>${d.app.name}</b> di komputer Anda.<br><br>
        Disarankan menutup aplikasi lain sebelum melanjutkan.</div>
      <div class="inst-foot"><span style="margin-right:auto;font-size:11px;color:#77704f">Langkah 1/5</span>
        <button id="iNext" class="prime">Next &gt;</button></div>`;
    else if(step===1) win.innerHTML=`
      <div class="inst-title"><span>Setup — ${d.app.name}</span><span>— □ ✕</span></div>
      <div class="inst-body"><h4>Lisensi</h4>
        <div style="max-height:90px;overflow:hidden;font-size:11px;color:#55503a">
        Perjanjian pengguna akhir: dengan melanjutkan, Anda setuju bahwa segala kerusakan akibat
        penggunaan menjadi tanggung jawab pengguna, dan vendor tidak pernah salah, kapan pun.</div>
        <label class="lic"><input type="checkbox" id="iLic"> Saya setuju dengan perjanjian lisensi</label></div>
      <div class="inst-foot"><span style="margin-right:auto;font-size:11px;color:#77704f">Langkah 2/5</span>
        <button id="iNext" class="prime" disabled>Next &gt;</button></div>`;
    else if(step===2){
      const [b1,b2]=d.bundles;
      win.innerHTML=`
      <div class="inst-title"><span>Setup — ${d.app.name}</span><span>— □ ✕</span></div>
      <div class="inst-body"><h4>Penawaran Rekomendasi Untukmu!</h4>
        <label class="inst-offer"><input type="checkbox" checked class="iBundle">
          <span><b>${b1[0]}</b><small>${b1[1]}</small></span></label>
        <label class="inst-offer"><input type="checkbox" checked class="iBundle">
          <span><b>${b2[0]}</b><small>${b2[1]}</small></span></label>
        <button class="inst-decline" id="iDecline">Tolak semua penawaran &amp; lanjutkan instalasi bersih</button></div>
      <div class="inst-foot"><span style="margin-right:auto;font-size:11px;color:#77704f">Langkah 3/5</span>
        <button id="iNext" class="prime">Install &gt;</button></div>`;
    }
    else if(step===3) win.innerHTML=`
      <div class="inst-title"><span>Setup — ${d.app.name}</span><span>— □ ✕</span></div>
      <div class="inst-body"><h4>Menginstal…</h4>
        <div style="border:1.5px solid #a39a76;height:18px;background:#efeada">
          <div id="iBar" style="height:100%;width:0;background:#2c4a1a"></div></div>
        <div id="iFile" style="font-size:11px;color:#77704f;margin-top:8px">menyiapkan berkas…</div>
        <div id="iPop"></div></div>
      <div class="inst-foot"><span style="margin-right:auto;font-size:11px;color:#77704f">Langkah 4/5</span></div>`;
    else win.innerHTML=`
      <div class="inst-title"><span>Setup — ${d.app.name}</span><span>— □ ✕</span></div>
      <div class="inst-body"><h4>Selesai</h4>
        ${d.app.name} v${d.app.ver} berhasil dipasang.<br><br>
        ${bundlesInstalled>0
          ?`<span style="color:#8a2f22"><b>Catatan:</b> ${bundlesInstalled} aplikasi tambahan juga ikut terpasang.</span>`
          :`<span style="color:#2c4a1a"><b>Bersih.</b> Tidak ada aplikasi tambahan yang mengintip.</span>`}</div>
      <div class="inst-foot"><span style="margin-right:auto;font-size:11px;color:#77704f">Langkah 5/5</span>
        <button id="iFin" class="prime">Finish</button></div>`;
    wire();
  }
  function wire(){
    const nx=win.querySelector("#iNext");
    if(step===1){
      win.querySelector("#iLic").onchange=e=>{ if(nx) nx.disabled=!e.target.checked; };
    }
    if(step===2){
      if(nx) nx.onclick=()=>{
        bundlesInstalled=[...win.querySelectorAll(".iBundle")].filter(c=>c.checked).length;
        sfx.click(); step=3; render(); runInstall();
      };
      win.querySelector("#iDecline").onclick=()=>{
        win.querySelectorAll(".iBundle").forEach(c=>c.checked=false);
        sfx.click();
      };
    } else if(nx){
      nx.onclick=()=>{ sfx.click(); step++; render(); };
    }
    const fin=win.querySelector("#iFin");
    if(fin) fin.onclick=()=>{
      if(bundlesInstalled>0){
        ctx.t.detail.complain=true;
        toast(`<b>Klien komplain!</b> PC-nya kini penuh ${bundlesInstalled} aplikasi sampah. Reward dipotong.`,"bad");
        logLine(`#${ctx.t.id}: installer nakal lolos — klien marah`,"bad");
      } else {
        ctx.t.detail.clean=true;
        toast("<b>Instalasi bersih!</b> Klien senang, tidak ada toolbar misterius.");
      }
      ctx.done(true);
    };
  }
  function runInstall(){
    let p=0, popShown=false;
    const iv=setInterval(()=>{
      p+=rnd(3,9);
      const bar=win.querySelector("#iBar"); if(!bar){clearInterval(iv);return;}
      bar.style.width=Math.min(100,p)+"%";
      win.querySelector("#iFile").textContent="menyalin: "+pick(["core.dll","app_"+rndi(10,99)+".dat","lang_id.dll","helper.exe","icon.pkg"]);
      tone(300+p,.03,"square",.015);
      if(p>=86&&!popShown){
        popShown=true; clearInterval(iv);
        win.querySelector("#iFile").textContent="instalasi tertahan di 99%…";
        win.querySelector("#iPop").innerHTML=`
          <div class="inst-pop"><b>rkdel.tmp sedang digunakan proses lain.</b><br>
          <button id="iRetry" style="margin-top:8px;border:1.5px solid #555;background:#efeada;padding:4px 16px;font-size:12px;cursor:pointer">Retry</button></div>`;
        win.querySelector("#iRetry").onclick=()=>{
          sfx.click(); win.querySelector("#iPop").innerHTML="";
          const iv2=setInterval(()=>{ p+=6; bar.style.width=Math.min(100,p)+"%";
            if(p>=100){ clearInterval(iv2); step=4; render(); } },100);
          ctx.cleanup(()=>clearInterval(iv2));
        };
        return;
      }
      if(p>=100){ clearInterval(iv); step=4; render(); }
    },180);
    ctx.cleanup(()=>clearInterval(iv));
  }
  render();
};

/* ---------------- 9) REMOTE DESKTOP ---------------- */
BUILD.remote=function(stage,ctx){
  const scen=ctx.t.detail.scen;
  stage.innerHTML=`
    <div class="mg-title">Sesi Remote — PC-KLIEN-0${rndi(2,9)}</div>
    <div class="mg-sub">${scen==="mal"
      ?"Bersihkan semua file mencurigakan dari folder Downloads, lalu jalankan full scan. HATI-HATI: jangan hapus file kerja klien!"
      :"Akhiri proses asing yang memakan CPU. JANGAN akhiri proses sistem — bisa bluescreen."}</div>
    <div class="rd-desktop">
      <div class="rd-bar"><span>● REMOTE AKTIF — 192.168.1.${rndi(20,90)}</span><span id="rdPing"></span></div>
      <div class="rd-files">
        <div class="fh">${scen==="mal"?"C:\\Users\\klien\\Downloads":"Task Manager — proses berjalan"}</div>
        <div id="rdRows"></div>
      </div>
      <div class="rd-actions" id="rdActs"></div>
    </div>
    <div class="mg-foot"><span class="mg-status" id="rdStatus"></span></div>`;
  const rows=stage.querySelector("#rdRows"), acts=stage.querySelector("#rdActs"), st=stage.querySelector("#rdStatus");
  const pingIv=setInterval(()=>{const p=stage.querySelector("#rdPing"); if(p) p.textContent="ping "+rndi(4,38)+" ms";},900);
  ctx.cleanup(()=>clearInterval(pingIv));
  let sel=null, cleaned=0, need=0;

  if(scen==="mal"){
    const junk=[...REMOTE_MAL.junk].sort(()=>Math.random()-.5).slice(0,3);
    const good=pick(REMOTE_MAL.good);
    const files=[...junk.map(f=>({n:f,junk:true})),{n:good,junk:false}].sort(()=>Math.random()-.5);
    need=junk.length;
    function draw(){
      rows.innerHTML=files.map((f,i)=>f.dead?"":`
        <div class="frow" data-i="${i}"><span class="ext">${f.n.split(".").pop().toUpperCase()}</span>
        <span>${f.n}</span><span class="meta">${f.junk?rnd(2,90).toFixed(1)+" MB":rnd(0.2,4).toFixed(1)+" MB"}</span></div>`).join("");
      rows.querySelectorAll(".frow").forEach(r=>r.onclick=()=>{
        rows.querySelectorAll(".frow").forEach(x=>x.classList.remove("sel"));
        r.classList.add("sel"); sel=+r.dataset.i; sfx.click();
        acts.innerHTML=`<button class="btn danger" id="rdDel">HAPUS FILE</button>`;
        stage.querySelector("#rdDel").onclick=()=>{
          const f=files[sel];
          if(f.junk){ f.dead=true; cleaned++; sfx.snap();
            st.textContent=`File jahat terhapus (${cleaned}/${need}).`; st.className="mg-status ok";
            if(cleaned>=need){
              acts.innerHTML=`<button class="btn primary" id="rdScan">JALANKAN FULL SCAN</button>`;
              stage.querySelector("#rdScan").onclick=function(){
                this.disabled=true; st.textContent="Memindai sistem…"; st.className="mg-status";
                let p=0; const iv=setInterval(()=>{ p+=7; tone(500+p,.03,"square",.02);
                  if(p>=100){ clearInterval(iv); sfx.ok(); st.textContent="Sistem bersih.";
                    setTimeout(()=>ctx.done(true),700);} },110);
                ctx.cleanup(()=>clearInterval(iv));
              };
            }
          } else { ctx.pen(15,"ITU FILE KERJA KLIEN! Dia hampir menangis. (SLA −15 dtk)");
            st.textContent="File penting hampir terhapus — klien panik."; st.className="mg-status bad";
          }
          sel=null; draw();
        };
      });
    }
    draw();
  } else {
    const procs=[...REMOTE_PROC].sort(()=>Math.random()-.5);
    need=procs.filter(p=>p.junk).length;
    function draw(){
      rows.innerHTML=procs.map((p,i)=>p.dead?"":`
        <div class="frow" data-i="${i}"><span class="ext">PRC</span><span>${p.n}</span>
        <span class="meta">CPU ${p.cpu} • ${p.mem}</span></div>`).join("");
      rows.querySelectorAll(".frow").forEach(r=>r.onclick=()=>{
        rows.querySelectorAll(".frow").forEach(x=>x.classList.remove("sel"));
        r.classList.add("sel"); sel=+r.dataset.i; sfx.click();
        acts.innerHTML=`<button class="btn danger" id="rdKill">AKHIRI PROSES</button>`;
        stage.querySelector("#rdKill").onclick=()=>{
          const p=procs[sel];
          if(p.sys){ ctx.pen(20,"HAMPIR BLUESCREEN! Itu proses sistem Windows. (SLA −20 dtk)");
            st.textContent="Layar kedip sebentar… jangan sentuh proses sistem!"; st.className="mg-status bad";
          } else if(p.junk){ p.dead=true; cleaned++; sfx.snap();
            st.textContent=`Proses asing dimatikan (${cleaned}/${need}). CPU turun drastis.`; st.className="mg-status ok";
            if(cleaned>=need){
              acts.innerHTML=`<button class="btn primary" id="rdDone">PUTUSKAN KONEKSI</button>`;
              stage.querySelector("#rdDone").onclick=()=>{ sfx.ok(); ctx.done(true); };
            }
          } else { p.dead=true; sfx.click();
            st.textContent=p.n+" dimatikan. Tidak berefek apa-apa, tapi oke lah.";
            st.className="mg-status"; }
          sel=null; draw();
        };
      });
    }
    draw();
  }
};

/* ================================================================
   ALUR PENGERJAAN TIKET
   ================================================================ */
function openWork(id){
  if(state.active) return;
  const t=state.tickets.find(x=>x.id===id);
  if(!t||t.status!=="open") return;
  state.active=t; t.status="active";
  emitMejaEvent("ticket-opened",ticketEventPayload(t));
  sfx.click();
  $("#wfCode").textContent="#"+t.id;
  $("#wfTitle").textContent=TYPES[t.type].label;
  $("#wfMemo").innerHTML=memoFor(t);
  const stage=$("#wfStage"); stage.innerHTML="";
  $("#workOverlay").classList.remove("hidden");
  stage.scrollTop=0;
  const ctx=makeCtx(t);
  state._ctx=ctx;
  BUILD[t.type](stage,ctx);
  renderTickets(); renderCounters();
}
function cancelWork(){
  if(!state.active) return;
  const t=state.active;
  if(state._ctx) state._ctx._clean.forEach(f=>{try{f()}catch(e){}});
  t.status="open"; state.active=null; state._ctx=null;
  $("#workOverlay").classList.add("hidden");
  renderTickets(); renderCounters();
  if(state.overtime&&!state.ending) endDay();
}
function resolveTicket(t){
  state.active=null; state._ctx=null;
  $("#workOverlay").classList.add("hidden");
  t.status="done"; state.doneToday++; state.career++;
  emitMejaEvent("ticket-resolved",ticketEventPayload(t));
  state.catCount[t.type]=(state.catCount[t.type]||0)+1;
  const T=TYPES[t.type];
  let money=Math.round(T.base*PRIO_MULT[t.prio]*(1+(state.level-1)*0.1))*1000;
  let repGain=2+(t.prio===2?1:0);
  const fast=t.slaLeft>t.sla*0.4;
  if(fast) money+=Math.round(money*0.15);
  if(t.detail&&t.detail.complain){ money=Math.round(money*0.5); repGain-=2; }
  if(t.detail&&t.detail.clean) repGain+=1;
  state.money+=money; addRep(repGain); addXp(Math.round(T.base*PRIO_MULT[t.prio]/6));
  sfx.ok();
  toast(`<b>#${t.id} selesai!</b> +${fmtRp(money)}${fast?" (bonus cepat)":""} • REP +${repGain}`);
  logLine(`Tiket #${t.id} (${T.label}) selesai — +${fmtRp(money)}`,"ok");
  renderTickets(); renderCounters(); renderHUD();
  saveBest();
  if(state.overtime&&!state.active&&!state.ending) endDay();
}

/* ================================================================
   HARI & KARIER
   ================================================================ */
function startDay(){
  state.phase="work"; state.tickets=[]; state.timeMin=START_MIN;
  state.doneToday=0; state.lateToday=0; state.overtime=false; state.ending=false;
  state.catCount={}; state.active=null; state._ctx=null;
  $("#otBadge").classList.add("hidden");
  $("#sumOverlay").classList.add("hidden");
  $("#endConfirm").classList.add("hidden");
  $("#workOverlay").classList.add("hidden");
  const n=Math.min(9,3+state.level+rndi(0,1));
  state.spawnPlan=[2];
  for(let i=1;i<n;i++) state.spawnPlan.push(rndi(4,72));
  state.spawnPlan.sort((a,b)=>a-b);
  $("#logFeed").innerHTML="";
  logLine(`Hari ${state.day} dimulai. Kopi diseduh. Server menyala.`,"info");
  emitMejaEvent("day-started",{day:state.day});
  renderHUD(); renderTickets(); renderCounters();
}
function endDay(){
  if(state.ending) return;
  if(state.active){ cancelWork(); return; }
  state.ending=true; state.phase="summary";
  state.tickets.forEach(t=>{ if(t.status==="open"){ t.status="failed"; addRep(-4);
    logLine(`#${t.id} dibiarkan menggantung — reputasi −4`,"bad"); }});
  if(state.rep<=0){ gameOver(); return; }
  saveBest();
  const rows=state.tickets.map(t=>{
    const cls=t.status==="done"?"done":t.status==="late"?"late":"failed";
    const lbl=t.status==="done"?"SELESAI"+((t.detail&&t.detail.complain)?" (DIKOMPLAIN)":""):t.status==="late"?"TERLAMBAT":"GAGAL";
    return `<div class="sum-row">${ic(TYPES[t.type].icon,14)}<span>#${t.id}</span>
      <span style="color:var(--dim)">${TYPES[t.type].label}</span><span class="st ${cls}">${lbl}</span></div>`;
  }).join("")||`<div class="sum-row" style="color:var(--dim)">Tidak ada tiket hari ini. Hari yang tenang… mencurigakan.</div>`;
  const total=state.tickets.length;
  const doneN=state.tickets.filter(t=>t.status==="done").length;
  const ratio=total?doneN/total:1;
  const verdict= ratio>=0.85?["ISTIMEWA","var(--green)"]: ratio>=0.6?["BAIK","var(--green)"]:
                 ratio>=0.35?["CUKUP","var(--amber)"]:["BURUK","var(--red)"];
  $("#sumFrame").classList.remove("over-frame");
  $("#sumFrame").innerHTML=`
    <h2>Laporan Akhir Hari ${state.day}</h2>
    <div class="sub">GERBANG UTAMA DIKUNCI PUKUL ${fmtClock(Math.min(state.timeMin,END_MIN))}</div>
    <div class="sum-stamp" style="color:${verdict[1]};border-color:${verdict[1]}">${verdict[0]}</div>
    <div class="sum-list">${rows}</div>
    <div class="sum-nums">
      <div><label>SALDO SAAT INI</label><b>${fmtRp(state.money)}</b></div>
      <div><label>SELESAI</label><b class="gr">${doneN}/${total}</b></div>
      <div><label>TELAT/GAGAL</label><b class="rd">${total-doneN}</b></div>
      <div><label>REPUTASI</label><b class="${state.rep<25?"rd":"gr"}">${state.rep}/100</b></div>
    </div>
    <div class="actions-end">
      <button class="btn primary" id="btnNextDay">MULAI HARI ${state.day+1}</button>
    </div>`;
  $("#sumOverlay").classList.remove("hidden");
  sfx.stamp();
  $("#btnNextDay").onclick=()=>{ sfx.click(); state.day++; startDay(); };
}
function gameOver(){
  if(state.phase==="over") return;
  state.phase="over"; state.ending=true;
  if(state._ctx) state._ctx._clean.forEach(f=>{try{f()}catch(e){}});
  state.active=null; state._ctx=null;
  $("#workOverlay").classList.add("hidden");
  saveBest();
  $("#sumFrame").classList.add("over-frame");
  $("#sumFrame").innerHTML=`
    <h2 style="color:var(--red)">KARIER DI MEJA-IT BERAKHIR</h2>
    <div class="sub">REPUTASI NOL — MANAJEMEN MENGAMBIL KEPUTUSAN</div>
    <div class="sum-stamp" style="color:var(--red);border-color:var(--red)">DIPECAT</div>
    <p style="color:var(--dim);line-height:1.8;margin-bottom:18px">"Terima kasih atas pengabdiannya. Kami memutuskan untuk memindahkan Anda
    ke bagian <b style="color:var(--ink)">inventaris gudang</b>, tempat tidak ada komputer sama sekali."<br>— Manajemen, lewat surel otomatis</p>
    <div class="sum-nums">
      <div><label>TOTAL KARIER</label><b>${fmtRp(state.money)}</b></div>
      <div><label>BERTAHAN</label><b class="gr">${state.day} HARI</b></div>
      <div><label>TIKET SELESAI</label><b>${state.career}</b></div>
      <div><label>LEVEL AKHIR</label><b>LV ${state.level}</b></div>
    </div>
    <div class="actions-end"><button class="btn primary" id="btnRetry">LAMAR LAGI (MULAI ULANG)</button></div>`;
  $("#sumOverlay").classList.remove("hidden");
  sfx.bad();
  $("#btnRetry").onclick=()=>{ sfx.click();
    Object.assign(state,{day:1,money:0,rep:50,level:1,xp:0,career:0,phase:"start",
      tickets:[],active:null,catCount:{},overtime:false,ending:false});
    $("#sumOverlay").classList.add("hidden");
    $("#scrGame").classList.add("hidden");
    $("#scrStart").classList.remove("hidden");
    renderBest();
  };
}

/* ---------- kontrol ---------- */
$("#btnEndDay").onclick=()=>{
  if(state.phase!=="work"||state.active) return;
  const open=state.tickets.filter(t=>t.status==="open"&&!t.gone).length;
  $("#endWarn").innerHTML=open
    ?`Masih ada <b style="color:var(--red)">${open} tiket terbuka</b> yang akan terhitung gagal (reputasi −4 per tiket). Yakin tutup kas?`
    :"Semua tiket beres. Tutup kas sekarang?";
  $("#endConfirm").classList.remove("hidden");
};
$("#btnEndNo").onclick=()=>$("#endConfirm").classList.add("hidden");
$("#btnEndYes").onclick=()=>{ sfx.click(); $("#endConfirm").classList.add("hidden"); endDay(); };
$("#wfClose").onclick=cancelWork;
document.addEventListener("mejait:pixel-open-ticket",e=>{
  const id=e.detail&&typeof e.detail.id==="string"?e.detail.id:"";
  if(id) openWork(id);
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&state.active) cancelWork(); });
$("#btnMute").onclick=function(){
  state.mute=!state.mute;
  this.textContent="SUARA: "+(state.mute?"OFF":"ON");
};

/* ---------- layar awal ---------- */
function renderBest(){
  $("#bestLine").innerHTML=(best.money||best.day)
    ?`Rekor karier: <b>${fmtRp(best.money)}</b> • Bertahan <b>${best.day} hari</b>`
    :"Belum ada rekor. Jadilah legenda pertama.";
}
$("#skillList").innerHTML=Object.keys(TYPES).map(k=>
  `<span class="skill">${ic(TYPES[k].icon,13)}${TYPES[k].label}</span>`).join("");
$("#brandIco").innerHTML=ic("wrench",20);
$("#meIco").innerHTML=ic("user",26);
$("#hudMoney").innerHTML=ic("coins",15)+" <b>Rp 0</b>";
$("#hudRep").innerHTML=ic("star",15)+" <b>50</b>/100";
renderBest();

$("#btnStart").onclick=()=>{
  ac(); sfx.ok();
  $("#scrStart").classList.add("hidden");
  $("#scrGame").classList.remove("hidden");
  startDay();
  if(tickTimer===null) tickTimer=setInterval(tick,1000);
};
