import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, PermissionsAndroid, Platform, Pressable, Text, useWindowDimensions, View, type LayoutRectangle } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { KioskBeacon } from "@modules/kiosk-beacon";
import { BluetoothGate } from "@/components/BluetoothGate";
import { IconBack, IconBluetoothOff, IconIn, IconOut } from "@/components/icons";
import { Button, ErrorBox, mono, Screen } from "@/components/ui";
import { api, ApiError, type KioskFeed, type KioskStart } from "@/lib/api";
import { bleLog } from "@/lib/ble";
import { colors } from "@/lib/config";
import { bleToken, buildQrPayload, slotAt } from "@/lib/protocol";
import { useSession } from "@/lib/session";

// Kiosk ekranı: her dilimde (5 sn) yeni QR üretir ve aynı dilimin BLE jetonunu yayınlar.
// QR ve jeton bu cihazda, sunucuyla paylaşılan gizli anahtardan hesaplanır; ekran internet kesilse bile kod üretmeye devam eder.

type BleState = "off" | "starting" | "on" | "unsupported" | "error";

// Kısa kenarı bundan küçük ekranlar telefon sayılır; tablette yazılar ve QR büyür.
const TABLET_MIN_SIDE = 600;
// QR'ın altındaki süre çubuğu (8 + üstündeki 18 boşluk) ve QR çerçevesinin iç boşluğu/kenarlığı.
const QR_FOOTER_HEIGHT = 26;
const QR_FRAME = 48;
// QR, kendisine kalan alanın tamamını doldurmak yerine bu oranda küçülür (çok büyük görünüyordu).
const QR_AREA_FILL = 0.8;
// Son okutan öğrenci kartı: sağdan girer, ekranda kalır, sola çıkar (girerken/çıkarken hafif büyür/küçülür ve solar).
const CARD_ANIMATION_MS = 300;
const CARD_VISIBLE_MS = 4000;
const CARD_SLIDE_PX = 80;
const CARD_HIDDEN_SCALE = 0.94;
// Giriş/çıkış okunun görsel ağırlığı kutunun bir yanına kaydığı için simge (boyutunun bu oranı kadar) ters yöne kaydırılır.
const CARD_ICON_NUDGE = 0.095;

// Android 12+ (API 31) yayın için "Yakındaki cihazlar" izni ister; daha eskilerde izin gerekmez.
async function ensureAdvertisePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (Number(Platform.Version) < 31) return true;
  const result = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);
  return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

