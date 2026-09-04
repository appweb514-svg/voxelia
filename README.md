# VOXELIA ⛏️ — Jeu voxel type Minecraft (univers 100 % original)

Exploration, minage, artisanat, construction, survie, créatures, cycle jour/nuit, fourneau, sauvegarde locale. Aucune ressource de Minecraft n'est utilisée : textures pixel-art générées par code, modèles cubiques originaux, sons synthétisés en WebAudio.

## Démarrer

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # dist/ statique
pnpm test:logic
```

Ouvrez la page, choisissez une graine, cliquez **Jouer**, puis cliquez dans le jeu pour capturer la souris.

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer (Shift = courir) |
| Espace | Sauter / nager / monter en vol |
| F | Vol on/off (C = descendre) |
| Clic gauche (maintenu) | Casser / attaquer |
| Clic droit | Poser / manger / ouvrir établi & fourneau |
| 1–9 / molette | Barre rapide |
| E | Inventaire & artisanat (2×2, 3×3 sur établi) |
| Échap | Pause (+ sauvegarde) |
| F1 / F3 | Aide / débogage |

## Progression conseillée

1. Cassez des troncs → planches → bâtons → établi → pioche en bois.
2. Minez de la pierre → outils en pierre → charbon (torches).
3. Creusez vers y≈20 pour le fer, fondez-le au fourneau (charbon + fer brut).
4. Éclairez avant la nuit : les **zombis** sortent à la tombée du jour et brûlent au soleil.
5. Mangez pommes / côtelettes (cochons) pour régénérer. Les moutons donnent de la laine, les limaces rebondissent et attaquent.

## Recettes (extraits)

- Planches ×4 = 1 bûche • Bâtons ×4 = 2 planches • Torches ×4 = charbon + bâton
- Établi = 4 planches • Fourneau = 8 pierres • Vitre ×4 = 4 sables • Briques ×4 = 4 terres
- Outils : motif classique (ex. pioche = 3 matériaux + 2 bâtons), matériaux bois → pierre → fer → diamant.
- Fourneau : fer brut → lingot • or brut → lingot • sable → vitre • porc cru → grillé • bûche → charbon.

## Architecture

```
src/main.js            boucle, streaming chunks, interactions, UI, sauvegarde
src/core/{config,random,blocks,textures,worldgen,world,mesher,sky,particles,audio,save}.js
src/player/{player,inventory}.js   physique FPS + inventaire/recettes/fourneau
src/mobs/mobs.js       cochons, moutons, zombis, limaces
```

Monde : chunks 16×16, hauteur 64, génération déterministe par graine (fbm), biomes plaines/forêt/désert/neige/montagne, minerais en profondeur, arbres, lacs. Rendu : un mesh opaque + un mesh transparent par chunk, ombrage par face, torches = points lumineux (plafonnés pour la perf).

## Périmètre assumé (non inclus)

Redstone/circuits, Nether/End, multijoueur, villages/PNJs commerçants, enchantements, potions, météo pluie/neige animée, cartes infinies persistées serveur. La sauvegarde garde graine + 4000 dernières modifications + joueur/inventaire/fourneau/heure. Tout le reste est régénéré procéduralement.
