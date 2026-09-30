import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacidad — Onda, Precisar",
  description:
    "Política de privacidad de Onda, servicio de Precisar (Fundación Democracia Abierta): qué datos tratamos, proveedores de IA, conservación y derechos.",
};

const updated = "30 de septiembre de 2026";

const h2: CSSProperties = { fontSize: "1.15rem", fontWeight: 600, marginTop: 28, marginBottom: 10 };
const p: CSSProperties = { margin: "0 0 12px" };
const ul: CSSProperties = { margin: "0 0 12px", paddingLeft: "1.25rem" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 style={h2}>{title}</h2>
      {children}
    </>
  );
}

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
          Política de privacidad de Onda
        </h1>
        <p style={{ margin: "0 0 6px", color: "#5a5d62", fontSize: "0.9375rem" }}>
          Última actualización: {updated}
        </p>
        <p style={{ margin: "0 0 6px", color: "#5a5d62", fontSize: "0.9375rem" }}>
          Responsable: Fundación Democracia Abierta, organización que opera la marca Precisar.
        </p>
        <p style={{ margin: "0 0 6px", color: "#5a5d62", fontSize: "0.9375rem" }}>
          Sitio:{" "}
          <a href="https://www.precisar.net" target="_blank" rel="noopener noreferrer">
            precisar.net
          </a>
        </p>
        <p style={{ margin: "0 0 24px", color: "#5a5d62", fontSize: "0.9375rem" }}>
          Contacto:{" "}
          <a href="mailto:contacto@precisar.net">contacto@precisar.net</a>
        </p>

        <Section title="Qué es Onda">
          <p style={p}>
            Onda es un servicio de Precisar, iniciativa de Fundación Democracia Abierta. Es un
            asistente educativo que ayuda a comprender mensajes, enlaces, audios, imágenes y
            contenidos virales con más contexto, datos y criterio antes de compartir.
          </p>
          <p style={p}>
            Onda no es una autoridad oficial, un tribunal ni un verificador automático de verdad. Sus
            respuestas son orientativas y educativas: ayudan a revisar señales, formular mejores
            preguntas y decidir con mayor autonomía.
          </p>
        </Section>

        <Section title="Qué datos tratamos">
          <p style={p}>Onda puede tratar la información que tú decides enviar al chat, incluyendo:</p>
          <ul style={ul}>
            <li>texto;</li>
            <li>enlaces;</li>
            <li>imágenes o capturas;</li>
            <li>audios;</li>
            <li>preguntas o instrucciones;</li>
            <li>votos o comentarios sobre la calidad de una respuesta, si decides entregarlos.</li>
          </ul>
          <p style={p}>
            También podemos tratar datos técnicos mínimos necesarios para operar, proteger y mejorar
            el servicio, como:
          </p>
          <ul style={ul}>
            <li>identificador de sesión;</li>
            <li>fecha y hora de uso;</li>
            <li>tipo de evento o error;</li>
            <li>información técnica del navegador o dispositivo;</li>
            <li>dirección IP recibida por la infraestructura del servicio;</li>
            <li>métricas agregadas de uso.</li>
          </ul>
          <p style={p}>
            No pedimos que entregues tu nombre, documento de identidad, contraseña, claves, datos
            bancarios ni información sensible para usar Onda.
          </p>
        </Section>

        <Section title="Información que no debes enviar">
          <p style={p}>No envíes a Onda:</p>
          <ul style={ul}>
            <li>contraseñas o códigos de acceso;</li>
            <li>números de tarjeta o datos bancarios;</li>
            <li>documentos de identidad;</li>
            <li>información médica o de salud;</li>
            <li>datos íntimos tuyos o de otras personas;</li>
            <li>datos personales de terceros sin autorización;</li>
            <li>
              información confidencial, legal, laboral o comercial que no quieras compartir con un
              servicio digital.
            </li>
          </ul>
          <p style={p}>
            Si enviaste algo sensible por error, puedes borrar la conversación en tu dispositivo y
            escribirnos a{" "}
            <a href="mailto:contacto@precisar.net">contacto@precisar.net</a> para solicitar revisión
            o eliminación de datos asociados, cuando sea posible identificarlos.
          </p>
        </Section>

        <Section title="Para qué usamos los datos">
          <p style={p}>Usamos la información enviada a Onda para:</p>
          <ul style={ul}>
            <li>generar una respuesta a tu consulta;</li>
            <li>analizar el contenido que compartes, como textos, enlaces, imágenes o audios;</li>
            <li>transcribir audio cuando corresponda;</li>
            <li>detectar errores técnicos;</li>
            <li>prevenir abuso, spam o usos indebidos;</li>
            <li>mantener la seguridad y estabilidad del servicio;</li>
            <li>
              medir uso agregado sin revisar el contenido completo de los mensajes en producción.
            </li>
          </ul>
          <p style={p}>
            No vendemos tus mensajes. No usamos tus conversaciones para publicidad personalizada.
          </p>
        </Section>

        <Section title="Uso de proveedores de inteligencia artificial">
          <p style={p}>
            Para generar respuestas, analizar contenido o transcribir audio, Onda puede usar
            servicios de inteligencia artificial de terceros, incluyendo OpenAI.
          </p>
          <p style={p}>
            Cuando usas Onda, el contenido necesario para responder puede ser enviado a estos
            proveedores. En el caso de la API de OpenAI, OpenAI indica que los datos enviados
            mediante su plataforma API no se usan para entrenar o mejorar sus modelos por defecto,
            salvo que el cliente opte expresamente por compartirlos; también indica que ciertos
            registros de monitoreo de abuso pueden conservarse hasta 30 días, salvo excepciones
            legales o de seguridad. Más información:{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de privacidad de OpenAI
            </a>
            .
          </p>
        </Section>

        <Section title="Registros técnicos">
          <p style={p}>
            En producción, Onda no registra el texto completo de tus mensajes en los logs técnicos
            ordinarios.
          </p>
          <p style={p}>Podemos guardar registros técnicos mínimos, como:</p>
          <ul style={ul}>
            <li>hora del evento;</li>
            <li>tipo de evento;</li>
            <li>ruta o función donde ocurrió;</li>
            <li>estado de éxito o error;</li>
            <li>identificador técnico o hash de sesión;</li>
            <li>longitud aproximada del mensaje, sin guardar el contenido completo.</li>
          </ul>
          <p style={p}>
            Estos registros ayudan a diagnosticar errores, proteger el servicio y mantener su
            funcionamiento.
          </p>
        </Section>

        <Section title="Conservación">
          <p style={p}>
            El historial del chat web se guarda principalmente en tu propio navegador. Puedes borrar
            la conversación desde la interfaz cuando quieras.
          </p>
          <p style={p}>
            En nuestros sistemas, los registros técnicos de error se conservan de forma general hasta
            30 días, salvo que sea necesario conservarlos por más tiempo por seguridad, prevención
            de abuso, cumplimiento legal o investigación de incidentes.
          </p>
          <p style={p}>
            Las métricas agregadas de uso pueden conservarse por más tiempo, pero sin el texto
            completo de tus mensajes.
          </p>
        </Section>

        <Section title="Uso por WhatsApp">
          <p style={p}>
            Cuando Onda esté disponible por WhatsApp, también aplicarán las condiciones y políticas
            de WhatsApp y Meta.
          </p>
          <p style={p}>
            En ese canal, Meta puede tratar información asociada a la conversación, como tu número
            de teléfono, información del perfil, mensajes enviados al negocio, datos técnicos y
            señales de seguridad o entrega, según sus propias políticas. WhatsApp indica que los
            negocios con los que interactúas pueden entregar información sobre sus interacciones
            contigo, y que esos negocios deben actuar conforme a la ley aplicable. Más información:{" "}
            <a
              href="https://www.whatsapp.com/legal/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de privacidad de WhatsApp
            </a>
            .
          </p>
          <p style={p}>
            También debes considerar que WhatsApp permite a los usuarios bloquear negocios, reportar
            conversaciones, entregar feedback o modificar preferencias de comunicación.
          </p>
          <p style={p}>
            Nosotros no publicamos tu número de teléfono ni lo vendemos. Si activamos WhatsApp,
            usaremos tu número solo para operar la conversación, responder tus mensajes, gestionar
            opt-out/opt-in, prevenir abuso y cumplir obligaciones aplicables.
          </p>
        </Section>

        <Section title="Mensajes, enlaces, imágenes y audios">
          <p style={p}>
            Si envías un enlace, Onda puede intentar leer información pública asociada a ese enlace
            para ayudarte a revisarlo.
          </p>
          <p style={p}>
            Si envías una imagen o captura, Onda puede procesarla para extraer texto o señales
            visibles.
          </p>
          <p style={p}>Si envías audio, Onda puede transcribirlo para responder.</p>
          <p style={p}>
            En todos los casos, evita enviar información sensible o de terceros sin autorización.
          </p>
        </Section>

        <Section title="Seguridad">
          <p style={p}>Aplicamos medidas razonables para reducir riesgos, incluyendo:</p>
          <ul style={ul}>
            <li>limitar logs con contenido sensible;</li>
            <li>evitar registrar texto completo en producción;</li>
            <li>usar identificadores técnicos o hashes cuando corresponde;</li>
            <li>restringir secretos y credenciales al entorno del servidor;</li>
            <li>revisar errores técnicos;</li>
            <li>limitar acceso a datos operativos.</li>
          </ul>
          <p style={p}>
            Ningún sistema digital puede garantizar seguridad absoluta. Por eso, Onda está diseñado
            para minimizar la información que necesita y para evitar pedir datos sensibles.
          </p>
        </Section>

        <Section title="Derechos y solicitudes">
          <p style={p}>Puedes escribirnos para solicitar, según la ley aplicable:</p>
          <ul style={ul}>
            <li>acceso a datos que podamos asociar contigo;</li>
            <li>corrección;</li>
            <li>eliminación;</li>
            <li>oposición o limitación de tratamiento, cuando corresponda;</li>
            <li>información sobre el uso de tus datos.</li>
          </ul>
          <p style={p}>
            Para ejercer estos derechos o hacer consultas sobre privacidad, escribe a:{" "}
            <a href="mailto:contacto@precisar.net">contacto@precisar.net</a>
          </p>
          <p style={p}>
            Para poder responder una solicitud, podríamos pedir información mínima que permita
            ubicar tu caso sin pedir datos innecesarios.
          </p>
        </Section>

        <Section title="Menores de edad">
          <p style={p}>
            Onda es un servicio educativo y de orientación. Si eres menor de edad, úsalo con
            acompañamiento de una persona adulta responsable, especialmente si vas a enviar
            imágenes, audios o información personal.
          </p>
          <p style={p}>No envíes datos personales sensibles tuyos ni de otras personas.</p>
        </Section>

        <Section title="Cambios en esta política">
          <p style={p}>
            Podemos actualizar esta política para reflejar cambios del servicio, nuevos canales como
            WhatsApp, nuevos proveedores o ajustes legales y técnicos.
          </p>
          <p style={{ ...p, color: "#5a5d62", fontSize: "0.9375rem", marginBottom: 0 }}>
            La fecha indicada arriba muestra la versión vigente.
          </p>
        </Section>
      </article>
    </main>
  );
}
