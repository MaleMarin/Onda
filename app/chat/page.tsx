"use client";

import { ChatPageContent } from "./ChatPageContent";

/**
 * Ruta Next `/chat`: sin props arbitrarias (evita conflicto con tipos de página de App Router).
 * `?eje=` se aplica dentro de `ChatPageContent`. La home importa `ChatPageContent` con `initialEje`.
 */
export default function ChatPage() {
  return <ChatPageContent />;
}
