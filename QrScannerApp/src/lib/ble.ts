import { Linking, PermissionsAndroid, Platform } from "react-native";
import type { BleError, BleManager, Device } from "react-native-ble-plx";

// Öğrenci telefonunda kioskun BLE jetonunu dinler.
// Yerel BLE modülü yoksa (Expo Go) BLE devre dışı kalır; okutma BLE'siz devam eder.
// Tüm olaylar "[BLE]" önekiyle konsola ve uygulama içi loga (Bluetooth testi ekranı) yazılır.

export type BtState = "unavailable" | "Unknown" | "Resetting" | "Unsupported" | "Unauthorized" | "PoweredOff" | "PoweredOn";
export type Found = { token: string; rssi: number | null; at: number; source: "service-data" | "local-name"; deviceId: string };
export type BleStatus = "unavailable" | "no-permission" | "off" | "scanning" | "found";
export type BleLogEntry = { at: number; msg: string };
export type SeenDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
  services: string[];
  hasServiceData: boolean;
  hasManufacturerData: boolean;
  lastSeen: number;
  count: number;
  isKiosk: boolean;
};

type ScannedDevice = {
  id: string;
  name?: string | null;
  localName?: string | null;
  rssi?: number | null;
  serviceUUIDs?: string[] | null;
  serviceData?: Record<string, string> | null;
  manufacturerData?: string | null;
};

type ScanOptions = { onDevices?: (devices: SeenDevice[]) => void; verbose?: boolean };

const LOG_LIMIT = 300;
const SUMMARY_MS = 5000;
const DEVICES_MS = 1000;
const LOCAL_NAME_RE = /^FB([0-9a-fA-F]{16})$/;

// --- Log ---

let log: BleLogEntry[] = [];
const logListeners = new Set<() => void>();

export function bleLog(msg: string) {
  console.log(`[BLE] ${msg}`);
  log = [...log.slice(-(LOG_LIMIT - 1)), { at: Date.now(), msg }];
  logListeners.forEach((fn) => fn());
}

export function getBleLog(): BleLogEntry[] {
  return [...log];
}

export function clearBleLog() {
  log = [];
  logListeners.forEach((fn) => fn());
}

export function subscribeBleLog(fn: () => void): () => void {
  logListeners.add(fn);
  return () => logListeners.delete(fn);
}

// --- Yönetici (tek örnek) ---

let manager: BleManager | null = null;
let available: boolean | null = null;

function getManager(): BleManager | null {
  if (available === false) return null;
  if (manager) return manager;
  try {
    // Koşulsuz import Expo Go'da uygulamayı çökertir; yerel modül yalnızca geliştirme/mağaza derlemesinde vardır.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BleManager } = require("react-native-ble-plx");
    manager = new BleManager() as BleManager;
    available = true;
    bleLog(`BleManager oluşturuldu (${Platform.OS} ${Platform.Version})`);
    return manager;
  } catch (e) {
    available = false;
    bleLog(`Yerel BLE modülü yok (Expo Go?) — BLE devre dışı. ${String(e)}`);
    return null;
  }
}

export function isBleAvailable(): boolean {
  return getManager() !== null;
}

let lastState: BtState | null = null;

export function subscribeBtState(fn: (s: BtState) => void): () => void {
  const m = getManager();
  if (!m) {
    fn("unavailable");
    return () => {};
  }
  const sub = m.onStateChange((state) => {
    const s = state as BtState;
    if (s !== lastState) bleLog(`Bluetooth durumu: ${s}`);
    lastState = s;
    fn(s);
  }, true);
  return () => sub.remove();
}

export async function openBluetoothSettings(state: BtState) {
  bleLog(`Kullanıcı Bluetooth ayarlarına yönlendirildi (durum: ${state})`);
  if (Platform.OS !== "android") {
    // iOS uygulamaların Bluetooth ayarını doğrudan açmasına izin vermez; uygulamanın ayar sayfası açılır.
    await Linking.openSettings();
    return;
  }
  try {
    if (state === "PoweredOff") await Linking.sendIntent("android.bluetooth.adapter.action.REQUEST_ENABLE");
    else await Linking.openSettings();
  } catch {
    try {
      await Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
    } catch {
      await Linking.openSettings();
    }
  }
}

async function ensureAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (Number(Platform.Version) >= 31) {
    const result = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);
    bleLog(`Android izinleri: ${JSON.stringify(result)}`);
    return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  bleLog(`Android konum izni: ${result}`);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// --- Jeton çözme ---

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToHex(b64: string): string {
  let bits = 0;
  let value = 0;
  let hex = "";
  for (const ch of b64.replace(/[^A-Za-z0-9+/]/g, "")) {
    value = (value << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      hex += ((value >> bits) & 0xff).toString(16).padStart(2, "0");
    }
  }
  return hex;
}

