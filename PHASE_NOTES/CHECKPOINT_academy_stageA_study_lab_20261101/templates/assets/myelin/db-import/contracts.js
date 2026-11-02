// Ports of the desktop's value contracts that the SECANT dashboard projection depends on:
//   SECANT/read_model.py        ExactResource, ResourceDisplayMetadata, validate_display_metadata, FoundingSourceEvidence
//   COSECANT_STUDY_MODE/cosecant.py  CosecantFactKind, CosecantReturnTarget, _validate_cosecant_return_target
//   CORE_ENGINE/resource_intent.py   study_context_token
// Each function raises the same CLASS of error as the Python original (the messages of explicit ValueErrors are copied verbatim).
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, {ValueError, TypeErr, dict, isDict, isInt, isStr, has, truthy, eq, strip} = NS;
  const MAX64 = 9223372036854775807n;
  const cp = (s) => Array.from(s).length;     // Python len(str) counts code points

  const kwargs = (obj, allowed, required, name) => {
    if (!isDict(obj)) throw TypeErr(`${name}() argument after ** must be a mapping`);
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw TypeErr(`${name}.__init__() got an unexpected keyword argument '${k}'`);
    for (const k of required) if (!has(obj, k)) throw TypeErr(`${name}.__init__() missing required argument: '${k}'`);
  };
  const cmpPos = (x) => { if (!NS.isNum(x)) throw TypeErr("'>' not supported between instances"); return x > 0; };

  /** ExactResource(**resource) -> frozen dict with defaults applied. */
  function exactResource(o) {
    const F = ['kind', 'key', 'platform_key', 'resource_token', 'process_name', 'process_id', 'hwnd', 'normalized_title', 'version'];
    kwargs(o, F, ['kind', 'key'], 'ExactResource');
    const r = dict({kind: o.kind, key: o.key, platform_key: '', resource_token: '', process_name: '', process_id: 0n, hwnd: 0n, normalized_title: '', version: 1n});
    for (const k of Object.keys(o)) r[k] = o[k];
    const kindOk = isStr(r.kind) && (r.kind === 'BROWSER' || r.kind === 'DESKTOP');
    if (!kindOk || !truthy(r.key) || !eq(r.version, 1n)) throw ValueError('Typed versioned exact resource required');
    if (r.kind === 'BROWSER' && !(truthy(r.platform_key) && truthy(r.resource_token))) throw ValueError('Certified browser platform/resource identity required');
    if (r.kind === 'DESKTOP' && !(truthy(r.process_name) && cmpPos(r.process_id) && cmpPos(r.hwnd))) throw ValueError('Existing app/PID/HWND/title identity required');
    return r;
  }

  const MD_FIELDS = ['observed_caption', 'normalized_caption', 'source_observation_id', 'source_observation_sequence', 'source_observed_monotonic_ns', 'metadata_version', 'normalization_version'];
  /** validate_display_metadata(value, observation_id=, sequence=, observed_ns=) -> the metadata dict or None. */
  function validateDisplayMetadata(value, {observation_id = null, sequence = null, observed_ns = null} = {}) {
    if (value === null || value === undefined) return null;
    if (!(isDict(value) && Object.keys(value).length === MD_FIELDS.length && MD_FIELDS.every((k) => has(value, k)))) throw ValueError('Unexpected display metadata shape');
    const m = value, textBad = (v) => !isStr(v) || !strip(v) || cp(v) > 16384;
    if (!isInt(m.metadata_version) || m.metadata_version !== 1n || m.normalization_version !== 'resource-intent-normalise-title-v1'
        || textBad(m.observed_caption) || textBad(m.normalized_caption) || cp(m.observed_caption) > 4096
        || !isStr(m.source_observation_id) || !m.source_observation_id || cp(m.source_observation_id) > 1024
        || [m.source_observation_sequence, m.source_observed_monotonic_ns].some((v) => !isInt(v) || v < 0n || v > MAX64)) {
      throw ValueError('Bounded versioned foreground-caption metadata required');
    }
    const ordered = dict(); for (const k of MD_FIELDS) ordered[k] = m[k];
    if (NS.pyjson.dumps(ordered, {ensureAscii: true}).length > 8192) throw ValueError('Display metadata exceeds its optional payload budget');
    for (const [actual, expected] of [[m.source_observation_id, observation_id], [m.source_observation_sequence, sequence], [m.source_observed_monotonic_ns, observed_ns]]) {
      if (expected !== null && expected !== undefined && !eq(actual, expected)) throw ValueError('Display metadata observation mismatch');
    }
    return m;
  }

  const MEANINGS = ['OFF_TASK', 'STUDY_ALIGNED', 'UNCERTAIN', 'ACTIVITY'];
  const CLASSES = ['STUDY_ALIGNED', 'UNCERTAIN', 'DISTRACTION', 'APPROVED_BREAK', 'BACKGROUND_AUDIO'];
  const TERRITORIES = ['ORDINARY', 'VIDEO', 'SHORT_VIDEO', 'MESSAGING', 'SOCIAL', 'GAMING'];
  /** FoundingSourceEvidence(**core) where core already holds an ExactResource and no display metadata. */
  function foundingSource(core) {
    const F = ['resource', 'evidence_id', 'observed_monotonic_ns', 'meaning', 'classification', 'territory', 'confirmed_off_task', 'certified_ott', 'display_metadata'];
    kwargs(core, F, ['resource', 'evidence_id', 'observed_monotonic_ns', 'meaning', 'classification', 'territory', 'confirmed_off_task', 'certified_ott'], 'FoundingSourceEvidence');
    const e = core;
    if (!isDict(e.resource) || !has(e.resource, 'kind') || !isStr(e.evidence_id) || !e.evidence_id || !isInt(e.observed_monotonic_ns) || e.observed_monotonic_ns < 0n || e.observed_monotonic_ns > MAX64
        || !MEANINGS.includes(e.meaning) || !CLASSES.includes(e.classification) || !TERRITORIES.includes(e.territory)
        || typeof e.confirmed_off_task !== 'boolean' || typeof e.certified_ott !== 'boolean') throw ValueError('Exact source observation required');
    return e;
  }

  const STUDY_CONTEXT_FACT_KINDS = ['BREAK_STARTED', 'BREAK_COMPLETE', 'BREAK_ALREADY_OVER', 'FINAL_LOCKED', 'RETURN_INTENT_RECORDED', 'RETURN_CONFIRMATION_STARTED',
    'RETURN_CONFIRMATION_RESTARTED', 'RETURN_CONFIRMATION_LOST', 'RETURN_CONFIRMED', 'BREAK_CANCELLED', 'SAFE_SHUTDOWN'];
  /** CosecantFactKind(kind): ValueError for anything else. */
  const factKind = (k) => { if (!(isStr(k) && STUDY_CONTEXT_FACT_KINDS.includes(k))) throw ValueError(`${NS.isStr(k) ? "'" + k + "'" : 'value'} is not a valid CosecantFactKind`); return k; };

  /** CosecantReturnTarget(**target). */
  function returnTarget(o) {
    const F = ['study_context_token', 'platform_key', 'resource_token', 'observed_monotonic_ns', 'identity_kind', 'resource_key', 'process_name', 'process_id', 'hwnd', 'normalized_title', 'identity_version', 'display_metadata'];
    kwargs(o, F, ['study_context_token', 'platform_key', 'resource_token', 'observed_monotonic_ns'], 'CosecantReturnTarget');
    const t = dict({identity_kind: 'BROWSER', resource_key: '', process_name: '', process_id: 0n, hwnd: 0n, normalized_title: '', identity_version: 1n, display_metadata: null});
    for (const k of Object.keys(o)) t[k] = o[k];
    if (t.display_metadata !== null) throw ValueError('Immutable return-target display metadata required');   // a plain dict is not a ResourceDisplayMetadata instance
    if (!(isStr(t.identity_kind) && (t.identity_kind === 'BROWSER' || t.identity_kind === 'DESKTOP')) || !eq(t.identity_version, 1n)) throw ValueError('Typed V1 return identity required');
    if (t.identity_kind === 'DESKTOP' && !(truthy(t.resource_key) && truthy(t.process_name) && cmpPos(t.process_id) && cmpPos(t.hwnd))) throw ValueError('Existing exact desktop window identity required');
    const names = t.identity_kind === 'BROWSER' ? ['study_context_token', 'platform_key', 'resource_token'] : ['study_context_token'];
    for (const n of names) if (!isStr(t[n]) || !strip(t[n])) throw ValueError(`${n} must be a non-empty string for an exact return target`);
    if (!isInt(t.observed_monotonic_ns)) throw TypeErr('observed_monotonic_ns must be an integer');
    if (t.observed_monotonic_ns < 0n) throw ValueError('observed_monotonic_ns cannot be negative');
    return t;
  }

  /** _validate_cosecant_return_target(kind=, extension_version=, target=, study_block_id=, study_generation=, effective_monotonic_ns=) */
  function validateReturnTarget({kind, extension_version, target, study_block_id, study_generation, effective_monotonic_ns}) {
    if (extension_version === null || extension_version === undefined) {
      if (target !== null || (study_generation !== null && study_generation !== undefined)) throw ValueError('Return target requires its payload extension version');
      return;
    }
    if (!isInt(extension_version) || extension_version !== 1n) throw ValueError('Unsupported return-target payload extension');
    if (kind !== 'BREAK_STARTED') {
      if (target !== null || (study_generation !== null && study_generation !== undefined)) throw ValueError('Intended return target belongs only to BREAK_STARTED');
      return;
    }
    if (target === null) throw TypeErr('BREAK_STARTED requires its frozen exact return target');
    if (!isStr(study_block_id) || !strip(study_block_id)) throw ValueError('Return target requires its owning Study block');
    if (!isInt(study_generation) || study_generation <= 0n) throw ValueError('Return target requires its owning Study generation');
    for (const n of ['study_context_token', 'platform_key', 'resource_token', 'identity_kind', 'resource_key', 'process_name', 'normalized_title']) {
      if (!isStr(target[n])) throw TypeErr('Return target identity fields must retain their exact string types');
    }
    for (const n of ['observed_monotonic_ns', 'process_id', 'hwnd', 'identity_version']) {
      if (!isInt(target[n]) || target[n] < 0n) throw TypeErr('Return target identity fields must retain their exact integer types');
    }
    // target.__post_init__() ran again in Python; the same checks were applied when the target was constructed
    if (!isInt(effective_monotonic_ns) || target.observed_monotonic_ns > effective_monotonic_ns) throw ValueError('Return target observation cannot follow break admission');
  }

  /** CORE_ENGINE.resource_intent.study_context_token(block_id, generation): first 24 hex of SHA-256 over the parts joined by U+001F. */
  function studyContextToken(blockId, generation) {
    let gen;
    if (isInt(generation)) gen = generation;
    else if (typeof generation === 'number' && Number.isFinite(generation)) gen = BigInt(Math.trunc(generation));
    else if (isStr(generation) && /^\s*[+-]?\d+\s*$/.test(generation)) gen = BigInt(generation.trim());
    else if (typeof generation === 'boolean') gen = generation ? 1n : 0n;
    else throw TypeErr('int() argument must be a string, a bytes-like object or a real number');
    return NS.sha256Hex(`${NS.str(blockId)}\u001f${gen}`).slice(0, 24);
  }

  /** SECANT.dashboard_projection.resource_title(identity, metadata=None, *, observation_id=None, sequence=None, observed_ns=None) */
  function resourceTitle(identity, metadata = null, {observation_id = null, sequence = null, observed_ns = null} = {}) {
    if (metadata === null || metadata === undefined) {
      metadata = NS.get(identity, 'display_metadata');
      observation_id = NS.get(identity, 'display_observation_id', observation_id);
      observed_ns = NS.get(identity, 'display_observed_ns', observed_ns);
    }
    if (metadata !== null && metadata !== undefined) {
      return NS.attempt(() => validateDisplayMetadata(metadata, {observation_id, sequence, observed_ns}).normalized_caption, ['TypeError', 'ValueError'], () => 'Unavailable');
    }
    const title = NS.get(identity, 'normalized_title');
    return NS.str(truthy(title) ? title : 'Title not recorded');
  }

  NS.contracts = {exactResource, validateDisplayMetadata, foundingSource, factKind, returnTarget, validateReturnTarget, studyContextToken, resourceTitle, MAX64};
})(self);
