"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Canlı durum", icon: "dashboard" },
  { href: "/hareketler", label: "Giriş-çıkışlar", icon: "arrowUpDown" },
  { href: "/ogrenciler", label: "Öğrenciler", icon: "users" },
  { href: "/kiosklar", label: "Kiosklar", icon: "qr" },
  { href: "/denemeler", label: "Reddedilen okutmalar", icon: "shieldAlert" },
  { href: "/whatsapp", label: "WhatsApp kayıtları", icon: "message" },
  { href: "/denetim", label: "Denetim kaydı", icon: "clipboard" },
];

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
            className={`flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm whitespace-nowrap transition-colors ${active ? "bg-brand-50 font-semibold text-brand-800" : "font-medium text-slate-600 hover:bg-slate-100"}`}
          >
            <Icon name={l.icon} className={`h-5 w-5 ${active ? "text-brand-600" : "text-slate-500"}`} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
