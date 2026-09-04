// Mesher : une face par bloc visible, 2 matériaux (opaque + transparent/eau-verre-feuilles)
import * as THREE from 'three';
import { B, isOpaque } from './blocks.js';
import { blockTiles, uvTile } from './textures.js';
import { CHUNK, WORLD_H } from './config.js';
const FACES = [
  { d: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8, t: 2 },
  { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8, t: 2 },
  { d: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0, t: 0 },
  { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.55, t: 1 },
  { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.9, t: 2 },
  { d: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.9, t: 2 },
];
export function meshChunk(world, cx, cz, mats) {
  const opaque = { pos: [], nrm: [], uv: [], col: [], idx: [] };
  const trans = { pos: [], nrm: [], uv: [], col: [], idx: [] };
  const data = world.getChunk(cx, cz);
  const at = (x, y, z) => world.get(cx * CHUNK + x, y, cz * CHUNK + z);
  const isWater = (id) => id === B.WATER;
  for (let y = 0; y < WORLD_H; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) {
    const id = data[(y * CHUNK + z) * CHUNK + x];
    if (!id) continue;
    if (id === B.TORCH) continue; // rendu comme sprite séparé
    const tiles = blockTiles(id);
    const wx = cx * CHUNK + x, wz = cz * CHUNK + z;
    for (const f of FACES) {
      const nx = wx + f.d[0], ny = y + f.d[1], nz = wz + f.d[2];
      const nb = world.get(nx, ny, nz);
      const sameTrans = (id === B.WATER && nb === B.WATER) || (id === B.GLASS && nb === B.GLASS) || (id === B.LEAVES && nb === B.LEAVES);
      if (sameTrans) continue;
      const nbOp = isOpaque(nb);
      if (isWater(id)) { if (nbOp || (nb === B.WATER)) continue; if (f.d[1] === -1) continue; }
      else if (nbOp) continue;
      else if (nb === B.WATER && f.d[1] === 1) { /* face sous l'eau visible */ }
      const target = (id === B.WATER || id === B.GLASS || id === B.LEAVES) ? trans : opaque;
      const tile = tiles[f.t];
      const [u0, v0, u1, v1] = uvTile(tile);
      const base = target.pos.length / 3;
      // légère occlusion ambiante : coins entourés
      let shade = f.shade;
      if (y < 4) shade *= 0.85;
      for (let i = 0; i < 4; i++) {
        const c = f.c[i];
        target.pos.push(wx + c[0], y + c[1] - (isWater(id) && f.d[1] === 1 ? 0.12 : 0), wz + c[2]);
        target.nrm.push(...f.d);
        const uu = (i === 0 || i === 3) ? u0 : u1;
        const vv = (i < 2) ? v0 : v1;
        target.uv.push(uu, vv);
        target.col.push(shade, shade, shade);
      }
      target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const group = new THREE.Group();
  for (const [buf, mat, shadow] of [[opaque, mats.opaque, true], [trans, mats.trans, false]]) {
    if (!buf.idx.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
    g.setIndex(buf.idx);
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = shadow;
    group.add(m);
  }
  group.position.set(0, 0, 0);
  return group;
}
// Petits cubes pour les torches posées
export function torchMeshes(world, cx, cz, mat) {
  const grp = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
  for (const k of world.torches.keys()) {
    const [x, y, z] = k.split(',').map(Number);
    if (Math.floor(x / CHUNK) !== cx || Math.floor(z / CHUNK) !== cz) continue;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x + 0.5, y + 0.45, z + 0.5);
    grp.add(m);
    const glow = new THREE.PointLight(0xffb84d, 12, 12, 1.8);
    glow.position.set(x + 0.5, y + 1, z + 0.5);
    grp.add(glow);
  }
  return grp;
}
