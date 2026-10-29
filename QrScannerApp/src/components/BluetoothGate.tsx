import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { IconBluetoothOff } from "./icons";
import { Button } from "./ui";
import { openBluetoothSettings, subscribeBtState, type BtState } from "@/lib/ble";
import { colors } from "@/lib/config";

// Bluetooth kapalıysa veya izin yoksa ekranın altında açılan uyarı (QR okutma ve kiosk ekranlarında).
// Kapıya yakınlık doğrulaması Bluetooth'a dayanır; BLE_REQUIRED=true iken Bluetooth'suz okutma reddedilir.
// Uyarı ekranı kapatmaz (geri oku kullanılabilir); Bluetooth açılınca kendiliğinden kaybolur. Expo Go'da (unavailable) görünmez.
export function BluetoothGate() {
  const [state, setState] = useState<BtState | null>(null);

  useEffect(() => subscribeBtState(setState), []);

  const off = state === "PoweredOff";
  if (!off && state !== "Unauthorized") return null;

  const ios = Platform.OS === "ios";
  const howTo = off
    ? ios
      ? "Ayarlar → Bluetooth'tan açın."
      : null
    : ios
      ? "Ayarlar'da bu uygulamanın sayfasında Bluetooth iznini açın."
      : "Ayarlar'da bu uygulamanın izinlerinden \"Yakındaki cihazlar\" iznini verin.";
  const action = off ? (ios ? "Ayarları aç" : "Bluetooth'u aç") : "İzin ver";

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerSoft }}>
          <IconBluetoothOff size={24} color={colors.danger} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink }}>{off ? "Bluetooth kapalı" : "Bluetooth izni gerekli"}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>
            {`Kapının yanında olduğunuzu doğrulamak için Bluetooth'un açık olması gerekiyor.${howTo ? ` ${howTo}` : ""}`}
          </Text>
        </View>
      </View>
      <Button title={action} onPress={() => void openBluetoothSettings(state)} style={{ marginTop: 20, minHeight: 60, borderRadius: 16 }} />
    </View>
  );
}
