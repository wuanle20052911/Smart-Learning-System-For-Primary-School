const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { catalog, normalizeGameSlugs } = require('../services/lessonGames');

test('every catalog game has a unique slug and an existing HTML file', () => {
  const slugs = catalog.map((game) => game.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  catalog.forEach((game) => {
    assert.ok(game.title && game.description);
    assert.match(game.href, /^\/public\/games\/[a-z0-9-]+\.html$/);
    assert.ok(fs.existsSync(path.join(__dirname, '..', game.href)), `${game.href} is missing`);
  });
});

test('only even-odd street and number comparison remain attached to lessons', () => {
  const lessonGames = ['phan-loai-chan-le', 'so-sanh-so'];
  assert.deepEqual(catalog.map((game) => game.slug), lessonGames);
  assert.deepEqual(normalizeGameSlugs(lessonGames), lessonGames);
  const assignmentGames = [
    'sap-xep-so-tang-dan', 'giai-ma-hang-so', 'match-up', 'gameshow',
    'open-box', 'digit-arrange', 'flash-cards'
  ];
  assert.ok(assignmentGames.every((slug) => !catalog.some((game) => game.slug === slug)));
  assignmentGames.forEach((slug) => assert.throws(() => normalizeGameSlugs([slug]), /không tồn tại/));
});

test('missing game_slugs leaves the stored value untouched', () => {
  assert.equal(normalizeGameSlugs(undefined), undefined);
});

test('game_slugs are trimmed, de-duplicated and keep the chosen order', () => {
  assert.deepEqual(normalizeGameSlugs([' so-sanh-so', 'phan-loai-chan-le', 'so-sanh-so']), ['so-sanh-so', 'phan-loai-chan-le']);
  assert.deepEqual(normalizeGameSlugs([]), []);
});

test('unknown slugs, non-arrays and too many games are rejected', () => {
  assert.throws(() => normalizeGameSlugs(['khong-co']), /không tồn tại/);
  assert.throws(() => normalizeGameSlugs('so-sanh-so'), /không hợp lệ/);
  assert.throws(() => normalizeGameSlugs([42]), /không tồn tại/);
});
