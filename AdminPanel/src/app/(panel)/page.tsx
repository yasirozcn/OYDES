import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DirectionBadge, SourceBadge } from "@/components/Badges";
import { dashboardStats, listDoorPresence, listEvents, listKiosks } from "@/lib/db/repo";
import { requireWebAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireWebAdmin();
  const [stats, events, kiosks, presence] = await Promise.all([dashboardStats(), listEvents({ limit: 15 }), listKiosks(), listDoorPresence()]);

  // Her kapının giriş-çıkış durumu ayrıdır: kapı başına "içeride" sayısı.
  const doorTiles = kiosks
    .filter((k) => k.status === "ACTIVE")
    .map((k) => ({ label: k.name, inside: presence.filter((p) => p.kioskId === k.id && p.direction === "IN").length }));
  const rejectedAlert = stats.rejectedToday > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="page-title">Canlı durum</h1>
          <p className="page-sub">Kapılara göre içerideki öğrenciler ve son giriş-çıkışlar.</p>
        </div>
        <AutoRefresh seconds={10} />
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {doorTiles.map((d) => (
          <div key={d.label} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-[18px]">
            <div className="text-sm font-bold text-slate-500">{d.label}</div>
            <div className="text-[40px] leading-none font-bold text-brand-600 tabular-nums">{d.inside}</div>
            <div className="text-sm text-slate-500">içeride · {stats.total} öğrenciden</div>
            {stats.total > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-1.5 bg-brand-600" style={{ width: `${Math.round((d.inside / stats.total) * 100)}%` }} />
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-[18px]">
          <div className="text-sm font-bold text-slate-500">Bugünkü hareket</div>
          <div className="text-[40px] leading-none font-bold text-slate-900 tabular-nums">{stats.todayEvents}</div>
          <div className="text-sm text-slate-500">bugün</div>
        </div>
        <div className={`flex flex-col gap-2 rounded-2xl border p-[18px] ${rejectedAlert ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
          <div className={`text-sm font-bold ${rejectedAlert ? "text-red-800" : "text-slate-500"}`}>Reddedilen okutma</div>
          <div className={`text-[40px] leading-none font-bold tabular-nums ${rejectedAlert ? "text-red-800" : "text-slate-900"}`}>{stats.rejectedToday}</div>
          <div className={`text-sm ${rejectedAlert ? "text-red-800" : "text-slate-500"}`}>bugün</div>
        </div>
      </div>

      <section className="card overflow-hidden rounded-[18px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold">Son hareketler</h2>
          <Link href="/hareketler" className="text-sm font-bold text-brand-700 hover:text-brand-800">
            Tümünü gör →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th>Hareket</th>
                <th>Zaman</th>
                <th>Kiosk</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    Henüz giriş-çıkış yok. Mobil uygulamada yönetici girişiyle kiosk ekranını açıp bir öğrenci hesabıyla QR okutun.
                  </td>
                </tr>
              )}
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="font-bold whitespace-nowrap">
                      {e.student.firstName} {e.student.lastName}
                    </div>
                    <div className="text-[13px] whitespace-nowrap text-slate-500">
                      {e.student.className} · No {e.student.schoolNo}
                    </div>
                  </td>
                  <td>
                    <DirectionBadge direction={e.direction} /> <SourceBadge source={e.source} />
                  </td>
                  <td className="font-mono text-sm tabular-nums">{formatDateTime(e.occurredAt)}</td>
                  <td className="text-slate-500">{e.kioskName ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
