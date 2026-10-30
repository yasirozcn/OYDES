import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandHeader } from "@/components/BrandHeader";
import { Button, LegalLinks, TextLink } from "@/components/ui";
import { colors } from "@/lib/config";

const steps = [
  { title: "Telefonunuzla giriş yapın", text: "Okula kayıtlı cep telefonu numaranızla bir kez şifre oluşturun." },
  { title: "Kapıdaki QR kodu okutun", text: "Okula girerken ve çıkarken kapıdaki ekranda görünen kodu okutun." },
  { title: "Veliniz bilgilendirilir", text: "Giriş ve çıkışınız kaydedilir, velinize WhatsApp mesajı gider." },
];

// Karşılama: üstte ana renk zeminde logolar, "Hoş geldiniz" ve okulun sloganı; ortada uygulamanın nasıl çalıştığı (3 adım);
// altta "Öğrenci girişi" ana düğmesi ve küçük "Yönetici olarak devam et" bağlantısı (uygulama öğrenciler içindir).
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const side = { paddingLeft: insets.left + 24, paddingRight: insets.right + 24 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BrandHeader logoSize={64}>
        <Text style={{ fontSize: 13, fontWeight: "700", letterSpacing: 1, color: colors.brandSoft }}>İZMİR FEN LİSESİ</Text>
        <Text style={{ marginTop: 6, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.4, color: colors.white }}>Hoş geldiniz</Text>
      </BrandHeader>

      {/* Bilgilendirme: numaralı ve birbirine çizgiyle bağlı adımlar (zaman çizelgesi) — seçilecek seçenek değil, sırayla izlenecek yol olduğu görünür. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[side, { paddingTop: 24, paddingBottom: 16 }]}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink, marginBottom: 4 }}>Öğrenci giriş-çıkış uygulaması</Text>
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft, marginBottom: 20 }}>Uygulamada sizi bu adımlar bekliyor:</Text>
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <View key={s.title} style={{ flexDirection: "row", gap: 14 }}>
              <View style={{ alignItems: "center", width: 28 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>{i + 1}</Text>
                </View>
                {!last && <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: colors.brandSoft }} />}
              </View>
              <View style={{ flex: 1, gap: 2, paddingTop: 3, paddingBottom: last ? 0 : 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>{s.title}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>{s.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[side, { paddingTop: 8, paddingBottom: insets.bottom + 8 }]}>
        <Button title="Öğrenci girişi" onPress={() => router.push("/student-login")} style={{ minHeight: 60, borderRadius: 16 }} />
        <TextLink title="Yönetici olarak devam et" onPress={() => router.push("/admin-login")} style={{ marginTop: 4, paddingVertical: 8 }} />
        <LegalLinks style={{ paddingVertical: 4 }} />
      </View>
    </View>
  );
}
