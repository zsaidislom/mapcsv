import { describe, expect, it } from "vitest";
import {
  adminSessionCookieName,
  clearAdminSessionCookie,
  compareAdminPassword,
  createAdminSessionCookie,
  createAdminSessionToken,
  getCookie,
  hasSameOrigin,
  verifyAdminSessionToken,
} from "./src/lib/adminAuth";

describe("admin auth helpers", () => {
  it("compares the correct admin password", async () => {
    await expect(compareAdminPassword("correct-password", "correct-password")).resolves.toBe(true);
  });

  it("rejects an incorrect admin password", async () => {
    await expect(compareAdminPassword("wrong-password", "correct-password")).resolves.toBe(false);
  });

  it("rejects a missing password", async () => {
    await expect(compareAdminPassword(undefined, "correct-password")).resolves.toBe(false);
  });

  it("accepts a valid signed session", async () => {
    const session = await createAdminSessionToken("session-secret", Date.UTC(2026, 9, 2));

    await expect(
      verifyAdminSessionToken(session.token, "session-secret", Date.UTC(2026, 9, 2)),
    ).resolves.toBe(true);
  });

  it("rejects a tampered session", async () => {
    const session = await createAdminSessionToken("session-secret", Date.UTC(2026, 9, 2));
    const tampered = `${session.token.slice(0, -1)}x`;

    await expect(
      verifyAdminSessionToken(tampered, "session-secret", Date.UTC(2026, 9, 2)),
    ).resolves.toBe(false);
  });

  it("rejects an expired session", async () => {
    const session = await createAdminSessionToken("session-secret", Date.UTC(2026, 9, 2));

    await expect(
      verifyAdminSessionToken(session.token, "session-secret", Date.UTC(2026, 9, 4)),
    ).resolves.toBe(false);
  });

  it("sets and clears an HttpOnly Strict session cookie", async () => {
    const session = await createAdminSessionToken("session-secret", Date.UTC(2026, 9, 2));
    const cookie = createAdminSessionCookie(session.token, session.expires);
    const clearCookie = clearAdminSessionCookie();

    expect(cookie).toContain(`${adminSessionCookieName}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(getCookie(cookie, adminSessionCookieName)).toBe(session.token);
    expect(clearCookie).toContain("Max-Age=0");
  });

  it("validates same-origin admin mutations", () => {
    expect(
      hasSameOrigin(
        new Request("https://mapcsv.example/api/admin/login", {
          headers: { origin: "https://mapcsv.example" },
        }),
      ),
    ).toBe(true);
    expect(
      hasSameOrigin(
        new Request("https://mapcsv.example/api/admin/login", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });
});
