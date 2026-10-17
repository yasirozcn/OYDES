import type { AttendanceEvent } from "@/lib/db/types";

export function DirectionBadge({ direction }: { direction: AttendanceEvent["direction"] }) {
  return direction === "IN" ? (
    <span className="badge bg-emerald-50 text-emerald-700"><span aria-hidden="true">→</span>Giriş</span>
  ) : (
    <span className="badge bg-sky-50 text-sky-700"><span aria-hidden="true">←</span>Çıkış</span>
  );
}

export function SourceBadge({ source }: { source: AttendanceEvent["source"] }) {
  if (source === "APP") return null;
  return <span className="badge bg-violet-50 text-violet-700">{source === "MANUAL" ? "Manuel" : "Çevrimdışı"}</span>;
}
