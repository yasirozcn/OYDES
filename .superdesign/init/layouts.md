# Layouts

Project: İzmir Fen giriş-çıkış — AdminPanel (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 via @import "tailwindcss" + @theme in globals.css; no component library — custom utility classes .btn/.input/.card/.table/.badge in globals.css; Server Components + Server Actions; Turkish UI). Mobile app QrScannerApp is Expo (out of scope for panel design). Brand logo: QrScannerApp/assets/logo.png.

- `src/app/layout.tsx` root html/body
- `src/app/(panel)/layout.tsx` panel shell: left sidebar (logo box "İF" + school name, NavLinks, admin user box + Çıkış yap) and main content
- `src/app/(panel)/NavLinks.tsx` sidebar nav with inline SVG icons, active state
- `src/app/(public)/layout.tsx` public pages frame

### `AdminPanel/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İzmir Fen · Giriş-Çıkış Paneli",
  description: "Öğrenci giriş-çıkış takip sistemi yönetim paneli",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
```

### `AdminPanel/src/app/(panel)/layout.tsx`

```tsx
import Link from "next/link";
import { requireWebAdmin } from "@/lib/session";
import { logoutAction } from "../login/actions";
import { NavLinks } from "./NavLinks";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireWebAdmin();
  const initials = admin.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:px-6 md:pt-6 md:pb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-brand-600 text-[15px] font-extrabold text-white">İF</span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold">İzmir Fen</span>
              <span className="text-xs text-slate-500">Giriş-Çıkış Paneli</span>
            </span>
          </Link>
        </div>
        <NavLinks />
        <div className="hidden flex-1 md:block" />
        <div className="hidden border-t border-slate-100 px-6 py-4 text-sm md:block">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold">{initials}</span>
            <div className="min-w-0">
              <div className="truncate font-bold">{admin.fullName}</div>
              <div className="truncate text-xs text-slate-500">{admin.email}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="btn btn-secondary mt-3 w-full">Çıkış yap</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-9 md:pt-7 md:pb-12">{children}</main>
    </div>
  );
}
```

### `AdminPanel/src/app/(panel)/NavLinks.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Canlı durum" },
  { href: "/hareketler", label: "Giriş-çıkışlar" },
  { href: "/ogrenciler", label: "Öğrenciler" },
  { href: "/kiosklar", label: "Kiosklar" },
  { href: "/denemeler", label: "Reddedilen okutmalar" },
  { href: "/whatsapp", label: "WhatsApp kayıtları" },
  { href: "/denetim", label: "Denetim kaydı" },
];

// Menü ikonları (yalnızca görünüm; 24×24 çizgi ikon yolları)
const icons: Record<string, string> = {
  "/": "M3 12h4l3-8 4 16 3-8h4",
  "/hareketler": "M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3",
  "/ogrenciler": "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7M22 21v-1a6 6 0 00-4-5.6",
  "/kiosklar": "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  "/denemeler": "M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8",
  "/whatsapp": "M4 5h16v11H8l-4 4z",
  "/denetim": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
};

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Panel menüsü" className="flex gap-0.5 overflow-x-auto px-2 pb-2 md:flex-col md:px-4 md:pb-4">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-[42px] items-center gap-3 rounded-[10px] px-3 text-[15px] whitespace-nowrap ${active ? "bg-brand-50 font-bold text-brand-800" : "font-semibold text-slate-900 hover:bg-slate-100"}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-5 w-5 shrink-0 ${active ? "text-brand-600" : "text-slate-500"}`} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <path d={icons[l.href]} />
            </svg>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

### `AdminPanel/src/app/(public)/layout.tsx`

```tsx
// Herkese açık sayfaların (Destek, Gizlilik) ortak çerçevesi. Giriş gerektirmez; App Store / Google Play bu adreslere bağlanır.
import Link from "next/link";
import { SCHOOL } from "./school";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 md:py-12">
      <header className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-[17px] font-extrabold text-white">İF</span>
        <span className="flex flex-col">
          <span className="font-bold">{SCHOOL.name}</span>
          <span className="text-sm text-slate-500">DOQR · Okul Giriş-Çıkış</span>
        </span>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-6 text-sm text-slate-500">
        <Link href="/destek" className="hover:text-slate-900">Destek</Link>
        <Link href="/gizlilik" className="hover:text-slate-900">Gizlilik Politikası</Link>
        <a href={SCHOOL.website} className="hover:text-slate-900">{SCHOOL.name}</a>
      </footer>
    </div>
  );
}
```

