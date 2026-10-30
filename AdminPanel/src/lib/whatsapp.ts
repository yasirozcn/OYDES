// Veli WhatsApp bildirimleri. Sağlayıcı WHATSAPP_PROVIDER ile seçilir:
// - "mock" (varsayılan, geliştirme): gerçek mesaj gitmez; mesaj kaydedilir ve sunucu konsoluna yazılır. Ortak veritabanında
//   çalışan ekip sunucuları yanlışlıkla gerçek veliye mesaj göndermesin diye gerçek gönderim yalnızca açıkça seçilince yapılır.
// - "insider": Insider WhatsApp API'si, onaylı şablonla (WHATSAPP_TEMPLATE). API anahtarı (INSIDER_API_KEY) yalnızca sunucuda okunur, loglanmaz.

import { config } from "./config";
import { updateWhatsAppMessage, type OutgoingWhatsApp } from "./db/repo";
import type { Direction, Student } from "./db/types";

const INSIDER_SEND_URL = "https://whatsapp.useinsider.com/v1/send";
const PROVIDER_TIMEOUT_MS = 10_000;

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: config.timeZone }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium", timeZone: config.timeZone }).format(new Date(iso));
}

// "27 Ekim 09:59"
function formatMessageDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: config.timeZone }).format(new Date(iso));
}

/**
 * Bir veliye gidecek mesaj. Şablon parametrelerinin sırası Insider'daki şablonla aynıdır: veli, öğrenci, tarih, konum, işlem.
 * `body` panelde gösterilen metindir; gerçek metni Insider şablonu bu parametrelerle oluşturur.
 */
export function buildWhatsAppMessage(guardianName: string, student: Student, direction: Direction, occurredAtIso: string, kioskName: string) {
  const templateParams = [guardianName, `${student.firstName} ${student.lastName}`, formatMessageDate(occurredAtIso), kioskName, direction === "IN" ? "giriş" : "çıkış"];
  const [guardian, studentName, date, location, action] = templateParams;
  return {
    body: `Merhabalar ${guardian}, ${studentName} öğrencimiz ${date} tarihinde ${location} konumundan ${action} yapmıştır. Bilgilerinize sunarız.`,
    templateParams,
  };
}

async function sendViaInsider(msg: OutgoingWhatsApp): Promise<boolean> {
  if (!config.insiderApiKey || !config.whatsappTemplate) {
    console.error(`[whatsapp] INSIDER_API_KEY veya WHATSAPP_TEMPLATE tanımlı değil; ${msg.id} gönderilmedi.`);
    return false;
  }
  const res = await fetch(INSIDER_SEND_URL, {
    method: "POST",
    headers: { "X-INS-AUTH-KEY": config.insiderApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          phoneNumber: msg.phone,
          message: {
            type: "template",
            template: {
              name: config.whatsappTemplate,
              language: { code: "tr", policy: "deterministic" },
              components: [{ type: "body", parameters: msg.templateParams.map((text) => ({ type: "text", text })) }],
            },
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  // Yanıt gövdesi loglanmaz (telefon numarası içerebilir); yalnızca mesaj kimliği ve HTTP durumu.
  if (!res.ok) console.error(`[whatsapp] ${msg.id} gönderilemedi: HTTP ${res.status}`);
  return res.ok;
}

export async function dispatchWhatsApp(messages: OutgoingWhatsApp[]): Promise<void> {
  const live = config.whatsappProvider === "insider";
  for (const msg of messages) {
    try {
      if (!live) console.log(`[whatsapp:mock] -> ${msg.phone}: ${msg.body}`);
      const ok = live ? await sendViaInsider(msg) : true;
      await updateWhatsAppMessage(msg.id, {
        status: ok ? (live ? "SENT" : "MOCK_SENT") : "FAILED",
        providerMessageId: live ? null : `mock-${msg.id}`,
        attemptCount: msg.attemptCount + 1,
        sentAt: ok ? new Date().toISOString() : null,
      });
    } catch (e) {
      // Ağ hatası/zaman aşımı: hata nesnesi istek başlıklarını içermez, anahtar loglanmaz.
      console.error(`[whatsapp] ${msg.id} gönderim hatası:`, e instanceof Error ? e.message : e);
      await updateWhatsAppMessage(msg.id, { status: "FAILED", attemptCount: msg.attemptCount + 1 });
    }
  }
}
