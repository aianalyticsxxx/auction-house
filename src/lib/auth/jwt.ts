import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Use a consistent secret - in production, this should be set via env var
const DEFAULT_SECRET = "development-secret-change-in-production-32ch";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  // Ensure we have a valid Uint8Array
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(secret);
  }
  // Fallback for environments without TextEncoder
  return new Uint8Array(Buffer.from(secret, "utf-8"));
}

const JWT_ISSUER = "auction-house";
const JWT_AUDIENCE = "auction-house-users";

// Token expiry: 24 hours
const TOKEN_EXPIRY = "24h";

export interface SessionPayload extends JWTPayload {
  walletAddress: string;
  userId: string;
}

export async function createSessionToken(
  walletAddress: string,
  userId: string
): Promise<string> {
  const token = await new SignJWT({ walletAddress, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());

  return token;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (!payload.walletAddress || !payload.userId) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(token: string): boolean {
  try {
    // Decode without verifying to check expiration
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));

    if (!payload.exp) return true;

    // Check if expiring in less than 1 hour
    const expiresAt = payload.exp * 1000;
    const oneHour = 60 * 60 * 1000;

    return Date.now() > expiresAt - oneHour;
  } catch {
    return true;
  }
}
