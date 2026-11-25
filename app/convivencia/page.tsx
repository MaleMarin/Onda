import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convivencia — Onda de Precisar",
  description: "Normas de convivencia y uso respetuoso del asistente Onda, basadas en los derechos humanos.",
};

export default function ConvivenciaPage() {
  return (
    <main
      style={{
        background: "#f5f5f5",
        color: "#212121",
        minHeight: "100vh",
        fontFamily: 'var(--font-onda, "Avenir Next", Avenir, system-ui, sans-serif)',
        lineHeight: 1.65,
        padding: "32px 20px 48px",
      }}
    >
      <article style={{ maxWidth: 700, margin: "0 auto", background: "#fff", padding: "28px 30px 40px", borderRadius: 20 }}>
        <p><Link href="/chat" style={{ color: "#212121" }}>Volver a Onda / Voltar ao Onda</Link></p>
        <h1>Convivencia y respeto en Onda</h1>
        <p>
          Onda es un espacio para conversar, aprender, preguntar y disentir con respeto.
          Su actuación se basa en la dignidad de las personas y los derechos humanos.
          No colabora con el acoso, las amenazas, los insultos dirigidos, el racismo,
          la xenofobia ni otras formas de discriminación o deshumanización.
        </p>
        <p>
          Si alguien pide utilizar Onda para atacar o humillar, Onda rechazará esa solicitud.
          Ante insultos dirigidos, puede advertir y detener la interacción si continúan.
          Se puede retomar la conversación cuando exista respeto.
        </p>
        <p>
          Expresar frustración, criticar ideas o instituciones, hablar sobre experiencias difíciles
          y analizar o denunciar mensajes ofensivos <strong>sí está permitido</strong>.
          Onda debe ayudar a comprender esas situaciones sin juzgar a quienes solicitan ayuda.
        </p>

        <hr style={{ border: 0, borderTop: "1px solid #ddd", margin: "28px 0" }} />

        <section lang="pt-BR">
          <h2>Convivência e respeito no Onda</h2>
          <p>
            Onda é um espaço para conversar, aprender, perguntar e discordar com respeito.
            Sua atuação se baseia na dignidade das pessoas e nos direitos humanos.
            Não colabora com assédio, ameaças, insultos dirigidos, racismo,
            xenofobia ou outras formas de discriminação e desumanização.
          </p>
          <p>
            Se alguém pedir ajuda para atacar ou humilhar, Onda recusará o pedido.
            Diante de insultos dirigidos, pode fazer uma advertência e encerrar
            aquela interação caso persistam. A conversa pode ser retomada com respeito.
          </p>
          <p>
            Expressar frustração, criticar ideias ou instituições, relatar experiências difíceis
            e analisar ou denunciar mensagens ofensivas <strong>é permitido</strong>.
            Onda deve ajudar a compreender essas situações sem julgar quem pede ajuda.
          </p>
        </section>
      </article>
    </main>
  );
}
