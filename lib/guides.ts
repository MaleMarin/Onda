import fs from "fs";
import path from "path";
import { GUIDE_IDS } from "./responseFormat";

/**
 * Devuelve el buffer de la imagen de una guía si existe en public/guides/{id}.png o .jpg.
 * Solo acepta IDs de GUIDE_IDS. Para WhatsApp: subir este buffer y enviar como imagen.
 */
export async function getGuideImageBuffer(
  guideId: string
): Promise<{ buffer: Buffer; mimeType: "image/png" | "image/jpeg" } | null> {
  const normalized = guideId.toLowerCase().trim();
  if (!GUIDE_IDS.includes(normalized)) return null;
  const dir = path.join(process.cwd(), "public", "guides");
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    const filePath = path.join(dir, `${normalized}${ext}`);
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
        return { buffer, mimeType };
      }
    } catch {
      // ignore
    }
  }
  return null;
}
