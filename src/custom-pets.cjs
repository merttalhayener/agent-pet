const fs = require('node:fs/promises');
const path = require('node:path');

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const idPattern = new RegExp(`^custom-${UUID}$`, 'i');
const revisionPattern = new RegExp(`^${UUID}$`, 'i');
const poses = new Set(['normal', 'running', 'waiting', 'ready', 'sleeping']);
const characters = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// Read only the local library's known index. Character paths from clients are ignored.
async function listCustomPets(directory) {
  try {
    const file = path.join(directory, 'custom-pets', 'library.json');
    if ((await fs.stat(file)).size > 1024 * 1024) return [];
    const library = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(library)) return [];
    const seen = new Set();
    return library.filter(pet => {
      if (!pet || typeof pet.id !== 'string' || !idPattern.test(pet.id) || seen.has(pet.id) ||
          typeof pet.revision !== 'string' || !revisionPattern.test(pet.revision) ||
          typeof pet.name !== 'string' || !pet.name.trim() || [...characters.segment(pet.name)].length > 60 ||
          !Number.isFinite(pet.scale) || pet.scale < 0.5 || pet.scale > 1.5 ||
          typeof pet.mirrored !== 'boolean' || typeof pet.motion !== 'boolean' ||
          !Array.isArray(pet.poses) || !pet.poses.includes('normal') ||
          pet.poses.some(pose => !poses.has(pose)) || new Set(pet.poses).size !== pet.poses.length) return false;
      seen.add(pet.id); return true;
    }).map(({ id, name }) => ({ id, name, file: '' }));
  } catch { return []; }
}

module.exports = { listCustomPets };
