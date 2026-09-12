import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STATIC_STYLE_CLASSES = new Map([
  ['margin-right:auto;font-size:11px;color:#77704f', 'u-inst-step'],
  ['color:var(--green)', 'u-green'],
  ['position:relative', 'u-relative'],
  ['margin-bottom:6px', 'u-mb-6'],
  ['color:var(--dim)', 'u-dim'],
  ['color:var(--red)', 'u-red'],
  ['font-size:9.5px;letter-spacing:.12em', 'u-sla-label'],
  ['pointer-events:none', 'u-no-pointer'],
  ['width:100%;background:#0b0e07;border:1.5px solid var(--line2)', 'u-cctv-svg'],
  ['margin-top:18px;display:inline-block', 'u-mt18-inline'],
  ['font-size:13px', 'u-fs13'],
  ['display:flex;gap:26px;flex-wrap:wrap;margin-bottom:18px', 'u-flex-shift'],
  ['display:grid;grid-template-columns:1fr 250px;gap:24px;max-width:760px', 'u-router-grid'],
  ['display:grid;grid-template-columns:1fr 1fr;gap:12px', 'u-grid-2'],
  ['letter-spacing:0', 'u-letter-0'],
  ['display:flex;align-items:center;gap:12px', 'u-flex-center-12'],
  ['font-size:12px;color:var(--dim)', 'u-fs12-dim'],
  ['max-width:340px', 'u-max340'],
  ['max-width:420px', 'u-max420'],
  ['grid-template-columns:1fr 40px', 'u-slider-grid'],
  ['width:0', 'u-w0'],
  ['width:60%', 'u-w60'],
  ['display:block;margin:0 auto', 'u-block-center'],
  ['display:grid;gap:9px;margin-top:14px', 'u-actions-grid'],
  ['font-size:11px;opacity:.8', 'u-fs11-muted'],
  ['max-height:90px;overflow:hidden;font-size:11px;color:#55503a', 'u-license-copy'],
  ['border:1.5px solid #a39a76;height:18px;background:#efeada', 'u-inst-progress'],
  ['height:100%;width:0;background:#2c4a1a', 'u-inst-progress-bar'],
  ['font-size:11px;color:#77704f;margin-top:8px', 'u-inst-file'],
  ['color:#8a2f22', 'u-bundle-bad'],
  ['color:#2c4a1a', 'u-bundle-good'],
  ['margin-top:8px;border:1.5px solid #555;background:#efeada;padding:4px 16px;font-size:12px;cursor:pointer', 'u-retry'],
  ['color:var(--dim);line-height:1.8;margin-bottom:18px', 'u-over-copy'],
  ['color:var(--ink)', 'u-ink']
]);

function addClass(attrs, className) {
  if (/\bclass="[^"]*"/.test(attrs)) {
    return attrs.replace(/\bclass="([^"]*)"/, (_match, classes) => `class="${classes} ${className}"`);
  }
  return `${attrs} class="${className}"`;
}

function sanitizeStaticStyleAttributes(source) {
  return source.replace(/<([a-zA-Z][\w:-]*)([^<>]*?)\sstyle="([^"]*)"([^<>]*?)>/g,
    (full, tag, before, style, after) => {
      const className = STATIC_STYLE_CLASSES.get(style);
      if (!className) return full;
      const attrs = addClass(`${before}${after}`, className);
      return `<${tag}${attrs}>`;
    });
}

function sanitizeGameJs(source) {
  let js = source;

  js = js.replaceAll('style="width:${Math.min(100,n*25)}%"', 'class="cat-progress" data-progress="${Math.min(100,n*25)}"');
  js = js.replaceAll('style="width:${pct}%"', 'data-sla-progress="${pct}"');
  js = js.replaceAll('class="plug" style="background:${c.color}"', 'class="plug plug-${c.id}"');
  js = js.replaceAll('style="position:absolute;top:-3px;left:${target}%;width:12%;height:14px;background:rgba(168,224,74,.3);border:1.5px dashed var(--green)"', 'class="paper-target" data-target="${target}"');
  js = js.replaceAll('style="color:${verdict[1]};border-color:${verdict[1]}"', 'data-verdict-color="${verdict[1]}"');
  js = js.replaceAll('class="sum-stamp" style="color:var(--red);border-color:var(--red)"', 'class="sum-stamp is-red"');

  js = sanitizeStaticStyleAttributes(js);

  js = js.replace(
    '  }).join("");\n}\nfunction ticketHTML(t){',
    '  }).join("");\n  $("#catBars").querySelectorAll("[data-progress]").forEach(el=>{\n    el.style.width=`${Math.min(100,Number(el.dataset.progress)||0)}%`;\n  });\n}\nfunction ticketHTML(t){'
  );

  js = js.replace(
    '  list.innerHTML=vis.length?vis.map(ticketHTML).join(""):\n    `<div class="queue-empty">${state.overtime?"Semua tiket tertangani.<br>Segera tutup kas!":"Tidak ada tiket.<br>Nikmati kopimu sekarang."}</div>`;\n  list.querySelectorAll(".tk-go").forEach(b=>{',
    '  list.innerHTML=vis.length?vis.map(ticketHTML).join(""):\n    `<div class="queue-empty">${state.overtime?"Semua tiket tertangani.<br>Segera tutup kas!":"Tidak ada tiket.<br>Nikmati kopimu sekarang."}</div>`;\n  list.querySelectorAll("[data-sla-progress]").forEach(el=>{\n    el.style.width=`${Math.max(0,Math.min(100,Number(el.dataset.slaProgress)||0))}%`;\n  });\n  list.querySelectorAll(".tk-go").forEach(b=>{'
  );

  js = js.replace(
    '    const slide=body.querySelector("#prSlide");\n    slide.oninput=()=>body.querySelector("#prSlideV").textContent=slide.value;',
    '    const paperTarget=body.querySelector("[data-target]");\n    if(paperTarget) paperTarget.style.left=`${Number(paperTarget.dataset.target)||0}%`;\n    const slide=body.querySelector("#prSlide");\n    slide.oninput=()=>body.querySelector("#prSlideV").textContent=slide.value;'
  );

  js = js.replace(
    '    </div>`;\n  $("#sumOverlay").classList.remove("hidden");\n  sfx.stamp();',
    '    </div>`;\n  const verdictStamp=$("#sumFrame").querySelector("[data-verdict-color]");\n  if(verdictStamp){\n    verdictStamp.style.color=verdict[1];\n    verdictStamp.style.borderColor=verdict[1];\n  }\n  $("#sumOverlay").classList.remove("hidden");\n  sfx.stamp();'
  );

  if (/\sstyle=["']/.test(js)) {
    const sample = js.match(/.{0,80}\sstyle=["'][^\n]{0,160}/)?.[0] ?? 'unknown inline style';
    throw new Error(`MEJA-IT CSP sanitization incomplete: ${sample}`);
  }

  return js;
}

export async function sanitizeMejaIt(distRoot) {
  const gameDir = path.join(distRoot, 'src', 'games', 'meja-it');
  const jsPath = path.join(gameDir, 'meja-it.js');
  const htmlPath = path.join(gameDir, 'index.html');

  const [rawJs, html] = await Promise.all([
    readFile(jsPath, 'utf8'),
    readFile(htmlPath, 'utf8')
  ]);

  if (/\sstyle=["']/.test(html)) {
    throw new Error('MEJA-IT index.html still contains inline style attributes.');
  }

  const sanitizedJs = sanitizeGameJs(rawJs);
  await writeFile(jsPath, sanitizedJs);
}
