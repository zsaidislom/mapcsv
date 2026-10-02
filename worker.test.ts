import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import worker from "./src/worker";
import { APP_VERSION } from "./src/lib/analyticsSchema";

const adminPassword = "test-admin-password";
const adminSecret = "test-admin-session-secret";

type Statement = {
  bind: (...values: unknown[]) => Statement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<void>;
};

function createFakeDb() {
  const inserts: unknown[][] = [];

  return {
    inserts,
    db: {
      prepare(sql: string): Statement {
        const statement: Statement = {
          bind(...values: unknown[]) {
            if (sql.includes("INSERT INTO analytics_events")) {
              inserts.push(values);
            }
            return statement;
          },
          async first<T>() {
            if (sql.includes("COUNT(DISTINCT visitor_id) AS visitors")) {
              return {
                visitors: 4,
                sessions: 5,
                realCsvUsers: 3,
                sampleCsvUsers: 1,
                successfulExports: 2,
              } as T;
            }

            return { value: sql.includes("created_at >= datetime('now', '-1 minute')") ? 0 : 1 } as T;
          },
          async all<T>() {
            if (sql.includes("COALESCE(export_format, event_name)")) {
              return { results: [{ format: "csv", count: 2 }] as T[] };
            }
            if (sql.includes("COALESCE(source, 'direct')")) {
              return {
                results: [{ source: "direct", visitors: 4, realCsvUsers: 3, exports: 2 }] as T[],
              };
            }
            if (sql.includes("strftime('%Y-%m-%d', created_at)")) {
              return {
                results: [{ day: "2026-10-02", visitors: 4, realCsvUsers: 3, exports: 2 }] as T[],
              };
            }

            return { results: [] as T[] };
          },
          async run() {
            return undefined;
          },
        };

        return statement;
      },
    },
  };
}

function createEnv() {
  const fakeDb = createFakeDb();

  return {
    fakeDb,
    env: {
      ASSETS: {
        fetch: async (request: Request) =>
          new Response(`asset:${new URL(request.url).pathname}`, {
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
      },
      DB: fakeDb.db,
      ADMIN_PASSWORD: adminPassword,
      ADMIN_SESSION_SECRET: adminSecret,
      ADMIN_DEV_BYPASS: "false",
    } as Parameters<typeof worker.fetch>[1],
  };
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://mapcsv.example${path}`, init);
}

function sameOriginPost(path: string, body?: unknown, headers: HeadersInit = {}) {
  return request(path, {
    method: "POST",
    headers: {
      origin: "https://mapcsv.example",
      "content-type": "application/json",
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

function collectFiles(directory: URL): URL[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) {
      return collectFiles(child);
    }

    return statSync(child).isFile() ? [child] : [];
  });
}

async function login(env: Parameters<typeof worker.fetch>[1]) {
  const response = await worker.fetch(
    sameOriginPost("/api/admin/login", { password: adminPassword }),
    env,
  );

  return response.headers.get("set-cookie") ?? "";
}

describe("MapCSV Worker admin auth", () => {
  it("logs in with the correct password", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(
      sameOriginPost("/api/admin/login", { password: adminPassword }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("__Host-mapcsv_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects an incorrect password", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(
      sameOriginPost("/api/admin/login", { password: "wrong" }, { "cf-connecting-ip": "10.0.0.1" }),
      env,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_credentials" });
  });

  it("rejects a missing password", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(
      sameOriginPost("/api/admin/login", {}, { "cf-connecting-ip": "10.0.0.2" }),
      env,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_credentials" });
  });

  it("rejects unauthenticated summary requests", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(request("/api/admin/summary?range=7d"), env);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "authentication_required" });
  });

  it("serves summary with a valid session", async () => {
    const { env } = createEnv();
    const cookie = await login(env);
    const response = await worker.fetch(
      request("/api/admin/summary?range=7d", { headers: { cookie } }),
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      range: "7d",
      kpis: {
        visitors: 4,
        sessions: 5,
        realCsvUsers: 3,
        sampleCsvUsers: 1,
        successfulExports: 2,
      },
    });
  });

  it("rejects summary with an invalid session", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(
      request("/api/admin/summary", {
        headers: { cookie: "__Host-mapcsv_admin_session=tampered.session" },
      }),
      env,
    );

    expect(response.status).toBe(401);
  });

  it("clears auth on logout", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(sameOriginPost("/api/admin/logout"), env);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("__Host-mapcsv_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("keeps public analytics ingestion accessible", async () => {
    const { env, fakeDb } = createEnv();
    const response = await worker.fetch(
      sameOriginPost("/api/events", {
        eventName: "local_csv_parsed",
        visitorId: "6b0c68c1-7ee5-4e93-8374-845359268c25",
        sessionId: "99c8d52e-ec72-430d-95d3-0ce7a25c0697",
        appVersion: APP_VERSION,
        workflowType: "local",
        attribution: { source: "direct" },
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(fakeDb.inserts).toHaveLength(1);
  });

  it("keeps normal public frontend routes accessible", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(request("/admin"), env);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("asset:/admin");
  });

  it("does not place admin secret values in client source or Wrangler config", () => {
    const paths = [
      new URL("./src/admin/AdminDashboard.tsx", import.meta.url),
      new URL("./src/App.tsx", import.meta.url),
      new URL("./wrangler.toml", import.meta.url),
      new URL("./wrangler.example.toml", import.meta.url),
      ...collectFiles(new URL("./dist/", import.meta.url)),
    ];
    const combined = paths.map((path) => readFileSync(path, "utf8")).join("\n");

    expect(combined).not.toContain(adminPassword);
    expect(combined).not.toContain(adminSecret);
  });
});
