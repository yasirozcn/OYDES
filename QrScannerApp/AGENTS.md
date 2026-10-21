This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md


---

# AGENTS.md — QrScannerApp (öğrenci + kiosk uygulaması)

Önce kökteki [`../AGENTS.md`](../AGENTS.md) dosyasını okuyun: protokol, API sözleşmesi, iş kuralları ve **referans kaynak kodu (§0)** oradadır ve **bağlayıcıdır**.
Bu dosya uygulamanın **her ekranını, her `lib` dosyasını ve kurallarını** anlatır.

**Referans:** her dosyanın karşılığı `https://raw.githubusercontent.com/yasirozcn/FenBahceleri/5387bef/QrScannerApp/<aynı yol>` — yalnızca web üzerinden okunur, **bilgisayara indirilmez** (kök AGENTS.md §0.1). Yazmadan önce okuyun; kök AGENTS.md §0.2'deki farkları uygulayın
(uygulamada: görünen okul adı `İzmir Fen`, logo harfleri `İF`, APK adı `izmir-fen-kiosk.apk`; geri kalan her şey aynı).

**Prompt önceliği:** görev referansta olmayan bir ekran/özellik veya var olan bir ekranın değişmesini isterse prompt esastır (kök AGENTS.md §0.3). Değişmeyenler: BLE yapısı (`lib/ble.ts` tarama modeli, `modules/kiosk-beacon` yayını, jeton biçimi, servis UUID), sunucuyla yalnızca `lib/api.ts` → `/api/mobile/*` üzerinden konuşma, `protocol.ts`, `device.ts` cihaz kimliği/güvenli depo anahtarları, kioskta QR'ın cihazda üretilmesi. Yeni ekran eklenirse §2 ağacı ve §4 tablosu aynı işte güncellenir.

## 1. Teknoloji

