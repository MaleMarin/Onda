import { describe, expect, it } from "vitest";
import { mergeOndaUserPreferences, DEFAULT_ONDA_USER_PREFERENCES } from "@/lib/userPreferences";

describe("WhatsApp transparencyNext (ondaMerged)", () => {
  it("mergeOndaUserPreferences conserva y limpia transparencyNext", () => {
    const withFlag = mergeOndaUserPreferences(DEFAULT_ONDA_USER_PREFERENCES, {
      transparencyNext: true,
    });
    expect(withFlag.transparencyNext).toBe(true);

    const cleared = mergeOndaUserPreferences(withFlag, { transparencyNext: false });
    expect(cleared.transparencyNext).toBe(false);
  });
});
