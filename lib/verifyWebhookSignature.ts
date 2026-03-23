import crypto from "crypto";

/**
 * Verifica el header x-hub-signature-256 de Meta (HMAC-SHA256 del cuerpo crudo).
 * Formato esperado: "sha256=<hex>".
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!secret || signatureHeader == null) return false;

  const eq = signatureHeader.indexOf("=");
  if (eq <= 0 || eq === signatureHeader.length - 1) return false;

  const algo = signatureHeader.slice(0, eq);
  const sigHex = signatureHeader.slice(eq + 1);

  if (algo !== "sha256" || !sigHex || !/^[a-fA-F0-9]+$/.test(sigHex)) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  if (Buffer.isBuffer(rawBody)) {
    hmac.update(rawBody);
  } else {
    hmac.update(rawBody, "utf8");
  }
  const expectedHex = hmac.digest("hex");

  if (sigHex.length !== expectedHex.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sigHex, "hex"),
      Buffer.from(expectedHex, "hex")
    );
  } catch {
    return false;
  }
}
