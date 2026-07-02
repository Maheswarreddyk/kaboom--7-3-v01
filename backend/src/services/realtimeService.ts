import { getSupabase } from '../database/client.js';

export async function broadcastToSession(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getSupabase();
    const channel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 5000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Realtime channel error: ${status}`));
        }
      });
    });

    await channel.send({ type: 'broadcast', event, payload });
    await supabase.removeChannel(channel);
  } catch (error) {
    console.error(`[Realtime Broadcast] Failed to send ${event} to session ${sessionId}:`, error);
  }
}
