import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/lib/session";

// Kök düzen: tüm ekranlar oturum (SessionProvider) içindeki bu Stack'te açılır.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
