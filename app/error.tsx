"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h2>Algo salió mal</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Intentar de nuevo</button>
    </div>
  );
}
