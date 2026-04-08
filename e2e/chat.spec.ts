import { test, expect } from "@playwright/test";

test.describe("/chat calidad mínima", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/chat/stream", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      let body: { userPreferences?: { responseDepth?: string; readingMode?: string; locale?: string }; message?: string } =
        {};
      try {
        body = route.request().postDataJSON() as typeof body;
      } catch {
        body = {};
      }
      const depth = body.userPreferences?.responseDepth ?? "detailed";
      const reading = body.userPreferences?.readingMode ?? "standard";
      const loc = body.userPreferences?.locale ?? "es-LATAM";
      const lines = [
        JSON.stringify({ rag_used: false, web_search_used: false }),
        JSON.stringify({
          text: `MOCK_OK depth=${depth} reading=${reading} locale=${loc} msg=${(body.message ?? "").slice(0, 40)}`,
        }),
        JSON.stringify({ playAudio: false, playAudioReason: "none" }),
        JSON.stringify({ done: true }),
      ].join("\n");
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
        body: lines + "\n",
      });
    });
  });

  test("carga, skip link, Onda, rutas guiadas, panel inclusión, prefs y stream mock", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("onda_visited", "1");
    });

    await page.goto("/chat?eje=A_MANO");

    const skipToInput = page.getByRole("link", { name: /campo de mensaje|mensagem/i });
    await expect(skipToInput).toBeVisible();

    // El skip es un <a href="#onda-main-input">: enfocar el enlace no activa la navegación.
    await skipToInput.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#onda-main-input")).toBeFocused();

    await expect(page.getByRole("region", { name: /Rutas guiadas|Caminhos guiados/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Acceso e inclusión|Acesso e inclusão/i })).toBeVisible();

    await page.getByRole("button", { name: /Acceso e inclusión|Acesso e inclusão/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator("#onda-inclusion-dialog select").first().selectOption("step_by_step");
    await page.locator("#onda-inclusion-dialog select").nth(1).selectOption("easy");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: /Acceso e inclusión|Acesso e inclusão/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.locator("#onda-main-input").fill("hola e2e");
    await page.locator("#onda-main-input").press("Enter");

    await expect(page.getByText(/MOCK_OK depth=step_by_step reading=easy/)).toBeVisible({ timeout: 15_000 });
  });

  test("persistencia localStorage de preferencias tras recarga", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("onda_visited", "1");
      localStorage.setItem(
        "onda_user_preferences",
        JSON.stringify({
          responseDepth: "brief",
          readingMode: "easy",
          outputMode: "text",
          bandwidthMode: "low",
          audienceProfile: "general",
          locale: "pt-BR",
          userCountry: null,
        })
      );
    });

    await page.goto("/chat?eje=A_MANO");

    await page.getByRole("button", { name: /Acceso e inclusión|Acesso e inclusão/i }).click();
    const depthSelect = page.locator("#onda-inclusion-dialog select").first();
    await expect(depthSelect).toHaveValue("brief");
    const localeSelect = page.locator("#onda-inclusion-dialog select").last();
    await expect(localeSelect).toHaveValue("pt-BR");

    await page.reload();
    await page.goto("/chat?eje=A_MANO");
    await page.getByRole("button", { name: /Acesso e inclusão/i }).click();
    await expect(page.locator("#onda-inclusion-dialog select").first()).toHaveValue("brief");
  });

  test("locale pt-BR en request al enviar", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("onda_visited", "1");
      localStorage.setItem(
        "onda_user_preferences",
        JSON.stringify({
          responseDepth: "simple",
          readingMode: "standard",
          outputMode: "text",
          bandwidthMode: "standard",
          audienceProfile: "general",
          locale: "pt-BR",
          userCountry: null,
        })
      );
    });

    await page.goto("/chat?eje=A_MANO");
    await page.locator("#onda-main-input").fill("teste pt");
    await page.locator("#onda-main-input").press("Enter");
    await expect(page.getByText(/locale=pt-BR/)).toBeVisible({ timeout: 15_000 });
  });
});
