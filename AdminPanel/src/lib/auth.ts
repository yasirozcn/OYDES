// JWT (HS256): öğrenci, kiosk tableti ve web paneli oturumları. Anahtar ilk kullanımda okunur (derleme sırasında gerekmez).
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";

// Canlıda bilinen geliştirme anahtarıyla token üretilmesin/kabul edilmesin (kök AGENTS.md §5.1).
function key(): Uint8Array {
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) throw new Error("AUTH_SECRET tanımlı değil; canlıda token üretilemez/doğrulanamaz.");
  return new TextEncoder().encode(config.authSecret);
}

export type StudentClaims = { sub: string; role: "student"; deviceId: string };
export type KioskClaims = { sub: string; role: "kiosk-admin" };
export type WebAdminClaims = { sub: string; role: "web-admin" };
export type Claims = StudentClaims | KioskClaims | WebAdminClaims;

export async function signToken(claims: Claims, expiresIn: string): Promise<string> {
  const { sub, ...rest } = claims;
  return new SignJWT(rest).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setIssuedAt().setExpirationTime(expiresIn).sign(key());
}

/** Süresi dolmuş veya bozuk token için null döner (istek 401 ile reddedilir). */
export async function verifyToken(token: string): Promise<Claims | null> {
  const secret = key();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return { ...(payload as object), sub: payload.sub! } as Claims;
  } catch {
    return null;
  }
}

/** Mobil isteklerdeki "Authorization: Bearer <token>" başlığını çözer. */
export async function bearerClaims(req: Request): Promise<Claims | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return verifyToken(h.slice(7));
}
