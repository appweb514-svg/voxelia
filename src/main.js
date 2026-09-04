// VOXELIA — boucle principale. Monde voxel procédural, survie, artisanat. Assets 100% originaux.
import * as THREE from 'three';
import './style.css';
import { CHUNK, WORLD_H, SEA, REACH } from './core/config.js';
import { B, PROPS, TOOLS, ITEMS, BLOCK_ITEM, displayName, isOpaque } from './core/blocks.js';
import { buildAtlas, iconFor } from './core/textures.js';
import { makeWorldGen } from './core/worldgen.js';
import { World } from './core/world.js';
import { meshChunk, torchMeshes } from './core/mesher.js';
import { Player } from './player/player.js';
import { Inventory, emptySlot, matchRecipe, craftConsume, SMELT, FUEL } from './player/inventory.js';
import { MobManager } from './mobs/mobs.js';
import { Sky } from './core/sky.js';
import { Particles } from './core/particles.js';
import { sfx, setVolume, startMusic } from './core/audio.js';
import { saveGame, loadGame, hasSave, saveOptions, loadOptions } from './core/save.js';

window.__THREE__ = THREE;
const $ = (id) => document.getElementById(id);
const err = (m) => { const e = $('errbox'); e.classList.remove('hidden'); e.textContent = m; setTimeout(() => e.classList.add('hidden'), 5000); };
window.addEventListener('error', (e) => err('Erreur : ' + (e.message || 'inconnue')));

const opts = Object.assign({ dist: 4, sens: 1, vol: 70 }, loadOptions());
setVolume(opts.vol / 100);

// ---------- État global ----------
let renderer, scene, camera, world, gen, player, inv, mobs, sky, particles;
let seed = 'voxelia-' + Math.floor(Math.random() * 99999);
let chunkMeshes = new Map(); // "cx,cz" -> Group
let mats = null, torchMat = null;
let journal = []; // diffs pour sauvegarde
let drops = []; // {mesh, id, n, vel, t}
let playing = false, paused = false, invOpen = false, furnaceOpen = false, deadOpen = false;
let mineT = 0, mineKey = null, breakFx = 0;
let attackCd = 0, stepT = 0, saveT = 0, debug = false;
let craftGrid = Array.from({ length: 9 }, emptySlot);
let craftBig = false;
let furnace = { in: emptySlot(), fuel: emptySlot(), out: emptySlot(), prog: 0, burn: 0 };
let activeFurnacePos = null;
let drag = null; // {slot, from}
let highlight = null, hlLine = null;
let timePlayed = 0;

// ---------- Boot / menus ----------
function initThree() {
  const canvas = $('game');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.1, 600);
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const atlas = buildAtlas();
  mats = {
    opaque: new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true }),
    trans: new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  };
  torchMat = new THREE.MeshBasicMaterial({ color: 0xffc94d });
  highlight = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  highlight.visible = false; scene.add(highlight);
  particles = new Particles(scene);
}

function newWorld(seedStr, saved) {
  seed = seedStr;
  gen = makeWorldGen(seed);
  world = new World(gen);
  world.journal = journal = saved?.edits ?? [];
  if (saved?.edits) for (const [x, y, z, id] of saved.edits) world.set(x, y, z, id, false);
  for (const m of chunkMeshes.values()) { scene.remove(m); disposeGroup(m); }
  chunkMeshes.clear();
  for (const d of [...drops]) scene.remove(d.mesh);
  drops = [];
  mobs.mobs.slice().forEach(m => mobs.kill(m, null, false));
  mobs.mobs = [];
  const sp = saved?.player ?? gen.spawnPoint();
  player.spawn(sp);
  if (saved?.player) { player.hp = saved.player.hp; player.food = saved.player.food; player.yaw = saved.player.yaw ?? 0; player.pitch = 0; sky.t = saved.time ?? 0.32; }
  if (saved?.inv) inv.load(saved.inv);
  else {
    inv = new Inventory();
    inv.add(5, 8); inv.add(7, 8); inv.add('apple', 3); inv.add(15, 4);
  }
  if (saved?.furnace) furnace = saved.furnace;
  timePlayed = 0;
}

function disposeGroup(g) { g.traverse(o => { if (o.geometry && o.geometry !== undefined && !o.userData.shared) o.geometry.dispose?.(); }); }

