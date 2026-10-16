// QR / BLE / istek imzası protokolü. Mobildeki src/lib/protocol.ts ile birebir aynı kurallar; birini değiştirirseniz diğerini de değiştirin.
import { createHmac, timingSafeEqual } from "crypto";

export const PROTOCOL_VERSION = "FB2";
export const SLOT_SECONDS = 5;
/** Sunucunun kabul ettiği geçmiş dilim sayısı (ağ gecikmesi ve saat farkı için). */
export const SLOT_TOLERANCE_PAST = 2;
export const SLOT_TOLERANCE_FUTURE = 1;
/** Kioskun BLE yayınındaki servis kimliği. */
export const BLE_SERVICE_UUID = "6f1b0000-5a1e-4c1a-9b9e-fb0000000001";

/** Anahtarlar hex metin olarak saklanır; HMAC'te bayta çevrilir. */
function hmac(secretHex: string, message: string): Buffer {
  return createHmac("sha256", Buffer.from(secretHex, "hex")).update(message).digest();
}

export function currentSlot(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000 / SLOT_SECONDS);
}

export function qrSignature(secretHex: string, kioskId: string, slot: number): string {
  return hmac(secretHex, `${PROTOCOL_VERSION}|${kioskId}|${slot}`).subarray(0, 16).toString("base64url");
}

/** FB2.<kioskId>.<slot>.<imza> */
export function buildQrPayload(secretHex: string, kioskId: string, slot: number): string {
  return `${PROTOCOL_VERSION}.${kioskId}.${slot}.${qrSignature(secretHex, kioskId, slot)}`;
}

/** Biçim kontrolü; imzayı doğrulamaz (scan.ts doğrular). */
export function parseQrPayload(payload: string): { kioskId: string; slot: number; sig: string } | null {
  const parts = payload.trim().split(".");
  if (parts.length !== 4 || parts[0] !== PROTOCOL_VERSION) return null;
  const [, kioskId, slotStr, sig] = parts;
  const slot = Number(slotStr);
  if (!Number.isInteger(slot) || !kioskId || !sig) return null;
  return { kioskId, slot, sig };
}

/** Kioskun BLE ile yayınladığı jeton: 8 bayt → 16 hex karakter. */
export function bleToken(secretHex: string, kioskId: string, slot: number): string {
  return hmac(secretHex, `BLE|${kioskId}|${slot}`).subarray(0, 8).toString("hex");
}

/** Öğrencinin okutma isteği imzası (cihaz anahtarıyla, 64 hex). */
export function requestSignature(deviceSecretHex: string, qr: string, ble: string | null, timestamp: number): string {
  return hmac(deviceSecretHex, `${qr}|${ble ?? ""}|${timestamp}`).toString("hex");
}

/** Sabit zamanlı karşılaştırma (imza ve jeton kontrolleri için). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
