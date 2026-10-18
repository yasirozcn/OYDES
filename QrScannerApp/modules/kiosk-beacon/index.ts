import { NativeModule, requireOptionalNativeModule } from "expo";

// Kiosk tabletinin BLE yayını (Android yerel modülü).

declare class KioskBeaconNative extends NativeModule {
  isSupported(): boolean;
  getLastError(): string | null;
  startAdvertising(serviceUuid: string, tokenHex: string): Promise<boolean>;
  stopAdvertising(): Promise<void>;
}

// Expo Go'da yerel modül yoktur: null döner ve kiosk BLE olmadan çalışır.
const native = requireOptionalNativeModule<KioskBeaconNative>("KioskBeacon");

export const KioskBeacon = {
  isSupported(): boolean {
    try {
      return native?.isSupported() ?? false;
    } catch {
      return false;
    }
  },
  lastError(): string | null {
    return native?.getLastError() ?? (native ? null : "NATIVE_MODULE_MISSING");
  },
  async start(serviceUuid: string, tokenHex: string): Promise<boolean> {
    if (!native) return false;
    return native.startAdvertising(serviceUuid, tokenHex);
  },
  async stop(): Promise<void> {
    await native?.stopAdvertising();
  },
};
