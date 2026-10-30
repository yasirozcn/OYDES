import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
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
          <Link href="/" className="flex items-center gap-3">
            {/* Uygulamayla aynı logo (QrScannerApp/assets/logo.png → public/logo.png) */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-slate-100 bg-white p-1">
              <Image src="/logo.png" alt="DOQR logosu" width={32} height={32} priority />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] leading-tight font-bold">İzmir Fen</span>
              <span className="text-xs font-medium text-slate-500">Giriş-Çıkış Paneli</span>
            </span>
          </Link>
        </div>
        <NavLinks />
        <div className="hidden flex-1 md:block" />
        <div className="hidden border-t border-slate-100 px-4 py-4 text-sm md:block">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-800">{initials}</span>
            <div className="min-w-0">
              <div className="truncate font-bold">{admin.fullName}</div>
              <div className="truncate text-xs text-slate-500">{admin.email}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="btn btn-secondary mt-3 w-full">
              <Icon name="logOut" />
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
