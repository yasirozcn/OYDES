import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Logo, Screen } from "@/components/ui";
import { colors, SPLASH_DURATION_MS } from "@/lib/config";
import { useSession } from "@/lib/session";

// Açılış ekranı: logo görünürken oturum kontrol edilir; oturum varsa ilgili ekrana, yoksa karşılamaya geçilir.
export default function Splash() {
  const { ready, studentToken, adminToken } = useSession();
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (ready && elapsed) {
    if (adminToken) return <Redirect href="/kiosk-select" />;
    if (studentToken) return <Redirect href="/student-home" />;
    return <Redirect href="/welcome" />;
  }

  return (
    <Screen style={{ backgroundColor: colors.brand }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Logo size={104} />
      </View>
    </Screen>
  );
}
