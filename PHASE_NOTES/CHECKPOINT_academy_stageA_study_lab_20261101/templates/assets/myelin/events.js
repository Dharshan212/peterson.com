export const SCHEMA_VERSION = 1;
export const POLICY_VERSION = 'myelin-web-lite-v1-core-2026-10';
export const ORGANS = ['SINE','MIRL','MINE','COSINE','STUDY','SECANT','COSECANT','NORMAL_BREAK'];
export const uid = (prefix='id') => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
export const copy = value => structuredClone(value);
export function event(runtime, organ, type, payload={}, identity={}) {
  if (!runtime.session || !/^[A-Z][A-Z0-9_]+$/.test(type)) throw new Error('Invalid fact');
  return Object.freeze({schemaVersion:SCHEMA_VERSION, policyVersion:POLICY_VERSION,
    id:uid('evt'), sequence:++runtime.sequence, sessionId:runtime.session.id,
    organ, type, generation:runtime.generation, source:runtime.source || 'SIMULATED',
    namespace:runtime.namespace, utc:new Date(runtime.wallNow()).toISOString(),
    effectiveSeconds:runtime.time, elapsedSeconds:runtime.elapsed,
    resourceId:runtime.observation.resourceId || null, contextId:runtime.study?.blockId || null,
    evidenceQuality:runtime.available ? 'SUPPORTED_BROWSER_CONTAINED' : 'UNAVAILABLE',
    ...identity, payload:copy(payload)});
}
export function minutes(value,min,max) {
  const n=Number(value);
  if (!Number.isInteger(n) || n<min || n>max) throw new Error(`Choose whole minutes from ${min} to ${max}.`);
  return n*60;
}
