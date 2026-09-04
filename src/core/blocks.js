// Registre des blocs — identité visuelle originale "Voxelia" (aucun asset Mojang)
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7,
  GLASS: 8, COAL_ORE: 9, IRON_ORE: 10, GOLD_ORE: 11, DIAMOND_ORE: 12, BEDROCK: 13,
  WATER: 14, TORCH: 15, CRAFT: 16, FURNACE: 17, WOOL: 18, BRICK: 19, SNOW: 20,
  SNOWY_GRASS: 21, SANDSTONE: 22, COBBLE: 23, IRON: 24, GOLD: 25, DIAMOND: 26, CHARCOAL_TORCH: 15,
};
export const NAMES = {
  1: 'Herbe verdoyante', 2: 'Terre', 3: 'Pierre', 4: 'Sable', 5: 'Tronc de palmier', 6: 'Feuillage',
  7: 'Planches', 8: 'Vitre', 9: 'Minerai de charbon', 10: 'Minerai de fer', 11: "Minerai d'or",
  12: 'Minerai de diamant', 13: 'Socle', 14: 'Eau', 15: 'Torche', 16: 'Établi', 17: 'Fourneau',
  18: 'Laine', 19: 'Briques', 20: 'Neige', 21: 'Herbe enneigée', 22: 'Grès', 23: 'Pavés',
  24: 'Lingot de fer', 25: "Lingot d'or", 26: 'Diamant',
};
// dureté (secondes à main nue), outil efficace, niveau minier requis
export const PROPS = {
  1: { hard: 0.55, tool: 'shovel', name: 'Herbe verdoyante' },
  2: { hard: 0.5, tool: 'shovel' }, 3: { hard: 2.2, tool: 'pick', lvl: 1 },
  4: { hard: 0.5, tool: 'shovel' }, 5: { hard: 1.4, tool: 'axe' },
  6: { hard: 0.25 }, 7: { hard: 1.2, tool: 'axe' }, 8: { hard: 0.4 },
  9: { hard: 2.6, tool: 'pick', lvl: 1, drop: 'coal' }, 10: { hard: 3.0, tool: 'pick', lvl: 1, drop: 'raw_iron' },
  11: { hard: 3.2, tool: 'pick', lvl: 2, drop: 'raw_gold' }, 12: { hard: 3.6, tool: 'pick', lvl: 2, drop: 'diamond' },
  13: { hard: Infinity }, 14: { hard: Infinity },
  15: { hard: 0.1 }, 16: { hard: 1.2, tool: 'axe' }, 17: { hard: 2.4, tool: 'pick', lvl: 1 },
  18: { hard: 0.6 }, 19: { hard: 2.4, tool: 'pick', lvl: 1 }, 20: { hard: 0.3, tool: 'shovel' },
  21: { hard: 0.55, tool: 'shovel' }, 22: { hard: 2.0, tool: 'pick', lvl: 1 }, 23: { hard: 2.2, tool: 'pick', lvl: 1 },
};
export const OPAQUE = new Set([1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23]);
export const COLLIDE = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23]);
// Objets (non-blocs posables ou items)
export const ITEMS = {
  stick: { name: 'Bâton', icon: 'stick' }, coal: { name: 'Charbon', icon: 'coal' },
  raw_iron: { name: 'Fer brut', icon: 'raw_iron' }, raw_gold: { name: 'Or brut', icon: 'raw_gold' },
  iron: { name: 'Lingot de fer', icon: 'iron' }, gold: { name: "Lingot d'or", icon: 'gold' },
  diamond: { name: 'Diamant', icon: 'diamond' }, apple: { name: 'Pomme', icon: 'apple', food: 4 },
  pork: { name: 'Côtelette crue', icon: 'pork', food: 3 }, cooked_pork: { name: 'Côtelette grillée', icon: 'cooked_pork', food: 8 },
  wool_item: { name: 'Laine', icon: 'wool' },
};
for (const [k, v] of Object.entries(ITEMS)) NAMES[k] = v.name;
export const BLOCK_ITEM = { 1: 1, 2: 2, 3: 23, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 'coal', 10: 'raw_iron', 11: 'raw_gold', 12: 'diamond', 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23 };
export function displayName(id) { return NAMES[id] ?? ITEMS[id]?.name ?? String(id); }
export function isOpaque(id) { return OPAQUE.has(id); }
export function isCollide(id) { return COLLIDE.has(id); }