export default function KioskScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { adminToken, clearAdminSession } = useSession();
  const { width, height } = useWindowDimensions();
  const [start, setStart] = useState<KioskStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<KioskFeed["events"]>([]); // ilki ekrandaki kart, gerisi sırasını bekler // ilki ekrandaki kart, gerisi sırasını bekler
  const shown = queue[0] ?? null;
  const [offset, setOffset] = useState(0); // sunucu saati - cihaz saati
  const [ble, setBle] = useState<BleState>("off");
  const [qrArea, setQrArea] = useState<LayoutRectangle | null>(null);
  const advertisePermission = useRef<boolean | null>(null);
  const sinceRef = useRef<string | null>(null);
  const shownIds = useRef(new Set<string>());
  const [cardAnim] = useState(() => new Animated.Value(0)); // 0 → 1 girer, 1 → 2 çıkar
  const [barAnim] = useState(() => new Animated.Value(1)); // QR'ın altındaki çubuğun doluluğu: 1 → 0

  // 1) Kiosk oturumunu başlat
  useEffect(() => {
    (async () => {
      try {
        const r = await api<KioskStart>(`/api/mobile/kiosks/${id}/start`, { method: "POST", token: adminToken });
        setOffset(r.serverTime - Date.now());
        sinceRef.current = new Date(r.serverTime).toISOString();
        setStart(r);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await clearAdminSession();
          router.replace("/admin-login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "Kiosk başlatılamadı.");
      }
    })();
  }, [id, adminToken, clearAdminSession]);

  // 2) Saat (dilim değişimini yakalamak için)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const serverNow = now + offset;
  const slotSeconds = start?.slotSeconds ?? 5;
  const slot = slotAt(serverNow, slotSeconds);

  // Çubuk 250 ms'lik saat adımlarıyla değil, dilimin kalan süresi boyunca doğrusal ve akıcı azalır.
  useEffect(() => {
    const slotMs = slotSeconds * 1000;
    const msLeft = slotMs - ((Date.now() + offset) % slotMs);
    barAnim.setValue(msLeft / slotMs);
    const run = Animated.timing(barAnim, { toValue: 0, duration: msLeft, easing: Easing.linear, useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [slot, offset, slotSeconds, barAnim]);

  const payload = useMemo(() => {
    if (!start) return null;
    return buildQrPayload(start.secret, start.kiosk.id, slot);
  }, [start, slot]);

  // 3) BLE yayını: her dilimde o dilimin jetonu yayınlanır
  useEffect(() => {
    if (!start) return;
    let cancelled = false;
    (async () => {
      try {
        if (!KioskBeacon.isSupported()) {
          const android = Platform.OS === "android";
          bleLog(`Kiosk yayını yapılamıyor: ${KioskBeacon.lastError() ?? (android ? "Bluetooth kapalı veya BLE yayını desteklenmiyor" : "iOS BLE service data yayınlayamaz")}`);
          if (!cancelled) setBle(android ? "off" : "unsupported");
          return;
        }
        if (advertisePermission.current === null) advertisePermission.current = await ensureAdvertisePermission();
        if (!advertisePermission.current) {
          bleLog("Kiosk yayını: Yakındaki cihazlar (BLUETOOTH_ADVERTISE) izni verilmedi");
          if (!cancelled) setBle("error");
          return;
        }
        setBle((b) => (b === "on" ? b : "starting"));
        const token = bleToken(start.secret, start.kiosk.id, slot);
        await KioskBeacon.start(start.bleServiceUuid, token);
        const err = KioskBeacon.lastError();
        bleLog(err ? `Kiosk yayın HATASI: ${err} (dilim ${slot})` : `Kiosk yayında: jeton ${token} (dilim ${slot})`);
        if (!cancelled) setBle(err ? "error" : "on");
      } catch (e) {
        bleLog(`Kiosk yayını başlatılamadı: ${e instanceof Error ? e.message : String(e)}`);
        if (!cancelled) setBle("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [start, slot]);

  useEffect(() => () => void KioskBeacon.stop(), []);

  // 4) Son okutanları göster (3 sn'de bir)
  useEffect(() => {
    if (!start) return;
    const poll = async () => {
      try {
        const r = await api<KioskFeed>(`/api/mobile/kiosks/${start.kiosk.id}/feed?since=${encodeURIComponent(sinceRef.current ?? "")}`, { token: adminToken, timeoutMs: 5000 });
        setOffset(r.serverTime - Date.now());
        setOnline(true);
        const fresh = r.events.filter((e) => !shownIds.current.has(e.id));
        if (fresh.length) {
          fresh.forEach((e) => shownIds.current.add(e.id));
          setQueue((q) => [...q, ...[...fresh].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))]);
        }
      } catch {
        setOnline(false);
      }
    };
    const t = setInterval(poll, 3000);
    void poll();
    return () => clearInterval(t);
  }, [start, adminToken]);

  // Aynı anda tek kart görünür (sıranın başındaki); her biri kendi süresini tamamlayınca sıradakine geçilir.
  useEffect(() => {
    if (!shown) return;
    cardAnim.setValue(0);
    const run = Animated.sequence([
      Animated.timing(cardAnim, { toValue: 1, duration: CARD_ANIMATION_MS, useNativeDriver: true }),
      Animated.delay(CARD_VISIBLE_MS),
      Animated.timing(cardAnim, { toValue: 2, duration: CARD_ANIMATION_MS, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) setQueue((q) => q.slice(1));
    });
    return () => run.stop();
  }, [shown, cardAnim]);

  const exitKiosk = () =>
    Alert.alert("Kiosk modundan çık", "QR ekranı kapatılsın mı?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çık", style: "destructive", onPress: () => router.back() },
    ]);

  if (error)
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", width: "100%", maxWidth: 520, alignSelf: "center" }}>
          <ErrorBox message={error} />
          <Button title="Geri" onPress={() => router.back()} />
        </View>
      </Screen>
    );

  if (!start || !payload)
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </Screen>
    );

  const landscape = width > height;
  const tablet = Math.min(width, height) >= TABLET_MIN_SIDE;
  // QR, kendisine kalan alanın tamamına sığacak kadar büyük olur (telefonda alttaki satırlarla çakışmaz, tablette ekranı doldurur).
  const qrFit = qrArea ? Math.min(qrArea.width - QR_FRAME, qrArea.height - QR_FRAME - QR_FOOTER_HEIGHT) : 0;
  const qrSize = Math.max(Math.min(qrFit * QR_AREA_FILL, tablet ? 720 : 480), 140);
  const bleText: Record<BleState, string> = {
    off: Platform.OS === "android" ? "Bluetooth kapalı veya yayın kullanılamıyor" : "Bluetooth yayını yok",
    starting: "Bluetooth başlatılıyor",
    on: "Bluetooth yayınlanıyor",
    unsupported: "Bluetooth yayını yok (iOS kiosk)",
    error: `Bluetooth hatası${KioskBeacon.lastError() ? `: ${KioskBeacon.lastError()}` : ""}`,
  };
  const bleOk = ble === "on" || ble === "starting";
  const bleAlert = !bleOk && Platform.OS === "android";
  const cardStyle = {
    opacity: cardAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
    transform: [
      { translateX: cardAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [CARD_SLIDE_PX, 0, -CARD_SLIDE_PX] }) },
      { scale: cardAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [CARD_HIDDEN_SCALE, 1, CARD_HIDDEN_SCALE] }) },
    ],
  };
  const steps = ["Okul uygulamasını açın", "\"QR okut\"a basıp bu kodu okutun", "Adınızı ekranda görünce geçin"];

  return (
    <Screen padded={false} style={{ backgroundColor: colors.white }}>
      <View style={{ flex: 1, flexDirection: landscape ? "row" : "column" }}>
        {/* Yeşil bilgi paneli */}
        <View style={{ width: landscape ? Math.min(width * 0.375, 520) : "100%", backgroundColor: colors.brand, paddingHorizontal: tablet ? 40 : 24, paddingVertical: tablet ? 36 : 18, gap: tablet ? 24 : 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kiosk modundan çık"
              onPress={exitKiosk}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" })}
            >
              <IconBack size={24} color={colors.white} />
            </Pressable>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: tablet ? 15 : 13, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#CFE4D6" }}>{start.kiosk.name}</Text>
            <Text style={{ fontSize: tablet ? 20 : 17, fontWeight: "600", fontFamily: mono, color: colors.white }}>
              {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(serverNow))}
            </Text>
          </View>

          {/* Öğrenci kartı: yatayda panelin ortasındaki boşlukta, dikeyde adımların üstünde yer alır. */}
          <View style={{ flex: landscape ? 1 : undefined, justifyContent: "center" }}>
            {shown && (
              <Animated.View style={[{ backgroundColor: colors.white, borderRadius: 26, flexDirection: "row", alignItems: "stretch", overflow: "hidden" }, cardStyle]}>
                <View
                  accessibilityLabel={shown.direction === "IN" ? "Giriş" : "Çıkış"}
                  style={{ width: tablet ? 112 : 80, backgroundColor: shown.direction === "IN" ? colors.success : colors.danger, alignItems: "center", justifyContent: "center" }}
                >
                  <View style={{ transform: [{ translateX: (shown.direction === "IN" ? -1 : 1) * (tablet ? 48 : 36) * CARD_ICON_NUDGE }] }}>
                    {shown.direction === "IN" ? <IconIn size={tablet ? 48 : 36} color={colors.white} /> : <IconOut size={tablet ? 48 : 36} color={colors.white} />}
                  </View>
                </View>
                <View style={{ flex: 1, gap: 4, padding: tablet ? 24 : 16, justifyContent: "center" }}>
                  <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: tablet ? 30 : 24, lineHeight: tablet ? 34 : 28, fontWeight: "800", color: colors.ink }}>
                    {shown.name}
                  </Text>
                  {shown.className.trim() ? <Text style={{ fontSize: tablet ? 19 : 16, fontWeight: "400", color: colors.inkSoft }}>{shown.className.trim()}</Text> : null}
                </View>
              </Animated.View>
            )}
          </View>

          {/* Adımlar (yalnızca tablette) ve bağlantı durumu panelin altındadır. */}
          {tablet && (
            <View style={{ gap: 18 }}>
              {steps.map((t, i) => (
                <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", fontFamily: mono, color: colors.brand }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 20, fontWeight: "600", lineHeight: 26, color: colors.white }}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? colors.brandSoft : colors.dangerLine }} />
              <Text style={{ fontSize: 14, fontWeight: online ? "400" : "700", color: "#CFE4D6" }}>{online ? "Sunucu bağlantısı var" : "Sunucuya ulaşılamıyor"}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bleOk ? colors.brandSoft : colors.dangerLine }} />
              <Text style={{ fontSize: 14, fontWeight: "400", color: "#CFE4D6" }}>{bleText[ble]}</Text>
            </View>
          </View>
        </View>

        {/* QR alanı */}
        <View style={{ flex: 1, paddingHorizontal: tablet ? 32 : 16, paddingTop: tablet ? 24 : 12 }}>
          {bleAlert && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, backgroundColor: colors.dangerSoft }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" }}>
                <IconBluetoothOff size={24} color={colors.white} />
              </View>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: "#5E120C" }}>{bleText[ble]}</Text>
            </View>
          )}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }} onLayout={(e) => setQrArea(e.nativeEvent.layout)}>
            <View style={{ padding: 22, backgroundColor: colors.white, borderRadius: 28, borderWidth: 2, borderColor: colors.lineSoft }}>
              <QRCode value={payload} size={qrSize} ecl="M" quietZone={8} />
            </View>
            <View style={{ width: qrSize + 44, height: 8, backgroundColor: colors.lineSoft, borderRadius: 4, marginTop: 18, overflow: "hidden" }}>
              <Animated.View style={{ width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), height: 8, borderRadius: 4, backgroundColor: colors.brand }} />
            </View>
          </View>
        </View>
      </View>
      <BluetoothGate />
    </Screen>
  );
}
