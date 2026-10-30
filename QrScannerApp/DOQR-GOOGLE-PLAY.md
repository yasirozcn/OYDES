# DOQR · Google Play kapalı test devri (Claude Code için)

> **Bu dosyayı okuyan Claude Code'a:** Bu belge DOQR uygulamasını Google Play'de **kapalı teste (closed testing)** çıkarmak için kalan işlerin tam listesidir. Çalışma dizini `yasirozcn/OYDES` reposudur. Adımları **sırayla** uygula, her adımın "Bitti sayılır" maddesini doğrulamadan sonrakine geçme. "🧑 İNSAN" yazan adımlarda dur ve Yasir'den iste. "Kurallar" bölümü tüm adımlardan önce gelir.
>
> Hazırlayan: Bedir Aktaş (Insider Mobile SDK) · Tarih: 20 Ekim 2026 · Hedef: öğrenciler **3 Kasım 2026**'da uygulamayı Play Store'dan davet linkiyle kurabilsin.

---

## ✅ Baştan sona yapılacaklar listesi

Claude Code: Bu listeyi sırayla yürüt, her maddeyi bitirince `[x]` yap ve bu dosyayı güncelle. Ayrıntılar ve "bitti sayılır" kontrolleri aşağıdaki bölümlerde (§0 kurallar, §3 adımlar). 🧑 = Yasir'in kendi yapması / onay vermesi gereken madde.

