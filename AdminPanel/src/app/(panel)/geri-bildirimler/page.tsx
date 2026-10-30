// Geri bildirimler: öğrencilerin uygulamadan gönderdikleri; "Yapılacak" ve "Tamamlandı" bölümleri. "Tamamlandı" düğmesi kaydı alt bölüme taşır.
import { Icon } from "@/components/Icon";
import { listFeedbacks, type FeedbackRow } from "@/lib/db/repo";
import { requireWebAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/whatsapp";
import { completeFeedbackAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function FeedbacksPage() {
  await requireWebAdmin();
  const feedbacks = await listFeedbacks();
  const todo = feedbacks.filter((f) => f.status === "TODO");
  const done = feedbacks.filter((f) => f.status === "DONE");
  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="page-title">Geri bildirimler</h1>
        <p className="page-sub">Öğrencilerin uygulamadaki &quot;Geri bildirim&quot; düğmesiyle gönderdikleri. İlgilendiğiniz bildirimi <b>Tamamlandı</b> ile kapatın.</p>
      </div>
      <Section title="Yapılacak" rows={todo} empty="Bekleyen geri bildirim yok." />
      <Section title="Tamamlandı" rows={done} empty="Henüz tamamlanan geri bildirim yok." />
    </div>
  );
}

function Section({ title, rows, empty }: { title: string; rows: FeedbackRow[]; empty: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="section-title">{title}</h2>
        <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2.5 text-[13px] font-bold text-slate-600 tabular-nums">{rows.length}</span>
      </div>
      <div className="card divide-y divide-slate-100">
        {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">{empty}</p>}
        {rows.map((f) => (
          <article key={f.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] text-slate-500">
                <span className="text-sm font-bold text-slate-900">
                  {f.student.firstName} {f.student.lastName}
                </span>
                <span>{f.student.className}</span>
                {f.student.phone && <span className="tabular-nums">{f.student.phone}</span>}
                <span className="tabular-nums">· {formatDateTime(f.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-slate-700">{f.message}</p>
            </div>
            {f.status === "TODO" ? (
              <form action={completeFeedbackAction} className="shrink-0">
                <input type="hidden" name="feedbackId" value={f.id} />
                <button className="btn btn-secondary btn-sm">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  Tamamlandı
                </button>
              </form>
            ) : (
              f.completedAt && <span className="badge shrink-0 bg-emerald-50 text-emerald-700">Tamamlandı · {formatDateTime(f.completedAt)}</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