// ---------- Chunks streaming ----------
let loadQueue = [], loadQCenter = null;
function updateChunks(forceCenter) {
  const pcx = Math.floor(player.pos.x / CHUNK), pcz = Math.floor(player.pos.z / CHUNK);
  const d = opts.dist;
  // décharge
  for (const k of [...chunkMeshes.keys()]) {
    const [cx, cz] = k.split(',').map(Number);
    if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) > d) { const g = chunkMeshes.get(k); scene.remove(g); disposeGroup(g); chunkMeshes.delete(k); }
  }
  world.unloadFar(pcx, pcz, d);
  // dirty d'abord
  for (const k of [...world.dirty]) {
    const [cx, cz] = k.split(',').map(Number);
    if (Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) <= d) { rebuildChunk(cx, cz); world.dirty.delete(k); }
  }
  // file de chargement par distance croissante (reconstruite si le centre a bougé)
  const qc = pcx + ',' + pcz;
  if (!loadQueue.length || loadQCenter !== qc) {
    loadQCenter = qc;
    const list = [];
    for (let r = 0; r <= d; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const k = (pcx + dx) + ',' + (pcz + dz);
      if (!chunkMeshes.has(k)) list.push([r, k, pcx + dx, pcz + dz]);
    }
    loadQueue = list;
  }
  // construit max 2 chunks / frame
  let built = 0;
  while (loadQueue.length && built < 2) {
    const [, k, cx, cz] = loadQueue.shift();
    if (chunkMeshes.has(k)) continue;
    const [ccx, ccz] = k.split(',').map(Number);
    if (Math.max(Math.abs(ccx - pcx), Math.abs(ccz - pcz)) > d) continue;
    world.getChunk(cx, cz);
    rebuildChunk(cx, cz);
    built++;
    const total = (2 * d + 1) ** 2;
    $('loadfill').style.width = Math.round((chunkMeshes.size / total) * 100) + '%';
  }
  if (forceCenter !== undefined) void forceCenter;
}
function rebuildChunk(cx, cz) {
  const k = cx + ',' + cz;
  const old = chunkMeshes.get(k);
  if (old) { scene.remove(old); disposeGroup(old); }
  const g = meshChunk(world, cx, cz, mats);
  const t = torchMeshes(world, cx, cz, torchMat);
  g.add(t);
  // perf : seules les torches des chunks adjacents au joueur éclairent vraiment
  const pcx = Math.floor(player.pos.x / CHUNK), pcz = Math.floor(player.pos.z / CHUNK);
  const near = Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz)) <= 1;
  let lights = 0;
  t.children.forEach(o => { if (o.isPointLight) { lights++; if (!near || lights > 6) o.intensity = 0; } });
  scene.add(g);
  chunkMeshes.set(k, g);
}

// ---------- Raycast voxel (DDA) ----------
function rayVoxel(maxD = REACH) {
  const o = camera.position.clone();
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const stx = Math.sign(dir.x), sty = Math.sign(dir.y), stz = Math.sign(dir.z);
  const tdx = stx !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tdy = sty !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tdz = stz !== 0 ? Math.abs(1 / dir.z) : Infinity;
  let tmx = stx !== 0 ? (stx > 0 ? (x + 1 - o.x) : (o.x - x)) * tdx : Infinity;
  let tmy = sty !== 0 ? (sty > 0 ? (y + 1 - o.y) : (o.y - y)) * tdy : Infinity;
  let tmz = stz !== 0 ? (stz > 0 ? (z + 1 - o.z) : (o.z - z)) * tdz : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 128; i++) {
    const b = world.get(x, y, z);
    if (b !== B.AIR && b !== B.WATER) return { x, y, z, nx, ny, nz, id: b, dist: t };
    if (tmx < tmy && tmx < tmz) { x += stx; t = tmx; tmx += tdx; nx = -stx; ny = 0; nz = 0; }
    else if (tmy < tmz) { y += sty; t = tmy; tmy += tdy; nx = 0; ny = -sty; nz = 0; }
    else { z += stz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -stz; }
    if (t > maxD) return null;
  }
  return null;
}

