export const TILE_SIZE = 32;

export const OFFICE_MAP = Object.freeze([
  '####################',
  '#........##........#',
  '#.DD.....##..DD....#',
  '#.DD.....##..DD....#',
  '#........##........#',
  '#..................#',
  '#..DD..P....DD..R..#',
  '#..DD.......DD.....#',
  '#..................#',
  '#....S.............#',
  '#..................#',
  '####################'
]);

export const OFFICE_ZONES = Object.freeze([
  Object.freeze({ id:'sales', label:'SALES', x:1, y:1, w:8, h:4 }),
  Object.freeze({ id:'finance', label:'FINANCE', x:11, y:1, w:8, h:4 }),
  Object.freeze({ id:'admin', label:'ADMIN', x:1, y:6, w:9, h:4 }),
  Object.freeze({ id:'meeting', label:'MEETING', x:11, y:6, w:8, h:4 }),
  Object.freeze({ id:'server', label:'SERVER', x:3, y:8, w:5, h:3 })
]);

export const INTERACTABLES = Object.freeze([
  Object.freeze({ id:'pc-sales', type:'pc', label:'PC Sales', x:3, y:2, dept:'Sales' }),
  Object.freeze({ id:'pc-finance', type:'pc', label:'PC Finance', x:14, y:2, dept:'Finance' }),
  Object.freeze({ id:'printer-admin', type:'printer', label:'Printer Admin', x:7, y:6, dept:'Admin' }),
  Object.freeze({ id:'router-meeting', type:'router', label:'Router Meeting', x:16, y:6, dept:'Meeting' }),
  Object.freeze({ id:'server-main', type:'server', label:'Server Utama', x:5, y:9, dept:'IT' })
]);

export const DEFAULT_PLAYER = Object.freeze({ x:2.5, y:10.2, dir:'up', speed:4.1 });

const BLOCKING = new Set(['#','D','P','R','S']);

export function tileAt(map, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[ty].length) return '#';
  return map[ty][tx];
}

export function isWalkable(map, x, y, radius = 0.26) {
  const points = [
    [x-radius,y-radius],[x+radius,y-radius],
    [x-radius,y+radius],[x+radius,y+radius]
  ];
  return points.every(([px,py]) => !BLOCKING.has(tileAt(map,px,py)));
}

export function movePlayer(player, dx, dy, dt, map = OFFICE_MAP) {
  const length = Math.hypot(dx,dy);
  if (!length || !Number.isFinite(dt) || dt <= 0) return { ...player };
  const nx = dx / length;
  const ny = dy / length;
  const speed = player.speed || DEFAULT_PLAYER.speed;
  const step = Math.min(dt,0.05) * speed;
  let x = player.x;
  let y = player.y;

  const tryX = x + nx * step;
  if (isWalkable(map,tryX,y)) x = tryX;

  const tryY = y + ny * step;
  if (isWalkable(map,x,tryY)) y = tryY;

  let dir = player.dir || 'down';
  if (Math.abs(nx) > Math.abs(ny)) dir = nx < 0 ? 'left' : 'right';
  else if (Math.abs(ny) > 0) dir = ny < 0 ? 'up' : 'down';

  return { ...player, x, y, dir };
}

export function nearestInteractable(player, objects = INTERACTABLES, maxDistance = 1.45) {
  let best = null;
  let bestDistance = Infinity;
  for (const object of objects) {
    const d = Math.hypot(player.x - (object.x + 0.5), player.y - (object.y + 0.5));
    if (d < bestDistance && d <= maxDistance) {
      best = object;
      bestDistance = d;
    }
  }
  return best ? { object:best, distance:bestDistance } : null;
}

export function targetForTicket(ticket, objects = INTERACTABLES) {
  if (!ticket) return null;
  const preferredType = ticket.type === 'printer' ? 'printer'
    : ticket.type === 'router' ? 'router'
    : ticket.type === 'pc' || ticket.type === 'hw' || ticket.type === 'sw' || ticket.type === 'install' || ticket.type === 'remote' || ticket.type === 'absen'
      ? 'pc'
      : null;

  const dept = String(ticket.dept || '').toLowerCase();
  const byDept = objects.find((object) => preferredType && object.type === preferredType && object.dept.toLowerCase() === dept);
  if (byDept) return byDept;

  const byType = objects.find((object) => preferredType && object.type === preferredType);
  return byType || objects[0] || null;
}
