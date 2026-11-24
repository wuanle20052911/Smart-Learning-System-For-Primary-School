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

test('lesson catalog includes five standalone assignment-style games', () => {
  assert.deepEqual(catalog.filter((game) => ['match-up','gameshow','open-box','digit-arrange','flash-cards'].includes(game.slug)).map((game) => game.slug), [
    'match-up', 'gameshow', 'open-box', 'digit-arrange', 'flash-cards'
  ]);
});

test('missing game_slugs leaves the stored value untouched', () => {
  assert.equal(normalizeGameSlugs(undefined), undefined);
});

test('game_slugs are trimmed, de-duplicated and keep the chosen order', () => {
  assert.deepEqual(normalizeGameSlugs([' so-sanh-so', 'sap-xep-so-tang-dan', 'so-sanh-so']), ['so-sanh-so', 'sap-xep-so-tang-dan']);
  assert.deepEqual(normalizeGameSlugs([]), []);
});

test('unknown slugs, non-arrays and too many games are rejected', () => {
  assert.throws(() => normalizeGameSlugs(['khong-co']), /không tồn tại/);
  assert.throws(() => normalizeGameSlugs('so-sanh-so'), /không hợp lệ/);
  assert.throws(() => normalizeGameSlugs([42]), /không tồn tại/);
});
