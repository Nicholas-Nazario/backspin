import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
const credential = z.object({
  key: z.string().min(1),
  secret: z.string().min(1),
});
export const sessionSchema = z.object({
  purpose: z.literal("session"),
  token: credential,
  username: z.string().min(1),
  userId: z.number(),
  expires: z.number(),
});
export const handshakeSchema = z.object({
  purpose: z.literal("handshake"),
  token: credential,
  id: z.string(),
  expires: z.number(),
});
export type Session = z.infer<typeof sessionSchema>;
function key() {
  const value = process.env.SESSION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error("SESSION_KEY must be 32 random bytes encoded as hex");
  return Buffer.from(value, "hex");
}
export function seal(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("mystery-dj:v1"));
  const bytes = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
}
export function unseal(value: string) {
  try {
    const b = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    decipher.setAAD(Buffer.from("mystery-dj:v1"));
    decipher.setAuthTag(b.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        decipher.update(b.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
  } catch {
    return null;
  }
}
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function session() {
  const value = (await cookies()).get("mdj_session")?.value;
  if (!value) return null;
  const result = sessionSchema.safeParse(unseal(value));
  return result.success && result.data.expires > Date.now()
    ? result.data
    : null;
}
export function origin() {
  const u = new URL(process.env.APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:")
    throw new Error("Production APP_URL must use HTTPS");
  return u.origin;
}
export function sameOrigin(req: Request) {
  const expected = origin();
  const supplied = req.headers.get("origin");
  // Some browsers omit Origin on same-origin form POSTs. Fetch Metadata
  // provides an alternative browser-controlled proof; never accept a
  // mismatched or opaque Origin, even when other headers appear valid.
  if (supplied !== null) return supplied === expected;
  if (req.headers.get("sec-fetch-site") === "same-origin")
    return new URL(req.url).origin === expected;
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}
