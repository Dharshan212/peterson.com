export function createPoster(p) {
    const NS = 'http://www.w3.org/2000/svg';
    const INK = '#f3f7ff', MUTED = '#9fb0d0', CYAN = '#22e6ff', SLATE = '#5d6d90', PURPLE = '#b060ff';
    const COL = { SINE: '#ff8a1f', MINE: '#ff2fb8', COSINE: '#a44dff', COSECANT: '#2dff6f' };
    const TINT = { SINE: '#1d0f04', MINE: '#1a0619', COSINE: '#120826', COSECANT: '#04170b' };
    const ORIGIN = { SINE: [26, 156], MINE: [849, 156], COSINE: [26, 602], COSECANT: [849, 602] };
    const COPY = {
      SINE: [['DETECTS DISTRACTION.', 'NUDGES YOU BACK.'], ['“A gentle nudge today,', 'a stronger you tomorrow.”']],
      MINE: [['FOR MESSAGING DISTRACTIONS.', 'A CHANCE TO CHOOSE.'], ['“A decision today', 'shapes a better tomorrow.”']],
      COSINE: [['MONITORS OTT VIEWING.', 'KEEPS YOU AWARE.'], ['“Enjoy today,', 'stay in control tomorrow.”']],
      COSECANT: [['MANAGES BREAKS.', 'BRINGS YOU BACK TO STUDY.'], ['“A short break.', 'A stronger session.”']],
    };
    const FONT = "'Segoe UI', Inter, 'Noto Sans', Arial, sans-serif";
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pct = (n, d) => d ? Math.round(n / d * 100) + '%' : '—';
    const fmt = (n) => Number(n).toLocaleString('en-US');

    const count=(organ,type)=>p.byOrgan[organ].events.filter(e=>e.type===type).length;
    const stages=organ=>p.byOrgan[organ].events.filter(e=>e.type==='STAGE_DISPLAYED');
    const F={
      sine:{total:p.byOrgan.SINE.episodes,stages:[1,2,3].map(n=>['SINE-'+n,stages('SINE').filter(e=>e.payload.stage===n).length]),returned:p.byOrgan.SINE.returned,life:p.byOrgan.SINE.stages},
      mine:{total:p.byOrgan.MINE.episodes,documented:p.byOrgan.MINE.returned,life:p.byOrgan.MINE.stages,choices:['A','B'].map((branch,i)=>{const es=p.byOrgan.MINE.events,ids=es.filter(e=>e.type==='BRANCH_CHOSEN'&&e.payload.branch===branch).map(e=>e.episodeId);const returned=es.filter(e=>e.type==='EPISODE_CLOSED'&&e.payload.outcome==='RETURNED'&&ids.includes(e.episodeId)).length;return {key:i?'ITS_IMPORTANT':'I_WILL_COME_BACK',label:i?'IT’S IMPORTANT':'I WILL COME BACK',color:i?'#ff9a1f':'#1fd35a',count:ids.length,outs:[['Returned',returned,'returned'],['Other / unresolved',ids.length-returned,'undocumented']]};})},
      cosine:{episodes:p.byOrgan.COSINE.episodes,events:p.byOrgan.COSINE.events.length,life:p.byOrgan.COSINE.stages,rows:[],types:[['Gate / stages',p.byOrgan.COSINE.stages,'#22e6ff'],['Intent',p.byOrgan.COSINE.intents,'#ff9a1f'],['Platform changes',count('COSINE','PLATFORM_CHANGED'),'#ff4fd8'],['Verified attempts',p.byOrgan.COSINE.verified,'#b060ff'],['Stable returns',p.byOrgan.COSINE.returned,'#35ff8a']]},
      cosecant:{breaks:p.byOrgan.COSECANT.episodes,confirmed:p.byOrgan.COSECANT.returned,life:p.byOrgan.COSECANT.stages,ladder:['BREAK_STARTED','BREAK_COMPLETE','BREAK_ALREADY_OVER','FINAL_LOCKED','RETURN_STARTED','RETURN_CONFIRMED'].map((name,i)=>[name,name.split('_')[0],name.split('_').slice(1).join(' '),['#1f7bff','#17d9a0','#ffd21f','#ff9a1f','#ff5a36','#35ff7a'][i],count('COSECANT',name),'—'])}
    };
    const ce=p.byOrgan.COSINE.events;
    const ids=ce.filter(e=>e.type==='EPISODE_STARTED').slice(-5).map(e=>e.episodeId);
    F.cosine.rows=ids.map((id,i)=>{const events=ce.filter(e=>e.episodeId===id),start=events[0].effectiveSeconds;return ['EP '+(i+1),'effective seconds',events.map(e=>e.effectiveSeconds-start)];});
    const kinds=Object.entries(ce.reduce((a,e)=>{a[e.type]=(a[e.type]||0)+1;return a;},{}));
    F.cosine.types=kinds.slice(0,5).map(([key,count],i)=>[key.replaceAll('_',' '),count,['#22e6ff','#ff9a1f','#ff4fd8','#b060ff','#35ff8a'][i]]);
    if(kinds.length>5)F.cosine.types.push(['Other events',kinds.slice(5).reduce((n,x)=>n+x[1],0),'#8091b4']);
    // ---- tiny SVG helpers ----
    function T(x, y, size, fill, text, o) {
      o = o || {};
      return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${o.a === 'c' ? 'middle' : o.a === 'r' ? 'end' : 'start'}"` +
        `${o.b ? ' font-weight="700"' : ''}${o.i ? ' font-style="italic"' : ''}${o.sp ? ` letter-spacing="${o.sp}"` : ''}${o.glow ? ' filter="url(#gcGlow)"' : ''}${o.fam ? ` font-family="${o.fam}"` : ''}${o.w ? ` textLength="${o.w}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(text)}</text>`;
    }
    const R = (x, y, w, h, r, fill, stroke, sw, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1}"` : ''}${extra || ''}/>`;
    function wrap(text, max) {
      const words = String(text).split(' '), lines = []; let cur = '';
      words.forEach((w) => { if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
      if (cur) lines.push(cur); return lines;
    }
    function inset(x, y, w, h, title, organ) {
      return R(x, y, w, h, 9, '#050912', COL[organ], 1.3, ' stroke-opacity=".55"') + T(x + 14, y + 26, 16, INK, title, { b: 1, sp: .5 });
    }
    function donut(x, y, w, title, slices, total, centre, organ, note) {
      const cx = x + 66, cy = y + 130, r = 50, C = 2 * Math.PI * r;
      let out = inset(x, y, w, 226, title, organ) + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#16203a" stroke-width="18"/>`;
      let off = 0;
      slices.forEach((s) => {
        const len = C * s.n / Math.max(1,total), gap = len > 6 ? 2 : 0;
        out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.c}" stroke-width="18" stroke-dasharray="${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
        off += len;
      });
      out += T(cx, cy + 8, 28, INK, fmt(total), { a: 'c', b: 1 }) + T(cx, cy + 24, 11, MUTED, centre, { a: 'c', b: 1, sp: .5 });
      const small = slices.length > 4; let ly = y + 52; const lx = x + 128, size = small ? 10.5 : 12.5, lh = small ? 11 : 15.5;
      slices.forEach((s) => {
        const lines = wrap(s.l, small ? 22 : 20).slice(0, 2);
        out += `<circle cx="${lx + 5}" cy="${ly + 8}" r="${small ? 4 : 5}" fill="${s.c}"/>`;
        lines.forEach((ln, k) => { out += T(lx + 17, ly + 12 + k * lh, size, INK, ln, { b: 1 }); });
        out += T(lx + 17, ly + 12 + lines.length * lh, size, s.c, `${fmt(s.n)}  (${pct(s.n, total)})`, { b: 1 });
        ly += (lines.length + 1) * lh + (small ? 1 : 6);
      });
      return out + T(x + 14, y + 214, 10.5, MUTED, note);
    }
    function cards(list, organ) {
      const w = (313 - 16) / 3;
      return list.map((c, i) => {
        const x = 478 + i * (w + 8);
        return `<g>${R(x, 324, w, 90, 9, '#04101c', CYAN, 1.4, ' fill-opacity=".95" stroke-opacity=".5"')}` +
          T(x + w / 2, 368, 32, INK, fmt(c[1]), { a: 'c', b: 1, glow: 1 }) +
          wrap(c[0], 14).slice(0, 2).map((ln, k) => T(x + w / 2, 386 + k * 15, 11.5, '#b9c8e6', ln, { a: 'c', b: 1 })).join('') + `</g>`;
      }).join('');
    }
    function icon(organ) {
      const c = COL[organ], base = ` fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
      const p = { SINE: '<path d="M49 16 L72 24 L72 44 C72 56 62 63 49 68 C36 63 26 56 26 44 L26 24 Z"' + base + '/><path d="M38 42 L46 50 L60 34"' + base + '/>',
        MINE: '<path d="M26 20 H72 V52 H46 L34 64 V52 H26 Z"' + base + '/>',
        COSINE: '<circle cx="49" cy="41" r="24"' + base + '/><path d="M42 30 L60 41 L42 52 Z"' + base + '/>',
        COSECANT: '<path d="M26 22 H48 V64 H26 Z M48 22 H72 V64 H48"' + base + '/>' }[organ];
      return p;
    }
    function chrome(organ) {
      const c = COL[organ], [tag, quote] = COPY[organ];
      return `<defs><linearGradient id="gcp${organ}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TINT[organ]}"/><stop offset="1" stop-color="#03060d"/></linearGradient></defs>` +
        R(0, 0, 805, 428, 18, `url(#gcp${organ})`) + `<rect x="1.5" y="1.5" width="802" height="425" rx="17" fill="none" stroke="${c}" stroke-width="2.6" filter="url(#gcGlow)"/>` +
        icon(organ) + T(92, 62, 50, c, organ, { b: 1, sp: 1, glow: 1 }) +
        T(92 + (organ.length * 33) + 34, 32, 15, '#dfe8ff', tag[0], { b: 1 }) + T(92 + (organ.length * 33) + 34, 54, 15, '#dfe8ff', tag[1], { b: 1 }) +
        T(783, 32, 15, c, quote[0], { a: 'r', i: 1 }) + T(783, 54, 15, c, quote[1], { a: 'r', i: 1 });
    }

    // ---- organ panels ----
    function panelSine() {
      const d = F.sine, left = [14, 88, 452, 326]; let o = chrome('SINE') + inset(...left, 'EPISODE FLOW (FUNNEL)', 'SINE');
      const maxW = 392, cx = 14 + 226, top = 88 + 44, sh = 58, gap = 5, colors = ['#21e05c', '#ffd21f', '#ff4b2b'];
      let prev = maxW;
      d.stages.forEach((s, i) => {
        const y = top + i * (sh + gap), bw = maxW * (0.36 + 0.64 * s[1] / Math.max(1,d.total)), ink = i === 2 ? '#fff' : '#08101e';
        o += `<defs><linearGradient id="gcf${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colors[i]}"/><stop offset="1" stop-color="${colors[i]}" stop-opacity=".45"/></linearGradient></defs>` +
          `<path d="M${cx - prev / 2} ${y} L${cx + prev / 2} ${y} L${cx + bw / 2} ${y + sh} L${cx - bw / 2} ${y + sh} Z" fill="url(#gcf${i})" stroke="${colors[i]}" stroke-width="1.6"/>` +
          T(cx, y + 23, 17, ink, s[0], { a: 'c', b: 1, sp: .6 }) + T(cx, y + 44, 15.5, ink, `${fmt(s[1])}  ·  ${pct(s[1], d.total)}`, { a: 'c', b: 1 });
        prev = bw;
      });
      const ny = top + 3 * (sh + gap) + 6;
      o += T(28, ny, 11, MUTED, `Unique recorded episodes; % of ${d.total} episodes. Escalation only.`) +
        `<line x1="28" y1="${ny + 20}" x2="452" y2="${ny + 20}" stroke="${PURPLE}" stroke-opacity=".55" stroke-dasharray="5 4"/>` +
        T(28, ny + 39, 12, PURPLE, 'RECOVERY OUTCOME (SEPARATE FROM ESCALATION)', { b: 1, sp: .5 }) +
        R(28, ny + 48, 424, 30, 7, '#160c26', PURPLE, 1, ' stroke-opacity=".5"') + R(28, ny + 48, 424 * d.returned / Math.max(1,d.total), 30, 7, PURPLE, null, 0, ' fill-opacity=".8"') +
        T(240, ny + 68, 13.5, '#fff', `VERIFIED RETURN  ${d.returned} of ${d.total} episodes  (${pct(d.returned, d.total)})`, { a: 'c', b: 1 });
      o += donut(478, 88, 313, 'EPISODE OUTCOMES', [{ n: d.returned, c: PURPLE, l: 'Verified return' }, { n: d.total - d.returned, c: SLATE, l: 'No verified return recorded' }], d.total, 'EPISODES', 'SINE', 'Verified return vs. none recorded');
      return o + cards([['EPISODES', d.total], ['VERIFIED RETURNS', d.returned], ['LOCAL DISPLAY STAGES', d.life]], 'SINE');
    }
    function panelMine() {
      const d = F.mine; let o = chrome('MINE') + inset(14, 88, 452, 326, 'DECISION PATHWAY (FLOW)', 'MINE');
      const tone = { returned: '#2dff8a', other: '#22c8ff', undocumented: '#8091b4' };
      const curve = (x1, y1, x2, y2, c, w) => `<path d="M${x1} ${y1} C${x1 + (x2 - x1) * .5} ${y1} ${x1 + (x2 - x1) * .5} ${y2} ${x2} ${y2}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity=".45"/>`;
      const node = (x, y, w, h, c, l1, l2, dash) => R(x, y, w, h, 8, '#06101c', c, 1.6, dash ? ' stroke-dasharray="5 3"' : '') + T(x + w / 2, y + h / 2 - 2, 11.5, INK, l1, { a: 'c', b: 1 }) + T(x + w / 2, y + h / 2 + 13, 11, c, l2, { a: 'c', b: 1 });
      const tops = [136, 268]; const nh = 34, ng = 5, rootY = 88 + 163 - 46, rx = 28, cxn = 128, ox = 278, ow = 174;
      let conn = '', nodes = node(rx, rootY, 70, 92, '#2a6cff', 'MINE-1', `${d.total} choices`);
      d.choices.forEach((c, ci) => {
        const top = tops[ci] - (ci === 0 ? 0 : 0), cy = top + (c.outs.length * nh + (c.outs.length - 1) * ng) / 2;
        conn += curve(rx + 70, rootY + 46, cxn, cy, c.color, 2.5 + 9 * c.count / Math.max(1,d.total));
        nodes += node(cxn, cy - 30, 120, 60, c.color, c.label, `${c.count} (${pct(c.count, d.total)})`);
        c.outs.forEach((out, k) => {
          const oy = top + k * (nh + ng);
          conn += curve(cxn + 120, cy, ox, oy + nh / 2, tone[out[2]], 2 + 8 * out[1] / Math.max(1,c.count));
          nodes += node(ox, oy, ow, nh, tone[out[2]], out[0], `${out[1]}/${c.count} (${pct(out[1], c.count)})`, out[2] === 'undocumented');
        });
      });
      o += conn + nodes + T(28, 404, 11, MUTED, 'Each branch is its own denominator; a choice is not a verified return.');
      o += donut(478, 88, 313, 'EPISODE OUTCOMES', [{ n: d.documented, c: '#35ff8a', l: 'Documented closure' }, { n: d.total - d.documented, c: SLATE, l: 'No documented closure' }], d.total, 'CHOICES', 'MINE', 'Documented closure vs. remainder');
      return o + cards([['MINE-1 CHOICES', d.total], ['DOCUMENTED OUTCOMES', d.documented], ['LOCAL DISPLAY STAGES', d.life]], 'MINE');
    }
    function panelCosine() {
      const d = F.cosine; let o = chrome('COSINE') + inset(14, 88, 452, 326, 'RECORDED EVENT TIMELINE', 'COSINE');
      const axMax = Math.max(60, ...d.rows.flatMap(r=>r[2])), x0 = 150, x1 = 448, evc = d.types.map((t) => t[2]);
      d.rows.forEach((r, i) => {
        const y = 88 + 62 + i * 50;
        o += T(28, y - 2, 13, INK, r[0], { b: 1 }) + T(28, y + 14, 11, MUTED, r[1]) +
          `<line x1="${x0}" y1="${y + 4}" x2="${x1}" y2="${y + 4}" stroke="#16203a" stroke-width="3"/>`;
        r[2].forEach((s, k) => { o += `<circle cx="${x0 + (x1 - x0) * s / axMax}" cy="${y + 4}" r="5.5" fill="${evc[(k + i) % evc.length]}" stroke="#050912" stroke-width="1.5"/>`; });
      });
      const ay = 369;
      o += `<line x1="${x0}" y1="${ay}" x2="${x1}" y2="${ay}" stroke="${SLATE}" stroke-width="1"/>`;
      [0, axMax/3, axMax*2/3, axMax].forEach((s) => { const x = x0 + (x1 - x0) * s / axMax; o += `<line x1="${x}" y1="${ay}" x2="${x}" y2="${ay + 5}" stroke="${SLATE}"/>` + T(x, ay + 18, 10.5, MUTED, s ? `${(s / 60).toFixed(1)}m` : '0', { a: 'c' }); });
      o += T(28, 404, 11, MUTED, 'Offsets from each episode’s first recorded event; last 5 episodes shown.');
      o += donut(478, 88, 313, 'RECORDED EVENTS', d.types.map((t) => ({ n: t[1], c: t[2], l: t[0] })), d.events, 'EVENTS', 'COSINE', 'Count by recorded event type');
      return o + cards([['EPISODES', d.episodes], ['RECORDED EVENTS', d.events], ['LOCAL DISPLAY STAGES', d.life]], 'COSINE');
    }
    function panelCosecant() {
      const d = F.cosecant; let o = chrome('COSECANT') + inset(14, 88, 452, 326, 'RETURN WINDOW (STEP LADDER)', 'COSECANT');
      d.ladder.forEach((s, i) => {
        const y = 88 + 44 + i * 44, w = 250 * s[4] / Math.max(1,d.breaks);
        o += `<circle cx="34" cy="${y + 16}" r="7" fill="${s[3]}"/>` + T(50, y + 13, 11.5, INK, s[1], { b: 1 }) + T(50, y + 27, 11.5, INK, s[2], { b: 1 }) +
          R(140, y + 4, 250, 24, 5, '#0a1220') + R(140, y + 4, Math.max(4, w), 24, 5, s[3], null, 0, ' fill-opacity=".85"') +
          T(146, y + 21, 12.5, w<90?INK:'#06101c', `${s[4]} · ${pct(s[4], d.breaks)}`, { b: 1 }) + T(444, y + 21, 12.5, '#dfe8ff', s[5], { a: 'r', b: 1 });
      });
      o += T(28, 404, 11, MUTED, 'Counts from accepted local events. Median timing is not calculated.');
      o += donut(478, 88, 313, 'EPISODE OUTCOMES', [{ n: d.confirmed, c: '#2dff6f', l: 'Return confirmed' }, { n: d.breaks - d.confirmed, c: SLATE, l: 'No return confirmation recorded' }], d.breaks, 'BREAKS', 'COSECANT', 'Confirmed vs. none recorded');
      return o + cards([['BREAKS', d.breaks], ['CONFIRMED RETURNS', d.confirmed], ['LOCAL DISPLAY STAGES', d.life]], 'COSECANT');
    }

    function posterSVG() {
      const now = new Date(), gen = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      const foot = ['PRODUCTIVE USE', 'SELF-CONTROL', 'BETTER HABITS', 'A CALMER MIND', 'A BRIGHTER TOMORROW'];
      let s = `<svg xmlns="${NS}" viewBox="0 0 1680 1188" font-family="${FONT}" role="img" aria-label="MYELIN Neon Poster — web local data">` +
        `<defs><linearGradient id="gcBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a18"/><stop offset="1" stop-color="#02040a"/></linearGradient>` +
        `<radialGradient id="gcR1"><stop offset="0" stop-color="#3a1e9a" stop-opacity=".45"/><stop offset="1" stop-color="#3a1e9a" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="gcR2"><stop offset="0" stop-color="#0a6a8a" stop-opacity=".4"/><stop offset="1" stop-color="#0a6a8a" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="gcR3"><stop offset="0" stop-color="#7a3a12" stop-opacity=".4"/><stop offset="1" stop-color="#7a3a12" stop-opacity="0"/></radialGradient>` +
        `<linearGradient id="gcMt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1a30"/><stop offset="1" stop-color="#040810"/></linearGradient>` +
        `<filter id="gcGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
        `<rect width="1680" height="1188" fill="url(#gcBg)"/><circle cx="230" cy="60" r="520" fill="url(#gcR1)"/><circle cx="1450" cy="60" r="520" fill="url(#gcR2)"/><circle cx="840" cy="1200" r="760" fill="url(#gcR3)"/>`;
      // mountains + horizon
      s += `<path d="M0 1188 L0 1166 L120 1144 L260 1168 L420 1128 L560 1162 L700 1138 L840 1166 L990 1132 L1140 1164 L1290 1136 L1440 1166 L1560 1144 L1680 1168 L1680 1188 Z" fill="url(#gcMt)"/>` +
        `<path d="M0 1166 L120 1144 L260 1168 L420 1128 L560 1162 L700 1138 L840 1166 L990 1132 L1140 1164 L1290 1136 L1440 1166 L1560 1144 L1680 1168" fill="none" stroke="#188aa8" stroke-width="1.2" stroke-opacity=".5"/>`;
      // header: logo mark + wordmark
      s += `<g transform="translate(22 10)"><path d="M18 100 V28 L64 74 L110 28 V100" fill="none" stroke="${CYAN}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" filter="url(#gcGlow)"/><circle cx="64" cy="20" r="6" fill="#a78bfa"/></g>` +
        T(158, 78, 68, CYAN, 'MYELIN', { b: 1, glow: 1 }) + T(468, 78, 38, INK, 'LITE', { b: 1, glow: 1 }) +
        T(160, 112, 14, '#7fe8ff', 'OBSERVE · UNDERSTAND · NUDGE · RECOVER · REPEAT', { sp: 1.6 }) +
        T(840, 50, 26, '#bfeaff', 'BEHAVIOUR ANALYTICS FOR A', { a: 'c', sp: 4, glow: 1 }) + T(840, 96, 48, INK, 'FOCUSED TOMORROW', { a: 'c', b: 1, sp: 3, glow: 1 }) +
        T(840, 128, 15, CYAN, 'WEB LOCAL DATA  ·  FOUR-ORGAN SUMMARY', { a: 'c', sp: 3.3 }) +
        T(1300, 62, 26, INK, '“Distraction is not a failure.', { a: 'c', i: 1 }) + T(1300, 94, 26, INK, 'It is a signal.”', { a: 'c', i: 1 }) + T(1300, 124, 16, CYAN, '— MYELIN', { a: 'c', sp: 1.3 }) +
        `<line x1="1490" y1="26" x2="1490" y2="132" stroke="${CYAN}" stroke-opacity=".7" stroke-width="1.6"/>` +
        ['AWARENESS', 'DISCIPLINE', 'SELF-CONTROL', 'BETTER HABITS', 'A BRIGHTER YOU'].map((w, i) => T(1508, 42 + i * 23, 15, CYAN, w, { b: 1, sp: 1.2 })).join('');
      // panels
      [['SINE', panelSine], ['MINE', panelMine], ['COSINE', panelCosine], ['COSECANT', panelCosecant]].forEach(([k, fn]) => { s += `<g transform="translate(${ORIGIN[k][0]} ${ORIGIN[k][1]})">${fn()}</g>`; });
      // footer
      foot.forEach((l, i) => { const cx = 250 + i * 188 + 94; s += `<circle cx="${cx}" cy="1066" r="14" fill="none" stroke="${CYAN}" stroke-width="2.6"/>` + T(cx, 1112, 14.5, '#8fefff', l, { a: 'c', b: 1, sp: 1.1 }); if (i) s += `<line x1="${250 + i * 188}" y1="1048" x2="${250 + i * 188}" y2="1106" stroke="${CYAN}" stroke-opacity=".55" stroke-width="1.4"/>`; });
      s += T(1222, 1092, 38, CYAN, 'MYELIN', { b: 1, glow: 1 }) + T(1408, 1078, 14, '#cfe9ff', 'MORE THAN A TOOL', { sp: 1 }) + T(1408, 1100, 14, '#cfe9ff', 'WEB LOCAL EVIDENCE', { sp: 1 }) +
        R(1562, 1046, 98, 56, 6, '#04101e', CYAN, 1.2, ' fill-opacity=".9" stroke-opacity=".7"') + T(1611, 1070, 13.5, INK, 'MYELIN 2.0', { a: 'c', b: 1 }) + T(1611, 1090, 12.5, INK, 'EST. 2026', { a: 'c' }) +
        `<g transform="translate(38 1082) rotate(-7)">${T(0, 0, 26, '#dbe6ff', 'Small Steps', { i: 1 })}${T(22, 28, 26, '#dbe6ff', 'Big Change', { i: 1 })}</g>` +
        T(840, 1146, 15, '#7fe8ff', 'DATA TODAY  ·  DISCIPLINE TOMORROW  ·  A BRIGHTER YOU', { a: 'c', sp: 3.3 }) +
        T(840, 1176, 12, '#a9bad8', `WEB LITE · SIMULATED BROWSER EVIDENCE · policy v1. Generated ${gen}  ·  layout follows the MYELIN Neon Poster.`, { a: 'c' });
      return s + '</svg>';
    }
return posterSVG();
}
