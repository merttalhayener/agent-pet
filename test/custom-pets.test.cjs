const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { listCustomPets } = require('../src/custom-pets.cjs');

test('local custom library exposes names and IDs without accepting paths or invalid entries', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-pet-custom-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  assert.deepEqual(await listCustomPets(dir), []);
  const folder = path.join(dir, 'custom-pets'); await fs.mkdir(folder);
  const pet = { id: 'custom-11111111-1111-4111-8111-111111111111', revision: '22222222-2222-4222-8222-222222222222',
    name: 'My cat', poses: ['normal'], scale: 1, mirrored: false, motion: true };
  await fs.writeFile(path.join(folder, 'library.json'), JSON.stringify([pet, pet,
    { ...pet, id: '../../external' }, { ...pet, id: 'custom-33333333-3333-4333-8333-333333333333', revision: '../elsewhere' },
    { ...pet, id: 'custom-44444444-4444-4444-8444-444444444444', poses: ['running'] },
    { ...pet, id: 'custom-55555555-5555-4555-8555-555555555555', name: '   ' },
    { ...pet, id: 'custom-66666666-6666-4666-8666-666666666666', scale: 100 },
    { ...pet, id: 'custom-77777777-7777-4777-8777-777777777777', poses: ['normal', '../outside'] }
  ]));
  assert.deepEqual(await listCustomPets(dir), [{ id: pet.id, name: pet.name, file: '' }]);
  await fs.writeFile(path.join(folder, 'library.json'), 'invalid JSON');
  assert.deepEqual(await listCustomPets(dir), []);
  await fs.writeFile(path.join(folder, 'library.json'), ' '.repeat(1024 * 1024 + 1));
  assert.deepEqual(await listCustomPets(dir), []);
});
