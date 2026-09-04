// Génération procédurale du monde (déterministe par graine)
import { B } from './blocks.js';
import { CHUNK, WORLD_H, SEA } from './config.js';
import { hashSeed, mulberry32, makeNoise2D, fbm } from './random.js';
export function makeWorldGen(seedStr) {
  const seed = hashSeed(seedStr);
  const rand = mulberry32(seed);
  const nCont = makeNoise2D(mulberry32(seed ^ 0x1234));
  const nHill = makeNoise2D(mulberry32(seed ^ 0x5678));
  const nMount = makeNoise2D(mulberry32(seed ^ 0x9abc));
  const nTemp = makeNoise2D(mulberry32(seed ^ 0xdef0));
  const nMoist = makeNoise2D(mulberry32(seed ^ 0x1357));
  const treeRand = mulberry32(seed ^ 0x7777);
  const treeSpots = new Map(); // "x,z" -> 1 (décidé globalement pour continuité inter-chunks)
  function biomeAt(x, z) {
    const t = fbm(nTemp, x * 0.004, z * 0.004, 3);
    const m = fbm(nMoist, x * 0.005 + 99, z * 0.005, 3);
    if (t < 0.32) return 'snow';
    if (t > 0.66 && m < 0.45) return 'desert';
    if (m > 0.62) return 'forest';
    const mount = fbm(nMount, x * 0.006, z * 0.006, 3);
    if (mount > 0.62) return 'mountain';
    return 'plains';
  }
  function heightAt(x, z) {
    const c = fbm(nCont, x * 0.008, z * 0.008, 4);
    const h = fbm(nHill, x * 0.03, z * 0.03, 3);
    const m = fbm(nMount, x * 0.006, z * 0.006, 4);
    const b = biomeAt(x, z);
    let base = 22 + (c - 0.5) * 14 + (h - 0.5) * 6;
    if (b === 'mountain') base += Math.max(0, m - 0.55) * 60;
    if (b === 'desert') base += (h - 0.5) * 3;
    if (b === 'snow') base += Math.max(0, m - 0.5) * 30;
    return Math.max(4, Math.min(WORLD_H - 16, Math.round(base)));
  }
  function hasTree(x, z, h) {
    if (h <= SEA + 1) return false;
    const b = biomeAt(x, z);
    if (b === 'desert' || b === 'snow' || b === 'mountain') return false;
    const key = x + ',' + z;
    if (!treeSpots.has(key)) treeSpots.set(key, treeRand() < (b === 'forest' ? 0.02 : 0.006) ? 1 : 0);
    return treeSpots.get(key) === 1;
  }
  // Remplit un chunk (Uint8Array 16*H*16) + retourne hauteur max
  function genChunk(cx, cz, data) {
    const idx = (x, y, z) => (y * CHUNK + z) * CHUNK + x;
    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      const h = heightAt(wx, wz);
      const biome = biomeAt(wx, wz);
      const top = biome === 'desert' ? B.SAND : biome === 'snow' ? B.SNOWY_GRASS : B.GRASS;
      const sub = biome === 'desert' ? B.SAND : biome === 'snow' ? B.DIRT : B.DIRT;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0) id = B.BEDROCK;
        else if (y === h) id = h <= SEA + 1 && biome !== 'desert' ? B.SAND : top;
        else if (y > h - 4) id = sub;
        else {
          id = B.STONE;
          // minerais (pseudo-aléatoire positionnel)
          const r = mulberry32((wx * 374761393 + y * 668265263 + wz * 2147483647) ^ seed)();
          if (y < 40 && r < 0.02) id = B.COAL_ORE;
          else if (y < 28 && r > 0.985) id = B.IRON_ORE;
          else if (y < 16 && r > 0.993) id = B.GOLD_ORE;
          else if (y < 12 && r > 0.9965) id = B.DIAMOND_ORE;
          if (biome === 'desert' && y > h - 8 && r < 0.3) id = B.SANDSTONE;
        }
        data[idx(lx, y, lz)] = id;
      }
      if (h < SEA) { for (let y = h + 1; y <= SEA; y++) data[idx(lx, y, lz)] = B.WATER; }
      else if (biome === 'snow' && h > SEA) data[idx(lx, h + 1, lz)] = B.SNOW;
    }
    // arbres (troncs + feuillages, clampés au chunk avec débord géré par getBlock global)
    for (let lx = 2; lx < CHUNK - 2; lx++) for (let lz = 2; lz < CHUNK - 2; lz++) {
      const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
      const h = heightAt(wx, wz);
      if (hasTree(wx, wz, h)) {
        const th = 4 + ((wx * 31 + wz * 17) % 3);
        for (let i = 1; i <= th; i++) data[idx(lx, h + i, lz)] = B.LOG;
        for (let dy = th - 2; dy <= th + 1; dy++) {
          const rad = dy >= th ? 1 : 2;
          for (let ox = -rad; ox <= rad; ox++) for (let oz = -rad; oz <= rad; oz++) {
            if (lx + ox < 0 || lx + ox >= CHUNK || lz + oz < 0 || lz + oz >= CHUNK) continue;
            if (Math.abs(ox) === rad && Math.abs(oz) === rad && dy < th) continue;
            const p = idx(lx + ox, h + dy, lz);
            if (data[p] === B.AIR) data[p] = B.LEAVES;
          }
        }
      }
    }
    return 0;
  }
  function spawnPoint() {
    for (let r = 0; r < 200; r += 4) {
      const h = heightAt(r, r);
      if (h > SEA + 1) return { x: r + 0.5, y: h + 2.5, z: r + 0.5 };
    }
    return { x: 8.5, y: 40, z: 8.5 };
  }
  return { seed, heightAt, biomeAt, genChunk, spawnPoint };
}