// ---------- Casser / poser ----------
function toolMult(blockId) {
  const sel = inv.selected();
  const tool = TOOLS[sel.id] ?? TOOLS.hand;
  const p = PROPS[blockId];
  if (!p) return { mult: 1, ok: true };
  let mult = 1;
  if (p.tool && tool.kind === p.tool) mult = tool.mult;
  if (p.tool === 'sword' || !p.tool) mult = 1;
  const ok = (p.lvl ?? 0) <= (tool.lvl ?? 0) || !p.tool;
  return { mult, ok };
}
function breakTime(id) {
  const p = PROPS[id];
  if (!p || p.hard === Infinity) return Infinity;
  const { mult, ok } = toolMult(id);
  if (!ok) return p.hard * 5;
  return Math.max(0.08, p.hard / mult);
}
function tryBreak(dt) {
  const hit = rayVoxel();
  if (!hit) { mineT = 0; mineKey = null; return; }
  const key = hit.x + ',' + hit.y + ',' + hit.z;
  if (mineKey !== key) { mineT = 0; mineKey = key; }
  const need = breakTime(hit.id);
  if (need === Infinity) return;
  mineT += dt;
  highlight.visible = true;
  highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  highlight.material.opacity = 0.15 + 0.3 * Math.min(1, mineT / need);
  // particules de fissure
  if (Math.random() < dt * 12) particles.spawn(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0x8a7a6a, 2, 1.5, 2);
  if (mineT >= need) {
    mineT = 0;
    const { ok } = toolMult(hit.id);
    const dropId = BLOCK_ITEM[hit.id];
    world.set(hit.x, hit.y, hit.z, B.AIR);
    journal.push([hit.x, hit.y, hit.z, B.AIR]);
    sfx.breakBlock();
    particles.spawn(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 0x9a8a72, 14, 2.5, 3.5);
    const sel = inv.selected();
    if (TOOLS[sel.id]?.dura) if (inv.damageSelected(1)) { toast(`${displayName(sel.id)} s'est brisé !`); sfx.hit(); }
    if (dropId !== undefined && ok) spawnDrop(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, dropId, 1);
    else if (dropId !== undefined && !ok) toast('Outil trop faible — améliorez votre pioche !');
    if (hit.id === B.LEAVES && Math.random() < 0.12) spawnDrop(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 'apple', 1);
    if (hit.id === B.COAL_ORE || hit.id === B.DIAMOND_ORE) gainXp(3);
    if (hit.id === B.IRON_ORE || hit.id === B.GOLD_ORE) gainXp(2);
    renderHotbar(); renderInv();
  }
}
function tryPlace() {
  const hit = rayVoxel();
  if (!hit) return;
  // clic sur établi / fourneau -> ouvre UI au lieu de poser si main vide ? non : clic droit ouvre toujours l'UI ciblée
  if (hit.id === B.CRAFT && !invOpen) { openInventory(true); return; }
  if (hit.id === B.FURNACE && !furnaceOpen) { openFurnace(hit); return; }
  const sel = inv.selected();
  if (!sel.id) return;
  const blockId = typeof sel.id === 'number' ? sel.id : null;
  if (!blockId) { // nourriture ?
    const it = ITEMS[sel.id];
    if (it?.food && (player.food < 20 || player.hp < 20)) {
      sel.n -= 1; if (!sel.n) { sel.id = null; }
      player.eat(it.food); player.heal(1); sfx.eat(); renderHotbar(); renderInv();
    }
    return;
  }
  const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nx * 0 + hit.nz;
  const qx = hit.x + hit.nx, qy = hit.y + hit.ny, qz = hit.z + hit.nz;
  void px; void py; void pz;
  const cur = world.get(qx, qy, qz);
  if (cur !== B.AIR && cur !== B.WATER) return;
  // ne pas se coincer dans le joueur
  const bb = new THREE.Box3(new THREE.Vector3(qx, qy, qz), new THREE.Vector3(qx + 1, qy + 1, qz + 1));
  const pb = new THREE.Box3(new THREE.Vector3(player.pos.x - 0.3, player.pos.y, player.pos.z - 0.3), new THREE.Vector3(player.pos.x + 0.3, player.pos.y + 1.8, player.pos.z + 0.3));
  if (blockId !== B.TORCH && bb.intersectsBox(pb)) return;
  // torche : doit être sur un support
  if (blockId === B.TORCH && world.get(qx, qy - 1, qz) === B.AIR) { toast('Une torche a besoin d\'un support !'); return; }
  world.set(qx, qy, qz, blockId);
  journal.push([qx, qy, qz, blockId]);
  sel.n -= 1; if (!sel.n) { sel.id = null; }
  sfx.place();
  renderHotbar(); renderInv();
}
function attack() {
  if (attackCd > 0) return;
  attackCd = 0.35;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const mob = mobs.hitTest(camera.position, dir, 4);
  const sel = inv.selected();
  const tool = TOOLS[sel.id] ?? TOOLS.hand;
  if (mob) {
    const dmg = tool.dmg + (player.xplvl * 0.2);
    const dead = mob.damage(dmg, dir.x * 5, dir.z * 5);
    mob.flee = 1.2; mob.fleeX = dir.x; mob.fleeZ = dir.z;
    sfx.hit();
    particles.spawn(mob.pos.x, mob.pos.y + 1, mob.pos.z, 0xff3333, 10, 2, 3);
    $('hitmarker').classList.remove('show'); void $('hitmarker').offsetWidth; $('hitmarker').classList.add('show');
    if (TOOLS[sel.id]?.dura) if (inv.damageSelected(1)) toast(`${displayName(sel.id)} s'est brisé !`);
    if (dead) {
      mobs.kill(mob, (m) => {
        if (m.drop) spawnDrop(m.pos.x, m.pos.y + 0.5, m.pos.z, m.drop, m.kind === 'sheep' ? 1 + (Math.random() * 2 | 0) : 1);
        if (m.kind === 'zombie') { gainXp(5); sfx.levelup(); }
        else gainXp(2);
      });
    }
    renderHotbar();
  } else {
    // coup dans le vide : léger swing sonore seulement si mob proche
  }
}

// ---------- Drops ramassables ----------
const dropGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const texLoader = new THREE.TextureLoader();
function spawnDrop(x, y, z, id, n) {
  const tex = new THREE.Texture();
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  texLoader.load(iconFor(id), (img) => { tex.image = img; tex.needsUpdate = true; });
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const mesh = new THREE.Mesh(dropGeo, mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  drops.push({ mesh, id, n, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 4, (Math.random() - 0.5) * 3), t: 0 });
}
function updateDrops(dt) {
  for (const d of [...drops]) {
    d.t += dt;
    d.vel.y -= 18 * dt;
    d.mesh.position.addScaledVector(d.vel, dt);
    d.mesh.rotation.y += dt * 2;
    const bx = Math.floor(d.mesh.position.x), by = Math.floor(d.mesh.position.y), bz = Math.floor(d.mesh.position.z);
    const b = world.get(bx, by, bz);
    if (b !== B.AIR && b !== B.WATER && d.vel.y < 0) { d.mesh.position.y = by + 1.15; d.vel.set(0, 0, 0); }
    const pd = d.mesh.position.distanceTo(new THREE.Vector3(player.pos.x, player.pos.y + 1, player.pos.z));
    if (d.t > 0.6 && pd < 3) {
      const dir = new THREE.Vector3(player.pos.x - d.mesh.position.x, (player.pos.y + 0.8) - d.mesh.position.y, player.pos.z - d.mesh.position.z).normalize();
      d.mesh.position.addScaledVector(dir, dt * (6 - pd * 1.5));
    }
    if (d.t > 0.8 && pd < 1.1) {
      const left = inv.add(d.id, d.n);
      if (left === 0) { scene.remove(d.mesh); drops.splice(drops.indexOf(d), 1); sfx.pop(); renderHotbar(); renderInv(); }
      else d.n = left;
    }
    if (d.t > 120) { scene.remove(d.mesh); drops.splice(drops.indexOf(d), 1); }
  }
}

