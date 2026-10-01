const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { injectKeyValidator } = require('./inject-key-validator.cjs');

const source = fs.readFileSync(path.join(__dirname, '../api/src/core/security/services/key-testor.ts'), 'utf8');
// Deliberately synthetic examples; these are not the production algorithms.
const examples = {
  PKV_GET_KEY_BYTE: '\n    return seed;\n  ',
  PKV_CHECK_KEY: '\n    const literal = "$&";\n    return KeyStatus.INVALID;\n  ',
};

test('replaces both public placeholders and preserves literal dollar characters', () => {
  const result = injectKeyValidator(source, examples);
  assert.ok(result.includes('return seed;'));
  assert.ok(result.includes('const literal = "$&";'));
  assert.ok(result.includes('return KeyStatus.INVALID;'));
  assert.ok(!result.includes('return KeyStatus.GOOD;'));
});
for (const name of Object.keys(examples)) {
  test(`refuses to build without ${name}`, () => {
    assert.throws(() => injectKeyValidator(source, { ...examples, [name]: ' ' }), /Missing CI secret/);
  });
  test(`refuses to silently skip a renamed injection point for ${name}`, () => {
    const changed = source.replace(name === 'PKV_CHECK_KEY' ? 'private pkvCheckKey(' : 'private pkvGetKeyByte(', 'private renamed(');
    assert.throws(() => injectKeyValidator(changed, examples), /Missing injection point/);
  });
}
