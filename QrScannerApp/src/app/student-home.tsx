import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { IconClock, IconIn, IconLogout, IconOut, IconQr } from "@/components/icons";
import { ErrorBox, mono, Screen } from "@/components/ui";
import { api, ApiError, type MeResponse } from "@/lib/api";
import { colors } from "@/lib/config";
import { clearBinding } from "@/lib/device";
import { useSession } from "@/lib/session";

// Öğrenci ana ekranı: son hareketler ve "QR okut" düğmesi. Öğrencinin içeride mi dışarıda mı olduğu gösterilmez (sistem bunu kesin bilemez).
const fmt = (iso: string) => new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function StudentHome() {
  const { studentToken, clearStudentSession } = useSession();
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!studentToken) return;
    try {
      const r = await api<MeResponse>("/api/mobile/student/me", { token: studentToken });
      setData(r);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === "DEVICE_REVOKED") {
        await clearBinding();
        await clearStudentSession();
        Alert.alert("Cihaz bağlantısı kaldırıldı", "Okul yönetimi bu telefonun bağlantısını kaldırdı. Telefon numaranızla giriş yapıp yeni şifre oluşturabilirsiniz.");
        router.replace("/");
        return;
      }
      if (e instanceof ApiError && e.status === 401) {
        await clearStudentSession();
        router.replace("/student-login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "Bilgiler yüklenemedi.");
    }
  }, [studentToken, clearStudentSession]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logout = () =>
    Alert.alert("Çıkış yap", "Uygulamadan çıkış yapılsın mı? Tekrar girişte şifreniz sorulur.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış yap",
        style: "destructive",
        onPress: async () => {
          await clearStudentSession();
          router.replace("/");
        },
      },
    ]);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            tintColor={colors.brand}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {!data && !error && <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />}
        <ErrorBox message={error} />
        {data && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.inkSoft }}>Merhaba,</Text>
                <Text style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.3, color: colors.ink }}>
                  {data.student.firstName} {data.student.lastName}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Çıkış yap"
                onPress={logout}
                style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.lineSoft : colors.white, alignItems: "center", justifyContent: "center" })}
              >
                <IconLogout size={20} color={colors.inkSoft} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink, marginBottom: 8 }}>Son hareketler</Text>
            <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 22 }}>
              {data.events.length === 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 16 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.warnSoft, alignItems: "center", justifyContent: "center" }}>
                    <IconClock size={24} color={colors.warn} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>Henüz hareket yok</Text>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>Giriş ve çıkışlarınız burada görünecek.</Text>
                  </View>
                </View>
              )}
              {data.events.map((e, i) => {
                const isIn = e.direction === "IN";
                return (
                  <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: i === data.events.length - 1 ? 0 : 1, borderBottomColor: colors.lineSoft }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                      {isIn ? <IconIn size={20} color={colors.brand} /> : <IconOut size={20} color={colors.brand} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{isIn ? "Giriş" : "Çıkış"}</Text>
                      <Text style={{ fontSize: 13, color: colors.inkSoft }}>{e.kioskName ?? "Manuel kayıt"}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "600", fontFamily: mono, color: colors.ink }}>{fmt(e.occurredAt)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
      {data && (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/scan")}
            style={({ pressed }) => ({ height: 60, borderRadius: 16, backgroundColor: pressed ? colors.brandDark : colors.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 })}
          >
            <IconQr size={24} color={colors.white} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.white }}>QR okut</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
