"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { OndaTheme } from "@/lib/ondaTheme";
import { ondaStyles } from "@/lib/ondaStyles";
import type { InclusionUiStrings } from "@/lib/chatI18n";
import { getCountryOptions } from "@/lib/chatI18n";
import type { OndaUserPreferences } from "@/lib/userPreferences";
import type {
  AudienceProfile,
  BandwidthMode,
  OndaChatLocale,
  OutputMode,
  ReadingMode,
  ResponseDepth,
} from "@/lib/userPreferences";

type Props = {
  open: boolean;
  onClose: () => void;
  prefs: OndaUserPreferences;
  setPrefs: (p: OndaUserPreferences) => void;
  strings: InclusionUiStrings;
  theme: OndaTheme;
};

const labelStyle = (t: OndaTheme): CSSProperties => ({
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: t.c.muted,
  marginBottom: 6,
});

const selectStyle = (t: OndaTheme): CSSProperties => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: t.r.sm,
  border: `1px solid ${t.c.border}`,
  fontSize: "1rem",
  minHeight: 44,
  background: t.glass.bg,
  color: t.c.ink,
});

export function InclusionSettingsPanel({ open, onClose, prefs, setPrefs, strings, theme: t }: Props) {
  const S = ondaStyles(t);
  const panelRef = useRef<HTMLElement>(null);
  const countryOptions = getCountryOptions(prefs.locale);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const root = panelRef.current;
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>(
      'button, [href], select, input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  const backdrop: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 100,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "stretch",
  };

  const panel: CSSProperties = {
    width: "min(100vw, 400px)",
    maxHeight: "100%",
    overflowY: "auto",
    background: t.grad.pageBg,
    boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
    padding: "20px 18px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  const patch = (partial: Partial<OndaUserPreferences>) => setPrefs({ ...prefs, ...partial });

  return (
    <div style={backdrop} role="presentation" onClick={onClose}>
      <aside
        ref={panelRef}
        id="onda-inclusion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onda-inclusion-title"
        style={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 id="onda-inclusion-title" style={{ margin: 0, fontSize: "1.125rem", color: t.c.ink }}>
            {strings.panelTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...S.iconBtn,
              minWidth: 44,
              minHeight: 44,
              borderRadius: t.r.sm,
              border: `1px solid ${t.c.border}`,
              background: t.glass.bg,
            }}
            aria-label={strings.panelClose}
          >
            ✕
          </button>
        </div>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.responseDepth}</legend>
          <select
            aria-label={strings.responseDepth}
            value={prefs.responseDepth}
            onChange={(e) => patch({ responseDepth: e.target.value as ResponseDepth })}
            style={selectStyle(t)}
          >
            <option value="simple">{strings.depthSimple}</option>
            <option value="brief">{strings.depthBrief}</option>
            <option value="detailed">{strings.depthDetailed}</option>
            <option value="step_by_step">{strings.depthSteps}</option>
          </select>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.readingMode}</legend>
          <select
            aria-label={strings.readingMode}
            value={prefs.readingMode}
            onChange={(e) => patch({ readingMode: e.target.value as ReadingMode })}
            style={selectStyle(t)}
          >
            <option value="standard">{strings.readingStandard}</option>
            <option value="easy">{strings.readingEasy}</option>
          </select>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.outputMode}</legend>
          <select
            aria-label={strings.outputMode}
            value={prefs.outputMode}
            onChange={(e) => patch({ outputMode: e.target.value as OutputMode })}
            style={selectStyle(t)}
          >
            <option value="text">{strings.outputText}</option>
            <option value="audio">{strings.outputAudio}</option>
            <option value="auto">{strings.outputAuto}</option>
          </select>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.bandwidth}</legend>
          <select
            aria-label={strings.bandwidth}
            value={prefs.bandwidthMode}
            onChange={(e) => patch({ bandwidthMode: e.target.value as BandwidthMode })}
            style={selectStyle(t)}
          >
            <option value="standard">{strings.bandwidthStandard}</option>
            <option value="low">{strings.bandwidthLow}</option>
          </select>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.audience}</legend>
          <select
            aria-label={strings.audience}
            value={prefs.audienceProfile}
            onChange={(e) => patch({ audienceProfile: e.target.value as AudienceProfile })}
            style={selectStyle(t)}
          >
            <option value="general">{strings.audGeneral}</option>
            <option value="older_adult">{strings.audOlder}</option>
            <option value="youth">{strings.audYouth}</option>
            <option value="teacher">{strings.audTeacher}</option>
            <option value="community_mediator">{strings.audCommunity}</option>
          </select>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.country}</legend>
          <select
            aria-label={strings.country}
            value={prefs.userCountry ?? ""}
            onChange={(e) => patch({ userCountry: e.target.value ? e.target.value : null })}
            style={selectStyle(t)}
          >
            {countryOptions.map((o) => (
              <option key={o.code || "none"} value={o.code}>
                {o.code ? o.label : strings.countryNone}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={labelStyle(t)}>{strings.locale}</legend>
          <select
            aria-label={strings.locale}
            value={prefs.locale}
            onChange={(e) => patch({ locale: e.target.value as OndaChatLocale })}
            style={selectStyle(t)}
          >
            <option value="es-LATAM">{strings.localeEs}</option>
            <option value="pt-BR">{strings.localePt}</option>
          </select>
        </fieldset>

        <p style={{ margin: 0, fontSize: "0.8125rem", color: t.c.muted, lineHeight: 1.5 }}>
          {prefs.locale === "pt-BR"
            ? "As preferências são guardadas neste dispositivo e enviadas junto com cada mensagem."
            : "Las preferencias se guardan en este dispositivo y se envían con cada mensaje."}
        </p>
      </aside>
    </div>
  );
}
