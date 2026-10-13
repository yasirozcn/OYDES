# Canlıya alma — AdminPanel (web paneli + mobil API)

AdminPanel, **veritabanının zaten çalıştığı Lightsail sunucusuna** kurulur (proje sahibinin kararı).
Sunucuda iki ayrı Docker projesi yan yana çalışır:

```
İnternet ──HTTPS 443──▶ caddy (otomatik sertifika) ──▶ app (Next.js, AdminPanel)  ─┐   AdminPanel/deploy/  (proje: izmirfen)
                                                                                      │ Docker ağı "izmirfen-devdb_default", SSL
Ekip bilgisayarları ──SSL 5433──────────────────────────────────────────▶ db (PostgreSQL) infra/dev-db/  (proje: izmirfen-devdb)
```

> **Önemli:** Bu veritabanı aynı zamanda ekibin geliştirme veritabanıdır. Ekip kullanıcısı (`izmirfen_app`) canlı verinin tamamını okuyup değiştirebilir.
> Gerçek öğrenci verisi girmeden önce aşağıdaki "Güvenlik" bölümünü uygulayın.

## 0. Hazırlık (bir kez)

| Ne | Nasıl |
| --- | --- |
| Kod `main`'de | Bu rehberdeki dosyalar (`AdminPanel/Dockerfile`, `AdminPanel/deploy/`) GitHub'a gönderilmiş olmalı; sunucu `git pull` ile çeker |
| Sunucu belleği | 0,5 GB'lık plan Next.js derlemesi için yetmez. **Lightsail → sunucu → Snapshots → Create snapshot** → snapshot'tan **Create new instance** (1 GB / 7 $ veya 2 GB / 12 $) → **Networking → statik IP**'yi yeni sunucuya bağlayın → eski sunucuyu silin. Veritabanı diski snapshot'a dahildir; IP değişmediği için ekip ayarı değişmez. (Plan büyütmeden de swap ile derlenebilir ama yavaştır ve bellek taşabilir) |
| Güvenlik duvarı | **Lightsail → Networking → IPv4 Firewall**: `HTTP 80` ve `HTTPS 443` ekleyin (5433 zaten açık) |
| Adres | Alan adınız varsa DNS'te `A` kaydını statik IP'ye yönlendirin (ör. `giris.okulunuz.com`). Yoksa IP'den üretin: `3.121.45.67` → `3-121-45-67.sslip.io` (ücretsiz, HTTPS çalışır) |

## 1. Sunucuda kurulum

Lightsail → sunucu → **Connect using SSH**:

```bash
cd ~/izmirfen && git pull                         # kodu güncelle
cd infra/dev-db && bash kur.sh                    # veritabanı çalışıyor mu + şemayı uygula (students.phone dahil; veri silmez)
cd ~/izmirfen/AdminPanel/deploy
bash sunucu-hazirla.sh                            # 2 GB swap, saat dilimi, her gece 03:30 yedek
cp .env.example .env && chmod 600 .env
openssl rand -hex 32                              # çıktıyı .env'de AUTH_SECRET= satırına yapıştırın
grep APP_PASSWORD ~/izmirfen/infra/dev-db/.env    # bu değeri DATABASE_URL'deki <APP_PASSWORD> yerine yazın
nano .env                                         # DOMAIN, AUTH_SECRET, DATABASE_URL'yi doldurun → Ctrl+O, Enter, Ctrl+X
docker compose up -d --build                      # ilk derleme 5–15 dk sürebilir
docker compose logs -f app                        # "Ready" görünce Ctrl+C
```

**Panel yöneticisi hesabı** (şifre gizli sorulur, en az 10 karakter):
```bash
docker compose exec -it app node scripts/create-admin.mjs --email yonetici@okulunuz.com --name "Ad Soyad" --role ADMIN
```
Kiosk tableti hesabı da aynı komutla açılır: `--role KIOSK`.

## 2. Kontrol

1. Tarayıcıda `https://<DOMAIN>/api/health` → `"ok": true` ve tablo sayıları.
2. `https://<DOMAIN>/login` → yönetici hesabıyla giriş → Canlı durum sayfası.
3. `https://<DOMAIN>/api/mobile/config` → `{"bleRequired":false,…}`.
4. Sertifika hatası alırsanız: 80/443 güvenlik duvarında açık mı, DNS kaydı doğru IP'yi mi gösteriyor (`docker compose logs caddy`).

## 3. Mobil uygulamayı canlı sunucuya bağlama

`QrScannerApp/.env` → `EXPO_PUBLIC_API_URL=https://<DOMAIN>`. Adres derlemeye gömülür: değiştirdikten sonra uygulamayı yeniden derleyin (`npx expo run:ios --device` / `run:android`, mağaza için EAS).
Canlı adres `https://` olduğu için Android'in düz HTTP izni bu derlemede kapalı kalır (`app.config.ts`).

## 4. Günlük işletme

```bash
cd ~/izmirfen/AdminPanel/deploy
git pull && docker compose up -d --build          # yeni sürümü yayınla (şema değiştiyse önce: cd ~/izmirfen/infra/dev-db && bash kur.sh)
docker compose ps                                 # durum
docker compose logs --tail 100 app                # sunucu logları ([api], [scan], [whatsapp])
bash yedek-al.sh && ls -lh yedek/                 # elle yedek; otomatik yedek her gece 03:30, 14 gün saklanır
```
Yedekleri ara sıra bilgisayarınıza da indirin (Lightsail tarayıcı SSH'sinde dosya indirme menüsü veya `scp`); sunucu kaybolursa sunucudaki yedekler de gider.
Lightsail **otomatik snapshot**'larını da açabilirsiniz (sunucu → Snapshots → Automatic, ~0,05 $/GB/ay).

## 5. Güvenlik (gerçek öğrenci verisinden önce)

- **5433'ü daraltın:** Lightsail Firewall'da 5433 kuralını "Restrict to IP address" ile yalnızca okulun ve ekibin IP'lerine açın. AdminPanel veritabanına Docker ağı üzerinden bağlandığı için 5433'ü tamamen kapatmak paneli bozmaz.
- **Ekip şifresini yenileyin:** Ekipten biri ayrıldığında veya canlıya geçerken `infra/dev-db/README.md` → "Ekip şifresini değiştirmek" → sonra `deploy/.env`'deki `DATABASE_URL`'yi güncelleyip `docker compose up -d`.
- **Test kayıtları:** ekip geliştirirken aynı veritabanına yazar; test kayıtları `TEST …` adlı ve `0500 000 XX XX` telefonlu olmalıdır (kök AGENTS.md §7.1). Okul kullanımı başlayınca ayrı bir canlı veritabanına geçmek en güvenlisidir.
- `deploy/.env` ve `infra/dev-db/.env` yalnızca sunucuda durur; kopyalamayın, sohbete/ekran görüntüsüne koymayın.

## Maliyet (aylık, yaklaşık)

| Kalem | Ücret |
| --- | --- |
| Lightsail 1 GB / 2 GB | 7 $ / 12 $ |
| Statik IP (sunucuya bağlıyken) | 0 $ |
| Otomatik snapshot (isteğe bağlı) | ~1 $ |
| Alan adı (isteğe bağlı) | ~10–15 $/yıl; sslip.io ücretsiz |
