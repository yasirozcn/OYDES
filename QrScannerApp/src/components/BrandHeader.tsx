import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo, SchoolCrest } from "./ui";
import { colors } from "@/lib/config";

// Karşılama ekranının üstündeki ana renk alan: solda uygulama logosu, sağda okul amblemi (aynı boyut ve hizada), ortada ekranın başlığı (children), en altta okulun sloganı.
// Durum çubuğunun arkasına kadar uzanır; ekran odaktayken saat/pil yazıları beyazdır, başka ekran üstüne açılınca varsayılana döner.
export function BrandHeader({ children, logoSize = 56 }: { children?: React.ReactNode; logoSize?: number }) {
  const insets = useSafeAreaInsets();
  // false ile başlar: ekran arkadayken yeniden oluşturulursa (ör. yeniden yükleme) beyaz durum çubuğunu öne almasın.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return (
    <View style={{ backgroundColor: colors.brand, paddingTop: insets.top + 16, paddingBottom: 24, paddingLeft: insets.left + 24, paddingRight: insets.right + 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
      {focused && <StatusBar style="light" />}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Logo size={logoSize} />
        <View style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
          <SchoolCrest size={logoSize - 4} />
        </View>
      </View>
      {children}
      <Text style={{ marginTop: 6, fontSize: 16, lineHeight: 22, fontWeight: "700", fontStyle: "italic", color: colors.accent }}>“Her Zaman, Her Alanda En İyisi”</Text>
    </View>
  );
}
