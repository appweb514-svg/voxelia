// Atlas de textures procédurales 100% originales (canvas 16x16 par tuile)
import { B } from './blocks.js';
export const TILE = 16, ATLAS_COLS = 16;
const tiles = new Map(); // name -> index
let canvas = null;
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
function grain(g, rnd, n, colors) { for (let i = 0; i < n; i++) px(g, (rnd() * 16) | 0, (rnd() * 16) | 0, colors[(rnd() * colors.length) | 0]); }
function base(g, c) { g.fillStyle = c; g.fillRect(0, 0, 16, 16); }
// mulberry local
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tilePainter(name) {
  return (g, R) => {
    const r = rng([...name].reduce((a, c) => a + c.charCodeAt(0) * 7, 13));
    switch (name) {
      case 'grass_top': base(g, '#5fbf4a'); grain(g, r, 60, ['#4da53a', '#71d45c', '#57b344']); break;
      case 'grass_side': base(g, '#7a5a36'); grain(g, r, 50, ['#6b4e2f', '#8a6a42']); g.fillStyle = '#5fbf4a'; g.fillRect(0, 0, 16, 5); grain(g, r, 20, ['#4da53a', '#71d45c']); break;
      case 'snowy_grass_side': base(g, '#7a5a36'); g.fillStyle = '#eef4ff'; g.fillRect(0, 0, 16, 5); grain(g, r, 20, ['#ffffff', '#cfe0ff']); break;
      case 'snowy_grass_top': base(g, '#eef4ff'); grain(g, r, 30, ['#ffffff', '#cfe0ff', '#dfe9ff']); break;
      case 'dirt': base(g, '#7a5a36'); grain(g, r, 70, ['#6b4e2f', '#8a6a42', '#5d4227']); break;
      case 'stone': base(g, '#8d8d96'); grain(g, r, 80, ['#7c7c85', '#9d9da6', '#6f6f78']); break;
      case 'cobble': base(g, '#7d7d88'); for (let i = 0; i < 5; i++) { g.fillStyle = '#5d5d66'; g.fillRect((r() * 13) | 0, (r() * 13) | 0, 3, 3); } grain(g, r, 40, ['#9d9da6']); break;
      case 'sand': base(g, '#e3d29a'); grain(g, r, 70, ['#d4c187', '#f0e0ab']); break;
      case 'sandstone': base(g, '#dcc78e'); g.fillStyle = '#c9b478'; g.fillRect(0, 12, 16, 2); grain(g, r, 40, ['#d4c187', '#e8d8a0']); break;
      case 'log_side': base(g, '#6b4a26'); for (let x = 0; x < 16; x += 3) { g.fillStyle = '#59391d'; g.fillRect(x, 0, 1, 16); } break;
      case 'log_top': base(g, '#a67c4a'); g.fillStyle = '#6b4a26'; for (let i = 0; i < 16; i++) { px(g, i, 0, '#6b4a26'); px(g, i, 15, '#6b4a26'); px(g, 0, i, '#6b4a26'); px(g, 15, i, '#6b4a26'); } break;
      case 'leaves': base(g, '#2f7d2c'); grain(g, r, 90, ['#256b23', '#3c9440', '#1e5c1c']); break;
      case 'planks': base(g, '#b08a4f'); for (let y = 3; y < 16; y += 4) { g.fillStyle = '#8a683a'; g.fillRect(0, y, 16, 1); } grain(g, r, 25, ['#c09a5c']); break;
      case 'glass': base(g, 'rgba(200,230,255,0.25)'); g.fillStyle = '#dff2ff'; for (let i = 0; i < 16; i++) { px(g, i, 0, '#dff2ff'); px(g, i, 15, '#dff2ff'); px(g, 0, i, '#dff2ff'); px(g, 15, i, '#dff2ff'); } g.fillStyle = '#ffffff'; g.fillRect(3, 3, 2, 5); g.fillRect(10, 9, 2, 4); break;
      case 'bedrock': base(g, '#3a3a42'); grain(g, r, 60, ['#222228', '#55555e']); break;
      case 'water': base(g, 'rgba(45,110,220,0.7)'); grain(g, r, 30, ['rgba(120,180,255,0.5)']); break;
      case 'wool': base(g, '#e8e4da'); grain(g, r, 60, ['#d8d4c8', '#f5f2ea']); break;
      case 'brick': base(g, '#a34a3a'); g.fillStyle = '#d8cfc4'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#a34a3a'; g.fillRect(1, 1, 6, 3); g.fillRect(9, 1, 6, 3); g.fillRect(1, 6, 6, 3); g.fillRect(9, 6, 6, 3); g.fillRect(1, 11, 6, 3); g.fillRect(9, 11, 6, 3); break;
      case 'snow': base(g, '#f2f7ff'); grain(g, r, 30, ['#ffffff', '#d8e6ff']); break;
      case 'craft': base(g, '#8a683a'); g.fillStyle = '#5d4227'; g.fillRect(3, 3, 10, 10); g.fillStyle = '#b08a4f'; g.fillRect(4, 4, 8, 8); break;
      case 'furnace': base(g, '#6f6f78'); g.fillStyle = '#222'; g.fillRect(4, 6, 8, 7); g.fillStyle = '#ff9a2e'; g.fillRect(5, 10, 6, 2); break;
      case 'torch': base(g, 'rgba(0,0,0,0)'); g.fillStyle = '#7a5a36'; g.fillRect(7, 6, 2, 10); g.fillStyle = '#ffd94d'; g.fillRect(6, 3, 4, 4); g.fillStyle = '#ff9a2e'; g.fillRect(7, 4, 2, 2); break;
      default:
        if (name.endsWith('_ore')) {
          base(g, '#8d8d96'); grain(g, r, 50, ['#7c7c85', '#9d9da6']);
          const col = { coal_ore: '#2b2b30', iron_ore: '#d8a080', gold_ore: '#ffd94d', diamond_ore: '#6ef3ff' }[name];
          for (let i = 0; i < 5; i++) { g.fillStyle = col; const x = 2 + ((r() * 12) | 0), y = 2 + ((r() * 12) | 0); g.fillRect(x, y, 2, 2); }
        }
    }
  };
}
const TILE_NAMES = ['grass_top', 'grass_side', 'snowy_grass_side', 'snowy_grass_top', 'dirt', 'stone', 'cobble', 'sand', 'sandstone', 'log_side', 'log_top', 'leaves', 'planks', 'glass', 'bedrock', 'water', 'wool', 'brick', 'snow', 'craft', 'furnace', 'torch', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore'];
export function buildAtlas() {
  canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE; canvas.height = Math.ceil(TILE_NAMES.length / ATLAS_COLS) * TILE;
  const g = canvas.getContext('2d');
  const R = Math.random;
  TILE_NAMES.forEach((n, i) => {
    tiles.set(n, i);
    g.save(); g.translate((i % ATLAS_COLS) * TILE, ((i / ATLAS_COLS) | 0) * TILE);
    tilePainter(n)(g, R); g.restore();
  });
  const tex = new (window.__THREE__.CanvasTexture)(canvas);
  tex.magFilter = window.__THREE__.NearestFilter; tex.minFilter = window.__THREE__.NearestFilter;
  tex.colorSpace = window.__THREE__.SRGBColorSpace;
  return tex;
}
export function uvTile(name) {
  const i = tiles.get(name) ?? 0;
  const rows = Math.ceil(TILE_NAMES.length / ATLAS_COLS);
  const w = canvas.width, h = canvas.height;
  const x0 = ((i % ATLAS_COLS) * TILE) / w, y0 = 1 - ((((i / ATLAS_COLS) | 0) + 1) * TILE) / h;
  const x1 = x0 + TILE / w, y1 = y0 + TILE / h;
  return [x0, y0, x1, y1];
}
// faces: [top, bottom, side] noms de tuiles
export function blockTiles(id) {
  switch (id) {
    case B.GRASS: return ['grass_top', 'dirt', 'grass_side'];
    case B.SNOWY_GRASS: return ['snowy_grass_top', 'dirt', 'snowy_grass_side'];
    case B.DIRT: return ['dirt', 'dirt', 'dirt'];
    case B.STONE: return ['stone', 'stone', 'stone'];
    case B.COBBLE: return ['cobble', 'cobble', 'cobble'];
    case B.SAND: return ['sand', 'sand', 'sand'];
    case B.SANDSTONE: return ['sandstone', 'sandstone', 'sandstone'];
    case B.LOG: return ['log_top', 'log_top', 'log_side'];
    case B.LEAVES: return ['leaves', 'leaves', 'leaves'];
    case B.PLANKS: return ['planks', 'planks', 'planks'];
    case B.GLASS: return ['glass', 'glass', 'glass'];
    case B.BEDROCK: return ['bedrock', 'bedrock', 'bedrock'];
    case B.WATER: return ['water', 'water', 'water'];
    case B.WOOL: return ['wool', 'wool', 'wool'];
    case B.BRICK: return ['brick', 'brick', 'brick'];
    case B.SNOW: return ['snow', 'snow', 'snow'];
    case B.CRAFT: return ['craft', 'planks', 'craft'];
    case B.FURNACE: return ['furnace', 'stone', 'furnace'];
    case B.TORCH: return ['torch', 'torch', 'torch'];
    case B.COAL_ORE: return ['coal_ore', 'coal_ore', 'coal_ore'];
    case B.IRON_ORE: return ['iron_ore', 'iron_ore', 'iron_ore'];
    case B.GOLD_ORE: return ['gold_ore', 'gold_ore', 'gold_ore'];
    case B.DIAMOND_ORE: return ['diamond_ore', 'diamond_ore', 'diamond_ore'];
    default: return ['stone', 'stone', 'stone'];
  }
}
// Icônes d'inventaire (dataURL) : réutilise les tuiles + dessins d'objets
const iconCache = new Map();
export function iconFor(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const drawTile = (name) => {
    const i = tiles.get(name) ?? 0;
    g.drawImage(canvas, (i % ATLAS_COLS) * TILE, ((i / ATLAS_COLS) | 0) * TILE, TILE, TILE, 0, 0, 32, 32);
  };
  const s = String(id);
  if (typeof id === 'number') {
    const t = blockTiles(id);
    drawTile(t[2]); // face latérale comme icône
    if (id === B.GRASS) { g.drawImage(canvas, (tiles.get('grass_top') % ATLAS_COLS) * TILE, 0, TILE, 6, 0, 0, 32, 12); }
  } else {
    const r = rng(s.length * 77 + s.charCodeAt(0));
    if (s === 'stick') { g.fillStyle = '#7a5a36'; g.fillRect(13, 2, 6, 28); g.fillStyle = '#a67c4a'; g.fillRect(13, 2, 2, 28); }
    else if (s === 'coal') { g.fillStyle = '#2b2b30'; g.beginPath(); g.arc(16, 16, 11, 0, 7); g.fill(); g.fillStyle = '#55555e'; g.fillRect(11, 11, 4, 4); }
    else if (s === 'diamond') { g.fillStyle = '#6ef3ff'; g.beginPath(); g.moveTo(16, 4); g.lineTo(26, 14); g.lineTo(16, 28); g.lineTo(6, 14); g.fill(); g.fillStyle = '#fff'; g.fillRect(12, 9, 4, 4); }
    else if (s === 'iron' || s === 'gold' || s === 'raw_iron' || s === 'raw_gold') { g.fillStyle = s.includes('gold') ? '#ffd94d' : s === 'iron' ? '#e8e8ee' : '#c98a6a'; g.fillRect(7, 10, 18, 12); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(7, 10, 18, 3); }
    else if (s === 'apple') { g.fillStyle = '#e33'; g.beginPath(); g.arc(16, 17, 10, 0, 7); g.fill(); g.fillStyle = '#2a7d3d'; g.fillRect(15, 3, 3, 6); }
    else if (s.includes('pork')) { g.fillStyle = s.startsWith('cooked') ? '#8a4a22' : '#f0a0a0'; g.fillRect(5, 11, 22, 10); g.fillStyle = '#fff'; g.fillRect(22, 8, 6, 6); }
    else if (s === 'wool') drawTile('wool');
    else if (s.startsWith('tool')) {
      const mat = s.split('_')[2]; const col = { wood: '#a67c4a', stone: '#8d8d96', iron: '#e8e8ee', diamond: '#6ef3ff' }[mat] || '#aaa';
      g.fillStyle = '#7a5a36'; g.fillRect(6, 8, 4, 22); // manche
      g.fillStyle = col;
      if (s.includes('pick')) { g.fillRect(4, 2, 24, 6); g.fillRect(4, 2, 5, 10); g.fillRect(23, 2, 5, 10); }
      else if (s.includes('axe')) { g.fillRect(8, 2, 14, 12); }
      else if (s.includes('shovel')) { g.fillRect(9, 2, 12, 10); }
      else { g.fillRect(14, 2, 5, 16); g.fillRect(11, 2, 11, 4); }
    } else drawTile('stone');
    void r;
  }
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}
