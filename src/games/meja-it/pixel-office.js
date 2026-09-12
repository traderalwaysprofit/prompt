import {
  DEFAULT_PLAYER,
  INTERACTABLES,
  OFFICE_MAP,
  OFFICE_ZONES,
  TILE_SIZE,
  movePlayer,
  nearestInteractable,
  targetForTicket
} from './pixel-office-core.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#pixelOfficeCanvas');
const shell = $('#pixelOffice');
const monitor = $('#opsMonitor');
const status = $('#pixelOfficeStatus');
const interactButton = $('#pixelInteract');
const btnWorld = $('#btnPixelOffice');
const btnMonitor = $('#btnOpsMonitor');

if (canvas && shell && monitor && status && interactButton && btnWorld && btnMonitor) {
  const ctx = canvas.getContext('2d', { alpha:false });
  let player = { ...DEFAULT_PLAYER };
  let keys = new Set();
  let touchVector = { x:0, y:0 };
  let last = performance.now();
  let running = true;
  let activeTicket = null;
  let activeTarget = null;
  let walkFrame = 0;
  let character = "male";
  try{
    const storedCharacter=localStorage.getItem("mejait_character");
    if(storedCharacter==="female"||storedCharacter==="male") character=storedCharacter;
  }catch(e){}

  const COLORS = {
    floor:'#171d18', wall:'#2c3329', line:'#4b5744', desk:'#755b3d',
    deskTop:'#9b7a52', screen:'#78d98b', ink:'#e6eadf', dim:'#92a18b',
    player:'#e9c46a', player2:'#264653', accent:'#9be564', marker:'#ffcf5a'
  };

  function setMode(mode) {
    const world = mode === 'world';
    shell.hidden = !world;
    monitor.hidden = world;
    btnWorld.setAttribute('aria-pressed', String(world));
    btnMonitor.setAttribute('aria-pressed', String(!world));
    if (world) {
      resizeCanvas();
      status.textContent = activeTicket
        ? `Tiket #${activeTicket.id}: menuju ${activeTarget?.label || 'lokasi masalah'}.`
        : 'Jelajahi kantor. Tiket aktif akan diberi marker.';
    }
  }

  btnWorld.addEventListener('click', () => setMode('world'));
  btnMonitor.addEventListener('click', () => setMode('monitor'));

  function resizeCanvas() {
    const logicalWidth = OFFICE_MAP[0].length * TILE_SIZE;
    const logicalHeight = OFFICE_MAP.length * TILE_SIZE;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = logicalWidth * ratio;
    canvas.height = logicalHeight * ratio;
    canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.imageSmoothingEnabled = false;
  }

  function drawTile(tile, x, y) {
    const px = x*TILE_SIZE;
    const py = y*TILE_SIZE;
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);
    ctx.strokeStyle = '#202820';
    ctx.strokeRect(px+.5,py+.5,TILE_SIZE-1,TILE_SIZE-1);

    if (tile === '#') {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);
      ctx.fillStyle = COLORS.line;
      ctx.fillRect(px,py+TILE_SIZE-5,TILE_SIZE,5);
    } else if (tile === 'D') {
      ctx.fillStyle = COLORS.desk;
      ctx.fillRect(px+2,py+5,TILE_SIZE-4,TILE_SIZE-10);
      ctx.fillStyle = COLORS.deskTop;
      ctx.fillRect(px+2,py+5,TILE_SIZE-4,5);
    } else if (tile === 'P') {
      ctx.fillStyle = '#bfc7be';
      ctx.fillRect(px+5,py+7,22,18);
      ctx.fillStyle = '#55605a';
      ctx.fillRect(px+8,py+10,16,5);
    } else if (tile === 'R') {
      ctx.fillStyle = '#2b3b32';
      ctx.fillRect(px+5,py+8,22,16);
      ctx.fillStyle = COLORS.screen;
      ctx.fillRect(px+8,py+12,3,3);
      ctx.fillRect(px+14,py+12,3,3);
    } else if (tile === 'S') {
      ctx.fillStyle = '#303a34';
      ctx.fillRect(px+6,py+3,20,26);
      ctx.fillStyle = COLORS.screen;
      for (let i=0;i<3;i++) ctx.fillRect(px+10,py+8+i*6,3,2);
    }
  }

  function drawZones() {
    ctx.save();
    ctx.font = '700 9px monospace';
    ctx.textBaseline = 'top';
    for (const zone of OFFICE_ZONES) {
      ctx.fillStyle = 'rgba(155,229,100,.06)';
      ctx.fillRect(zone.x*TILE_SIZE,zone.y*TILE_SIZE,zone.w*TILE_SIZE,zone.h*TILE_SIZE);
      ctx.fillStyle = COLORS.dim;
      ctx.fillText(zone.label,zone.x*TILE_SIZE+6,zone.y*TILE_SIZE+5);
    }
    ctx.restore();
  }

  function drawObjects() {
    for (const object of INTERACTABLES) {
      const x = object.x*TILE_SIZE;
      const y = object.y*TILE_SIZE;
      if (object.type === 'pc') {
        ctx.fillStyle = '#1b2621';
        ctx.fillRect(x+7,y+7,18,13);
        ctx.fillStyle = COLORS.screen;
        ctx.fillRect(x+10,y+10,12,7);
      }
    }
  }

  function drawMarker() {
    if (!activeTarget) return;
    const cx = (activeTarget.x+.5)*TILE_SIZE;
    const cy = activeTarget.y*TILE_SIZE-5;
    ctx.fillStyle = COLORS.marker;
    ctx.fillRect(cx-6,cy-12,12,12);
    ctx.fillStyle = '#1a1f1b';
    ctx.font = '900 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!',cx,cy-10);
    ctx.textAlign = 'start';
  }

  function drawPlayer(moving) {
    const px = player.x*TILE_SIZE;
    const py = player.y*TILE_SIZE;
    const bob = moving ? Math.floor(walkFrame)%2 : 0;

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(px-9,py+9,18,5);

    ctx.fillStyle = '#f0c7a0';
    ctx.fillRect(px-6,py-14+bob,12,9);
    ctx.fillStyle = character==="female" ? '#4a2f2a' : '#2c211d';
    if(character==="female"){
      ctx.fillRect(px-8,py-16+bob,16,5);
      ctx.fillRect(px-8,py-11+bob,4,10);
      ctx.fillRect(px+4,py-11+bob,4,10);
    }else{
      ctx.fillRect(px-7,py-16+bob,14,5);
    }
    ctx.fillStyle = COLORS.player2;
    ctx.fillRect(px-7,py-5+bob,14,12);
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(px-7,py+1+bob,14,4);

    ctx.fillStyle = '#d7ded8';
    const phase = moving ? Math.floor(walkFrame)%2 : 0;
    ctx.fillRect(px-6+(phase?2:0),py+7,4,7);
    ctx.fillRect(px+2-(phase?2:0),py+7,4,7);
  }

  function render(moving=false) {
    canvas.dataset.playerX = player.x.toFixed(3);
    canvas.dataset.playerY = player.y.toFixed(3);
    canvas.dataset.playerDir = player.dir;
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0,0,OFFICE_MAP[0].length*TILE_SIZE,OFFICE_MAP.length*TILE_SIZE);
    OFFICE_MAP.forEach((row,y) => [...row].forEach((tile,x) => drawTile(tile,x,y)));
    drawZones();
    drawObjects();
    drawMarker();
    drawPlayer(moving);

    const near = nearestInteractable(player);
    interactButton.disabled = !near;
    interactButton.textContent = near ? `INTERACT · ${near.object.label}` : 'INTERACT';
  }

  function movementVector() {
    let x = touchVector.x;
    let y = touchVector.y;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) x += 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) y += 1;
    return {x,y};
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now-last)/1000,.05);
    last = now;
    const vector = movementVector();
    const moving = vector.x !== 0 || vector.y !== 0;
    if (!shell.hidden && moving) {
      player = movePlayer(player,vector.x,vector.y,dt);
      walkFrame += dt*9;
    }
    if (!shell.hidden) render(moving);
    requestAnimationFrame(frame);
  }

  function tryInteract() {
    const near = nearestInteractable(player);
    if (!near) return;
    const object = near.object;

    if (activeTicket && activeTarget && object.id === activeTarget.id) {
      status.textContent = `Membuka tiket #${activeTicket.id} di ${object.label}…`;
      document.dispatchEvent(new CustomEvent('mejait:pixel-open-ticket',{detail:{id:activeTicket.id,objectId:object.id}}));
      return;
    }

    status.textContent = `${object.label}: tidak ada tindakan wajib saat ini.`;
  }

  interactButton.addEventListener('click',tryInteract);

  document.addEventListener('keydown',(event) => {
    if (shell.hidden) return;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d','W','A','S','D'].includes(event.key)) {
      event.preventDefault();
      keys.add(event.key);
    }
    if ((event.key === 'Enter' || event.key === ' ') && !interactButton.disabled) {
      event.preventDefault();
      tryInteract();
    }
  });
  document.addEventListener('keyup',(event) => keys.delete(event.key));

  document.querySelectorAll('[data-pixel-dir]').forEach((button) => {
    const vectors = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const dir = button.dataset.pixelDir;
    const start = (event) => {
      event.preventDefault();
      const [x,y] = vectors[dir];
      touchVector = {x,y};
      button.setPointerCapture?.(event.pointerId);
    };
    const stop = () => { touchVector = {x:0,y:0}; };
    button.addEventListener('pointerdown',start);
    button.addEventListener('pointerup',stop);
    button.addEventListener('pointercancel',stop);
    button.addEventListener('lostpointercapture',stop);
  });

  document.addEventListener('mejait:ticket-spawned',(event) => {
    activeTicket = event.detail || null;
    activeTarget = targetForTicket(activeTicket);
    if (!shell.hidden && activeTicket) status.textContent = `Tiket #${activeTicket.id}: menuju ${activeTarget?.label || 'lokasi masalah'}.`;
  });

  document.addEventListener('mejait:ticket-opened',(event) => {
    if (activeTicket?.id === event.detail?.id) status.textContent = `Tiket #${activeTicket.id} sedang dikerjakan.`;
  });

  document.addEventListener('mejait:ticket-resolved',(event) => {
    if (activeTicket?.id === event.detail?.id) {
      status.textContent = `Tiket #${activeTicket.id} selesai. Tunggu tiket berikutnya.`;
      activeTicket = null;
      activeTarget = null;
    }
  });

  document.addEventListener('mejait:character-changed',(event) => {
    character = event.detail?.character === 'female' ? 'female' : 'male';
    if (!shell.hidden) render(false);
  });

  document.addEventListener('mejait:day-started',(event) => {
    character = event.detail?.character === 'female' ? 'female' : character;
    player = { ...DEFAULT_PLAYER };
    activeTicket = null;
    activeTarget = null;
    status.textContent = 'Shift dimulai. Jelajahi kantor sambil menunggu tiket.';
  });

  window.addEventListener('resize',resizeCanvas);
  document.addEventListener('visibilitychange',() => {
    running = !document.hidden;
    if (running) {
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  resizeCanvas();
  render(false);
  setMode(window.matchMedia('(max-width: 700px)').matches ? 'world' : 'monitor');
  requestAnimationFrame(frame);
}
