import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Button, ErrorBox, Field, LegalLinks, Logo, Screen, TextLink, Title, TopBar } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";
import { useSession } from "@/lib/session";

// Uygulama içi yönetici girişi yalnızca kiosk (QR gösterme) ekranını açar.
// Hesaplar AdminPanel veritabanındaki yönetici kullanıcılarıdır (admin_users).
// İki adım: e-posta → şifre. Tablette (geniş ekran) solda başlık paneli, sağda form; telefonda yalnızca form.
const WIDE_MIN_WIDTH = 720;
const EMAIL_PATTERN = /^\S+@\S+$/;

export default function AdminLogin() {
  const { setAdminSession } = useSession();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<"email" | "password">("email");
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

  const back = () => {
    setError(null);
    if (step === "email") {
      if (router.canGoBack()) router.back();
      else router.replace("/welcome");
    } else {
      setStep("email");
      setPassword("");
    }
  };

  const form = (
    <>
      <TopBar step={step === "email" ? "Adım 1 / 2" : "Adım 2 / 2"} onBack={back} />
      <ScrollView keyboardShouldPersistTaps="always" style={{ flex: 1, width: "100%", maxWidth: 440, alignSelf: "center" }} contentContainerStyle={{ flexGrow: 1, justifyContent: wide ? "center" : "flex-start" }}>
        {step === "email" ? (
          <>
            <Title>E-postanızı girin</Title>
            <Field label="E-posta" value={email} onChangeText={setEmail} autoFocus autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
            {!wide && <View style={{ flex: 1, minHeight: 16 }} />}
            <Button title="Devam" onPress={() => setStep("password")} disabled={!EMAIL_PATTERN.test(email.trim())} style={{ minHeight: 60, borderRadius: 16 }} />
            <TextLink title="Öğrenci girişine dön" onPress={() => router.replace("/student-login")} />
          </>
        ) : (
          <>
            <Title>Şifrenizi girin</Title>
            <Field label="Şifre" value={password} onChangeText={setPassword} autoFocus secureTextEntry textContentType="password" onSubmitEditing={submit} />
            <ErrorBox message={error} />
            {!wide && <View style={{ flex: 1, minHeight: 16 }} />}
            <Button title="Giriş yap" onPress={submit} loading={loading} disabled={password.length === 0} style={{ minHeight: 60, borderRadius: 16 }} />
          </>
        )}
        <LegalLinks />
      </ScrollView>
    </>
  );

  if (!wide)
    return (
      <Screen>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {form}
        </KeyboardAvoidingView>
      </Screen>
    );

  return (
    <Screen padded={false} style={{ backgroundColor: colors.white }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: Math.min(width * 0.42, 520), backgroundColor: colors.brand, padding: 40, gap: 24 }}>
          <Logo />
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.6, color: colors.white }}>Bu tableti kapı ekranına dönüştürün</Text>
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, paddingHorizontal: 40, paddingVertical: 24 }}>
          {form}
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}
