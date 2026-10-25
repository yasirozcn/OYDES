// Giriş-çıkışlar: son 300 hareket. Hareket inceleme (Uygun/Şüpheli) yok — kök AGENTS.md §0.2.
import { DirectionBadge, SourceBadge } from "@/components/Badges";
import { listEvents } from "@/lib/db/repo";
import { requireWebAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  await requireWebAdmin();
  const events = await listEvents({ limit: 300 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Giriş-çıkışlar</h1>
        <p className="page-sub">Tüm giriş-çıkış kayıtları. Panelden girilen kayıtlar &quot;Manuel&quot; rozetiyle gösterilir.</p>
      </div>

      <div className="card overflow-x-auto rounded-[18px]">
        <table className="table">
          <thead>
            <tr>
              <th>Öğrenci</th>
              <th>Hareket</th>
              <th>Zaman</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-slate-400">
                  Kayıt yok.
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
                  {e.note && <div className="mt-1 text-xs text-violet-700">Not: {e.note}</div>}
                </td>
                <td>
                  <DirectionBadge direction={e.direction} /> <SourceBadge source={e.source} />
                  <div className="mt-1 text-xs text-slate-500">{e.kioskName ?? ""}</div>
                </td>
                <td className="font-mono text-sm tabular-nums">{formatDateTime(e.occurredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