**A. Sunucu ve kod**
- [ ] A1. AdminPanel'i `doqrapp.com`'a yeniden deploy et (PR #12 merge edildi ama `/gizlilik` ve `/destek` 404). → §3 Adım 1
- [ ] A2. `curl` ile `/gizlilik` ve `/destek` → 200 doğrula. → §3 Adım 1
- [ ] A3. Uygulamaya "Gizlilik Politikası" (ve "Destek") linki ekle: `index.tsx`, tercihen `student-login.tsx` / `admin-login.tsx`. → §3 Adım 2
- [ ] A4. A3 için PR aç, merge et; emülatörde linkin açıldığını doğrula. → §3 Adım 2

**B. İnceleme hesapları**
- [ ] B1. Panelden test öğrencileri oluştur: 0500 000 00 04 ve 0500 000 00 05 (şifresiz, cihaz bağı yok). → §3 Adım 3
- [ ] B2. Google incelemesi için kullanılacak kiosk hesabını belirle. → §3 Adım 3
- [ ] B3. 🧑 Play Console → Sign-in details → kiosk kaydını ekle (şifreyi Yasir yazar) → Save. → §3 Adım 3
- [ ] B4. Veritabanı sıfırlanırsa B1–B2 hesaplarının korunduğunu / yeniden oluşturulduğunu doğrula. → §3 Adım 3

**C. Android build**
- [ ] C1. `eas build -p android --profile production` → `.aab`. → §3 Adım 4
- [ ] C2. `eas credentials -p android` ile upload keystore'un EAS'ta durduğunu ve yedeğinin alınabildiğini doğrula. → §3 Adım 4
- [ ] C3. `bundletool dump manifest` ile paket adı = `com.izmirfen.giris`, `AD_ID` izni yok, beklenmeyen hassas izin yok. → §3 Adım 5

**D. Test grubu**
- [ ] D1. 🧑 Kişisel Google hesabıyla Google Group aç (`Anyone can join`, üyeleri yalnız yöneticiler görsün). → §3 Adım 6
- [ ] D2. Başka bir hesapla gruba katılmayı dene, üye listesinin görünmediğini doğrula. → §3 Adım 6

**E. Mağaza sayfası**
- [ ] E1. Telefon ekran görüntülerini 01→07 sırasına diz, Save. → §3 Adım 7
- [ ] E2. Store settings: iletişim e-postası (ortak adres kararı), website `https://doqrapp.com/destek`, kategori Education. → §3 Adım 7
- [ ] E3. Dashboard'daki "Set up your app" görevlerinin hepsi tamam mı kontrol et. → §3 Adım 7

**F. Kapalı test sürümü**
- [ ] F1. Closed testing track → ülke: Türkiye. → §3 Adım 8
- [ ] F2. Testers → Google Groups → D1'deki grup e-postası → Save; opt-in linkini kaydet. → §3 Adım 8
- [ ] F3. Create new release → `.aab` yükle → release notes → Save. → §3 Adım 8
- [ ] F4. 🧑 Publishing overview özetini Yasir'e göster → onay → **Send changes for review**. → §3 Adım 8
- [ ] F5. Durumun "In review" olduğunu doğrula; onayı takip et. → §3 Adım 8

**G. Kiosk tabletleri**
- [ ] G1. Kurulum yöntemine karar ver (Play üzerinden önerilir; APK seçilirse Bedir'le automatic protection konuşulur). → §3 Adım 9
- [ ] G2. En az bir Android tablette kiosk modu + bir öğrenci telefonuyla uçtan uca okutma testi. → §3 Adım 9

**H. Öğrencilere dağıtım (onaydan sonra)**
- [ ] H1. Öğrenci talimatını yaz (grup linki + opt-in linki + aynı Google hesabı uyarısı). → §3 Adım 10
- [ ] H2. 🧑 Linkleri okul / Sena üzerinden dağıt. → §3 Adım 10
- [ ] H3. En az 12 tester opt-in oldu mu; 14 gün sayacını takip et. → §3 Adım 10
- [ ] H4. 14 gün dolunca Bedir/Özgür'e "production başvurusuna hazır" bildir (başvuruyu sen yapma). → §3 Adım 10

**I. Güvenlik ve veri (3 Kasım'dan önce)**
- [ ] I1. Slack'te paylaşılan panel şifresini değiştir. → §4
- [ ] I2. Postgres 5433'ü kapat / IP kısıtla; prod DB'yi dev'den ayır. → §4
- [ ] I3. Preview build'lerin canlı veriye yazdığı test kayıtlarını temizle veya ayrı test adresi kullan. → §4
- [ ] I4. "Bir eğitim yılı saklanır" ifadesi: silme işi ekle ya da metni okul onayıyla düzelt. → §4
- [ ] I5. (İsteğe bağlı) `/gizlilik`'e silme talebi bölümü ekle → Data safety'de silme linkini gir. → §4

---

## 0. Kurallar (her adımda geçerli)

1. **Production'a asla çıkma.** Yalnızca *Closed testing* track'i kullanılacak. "Apply for production" / "Release to production" yapılmaz; o adım Bedir veya Özgür'ün kararıdır.
2. **İncelemeye göndermeden önce insan onayı al.** Play Console'da *Publishing overview → Send changes for review* düğmesine basmadan önce Yasir'e özet göster ve açık "evet" bekle.
3. **Şifre girme, şifre yazma.** Hiçbir şifreyi dosyaya, commit'e, Slack'e, Play Console alanına sen yazma. Şifre gereken alanlarda dur, Yasir kendisi girsin.
4. **Insider Mobile hesabının diğer uygulamalarına dokunma.** Hesapta "Insider MOB-24355 QA Test" ve "Insider One Live" de var. Sadece **DOQR** üzerinde çalış.
5. **Hesap ayarlarını değiştirme.** Users and permissions, ödeme profili, geliştirici hesabı ayarları kapsam dışı.
6. **Bir adım yetki yüzünden engellenirse** (ör. "You don't have permission"), etrafından dolanma; dur ve Yasir'e "Bedir'den şu izni iste: …" de.
7. Kod değişiklikleri normal PR akışıyla (`main`'e PR) yapılır; force-push yok.

---

## 1. Sabit bilgiler

| Alan | Değer |
|---|---|
| Uygulama adı | DOQR |
| Paket adı | `com.izmirfen.giris` (Play'de oluşturulurken bağlandı, **değiştirilemez**) |
| Play geliştirici hesabı | Insider Mobile (Personal) · ID `7057700211114521033` |
| Play uygulama ID | `4972705766435114472` |
| Play Console uygulama linki | https://play.google.com/console/u/0/developers/7057700211114521033/app/4972705766435114472/app-dashboard |
| Hesap tipi sonucu | **Personal** hesap → production'a çıkmadan önce **en az 12 tester, 14 gün kesintisiz** kapalı test zorunlu |
| Expo projesi | `QrScannerApp/`, EAS `projectId` `8265d614-6583-402a-b466-14087e716c08` (Yasir'in Expo hesabı; Özgür de üye) |
| Sürüm | `app.json` → `1.0.0`; `versionCode` EAS'ta uzaktan (`appVersionSource: remote`, `autoIncrement: true`) |
| API adresi | `https://doqrapp.com` (`eas.json` production + preview) |
| Gizlilik / destek sayfası | `https://doqrapp.com/gizlilik`, `https://doqrapp.com/destek` |
| Yasir'in Play erişimi | Users and permissions daveti kabul edildi, yalnızca DOQR uygulamasını görür. Verilen izinler Bedir tarafından seçildi; bir işlem engellenirse Kural 6. |

---

## 2. Bugüne kadar yapılanlar (Bedir, Play Console)

Bunları **tekrar yapma**, sadece gerekirse kontrol et.

| Bölüm | Durum | İçerik |
|---|---|---|
| Uygulama oluşturma | ✅ | DOQR · Türkçe (tr-TR) · App · Free. "Automatic protection" açık bırakıldı (bkz. Adım 9). |
| Privacy policy | ✅ | `https://doqrapp.com/gizlilik` girildi. |
| Ads | ✅ | Reklam yok. |
| Financial features / Health apps | ✅ | Yok / Yok. |
| Advertising ID | ✅ | "No". Bağımlılıklarda reklam/Firebase/takip SDK'sı yok. AAB çıkınca doğrula (Adım 5). |
| Government apps | ✅ | "Not a government app". |
| Target audience | ✅ | 13–15, 16–17, 18+. (13 yaş altı seçilmedi → Families politikası yok.) |
| Content rating | ✅ | "All other app types", tüm sorular "No". Sonuç IARC 3+, PEGI 3, ESRB Everyone. |
| Data safety | ✅ | Veri toplanıyor, HTTPS ile şifreli, hesaplar okul tarafından açılıyor ("My app does not allow users to create an account" + "accounts created outside the app: school administration"). Toplanan: e-posta, telefon (App functionality + Account management), cihaz kimliği, *App activity → Other actions* = giriş-çıkış kayıtları (App functionality + Fraud prevention). Hiçbiri "shared" değil. İsteğe bağlı silme-talebi linki boş. |
| Sign-in details | ⚠️ Geçici | "Student account": `+90 500 000 00 04`, şifre boş, açıklama: ilk girişte şifre oluşturulur, ikinci cihazda `+90 500 000 00 05`. **Bu numaralar henüz sistemde yok → Adım 3.** Kiosk hesabı eklenmedi → Adım 3. "Google'ın bu bilgilerle cihaz testi" seçeneği **kapalı** (açılırsa numaralar ilk test cihazına bağlanır). |
| Mağaza sayfası (Default store listing) | ⚠️ Taslak | Kısa/uzun açıklama (Türkçe), 512×512 ikon, 1024×500 feature graphic, 7 telefon ekran görüntüsü (Özgür'ün görüntüleri, 9:16'ya genişletildi). **Görüntülerin sırası karışık** → Adım 7. |
| PR #12 (iOS mağaza hazırlığı) | ✅ merge | 20 Ekim 12:57 UTC `main`'e alındı (`7acd475`). |

---

## 3. Kalan işler (sırayla)

### Adım 1 · AdminPanel'i yayına al (gizlilik ve destek sayfaları)
- **Sorun:** PR #12 merge edildi ama `https://doqrapp.com/gizlilik` ve `/destek` **404** dönüyor (20 Ekim'de kontrol edildi). Sunucuya yeni sürüm yüklenmemiş.
- **Yap:** `CANLIYA_ALMA.md`'deki dağıtım adımlarıyla AdminPanel'i `doqrapp.com`'a yeniden yükle.
- **Bitti sayılır:** `curl -s -o /dev/null -w "%{http_code}" https://doqrapp.com/gizlilik` ve `/destek` → `200`. Sayfa içeriği tarayıcıda açılıyor, giriş istemiyor.

### Adım 2 · Uygulamanın içine gizlilik linki ekle (kod)
- **Neden:** Google, gizlilik politikası linkinin mağazanın yanında **uygulamanın içinde de** olmasını istiyor. Şu an kodda yok (yalnızca `Linking.openSettings` / Bluetooth intent'leri var). Yoksa inceleme bu yüzden reddedilebilir.
- **Yap:** `QrScannerApp/src/app/index.tsx` açılış ekranının altına (ve tercihen `student-login.tsx` / `admin-login.tsx` altına) küçük bir "Gizlilik Politikası" bağlantısı ekle; `Linking.openURL("https://doqrapp.com/gizlilik")`. Mevcut `components/ui.tsx` stilini kullan. İstersen yanına "Destek" (`/destek`) da ekle.
- PR aç → merge et. Bu değişiklik iOS'un bir sonraki build'ine de girer.
- **Bitti sayılır:** Android emülatörde açılış ekranındaki link tarayıcıda `doqrapp.com/gizlilik` sayfasını açıyor (Adım 1 bitmiş olmalı).

### Adım 3 · İnceleme hesaplarını hazırla
1. AdminPanel'den (`https://doqrapp.com/ogrenciler`) iki test öğrencisi oluştur: **0500 000 00 04** ve **0500 000 00 05**. **Şifre belirleme, cihaz bağlama** (ilk girişte kullanıcı şifre oluşturacak şekilde kalsın). İsimleri ör. "Google Review 1/2".
2. Google incelemesi için bir **kiosk (kapı tableti) hesabı** belirle (mevcut demo kiosk hesabı olabilir).
3. 🧑 İNSAN: Play Console → *Policy and programmes → App content → Sign-in details* → **Add details**:
   - Name: `Kiosk (door tablet) account`
   - Username: kiosk hesabının e-postası
   - Password: **Yasir kendisi girer**
   - Any other information (İngilizce, ≤500 karakter), örnek:
     ```
     Door tablet (kiosk) mode. Tap "Yonetici girisi (kiosk)", sign in, choose a door. The tablet shows a rotating QR code and broadcasts a Bluetooth signal. A student phone (see Student account) scans this QR near the tablet. Full scanning needs two devices and an Android tablet; iOS kiosks cannot broadcast Bluetooth.
     ```
   - Ardından sayfayı **Save**.
4. Yasir'in planı veritabanını sıfırlamaktı: **sıfırlamada bu iki numara ve kiosk hesabı korunmalı**, inceleme süresince silinmemeli. Sıfırlama gerekirse bu hesapları yeniden oluştur.
- **Bitti sayılır:** Sign-in details'te iki kayıt var (Student + Kiosk). Bir emülatörde 0500 000 00 04 ile ilk giriş "şifre oluştur" ekranına götürüyor. (Test ettiysen o numaranın cihaz bağını panelden sıfırla.)

### Adım 4 · Android AAB build
- Ön koşul: Adım 2 merge edilmiş olmalı.
- `cd QrScannerApp && eas build -p android --profile production`
- Çıktı `.aab` olmalı (production profilinde `buildType` yok → varsayılan AAB). `preview` / `kiosk-lan` APK üretir, Play'e **yüklenmez**.
- Upload anahtarı ilk Android build'inde EAS'ta (Yasir'in Expo hesabında) oluşur. `eas credentials -p android` ile yedeğinin alınabildiğini kontrol et; anahtar kaybolursa güncelleme yüklenemez (Play App Signing kurtarma süreci gerekir).
- **Bitti sayılır:** EAS build "finished", `.aab` indirildi.

### Adım 5 · AAB kontrolü (yüklemeden önce)
- `bundletool dump manifest --bundle <dosya>.aab | grep -E 'package=|versionCode|AD_ID|uses-permission'`
  - `package="com.izmirfen.giris"` olmalı.
  - `com.google.android.gms.permission.AD_ID` **olmamalı** (Advertising ID beyanı "No"). Varsa dur, Yasir'e bildir.
  - İzinlerde CAMERA, BLUETOOTH_* var; beklenmeyen hassas izin (konum, kişiler vb.) varsa dur ve bildir.
- **Bitti sayılır:** Çıktı yukarıdakilerle uyumlu.

### Adım 6 · Google Group (test kullanıcıları)
- 🧑 İNSAN veya tarayıcı otomasyonu: https://groups.google.com → **Create group**
  - Ad: `DOQR Testers` (veya `doqr-izmirfen-testers`), e-posta: grubun adresi (ör. `doqr-izmirfen-testers@googlegroups.com`).
  - Grup bir **Gmail/kişisel Google hesabıyla** açılmalı; kurumsal Workspace grupları dış (gmail) üyeleri engelleyebilir.
  - Ayarlar: **Who can join: Anyone on the web can ask/join** → "Anyone can join" seç. **Who can view members: Group managers** (öğrenci e-postaları görünmesin). Who can post: Group managers.
- **Bitti sayılır:** Başka bir Google hesabıyla grup sayfasından "Join group" yapılabiliyor; üye listesini görmüyor.

### Adım 7 · Mağaza sayfası son düzeltmeler
- *Grow users → Store presence → Store listings → Default store listing*:
  - Telefon ekran görüntülerini sürükleyip bu sıraya koy: 01 Açılış · 02 Öğrenci girişi · 03 Şifre oluşturma · 04 Öğrenci ana sayfa · 05 Yönetici girişi · 06 Kiosk seçimi · 07 Kiosk QR.
  - Save.
- *Store settings* (mağaza iletişim bilgileri): **Email** = herkese açık destek adresi. Şu an kodda `yasir.ozcan@insiderone.com` var; ortak bir adres seçildiyse onu gir. Website: `https://doqrapp.com/destek`. Category: **Education**.
- **Bitti sayılır:** Dashboard'daki "Set up your app" görevlerinde store listing/store settings tamamlanmış.

### Adım 8 · Closed testing sürümü
1. *Test and release → Testing → Closed testing* → varsayılan track (genelde "Closed testing - Alpha") → **Manage track**.
2. **Countries/regions:** Türkiye.
3. **Testers** sekmesi → **Google Groups** → Adım 6'daki grup e-postasını ekle → Save. Sayfadaki **opt-in linkini** ("Join on the web" / "Join on Android") kopyala.
4. **Create new release** → Adım 4'teki `.aab`'yi yükle. Play App Signing'i kabul et (Google'ın varsayılanı). Release name: `1.0.0 (versionCode)`. Release notes (tr-TR): `İlk kapalı test sürümü.`
5. **Next → Save**. Uyarıları oku; hata varsa düzelt.
6. 🧑 İNSAN ONAYI (Kural 2): *Publishing overview* → değişiklik özetini Yasir'e göster → onay gelirse **Send changes for review**.
- **Bitti sayılır:** Publishing overview'da "In review" görünüyor. İlk inceleme birkaç saatten birkaç güne kadar sürebilir.

### Adım 9 · Kiosk tabletleri
- iOS kiosk Bluetooth yayını yapamıyor → kapı tabletleri **Android** olmalı.
- Seçenek A (önerilen): Tablete okul için açılmış bir Google hesabı ekle, bu hesabı gruba üye yap, DOQR'u Play'den kur. "Automatic protection" açık kalabilir.
- Seçenek B: `kiosk-lan` APK'sı ile kurulum. Bu durumda Play'deki *Protected with Play / automatic protection* Play dışı kurulumu Play'e yönlendirebilir (doğrulanmadı) → B seçilirse o ayarı Bedir'le konuşarak kapat.
- **Bitti sayılır:** En az bir kapı tableti kiosk modunda QR gösteriyor, bir öğrenci telefonu okutabiliyor.

### Adım 10 · Onaydan sonra: öğrencilere dağıtım ve 14 gün
1. İnceleme onaylanınca, okul / Sena aracılığıyla öğrencilere **iki link** gönderilir:
   1. Google Group linki → "Gruba katıl" (Play Store'da hangi Google hesabı açıksa onunla).
   2. Opt-in linki → "Tester ol" → ardından Play Store'dan DOQR'u kur.
2. Kısa öğrenci talimatı (Türkçe) hazırla: "Telefondaki Play Store hesabıyla aynı Google hesabını kullanın" uyarısıyla.
3. **14 günlük sayaç**: en az **12 tester** opt-in olduğu andan itibaren 14 gün kesintisiz devam etmeli. Play Console dashboard'unda ilerleme görünür.
4. 14 gün dolunca → "Apply for production" (**Bedir/Özgür yapar**, Kural 1).

---

## 4. Güvenlik ve veri (3 Kasım'dan önce)

| Konu | Yapılacak |
|---|---|
| Panel şifresi Slack'te düz metin paylaşıldı | Şifreyi değiştir. |
| Postgres 5433 portu dışarı açık, dev ve prod aynı DB | Gerçek öğrenci verisi girmeden önce portu kapat / IP kısıtla, prod DB'yi ayır (`CANLIYA_ALMA.md` önerisi). |
| `preview` profili de `https://doqrapp.com`'a bağlanıyor | Test okutmaları canlı veriye düşer; test verisini temizle veya ayrı test adresi kullan. |
| Gizlilik metni: "kayıtlar bir eğitim yılı saklanır" | Kayıtları silen bir iş yok; ya iş ekle ya metni okul onayıyla düzelt. |
| Silme talebi linki (Data safety, isteğe bağlı) | `/gizlilik`'e "Verilerimin silinmesini nasıl isterim" bölümü eklenirse Data safety'de "Yes" + link girilebilir. |
| WhatsApp veli bildirimi | Data safety'de "shared" işaretlenmedi (hizmet sağlayıcı varsayımı). Bildirim bir aracı servis üzerinden değil de farklı bir şekilde gidiyorsa Bedir'e haber ver. |

---

## 5. Takvim

| Tarih | Hedef |
|---|---|
| 20–22 Ekim | Adım 1–5 |
| 22–23 Ekim | Adım 6–8, incelemeye gönderim |
| Onay sonrası | Adım 10: öğrencilere linkler; 12+ tester ile 14 gün başlar |
| **3 Kasım** | Öğrenciler davet linkiyle kullanıyor |
| ~Kasım ortası | 14 gün dolunca production başvurusu (Bedir/Özgür) |

Takılırsan veya bir karar gerekirse: **Bedir Aktaş** (Play Console sahibi), **Özgür Vatansever** (iOS / App Store tarafı).
