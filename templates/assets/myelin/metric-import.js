// Metric Hub page for an IMPORTED database file: the same blocks, classes and wording as the Metric Hub page, filled from the desktop's lifetime projection
// (METRIC_HUB.read_model.read_lifetime_metric_hub, ported in db-import/metrichub.js). A figure the desktop calls unavailable reads "Unavailable" with its reason; nothing is estimated.
import {el, button} from './dom.js';
const ORGANS = [['SINE', 'sine'], ['COSINE', 'cosine'], ['MINE', 'mine'], ['COSECANT', 'cosecant']];
const val = (m) => (m && m.status === 'AVAILABLE' ? String(m.value) : 'Unavailable');
const unavailable = (why, h) => el('div', {class: 'mh-unavail', style: h ? `height:${h}px` : null}, el('b', {}, 'CHART UNAVAILABLE'), el('span', {}, why));

export function buildImportedMetricHub({d, T, state, actions}) {
  const stat = (id, n, l, s) => { const node = el('div', {class: 'metric-stat'}, el('div', {class: 'num', id}, String(n)), el('div', {class: 'label'}, l), el('div', {class: 'sub'}, s)); return node; };
  const seriesOk = d.session_series_status === 'AVAILABLE', rows = d.session_rows;
  const when = (iso) => (Number.isFinite(Date.parse(iso)) ? `${T.day(iso)} ${T.hm(iso)} [${T.tag()}]` : 'time unavailable');
  const detail = el('div', {class: 'mh-detail-line', id: 'mhDetail'}, 'No session detail available.');
  const barsOf = (pick, label, aria) => {
    const max = Math.max(1, ...rows.map((r) => Number(pick(r).value)));
    const bars = el('div', {class: 'mh-bars', role: 'img', 'aria-label': aria}, rows.map((r, i) => {
      const v = Number(pick(r).value);
      const b = el('button', {type: 'button', class: `mh-bar${i === state.selected ? ' on' : ''}`, title: `#${r.session_id} · ${v} ${label}`, style: `height:${Math.max(3, v / max * 100)}%`, 'aria-label': `Session ${i + 1} (#${r.session_id}): ${v} ${label}`});
      b.onclick = () => {
        state.selected = i;
        detail.textContent = `#${r.session_id} · ${r.is_closed ? 'closed' : 'no close recorded'} · started ${when(r.started_at_utc)} · triggers ${val(r.combined_triggers)} · returned ${val(r.combined_returned)}`;
        bars.querySelectorAll('.mh-bar').forEach((x, j) => x.classList.toggle('on', j === i));
      };
      return b;
    }));
    return bars;
  };
  const bd = d.behaviour_distribution;
  const cats = [['Social', bd.social_count, bd.social_percent, '#FB7185'], ['OTT', bd.ott_count, bd.ott_percent, 'var(--amber)'], ['Messaging', bd.messaging_count, bd.messaging_percent, 'var(--cyan)']];
  const total = bd.status === 'AVAILABLE' ? bd.eligible_total : 0;
  const donut = el('div', {class: 'mh-donut'});
  const R = 88, L = 2 * Math.PI * R;
  let off = 0;
  donut.innerHTML = `<svg viewBox="0 0 210 210" aria-hidden="true"><circle cx="105" cy="105" r="${R}" fill="none" style="stroke:var(--border)" stroke-width="30" opacity=".6"/>${total ? cats.filter((c) => c[1]).map((c) => { const len = c[1] / total * L, s = `<circle cx="105" cy="105" r="${R}" fill="none" style="stroke:${c[3]}" stroke-width="30" stroke-dasharray="${len} ${L - len}" stroke-dashoffset="${-off}" transform="rotate(-90 105 105)"/>`; off += len; return s; }).join('') : ''}</svg>`;
  donut.append(el('div', {class: 'mh-donut-c'}, total ? el('b', {}, String(total)) : el('b', {class: 'dim'}, bd.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'NO DATA'), total ? el('span', {}, 'EPISODES') : null));
  const pieStatus = bd.status === 'AVAILABLE' ? `${total} eligible documented episodes` : bd.status === 'NO_DATA' ? 'No documented episodes' : `Unavailable — ${bd.status_message}`;
  const excluded = bd.excluded_identity_count ? el('p', {class: 'mh-foot', id: 'mhPieExcluded'}, `${bd.excluded_identity_count} episode identit${bd.excluded_identity_count === 1 ? 'y' : 'ies'} excluded: ${bd.exclusions.map((e) => `${e.reason_code} (${e.count})`).join(', ')}`) : null;
  const organCard = ([name, key]) => {
    const o = d[key];
    const chart = seriesOk && o.triggers.status === 'AVAILABLE' ? barsOf((r) => r[key].triggers, `${name} triggers`, `${name} triggers per session`) : unavailable(seriesOk ? o.triggers.reason : d.session_series_message, 150);
    return el('div', {class: 'card', 'data-organ': name}, el('div', {class: 'card-head'}, el('h2', {}, name)),
      el('div', {class: 'mh-pair'}, el('div', {class: 'stat'}, el('div', {class: 'label'}, 'Triggers'), el('div', {class: 'value'}, val(o.triggers))), el('div', {class: 'stat'}, el('div', {class: 'label'}, 'Returned'), el('div', {class: 'value'}, val(o.returned)))),
      el('p', {class: 'mh-note'}, `${o.trigger_disclosure} ${o.return_disclosure}`),
      o.triggers.status !== 'AVAILABLE' ? el('p', {class: 'mh-foot'}, `Triggers unavailable: ${o.triggers.reason}`) : null,
      o.returned.status !== 'AVAILABLE' ? el('p', {class: 'mh-foot'}, `Returned unavailable: ${o.returned.reason}`) : null,
      chart, el('p', {class: 'mh-foot'}, seriesOk ? `Triggers per session across ${rows.length} imported session(s).` : `CHART UNAVAILABLE — ${d.session_series_message}`));
  };
  const hero = el('div', {class: 'card'}, el('div', {class: 'metric-hero'}, el('div', {}, el('h1', {}, 'MYELIN METRIC HUB'), el('p', {}, 'Four-organ behavioural activity overview.'),
    el('p', {class: 'mh-hero-detail', id: 'mhHeroDetail'}, 'Lifetime figures from the imported database file snapshot. Every figure is the desktop lifetime reader’s output for this file; an unavailable figure says why.')),
    el('div', {class: 'mh-hero-r'}, el('span', {class: 'status-badge cyan', id: 'mhBadge'}, 'IMPORTED FILE — READ ONLY'), button('REFRESH', actions.refresh, {class: 'btn-block outline', id: 'mhRefresh', 'aria-label': 'Refresh all Metric Hub data'}))));
  return el('div', {class: 'mh-wrap', id: 'mhImported'}, hero,
    el('div', {class: 'metric-stat-row-3'},
      stat('mhSessions', val(d.sessions), 'Total Sessions', d.sessions.status === 'AVAILABLE' ? 'All committed parent sessions, including open rows.' : d.sessions.reason),
      stat('mhTriggers', val(d.total_triggers), 'Total Triggers', d.total_triggers.status === 'AVAILABLE' ? 'Evidence-defined intervention stages across four organs; see unit disclosures below.' : d.total_triggers.reason),
      stat('mhReturned', val(d.total_returned), 'Total Returned', d.total_returned.status === 'AVAILABLE' ? 'Organ-verified behavioural outcomes; not unique people or cognitive recovery.' : d.total_returned.reason)),
    el('div', {class: 'mh-row'},
      el('div', {class: 'card'}, el('div', {class: 'card-head'}, el('h2', {}, 'Overall histogram'), el('span', {class: 'hint'}, seriesOk ? `${rows.length} of ${rows.length} imported sessions represented` : '')),
        el('p', {class: 'mh-sub'}, 'Session-by-session activity across SINE, COSINE, MINE and COSECANT.'),
        el('p', {class: 'mh-status', id: 'mhSeriesStatus'}, seriesOk ? 'IMPORTED DB FILE — every session shown, real session IDs preserved. ' + d.session_series_message : `CHART UNAVAILABLE — ${d.session_series_message}`),
        seriesOk ? barsOf((r) => r.combined_triggers, 'combined triggers', `Combined triggers per imported session: ${rows.length} sessions`) : unavailable(d.session_series_message, 190), detail),
      el('div', {class: 'card'}, el('div', {class: 'card-head'}, el('h2', {}, 'Behaviour distribution')), el('p', {class: 'mh-sub'}, 'Distribution of documented distraction-intervention episodes.'),
        el('div', {class: 'mh-donut-wrap'}, donut), el('p', {class: 'mh-donut-status', id: 'mhPieStatus'}, pieStatus),
        el('div', {class: 'mh-legend'}, cats.map(([n, v, p, c]) => el('div', {class: 'mh-legend-row'}, el('i', {style: `background:${c}`}), el('span', {}, n), el('em', {}, total ? `${v} · ${p.toFixed(1)}%` : '—')))), excluded)),
    el('div', {class: 'mh-organs'}, el('h2', {}, 'Organ-specific trends'), el('p', {}, 'Each organ uses its OWN certified evidence from the imported file.'), el('div', {class: 'mh-organ-grid'}, ORGANS.map(organCard))));
}
