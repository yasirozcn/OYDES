import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BluetoothGate } from "@/components/BluetoothGate";
import { SessionProvider } from "@/lib/session";

// Kök düzen: tüm ekranlar oturum (SessionProvider) içindeki bu Stack'te açılır.
// Bluetooth uyarısı (BluetoothGate) tüm ekranların üstünde açılabilsin diye Stack'ten sonra durur.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
        <BluetoothGate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
