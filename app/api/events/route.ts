import { subscribe, type PlatformEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET() {
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const send = (event: PlatformEvent) => safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);

      safeEnqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      unsubscribe = subscribe(send);
      heartbeat = setInterval(() => safeEnqueue(`: heartbeat\n\n`), 15000);
    },
    cancel() {
      closed = true;
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
