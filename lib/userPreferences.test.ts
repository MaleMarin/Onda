import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONDA_USER_PREFERENCES,
  mergeOndaUserPreferences,
  parseUserPreferencesFromApi,
  shouldSkipCacheForInclusivePrefs,
} from "./userPreferences";

describe("parseUserPreferencesFromApi", () => {
  it("returns defaults for null/undefined/non-object", () => {
    expect(parseUserPreferencesFromApi(null)).toEqual(DEFAULT_ONDA_USER_PREFERENCES);
    expect(parseUserPreferencesFromApi(undefined)).toEqual(DEFAULT_ONDA_USER_PREFERENCES);
    expect(parseUserPreferencesFromApi("x")).toEqual(DEFAULT_ONDA_USER_PREFERENCES);
  });

  it("merges valid partial fields", () => {
    const p = parseUserPreferencesFromApi({
      responseDepth: "brief",
      readingMode: "easy",
      outputMode: "auto",
      bandwidthMode: "low",
      audienceProfile: "teacher",
      locale: "pt-BR",
      userCountry: "br",
    });
    expect(p.responseDepth).toBe("brief");
    expect(p.readingMode).toBe("easy");
    expect(p.outputMode).toBe("auto");
    expect(p.bandwidthMode).toBe("low");
    expect(p.audienceProfile).toBe("teacher");
    expect(p.locale).toBe("pt-BR");
    expect(p.userCountry).toBe("BR");
  });

  it("ignores invalid enum values", () => {
    const p = parseUserPreferencesFromApi({
      responseDepth: "mega",
      locale: "fr-FR",
    });
    expect(p.responseDepth).toBe(DEFAULT_ONDA_USER_PREFERENCES.responseDepth);
    expect(p.locale).toBe(DEFAULT_ONDA_USER_PREFERENCES.locale);
  });
});

describe("mergeOndaUserPreferences", () => {
  it("clears country with null or empty string", () => {
    const withCountry = mergeOndaUserPreferences(DEFAULT_ONDA_USER_PREFERENCES, { userCountry: "CL" });
    expect(withCountry.userCountry).toBe("CL");
    expect(mergeOndaUserPreferences(withCountry, { userCountry: null }).userCountry).toBeNull();
    expect(mergeOndaUserPreferences(withCountry, { userCountry: "" }).userCountry).toBeNull();
  });
});

describe("shouldSkipCacheForInclusivePrefs", () => {
  it("is false for defaults", () => {
    expect(shouldSkipCacheForInclusivePrefs(DEFAULT_ONDA_USER_PREFERENCES)).toBe(false);
  });

  it("is true when any field differs", () => {
    expect(
      shouldSkipCacheForInclusivePrefs(
        mergeOndaUserPreferences(DEFAULT_ONDA_USER_PREFERENCES, { responseDepth: "simple" })
      )
    ).toBe(true);
  });
});
