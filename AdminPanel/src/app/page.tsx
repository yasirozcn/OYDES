// GEÇİCİ başlangıç sayfası: ortak veritabanına bağlantıyı gösterir.
// Panel sayfaları geliştirildiğinde (Canlı durum vb.) bu sayfanın yerini alır.
import { dbHealth } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

async function load() {
  try {
    // Sunucu bileşeni veriyi doğrudan repo fonksiyonuyla okur (tarayıcıya veritabanı bilgisi gitmez).
    return { ok: true as const, health: await dbHealth() };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function Home() {
  const r = await load();
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">İzmir Fen · Giriş-Çıkış</h1>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        {r.ok ? (
          <>
            <p className="font-medium text-emerald-700">Ortak veritabanına bağlı · {r.health.latencyMs} ms</p>
            <p className="text-sm text-slate-500">
              Sunucu saati:test {new Date(r.health.serverTime).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
            </p>
            <table className="mt-4 text-sm">
              <tbody>
                {Object.entries(r.health.counts).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1 pr-6 text-slate-600">{k}</td>
                    <td className="font-semibold tabular-nums">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <p className="font-medium text-red-700">Veritabanına bağlanılamadı</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{r.error}</pre>
            <p className="mt-2 text-sm text-slate-500">
              Terminalde <code>npm run db:check</code> çalıştırın.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
