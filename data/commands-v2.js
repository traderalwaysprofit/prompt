const groups = [
  ['visual','Visual, Sketsa & Diagram Teknis',['handwritten','visualize','stickynotes','infographic','diagram','flowchart','mindmap','xray','blueprint','explodedview','cutaway','anatomy','layers','crosssection','schematic','isometric']],
  ['perspective','Perspektif, Skala & Perbandingan Visual',['thenvsnow','timeline','beforeafter','comparison','versus','scale','evolution','future','inside','microscopic','macroscopic','birdseye','360view','benchmark']],
  ['system','Sistem, Proses & Arsitektur',['ecosystem','journey','process','cycle','roadmap','dashboard','map','heatmap','network','architecture','wireframe','mockup','prototype','marketmap']],
  ['creative','Desain Kreatif & Konten Pemasaran',['storyboard','comic','poster','cover','adcreative','thumbnail','carousel','socialvisual','quotevisual','pitch']],
  ['learning','Belajar & Mengajar',['eli5','expert','firstprinciples','deepdive','simplify','analogy','socratic','teachme','cheatsheet','flashcards','quiz','viva','interview']],
  ['critical','Berpikir Kritis & Analisis Masalah',['devilsadvocate','factcheck','mythvsfact','proscons','swot','pestle','fiveforces','rootcause','fivewhys','decisionmatrix','redteam','premortem','reverseengineer','aiaudit']],
  ['business','Strategi Bisnis & Simulasi',['scenario','simulate','roleplay','consultant','executivebrief','insights','recommendations','prioritize','strategy','businessmodel','investor']],
  ['productivity','Produktivitas, Riset & Eksekusi',['promptengineer','research','sources','summarize','extract','table','presentation','dashboardanalysis','actionplan']],
  ['communication','Komunikasi & Penulisan Profesional',['email','proposal','feedback','reply','narrative','newsletter','meetingnotes']],
  ['wellness','Pengembangan Diri & Wellness',['habittracker','goalsetting','morningroutine','timemanagement','reflection','stressrelief','careerpath']],
  ['ai','AI & Prompting Lanjutan',['metaprompt','chaining','systemprompt','fewshot','constraint','persona','autogpt','multimodel','autopilot']],
  ['data','Data & Analisis Kuantitatif',['statistics','trend','forecast','regression','distribution','kpi','abtest','datadict']],
  ['localization','Multibahasa & Lokalisasi',['translate','localize','glossary','transcreate','langlearn']],
  ['ux','Produk Digital & UX',['userresearch','personas','usability','onboarding','featurespec','prddraft','changelog']],
  ['interpersonal','Negosiasi & Komunikasi Interpersonal',['negotiate','conflict','persuade','delegate','motivate','apology']],
  ['coding','Coding & Teknis',['debug','codereview','techdoc','apidesign','databaseschema','gitworkflow','techstack','security','vibecode','github','cloudflare']],
  ['marketing','Marketing & Pemasaran Strategis',['contentstrategy','copywriting','funnel','brand','segmentation','pricestrategy','seocontent','campaign','competitor']],
  ['education','Education & Pengajaran Profesional',['curriculum','lessonplan','rubric','differentiate','flipped','pbl','edtech','assessment','lmscontent']],
  ['trading','Trading Forex & XAU',['fxanalysis','xauanalysis','snr','riskmgmt','tradejournal','tradingpsych','marketstructure','tradingplan','fundamental','pricecton']],
  ['design','Design & Kreatif Visual',['poster','flyer','idcard','logo','banner','billboard','coverdesign','thumbnail','socialdesign','tshirtdesign','brutalui']]
];
const categoryDescriptions = {
  visual:'Visualisasi penjelasan, ide, objek, dan struktur teknis.', perspective:'Perbandingan, skala, waktu, sudut pandang, dan benchmark.', system:'Proses, arsitektur, ekosistem, alur, dan sistem.', creative:'Konsep kreatif, iklan, storytelling, dan konten pemasaran.', learning:'Belajar, mengajar, latihan, dan evaluasi pemahaman.', critical:'Pengujian asumsi, verifikasi fakta, diagnosis, dan keputusan.', business:'Strategi, simulasi, konsultasi, prioritas, dan investasi.', productivity:'Riset, ekstraksi, ringkasan, struktur data, dan eksekusi.', communication:'Penulisan profesional dan komunikasi bisnis.', wellness:'Tujuan, kebiasaan, waktu, refleksi, dan pengembangan diri.', ai:'Prompt engineering, meta-prompt, persona, chaining, multi-model, dan otomasi AI.', data:'Statistik, tren, forecasting, eksperimen, KPI, dan dokumentasi data.', localization:'Terjemahan, lokalisasi, glosarium, transkreasi, dan pembelajaran bahasa.', ux:'Riset pengguna, UX, onboarding, spesifikasi fitur, PRD, dan release.', interpersonal:'Negosiasi, persuasi, konflik, delegasi, motivasi, dan apology.', coding:'Debugging, review, API, database, Git, vibe coding, Cloudflare, stack, dokumentasi, dan security.', marketing:'Strategi konten, copywriting, funnel, brand, SEO, campaign, dan kompetitor.', education:'Kurikulum, lesson plan, asesmen, diferensiasi, PBL, dan LMS.', trading:'Analisis forex/XAU, risk management, market structure, dan psikologi trading.', design:'Poster, flyer, ID card, logo, banner, billboard, thumbnail, brutalist UI, dan merchandise.'
};
const humanize = value => value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/-/g,' ');
const commands = [];
let id = 1;
for (const [categoryId, categoryName, names] of groups) {
  for (const name of names) {
    commands.push({id:id++,name:`/${name}`,categoryId,description:`${humanize(name)} — ${categoryDescriptions[categoryId]}`,template:`Gunakan ${humanize(name)} untuk topik: [TOPIK]. Hasil harus terstruktur, relevan, actionable, dan sesuai konteks pengguna.`});
  }
}
export { commands, groups, categoryDescriptions };
