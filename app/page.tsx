import { Suspense } from "react";
import ChatPage from "@/app/chat/page";
import { EjeOnda } from "@/content/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function ChatFallback() {
  return (
    <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui", color: "#555" }}>
      Cargando Onda…
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const ejeParam = params?.eje;
  const ejeStr = Array.isArray(ejeParam) ? ejeParam[0] : ejeParam;
  const initialEje =
    ejeStr === EjeOnda.A_MANO || ejeStr === EjeOnda.CIVITA || ejeStr === EjeOnda.PROFES
      ? (ejeStr as EjeOnda)
      : null;
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatPage initialEje={initialEje} />
    </Suspense>
  );
}
