// Smoke test logique pure (aucun DOM) : registre, recettes, RNG monde
import assert from 'node:assert';
import { B, PROPS, TOOLS } from '../src/core/blocks.js';
import { matchRecipe } from '../src/player/inventory.js';
import { hashSeed, mulberry32, makeNoise2D, fbm } from '../src/core/random.js';

assert.ok(PROPS[B.STONE].hard > 0, 'stone hardness');
assert.ok(TOOLS.iron_pickaxe.lvl >= 2, 'iron lvl');
assert.equal(hashSeed('abc'), hashSeed('abc'), 'seed deterministic');
assert.notEqual(hashSeed('a'), hashSeed('b'), 'seed differs');
const r = mulberry32(42); assert.equal(r(), mulberry32(42)(), 'rng deterministic');
const n = makeNoise2D(mulberry32(7));
const v = fbm(n, 3.2, 9.1, 3);
assert.ok(v >= 0 && v <= 1, 'fbm range, got ' + v);
// recette pioche en bois
const cells = ['777'.split(''), '.s.'.split(''), '.s.'.split('')].flat().map(ch => ch === '.' ? null : ({ 7: 7, s: 'stick' })[ch]);
const rec = matchRecipe(cells);
assert.ok(rec && rec.out === 'wooden_pickaxe', 'recipe match, got ' + JSON.stringify(rec));
console.log('SMOKE OK — blocks, rng, recipes');