// ---------- XP ----------
function gainXp(n) {
  player.xp += n;
  let need = 7 + player.xplvl * 4;
  while (player.xp >= need) { player.xp -= need; player.xplvl++; sfx.levelup(); toast(`Niveau ${player.xplvl} !`); need = 7 + player.xplvl * 4; }
  renderVitals();
}

// ---------- UI : hotbar / vitals ----------
function slotEl(s, opts = {}) {
  const d = document.createElement('div');
  d.className = 'slot' + (opts.sel ? ' sel' : '') + (opts.out ? ' out' : '');
  if (s.id !== null && s.id !== undefined) {
    const img = document.createElement('img'); img.src = iconFor(s.id); img.alt = displayName(s.id); img.draggable = false;
    d.appendChild(img);
    if (s.n > 1) { const n = document.createElement('span'); n.className = 'n'; n.textContent = s.n; d.appendChild(n); }
    const t = TOOLS[s.id];
    if (t?.dura && s.dura != null) { const bar = document.createElement('div'); bar.className = 'dmg'; const f = document.createElement('div'); f.style.width = Math.max(0, s.dura / t.dura * 100) + '%'; bar.appendChild(f); d.appendChild(bar); }
    d.title = displayName(s.id);
  }
  return d;
}
function renderHotbar() {
  const hb = $('hotbar'); hb.innerHTML = '';
  inv.hot.forEach((s, i) => {
    const el = slotEl(s, { sel: i === inv.sel });
    hb.appendChild(el);
  });
  const sel = inv.selected();
  if (sel.id) { const bn = $('blockname'); bn.textContent = displayName(sel.id); bn.classList.add('show'); clearTimeout(bn._t); bn._t = setTimeout(() => bn.classList.remove('show'), 1200); }
}
function renderVitals() {
  const hearts = $('hearts'), hunger = $('hunger');
  hearts.innerHTML = ''; hunger.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const hp = player.hp - i * 2;
    hearts.innerHTML += hp >= 2 ? '❤️' : hp >= 1 ? '💔' : '🖤';
    const fp = player.food - i * 2;
    hunger.innerHTML += fp >= 2 ? '🍖' : fp >= 1 ? '🍗' : '🦴';
  }
  $('xpfill').style.width = (player.xp / (7 + player.xplvl * 4) * 100) + '%';
  $('xplvl').textContent = 'Niveau ' + player.xplvl;
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 4000);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}

