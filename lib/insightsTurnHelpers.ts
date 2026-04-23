import type { FormatoSalida } from "@/lib/responseFormat";
import type { InsightsContentType, InsightsLocaleBucket, InsightsOutputFormat, InsightsVerbosity } from "@/lib/insightsTelemetry";
import type { UserPrefs } from "@/lib/userPrefs";
import type { OndaChatLocale } from "@/lib/userPreferences";

export function inferContentType(message: string, hasImage: boolean, hasAudio: boolean): InsightsContentType {
  const hasLink = /\bhttps?:\/\//i.test(message || "");
  const parts = (hasImage ? 1 : 0) + (hasAudio ? 1 : 0) + (hasLink ? 1 : 0);
  if (parts > 1) return "mixed";
  if (hasImage) return "image";
  if (hasAudio) return "audio";
  if (hasLink) return "link";
  return "text";
}

export function mapFormatoToOutputFormat(f: FormatoSalida): InsightsOutputFormat {
  if (f === "audio") return "audio";
  if (f === "infografia") return "infografia";
  return "texto";
}

export function localeBucketFromUnified(prefs: UserPrefs): InsightsLocaleBucket {
  if (prefs.locale === "auto") return "auto";
  return prefs.locale === "pt" ? "pt" : "es";
}

export function localeBucketFromOndaLocale(locale: OndaChatLocale | undefined): InsightsLocaleBucket {
  if (!locale) return "auto";
  return locale === "pt-BR" ? "pt" : "es";
}

export function verbosityFromUnified(prefs: UserPrefs): InsightsVerbosity {
  return prefs.verbosity;
}
