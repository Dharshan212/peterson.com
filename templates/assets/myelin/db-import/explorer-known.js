// Static, DATA-ONLY knowledge about the MYELIN schema-9 layout, used by the Database Explorer to TAG tables and to classify a file. It is never used to
// decide whether a table may be read: every readable table is browsable whether or not it is listed here.
// Source of the lists: the table/column names of the desktop schema-9 database (structure only, no values).
'use strict';
(function (g) {
  const NS = g.MYELIN_DB = g.MYELIN_DB || {};
  const ex = NS.explorer = NS.explorer || {};
  // Names that are generic enough to occur in unrelated databases: they never prove a file is a MYELIN file on their own.
  const GENERIC = ['sessions', 'notes', 'triggers', 'planner_blocks'];
  const SCHEMA9 = ['cosecant_events', 'cosine_events', 'emergency_events', 'emergency_followup', 'mine_events', 'mirl_events', 'myelin_meta', 'normal_break_events',
    'notes', 'pie_session_time', 'planner_blocks', 'presentation_aliases', 'profile_learning_state', 'science_lab_experiments', 'secant_events', 'secant_founding_source',
    'sessions', 'sine_facts', 'study_events', 'study_resource_boundaries', 'study_resource_events', 'study_resource_intervals', 'study_resource_observation_evidence',
    'study_resources', 'triggers'];
  // Columns that may carry a session reference ("candidates": the Explorer reports them, it does not interpret them).
  const SESSION_COLUMNS = {
    cosecant_events: ['session_id'], cosine_events: ['cosine_session_id', 'session_id'], emergency_events: ['session_id'], mine_events: ['session_id'], mirl_events: ['session_id'],
    normal_break_events: ['session_id'], pie_session_time: ['session_id'], profile_learning_state: ['last_learning_session_id'], science_lab_experiments: ['parent_session_id'],
    secant_events: ['session_id'], sine_facts: ['session_id'], study_events: ['session_id'], study_resource_boundaries: ['session_id'], study_resource_events: ['session_id'],
    study_resource_intervals: ['session_id'], study_resource_observation_evidence: ['session_id'], study_resources: ['session_id'], triggers: ['session_id']
  };
  // Tables the SECANT evidence adapter reads (same list as evidence.js); reported so a caller can see what the validated reader would need.
  const SECANT_ADAPTER_TABLES = ['sessions', 'secant_events', 'secant_founding_source', 'study_events', 'study_resource_events', 'study_resources',
    'study_resource_boundaries', 'study_resource_intervals', 'study_resource_observation_evidence', 'cosecant_events', 'presentation_aliases'];
  ex.known = Object.freeze({
    schema9Tables: Object.freeze(SCHEMA9.slice()),
    genericTables: Object.freeze(GENERIC.slice()),
    distinctiveTables: Object.freeze(SCHEMA9.filter((t) => !GENERIC.includes(t))),
    sessionColumns: Object.freeze(Object.fromEntries(Object.entries(SESSION_COLUMNS).map(([k, v]) => [k, Object.freeze(v.slice())]))),
    secantAdapterTables: Object.freeze(SECANT_ADAPTER_TABLES.slice()),
    supportedSchemaVersion: '9'
  });
})(self);
