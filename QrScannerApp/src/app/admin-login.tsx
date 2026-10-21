import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Button, ErrorBox, Field, InfoBox, LegalLinks, Logo, mono, Screen, Title, TopBar } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";
import { useSession } from "@/lib/session";

// Uygulama içi yönetici girişi yalnızca kiosk (QR gösterme) ekranını açar.
// Hesaplar AdminPanel veritabanındaki yönetici kullanıcılarıdır (admin_users).
// Tablette (geniş ekran) solda kurulum adımları, sağda form; telefonda yalnızca form.
const SETUP_STEPS = ["Kiosk hesabıyla giriş yapın", "Tabletin duracağı kapıyı seçin", "Tableti şarja takılı, Bluetooth açık bırakın. Ekran kapanmaz."];
const WIDE_MIN_WIDTH = 720;

export default function AdminLogin() {
  const { setAdminSession } = useSession();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wide = width >= WIDE_MIN_WIDTH;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ token: string }>("/api/mobile/admin/login", { method: "POST", body: { email: email.trim(), password } });
      await setAdminSession(r.token);
      router.replace("/kiosk-select");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: wide ? "center" : "flex-start", width: "100%", maxWidth: 440, alignSelf: "center" }}>
      <Title sub="Okulun verdiği kiosk hesabını kullanın.">Yönetici girişi</Title>
      <InfoBox message="Kiosk için Android tablet önerilir: Bluetooth yakınlık doğrulaması yalnızca Android'de yayınlanabilir." />
      <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
      <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={submit} />
      <ErrorBox message={error} />
      {!wide && <View style={{ flex: 1, minHeight: 16 }} />}
      <Button title="Giriş yap" onPress={submit} loading={loading} style={{ minHeight: 60, borderRadius: 16 }} />
      <Button title="Öğrenci girişine dön" variant="ghost" style={{ marginTop: 8 }} onPress={() => router.replace("/student-login")} />
      <LegalLinks />
    </ScrollView>
  );

  if (!wide)
    return (
      <Screen>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TopBar title="Kiosk kurulumu" onBack={() => router.back()} />
          {form}
        </KeyboardAvoidingView>
      </Screen>
    );

  return (
    <Screen padded={false} style={{ backgroundColor: colors.white }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: Math.min(width * 0.42, 520), backgroundColor: colors.brandDark, padding: 40, gap: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Logo />
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.white }}>İzmir Fen</Text>
              <Text style={{ fontSize: 13, color: "#CFE4D6" }}>Kiosk kurulumu</Text>
            </View>
          </View>
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.6, color: colors.white }}>Bu tableti kapı ekranına dönüştürün</Text>
          <View style={{ gap: 16 }}>
            {SETUP_STEPS.map((t, i) => (
              <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", fontFamily: mono, color: colors.brandDark }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", lineHeight: 22, color: colors.white }}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 13, lineHeight: 19, color: "#CFE4D6" }}>Kiosk hesabı yönetim paneline giremez; yalnızca QR ekranını açar.</Text>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, paddingHorizontal: 40, paddingVertical: 24 }}>
          {form}
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}
