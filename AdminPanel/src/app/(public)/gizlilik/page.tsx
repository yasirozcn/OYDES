// DOQR gizlilik politikası (App Store "Privacy Policy URL"). Uygulamanın privacy manifest'i ve App Privacy beyanıyla aynı veri türlerini anlatır.
import type { Metadata } from "next";
import { SCHOOL } from "../school";

export const metadata: Metadata = { title: "Gizlilik Politikası · DOQR" };

const UPDATED_AT = "20 Ekim 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <h1 className="page-title">Gizlilik Politikası</h1>
      <p className="page-sub">
        Bu metin, DOQR okul giriş-çıkış uygulamasının ve bağlı olduğu yönetim sisteminin hangi kişisel verileri neden işlediğini açıklar. Son güncelleme: {UPDATED_AT}.
      </p>

      <Section title="Veri sorumlusu">
        <p>
          Verilerin sorumlusu {SCHOOL.name}&apos;dir. Uygulama, okulun giriş-çıkış kayıtlarını tutmak için kullandığı bir araçtır.
        </p>
      </Section>

      <Section title="İşlenen veriler">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Cep telefonu numarası:</strong> Öğrenci girişi için kullanılır. Numara uygulamada girilir, okulun kayıtlarıyla eşleştirilir.
          </li>
          <li>
            <strong>E-posta adresi:</strong> Yalnızca kapıdaki kiosk tabletinde oturum açan okul görevlisi hesabı için kullanılır.
          </li>
          <li>
            <strong>Cihaz kimliği:</strong> Uygulamanın ilk girişte ürettiği rastgele bir kimliktir. Öğrenci hesabını tek bir telefona bağlamak için kullanılır; reklam kimliği değildir.
          </li>
          <li>
            <strong>Giriş-çıkış kayıtları:</strong> Okutmanın zamanı, hangi kapıda yapıldığı, okutulan QR kod ve okutmanın kapı yanında yapıldığını doğrulayan Bluetooth bilgisi (kioskun yayınladığı kısa ömürlü kod ve sinyal gücü).
          </li>
          <li>
            <strong>Okulun girdiği bilgiler:</strong> Öğrencinin adı, sınıfı ve velisinin iletişim bilgileri uygulamada toplanmaz; okul yönetimi tarafından sisteme girilir.
          </li>
        </ul>
      </Section>

      <Section title="Toplanmayan veriler">
        <p>
          Konum bilgisi toplanmaz; Bluetooth yalnızca kapının yakınında olunduğunu doğrulamak için kullanılır. Kamera yalnızca QR kodu okumak için açılır, fotoğraf kaydedilmez veya gönderilmez. Rehber, fotoğraf arşivi ve benzeri telefon verilerine erişilmez.
        </p>
      </Section>

      <Section title="Verilerin kullanım amacı">
        <p>
          Veriler yalnızca öğrencilerin okula giriş ve çıkışlarını kaydetmek, sahte okutmaları önlemek için cihazı doğrulamak ve okulun velileri bilgilendirmesi için kullanılır. Reklam, analiz veya kullanıcı takibi yapılmaz; veriler satılmaz ve üçüncü kişilerle paylaşılmaz.
        </p>
      </Section>

      <Section title="Saklama ve güvenlik">
        <p>
          Giriş-çıkış kayıtları bir eğitim yılı boyunca saklanır. Veriler Amazon Web Services (AWS) altyapısındaki sunucularda tutulur ve uygulama ile sunucu arasındaki tüm bağlantılar şifrelidir (HTTPS). Şifreler telefonda saklanmaz; sunucuda yalnızca geri çevrilemez biçimde (bcrypt özeti) tutulur.
        </p>
      </Section>

      <Section title="Haklarınız">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesi uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme ve diğer haklarınızı kullanmak için okula başvurabilirsiniz.
        </p>
      </Section>

      <Section title="İletişim">
        <ul className="space-y-1.5">
          <li>
            {SCHOOL.name} —{" "}
            <a href={SCHOOL.website} className="font-semibold text-brand-700 hover:underline">
              {SCHOOL.website.replace("https://", "")}
            </a>
          </li>
          <li>
            Telefon:{" "}
            <a href={SCHOOL.phoneHref} className="font-semibold text-brand-700 hover:underline">
              {SCHOOL.phone}
            </a>
          </li>
          <li>
            E-posta:{" "}
            <a href={`mailto:${SCHOOL.supportEmail}`} className="font-semibold text-brand-700 hover:underline">
              {SCHOOL.supportEmail}
            </a>
          </li>
        </ul>
      </Section>
    </>
  );
}
