// DOQR uygulamasının destek sayfası (App Store "Support URL"). Statik metin; veritabanı okumaz.
import type { Metadata } from "next";
import { SCHOOL } from "../school";

export const metadata: Metadata = { title: "Destek · DOQR" };

const FAQ = [
  {
    q: "Uygulamaya nasıl giriş yaparım?",
    a: "\"Öğrenci girişi\"ne dokunun ve okulun sisteme kaydettiği cep telefonu numaranızı girin. İlk girişte kendi şifrenizi oluşturursunuz; sonraki girişlerde bu şifreyi kullanırsınız. Uygulama içinden hesap açılmaz.",
  },
  {
    q: "Numaram bulunamadı ya da giriş yapamıyorum.",
    a: "Numaranızın okul kayıtlarında doğru yazıldığından emin olmak için okul yönetimine başvurun. Şifrenizi unuttuysanız şifre sıfırlamayı da okul yönetimi yapar.",
  },
  {
    q: "Telefonumu değiştirdim.",
    a: "Güvenlik için her öğrenci hesabı tek bir telefona bağlıdır. Yeni telefonda giriş yapabilmeniz için okul yönetiminden cihaz sıfırlaması isteyin; ardından yeni telefonda şifrenizi baştan oluşturursunuz.",
  },
  {
    q: "Kamera ve Bluetooth izni neden gerekiyor?",
    a: "Kamera yalnızca kapıdaki ekranda görünen QR kodu okutmak için kullanılır. Bluetooth, okutmayı yaparken gerçekten kapının yanında olduğunuzu doğrular. Konum bilginiz toplanmaz.",
  },
  {
    q: "Kapıdaki kiosk ekranı için hangi cihaz gerekir?",
    a: "Kiosk ekranı için Android tablet kullanılmalıdır. Bluetooth doğrulaması için gereken yayını yalnızca Android tabletler yapabilir; iPhone ve iPad kiosk ekranını gösterebilir ancak Bluetooth yayını yapamaz.",
  },
];

export default function SupportPage() {
  return (
    <>
      <h1 className="page-title">Destek</h1>
      <p className="page-sub">
        DOQR, {SCHOOL.name} öğrencilerinin okula giriş ve çıkışlarını kapıdaki QR kodu okutarak kaydetmesini sağlayan uygulamadır.
      </p>

      <section className="mt-8 space-y-3">
        {FAQ.map((item) => (
          <div key={item.q} className="card p-5">
            <h2 className="font-bold">{item.q}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{item.a}</p>
          </div>
        ))}
      </section>

      <section className="card mt-8 p-5">
        <h2 className="text-lg font-bold">İletişim</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-slate-600">
          <li>
            E-posta:{" "}
            <a href={`mailto:${SCHOOL.supportEmail}`} className="font-semibold text-brand-700 hover:underline">
              {SCHOOL.supportEmail}
            </a>
          </li>
          <li>
            Okul telefonu:{" "}
            <a href={SCHOOL.phoneHref} className="font-semibold text-brand-700 hover:underline">
              {SCHOOL.phone}
            </a>
          </li>
          <li>
            Okul web sitesi:{" "}
            <a href={SCHOOL.website} className="font-semibold text-brand-700 hover:underline">
              {SCHOOL.website.replace("https://", "")}
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}
