// Veli WhatsApp bildirimleri. 1. aşamada gerçek mesaj gitmez (WHATSAPP_PROVIDER=mock): mesaj kaydedilir ve sunucu konsoluna yazılır.
// Gerçek sağlayıcıya geçiş: `sendViaProvider` içini sağlayıcının HTTP API'siyle doldurun ve WHATSAPP_PROVIDER'ı ayarlayın.

import { config } from "./config";
import { updateWhatsAppMessage } from "./db/repo";
import type { Direction, Student, WhatsAppMessage } from "./db/types";

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: config.timeZone }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium", timeZone: config.timeZone }).format(new Date(iso));
}

export function buildWhatsAppBody(student: Student, direction: Direction, occurredAtIso: string, kioskName: string): string {
  const action = direction === "IN" ? "okula giris yapti" : "okuldan cikis yapti";
  return `Sayin Veli, ${student.firstName} ${student.lastName} ${formatTime(occurredAtIso)}'de ${action} (${kioskName}). - ${config.schoolShortName}`;
}

async function sendViaProvider(msg: WhatsAppMessage): Promise<{ ok: boolean; providerMessageId?: string }> {
  // TODO(son görev): gerçek WhatsApp sağlayıcısı entegrasyonu.
  console.log(`[whatsapp:${config.whatsappProvider}] -> ${msg.phone}: ${msg.body}`);
  return { ok: true, providerMessageId: `mock-${msg.id}` };
}

export async function dispatchWhatsApp(messages: WhatsAppMessage[]): Promise<void> {
  for (const msg of messages) {
    try {
      const r = await sendViaProvider(msg);
      await updateWhatsAppMessage(msg.id, {
        status: r.ok ? (config.whatsappProvider === "mock" ? "MOCK_SENT" : "SENT") : "FAILED",
        providerMessageId: r.providerMessageId ?? null,
        attemptCount: msg.attemptCount + 1,
        sentAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[whatsapp] gönderim hatası", e);
      await updateWhatsAppMessage(msg.id, { status: "FAILED", attemptCount: msg.attemptCount + 1 });
    }
  }
}
