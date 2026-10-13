@AGENTS.md

## AdminPanel'de Claude Code için çalışma notları

AdminPanel'de çalışırken kökteki `../AGENTS.md` (özellikle §0 referans kod, §0.2 farklar, §4–§6 sözleşme, §7.1 ortak veritabanı) ve `../CLAUDE.md` (görev akışı) de geçerlidir.

### Referans dosyası nerede?
- Yalnızca web üzerinden (`WebFetch`): `https://raw.githubusercontent.com/yasirozcn/FenBahceleri/5387bef/AdminPanel/<aynı yol>` (`(panel)` → `%28panel%29`, `[id]` → `%5Bid%5D`). Referans depo **asla** `git clone`/indirme ile bilgisayara çekilmez, diske kaydedilmez (kök AGENTS.md §0.1).
- Bir dosyayı yazmadan önce: referanstaki aynı dosyayı **ve** içe aktardığı `@/lib/...` dosyalarını okuyun. Bu depodaki `src/lib/db/repo.ts` ve `src/lib/db/types.ts`'i okuyun (fonksiyon imzaları buradan alınır).
- Bitirince karşılaştırın: yazdığınız dosyayı GitHub'dan okuduğunuz referans içerikle karşılaştırın (diske yazmadan) — kalan farklar yalnızca kök AGENTS.md §0.2'dekiler olmalı (okul adı/logo, `WRONG_STATE` yok, e2e test, Dockerfile npm vb.) ve prompt'un açıkça istedikleri (§0.3).

### Her görevin sonunda çalıştırın ve çıktıyı raporlayın
```bash
npm run typecheck          # hatasız olmalı
npx eslint src scripts     # uyarısız olmalı
```
Sunucu davranışı değiştiyse (route, scan.ts, actions): `npm run dev` açıkken görevdeki curl / tarayıcı adımlarını uygulayın; uçtan uca test yazıldıysa `npm run test:e2e` tamamen geçmeli.
`npm run dev` zaten açıksa ikinci bir tane başlatmayın; kapatmadan/yeniden başlatmadan önce kullanıcıya sorun. `.env.local` değiştiyse yeniden başlatma gerekir — kullanıcıya söyleyin.

### Bu klasöre özel kurallar
- Görev referansta olmayan bir özellik veya var olan bir özelliğin değişmesini istiyorsa prompt esastır; yalnızca AGENTS.md başındaki "değişmeyenler"e dokunan isteklerde durup onay isteyin (kök AGENTS.md §0.3).
- SQL yalnızca `src/lib/db/repo.ts`'te. Route, sayfa ve Server Action'lar repo fonksiyonu çağırır. Referans görevlerinde `repo.ts`'e yalnızca AGENTS.md §3.2'deki 4 fonksiyon eklenir. Prompt yeni bir özellik istiyorsa mevcut tablolarla çalışan yeni repo fonksiyonu eklenebilir (parametreli SQL, aynı kalıp); şema değişikliği gerekiyorsa durup sorun.
- Her Server Action: `requireWebAdmin()` → doğrulama → repo → `addAudit(...)` (AGENTS.md §4.2'deki işlem adlarıyla) → `revalidatePath(...)`.
- Her mobil route: `handler(...)` + `body(req, zodSchema)` + `ApiError`; mesajlar AGENTS.md §5.2'deki metinlerle **harfi harfine** aynı.
- Veritabanı AWS'de ve ortaktır: veri silen/değiştiren SQL'den önce kullanıcıya etkilenecek satırları gösterip onay alın. Başkasının kayıtlarının şifresini/cihazını değiştirmeyin; denemeler için `TEST <ad>` adlı, `0500 000 XX XX` telefonlu kayıtlar oluşturun ve sonunda silin (kullanıcıya hangi satırları sileceğinizi gösterin).
- Şema değişikliği yok (proje sahibi onayladığı istisna: `students.phone`). `db/schema.sql`, `pg.ts`, `types.ts`, `scripts/db-*.mjs`, `scripts/create-admin.mjs` dosyalarına dokunmayın.
- Next.js 16 API'lerinden emin değilseniz `node_modules/next/dist/docs/` altındaki ilgili kılavuzu okuyun; referans kod bu sürümle çalışır (`cookies()` ve `params` Promise'tir, `useActionState` `react`'tan gelir).
- Paket eklemeyin. Gizli bilgi (`.env.local`) okumayın, göstermeyin.
