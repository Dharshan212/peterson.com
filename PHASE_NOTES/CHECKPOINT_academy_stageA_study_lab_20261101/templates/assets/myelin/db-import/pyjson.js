// Python json.loads / json.dumps equivalents for the adapter's value model (ints are BigInt, floats are Number, dicts are null-prototype objects).
// loads: Python's strict grammar, including its NaN / Infinity / -Infinity extensions, duplicate keys (last wins) and rejection of raw control characters.
// dumps: only what the desktop serialises -- ints, strings, bools, None, lists, dicts. Floats are never dumped by the projection, so they are refused rather than approximated.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, {ValueError, dict} = NS;
  const MAX_DEPTH = 900;

  class JSONDecodeError extends NS.PyError { constructor(msg) { super('ValueError', msg); this.name = 'JSONDecodeError'; } }

  /** opts.strict reproduces the desktop's hardened readers: object_pairs_hook rejecting duplicate keys and parse_constant rejecting NaN / Infinity. */
  function loads(text, opts) {
    const strict = !!(opts && opts.strict);
    if (typeof text !== 'string') throw NS.TypeErr('the JSON object must be str');
    let i = 0;
    const n = text.length;
    const ws = () => { while (i < n) { const c = text.charCodeAt(i); if (c === 32 || c === 9 || c === 10 || c === 13) i++; else break; } };
    const fail = (m) => { throw new JSONDecodeError(`${m}: char ${i}`); };
    function str() {
      i++; let out = '';
      for (;;) {
        if (i >= n) fail('Unterminated string starting at');
        const c = text[i], code = text.charCodeAt(i);
        if (c === '"') { i++; return out; }
        if (c === '\\') {
          const e = text[i + 1];
          if (e === undefined) fail('Unterminated string starting at');
          const simple = {'"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t'};
          if (e in simple) { out += simple[e]; i += 2; continue; }
          if (e === 'u') {
            const hex = text.slice(i + 2, i + 6);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('Invalid \\uXXXX escape');
            out += String.fromCharCode(parseInt(hex, 16)); i += 6; continue;
          }
          fail('Invalid \\escape');
        }
        if (code < 0x20) fail('Invalid control character at');
        out += c; i++;
      }
    }
    const num = /-?(?:0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?/y;
    function value(depth) {
      if (depth > MAX_DEPTH) throw new Error('RecursionError: maximum recursion depth exceeded');
      ws();
      if (i >= n) fail('Expecting value');
      const c = text[i];
      if (c === '{') {
        i++; const o = dict(); ws();
        if (text[i] === '}') { i++; return o; }
        for (;;) {
          ws(); if (text[i] !== '"') fail('Expecting property name enclosed in double quotes');
          const k = str(); ws(); if (text[i] !== ':') fail("Expecting ':' delimiter"); i++;
          if (strict && k in o) fail('duplicate JSON key');
          o[k] = value(depth + 1); ws();
          if (text[i] === ',') { i++; continue; }
          if (text[i] === '}') { i++; return o; }
          fail("Expecting ',' delimiter");
        }
      }
      if (c === '[') {
        i++; const a = []; ws();
        if (text[i] === ']') { i++; return a; }
        for (;;) {
          a.push(value(depth + 1)); ws();
          if (text[i] === ',') { i++; continue; }
          if (text[i] === ']') { i++; return a; }
          fail("Expecting ',' delimiter");
        }
      }
      if (c === '"') return str();
      if (text.startsWith('null', i)) { i += 4; return null; }
      if (text.startsWith('true', i)) { i += 4; return true; }
      if (text.startsWith('false', i)) { i += 5; return false; }
      if (strict && (text.startsWith('NaN', i) || text.startsWith('Infinity', i) || text.startsWith('-Infinity', i))) fail('non-finite JSON value');
      if (text.startsWith('NaN', i)) { i += 3; return NaN; }
      if (text.startsWith('Infinity', i)) { i += 8; return Infinity; }
      if (text.startsWith('-Infinity', i)) { i += 9; return -Infinity; }
      num.lastIndex = i; const m = num.exec(text);
      if (!m) fail('Expecting value');
      i += m[0].length;
      return (m[1] || m[2]) ? Number(m[0]) : BigInt(m[0]);
    }
    const v = value(0); ws();
    if (i < n) fail('Extra data');
    return v;
  }

  const SHORT = {'"': '\\"', '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f'};
  function quote(s, ensureAscii) {
    let out = '"';
    for (let k = 0; k < s.length; k++) {
      const ch = s[k], c = s.charCodeAt(k);
      if (SHORT[ch]) out += SHORT[ch];
      else if (c < 0x20) out += '\\u' + c.toString(16).padStart(4, '0');
      else if (ensureAscii && c > 0x7e) out += '\\u' + c.toString(16).padStart(4, '0');   // UTF-16 units: astral characters become surrogate pairs, as in Python
      else out += ch;
    }
    return out + '"';
  }
  /** json.dumps(value, ensure_ascii=..., separators=(',', ':') when compact else (', ', ': ')) for ints / strs / bools / None / lists / dicts. */
  function dumps(v, {ensureAscii = true, compact = false} = {}) {
    const sepItem = compact ? ',' : ', ', sepKey = compact ? ':' : ': ';
    const walk = (x) => {
      if (x === null) return 'null';
      if (x === true) return 'true';
      if (x === false) return 'false';
      if (typeof x === 'bigint') return x.toString();
      if (typeof x === 'string') return quote(x, ensureAscii);
      if (Array.isArray(x)) return '[' + x.map(walk).join(sepItem) + ']';
      if (NS.isDict(x)) return '{' + Object.keys(x).map((k) => quote(k, ensureAscii) + sepKey + walk(x[k])).join(sepItem) + '}';
      throw ValueError('value type is not serialised by the projection');
    };
    return walk(v);
  }
  NS.pyjson = {loads, dumps, JSONDecodeError};
})(self);
