import assert from 'node:assert/strict';
import {
  DEFAULT_PLAYER,
  INTERACTABLES,
  OFFICE_MAP,
  isWalkable,
  movePlayer,
  nearestInteractable,
  targetForTicket,
  tileAt
} from '../src/games/meja-it/pixel-office-core.js';

assert.equal(OFFICE_MAP.length,12);
assert.ok(OFFICE_MAP.every((row)=>row.length===20),'Office map rows must stay 20 tiles wide');
assert.equal(tileAt(OFFICE_MAP,0,0),'#');
assert.equal(tileAt(OFFICE_MAP,2.5,10.2),'.');
assert.equal(isWalkable(OFFICE_MAP,DEFAULT_PLAYER.x,DEFAULT_PLAYER.y),true);
assert.equal(isWalkable(OFFICE_MAP,.2,.2),false);

const moved=movePlayer(DEFAULT_PLAYER,1,0,.05);
assert.ok(moved.x>DEFAULT_PLAYER.x,'Player should move across walkable floor');
assert.equal(moved.dir,'right');

const wallStart={...DEFAULT_PLAYER,x:1.3,y:1.3,speed:8};
const intoWall=movePlayer(wallStart,-1,0,.05);
assert.ok(intoWall.x>=wallStart.x-.01,'Collision should stop the player crossing the wall');

const nearPrinter=nearestInteractable({x:7.5,y:5.5},INTERACTABLES,1.6);
assert.equal(nearPrinter?.object.id,'printer-admin');

assert.equal(targetForTicket({type:'printer',dept:'Admin'})?.id,'printer-admin');
assert.equal(targetForTicket({type:'router',dept:'Meeting'})?.id,'router-meeting');
assert.equal(targetForTicket({type:'pc',dept:'Sales'})?.id,'pc-sales');
assert.equal(targetForTicket({type:'sw',dept:'Finance'})?.id,'pc-finance');

console.log('MEJA-IT PIXEL OFFICE CORE TESTS: PASS');