// ---------- UI : inventaire + artisanat ----------
function bindSlot(el, get, set, opts = {}) {
  el.innerHTML = '';
  const s = get();
  const inner = slotEl(s, opts);
  while (inner.children.length) el.appendChild(inner.children[0]);
  el.className = inner.className + (opts.cls ? ' ' + opts.cls : '');
  el.title = s.id ? displayName(s.id) : (el.title || '');
  el.onmousedown = (e) => {
    e.preventDefault();
    if (opts.readonly) { // sortie artisanat / fourneau
      if (s.id && e.button === 0) {
        if (!drag) { drag = { slot: { ...s }, from: null, out: opts.take }; showGhost(e); }
      }
      return;
    }
    if (e.button === 2) { // clic droit : poser 1 / prendre moitié
      if (!drag && s.id) {
        const half = Math.ceil(s.n / 2);
        drag = { slot: { id: s.id, n: half, dura: s.dura }, from: null };
        s.n -= half; if (s.n <= 0) { s.id = null; s.dura = null; }
        refreshAll(); showGhost(e);
      } else if (drag && !drag.out) {
        if (!s.id) { s.id = drag.slot.id; s.n = 1; s.dura = drag.slot.dura; drag.slot.n -= 1; if (!drag.slot.n) { drag = null; hideGhost(); } refreshAll(); }
        else if (s.id === drag.slot.id && s.n < 64 && !TOOLS[s.id]) { s.n += 1; drag.slot.n -= 1; if (!drag.slot.n) { drag = null; hideGhost(); } refreshAll(); }
      }
      return;
    }
    // clic gauche
    if (e.shiftKey && s.id && opts.quick) { quickMove(s); return; }
    if (!drag) {
      if (s.id) { drag = { slot: { ...s }, from: set }; set(emptySlot()); refreshAll(); showGhost(e); }
    } else {
      if (drag.out) { // on vient d'une sortie : ne peut que déposer dans inventaire vide/compatible... ici on drop dans ce slot
        if (!s.id) { set({ ...drag.slot }); drag = null; hideGhost(); refreshAll(); }
        else if (s.id === drag.slot.id && !TOOLS[s.id]) { const t = Math.min(64 - s.n, drag.slot.n); s.n += t; drag.slot.n -= t; if (!drag.slot.n) { drag = null; hideGhost(); } refreshAll(); }
      } else if (!s.id) { set({ ...drag.slot }); drag = null; hideGhost(); refreshAll(); }
      else if (s.id === drag.slot.id && !TOOLS[s.id]) {
        const t = Math.min(64 - s.n, drag.slot.n); s.n += t; drag.slot.n -= t;
        if (!drag.slot.n) { drag = null; hideGhost(); }
        refreshAll();
      } else { const tmp = { ...s }; set({ ...drag.slot }); drag.slot = tmp; refreshAll(); }
    }
  };
  el.onmouseenter = () => { };
}
function quickMove(s) {
  // transfert rapide hotbar <-> inventaire
  const src = [...inv.hot, ...inv.main].find(x => x === s);
  const inHot = inv.hot.includes(src);
  const dstArr = inHot ? inv.main : inv.hot;
  const id = s.id, n0 = s.n;
  for (const d of dstArr) { if (d.id === id && d.n < 64 && !TOOLS[id]) { const t = Math.min(64 - d.n, s.n); d.n += t; s.n -= t; if (!s.n) break; } }
  if (s.n > 0) { const free = dstArr.find(d => !d.id); if (free) { free.id = s.id; free.n = s.n; free.dura = s.dura; s.id = null; s.n = 0; s.dura = null; } }
  void n0;
  refreshAll();
}
function showGhost(e) {
  hideGhost();
  if (!drag) return;
  const g = document.createElement('div'); g.id = 'drag-ghost';
  const img = document.createElement('img'); img.src = iconFor(drag.slot.id); g.appendChild(img);
  if (drag.slot.n > 1) { const n = document.createElement('span'); n.className = 'n'; n.textContent = drag.slot.n; n.style.cssText = 'position:absolute;right:0;bottom:0;color:#fff;font-weight:bold;text-shadow:1px 1px 0 #000'; g.appendChild(n); }
  g.style.left = (e.clientX - 22) + 'px'; g.style.top = (e.clientY - 22) + 'px';
  document.body.appendChild(g);
}
function hideGhost() { $('drag-ghost')?.remove(); }
window.addEventListener('mousemove', (e) => { const g = $('drag-ghost'); if (g) { g.style.left = (e.clientX - 22) + 'px'; g.style.top = (e.clientY - 22) + 'px'; } });

function currentCraftCells() {
  return craftBig ? craftGrid.map(s => s.id) : [craftGrid[0], craftGrid[1], craftGrid[3], craftGrid[4]].map(s => s?.id ?? null).concat([null, null, null, null, null]);
}
function craftCellsForMatch() {
  if (craftBig) return craftGrid.map(s => s.id ?? null);
  // grille 2x2 mappée en haut-gauche du 3x3
  const c = [null, null, null, null, null, null, null, null, null];
  c[0] = craftGrid[0].id ?? null; c[1] = craftGrid[1].id ?? null; c[3] = craftGrid[3].id ?? null; c[4] = craftGrid[4].id ?? null;
  return c;
}
function renderCraft() {
  const grid = $('craft-grid');
  grid.innerHTML = '';
  grid.className = craftBig ? '' : 'small';
  $('craft-size-label').textContent = craftBig ? '3×3 (établi)' : '2×2';
  const cells = craftBig ? craftGrid : [craftGrid[0], craftGrid[1], craftGrid[3], craftGrid[4]];
  const idxMap = craftBig ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 3, 4];
  cells.forEach((s, i) => {
    const gi = idxMap[i];
    const el = document.createElement('div');
    bindSlot(el, () => craftGrid[gi], (v) => { craftGrid[gi] = v; }, {});
    if (!craftBig) el.classList.add('craft2');
    grid.appendChild(el);
  });
  if (!craftBig) { for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'slot extra'; d.style.display = 'none'; grid.appendChild(d); } }
  const recipe = matchRecipe(craftCellsForMatch());
  const out = $('craft-out');
  const res = recipe ? { id: normalizeOut(recipe.out), n: recipe.outN, dura: TOOLS[recipe.out]?.dura ?? null } : emptySlot();
  const take = recipe ? { recipe } : null;
  bindSlot(out, () => res, () => { }, { out: true, readonly: true, take });
  out.onmousedown = (e) => {
    if (!recipe || e.button !== 0 || drag) return;
    // vérifie place
    const test = [...inv.hot, ...inv.main].some(s => !s.id || (s.id === res.id && s.n + res.n <= 64 && !TOOLS[res.id]));
    if (!test && TOOLS[res.id]) { if (![...inv.hot, ...inv.main].some(s => !s.id)) { toast('Inventaire plein !'); return; } }
    if (craftConsume(inv, craftGrid, recipe)) {
      const left = inv.add(res.id, res.n);
      if (left > 0) spawnDrop(player.pos.x, player.pos.y + 1, player.pos.z, res.id, left);
      sfx.craft(); gainXp(1);
      refreshAll();
    }
  };
}
function normalizeOut(o) { return o; }
function renderInv() {
  const g = $('inv-grid'); if (!g) return; g.innerHTML = '';
  $('inv-count').textContent = inv.main.filter(s => s.id).length;
  inv.main.forEach((s) => {
    const el = document.createElement('div');
    bindSlot(el, () => s, (v) => { Object.assign(s, v); }, { quick: true });
    g.appendChild(el);
  });
  const hb = $('inv-hotbar'); hb.innerHTML = '';
  inv.hot.forEach((s) => {
    const el = document.createElement('div');
    bindSlot(el, () => s, (v) => { Object.assign(s, v); }, { quick: true });
    hb.appendChild(el);
  });
  renderCraft();
  renderHotbar(); renderVitals();
}
function refreshAll() { renderInv(); renderHotbar(); }
function openInventory(big) {
  craftBig = !!big;
  $('inv-title').textContent = big ? 'Établi — artisanat 3×3' : 'Inventaire';
  invOpen = true;
  $('inventory').classList.remove('hidden');
  document.exitPointerLock?.();
  renderInv();
}
function closeInventory() {
  // rend la grille d'artisanat
  for (const s of craftGrid) if (s.id) { inv.add(s.id, s.n); Object.assign(s, emptySlot()); }
  craftGrid = Array.from({ length: 9 }, emptySlot);
  if (drag && !drag.out) { const left = inv.add(drag.slot.id, drag.slot.n); if (left) spawnDrop(player.pos.x, player.pos.y + 1, player.pos.z, drag.slot.id, left); drag = null; hideGhost(); }
  else if (drag?.out) { const r = drag.out.recipe; void r; drag = null; hideGhost(); }
  invOpen = false; furnaceOpen = false;
  $('inventory').classList.add('hidden'); $('furnace').classList.add('hidden');
  refreshAll();
  if (playing && !paused) lock();
}

