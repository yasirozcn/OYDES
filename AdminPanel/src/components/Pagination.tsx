// Uzun listelerin sayfalanması (?sayfa=N): sayfa başına PAGE_SIZE kayıt, altta Önceki/Sonraki ve sayfa numaraları.
import Link from "next/link";
import { Icon } from "./Icon";

export const PAGE_SIZE = 50;

/** ?sayfa= değerini 1..totalPages aralığına çeker (geçersizse 1). */
export function pageFrom(raw: string | string[] | undefined, total: number): { page: number; totalPages: number; offset: number } {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(Array.isArray(raw) ? raw[0] : (raw ?? ""), 10) || 1));
  return { page, totalPages, offset: (page - 1) * PAGE_SIZE };
}

// Gösterilecek sayfa numaraları: ilk, son ve geçerli sayfanın iki yanı; aradaki boşluklar "…".
function pageNumbers(page: number, totalPages: number): (number | "…")[] {
  const shown = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  return shown.flatMap((n, i) => (i > 0 && n - shown[i - 1] > 1 ? ["…" as const, n] : [n]));
}

export function Pagination({ path, page, totalPages, total }: { path: string; page: number; totalPages: number; total: number }) {
  const href = (n: number) => (n === 1 ? path : `${path}?sayfa=${n}`);
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  return (
    <nav aria-label="Sayfalar" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500 tabular-nums">
        {total} kayıttan {first}–{last} arası
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={href(page - 1)} className="btn btn-secondary btn-sm" aria-label="Önceki sayfa">
              <Icon name="chevronLeft" className="h-3.5 w-3.5" />
              Önceki
            </Link>
          ) : (
            <span className="btn btn-secondary btn-sm pointer-events-none opacity-40" aria-hidden="true">
              <Icon name="chevronLeft" className="h-3.5 w-3.5" />
              Önceki
            </span>
          )}
          {pageNumbers(page, totalPages).map((n, i) =>
            n === "…" ? (
              <span key={`gap-${i}`} className="px-1.5 text-sm text-slate-400">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                className={`btn btn-sm min-w-9 justify-center tabular-nums ${n === page ? "btn-primary" : "btn-secondary"}`}
              >
                {n}
              </Link>
            ),
          )}
          {page < totalPages ? (
            <Link href={href(page + 1)} className="btn btn-secondary btn-sm" aria-label="Sonraki sayfa">
              Sonraki
              <Icon name="chevronRight" className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="btn btn-secondary btn-sm pointer-events-none opacity-40" aria-hidden="true">
              Sonraki
              <Icon name="chevronRight" className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
