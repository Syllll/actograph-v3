const fs = require('node:fs');

/** Private function bodies are provided by CI, never by this public repository. */
function injectKeyValidator(source, secrets) {
  const replacements = [
    {
      name: 'PKV_GET_KEY_BYTE',
      pattern: /private pkvGetKeyByte\(seed: ulint, a: ulint, b: ulint, c: ulint\): ulint {[\s\S]*?^  }/m,
      signature: 'private pkvGetKeyByte(seed: ulint, a: ulint, b: ulint, c: ulint): ulint',
    },
    {
      name: 'PKV_CHECK_KEY',
      pattern: /private pkvCheckKey\(s: string, blackListedKeys: string\[\] = \[\]\): KeyStatus {[\s\S]*?^  }/m,
      signature: 'private pkvCheckKey(s: string, blackListedKeys: string[] = []): KeyStatus',
    },
  ];
  let result = source;
  for (const { name, pattern, signature } of replacements) {
    const body = secrets[name];
    if (typeof body !== 'string' || !body.trim()) throw new Error(`Missing CI secret: ${name}`);
    if (!pattern.test(result)) throw new Error(`Missing injection point: ${name}`);
    // A replacer preserves literal $ characters in the private implementation.
    result = result.replace(pattern, () => `${signature} {${body}}`);
  }
  return result;
}

if (require.main === module) {
  const target = 'api/src/core/security/services/key-testor.ts';
  try {
    const result = injectKeyValidator(fs.readFileSync(target, 'utf8'), process.env);
    fs.writeFileSync(target, result);
    console.log('Private key validator injected successfully');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { injectKeyValidator };
