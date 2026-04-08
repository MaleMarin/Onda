import { describe, it, expect } from "vitest";
import { signMetaWebhookBody, verifyWebhookSignature } from "./verifyWebhookSignature";

describe("Meta webhook signature", () => {
  it("firma y verificación redondean correctamente", () => {
    const secret = "test_app_secret_32_chars_min___";
    const body = '{"entry":[]}';
    const sig = signMetaWebhookBody(secret, body);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("rechaza cuerpo alterado", () => {
    const secret = "another_secret_value_for_hmac__";
    const sig = signMetaWebhookBody(secret, '{"a":1}');
    expect(verifyWebhookSignature('{"a":2}', sig, secret)).toBe(false);
  });
});
