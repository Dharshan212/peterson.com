// Classic-script constants shared by the DB reader worker (and reported to the page in the worker's "ready" message).
// Stage 2 values: start conservative, measure, then propose changes. Nothing here reads or stores user data.
'use strict';
(function (g) {
  g.MYELIN_DB_LIMITS = Object.freeze({
    MAX_BYTES: 64 * 1024 * 1024,        // input size cap (bytes), checked before and after reading the file
    MAX_ROWS_PER_TABLE: 250000,          // same bound as the desktop dashboard reader (read_corpus row_limit)
    OP_TIMEOUT_MS: 20000,                // watchdog per worker operation; the page terminates the worker when it expires
    LOAD_TIMEOUT_MS: 60000,              // watchdog for load/model (structural check + validation of every durable fact)
    SUPPORTED_SCHEMA_VERSION: '9',       // V1 supports myelin_meta.schema_version = '9' only
    // --- Database Explorer, inventory stage (E1) ---
    INVENTORY_LIST_LIMIT: 20000,         // schema objects returned by one inventory call; beyond this the result says so explicitly (never silently)
    INVENTORY_DETAIL_LIMIT: 5000,        // ordinary tables whose columns/indexes/count are read in the first call; the rest are read one at a time on request
    NAME_MAX_BYTES: 4096,                // identifiers longer than this are listed (truncated) but not addressable
    NAME_MAX_CHARS: 1024,
    SQL_TEXT_LIMIT: 16384,               // bytes of a schema object's CREATE text returned (the byte length of the whole text is reported)
    COUNT_BUDGET_MS: 5000,               // total time one inventory call may spend on COUNT(*) before the remaining counts are reported as unavailable
    COUNT_BUDGET_MAX_MS: 15000,
    PAGE_MAX_ROWS: 250,                  // rows returned by one page request (the table itself has no row limit: it is read page by page)
    CELL_MAX_BYTES: 8192                 // bytes of one text cell returned inline; longer cells are cut and marked with their full byte length
  });
})(self);
