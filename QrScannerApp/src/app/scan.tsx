import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, Text, View } from "react-native";
import { BluetoothGate } from "@/components/BluetoothGate";
import { IconAlert, IconBack, IconBluetooth, IconCheck, IconIn, IconInfo, IconOut, IconX } from "@/components/icons";
import { Button, ErrorBox, mono, OptionRow, Screen, styles, Title, TopBar } from "@/components/ui";
import { api, ApiError, type MeResponse, type ScanResponse } from "@/lib/api";
import { bleLog, startBleScan, type BleStatus, type Found } from "@/lib/ble";
import { colors } from "@/lib/config";
import { getDeviceIdentity } from "@/lib/device";
import { isOurQr, requestSignature } from "@/lib/protocol";
import { useSession } from "@/lib/session";

// Öğrencinin QR okutma ekranı: kapıdaki ilk okutmada yön seçimi → kamera (+ kiosk BLE jetonunu dinleme) → sonuç.
// Yönü, cihaz bağlılığını ve QR geçerliliğini sunucu belirler; ekran yalnızca gönderir ve sonucu gösterir.

type Phase = "scan" | "sending" | "done" | "error";
type Direction = "IN" | "OUT";

// Jeton bu kadar yeniyse kioskun yanında duyulmuş sayılır (dilim 5 sn + tarama gecikmesi).
const BLE_FRESH_MS = 8000;

// Bluetooth kapalı veya izin yoksa durum satırı yerine BluetoothGate uyarısı görünür.
const BLE_TEXT: Partial<Record<BleStatus, string>> = {
  unavailable: "Bluetooth doğrulaması bu sürümde kapalı",
  scanning: "Kapı sinyali aranıyor · Kapıya yaklaşın",
  found: "Kapı sinyali alındı",
};

const BLE_DOT: Partial<Record<BleStatus, string>> = {
  unavailable: colors.muted,
  scanning: colors.accent,
  found: colors.brandSoft,
};

