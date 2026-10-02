export const adminSessionCookieName = "__Host-mapcsv_admin_session";
export const adminSessionTtlSeconds = 60 * 60 * 24;

type SessionPayload = {
  exp: number;
  iat: number;
  nonce: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", textEncoder.encode(value)));
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(value)));
}

export async function compareAdminPassword(
  submittedPassword: unknown,
  configuredPassword?: string,
): Promise<boolean> {
  if (typeof submittedPassword !== "string" || !configuredPassword) {
    return false;
  }

  const [submittedHash, configuredHash] = await Promise.all([
    sha256(submittedPassword),
    sha256(configuredPassword),
  ]);

  return timingSafeEqual(submittedHash, configuredHash);
}

export async function createAdminSessionToken(
  secret: string,
  nowMs = Date.now(),
): Promise<{ token: string; expires: Date }> {
  const nowSeconds = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    exp: nowSeconds + adminSessionTtlSeconds,
    iat: nowSeconds,
    nonce: crypto.randomUUID(),
  };
  const payloadBytes = textEncoder.encode(JSON.stringify(payload));
  const payloadPart = bytesToBase64Url(payloadBytes);
  const signaturePart = bytesToBase64Url(await hmac(secret, payloadPart));

  return {
    token: `${payloadPart}.${signaturePart}`,
    expires: new Date(payload.exp * 1000),
  };
}

export async function verifyAdminSessionToken(
  token: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token || !secret) {
    return false;
  }

  const [payloadPart, signaturePart, extraPart] = token.split(".");
  if (!payloadPart || !signaturePart || extraPart != null) {
    return false;
  }

  const expectedSignature = await hmac(secret, payloadPart);
  const suppliedSignature = base64UrlToBytes(signaturePart);
  if (!suppliedSignature || !timingSafeEqual(suppliedSignature, expectedSignature)) {
    return false;
  }

  const payloadBytes = base64UrlToBytes(payloadPart);
  if (!payloadBytes) {
    return false;
  }

  try {
    const payload = JSON.parse(textDecoder.decode(payloadBytes)) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(nowMs / 1000);
    return typeof payload.exp === "number" && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}

export function getCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      return rawValue.join("=");
    }
  }

  return undefined;
}

export function createAdminSessionCookie(token: string, expires: Date): string {
  return [
    `${adminSessionCookieName}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${adminSessionTtlSeconds}`,
    `Expires=${expires.toUTCString()}`,
  ].join("; ");
}

export function clearAdminSessionCookie(): string {
  return [
    `${adminSessionCookieName}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
