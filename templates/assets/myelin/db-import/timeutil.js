// UTC timestamp parsing, microsecond arithmetic and selected-timezone projection (port of time_projection.parse_utc_timestamp / project_utc_timestamp).
// Instants are BigInt microseconds since the Unix epoch so the desktop's microsecond maths stays exact.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, {PyError, ValueError, OverflowErr} = NS;
  const TimezoneProjectionError = (m) => new PyError('ValueError', m);   // a ValueError subclass in Python
  const MIN_US = -62135596800000000n, MAX_US = 253402300799999999n;      // 0001-01-01 .. 9999-12-31 (datetime range)

  const daysFromCivil = (y, m, d) => {                                      // proleptic Gregorian, days since 1970-01-01
    y -= m <= 2 ? 1 : 0;
    const era = Math.floor(y / 400), yoe = y - era * 400, doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1, doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  };
  const civilFromDays = (z) => {
    z += 719468;
    const era = Math.floor(z / 146097), doe = z - era * 146097, yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const y = yoe + era * 400, doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp + (mp < 10 ? 3 : -9);
    return [y + (m <= 2 ? 1 : 0), m, d];
  };
  const dim = (y, m) => [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

  // 2026-10-08T05:41:19.966374Z | 2026-10-08 05:41:19+00:00 | ...T05:41 | fractional digits beyond 6 are truncated (datetime.fromisoformat)
  const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?)?(?:([+-])(\d{2})(?::?(\d{2})(?::?(\d{2}))?)?)?$/;

  /** parse_utc_timestamp: only an instant that is explicitly UTC (suffix Z or a zero offset) is accepted. */
  function parseUtc(value) {
    let text = NS.strip(value === null || value === undefined || value === false || value === 0n || value === '' ? '' : (typeof value === 'string' ? value : NS.str(value)));
    if (text.endsWith('Z')) text = text.slice(0, -1) + '+00:00';
    const m = ISO.exec(text);
    if (!m || m[8] === undefined) throw TimezoneProjectionError(m ? 'timestamp does not identify a UTC instant' : 'UTC timestamp is unreadable');
    const [y, mo, d] = [+m[1], +m[2], +m[3]], h = m[4] === undefined ? 0 : +m[4], mi = m[5] === undefined ? 0 : +m[5], s = m[6] === undefined ? 0 : +m[6];
    if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > dim(y, mo) || h > 23 || mi > 59 || s > 59) throw TimezoneProjectionError('UTC timestamp is unreadable');
    const oh = +m[9], om = m[10] === undefined ? 0 : +m[10], os = m[11] === undefined ? 0 : +m[11];
    if (oh > 23 || om > 59 || os > 59) throw TimezoneProjectionError('UTC timestamp is unreadable');
    if (oh || om || os) throw TimezoneProjectionError('timestamp does not identify a UTC instant');
    const frac = m[7] === undefined ? 0n : BigInt(m[7].slice(0, 6).padEnd(6, '0'));
    const days = BigInt(daysFromCivil(y, mo, d));
    return days * 86400000000n + BigInt(h * 3600 + mi * 60 + s) * 1000000n + frac;
  }
  const checkRange = (us) => { if (us < MIN_US || us > MAX_US) throw OverflowErr('date value out of range'); return us; };
  /** datetime.isoformat(timespec='microseconds') in UTC, 'Z' form. */
  function isoZ(us) {
    checkRange(us);
    const days = us >= 0n ? us / 86400000000n : -((-us + 86399999999n) / 86400000000n);
    const rem = us - days * 86400000000n, [y, mo, d] = civilFromDays(Number(days));
    const sec = rem / 1000000n, micro = rem % 1000000n, p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(y, 4)}-${p(mo)}-${p(d)}T${p(sec / 3600n)}:${p((sec % 3600n) / 60n)}:${p(sec % 60n)}.${p(micro, 6)}Z`;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtCache = new Map();
  function formatter(key) {
    if (!fmtCache.has(key)) {
      try {
        fmtCache.set(key, new Intl.DateTimeFormat('en-GB', Object.assign({year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'}, key === 'local' ? {} : {timeZone: key})));
      } catch (e) { throw TimezoneProjectionError(`named presentation timezone is unavailable: ${key}`); }
    }
    return fmtCache.get(key);
  }
  /** project_utc_timestamp(value, key).strftime('%d %b %Y · %H:%M:%S' | '%H:%M:%S'); a ValueError (-> 'Unavailable' upstream) for any unreadable value or zone. */
  function stampOf(value, timezoneKey, full) {
    const key = NS.strip(String(timezoneKey || ''));
    if (!key) throw TimezoneProjectionError('presentation timezone key is empty');
    const us = parseUtc(value), ms = Number(us / 1000n - (us % 1000n < 0n ? 1n : 0n)), parts = {};
    for (const p of formatter(key).formatToParts(new Date(ms))) parts[p.type] = p.value;
    const p2 = (v) => String(v).padStart(2, '0');
    const time = `${p2(parts.hour)}:${p2(parts.minute)}:${p2(parts.second)}`;
    return full ? `${p2(parts.day)} ${MONTHS[+parts.month - 1]} ${String(parts.year).padStart(4, '0')} · ${time}` : time;
  }
  NS.time = {parseUtc, isoZ, checkRange, stampOf, TimezoneProjectionError};
})(self);
