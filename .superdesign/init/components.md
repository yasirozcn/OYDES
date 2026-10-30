# Components

Project: İzmir Fen giriş-çıkış — AdminPanel (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 via @import "tailwindcss" + @theme in globals.css; no component library — custom utility classes .btn/.input/.card/.table/.badge in globals.css; Server Components + Server Actions; Turkish UI). Mobile app QrScannerApp is Expo (out of scope for panel design). Brand logo: QrScannerApp/assets/logo.png.

Shared primitives are CSS classes in `AdminPanel/src/app/globals.css` (see theme.md): `.btn` `.btn-primary` `.btn-secondary` `.btn-danger` `.input` `.card` `.table` `.badge` `.page-title` `.page-sub`. React shared components:

- `Badges.tsx` — DirectionBadge (Giriş/Çıkış), SourceBadge (Manuel/Çevrimdışı)
- `AutoRefresh.tsx` — client router.refresh interval (no UI)
- Delete confirm buttons (client, window.confirm)

### `AdminPanel/src/components/Badges.tsx`

```tsx
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
```

### `AdminPanel/src/components/AutoRefresh.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sayfayı belirli aralıklarla sunucudan yeniler (1. aşama; ileride WebSocket ile anlık). */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span className="h-2 w-2 rounded-full bg-brand-600 ring-4 ring-brand-50" />
      {seconds} sn&apos;de bir yenilenir
    </span>
  );
}
```

### `AdminPanel/src/app/(panel)/ogrenciler/DeleteStudentButton.tsx`

```tsx
"use client";

// Öğrenci silme düğmesi: tarayıcı onay penceresinde "Vazgeç" seçilirse form gönderilmez.
export default function DeleteStudentButton({ name }: { name: string }) {
  return (
    <button
      className="btn btn-danger"
      onClick={(e) => {
        if (!window.confirm(`"${name}" kalıcı olarak silinsin mi? Öğrencinin giriş-çıkış geçmişi ve WhatsApp kayıtları da silinir; bu işlem geri alınamaz.`)) e.preventDefault();
      }}
    >
      Sil
    </button>
  );
}
```

### `AdminPanel/src/app/(panel)/kiosklar/DeleteKioskButton.tsx`

```tsx
"use client";

// Kiosk silme düğmesi: tarayıcı onay penceresinde "Vazgeç" seçilirse form gönderilmez.
export default function DeleteKioskButton({ name }: { name: string }) {
  return (
    <button
      className="btn btn-danger"
      onClick={(e) => {
        if (!window.confirm(`"${name}" kiosku kalıcı olarak silinsin mi? Geçmiş kayıtlar korunur, ancak bu kiosk geri getirilemez.`)) e.preventDefault();
      }}
    >
      Sil
    </button>
  );
}
```