// Outils
export const TOOLS = {
  hand: { name: 'Main', mult: 1, lvl: 0, dmg: 1 },
  wooden_pickaxe: { name: 'Pioche en bois', kind: 'pick', mult: 2, lvl: 1, dmg: 2, dura: 59 },
  wooden_axe: { name: 'Hache en bois', kind: 'axe', mult: 2, lvl: 0, dmg: 3, dura: 59 },
  wooden_shovel: { name: 'Pelle en bois', kind: 'shovel', mult: 2, lvl: 0, dmg: 2, dura: 59 },
  wooden_sword: { name: 'Épée en bois', kind: 'sword', mult: 1, lvl: 0, dmg: 4, dura: 59 },
  stone_pickaxe: { name: 'Pioche en pierre', kind: 'pick', mult: 4, lvl: 1, dmg: 3, dura: 131 },
  stone_axe: { name: 'Hache en pierre', kind: 'axe', mult: 4, lvl: 0, dmg: 4, dura: 131 },
  stone_shovel: { name: 'Pelle en pierre', kind: 'shovel', mult: 4, lvl: 0, dmg: 3, dura: 131 },
  stone_sword: { name: 'Épée en pierre', kind: 'sword', mult: 1, lvl: 0, dmg: 5, dura: 131 },
  iron_pickaxe: { name: 'Pioche en fer', kind: 'pick', mult: 6, lvl: 2, dmg: 4, dura: 250 },
  iron_axe: { name: 'Hache en fer', kind: 'axe', mult: 6, lvl: 0, dmg: 5, dura: 250 },
  iron_shovel: { name: 'Pelle en fer', kind: 'shovel', mult: 6, lvl: 0, dmg: 4, dura: 250 },
  iron_sword: { name: 'Épée en fer', kind: 'sword', mult: 1, lvl: 0, dmg: 6, dura: 250 },
  diamond_pickaxe: { name: 'Pioche en diamant', kind: 'pick', mult: 8, lvl: 3, dmg: 5, dura: 1561 },
  diamond_sword: { name: 'Épée en diamant', kind: 'sword', mult: 1, lvl: 0, dmg: 7, dura: 1561 },
};
NAMES.wooden_pickaxe = 'Pioche en bois'; NAMES.wooden_axe = 'Hache en bois'; NAMES.wooden_shovel = 'Pelle en bois'; NAMES.wooden_sword = 'Épée en bois';
NAMES.stone_pickaxe = 'Pioche en pierre'; NAMES.stone_axe = 'Hache en pierre'; NAMES.stone_shovel = 'Pelle en pierre'; NAMES.stone_sword = 'Épée en pierre';
NAMES.iron_pickaxe = 'Pioche en fer'; NAMES.iron_axe = 'Hache en fer'; NAMES.iron_shovel = 'Pelle en fer'; NAMES.iron_sword = 'Épée en fer';
NAMES.diamond_pickaxe = 'Pioche en diamant'; NAMES.diamond_sword = 'Épée en diamant';
ITEMS.wooden_pickaxe = { name: 'Pioche en bois', icon: 'tool_pick_wood' };
ITEMS.wooden_axe = { name: 'Hache en bois', icon: 'tool_axe_wood' };
ITEMS.wooden_shovel = { name: 'Pelle en bois', icon: 'tool_shovel_wood' };
ITEMS.wooden_sword = { name: 'Épée en bois', icon: 'tool_sword_wood' };
ITEMS.stone_pickaxe = { name: 'Pioche en pierre', icon: 'tool_pick_stone' };
ITEMS.stone_axe = { name: 'Hache en pierre', icon: 'tool_axe_stone' };
ITEMS.stone_shovel = { name: 'Pelle en pierre', icon: 'tool_shovel_stone' };
ITEMS.stone_sword = { name: 'Épée en pierre', icon: 'tool_sword_stone' };
ITEMS.iron_pickaxe = { name: 'Pioche en fer', icon: 'tool_pick_iron' };
ITEMS.iron_axe = { name: 'Hache en fer', icon: 'tool_axe_iron' };
ITEMS.iron_shovel = { name: 'Pelle en fer', icon: 'tool_shovel_iron' };
ITEMS.iron_sword = { name: 'Épée en fer', icon: 'tool_sword_iron' };
ITEMS.diamond_pickaxe = { name: 'Pioche en diamant', icon: 'tool_pick_diamond' };
ITEMS.diamond_sword = { name: 'Épée en diamant', icon: 'tool_sword_diamond' };
