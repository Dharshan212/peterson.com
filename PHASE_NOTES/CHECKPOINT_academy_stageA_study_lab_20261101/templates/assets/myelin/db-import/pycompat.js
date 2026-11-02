// Python-semantics primitives for the SECANT evidence adapter (a port of the desktop's pure-Python read side).
// Value model used by every adapter module: int -> BigInt, float -> Number, str -> string, bool -> boolean, None -> null,
// list -> Array, dict -> null-prototype object. This keeps 64-bit nanosecond clocks exact and keeps Python's int/float/bool distinctions.
// Classic script (runs in the reader worker and in test pages); no network, storage or DOM access.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB = g.MYELIN_DB || {};

  /** An exception the desktop code catches (KeyError / ValueError / TypeError / OverflowError). Anything else is a "crash" and propagates. */
  class PyError extends Error {
    constructor(kind, message) { super(message); this.kind = kind; this.pyMessage = message; }
  }
  const ValueError = (m) => new PyError('ValueError', m);
  const TypeErr = (m) => new PyError('TypeError', m);
  const KeyErr = (k) => new PyError('KeyError', `'${k}'`);
  const OverflowErr = (m) => new PyError('OverflowError', m);
  /** Python str(exception). */
  const pyStr = (e) => (e instanceof PyError ? e.pyMessage : String(e));
  /** try/except for a tuple of exception kinds; a foreign JS error (a bug, or a Python class the desktop does not catch) is rethrown. */
  function attempt(fn, kinds, onError) {
    try { return fn(); } catch (e) { if (e instanceof PyError && kinds.includes(e.kind)) return onError(e); throw e; }
  }
  const CAUGHT = ['KeyError', 'ValueError', 'TypeError'];
  const CAUGHT4 = ['KeyError', 'ValueError', 'TypeError', 'OverflowError'];

  const dict = (init) => { const d = Object.create(null); if (init) for (const k of Object.keys(init)) d[k] = init[k]; return d; };
  const isDict = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Uint8Array) && Object.getPrototypeOf(x) === null;
  const isInt = (x) => typeof x === 'bigint';
  const isFloat = (x) => typeof x === 'number';
  const isStr = (x) => typeof x === 'string';
  const isNum = (x) => isInt(x) || isFloat(x);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  /** dict[key] -> KeyError when absent (also TypeError when o is not a mapping, like Python's TypeError on a list with a str index). */
  function item(o, k) {
    if (isDict(o)) { if (!has(o, k)) throw KeyErr(k); return o[k]; }
    if (Array.isArray(o)) throw TypeErr('list indices must be integers or slices, not str');
    throw TypeErr('object is not subscriptable');
  }
  /** dict.get(key, default): AttributeError (a crash, not caught by the desktop) when o is not a mapping. */
  function get(o, k, d = null) {
    if (!isDict(o)) throw new Error('AttributeError: object has no attribute get');
    return has(o, k) ? o[k] : d;
  }
  const truthy = (x) => !(x === null || x === undefined || x === false || x === 0n || x === 0 || x === '' || (Array.isArray(x) && x.length === 0) || (isDict(x) && Object.keys(x).length === 0));
  /** Python == for the value model (1 == 1.0, no str/number coercion). */
  function eq(a, b) {
    if (isNum(a) && isNum(b)) return a == b; // eslint-disable-line eqeqeq  (BigInt/Number mathematical comparison)
    if (typeof a === 'boolean' || typeof b === 'boolean') return (typeof a === 'boolean' && typeof b === 'boolean' && a === b) || (typeof a === 'boolean' && isNum(b) && Number(a) == b) || (typeof b === 'boolean' && isNum(a) && Number(b) == a); // eslint-disable-line eqeqeq
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
    if (isDict(a) && isDict(b)) { const ka = Object.keys(a); return ka.length === Object.keys(b).length && ka.every((k) => has(b, k) && eq(a[k], b[k])); }
    return a === b;
  }
  /** Python str(x) for the value model (floats are never stringified by the desktop projection). */
  function str(x) {
    if (x === null || x === undefined) return 'None';
    if (typeof x === 'boolean') return x ? 'True' : 'False';
    if (isInt(x) || isStr(x)) return String(x);
    throw TypeErr('str() of this value is not used by the projection');
  }
  const toNumber = (x) => (isInt(x) ? Number(x) : x);
  /** Python str.capitalize(): first character upper-cased, the rest lower-cased. */
  // str.capitalize() uses the TITLE-case mapping of the first character ('ß' -> 'Ss', 'ǆ' -> 'ǅ', ligature 'ﬁ' -> 'Fi'); JS toUpperCase() differs for these.
  const TITLE = {'ß': 'Ss', 'ǆ': 'ǅ', 'ǅ': 'ǅ', 'Ǆ': 'ǅ', 'ǉ': 'ǈ', 'ǈ': 'ǈ', 'Ǉ': 'ǈ', 'ǌ': 'ǋ', 'ǋ': 'ǋ', 'Ǌ': 'ǋ', 'ǳ': 'ǲ', 'ǲ': 'ǲ', 'Ǳ': 'ǲ', 'ﬀ': 'Ff', 'ﬁ': 'Fi', 'ﬂ': 'Fl', 'ﬃ': 'Ffi', 'ﬄ': 'Ffl', 'ﬅ': 'St', 'ﬆ': 'St', 'ŉ': 'ʼN', 'ǰ': 'J̌'};
  const capitalize = (s) => { if (!s.length) return s; const first = String.fromCodePoint(s.codePointAt(0)); return (TITLE[first] || first.toUpperCase()) + s.slice(first.length).toLowerCase(); };
  /** Python str.strip() (Unicode whitespace). */
  const strip = (s) => s.replace(/^[\s\u0085\u001c-\u001f]+|[\s\u0085\u001c-\u001f]+$/g, '');

  /** Code-point comparison of two strings (Python str ordering); JS < compares UTF-16 code units. */
  function cmpStr(a, b) {
    const x = Array.from(a), y = Array.from(b), n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) { const p = x[i].codePointAt(0), q = y[i].codePointAt(0); if (p !== q) return p < q ? -1 : 1; }
    return x.length === y.length ? 0 : x.length < y.length ? -1 : 1;
  }
  /** Python ordering for ints / floats / strs / tuples (arrays). */
  function cmp(a, b) {
    if (a === null && b === null) return 0;
    if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
    if (isNum(a) && isNum(b)) return a < b ? -1 : a > b ? 1 : 0;
    if (isStr(a) && isStr(b)) return cmpStr(a, b);
    if (Array.isArray(a) && Array.isArray(b)) { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) { const c = cmp(a[i], b[i]); if (c) return c; } return a.length - b.length < 0 ? -1 : a.length > b.length ? 1 : 0; }
    throw TypeErr('unorderable types');
  }
  const lt = (a, b) => cmp(a, b) < 0, le = (a, b) => cmp(a, b) <= 0, gt = (a, b) => cmp(a, b) > 0, ge = (a, b) => cmp(a, b) >= 0;
  /** Python + and - on int/float operands; any other operand type is the TypeError Python raises. */
  function arith(a, b, sign) {
    if (!isNum(a) || !isNum(b)) throw TypeErr("unsupported operand type(s) for arithmetic");
    if (isInt(a) && isInt(b)) return sign > 0 ? a + b : a - b;
    return sign > 0 ? Number(a) + Number(b) : Number(a) - Number(b);
  }
  const add = (a, b) => arith(a, b, 1), sub = (a, b) => arith(a, b, -1);
  /** sorted(items, key=...) -- stable. */
  const sortedBy = (items, keyFn) => items.map((v, i) => [keyFn(v), i, v]).sort((p, q) => cmp(p[0], q[0]) || p[1] - q[1]).map((p) => p[2]);

  /** repr() of a str / int / None / tuple of them, as the desktop sorts episode groups by repr(key). */
  const NONPRINTABLE = /^[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u;   // Python str.isprintable() == False (the ASCII space itself is printable)
  function reprStr(s) {
    const useDouble = s.includes("'") && !s.includes('"'), q = useDouble ? '"' : "'";
    let out = q;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (ch === q || ch === '\\') out += '\\' + ch;
      else if (ch === '\n') out += '\\n'; else if (ch === '\r') out += '\\r'; else if (ch === '\t') out += '\\t';
      else if (c < 0x20 || c === 0x7f) out += '\\x' + c.toString(16).padStart(2, '0');
      else if (c >= 0x80 && NONPRINTABLE.test(ch)) out += c < 0x100 ? '\\x' + c.toString(16).padStart(2, '0') : c < 0x10000 ? '\\u' + c.toString(16).padStart(4, '0') : '\\U' + c.toString(16).padStart(8, '0');
      else out += ch;
    }
    return out + q;
  }
  function repr(x) {
    if (x === null) return 'None';
    if (isInt(x)) return String(x);
    if (isStr(x)) return reprStr(x);
    if (Array.isArray(x)) return x.length === 1 ? `(${repr(x[0])},)` : `(${x.map(repr).join(', ')})`;
    throw TypeErr('repr not supported');
  }

  /** Python round-half-even to 0 places (what f"{x:.0f}" does for exactly representable ties). */
  function fixed0(x) {
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : x < 0 ? '-inf' : 'nan';
    const fl = Math.floor(x), diff = x - fl;
    let r = diff < 0.5 ? fl : diff > 0.5 ? fl + 1 : (fl % 2 === 0 ? fl : fl + 1);
    return r === 0 && (x < 0 || Object.is(x, -0)) ? '-0' : r.toFixed(0);
  }
  const isFinite = (x) => (isInt(x) ? true : Number.isFinite(x));
  /** Python 3.12+ sum(): exact for ints; once a float appears, Neumaier-compensated float addition (ints are added plainly). */
  function sum(items) {
    let i = 0, exact = 0n;
    for (; i < items.length && isInt(items[i]); i++) exact += items[i];
    if (i === items.length) return exact;
    let f = Number(exact), c = 0;
    for (; i < items.length; i++) {
      const it = items[i];
      if (isFloat(it)) { const t = f + it; c += Math.abs(f) >= Math.abs(it) ? (f - t) + it : (it - t) + f; f = t; }
      else if (isInt(it)) f += Number(it);
      else throw TypeErr('unsupported operand type(s) for +');
    }
    return c && Number.isFinite(c) ? f + c : f;
  }

  Object.assign(NS, {lt, le, gt, ge, add, sub, sum, PyError, ValueError, TypeErr, KeyErr, OverflowErr, pyStr, attempt, CAUGHT, CAUGHT4, dict, isDict, isInt, isFloat, isStr, isNum, has, item, get, truthy, eq, str, toNumber, capitalize, strip, cmp, cmpStr, sortedBy, repr, fixed0, isFinite});
})(self);