// ---------- Fourneau ----------
function openFurnace(hit) {
  activeFurnacePos = hit ? [hit.x, hit.y, hit.z] : activeFurnacePos;
  furnaceOpen = true;
  $('furnace').classList.remove('hidden');
  document.exitPointerLock?.();
  renderFurnace();
}
function renderFurnace() {
  bindSlot($('fur-in'), () => furnace.in, (v) => { furnace.in = v; });
  bindSlot($('fur-fuel'), () => furnace.fuel, (v) => { furnace.fuel = v; });
  const out = $('fur-out');
  bindSlot(out, () => furnace.out, () => { }, { out: true, readonly: true });
  out.onmousedown = (e) => {
    if (e.button === 0 && furnace.out.id) {
      const left = inv.add(furnace.out.id, furnace.out.n);
      if (left === 0) { gainXp(2); furnace.out = emptySlot(); sfx.pop(); }
      else furnace.out.n = left;
      renderFurnace(); renderInv();
    }
  };
  $('fur-prog-fill').style.width = (furnace.prog * 100) + '%';
  $('fur-fire').textContent = furnace.burn > 0 ? '🔥' : '⚫';
}
function updateFurnace(dt) {
  const canSmelt = SMELT[furnace.in.id] && (furnace.fuel.id && FUEL[furnace.fuel.id] || furnace.burn > 0);
  if (furnace.burn > 0) furnace.burn -= dt;
  if (canSmelt && furnace.burn <= 0 && furnace.fuel.id) {
    const f = FUEL[furnace.fuel.id];
    if (f) { furnace.fuel.n -= 1; if (!furnace.fuel.n) furnace.fuel = emptySlot(); furnace.burn = f * 12; renderFurnace(); }
  }
  if (SMELT[furnace.in.id] && furnace.burn > 0) {
    furnace.prog += dt / 8;
    if (furnace.prog >= 1) {
      furnace.prog = 0;
      const outId = SMELT[furnace.in.id];
      if (!furnace.out.id) furnace.out = { id: outId, n: 1, dura: null };
      else if (furnace.out.id === outId && furnace.out.n < 64) furnace.out.n += 1;
      else furnace.prog = 1; // sortie bloquée
      if (furnace.prog === 0) {
        furnace.in.n -= 1; if (!furnace.in.n) furnace.in = emptySlot();
        sfx.craft();
      }
      if (furnaceOpen) renderFurnace();
    }
  } else if (furnace.prog !== 0 && !SMELT[furnace.in.id]) furnace.prog = 0;
}

