import { parseAnalyticsPayload } from "./lib/analyticsSchema";

type Env = {
  ASSETS: Fetcher;
  DB?: D1Database;
  ADMIN_DEV_BYPASS?: string;
};

type RangeKey = "today" | "7d" | "30d" | "all";

type CountRow = {
  value: number;
};

type KpiRow = {
  visitors: number;
  sessions: number;
  realCsvUsers: number;
  sampleCsvUsers: number;
  successfulExports: number;
};

type ExportRow = {
  format: string;
  count: number;
};

type SourceRow = {
  source: string;
  visitors: number;
  realCsvUsers: number;
  exports: number;
};

type TrendRow = {
  day: string;
  visitors: number;
  realCsvUsers: number;
  exports: number;
};

const maxPayloadBytes = 2048;
const maxSessionEventsPerMinute = 80;
const exportEvents = "('export_csv', 'export_json', 'copy_json')";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function readJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxPayloadBytes) {
    throw new Error("payload_too_large");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxPayloadBytes) {
    throw new Error("payload_too_large");
  }

  return JSON.parse(text);
}

async function handleEventIngestion(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  if (!env.DB) {
    return new Response(null, { status: 204 });
  }

  let payload: ReturnType<typeof parseAnalyticsPayload>;
  try {
    payload = parseAnalyticsPayload(await readJson(request));
  } catch (error) {
    const status = error instanceof Error && error.message === "payload_too_large" ? 413 : 400;
    return jsonResponse(status, { error: "invalid_event" });
  }

  try {
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS value
       FROM analytics_events
       WHERE session_id = ?
         AND created_at >= datetime('now', '-1 minute')`,
    )
      .bind(payload.sessionId)
      .first<CountRow>();

    if ((recent?.value ?? 0) >= maxSessionEventsPerMinute) {
      return new Response(null, { status: 204 });
    }

    await env.DB.prepare(
      `INSERT INTO analytics_events (
        id,
        event_name,
        visitor_id,
        session_id,
        app_version,
        workflow_type,
        export_format,
        source,
        medium,
        campaign,
        occurred_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        crypto.randomUUID(),
        payload.eventName,
        payload.visitorId,
        payload.sessionId,
        payload.appVersion,
        payload.workflowType,
        payload.exportFormat ?? null,
        payload.attribution.source,
        payload.attribution.medium ?? null,
        payload.attribution.campaign ?? null,
        payload.occurredAt ?? null,
      )
      .run();
  } catch {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}

function isAuthorized(request: Request, env: Env): boolean {
  if (env.ADMIN_DEV_BYPASS === "true") {
    return true;
  }

  return Boolean(
    request.headers.get("cf-access-authenticated-user-email") ||
      request.headers.get("cf-access-jwt-assertion"),
  );
}

function rangeFromUrl(request: Request): RangeKey {
  const value = new URL(request.url).searchParams.get("range");
  return value === "today" || value === "7d" || value === "30d" || value === "all"
    ? value
    : "7d";
}

function rangeWhere(range: RangeKey, alias?: string): string {
  const createdAt = alias ? `${alias}.created_at` : "created_at";

  if (range === "today") {
    return `${createdAt} >= date('now')`;
  }
  if (range === "7d") {
    return `${createdAt} >= datetime('now', '-7 days')`;
  }
  if (range === "30d") {
    return `${createdAt} >= datetime('now', '-30 days')`;
  }
  return "1 = 1";
}

function previousRate(count: number, previous?: number): number | null {
  if (previous == null) {
    return null;
  }

  return previous === 0 ? 0 : count / previous;
}

async function count(db: D1Database, sql: string): Promise<number> {
  const row = await db.prepare(sql).first<CountRow>();
  return row?.value ?? 0;
}

async function handleAdminSummary(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  if (!isAuthorized(request, env)) {
    return jsonResponse(401, { error: "cloudflare_access_required" });
  }

  if (!env.DB) {
    return jsonResponse(503, { error: "missing_d1_binding" });
  }

  const range = rangeFromUrl(request);
  const where = rangeWhere(range);
  const localWhere = rangeWhere(range, "local");
  const exportedWhere = rangeWhere(range, "exported");
  const eventsWhere = rangeWhere(range, "events");
  const db = env.DB;

  const kpis =
    (await db
      .prepare(
        `SELECT
          COUNT(DISTINCT visitor_id) AS visitors,
          COUNT(DISTINCT session_id) AS sessions,
          COUNT(DISTINCT CASE WHEN event_name = 'local_csv_parsed' THEN session_id END) AS realCsvUsers,
          COUNT(DISTINCT CASE WHEN event_name = 'sample_csv_parsed' THEN session_id END) AS sampleCsvUsers,
          COUNT(CASE WHEN event_name IN ${exportEvents} THEN 1 END) AS successfulExports
        FROM analytics_events
        WHERE ${where}`,
      )
      .first<KpiRow>()) ?? {
      visitors: 0,
      sessions: 0,
      realCsvUsers: 0,
      sampleCsvUsers: 0,
      successfulExports: 0,
    };

  const convertedRealCsvSessions = await count(
    db,
    `SELECT COUNT(DISTINCT local.session_id) AS value
     FROM analytics_events local
     WHERE local.event_name = 'local_csv_parsed'
       AND ${localWhere}
       AND EXISTS (
         SELECT 1
         FROM analytics_events exported
         WHERE exported.session_id = local.session_id
           AND exported.event_name IN ${exportEvents}
           AND ${exportedWhere}
       )`,
  );

  const returningUsers = await count(
    db,
    `WITH returning AS (
       SELECT visitor_id
       FROM analytics_events
       GROUP BY visitor_id
       HAVING COUNT(DISTINCT session_id) > 1
     )
     SELECT COUNT(DISTINCT events.visitor_id) AS value
     FROM analytics_events events
     JOIN returning ON returning.visitor_id = events.visitor_id
     WHERE ${eventsWhere}`,
  );

  const weeklyRealCsvExports = await count(
    db,
    `SELECT COUNT(DISTINCT session_id) AS value
     FROM analytics_events
     WHERE event_name IN ${exportEvents}
       AND workflow_type = 'local'
       AND created_at >= datetime('now', '-7 days')`,
  );

  const funnelCounts = [
    ["Visitors", kpis.sessions],
    [
      "Real CSV parsed",
      await count(
        db,
        `SELECT COUNT(DISTINCT session_id) AS value FROM analytics_events WHERE event_name = 'local_csv_parsed' AND ${where}`,
      ),
    ],
    [
      "Preview",
      await count(
        db,
        `SELECT COUNT(DISTINCT session_id) AS value FROM analytics_events WHERE event_name = 'preview_opened' AND workflow_type = 'local' AND ${where}`,
      ),
    ],
    [
      "Mapping",
      await count(
        db,
        `SELECT COUNT(DISTINCT session_id) AS value FROM analytics_events WHERE event_name = 'mapping_opened' AND workflow_type = 'local' AND ${where}`,
      ),
    ],
    [
      "Validation",
      await count(
        db,
        `SELECT COUNT(DISTINCT session_id) AS value FROM analytics_events WHERE event_name = 'validation_run' AND workflow_type = 'local' AND ${where}`,
      ),
    ],
    [
      "Export",
      await count(
        db,
        `SELECT COUNT(DISTINCT session_id) AS value FROM analytics_events WHERE event_name IN ${exportEvents} AND workflow_type = 'local' AND ${where}`,
      ),
    ],
  ] as const;

  const exportRows = await db
    .prepare(
      `SELECT COALESCE(export_format, event_name) AS format, COUNT(*) AS count
       FROM analytics_events
       WHERE event_name IN ${exportEvents}
         AND ${where}
       GROUP BY COALESCE(export_format, event_name)
       ORDER BY count DESC`,
    )
    .all<ExportRow>();
  const totalExportRows = exportRows.results.reduce((sum, row) => sum + row.count, 0);

  const sources = await db
    .prepare(
      `SELECT
        COALESCE(source, 'direct') AS source,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(DISTINCT CASE WHEN event_name = 'local_csv_parsed' THEN session_id END) AS realCsvUsers,
        COUNT(DISTINCT CASE WHEN event_name IN ${exportEvents} THEN session_id END) AS exports
       FROM analytics_events
       WHERE ${where}
       GROUP BY COALESCE(source, 'direct')
       ORDER BY visitors DESC
       LIMIT 12`,
    )
    .all<SourceRow>();

  const trends = await db
    .prepare(
      `SELECT
        strftime('%Y-%m-%d', created_at) AS day,
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(DISTINCT CASE WHEN event_name = 'local_csv_parsed' THEN session_id END) AS realCsvUsers,
        COUNT(DISTINCT CASE WHEN event_name IN ${exportEvents} THEN session_id END) AS exports
       FROM analytics_events
       WHERE ${where}
       GROUP BY strftime('%Y-%m-%d', created_at)
       ORDER BY day ASC
       LIMIT 60`,
    )
    .all<TrendRow>();

  return jsonResponse(200, {
    range,
    generatedAt: new Date().toISOString(),
    kpis: {
      visitors: kpis.visitors,
      sessions: kpis.sessions,
      realCsvUsers: kpis.realCsvUsers,
      sampleCsvUsers: kpis.sampleCsvUsers,
      successfulExports: kpis.successfulExports,
      realCsvExportConversion:
        kpis.realCsvUsers === 0 ? 0 : convertedRealCsvSessions / kpis.realCsvUsers,
      returningUsers,
      weeklyRealCsvExports,
    },
    funnel: funnelCounts.map(([step, stepCount], index) => ({
      step,
      count: stepCount,
      previousRate: previousRate(stepCount, index === 0 ? undefined : funnelCounts[index - 1][1]),
    })),
    exports: exportRows.results.map((row) => ({
      format: row.format,
      count: row.count,
      share: totalExportRows === 0 ? 0 : row.count / totalExportRows,
    })),
    sources: sources.results,
    trends: trends.results,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/events") {
      return handleEventIngestion(request, env);
    }

    if (url.pathname === "/api/admin/summary") {
      return handleAdminSummary(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
