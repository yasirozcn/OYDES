import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { IconBack, IconEye, IconEyeOff } from "./icons";
import { API_URL, colors } from "@/lib/config";

// Ortak arayüz parçaları: tüm ekranlar bu bileşenlerle kurulur (renkler config.ts'teki paletten).

// Saat, kod gibi sabit genişlikli metinler için.
export const mono = Platform.select({ ios: "Menlo", default: "monospace" });

export function Screen({ children, style, padded = true }: { children?: React.ReactNode; style?: ViewStyle; padded?: boolean }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={["top", "bottom", "left", "right"]}>
      <View style={[{ flex: 1 }, padded && { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 }]}>{children}</View>
    </SafeAreaView>
  );
}

// İzmir Fen Lisesi amblemi (karşılama ekranında uygulama logosunun karşısında, aynı boyutta).
export function SchoolCrest({ size = 56 }: { size?: number }) {
  return <Image source={require("../../assets/ifl-logo.png")} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="İzmir Fen Lisesi amblemi" />;
}

// Okul logosu: beyaz, köşeleri yuvarlatılmış kutuda (yeşil zeminde de okunur).
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lineSoft, alignItems: "center", justifyContent: "center" }}>
      <Image source={require("../../assets/logo.png")} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" accessibilityLabel="İzmir Fen logosu" />
    </View>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, { box: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: colors.brand }, text: colors.white },
  secondary: { box: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.lineStrong }, text: colors.ink },
  danger: { box: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.dangerLine }, text: colors.danger },
  ghost: { box: { backgroundColor: "transparent" }, text: colors.inkSoft },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = buttonVariants[variant];
  const inactive = disabled && !loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        v.box,
        loading && { opacity: 0.45 },
        inactive && styles.btnInactive,
        pressed && !inactive && (variant === "primary" ? { backgroundColor: colors.brandDark } : { opacity: 0.75 }),
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.text} /> : <Text style={[styles.btnText, { color: inactive ? colors.muted : v.text }]}>{title}</Text>}
    </Pressable>
  );
}

// Şifre alanlarında (secureTextEntry) göz düğmesi şifreyi gösterir/gizler.
export function Field({ label, error, secureTextEntry, ...props }: TextInputProps & { label: string; error?: string | null }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          secureTextEntry={secureTextEntry && hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, focused && styles.inputFocus, error ? { borderColor: colors.danger } : null, secureTextEntry && { paddingRight: 52 }, props.style]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Şifreyi göster" : "Şifreyi gizle"}
            hitSlop={8}
            style={styles.eyeButton}
          >
            {hidden ? <IconEye size={22} color={colors.muted} /> : <IconEyeOff size={22} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <View style={[styles.boxDot, { backgroundColor: colors.danger }]}>
        <Text style={styles.boxDotText}>!</Text>
      </View>
      <Text style={{ flex: 1, color: colors.dangerInk, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>{message}</Text>
    </View>
  );
}

export function InfoBox({ message }: { message: string }) {
  return (
    <View style={styles.infoBox}>
      <View style={[styles.boxDot, { backgroundColor: colors.brand }]}>
        <Text style={styles.boxDotText}>i</Text>
      </View>
      <Text style={{ flex: 1, color: colors.brandDark, fontSize: 14, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

export function TopBar({ title, step, onBack }: { title?: string; step?: string; onBack?: () => void }) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: colors.lineSoft }]}
        >
          <IconBack size={26} />
        </Pressable>
      ) : (
        <View style={{ width: 48 }} />
      )}
      {title ? <Text style={styles.topBarTitle}>{title}</Text> : <View />}
      <View style={{ minWidth: 48, alignItems: "flex-end" }}>{step ? <Text style={styles.topBarStep}>{step}</Text> : null}</View>
    </View>
  );
}

// Klavyenin ekranda kapladığı yükseklik (kapalıyken 0). Ekran açıldığında klavye zaten açıksa o anki yükseklikle başlar.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(() => (Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0));
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

