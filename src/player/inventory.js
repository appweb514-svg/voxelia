// Inventaire 27 slots + hotbar 9, stacks 64, durabilité outils
import { TOOLS, ITEMS, displayName } from '../core/blocks.js';
export function emptySlot() { return { id: null, n: 0, dura: null }; }
export class Inventory {
  constructor() {
    this.main = Array.from({ length: 27 }, emptySlot);
    this.hot = Array.from({ length: 9 }, emptySlot);
    this.sel = 0;
  }
  all() { return [...this.hot, ...this.main]; }
  selected() { return this.hot[this.sel]; }
  count(id) { let t = 0; for (const s of [...this.hot, ...this.main]) if (s.id === id) t += s.n; return t; }
  add(id, n = 1) {
    const max = 64;
    const tool = TOOLS[id];
    const stackable = !tool;
    if (tool) {
      const free = [...this.hot, ...this.main].find(s => !s.id);
      const arr = [...this.hot, ...this.main];
      const i = arr.indexOf(free);
      if (!free) return n;
      const target = i < 9 ? this.hot[i] : this.main[i - 9];
      target.id = id; target.n = 1; target.dura = tool.dura ?? null;
      return 0;
    }
    for (const s of [...this.hot, ...this.main]) {
      if (s.id === id && s.n < max) { const take = Math.min(max - s.n, n); s.n += take; n -= take; if (!n) return 0; }
    }
    for (const s of [...this.hot, ...this.main]) {
      if (!s.id) { const take = Math.min(max, n); s.id = id; s.n = take; n -= take; if (!n) return 0; }
    }
    return n;
  }
  remove(id, n = 1) {
    for (const s of [...this.hot, ...this.main]) {
      if (s.id === id) { const take = Math.min(s.n, n); s.n -= take; n -= take; if (!s.n) { s.id = null; s.dura = null; } if (!n) return true; }
    }
    return n === 0;
  }
  damageSelected(amount = 1) {
    const s = this.selected();
    const t = TOOLS[s.id];
    if (!t || !t.dura) return false;
    s.dura -= amount;
    if (s.dura <= 0) { s.id = null; s.n = 0; s.dura = null; return true; }
    return false;
  }
  serialize() { return { main: this.main, hot: this.hot, sel: this.sel }; }
  load(d) { if (!d) return; this.main = d.main ?? this.main; this.hot = d.hot ?? this.hot; this.sel = d.sel ?? 0; }
}
// ---- Recettes ----
function R(out, outN, grid) { return { out, outN, grid }; }
// grilles 3x3 avec codes 1-char ; '.' = vide
export const RECIPES = [
  R(7, 4, ['5..', '...', '...']), R(7, 4, ['.5.', '...', '...']), // planches (bûche) — simplifié: 1 bûche -> 4 planches
  R('stick', 4, ['7..', '7..', '...']),
  R(15, 4, ['c..', 's..', '...']), // torche: charbon + bâton (c=coal, s=stick)
  R(16, 1, ['77.', '77.', '...']), // établi
  R(17, 1, ['333', '3.3', '333']), // fourneau (pierre/pavés)
  R(23, 4, ['33.', '33.', '...']), // pavés depuis pierre ? (raccourci)
  R(19, 4, ['22.', '22.', '...']), // briques depuis terre cuite simplifiée (terre)
  R(8, 4, ['44.', '44.', '...']), // vitre depuis sable
  R(18, 1, ['666', '666', '...']), // laine depuis feuillage
  // outils bois
  R('wooden_pickaxe', 1, ['777', '.s.', '.s.']), R('wooden_axe', 1, ['77.', '7s.', '.s.']),
  R('wooden_shovel', 1, ['7..', 's..', 's..']), R('wooden_sword', 1, ['7..', '7..', 's..']),
  // outils pierre
  R('stone_pickaxe', 1, ['333', '.s.', '.s.']), R('stone_axe', 1, ['33.', '3s.', '.s.']),
  R('stone_shovel', 1, ['3..', 's..', 's..']), R('stone_sword', 1, ['3..', '3..', 's..']),
  // outils fer
  R('iron_pickaxe', 1, ['iii', '.s.', '.s.']), R('iron_sword', 1, ['i..', 'i..', 's..']),
  R('iron_axe', 1, ['ii.', 'is.', '.s.']), R('iron_shovel', 1, ['i..', 's..', 's..']),
  // outils diamant
  R('diamond_pickaxe', 1, ['ddd', '.s.', '.s.']), R('diamond_sword', 1, ['d..', 'd..', 's..']),
];
const CODE = { '7': 7, '3': 3, '5': 5, '6': 6, '4': 4, '2': 2, 's': 'stick', 'c': 'coal', 'i': 'iron', 'd': 'diamond' };
export function matchRecipe(grid /* array 9 id|null */, allowSmall) {
  const norm = (cells) => cells.map(c => c ?? '.');
  const key = (cells) => norm(cells).join(',');
  const gk = key(grid);
  for (const r of RECIPES) {
    const cells = [];
    for (const row of r.grid) for (const ch of row) cells.push(ch === '.' ? null : CODE[ch]);
    if (key(cells) === gk) return r;
    // variantes miroir horizontal
    const mir = [];
    for (const row of r.grid) { const rr = row.split('').reverse().join(''); for (const ch of rr) mir.push(ch === '.' ? null : CODE[ch]); }
    if (key(mir) === gk) return r;
  }
  return null;
}
export function craftConsume(inv, gridSlots, recipe) {
  // vérifie et consomme 1 de chaque ingrédient
  const need = [];
  for (const row of recipe.grid) for (const ch of row) if (ch !== '.') need.push(CODE[ch]);
  // compte par type dans la grille
  const have = new Map();
  for (const s of gridSlots) if (s.id) have.set(s.id, (have.get(s.id) ?? 0) + 1);
  for (const [id, n] of (() => { const m = new Map(); for (const id of need) m.set(id, (m.get(id) ?? 0) + 1); return m; })()) {
    if ((have.get(id) ?? 0) < n) return false;
  }
  for (const s of gridSlots) if (s.id) { s.n -= 1; if (s.n <= 0) { s.id = null; } }
  void inv;
  return true;
}
// Fourneau : minerai + combustible -> lingot
export const SMELT = { raw_iron: 'iron', raw_gold: 'gold', '4': 8, '2': 19, '5': 'coal' /* bois->charbon */, pork: 'cooked_pork' };
export const FUEL = { coal: 8, stick: 1, '5': 2, '7': 2, '6': 1 };
export function displayStack(s) { if (!s.id) return ''; return `${displayName(s.id)}${s.n > 1 ? ' ×' + s.n : ''}`; }
export { ITEMS };
