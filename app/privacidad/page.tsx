import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidad — Onda, Fundación Precisar",
  description:
    "Cómo trata Onda, el asistente de Precisar, los datos que envías en el chat: texto, enlaces, imágenes y audios.",
};

const updated = "7 de septiembre de 2026";

export default function PrivacidadPage() {
  return (
    <main
      style={{
        minHeight: "100%",
        overflow: "auto",
        padding: "32px 20px 48px",
        fontFamily: 'var(--font-onda, "Avenir Next", Avenir, system-ui, sans-serif)',
        color: "#212121",
        background: "#f5f5f5",
        lineHeight: 1.65,
      }}
    >
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 20,
          padding: "32px 28px",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "0.875rem" }}>
          <Link href="/chat" style={{ color: "#212121" }}>
            Volver al chat
          </Link>
        </p>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem", fontWeight: 600 }}>
          Privacidad de Onda
        </h1>
        <p style={{ margin: "0 0 24px", color: "#5a5d62", fontSize: "0.9375rem" }}>
          Última actualización: {updated}. Responsable: Fundación Precisar (
          <a href="https://www.precisar.net" target="_blank" rel="noopener noreferrer">
            precisar.net
          </a>
          ).
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Qué es Onda</h2>
        <p>
          Onda es el asistente educativo de Precisar. Ayuda a revisar contenidos digitales, entender
          señales de riesgo y decidir con más criterio. No es un tribunal ni un detector automático
          de mentiras: acompaña, no dicta una verdad final.
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Qué datos puede recibir</h2>
        <p>
          Lo que tú envías en el chat: texto, enlaces, imágenes y audios. También datos técnicos
          mínimos para que el servicio funcione (por ejemplo, identificador de sesión en tu
          dispositivo e IP del servidor). No pedimos nombre, cuenta ni documento.
        </p>
        <p>
          <strong>No envíes</strong> contraseñas, claves, números de tarjeta, datos de salud,
          documentos de identidad ni información íntima de otras personas. Si lo haces por error,
          bórralo de tu conversación y escríbenos.
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Proveedores de IA</h2>
        <p>
          Para generar respuestas (y, si usas voz, transcribir o leer en audio) Onda usa servicios
          de inteligencia artificial, hoy OpenAI. Esos proveedores procesan el contenido del turno
          para devolver una respuesta. No vendemos tus mensajes ni los usamos para publicidad.
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Registros técnicos</h2>
        <p>
          Guardamos logs técnicos mínimos: hora, tipo de evento, si hubo un error y un hash de
          sesión. En producción no registramos el texto completo de tus mensajes. Si calificas una
          respuesta, podemos anotar el voto, no el contenido.
        </p>
        <p>
          En WhatsApp, cuando ese canal esté activo, Meta también trata el número y el mensaje
          según su propia política. Nosotros no publicamos tu teléfono.
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Cuánto tiempo se conserva</h2>
        <p>
          El chat en tu navegador vive en tu dispositivo (puedes borrar la conversación cuando
          quieras). En servidor, los registros técnicos de error se conservan de forma general
          hasta 30 días; métricas agregadas de uso, más tiempo y sin el texto de lo que escribiste.
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Tus derechos</h2>
        <p>
          Puedes pedir acceso, corrección o eliminación de datos que nos identifiquen, según la ley
          que te aplique. También puedes dejar de usar el chat y borrar el historial en tu
          dispositivo.
        </p>

        <h2 style={{ fontSize: "1.15rem", fontWeight: 600 }}>Contacto y eliminación</h2>
        <p>
          Fundación Precisar —{" "}
          <a href="https://www.precisar.net" target="_blank" rel="noopener noreferrer">
            www.precisar.net
          </a>
          . Para consultas o para pedir que borremos datos asociados a tu uso de Onda:{" "}
          <a href="mailto:contacto@precisar.net">contacto@precisar.net</a>.
        </p>
        <p style={{ color: "#5a5d62", fontSize: "0.9375rem" }}>
          Esta página describe el chat Onda en web y, cuando corresponda, por WhatsApp. Podemos
          actualizarla; la fecha de arriba indica la versión vigente.
        </p>
      </article>
    </main>
  );
}
