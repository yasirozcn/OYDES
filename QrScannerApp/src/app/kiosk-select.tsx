import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { IconDoor, IconLogout } from "@/components/icons";
import { Button, ErrorBox, Logo, OptionRow, Screen, Title } from "@/components/ui";
import { api, ApiError, type KioskInfo } from "@/lib/api";
import { colors } from "@/lib/config";
import { useSession } from "@/lib/session";

// Kiosk kurulumu: yönetici girişinden sonra tabletin hangi kapının QR ekranı olacağı seçilir (yalnızca aktif kiosklar listelenir).
// Geniş ekranda (tablet) solda başlık paneli, sağda kapı listesi; telefonda tek sütun.
const WIDE_MIN_WIDTH = 720;
const INTRO = "Seçtiğiniz kapı için QR ekranı açılır. Ekran kapanmaz.";

export default function KioskSelect() {
  const { adminToken, clearAdminSession } = useSession();
  const { width } = useWindowDimensions();
  const [kiosks, setKiosks] = useState<KioskInfo[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chosenId = selectedId ?? kiosks?.[0]?.id;
  const wide = width >= WIDE_MIN_WIDTH;

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ kiosks: KioskInfo[] }>("/api/mobile/kiosks", { token: adminToken });
        setKiosks(r.kiosks);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await clearAdminSession();
          router.replace("/admin-login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "Kiosklar yüklenemedi.");
      }
    })();
  }, [adminToken, clearAdminSession]);

  const logout = () =>
    Alert.alert("Çıkış yapılsın mı?", "Yönetici oturumu kapatılacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış yap",
        style: "destructive",
        onPress: async () => {
          await clearAdminSession();
          router.replace("/");
        },
      },
    ]);

  const logoutButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Çıkış yap"
      onPress={logout}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.lineSoft : colors.white, alignItems: "center", justifyContent: "center" })}
    >
      <IconLogout size={20} color={colors.inkSoft} />
    </Pressable>
  );

  const gates = (
    <>
      <ErrorBox message={error} />
      {!kiosks && !error && <ActivityIndicator color={colors.brand} />}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }}>
        {kiosks?.map((k) => (
          <OptionRow key={k.id} title={k.name} subtitle="Giriş ve çıkış" icon={IconDoor} selected={k.id === chosenId} onPress={() => setSelectedId(k.id)} />
        ))}
      </ScrollView>
      <Text style={{ marginVertical: 16, fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>Tablet şarja takılı ve Bluetooth açık kalmalı.</Text>
      <Button
        title="QR ekranını başlat"
        disabled={!chosenId}
        onPress={() => chosenId && router.push({ pathname: "/kiosk/[id]", params: { id: chosenId } })}
        style={{ minHeight: 60, borderRadius: 16 }}
      />
    </>
  );

  if (!wide)
    return (
      <Screen>
        <View style={{ flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <Logo />
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.ink }}>Kiosk kurulumu</Text>
            {logoutButton}
          </View>
          <Title sub={INTRO}>Bu tablet hangi kapıda duracak?</Title>
          {gates}
        </View>
      </Screen>
    );

  return (
    <Screen padded={false} style={{ backgroundColor: colors.white }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: Math.min(width * 0.42, 520), backgroundColor: colors.brand, padding: 40, gap: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Logo />
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.white }}>Kiosk kurulumu</Text>
          </View>
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: "800", letterSpacing: -0.6, color: colors.white }}>Bu tablet hangi kapıda duracak?</Text>
          <Text style={{ fontSize: 17, lineHeight: 24, color: colors.brandSoft }}>{INTRO}</Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 40, paddingVertical: 24 }}>
          <View style={{ alignItems: "flex-end", marginBottom: 24 }}>{logoutButton}</View>
          <View style={{ flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" }}>{gates}</View>
        </View>
      </View>
    </Screen>
  );
}