| Konu | Seçim |
| --- | --- |
| Çatı | Expo SDK 57, React Native 0.86, React 19, TypeScript strict, **Expo Router** (dosya tabanlı; ekranlar `src/app/`) |
| Kamera / QR okuma | `expo-camera` (`CameraView`, `useCameraPermissions`, `barcodeScannerSettings: { barcodeTypes: ["qr"] }`) |
| QR gösterme | `react-native-qrcode-svg` (+ `react-native-svg`) |
| Kripto | `@noble/hashes` (HMAC-SHA256; içe aktarma yolları `@noble/hashes/hmac.js`, `sha2.js`, `utils.js`), `expo-crypto` (rastgele bayt, UUID) |
| Güvenli depo | `expo-secure-store` (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) |
| BLE tarama | `react-native-ble-plx` (yalnızca geliştirme/mağaza derlemesinde; **Expo Go'da yok** → koşullu `require`) |
| BLE yayını | yerel Expo modülü `modules/kiosk-beacon` (Android Kotlin; iOS "desteklenmiyor") — içe aktarma `@modules/kiosk-beacon` |
| Ekran açık kalsın | `expo-keep-awake` (`useKeepAwake`, kiosk) |
| İkonlar | `react-native-svg` ile `src/components/icons.tsx` |
| Derleme ayarı | `app.config.ts` (hazır; `expo-build-properties`: adres `http://` ise Android düz HTTP izni) |

Tüm paketler **kurulu**; yeni paket eklenmez. Yol takma adları (`tsconfig.json`, hazır): `@/*` → `src/*`, `@modules/*` → `modules/*`.
Sunucu adresi: `.env` → `EXPO_PUBLIC_API_URL` (derlemede uygulamaya gömülür; değişince Metro'yu yeniden başlatın). Canlıda `https://…`.

## 2. Klasör yapısı (hedef ağaç)

✅ = depoda hazır · ⏳ = ekip geliştirecek. Ekran yolları (Expo Router) ve dosya adları değiştirilmez.

```
QrScannerApp/
├── AGENTS.md, CLAUDE.md ✅ · README.md ⏳ · CIHAZ_TESTI.md ⏳ · TESTFLIGHT.md ⏳
├── package.json ✅ · app.json ✅ · app.config.ts ✅ · tsconfig.json ✅ · eslint.config.js ✅ · .env.example ✅ · assets/ ✅ (uygulama adı `DOQR`; ikonlar + logo.png)
├── eas.json ✅                     profiller: development · preview · production · kiosk-lan (gerçek IP/kimlik yazılmaz)
├── modules/kiosk-beacon/ ✅        Android BLE yayın modülü
│   ├── index.ts                           KioskBeacon { isSupported, lastError, start, stop }
│   ├── expo-module.config.json
│   ├── android/build.gradle · android/src/main/AndroidManifest.xml
│   ├── android/src/main/java/expo/modules/kioskbeacon/KioskBeaconModule.kt
│   └── ios/KioskBeaconModule.swift · ios/KioskBeacon.podspec
├── tools/                                 mac-kiosk-beacon.swift · ios-kur.sh · android-apk.sh ⏳
└── src/
    ├── app/                               EKRANLAR
    │   ├── _layout.tsx ✅ (SessionProvider + Stack + BluetoothGate)
    │   ├── index.tsx ✅ GEÇİCİ → açılış ekranıyla DEĞİŞTİRİLİR
    │   ├── student-login.tsx ✅      telefon → şifre oluştur | şifre
    │   ├── student-home.tsx ✅       durum, son hareketler, "QR okut", çıkış yap
    │   ├── scan.tsx ✅       kapıdaki ilk okutmada yön seçimi → kamera (+BLE) → sonuç
    │   ├── admin-login.tsx ✅        kiosk hesabıyla giriş
    │   ├── kiosk-select.tsx ✅       kiosk seçimi
    │   ├── kiosk/[id].tsx ✅ dönen QR + BLE yayını + son okutan
    ├── components/
    │   ├── ui.tsx ✅                 mono, Logo, Screen, Title, Button, Field, ErrorBox, InfoBox, Card, TopBar, LegalLinks, Pill, styles
    │   ├── icons.tsx ✅              IconBack, IconArrowRight, IconCheck, IconIn, IconOut, IconQr, IconBluetooth, IconBluetoothOff, IconInfo, IconAlert, IconX, IconPhone, IconShield, IconMail, IconLogout, IconCamera
    │   └── BluetoothGate.tsx ✅      Bluetooth kapalı/izin yok uyarısı
    └── lib/
        ├── config.ts ✅ API_URL, colors (renk paleti referansınkiyle değiştirilir)
        ├── api.ts ✅                 ApiError, api<T>(), yanıt tipleri
        ├── device.ts ✅              getDeviceIdentity, clearBinding, tokens
        ├── session.tsx ✅            SessionProvider, useSession
        ├── protocol.ts ✅            PROTOCOL_VERSION, slotAt, buildQrPayload, isOurQr, bleToken, requestSignature, __test
        └── ble.ts ✅                 bleLog, getBleLog, clearBleLog, subscribeBleLog, isBleAvailable, subscribeBtState, openBluetoothSettings, extractKioskToken, startBleScan (+ tipler BtState, Found, BleStatus, BleLogEntry, SeenDevice)
```
`ios/` ve `android/` klasörleri **üretilir** (git'e girmez); elle oluşturulmaz/düzenlenmez.

**Katmanlar:** ekran (`src/app/`) yalnızca gösterir ve kullanıcı etkileşimini yönetir → sunucuyla konuşma yalnızca `lib/api.ts` üzerinden → gizli değerler yalnızca `lib/device.ts` → protokol hesapları yalnızca `lib/protocol.ts` → Bluetooth yalnızca `lib/ble.ts` / `modules/kiosk-beacon`.

## 3. `lib` dosyaları

### `config.ts` (hazır; ortak görünüm yapılırken `colors` güncellenir)
`API_URL` = `EXPO_PUBLIC_API_URL` ?? `expoConfig.extra.apiUrl` ?? `http://localhost:3000` (sondaki `/` silinir).
`colors` anahtarları (referansla aynı değerler): `brand #17613C, brandDark #0F4A2C, brandSoft #E3EFE6, ink #14211A, inkSoft #4A564F, muted #6B7570, line #DDDAD0, lineSoft #ECEAE3, lineStrong #C9C5B8, bg #F4F3EE, danger #B42318, dangerSoft #FCE8E6, dangerInk #8F1C13, dangerLine #F1B8B2, warn #9A5B00, warnSoft #FBF0DC, warnInk #7A4700, exit #1E4FA8, exitSoft #E4ECF8, exitInk #173E85, white #ffffff`.

### `api.ts`
- `class ApiError(status, message, code)`.
- `api<T>(path, { method = "GET", body, token, timeoutMs = 15000 })`: `fetch(API_URL + path)`, başlıklar `Accept: application/json`, gövde varsa `Content-Type: application/json`, token varsa `Authorization: Bearer`. `AbortController` ile zaman aşımı.
  - Ağ hatası → `console.warn("[api] <METHOD> <path> başarısız:", e)` sonra `ApiError(0, "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.", "NETWORK")`; zaman aşımı (`AbortError`) → `ApiError(0, "Sunucu zamanında yanıt vermedi. Tekrar deneyin.", "TIMEOUT")`.
  - Başarısız yanıt → `ApiError(res.status, data.error ?? "Beklenmeyen hata (<status>).", data.code ?? "ERROR")`.
- Yanıt tipleri (kök AGENTS.md §5 ile aynı): `StudentSummary, AuthResponse, MeResponse, ScanResponse, AppConfig, KioskInfo, KioskStart, KioskFeed` (`KioskFeed` yalnızca `serverTime` ve `events` içerir).

### `device.ts`
Güvenli depo anahtarları: `fb.deviceId, fb.deviceSecret, fb.boundEmail, fb.studentToken, fb.adminToken` (protokol; değiştirmeyin).
- `getDeviceIdentity()` → `{ deviceId, deviceSecret }`; ilk çağrıda `Crypto.randomUUID()` + 32 rastgele bayt (hex, 64 karakter) üretilip saklanır, bellek içinde önbelleğe alınır, **bir daha değişmez**.
- `clearBinding()` → `fb.boundEmail` ve `fb.studentToken` silinir (cihaz kimliği silinmez).
- `tokens` → `getStudent/setStudent/clearStudent/getAdmin/setAdmin/clearAdmin`.

### `session.tsx`
`SessionProvider` + `useSession()` → `{ ready, studentToken, adminToken, student, config, setStudentSession(token, student), setStudent, clearStudentSession, setAdminSession(token), clearAdminSession, refreshConfig }`.
Açılışta iki token depodan okunur → `ready = true` → arka planda `GET /api/mobile/config` (hata olursa `config` null kalır; uygulama yine açılır). Context dışında kullanılırsa "useSession, SessionProvider içinde kullanılmalı" hatası.

### `protocol.ts`
Sunucudaki `AdminPanel/src/lib/protocol.ts` ile **aynı kurallar** (kök AGENTS.md §4): `PROTOCOL_VERSION = "FB2"`, `slotAt(nowMs, slotSeconds)`, `buildQrPayload(secretHex, kioskId, slot)` (base64url elle, dolgusuz), `isOurQr(payload)` (`"FB2."` ile başlar ve 4 parça), `bleToken`, `requestSignature(deviceSecretHex, qr, ble|null, timestamp)`, `__test = { base64url }`.
Test vektörleri: kök AGENTS.md §4 (sunucu ve mobil aynı sonucu vermeli).

### `ble.ts`
- `react-native-ble-plx` **koşullu `require`** ile yüklenir (Expo Go'da yoksa `available = false`, uygulama çökmez, durum `"unavailable"`).
- Log: `bleLog(msg)` → `[BLE] ` önekiyle `console.log` + 300 satırlık bellek arabelleği; `getBleLog`, `clearBleLog`, `subscribeBleLog`.
- `subscribeBtState(fn)` (ilk değer hemen gelir; iOS'ta ilk çağrı izin penceresini açar), `openBluetoothSettings(state)` (Android: kapalıysa `REQUEST_ENABLE` isteği, değilse uygulama ayarları; iOS: uygulama ayarları).
- Android izinleri: API ≥ 31 → `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT`; daha eski → `ACCESS_FINE_LOCATION`.
- `extractKioskToken(device, serviceUuid)`: önce `serviceData[serviceUuid]` (base64 → hex, 16 karakter → `source: "service-data"`), sonra yerel ad `^FB([0-9a-fA-F]{16})$` (`source: "local-name"`).
- `startBleScan(serviceUuid, onUpdate, { onDevices?, verbose? })` → durdurma fonksiyonu döner. **Filtresiz** tarama (`startDeviceScan(null, { allowDuplicates: true }, …)`), Bluetooth açılınca başlar/kapanınca durur, 5 sn'de bir özet logu, `onDevices` verilirse 1 sn'de bir cihaz listesi (kiosklar önce, sonra RSSI'ye göre). Durumlar: `unavailable | no-permission | off | scanning | found`.

## 4. Ekranlar (akış ve metinler referansla aynı)

Tüm ekranlar `Screen` içinde; üst gezinme `TopBar` (geri oku + küçük başlık). Hatalar `ErrorBox`, bilgiler `InfoBox`. Sunucu hata mesajları (`e.message`) **aynen** gösterilir.

| Ekran | API | Davranış ve metinler |
| --- | --- | --- |
| `index.tsx` Açılış | — | `ready` değilse yükleniyor. `adminToken` → `<Redirect href="/kiosk-select" />`; `studentToken` → `/student-home`. Yoksa: `Logo` (okul logosu) + "İzmir Fen", başlık "Okul Giriş-Çıkış", "Okula girişte ve çıkışta kiosk ekranındaki QR kodu bu uygulamayla okutun.", bilgi kartı ("Kapıdaki kodu okutun" QR ikonu, "Bluetooth açık olsun" Bluetooth ikonu), düğmeler **Öğrenci girişi** (`/student-login`), **Yönetici girişi (kiosk)** (secondary, `/admin-login`); en altta `LegalLinks` ("Gizlilik Politikası" · "Destek" → `API_URL/gizlilik`, `/destek`; mağaza kuralı — aynı bağlantı `student-login` telefon adımında ve `admin-login`'de de var) |
| `student-login.tsx` | `POST /student/check-phone`, `/student/set-password`, `/student/login` | Adımlar `phone → create-password | password` (aynı ekran). **Telefon**: başlık "Öğrenci girişi", "Okulun sisteme kaydettiği cep telefonu numaranızı girin.", alan "Cep telefonu" (ipucu `05XX XXX XX XX`, telefon klavyesi), "Devam". Rakamlar `05XXXXXXXXX` / `5XXXXXXXXX` / `905XXXXXXXXX` değilse "Geçerli bir cep telefonu numarası girin."; numara yazıldığı gibi gönderilir, biçimi sunucu çevirir. **Şifre oluşturun** (TopBar "İlk giriş"): "Merhaba {firstName}. Bundan sonraki girişlerde bu şifreyi kullanacaksınız.", InfoBox "Şifrenizi kaydettiğinizde hesabınız bu telefona bağlanır. Başka bir telefondan giriş yapmak için okul yönetiminin cihazınızı sıfırlaması gerekir.", alanlar "Şifre (en az 8 karakter)" + "Şifre (tekrar)", canlı kural göstergeleri "En az 8 karakter" / "İki şifre aynı", istemci hataları "Şifre en az 8 karakter olmalı." / "Şifreler eşleşmiyor.", düğme "Şifreyi kaydet ve giriş yap"; gönderilen `platform` = `ios`/`android`/`unknown`. **Şifre**: "Merhaba {firstName}. Şifrenizi girin.", "Giriş yap", altta "Şifrenizi unuttuysanız okul yönetiminden şifre sıfırlaması isteyin.". Başarı → `setStudentSession` → `router.replace("/student-home")`. Geri: telefon adımındaysa önceki ekran, değilse telefon adımı. Bilinmeyen hata: "Beklenmeyen bir hata oluştu.". **Yerel "bu telefon başka hesaba bağlı" kontrolü yapılmaz** |
| `student-home.tsx` | `GET /student/me` | Ekran her odaklandığında (`useFocusEffect`) yüklenir; aşağı çekince yenile. Üstte "Merhaba" + ad soyad, sağda **Çıkış yap** (onay: "Çıkış yap" / "Uygulamadan çıkış yapılsın mı? Tekrar girişte şifreniz sorulur." / "Vazgeç") → oturumu sil → `/`. Durum kartı: Pill "Okulda"/"Dışarıda", sınıf, "Şu anki durum", **"Okuldasınız" / "Okul dışındasınız"**. "Son hareketler": Giriş/Çıkış ikonlu satırlar, kiosk adı veya **"Manuel kayıt"**, tarih-saat (`gg.aa ss:dd`), boşsa "Henüz kayıt yok.". Altta büyük düğme **"QR okut"** (yön kapıya göre değiştiği için okutmadan önce gösterilmez), alt yazı "Kapıdaki ekrana yaklaşın" → `/scan`. `DEVICE_REVOKED` → `clearBinding` + oturumu sil + uyarı "Cihaz bağlantısı kaldırıldı" / "Okul yönetimi bu telefonun bağlantısını kaldırdı. Telefon numaranızla giriş yapıp yeni şifre oluşturabilirsiniz." → `/`. Diğer 401 → oturumu sil → `/student-login`. Diğer hata: mesaj veya "Bilgiler yüklenemedi." |
| `scan.tsx` | `GET /student/me`, `POST /scan` | Ayrıntı §4.1 |
| `admin-login.tsx` | `POST /admin/login` | TopBar "Kiosk kurulumu"; başlık "Yönetici girişi", "Bu giriş, cihazı kapıdaki QR ekranına (kiosk) dönüştürür.", InfoBox "Kiosk için Android tablet önerilir: Bluetooth yakınlık doğrulaması yalnızca Android'de yayınlanabilir.", alanlar E-posta + Şifre, "Giriş yap" → `setAdminSession` → `router.replace("/kiosk-select")`. Hata: mesaj veya "Giriş yapılamadı." |
| `kiosk-select.tsx` | `GET /kiosks` | Üst: `Logo`, "Kapı Tableti", **Yönetici oturumunu kapat** (danger) → oturumu sil → `/`. Başlık "Kiosk seçin", "Bu tabletin duracağı kapıyı seçin. Ekran QR moduna geçer ve kapanmaz.". Kartlar: kiosk adı, "Giriş · çıkış kiosku", "QR ekranını aç →" → `/kiosk/[id]`. Altta bilgi şeridi "Kiosk QR ile birlikte Bluetooth sinyali yayınlar. Tableti şarja takılı ve Bluetooth açık bırakın.". 401 → oturumu sil → `/admin-login`. Hata: "Kiosklar yüklenemedi." |
| `kiosk/[id].tsx` | `POST /kiosks/:id/start`, `GET /kiosks/:id/feed` | Ayrıntı §4.2 |

### 4.1 `scan.tsx` (öğrenci QR okutma)
- Durumlar (`phase`): `scan | sending | done | error`. `busy` ref'i ile aynı anda tek istek.
- Kamera izni yoksa: "QR okutmak için kamera izni gerekiyor." + **Kamera izni ver** (tekrar sorulamıyorsa **Ayarları aç**) + Geri.
- Açılışta `GET /student/me` → `needsDirection`. **`needsDirection` (hiç kaydı yok) veya okutma `DIRECTION_REQUIRED` döndüyse (bu kapıda ilk okutma) ve yön seçilmemişse** (TopBar "İlk okutma"): "Bu kapıda ilk okutmanız", "Şu an içeri mi giriyorsunuz, dışarı mı çıkıyorsunuz? Bunu her kapı için yalnızca bir kez seçersiniz; sonra bu kapıdaki okutmalarda sistem sırayla giriş ve çıkış kaydeder.", iki kart **Giriş yapıyorum** / **Çıkış yapıyorum**, "Vazgeç".
- Kamera ekranı (koyu zemin): üstte geri oku (yön rozeti yok; her kapının durumu ayrı olduğundan yön okutmadan sonra sonuç ekranında görünür), "Kiosk QR kodunu okutun", "Kiosk ekranındaki kodu çerçevenin içine alın. Kod birkaç saniyede bir yenilenir.", çerçeve köşeleri, gönderilirken "Doğrulanıyor…". Altta BLE durum satırı (`unavailable` "Bluetooth doğrulaması bu sürümde kapalı", `no-permission` "Bluetooth izni verilmedi", `off` "Bluetooth kapalı", `scanning` "Kiosk sinyali aranıyor…", `found` "Kiosk sinyali alındı"), uyarı kutusu (`hint`), **Vazgeç** düğmesi.
- BLE: ekran açıkken `startBleScan(config.bleServiceUuid, …)`; son jeton bir ref'te tutulur. QR okununca jeton **8 sn'den yeniyse** (`BLE_FRESH_MS = 8000`) gönderilir.
- QR `isOurQr` değilse istek gitmez, `hint` = "Bu QR kod okul kioskuna ait değil.". `config.bleRequired` ve taze jeton yoksa istek gitmez, `hint` = "Kiosk Bluetooth sinyali bekleniyor. Bluetooth'un açık olduğundan emin olup kioska yaklaşın.".
- İstek: `{ qr, ble: taze ? { token, rssi } : null, timestamp: Date.now(), signature: requestSignature(deviceSecret, qr, token|null, timestamp), direction: chosenDirection }`.
- `DIRECTION_REQUIRED` → yön seçimine dön (`hint` = sunucu mesajı). Diğer hata → hata ekranı: "Okutma kabul edilmedi" + mesaj + **Tekrar dene** / Geri.
- Başarı ekranı (giriş yeşil, çıkış mavi zemin): ✓, "Giriş kaydedildi" / "Çıkış kaydedildi", büyük saat (`result.time`) + "Saat", "Bluetooth doğrulaması: sinyal yok / kiosk doğrulandı ✓ / jeton eşleşmedi ✗", `duplicate` ise "Bu işlem az önce zaten kaydedilmişti; velinize tekrar WhatsApp mesajı gönderilmedi.", **Tamam** → geri.
- Her adım `bleLog(...)` ile loglanır (QR okundu + gönderilecek jeton, sunucu kabul/red).

### 4.2 `kiosk/[id].tsx` (kiosk ekranı)
- `useKeepAwake()`. Açılışta `POST /kiosks/:id/start` → `offset = serverTime - Date.now()`, `since = serverTime (ISO)`. 401 → yönetici oturumunu sil → `/admin-login`; diğer hata: mesaj veya "Kiosk başlatılamadı." + Geri.
- 250 ms'de bir saat; `serverNow = now + offset`, `slot = slotAt(serverNow, slotSeconds)`, `remaining = slotSeconds - (serverNow/1000 % slotSeconds)`. QR = `buildQrPayload(secret, kioskId, slot)` — **cihazda üretilir**, internet kesilse de sürer.
- Yerleşim: yatay ekranda solda yeşil bilgi paneli + sağda QR; dikeyde üstte panel. Panel: "İzmir Fen" + saat (ss:dd); son okutan yoksa "GİRİŞ · ÇIKIŞ" (yatayda iki satır), kiosk adı, yatayda 3 adım ("Okul uygulamasını açın", "\"QR okut\"a basıp bu kodu okutun", "Adınızı ekranda görünce geçin"); altta "Okul uygulamasını açıp bu kodu okutun. Giriş mi çıkış mı olduğunu sistem bilir.".
- QR: `react-native-qrcode-svg`, `ecl="M"`, `quietZone={8}`; boyut QR alanının ölçülen boyutundan (`onLayout`) hesaplanır, alttaki satırlarla çakışmaz (en fazla telefonda 480, tablette 720). Kısa kenarı ≥ 600 olan ekran tablet sayılır: büyük yazılar, adımlar dikeyde de görünür; telefonda yazılar küçülür. Alttaki durum satırı sığmazsa alt satıra kayar. Altında kalan süre çubuğu ve "Kod N sn içinde yenilenecek".
- Akış: 3 sn'de bir `GET /kiosks/:id/feed?since=` (zaman aşımı 5 sn) → `offset` güncellenir; daha önce gösterilmemiş ilk olay **4 sn** panelde büyük kartta: baş harfler, "Giriş ✓"/"Çıkış ✓", ad soyad, "sınıf · saat". Hata → "Sunucuya ulaşılamıyor" (kırmızı nokta), başarı → "Sunucu bağlantısı var".
- BLE yayını: her dilimde `KioskBeacon.start(bleServiceUuid, bleToken(secret, kioskId, slot))`; Android 12+ (API ≥ 31) `BLUETOOTH_ADVERTISE` + `BLUETOOTH_CONNECT` izni bir kez istenir. Durum metinleri: `off` "Bluetooth kapalı veya yayın kullanılamıyor" (iOS: "BLE yayını yok"), `starting` "BLE başlatılıyor", `on` "BLE yayını açık", `unsupported` "BLE yayını yok (iOS kiosk)", `error` "BLE hatası: <kod>". Android'de yayın yoksa QR'ın üstünde kırmızı uyarı şeridi. Çıkışta `KioskBeacon.stop()`. Her dilim `bleLog("Kiosk yayında: jeton … (dilim …)")`.
- Çıkış: sağ altta "Çıkmak için basılı tutun" (1,5 sn uzun basma) → onay "Kiosk modundan çık" / "QR ekranı kapatılsın mı?" → geri.

### 4.3 `BluetoothGate.tsx` (`_layout.tsx`'te `Stack`'ten sonra)
Bluetooth `PoweredOff` veya `Unauthorized` ise alttan açılan modal: başlık "Bluetooth kapalı" / "Bluetooth izni gerekli", metin "Okul kioskunun yanında olduğunuzu doğrulamak için Bluetooth açık olmalı. " + platforma göre talimat (referanstaki metinler), düğme iOS+kapalı "Ayarları aç" / Android+kapalı "Bluetooth'u aç" / izin "İzin ver", **Şimdilik geç**. Uygulama öne gelince tekrar sorar; Bluetooth açılınca kapanır. Expo Go'da (`unavailable`) görünmez.

## 5. `modules/kiosk-beacon`

Referanstaki 7 dosyanın aynısı. `index.ts`: `requireOptionalNativeModule<KioskBeaconNative>("KioskBeacon")` (Expo Go'da null) ve sarmalayıcı `KioskBeacon`: `isSupported()` (hata yakalanır), `lastError()` (modül yoksa `"NATIVE_MODULE_MISSING"`), `start(serviceUuid, tokenHex)`, `stop()`.
Android (`KioskBeaconModule.kt`): `BluetoothLeAdvertiser`; `ADVERTISE_MODE_LOW_LATENCY`, `ADVERTISE_TX_POWER_MEDIUM`, bağlanılamaz, süresiz; veri: cihaz adı/güç yok, `addServiceData(ParcelUuid(uuid), 8 bayt jeton)`; her başlatmada önce eski yayın durdurulur; hata `ADVERTISE_FAILED_<kod>`; `OnDestroy` → durdur. iOS: `isSupported` false (Apple service data yayınlayamaz).
Yerel modül değişince **yeniden derleme** gerekir (`npx expo run:android --device`); Metro yenilemesi yetmez.

## 6. Cihaz kimliği ve güvenlik

- `deviceId` ve `deviceSecret` bir kez üretilir, SecureStore'da saklanır; değişmez. (iOS'ta Keychain kayıtları uygulama silinse de kalır.)
- `deviceSecret` yalnızca `set-password` isteğinde sunucuya gider; sonra yalnızca imza üretmekte kullanılır.
- Token'lar yalnızca SecureStore'da. AsyncStorage'a gizli bilgi yazılmaz.
- Şifre, token, `deviceSecret`, kiosk `secret` loglanmaz (BLE jetonları kısa ömürlüdür, loglanabilir).
- Galeriden QR seçme yoktur; yalnızca canlı kamera.

## 7. Komutlar ve test

```bash
npm install
cp .env.example .env                         # EXPO_PUBLIC_API_URL=http://<bilgisayarın yerel IP'si>:3000  (ipconfig getifaddr en0)
npm run typecheck && npx eslint src          # HER işten sonra — hatasız/uyarısız olmalı
npx expo start --go                          # Expo Go ile hızlı arayüz denemesi (BLE YOK, yerel modül YOK)
npx expo run:ios --device                    # geliştirme derlemesi (BLE var, loglar terminalde)
npx expo run:android --device                # Android (Java 17 + Android SDK + NDK 27.1 gerekir)
TEAM_ID=XXXXXXXXXX bash tools/ios-kur.sh     # bağımsız Release derlemesi → iPhone
bash tools/android-apk.sh                    # kiosk APK'sı (arm64-v8a) → izmir-fen-kiosk.apk
swift tools/mac-kiosk-beacon.swift --email KIOSK_EPOSTA   # Mac'i test kioskuna çevirir (şifre gizli sorulur)
```
Uygulamanın her ekranı için bilgisayarda **AdminPanel `npm run dev` açık** olmalı; telefon ve bilgisayar aynı Wi-Fi'da olmalı.
Hangi işin hangi derlemede denenebileceği: arayüz + API (öğrenci girişi, ana ekran, kamera ile okutma, kiosk QR) → Expo Go yeter; BLE tarama/yayın → geliştirme derlemesi (`expo run:*`) gerekir.

## 8. Yapılmaması gerekenler

- Sunucu kararlarını istemcide tekrar vermek (yön, cihaz bağlılığı, QR geçerliliği) — istemci yalnızca gösterir ve gönderir.
- `protocol.ts`'i sunucuyu güncellemeden değiştirmek; güvenli depo anahtar adlarını değiştirmek.
- BLE kütüphanesini koşulsuz `import` etmek (Expo Go'da çöker) — `ble.ts`'teki gibi `require` + `try/catch`.
- Kiosk ekranında QR'ı sunucudan çekmek: QR cihazda `secret` ile üretilir.
- `ios/` / `android/` klasörlerini elle düzenlemek veya git'e eklemek; paket eklemek; `app.json` paket kimliklerini değiştirmek.
- Referanstaki `eas.json` `projectId`/`owner` değerlerini veya gerçek IP adreslerini kopyalamak.

## 9. Sık karşılaşılan hatalar

| Belirti | Neden / çözüm |
| --- | --- |
| "Sunucuya ulaşılamadı" | AdminPanel `npm run dev` kapalı, telefon farklı Wi-Fi'da, `.env` adresi yanlış (localhost değil, bilgisayarın IP'si) veya `.env` değişti ama Metro yeniden başlatılmadı (`npx expo start -c`) |
| BLE durumu hep "Bluetooth doğrulaması bu sürümde kapalı" | Expo Go kullanılıyor; `npx expo run:ios --device` / `run:android --device` ile geliştirme derlemesi gerekir |
| Kiosk "BLE yayını yok (iOS kiosk)" | iPhone/iPad kiosk olamaz (service data yok) — Android tablet veya Mac test kioskü kullanın |
| `Cannot find native module 'KioskBeacon'` | Modül değişti ama uygulama yeniden derlenmedi |
| Tüm okutmalar `BAD_SIGNATURE` | `deviceSecret` sunucudakiyle farklı (ör. uygulama silinip yeniden kuruldu, Android) → panelden **Cihazı sıfırla**, yeniden giriş |
| Tüm okutmalar `EXPIRED_QR` | Kiosk saat farkını düzeltmiyor (`offset`) veya QR `slotAt` hesabı yanlış — test vektörleriyle karşılaştırın |
| `Cannot find module '@noble/hashes/hmac'` | Yol `.js` uzantılı olmalı: `@noble/hashes/hmac.js` |
