// Pure SQLite file-header inspection (https://www.sqlite.org/fileformat.html#the_database_header). No SQLite engine is involved:
// hostile or truncated files are rejected here, before any byte reaches the WebAssembly parser.
'use strict';
(function (g) {
  const MAGIC = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];
  function inspectDbHeader(u8) {
    if (!(u8 instanceof Uint8Array)) return {ok: false, code: 'MALFORMED_HEADER'};
    if (u8.length === 0) return {ok: false, code: 'EMPTY_FILE'};
    const n = Math.min(16, u8.length);
    for (let i = 0; i < n; i++) if (u8[i] !== MAGIC[i]) return {ok: false, code: 'NOT_SQLITE'};
    if (u8.length < 100) return {ok: false, code: 'TRUNCATED'};
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let pageSize = dv.getUint16(16);
    if (pageSize === 1) pageSize = 65536;
    if (pageSize < 512 || pageSize > 65536 || (pageSize & (pageSize - 1)) !== 0) return {ok: false, code: 'MALFORMED_HEADER'};
    const writeVersion = u8[18], readVersion = u8[19];
    if ((writeVersion !== 1 && writeVersion !== 2) || (readVersion !== 1 && readVersion !== 2)) return {ok: false, code: 'MALFORMED_HEADER'};
    if (u8[21] !== 64 || u8[22] !== 32 || u8[23] !== 32) return {ok: false, code: 'MALFORMED_HEADER'};
    const changeCounter = dv.getUint32(24), declaredPages = dv.getUint32(28), validFor = dv.getUint32(92);
    const trustedCount = declaredPages > 0 && changeCounter === validFor;
    const encoding = dv.getUint32(56);
    if (encoding < 1 || encoding > 3) return {ok: false, code: 'MALFORMED_HEADER'};
    if (u8.length % pageSize !== 0) return {ok: false, code: 'TRUNCATED'};
    if (trustedCount && u8.length < declaredPages * pageSize) return {ok: false, code: 'TRUNCATED'};
    return {
      ok: true, pageSize, pageCount: trustedCount ? declaredPages : u8.length / pageSize,
      walFlag: writeVersion === 2 || readVersion === 2, encoding,
      userVersion: dv.getInt32(60), applicationId: dv.getUint32(68), sqliteVersionNumber: dv.getUint32(96)
    };
  }
  g.inspectDbHeader = inspectDbHeader;
})(self);