// ---------- Entrées ----------
function bindInputs() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F1') { e.preventDefault(); $('help').classList.toggle('hidden'); return; }
    if (e.code === 'F3') { e.preventDefault(); debug = !debug; return; }
    player.keys[e.code] = true;
    player.keys['shift'] = e.shiftKey;
    if (e.code === 'Space') player.keys['Space'] = true;
    if (!playing || paused) return;
    if (e.code === 'KeyE') { invOpen ? closeInventory() : openInventory(false); }
    if (e.code === 'KeyF') { player.fly = !player.fly; toast(player.fly ? 'Vol activé (Espace/monter, C/descendre)' : 'Vol désactivé'); }
    if (e.code === 'Escape') { /* géré par pointerlock */ }
    if (/^Digit[1-9]$/.test(e.code)) { inv.sel = Number(e.code.slice(5)) - 1; renderHotbar(); sfx.pop(); }
  });
  window.addEventListener('keyup', (e) => {
    player.keys[e.code] = false;
    player.keys['shift'] = e.shiftKey;
    if (e.code === 'Space') player.keys['Space'] = false;
  });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement && playing && !paused && !invOpen) player.look(e.movementX, e.movementY, opts.sens);
  });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && playing && !invOpen && !furnaceOpen && !deadOpen) openPause();
  });
  $('game').addEventListener('mousedown', (e) => {
    if (!playing || paused || invOpen || furnaceOpen) return;
    if (document.pointerLockElement !== $('game')) { lock(); return; }
    if (e.button === 0) { mouseL = true; attack(); }
    if (e.button === 2) tryPlace();
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) { mouseL = false; mineT = 0; } });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => {
    if (!playing || invOpen) return;
    inv.sel = (inv.sel + (e.deltaY > 0 ? 1 : 8)) % 9;
    renderHotbar();
  }, { passive: true });
  // drag & drop : clic en dehors = jeter
  $('inventory').addEventListener('mousedown', (e) => {
    if (e.target === $('inventory') && drag && !drag.out) {
      spawnDrop(player.pos.x, player.pos.y + 1, player.pos.z, drag.slot.id, drag.slot.n);
      drag = null; hideGhost();
    }
  });
  $('btn-inv-close').onclick = closeInventory;
  $('btn-fur-close').onclick = closeInventory;
  // menus
  $('dice').onclick = () => { $('seed').value = 'monde-' + Math.floor(Math.random() * 999999); };
  $('btn-play').onclick = () => startGame($('seed').value.trim() || ('monde-' + Math.floor(Math.random() * 99999)), false);
  $('btn-continue').onclick = () => startGame(null, true);
  $('btn-help').onclick = () => $('help').classList.remove('hidden');
  $('btn-help-close').onclick = () => $('help').classList.add('hidden');
  $('btn-options').onclick = () => $('options').classList.remove('hidden');
  $('btn-options-close').onclick = () => { $('options').classList.add('hidden'); saveOptions(opts); };
  $('opt-dist').oninput = (e) => { opts.dist = Number(e.target.value); $('opt-dist-val').textContent = opts.dist; loadQueue = []; saveOptions(opts); };
  $('opt-sens').oninput = (e) => { opts.sens = Number(e.target.value); $('opt-sens-val').textContent = opts.sens.toFixed(1); saveOptions(opts); };
  $('opt-vol').oninput = (e) => { opts.vol = Number(e.target.value); $('opt-vol-val').textContent = opts.vol; setVolume(opts.vol / 100); saveOptions(opts); };
  $('btn-resume').onclick = resumeGame;
  $('btn-save').onclick = () => { doSave('auto'); $('save-msg').textContent = 'Partie sauvegardée ✓ (' + new Date().toLocaleTimeString() + ')'; };
  $('btn-respawn').onclick = () => { respawn(); resumeGame(); };
  $('btn-quit').onclick = () => { doSave('auto'); location.reload(); };
  $('btn-dead-respawn').onclick = () => { respawn(); };
  $('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').classList.add('hidden'); });
}
let mouseL = false;

// ---------- Utilitaires ----------
function lock() {
  try {
    const r = $('game').requestPointerLock?.();
    if (r && r.catch) r.catch(() => { /* refusé (ex. headless) : le jeu reste jouable au clavier */ });
  } catch { }
}

// ---------- Pause / mort / sauvegarde ----------
function openPause() {
  if (!playing || deadOpen || invOpen) return;
  paused = true;
  $('pause').classList.remove('hidden');
}
function resumeGame() {
  paused = false;
  $('pause').classList.add('hidden');
  if (playing) lock();
}
function respawn() {
  const sp = gen.spawnPoint();
  player.spawn(sp);
  deadOpen = false;
  $('dead').classList.add('hidden');
  paused = false;
  renderVitals();
  toast('Vous réapparaissez au lever du jour');
  sky.t = 0.26;
  if (playing) lock();
}
function doSave(slot = 'auto') {
  try {
    saveGame(slot, {
      seed, edits: journal.slice(-4000), time: sky.t,
      player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, hp: player.hp, food: player.food, yaw: player.yaw },
      inv: inv.serialize(), furnace,
    });
  } catch (e) { err('Sauvegarde impossible : ' + e.message); }
}
window.__hurt = (n, cause) => hurtPlayer(n, cause);
function hurtPlayer(n, cause = 'créature') {
  if (!playing || player.dead) return;
  player.damage(n);
  sfx.hurt();
  particles.spawn(player.pos.x, player.pos.y + 1.4, player.pos.z, 0xff2222, 8, 2, 3);
  renderVitals();
  if (player.dead) {
    deadOpen = true;
    document.exitPointerLock?.();
    $('death-cause').textContent = cause === 'chute' ? 'Une chute brutale a eu raison de vous.' : cause === 'zombi' ? 'Les zombis de la nuit ont eu raison de vous.' : `Une ${cause} a eu raison de vous.`;
    $('dead').classList.remove('hidden');
    // perte : on vide une partie de l'inventaire ? non — on garde tout (mode doux)
  }
}

