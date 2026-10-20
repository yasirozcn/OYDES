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
