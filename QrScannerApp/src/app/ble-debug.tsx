import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Platform, Pressable, Switch, Text, View } from "react-native";
import { Button, Card, mono, Screen } from "@/components/ui";
import { clearBleLog, getBleLog, startBleScan, subscribeBleLog, subscribeBtState, type BleStatus, type BtState, type Found, type SeenDevice } from "@/lib/ble";
import { colors } from "@/lib/config";
import { useSession } from "@/lib/session";

// Bluetooth testi: kiosk sinyalinin telefona ulaşıp ulaşmadığını ve çevredeki BLE cihazlarını gösterir.
// Sunucuya ulaşılamazsa protokoldeki varsayılan servis kimliği kullanılır.
const DEFAULT_SERVICE_UUID = "6f1b0000-5a1e-4c1a-9b9e-fb0000000001";
const FRESH_SECONDS = 8;

export default function BleDebug() {
  const { config, refreshConfig } = useSession();
  const [bt, setBt] = useState<BtState | null>(null);
  const [status, setStatus] = useState<BleStatus>("scanning");
  const [latest, setLatest] = useState<Found | null>(null);
  const [devices, setDevices] = useState<SeenDevice[]>([]);
  const [log, setLog] = useState(getBleLog);
  const [verbose, setVerbose] = useState(false);
  const [tab, setTab] = useState<"devices" | "log">("devices");
  const [serviceUuid, setServiceUuid] = useState<string | null>(config?.bleServiceUuid ?? null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeBtState(setBt), []);
  useEffect(() => subscribeBleLog(() => setLog(getBleLog())), []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (serviceUuid) return;
    void refreshConfig().then((c) => setServiceUuid(c?.bleServiceUuid ?? DEFAULT_SERVICE_UUID));
  }, [serviceUuid, refreshConfig]);

  useEffect(() => {
    if (!serviceUuid) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    (async () => {
      const s = await startBleScan(
        serviceUuid,
        (st, l) => {
          setStatus(st);
          if (l) setLatest(l);
        },
        { onDevices: setDevices, verbose },
      );
      if (cancelled) s();
      else stop = s;
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [serviceUuid, verbose]);

  const age = latest ? Math.max(0, Math.round((now - latest.at) / 1000)) : null;
  const fresh = age !== null && age <= FRESH_SECONDS;

  return (
    <Screen>
      <Text style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.3, color: colors.ink }}>Bluetooth testi</Text>
      <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 4 }}>
        {Platform.OS} · Servis {serviceUuid ?? "…"}
      </Text>

      <Card style={{ marginTop: 12, padding: 14 }}>
        <Row label="Bluetooth" value={bt ?? "…"} ok={bt === "PoweredOn"} />
        <Row label="Tarama" value={status} ok={status === "scanning" || status === "found"} />
        <Row label="Çevredeki cihaz" value={String(devices.length)} ok={devices.length > 0} />
        <Row label="Kiosk jetonu" value={latest ? `${latest.token} · ${latest.source} · RSSI ${latest.rssi ?? "?"} · ${age} sn önce` : "henüz yok"} ok={fresh} />
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
        <TabButton title={`Cihazlar (${devices.length})`} active={tab === "devices"} onPress={() => setTab("devices")} />
        <TabButton title={`Log (${log.length})`} active={tab === "log"} onPress={() => setTab("log")} />
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 12, color: colors.muted }}>Ayrıntılı</Text>
        <Switch value={verbose} onValueChange={setVerbose} />
      </View>

      <View style={{ flex: 1, marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.white, overflow: "hidden" }}>
        {tab === "devices" ? (
          <FlatList
            data={devices}
            keyExtractor={(d) => d.id}
            ListEmptyComponent={<Text style={{ padding: 14, color: colors.muted }}>Henüz cihaz bulunamadı.</Text>}
            renderItem={({ item: d }) => (
              <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.lineSoft, backgroundColor: d.isKiosk ? colors.brandSoft : undefined }}>
                <Text style={{ fontWeight: "600", color: d.isKiosk ? colors.brandDark : colors.ink }}>
                  {d.isKiosk ? "★ KIOSK · " : ""}
                  {d.name ?? "(adsız)"} <Text style={{ fontWeight: "400", color: colors.muted }}>RSSI {d.rssi ?? "?"}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {d.id.slice(0, 18)}… · {d.count} paket · {Math.max(0, Math.round((now - d.lastSeen) / 1000))} sn önce
                  {d.services.length ? ` · servis ${d.services.join(", ")}` : ""}
                  {d.hasServiceData ? " · serviceData" : ""}
                  {d.hasManufacturerData ? " · manufacturerData" : ""}
                </Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={[...log].reverse()}
            keyExtractor={(e, i) => `${e.at}-${i}`}
            renderItem={({ item: e }) => (
              <Text style={{ fontSize: 11, fontFamily: mono, paddingHorizontal: 8, paddingVertical: 3, color: e.msg.startsWith("KIOSK") ? colors.brand : colors.ink }}>
                {new Date(e.at).toLocaleTimeString("tr-TR", { hour12: false })} {e.msg}
              </Text>
            )}
          />
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Button title="Logu temizle" variant="secondary" onPress={clearBleLog} style={{ flex: 1 }} />
        <Button title="Kapat" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, marginRight: 8, backgroundColor: ok ? colors.brand : colors.warn }} />
      <Text style={{ width: 110, fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: colors.ink }}>{value}</Text>
    </View>
  );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? colors.brand : colors.brandSoft }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.white : colors.brandDark }}>{title}</Text>
    </Pressable>
  );
}
