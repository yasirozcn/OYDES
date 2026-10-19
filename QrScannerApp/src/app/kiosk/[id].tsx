import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, Pressable, Text, useWindowDimensions, View, type LayoutRectangle } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { KioskBeacon } from "@modules/kiosk-beacon";
import { IconBluetoothOff, IconCheck } from "@/components/icons";
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
// QR'ın altındaki süre çubuğu + "Kod N sn…" satırı ve QR çerçevesinin iç boşluğu/kenarlığı.
const QR_FOOTER_HEIGHT = 56;
const QR_FRAME = 48;

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
  const [last, setLast] = useState<KioskFeed["events"][number] | null>(null);
  const [offset, setOffset] = useState(0); // sunucu saati - cihaz saati
  const [ble, setBle] = useState<BleState>("off");
  const [qrArea, setQrArea] = useState<LayoutRectangle | null>(null);
  const advertisePermission = useRef<boolean | null>(null);
  const sinceRef = useRef<string | null>(null);
  const shownIds = useRef(new Set<string>());

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
  const remaining = slotSeconds - ((serverNow / 1000) % slotSeconds);

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
          setLast(fresh[0]);
        }
      } catch {
        setOnline(false);
      }
    };
    const t = setInterval(poll, 3000);
    void poll();
    return () => clearInterval(t);
  }, [start, adminToken]);

  // Son okutan öğrenci 4 sn ekranda kalır
  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setLast(null), 4000);
    return () => clearTimeout(t);
  }, [last]);

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
  const qrSize = Math.max(Math.min(qrFit, tablet ? 720 : 480), 140);
  const initials = (last?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
  // Görevlinin ekranda kodun değiştiğini gözle görebilmesi için dilimden türetilen kısa etiket (imza değildir).
  const shortCode = `#${(slot % 0x10000).toString(16).toUpperCase().padStart(4, "0")}`;
  const bleText: Record<BleState, string> = {
    off: Platform.OS === "android" ? "Bluetooth kapalı veya yayın kullanılamıyor" : "BLE yayını yok",
    starting: "BLE başlatılıyor",
    on: "BLE yayını açık",
    unsupported: "BLE yayını yok (iOS kiosk)",
    error: `BLE hatası${KioskBeacon.lastError() ? `: ${KioskBeacon.lastError()}` : ""}`,
  };
  const bleOk = ble === "on" || ble === "starting";
  const bleAlert = !bleOk && Platform.OS === "android";
  const avatarSize = tablet ? 120 : 84;
  const titleSize = tablet ? (landscape ? 64 : 52) : 34;
  const steps = ["Okul uygulamasını açın", "\"QR okut\"a basıp bu kodu okutun", "Adınızı ekranda görünce geçin"];

  return (
    <Screen padded={false} style={{ backgroundColor: colors.white }}>
      <View style={{ flex: 1, flexDirection: landscape ? "row" : "column" }}>
        {/* Yeşil bilgi paneli */}
        <View style={{ width: landscape ? Math.min(width * 0.375, 520) : "100%", backgroundColor: colors.brand, paddingHorizontal: tablet ? 40 : 24, paddingVertical: tablet ? 36 : 18, gap: tablet ? 24 : 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: tablet ? 15 : 13, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: "#CFE4D6" }}>{last ? `Giriş · Çıkış · ${start.kiosk.name}` : "İzmir Fen"}</Text>
            <Text style={{ fontSize: tablet ? 20 : 17, fontWeight: "600", fontFamily: mono, color: colors.white }}>
              {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(serverNow))}
            </Text>
          </View>

          {last ? (
            <View style={{ backgroundColor: colors.white, borderRadius: 26, padding: tablet ? 24 : 16, alignItems: "center", gap: tablet ? 14 : 8 }}>
              <View>
                <View style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: last.direction === "IN" ? colors.brandSoft : colors.exitSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: avatarSize * 0.37, fontWeight: "700", color: last.direction === "IN" ? colors.brand : colors.exit }}>{initials}</Text>
                </View>
                <View style={{ position: "absolute", right: -2, bottom: 4, width: 42, height: 42, borderRadius: 21, borderWidth: 4, borderColor: colors.white, backgroundColor: last.direction === "IN" ? colors.brand : colors.exit, alignItems: "center", justifyContent: "center" }}>
                  <IconCheck size={20} color={colors.white} />
                </View>
              </View>
              <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: last.direction === "IN" ? colors.brandSoft : colors.exitSoft }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: last.direction === "IN" ? colors.brandDark : colors.exitInk }}>{last.direction === "IN" ? "Giriş" : "Çıkış"} ✓</Text>
              </View>
              <Text numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: tablet ? 34 : 26, lineHeight: tablet ? 38 : 30, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
                {last.name}
              </Text>
              <Text style={{ fontSize: tablet ? 19 : 16, color: colors.inkSoft }}>
                {last.className} · <Text style={{ fontFamily: mono, fontWeight: "600", color: colors.ink }}>{last.time}</Text>
              </Text>
            </View>
          ) : (
            <>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: titleSize, lineHeight: titleSize * 0.98, fontWeight: "800", letterSpacing: -1.5, color: colors.white }}>{landscape && tablet ? "GİRİŞ\nÇIKIŞ" : "GİRİŞ · ÇIKIŞ"}</Text>
                <Text numberOfLines={1} style={{ fontSize: tablet ? 19 : 16, color: "#CFE4D6" }}>
                  {start.kiosk.name}
                </Text>
              </View>
              {tablet && <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />}
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
            </>
          )}

          {landscape && <View style={{ flex: 1 }} />}
          <Text style={{ fontSize: tablet ? 15 : 13, lineHeight: tablet ? 22 : 18, color: "#CFE4D6" }}>
            {last ? "Ad 4 saniye ekranda kalır. QR açık; sıradaki öğrenci beklemeden okutabilir." : "Okul uygulamasını açıp bu kodu okutun. Giriş mi çıkış mı olduğunu sistem bilir. Telefonu olmayan öğrenciler kapı görevlisine başvursun."}
          </Text>
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
              <View style={{ width: `${(remaining / slotSeconds) * 100}%`, height: 8, borderRadius: 4, backgroundColor: colors.brand }} />
            </View>
            <View style={{ width: qrSize + 44, flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: tablet ? 16 : 14, color: colors.inkSoft }}>Kod {Math.ceil(remaining)} sn içinde yenilenecek</Text>
              <Text style={{ fontSize: tablet ? 16 : 14, fontFamily: mono, color: colors.muted }}>{shortCode}</Text>
            </View>
          </View>
          {/* Durum satırı: dar ekranda sığmayan parça alt satıra geçer (üst üste binmez). */}
          <View style={{ minHeight: 56, paddingVertical: 10, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.lineSoft, columnGap: 16, rowGap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: online ? colors.brand : colors.danger }} />
              <Text style={{ fontSize: 14, fontWeight: online ? "400" : "700", color: online ? colors.inkSoft : colors.danger }}>{online ? "Sunucu bağlantısı var" : "Sunucuya ulaşılamıyor"}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bleOk ? colors.brand : colors.muted }} />
              <Text style={{ fontSize: 14, color: colors.inkSoft }}>{bleText[ble]}</Text>
            </View>
            <Pressable onLongPress={exitKiosk} delayLongPress={1500} hitSlop={16}>
              <Text style={{ fontSize: 13, color: colors.muted }}>Çıkmak için basılı tutun</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
