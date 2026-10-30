import { useEffect, useState } from "react";
import { Alert, BackHandler, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ErrorBox, styles, useKeyboardHeight } from "./ui";
import { api, ApiError } from "@/lib/api";
import { colors } from "@/lib/config";

const MAX_LENGTH = 1000;
const fill = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

// Geri bildirim penceresi: ekranın üstünde, alttan açılan kart. Modal yerine ekran içi katman kullanılır:
// klavye yüksekliği giriş formlarındakiyle aynı şekilde (useKeyboardHeight) hesaplanır, kart klavyenin hemen üstünde durur.
export function FeedbackSheet({ token, onClose }: { token: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyboard = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  // iOS'ta klavye yüksekliği alt güvenli alanı içerir; Android'de gezinme çubuğu ayrıca eklenir.
  const bottom = Platform.OS === "ios" ? Math.max(keyboard, insets.bottom) : keyboard + insets.bottom;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api("/api/mobile/feedback", { method: "POST", token, body: { message: message.trim() } });
      onClose();
      Alert.alert("Teşekkürler", "Geri bildiriminiz okul yönetimine iletildi.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Geri bildirim gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[fill, { justifyContent: "flex-end" }]}>
      <Pressable accessibilityLabel="Kapat" onPress={onClose} style={[fill, { backgroundColor: "rgba(20,33,26,0.45)" }]} />
      <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: bottom + 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink }}>Geri bildirim</Text>
        <Text style={{ marginTop: 6, marginBottom: 16, fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>Uygulamayla ilgili sorun veya önerinizi yazın. Okul yönetimi inceleyecek.</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Mesajınız"
          placeholderTextColor={colors.muted}
          multiline
          autoFocus
          maxLength={MAX_LENGTH}
          textAlignVertical="top"
          style={[styles.input, { minHeight: 120, maxHeight: 200, marginBottom: 16 }]}
        />
        <ErrorBox message={error} />
        <Button title="Gönder" onPress={send} loading={sending} disabled={!message.trim()} />
        <Button title="Vazgeç" variant="ghost" onPress={onClose} style={{ minHeight: 48, marginTop: 4 }} />
      </View>
    </View>
  );
}
