import { describe, it, expect, afterEach, vi } from "vitest";
import { getLocalizedGreetingNewDay } from "@/lib/welcomeI18n";

describe("getLocalizedGreetingNewDay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pt-BR: weekday en minúscula tras «hoje é», marca Onda, sin copy antigo", () => {
    vi.useFakeTimers();
    const fixed = new Date(2026, 3, 10, 12, 0, 0);
    vi.setSystemTime(fixed);

    const weekdayExpected = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(fixed).toLowerCase();
    expect(weekdayExpected).toBe(weekdayExpected.toLowerCase());

    const s = getLocalizedGreetingNewDay(null, "pt-BR");

    expect(s).not.toContain("Olá de novo hoje");
    expect(s).toContain("Qual Onda vamos ativar");
    expect(s).toContain(`hoje é ${weekdayExpected}`);
    const idx = s.indexOf("hoje é ");
    expect(idx).toBeGreaterThanOrEqual(0);
    const after = s.slice(idx + "hoje é ".length);
    const dayPart = after.split(".")[0] ?? "";
    expect(dayPart).toBe(dayPart.toLowerCase());
  });
});
