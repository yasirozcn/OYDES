import { router } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { IconCheck } from "@/components/icons";
import { Button, ErrorBox, Field, InfoBox, KeyboardForm, LegalLinks, Screen, TextLink, Title, TopBar } from "@/components/ui";
import { api, ApiError, type AuthResponse } from "@/lib/api";
import { colors } from "@/lib/config";
import { getDeviceIdentity } from "@/lib/device";
import { useSession } from "@/lib/session";

type Step = "phone" | "create-password" | "password";

const PASSWORD_MIN_LENGTH = 8;

// Türkiye cep numarası: 05XX…, 5XX…, +90 5XX… (boşluk/tire serbest). Asıl doğrulama ve biçimlendirme sunucuda.
const PHONE_PATTERN = /^(0090|90|0)?5\d{9}$/;

// 05XX XXX XX XX yazılırken boşlukları kendisi ekler; +90 / 90 ile başlayan numaralar olduğu gibi bırakılır.
function formatPhone(text: string): string {
  const digits = text.replace(/\D/g, "");
  if (!digits.startsWith("0") || digits.startsWith("00")) return digits.slice(0, 14);
  return digits.slice(0, 11).replace(/^(\d{1,4})(\d{1,3})?(\d{1,2})?(\d{1,2})?$/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(" "));
}

// Öğrenci girişi. Kayıt ol yoktur: telefon numarası okul veritabanında olmalıdır.
// İlk giriş: telefon → şifre oluştur (bu telefon hesaba bağlanır; başka telefondan giriş yapılamaz).
// Sonraki girişler: telefon → şifre. Şifre sıfırlama yalnızca yönetici panelinden yapılır.
export default function StudentLogin() {
  const { setStudentSession } = useSession();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = PHONE_PATTERN.test(phone.replace(/\D/g, ""));
  const passwordLongEnough = password.length >= PASSWORD_MIN_LENGTH;
  const passwordsMatch = password.length > 0 && password === password2;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const submitPhone = () =>
    run(async () => {
      // "Bu telefon başka hesaba bağlı" kararını yalnızca sunucu verir (check-phone → DEVICE_TAKEN).
      const { deviceId } = await getDeviceIdentity();
      const r = await api<{ next: "create-password" | "password" }>("/api/mobile/student/check-phone", { method: "POST", body: { phone: phone.trim(), deviceId } });
      setPassword("");
      setPassword2("");
      setStep(r.next);
    });

  const finish = async (r: AuthResponse) => {
    await setStudentSession(r.token, r.student);
    router.replace("/student-home");
  };

  const submitCreatePassword = () =>
    run(async () => {
      const { deviceId, deviceSecret } = await getDeviceIdentity();
      const r = await api<AuthResponse>("/api/mobile/student/set-password", {
        method: "POST",
        body: { phone: phone.trim(), password, deviceId, deviceSecret, platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown" },
      });
      await finish(r);
    });

  const submitPassword = () =>
    run(async () => {
      const { deviceId } = await getDeviceIdentity();
      const r = await api<AuthResponse>("/api/mobile/student/login", { method: "POST", body: { phone: phone.trim(), password, deviceId } });
      await finish(r);
    });

  const back = () => {
    setError(null);
    if (step === "phone") {
      if (router.canGoBack()) router.back();
      else router.replace("/welcome");
    } else {
      setStep("phone");
      setPassword("");
      setPassword2("");
    }
  };

  const button = { minHeight: 60, borderRadius: 16 };
  const footer =
    step === "phone" ? (
      <>
        <Button title="Devam" onPress={submitPhone} loading={loading} disabled={!phoneValid} style={button} />
        <TextLink title="Yönetici girişine geç" onPress={() => router.replace("/admin-login")} />
        <LegalLinks />
      </>
    ) : step === "create-password" ? (
      <Button title="Şifreyi kaydet ve giriş yap" onPress={submitCreatePassword} loading={loading} disabled={!passwordLongEnough || !passwordsMatch} style={button} />
    ) : (
      <Button title="Giriş yap" onPress={submitPassword} loading={loading} disabled={password.length === 0} style={button} />
    );

  return (
    <Screen>
      <TopBar step={step === "phone" ? "Adım 1 / 2" : "Adım 2 / 2"} onBack={back} />
      <KeyboardForm footer={footer}>
        {step === "phone" && (
          <>
            <Title>Telefon numaranızı girin</Title>
            <Field label="Cep telefonu" placeholder="05XX XXX XX XX" value={phone} onChangeText={(text) => setPhone(formatPhone(text))} autoFocus keyboardType="number-pad" autoComplete="tel" textContentType="telephoneNumber" />
            <ErrorBox message={error} />
          </>
        )}

        {step === "create-password" && (
          <>
            <Title>Şifre oluşturun</Title>
            <InfoBox message="Şifreyi kaydettiğinizde hesabınız bu telefona bağlanır. Başka telefondan girmek için okul yönetimine başvurmanız gerekir." />
            <Field label="Şifre (en az 8 karakter)" value={password} onChangeText={setPassword} autoFocus secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <Field label="Şifre (tekrar)" value={password2} onChangeText={setPassword2} secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submitCreatePassword} />
            <View style={{ gap: 8, marginBottom: 16 }}>
              <Rule ok={passwordLongEnough} label="En az 8 karakter" />
              <Rule ok={passwordsMatch} label="İki şifre aynı" />
            </View>
            <ErrorBox message={error} />
          </>
        )}

        {step === "password" && (
          <>
            <Title>Şifrenizi girin</Title>
            <Field label="Şifre" value={password} onChangeText={setPassword} autoFocus secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submitPassword} />
            <Text style={{ marginTop: -8, marginBottom: 16, fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>Şifrenizi unuttuysanız okul yönetiminden sıfırlama isteyin.</Text>
            <ErrorBox message={error} />
          </>
        )}
      </KeyboardForm>
    </Screen>
  );
}

// Şifre kuralı göstergesi (yalnızca görsel): sağlandığında yanında küçük bir tik çıkar, yuvarlak yoktur.
function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 16 }}>{ok ? <IconCheck size={16} color={colors.brand} /> : null}</View>
      <Text style={{ fontSize: 14, color: ok ? colors.brand : colors.inkSoft }}>{label}</Text>
    </View>
  );
}