// Giriş formları: alanlar kayar, ana düğme (footer) altta sabit; klavye açılınca düğme klavyenin hemen üstüne çıkar, alanlar onun üstünde kalır.
// KeyboardAvoidingView kendi konumunu ölçer ve ekran açılış animasyonunda yanlış ölçebildiği için klavye yüksekliği doğrudan kullanılır.
// iOS'ta yükseklik alttaki güvenli alanı (ana ekran çizgisi) da içerir; Android'de React Native gezinme çubuğunu zaten düşer.
export function KeyboardForm({ children, footer, style, contentStyle }: { children: React.ReactNode; footer: React.ReactNode; style?: ViewStyle; contentStyle?: ViewStyle }) {
  const keyboard = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const lift = Math.max(0, Platform.OS === "ios" ? keyboard - insets.bottom : keyboard);
  return (
    <View style={[{ flex: 1, paddingBottom: lift }, style]}>
      <ScrollView keyboardShouldPersistTaps="always" style={{ flex: 1 }} contentContainerStyle={[{ flexGrow: 1, paddingBottom: 16 }, contentStyle]}>
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

// Ana düğmenin altındaki küçük, koyu gri, altı çizili bağlantı (ikincil seçenekler için).
export function TextLink({ title, onPress, style }: { title: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={[{ alignSelf: "center", paddingVertical: 12 }, style]}>
      <Text style={styles.textLink}>{title}</Text>
    </Pressable>
  );
}

// Mağaza kuralı: gizlilik politikası uygulamanın içinden de açılabilmeli (sayfalar AdminPanel'de, herkese açık).
export function LegalLinks({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.legalLinks, style]}>
      <Text accessibilityRole="link" style={styles.legalLink} onPress={() => void Linking.openURL(`${API_URL}/gizlilik`)}>
        Gizlilik Politikası
      </Text>
      <Text style={{ color: colors.muted }}>·</Text>
      <Text accessibilityRole="link" style={styles.legalLink} onPress={() => void Linking.openURL(`${API_URL}/destek`)}>
        Destek
      </Text>
    </View>
  );
}

type OptionIcon = React.ComponentType<{ size?: number; color?: string }>;

// Seçim yuvarlağı: seçiliyken ana renkle dolu, içinde beyaz nokta.
function Radio({ selected, style }: { selected: boolean; style?: ViewStyle }) {
  return <View style={[styles.radio, selected && styles.radioSelected, style]}>{selected ? <View style={styles.radioDot} /> : null}</View>;
}

// Seçilebilir kart (iki eşit seçenek, yan yana): seçili kartın çerçevesi ana renk olur.
export function OptionCard({ title, subtitle, icon: Icon, selected, onPress }: { title: string; subtitle: string; icon: OptionIcon; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, selected && styles.optionCardSelected, pressed && { opacity: 0.85 }]}
    >
      <Radio selected={selected} style={{ position: "absolute", top: 16, right: 16 }} />
      <View style={[styles.optionIcon, selected && { backgroundColor: colors.brandSoft }]}>
        <Icon size={28} color={selected ? colors.brand : colors.inkSoft} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

// Seçilebilir satır (liste halinde seçenekler): solda ikon, ortada başlık, sağda seçim yuvarlağı.
export function OptionRow({ title, subtitle, icon: Icon, selected, onPress }: { title: string; subtitle?: string; icon: OptionIcon; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, selected && styles.optionCardSelected, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.optionIcon, selected && { backgroundColor: colors.brandSoft }]}>
        <Icon size={28} color={selected ? colors.brand : colors.inkSoft} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
      </View>
      <Radio selected={selected} />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.4, color: colors.ink },
  sub: { marginTop: 8, fontSize: 16, color: colors.inkSoft, lineHeight: 23 },
  btn: { minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  btnText: { fontSize: 17, fontWeight: "700" },
  btnInactive: { backgroundColor: colors.line, borderColor: colors.line },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  input: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.ink,
  },
  inputFocus: { borderWidth: 2, borderColor: colors.brand },
  eyeButton: { position: "absolute", right: 6, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" },
  fieldError: { marginTop: 6, fontSize: 13, fontWeight: "600", color: colors.danger },
  errorBox: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  infoBox: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.brandSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  boxDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: -1 },
  boxDotText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, marginBottom: 20 },
  backBtn: { width: 48, height: 48, marginLeft: -12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 15, fontWeight: "700", color: colors.inkSoft },
  topBarStep: { fontSize: 15, fontWeight: "700", color: colors.inkSoft },
  optionCard: { flex: 1, minHeight: 200, gap: 16, padding: 16, borderRadius: 20, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 20, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  optionCardSelected: { borderColor: colors.brand },
  optionIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 20, fontWeight: "800", color: colors.ink },
  optionSub: { fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.brand, backgroundColor: colors.brand },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  legalLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, paddingVertical: 12 },
  textLink: { fontSize: 15, fontWeight: "600", color: colors.inkSoft, textDecorationLine: "underline" },
  legalLink: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, textDecorationLine: "underline" },
});
