CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  app_version TEXT NOT NULL,
  workflow_type TEXT NOT NULL DEFAULT 'none',
  export_format TEXT,
  source TEXT NOT NULL DEFAULT 'direct',
  medium TEXT,
  campaign TEXT,
  occurred_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (event_name IN (
    'page_view',
    'sample_csv_parsed',
    'local_csv_parsed',
    'preview_opened',
    'mapping_opened',
    'validation_run',
    'export_csv',
    'export_json',
    'copy_json'
  )),
  CHECK (workflow_type IN ('none', 'sample', 'local')),
  CHECK (export_format IS NULL OR export_format IN ('csv', 'json', 'copy_json'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events (created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created
  ON analytics_events (event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor
  ON analytics_events (visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_source
  ON analytics_events (source, created_at);
