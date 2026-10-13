// QR / BLE / istek imzası protokolü. Mobildeki src/lib/protocol.ts ile birebir aynı kurallar; birini değiştirirseniz diğerini de değiştirin.
// BE-1: yalnızca sabitler (config uç noktası için). QR/BLE/imza fonksiyonları okutma görevinde eklenir.

export const PROTOCOL_VERSION = "FB2";
export const SLOT_SECONDS = 5;
/** Sunucunun kabul ettiği geçmiş dilim sayısı (ağ gecikmesi ve saat farkı için). */
export const SLOT_TOLERANCE_PAST = 2;
export const SLOT_TOLERANCE_FUTURE = 1;
/** Kioskun BLE yayınındaki servis kimliği. */
export const BLE_SERVICE_UUID = "6f1b0000-5a1e-4c1a-9b9e-fb0000000001";
