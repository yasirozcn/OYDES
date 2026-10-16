import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

// QR / BLE / istek imzası protokolü. AdminPanel'deki src/lib/protocol.ts ile BİREBİR aynı kurallar;
// birini değiştirirseniz diğerini de değiştirin (kök AGENTS.md §4, test vektörleri orada).

export const PROTOCOL_VERSION = "FB2";

function mac(secretHex: string, message: string): Uint8Array {
  return hmac(sha256, hexToBytes(secretHex), utf8ToBytes(message));
}

// Dolgusuz base64url; Buffer/btoa her ortamda olmadığı için elle.
function base64url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
  }
  if (bytes.length - i === 1) {
    const n = bytes[i] << 16;
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63];
  } else if (bytes.length - i === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63];
  }
  return out;
}

export function slotAt(nowMs: number, slotSeconds: number): number {
  return Math.floor(nowMs / 1000 / slotSeconds);
}

// Kiosk yönsüzdür: QR'da giriş/çıkış bilgisi yok, yönü sunucu belirler.
export function buildQrPayload(secretHex: string, kioskId: string, slot: number): string {
  const sig = base64url(mac(secretHex, `${PROTOCOL_VERSION}|${kioskId}|${slot}`).slice(0, 16));
  return `${PROTOCOL_VERSION}.${kioskId}.${slot}.${sig}`;
}

// Yalnızca biçim kontrolü; imza ve tazelik sunucuda doğrulanır.
export function isOurQr(payload: string): boolean {
  return payload.startsWith(`${PROTOCOL_VERSION}.`) && payload.split(".").length === 4;
}

export function bleToken(secretHex: string, kioskId: string, slot: number): string {
  return bytesToHex(mac(secretHex, `BLE|${kioskId}|${slot}`).slice(0, 8));
}

export function requestSignature(deviceSecretHex: string, qr: string, ble: string | null, timestamp: number): string {
  return bytesToHex(mac(deviceSecretHex, `${qr}|${ble ?? ""}|${timestamp}`));
}

export const __test = { base64url };