export default function Scan() {
  const { studentToken, config, refreshConfig } = useSession();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("scan");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [bleStatus, setBleStatus] = useState<BleStatus>("scanning");
  const [needsDirection, setNeedsDirection] = useState<boolean | null>(null);
  const [chosenDirection, setChosenDirection] = useState<Direction | null>(null);
  const [pickedDirection, setPickedDirection] = useState<Direction>("IN");
  const ble = useRef<Found | null>(null);
  const busy = useRef(false);
  const askedForCamera = useRef(false);

  // Kamera izni ayrı bir ekranda değil, bu ekran açılınca doğrudan sistem penceresiyle istenir (yalnızca bir kez).
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || askedForCamera.current) return;
    askedForCamera.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  // Ayarlar'dan izin verilip uygulamaya dönülünce kamera durumu yenilenir.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status) => {
      if (status === "active") void getPermission();
    });
    return () => sub.remove();
  }, [getPermission]);

  // Ekran açıkken kioskun BLE jetonu dinlenir; son jeton ref'te tutulur.
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    (async () => {
      const cfg = config ?? (await refreshConfig());
      if (!cfg || cancelled) return;
      const s = await startBleScan(cfg.bleServiceUuid, (status, latest) => {
        setBleStatus(status);
        if (latest) ble.current = latest;
      });
      if (cancelled) s();
      else stop = s;
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [config, refreshConfig]);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<MeResponse>("/api/mobile/student/me", { token: studentToken });
        setNeedsDirection(me.needsDirection);
      } catch {
        // Bilgi alınamazsa kamera yine açılır; yön gerekiyorsa sunucu DIRECTION_REQUIRED ile sorar.
        setNeedsDirection(false);
      }
    })();
  }, [studentToken]);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current || phase !== "scan") return;
    if (!isOurQr(data)) {
      setHint("Bu QR kod okul kapısına ait değil.");
      return;
    }
    const last = ble.current;
    const fresh = last && Date.now() - last.at < BLE_FRESH_MS ? last : null;
    const bleDesc = fresh
      ? `${fresh.token} (${Math.round((Date.now() - fresh.at) / 1000)} sn önce, RSSI ${fresh.rssi})`
      : last
        ? `yok (bayat: ${Math.round((Date.now() - last.at) / 1000)} sn önce)`
        : "yok (hiç alınmadı)";
    bleLog(`QR okundu: ${data.slice(0, 40)}… — BLE jetonu: ${bleDesc}`);
    if (config?.bleRequired && !fresh) {
      setHint("Kapı sinyali bekleniyor. Bluetooth'un açık olduğundan emin olup kapıya yaklaşın.");
      return;
    }

    busy.current = true;
    setHint(null);
    setPhase("sending");
    try {
      const { deviceSecret } = await getDeviceIdentity();
      const timestamp = Date.now();
      const token = fresh?.token ?? null;
      const r = await api<ScanResponse>("/api/mobile/scan", {
        method: "POST",
        token: studentToken,
        body: {
          qr: data,
          ble: fresh ? { token: fresh.token, rssi: fresh.rssi } : null,
          timestamp,
          signature: requestSignature(deviceSecret, data, token, timestamp),
          direction: chosenDirection,
        },
      });
      const bleResult = r.bleVerified === null ? "jeton gönderilmedi" : r.bleVerified ? "EŞLEŞTİ ✓" : "EŞLEŞMEDİ ✗";
      bleLog(`Sunucu okutmayı kabul etti: ${r.direction}${r.duplicate ? " (tekrar)" : ""} — BLE doğrulaması: ${bleResult}`);
      setResult(r);
      setPhase("done");
    } catch (e) {
      bleLog(`Sunucu okutmayı reddetti: ${e instanceof ApiError ? `${e.code} — ${e.message}` : String(e)}`);
      if (e instanceof ApiError && e.code === "DIRECTION_REQUIRED") {
        setNeedsDirection(true);
        setChosenDirection(null);
        setHint(e.message);
        setPhase("scan");
      } else {
        setError(e instanceof ApiError ? e.message : "Okutma gönderilemedi.");
        setPhase("error");
      }
    } finally {
      busy.current = false;
    }
  };

  if (phase === "done" && result) {
    const inDir = result.direction === "IN";
    const bleResult = result.bleVerified === null ? "sinyal yok" : result.bleVerified ? "kapı doğrulandı ✓" : "doğrulanamadı ✗";
    return (
      <Screen style={{ backgroundColor: colors.brand }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <IconCheck size={64} strokeWidth={3} color={colors.brand} />
          </View>
          <Text style={{ fontSize: 34, fontWeight: "800", color: colors.white, textAlign: "center" }}>{inDir ? "Giriş kaydedildi" : "Çıkış kaydedildi"}</Text>
          <Text style={{ fontSize: 44, fontWeight: "700", fontFamily: mono, color: colors.white, marginTop: 12 }}>{result.time}</Text>
          <Text style={{ fontSize: 15, color: colors.white, opacity: 0.8 }}>Saat</Text>
        </View>
        <View style={{ backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 18, padding: 16, marginBottom: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconBluetooth size={20} color={colors.white} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.white }}>Bluetooth doğrulaması: {bleResult}</Text>
          </View>
          {result.duplicate && (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <IconInfo size={20} color={colors.white} />
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.white }}>Bu işlem az önce zaten kaydedilmişti; velinize tekrar WhatsApp mesajı gönderilmedi.</Text>
            </View>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => ({ minHeight: 60, borderRadius: 16, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.brandDark }}>Tamam</Text>
        </Pressable>
      </Screen>
    );
  }

  if (phase === "error")
    return (
      <Screen>
        <TopBar title="QR okut" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 22, alignSelf: "center" }}>
            <IconX size={44} color={colors.danger} />
          </View>
          <Text style={[styles.title, { marginBottom: 16, textAlign: "center" }]}>Okutma kabul edilmedi</Text>
          <ErrorBox message={error} />
        </View>
        <Button
          title="Tekrar dene"
          onPress={() => {
            setError(null);
            setPhase("scan");
          }}
          style={{ minHeight: 60, borderRadius: 16 }}
        />
        <Button title="Geri" variant="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </Screen>
    );

  if (needsDirection && !chosenDirection && phase === "scan")
    return (
      <Screen>
        <TopBar onBack={() => router.back()} />
        <Title sub="Bu kapıda ilk kez okutuyorsunuz. Bir kez seçmeniz yeterli.">Şu an ne yapıyorsunuz?</Title>
        <View style={{ gap: 16 }}>
          <OptionRow title="Okula giriyorum" icon={IconIn} selected={pickedDirection === "IN"} onPress={() => setPickedDirection("IN")} />
          <OptionRow title="Okuldan çıkıyorum" icon={IconOut} selected={pickedDirection === "OUT"} onPress={() => setPickedDirection("OUT")} />
        </View>
        <View style={{ flex: 1 }} />
        <Button title={pickedDirection === "IN" ? "Girişi kaydet" : "Çıkışı kaydet"} onPress={() => setChosenDirection(pickedDirection)} style={{ minHeight: 60, borderRadius: 16 }} />
      </Screen>
    );

  const cameraAllowed = permission?.granted === true;
  const cameraDenied = permission !== null && !permission.granted;
  const bleLine = BLE_TEXT[bleStatus];
  const corner = { position: "absolute" as const, width: 44, height: 44, borderColor: colors.white };

  return (
    <Screen style={{ backgroundColor: "#0B120E" }}>
      <StatusBar style="light" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri" hitSlop={8} onPress={() => router.back()} style={{ width: 48, height: 48, marginLeft: -12, alignItems: "center", justifyContent: "center" }}>
          <IconBack size={26} color={colors.white} />
        </Pressable>
        <View style={{ width: 36 }} />
      </View>
      <Text style={{ fontSize: 26, lineHeight: 31, fontWeight: "800", letterSpacing: -0.3, color: colors.white }}>Kapıdaki ekranda görünen QR kodu çerçeveye alın</Text>
      <Text style={{ fontSize: 15, lineHeight: 21, color: "rgba(255,255,255,0.72)", marginTop: 8, marginBottom: 16 }}>Kod kendiliğinden okunur.</Text>

      <View style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
        {cameraAllowed && (
          <>
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={phase === "scan" ? onScanned : undefined} />
            <View pointerEvents="none" style={{ position: "absolute", top: "18%", left: "14%", right: "14%", aspectRatio: 1 }}>
              <View style={[corner, { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 }]} />
              <View style={[corner, { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 }]} />
              <View style={[corner, { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 }]} />
              <View style={[corner, { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 }]} />
            </View>
          </>
        )}
        {phase === "sending" && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(11,18,14,0.65)", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.white} size="large" />
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.white, marginTop: 12 }}>Doğrulanıyor…</Text>
          </View>
        )}
      </View>

      {cameraDenied && (
        <View style={{ gap: 16, padding: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 16 }}>
          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.white }}>Kamera izni gerekli. QR kodu okutmak için ayarlardan kamera iznini açın.</Text>
          <Button title="Ayarları aç" onPress={() => void Linking.openSettings()} style={{ minHeight: 52, borderRadius: 16 }} />
        </View>
      )}
      {hint && (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.warnSoft, borderRadius: 16, padding: 16, marginTop: 16 }}>
          <IconAlert size={20} color={colors.warn} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20, color: colors.warnInk }}>{hint}</Text>
        </View>
      )}
      {bleLine && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", marginTop: 16 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BLE_DOT[bleStatus] }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.white }}>{bleLine}</Text>
        </View>
      )}
      <BluetoothGate />
    </Screen>
  );
}