// ---------- Démarrage ----------
async function startGame(seedInput, cont) {
  $('menu').classList.add('hidden');
  $('loading').classList.remove('hidden');
  $('hud').classList.remove('hidden');
  await new Promise(r => setTimeout(r, 30));
  try {
    // moteur déjà pré-initialisé dans boot() ; seul le monde est (re)créé ici
    inv = new Inventory();
    journal = [];
    let saved = null;
    if (cont) saved = loadGame('auto');
    const s = saved?.seed ?? seedInput ?? seed;
    $('seed').value = s;
    // recrée le monde
    mobs.world = null;
    newWorld(s, saved);
    player.world = world;
    mobs.world = world; mobs.scene = scene; mobs.particles = particles;
    if (saved) toast('Partie chargée — bon retour !');
    else {
      toast('Bienvenue en Voxelia ! Minez du bois, fabriquez un établi (E)');
      setTimeout(() => !player.dead && toast('Astuce : torches la nuit, les zombis rôdent…'), 9000);
    }
    playing = true; paused = false;
    renderHotbar(); renderVitals(); renderInv();
    startMusic();
    $('loading').classList.add('hidden');
    // pré-génère la zone de spawn
    for (let i = 0; i < 6; i++) updateChunks(true);
    $('loading').classList.add('hidden');
    lock();
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    err('Impossible de démarrer : ' + (e.stack || e.message));
    try { toast('Échec démarrage : ' + e.message); } catch { }
    $('loading').classList.add('hidden');
    // en cas d'échec on réaffiche le menu MAIS on garde le HUD visible pour le diagnostic
    if ($('hotbar').children.length === 0) $('menu').classList.remove('hidden');
  }
}

// ---------- Boucle ----------
let last = performance.now(), fpsA = 60, frame = 0;
function loop(now) {
  if (!playing) return;
  requestAnimationFrame(loop);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame++;
  fpsA = fpsA * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;
  if (!paused && !invOpen && !furnaceOpen && !deadOpen) {
    timePlayed += dt;
    player.update(dt);
    // pas
    if (player.onGround && (player.keys['KeyW'] || player.keys['KeyA'] || player.keys['KeyS'] || player.keys['KeyD'])) {
      stepT += dt;
      if (stepT > 0.35) { stepT = 0; sfx.step(); }
    }
    if (player.inWater() && Math.random() < dt * 3) { sfx.splash(); particles.spawn(player.pos.x, player.pos.y + 0.5, player.pos.z, 0x66aaff, 4, 1.5, 2); }
    if (mouseL) { const hit = rayVoxel(); const mobAim = (() => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return mobs.hitTest(camera.position, d, 4); })(); if (mobAim) attack(); else if (hit) tryBreak(dt); }
    else { highlight.visible = !!rayVoxel(); const h = rayVoxel(); if (h) highlight.position.set(h.x + 0.5, h.y + 0.5, h.z + 0.5); }
    if (attackCd > 0) attackCd -= dt;
    mobs.update(dt, player, sky.isNight, (n, c) => hurtPlayer(n, c), () => renderHotbar());
    updateDrops(dt);
    updateFurnace(dt);
    if (player.dead && !deadOpen) hurtPlayer(0.1, 'nature');
    // autosave 30s
    saveT += dt;
    if (saveT > 30) { saveT = 0; doSave('auto'); }
    // HUD
    if (frame % 20 === 0) {
      $('clock').textContent = (sky.isNight ? '🌙 ' : '☀ ') + sky.clock;
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
      const ang = ((-player.yaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      $('compass').textContent = dirs[Math.round(ang / (Math.PI / 4)) % 8] + (player.fly ? ' ✈' : '');
      $('fps').textContent = debug ? `${Math.round(fpsA)} FPS • ${chunkMeshes.size} chunks • ${mobs.mobs.length} mobs • ${Math.round(player.pos.x)},${Math.round(player.pos.y)},${Math.round(player.pos.z)}` : Math.round(fpsA) + ' FPS';
      renderVitals();
    }
  }
  updateChunks();
  const { } = sky.update(paused || invOpen ? 0 : dt, player?.pos ?? new THREE.Vector3());
  sky.applyScene(scene);
  particles.update(dt);
  renderer.render(scene, camera);
}

// ---------- Init page ----------
(function boot() {
  $('opt-dist').value = opts.dist; $('opt-dist-val').textContent = opts.dist;
  $('opt-sens').value = opts.sens; $('opt-sens-val').textContent = Number(opts.sens).toFixed(1);
  $('opt-vol').value = opts.vol; $('opt-vol-val').textContent = opts.vol;
  if (hasSave('auto')) {
    $('btn-continue').classList.remove('hidden');
    $('seed').value = loadGame('auto').seed ?? '';
  }
  try {
    if (!window.WebGLRenderingContext) err('WebGL non supporté par ce navigateur.');
  } catch { }
  // Pré-initialise le moteur + les handlers du menu dès le chargement (sinon le bouton Jouer est inerte)
  try {
    initThree();
    player = new Player(camera, null);
    mobs = new MobManager(scene, null, particles);
    inv = new Inventory();
    sky = new Sky(scene);
    bindInputs();
    renderHotbar(); renderVitals();
  } catch (e) { console.error(e); err('Init moteur : ' + e.message); }
})();