/** Android kiosk: service data (8 bayt). Mac/iOS test kioskü: yerel ad "FB" + 16 hex. */
export function extractKioskToken(device: ScannedDevice, serviceUuid: string): Omit<Found, "at"> | null {
  const target = serviceUuid.toLowerCase();
  for (const [uuid, value] of Object.entries(device.serviceData ?? {})) {
    if (uuid.toLowerCase() !== target || !value) continue;
    const hex = base64ToHex(value);
    if (hex.length === 16) return { token: hex, rssi: device.rssi ?? null, source: "service-data", deviceId: device.id };
  }
  const match = LOCAL_NAME_RE.exec(device.localName ?? device.name ?? "");
  if (match) return { token: match[1].toLowerCase(), rssi: device.rssi ?? null, source: "local-name", deviceId: device.id };
  return null;
}

// --- Tarama ---

export async function startBleScan(serviceUuid: string, onUpdate: (status: BleStatus, latest: Found | null) => void, opts: ScanOptions = {}): Promise<() => void> {
  const m = getManager();
  if (!m) {
    onUpdate("unavailable", null);
    return () => {};
  }
  if (!(await ensureAndroidPermissions())) {
    bleLog("Tarama başlatılamadı: izin verilmedi");
    onUpdate("no-permission", null);
    return () => {};
  }

  const seen = new Map<string, SeenDevice>();
  let latest: Found | null = null;
  let packets = 0;
  let scanning = false;
  let stopped = false;
  let summaryTimer: ReturnType<typeof setInterval> | null = null;
  let devicesTimer: ReturnType<typeof setInterval> | null = null;

  const summary = () => {
    const kiosk = latest
      ? `son jeton ${latest.token} (${latest.source}, RSSI ${latest.rssi}, ${Math.round((Date.now() - latest.at) / 1000)} sn önce)`
      : "kiosk jetonu henüz yok";
    bleLog(`Özet: son 5 sn'de ${packets} paket, toplam ${seen.size} farklı cihaz; ${kiosk}`);
    packets = 0;
  };

  const sortedDevices = () =>
    [...seen.values()].sort((a, b) => Number(b.isKiosk) - Number(a.isKiosk) || (b.rssi ?? -999) - (a.rssi ?? -999));

  const onDevice = (error: BleError | null, device: Device | null) => {
    if (error) {
      bleLog(`Tarama hatası: ${error.message} (kod ${error.errorCode})`);
      return;
    }
    if (!device) return;
    packets++;
    const found = extractKioskToken(device, serviceUuid);
    const name = device.localName ?? device.name ?? null;
    const prev = seen.get(device.id);
    if (!prev) {
      const services = (device.serviceUUIDs ?? []).join(",");
      bleLog(
        `Yeni cihaz: ${name} id=${device.id.slice(0, 8)}… RSSI=${device.rssi} servisler=${services || "-"}` +
          `${device.serviceData ? " [+serviceData]" : ""}${device.manufacturerData ? " [+manufacturerData]" : ""}`,
      );
    } else if (opts.verbose) {
      bleLog(`Paket: ${name} RSSI=${device.rssi}`);
    }
    seen.set(device.id, {
      id: device.id,
      name,
      rssi: device.rssi ?? null,
      services: device.serviceUUIDs ?? [],
      hasServiceData: !!device.serviceData,
      hasManufacturerData: !!device.manufacturerData,
      lastSeen: Date.now(),
      count: (prev?.count ?? 0) + 1,
      isKiosk: (prev?.isKiosk ?? false) || !!found,
    });
    if (!found) return;
    if (found.token !== latest?.token) bleLog(`KIOSK JETONU: ${found.token} (${found.source}, RSSI ${found.rssi}, cihaz ${found.deviceId.slice(0, 8)}…)`);
    latest = { ...found, at: Date.now() };
    onUpdate("found", latest);
  };

  const begin = () => {
    if (stopped || scanning) return;
    scanning = true;
    onUpdate(latest ? "found" : "scanning", latest);
    summaryTimer = setInterval(summary, SUMMARY_MS);
    if (opts.onDevices) {
      const onDevices = opts.onDevices;
      devicesTimer = setInterval(() => onDevices(sortedDevices()), DEVICES_MS);
    }
    bleLog(`Tarama başladı — kiosk servis kimliği ${serviceUuid}, filtre yok, allowDuplicates=true`);
    m.startDeviceScan(null, { allowDuplicates: true }, onDevice).catch((e: unknown) => {
      bleLog(`startDeviceScan başarısız: ${e instanceof Error ? e.message : String(e)}`);
      onUpdate("unavailable", null);
    });
  };

  const stopScan = () => {
    if (!scanning) return;
    scanning = false;
    m.stopDeviceScan().catch(() => {});
    if (summaryTimer) clearInterval(summaryTimer);
    if (devicesTimer) clearInterval(devicesTimer);
    bleLog(`Tarama durdu (toplam ${packets} paket, ${seen.size} cihaz)`);
  };

  const unsubscribe = subscribeBtState((s) => {
    if (s === "PoweredOn") begin();
    else if (s === "Unauthorized") {
      stopScan();
      onUpdate("no-permission", null);
    } else if (s === "PoweredOff" || s === "Unsupported") {
      stopScan();
      onUpdate("off", null);
    }
  });

  return () => {
    stopped = true;
    unsubscribe();
    stopScan();
  };
}
