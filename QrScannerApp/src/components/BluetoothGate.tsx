import { useEffect, useState } from "react";
import { AppState, Modal, Platform, Text, View } from "react-native";
import { IconBluetoothOff } from "./icons";
import { Button } from "./ui";
import { openBluetoothSettings, subscribeBtState, type BtState } from "@/lib/ble";
import { colors } from "@/lib/config";

// Bluetooth kapalıysa veya izin yoksa alttan açılan uyarı.
// Kiosk yakınlık doğrulaması Bluetooth'a dayanır; BLE_REQUIRED=true iken Bluetooth'suz okutma reddedilir.
// "Şimdilik geç" uyarıyı bu oturum için gizler; uygulama tekrar öne gelince yeniden sorulur. Expo Go'da (unavailable) görünmez.
export function BluetoothGate() {
  const [state, setState] = useState<BtState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(
    () =>
      subscribeBtState((s) => {
        setState(s);
        if (s === "PoweredOn") setDismissed(false);
      }),
    [],
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") setDismissed(false);
    });
    return () => sub.remove();
  }, []);

  const off = state === "PoweredOff";
  const problem = off || state === "Unauthorized";
  if (!state || !problem || dismissed) return null;

  const ios = Platform.OS === "ios";
  const howTo = off
    ? ios
      ? "Ekranın sağ üst köşesinden aşağı kaydırıp Denetim Merkezi'ni açın ve Bluetooth simgesine dokunun. Ya da Ayarlar → Bluetooth'tan açın."
      : "Aşağıdaki düğmeyle Bluetooth'u açın."
    : ios
      ? "Ayarlar'da bu uygulamanın sayfasında Bluetooth iznini açın."
      : "Ayarlar'da bu uygulamanın izinlerinden \"Yakındaki cihazlar\" iznini verin.";
  const action = off ? (ios ? "Ayarları aç" : "Bluetooth'u aç") : "İzin ver";

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setDismissed(true)}>
      <View style={{ flex: 1, backgroundColor: "rgba(20,33,26,0.55)", justifyContent: "flex-end", padding: 16 }}>
        <View style={{ backgroundColor: colors.white, borderRadius: 28, padding: 24, paddingTop: 28, width: "100%", maxWidth: 520, alignSelf: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: off ? colors.dangerSoft : colors.warnSoft }}>
            <IconBluetoothOff size={36} color={off ? colors.danger : colors.warn} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.3, color: colors.ink, textAlign: "center", marginTop: 16 }}>{off ? "Bluetooth kapalı" : "Bluetooth izni gerekli"}</Text>
          <Text style={{ fontSize: 15, color: colors.inkSoft, textAlign: "center", marginTop: 10, lineHeight: 22 }}>
            Okul kioskunun yanında olduğunuzu doğrulamak için Bluetooth açık olmalı. {howTo}
          </Text>
          <Button title={action} onPress={() => void openBluetoothSettings(state)} style={{ marginTop: 22, minHeight: 60, borderRadius: 16 }} />
          <Button title="Şimdilik geç" variant="ghost" onPress={() => setDismissed(true)} style={{ marginTop: 6 }} />
        </View>
      </View>
    </Modal>
  );
}
