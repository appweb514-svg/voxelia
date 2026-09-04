// Sauvegarde locale (slots + autosave)
const KEY = 'voxelia.saves.v1';
export function listSaves() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
export function saveGame(slot, data) {
  const all = listSaves(); all[slot] = { ...data, savedAt: Date.now() }; localStorage.setItem(KEY, JSON.stringify(all));
}
export function loadGame(slot) { return listSaves()[slot] ?? null; }
export function hasSave(slot = 'auto') { return !!loadGame(slot); }
export function saveOptions(o) { localStorage.setItem('voxelia.opts', JSON.stringify(o)); }
export function loadOptions() { try { return JSON.parse(localStorage.getItem('voxelia.opts') || '{}'); } catch { return {}; } }
