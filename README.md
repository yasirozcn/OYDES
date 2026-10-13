# İzmir Fen — Okul Giriş-Çıkış Sistemi

Öğrencinin okula giriş ve çıkışını, kiosk ekranındaki dönen QR kod + Bluetooth yakınlık doğrulamasıyla kaydeden sistem.

| Klasör | İçerik | Durum |
| --- | --- | --- |
| [`AdminPanel/`](AdminPanel) | Next.js: yönetici web paneli + mobil API | Şablon hazır (Next.js 16, tüm bağımlılıklar, veritabanı katmanı, bağlantı testi sayfası, `/api/health`); uç noktalar ve sayfalar geliştirilecek |
| [`QrScannerApp/`](QrScannerApp) | Expo (React Native): öğrenci + kiosk uygulaması | Şablon hazır (Expo SDK 57, tüm bağımlılıklar, bağlantı testi ekranı); ekranlar geliştirilecek |
| [`infra/dev-db/`](infra/dev-db) | AWS'deki ortak geliştirme veritabanı | Proje sahibi kurar |

**Önce okuyun:** [`AGENTS.md`](AGENTS.md) — protokol, API sözleşmesi, iş kuralları (bağlayıcıdır).

## Veritabanı nerede, nasıl bağlanılır?

Veritabanı **kimsenin bilgisayarında değildir**. Herkes AWS'deki **ortak geliştirme veritabanına** bağlanır:

```
 Telefon ──▶ sizin AdminPanel'iniz (npm run dev) ──SSL──▶ AWS PostgreSQL (ortak, port 5433)
 Tarayıcı ─┘                                      ▲
 TablePlus / DBeaver (isteğe bağlı) ──────SSL─────┘
```

1. Proje sahibinden **veritabanı adresini ve şifresini** özel kanaldan isteyin (depoda yoktur).
2. Bağlantıyı ayarlayın:
   ```bash
   cd AdminPanel
   npm install
   cp .env.example .env.local      # DATABASE_URL'yi doldurun; AUTH_SECRET için kendi anahtarınızı üretin: openssl rand -hex 32 (AGENTS.md §5.1)
   npm run db:check
   ```
   Beklenen çıktı:
   ```
   Bağlandı (45 ms): izmirfen_app@izmirfen · PostgreSQL 17.x · SSL: açık
   Tablolar (11): admin_users, attendance_events, audit_logs, devices, guardians, kiosks, permissions, scan_attempts, student_guardians, students, wp_messages
   Şema değiştirme yetkisi: yok (ekip kullanıcısı — beklenen)
   ```
3. Uygulamayı çalıştırın: `npm run dev` → http://localhost:3000 "Ortak veritabanına bağlı" ve satır sayıları; http://localhost:3000/api/health → JSON.

### Kodda veritabanına istek atmak

Tüm SQL `AdminPanel/src/lib/db/repo.ts` içindedir. Sayfa, Server Action veya API route bir repo fonksiyonunu çağırır:

```ts
// AdminPanel/src/app/api/health/route.ts (depoda hazır örnek)
import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db/repo";

export async function GET() {
  return NextResponse.json({ db: "ok", ...(await dbHealth()) });
}
```
```ts
// AdminPanel/src/lib/db/repo.ts — yeni sorgu böyle eklenir (her zaman parametreli)
export async function getStudent(id: string): Promise<Student | null> {
  return first(await q<Student>("SELECT * FROM students WHERE id = $1", [id]));
}
```
Ayrıntı ve kurallar: [`AdminPanel/AGENTS.md`](AdminPanel/AGENTS.md) §2–§3, kök [`AGENTS.md`](AGENTS.md) §7.1.

### Kurallar (kısa)

- Veritabanı **ortak**: yazdığınızı herkes görür. Başkasının verisini silmeyin; test verinizi tanınır yapın (`test+adınız-…@izmirfen.test`) ve temizleyin.
- Ekip kullanıcısı tablo oluşturamaz/silemez. Şema değişikliği → `AdminPanel/db/schema.sql` PR'ı → proje sahibi uygular.
- `DATABASE_URL` ve şifre **hiçbir yere** yazılmaz (kod, commit, Jira, sohbet, ekran görüntüsü). Yalnızca `.env.local`.
- Bu veritabanı canlı değildir; gerçek öğrenci verisi girilmez.

### Sorun giderme

| `npm run db:check` çıktısı | Neden |
| --- | --- |
| `timeout` / `ECONNREFUSED` | Adres/port yanlış, sunucuda 5433 güvenlik duvarında kapalı ya da ağınız 5433'ü engelliyor (okul/şirket ağı) — farklı ağdan deneyin |
| `no pg_hba.conf entry … no encryption` | `.env.local`'de `DATABASE_SSL=true` yok |
| `password authentication failed` | Şifre yanlış / değiştirilmiş |
| `self-signed certificate` | `DATABASE_SSL_REJECT_UNAUTHORIZED=false` yok |
| `permission denied for schema public` | Şema değiştirmeye çalışıyorsunuz (yalnızca proje sahibi) |
| `too many clients` / `too many connections` | Açık kalmış `npm run dev` süreçlerini kapatın; `DATABASE_POOL_MAX=3` |
