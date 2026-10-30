// Öğrenciler: liste (sınıf + soyada göre), kapı bazında durum + manuel giriş-çıkış, arama, cihaz/şifre sıfırlama, öğrenci silme, yeni öğrenci formu ve CSV ile toplu ekleme.
// Tasarım: .superdesign (Superdesign taslağı "Öğrenciler — DOQR palette redesign"); tablo 1280px genişlikte yatay taşmadan sığar.
import { Icon } from "@/components/Icon";
import { listDoorPresence, listKiosks, listStudents, type StudentRow } from "@/lib/db/repo";
import type { Direction, Kiosk } from "@/lib/db/types";
import { requireWebAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/whatsapp";
import { deleteStudentAction, manualEventAction, resetDeviceAction, resetPasswordAction } from "../actions";
import DeleteStudentButton from "./DeleteStudentButton";
import { AddStudentForm, ImportStudentsForm } from "./StudentForms";

export const dynamic = "force-dynamic";

// Arama: ad, soyad, okul no, sınıf, öğrenci/veli adı ve telefonu (telefon "0532 123" gibi boşluklu da yazılabilir).
function matches(s: StudentRow, query: string): boolean {
  const text = [s.firstName, s.lastName, s.schoolNo, s.className, s.phone, s.email ?? "", ...s.guardians.flatMap((g) => [g.fullName, g.phone])].join(" ").toLocaleLowerCase("tr");
  if (text.includes(query.toLocaleLowerCase("tr"))) return true;
  const digits = query.replace(/\D/g, "").replace(/^0/, "");
  return digits.length >= 3 && [s.phone, ...s.guardians.map((g) => g.phone)].some((phone) => phone?.includes(digits));
}

// "+905321234567" → "+90 532 123 45 67" (okunurluk için; başka biçimler olduğu gibi kalır).
function displayPhone(phone: string | null): string {
  return phone?.replace(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/, "+90 $1 $2 $3 $4") ?? "";
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await requireWebAdmin();
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  const [allStudents, kiosks, presence] = await Promise.all([listStudents(), listKiosks(), listDoorPresence()]);
  const students = query ? allStudents.filter((s) => matches(s, query)) : allStudents;
  const doors = kiosks.filter((k) => k.status === "ACTIVE");
  const doorStatus = (studentId: string, kioskId: string) => presence.find((p) => p.studentId === studentId && p.kioskId === kioskId)?.direction ?? null;
  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Öğrenciler</h1>
          <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2.5 text-[13px] font-bold text-slate-600 tabular-nums">{allStudents.length}</span>
        </div>
        <p className="page-sub">
          Öğrenciler uygulamada kayıt olamaz; yalnızca burada tanımlanan telefon numaraları giriş yapabilir. Öğrenci ilk girişte şifresini oluşturur ve hesabı o telefona bağlanır. Şifresini unutan öğrenci için <b>Şifreyi sıfırla</b>, telefon değiştiren öğrenci için <b>Cihazı sıfırla</b>.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <form className="flex min-w-[280px] flex-1 flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" type="search" defaultValue={query} placeholder="Ad, okul no, sınıf, telefon veya veli ara…" aria-label="Öğrenci ara" className="input pl-9" />
          </div>
          <button className="btn btn-primary">
            <Icon name="search" />
            Ara
          </button>
          {query && (
            <a href="/ogrenciler" className="btn btn-secondary">
              <Icon name="x" />
              Temizle
            </a>
          )}
          {query && <span className="text-sm text-slate-500 tabular-nums">{students.length} / {allStudents.length} öğrenci</span>}
        </form>
        <div className="flex items-center gap-3">
          <a href="#csv-ile-ekle" className="btn btn-secondary">
            <Icon name="upload" />
            CSV yükle
          </a>
          <a href="#yeni-ogrenci" className="btn btn-primary">
            <Icon name="userPlus" />
            Öğrenci ekle
          </a>
        </div>
      </div>

      {/* Dar ekranda (tablet/telefon) tablo kart içinde kayar; masaüstünde sütunlar sığacak şekilde daraltıldı. */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Öğrenci</th>
              <th>Veliler</th>
              <th>Kapı durumu</th>
              <th>Cihaz</th>
              <th className="text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td>
                  <div className="font-bold whitespace-nowrap">
                    {s.firstName} {s.lastName}
                  </div>
                  <div className="mt-0.5 text-[13px] whitespace-nowrap text-slate-500">
                    {s.className} · No {s.schoolNo}
                  </div>
                  <div className="mt-1 text-[13px] whitespace-nowrap text-slate-600 tabular-nums">{displayPhone(s.phone)}</div>
                </td>
                <td className="text-[13px]">
                  {s.guardians.length === 0 && <span className="text-slate-400">—</span>}
                  <div className="space-y-1.5">
                    {s.guardians.map((g) => (
                      <div key={g.id}>
                        <div className="font-medium text-slate-900">{g.fullName}</div>
                        <div className="whitespace-nowrap text-slate-500 tabular-nums">{displayPhone(g.phone)}</div>
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="space-y-2">
                    {doors.length === 0 && <span className="text-xs text-slate-400">Kiosk yok</span>}
                    {doors.map((k) => (
                      <DoorStatus key={k.id} studentId={s.id} kiosk={k} status={doorStatus(s.id, k.id)} />
                    ))}
                  </div>
                </td>
                <td>
                  {s.activeDevice ? (
                    <div>
                      <div className="text-[13px] font-medium">{s.activeDevice.platform === "ios" ? "iPhone" : s.activeDevice.platform === "android" ? "Android" : s.activeDevice.platform}</div>
                      <div className="mt-0.5 text-xs whitespace-nowrap text-slate-500 tabular-nums">{formatDateTime(s.activeDevice.boundAt)}</div>
                    </div>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-500">Henüz giriş yapmadı</span>
                  )}
                  {s.activeDevice && !s.passwordHash && (
                    <div className="mt-1">
                      <span className="badge bg-amber-50 text-amber-700">Yeni şifre bekleniyor</span>
                    </div>
                  )}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    {s.passwordHash && (
                      <form action={resetPasswordAction}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <button className="btn-icon" title="Şifreyi sıfırla: şifre silinir, telefon bağlı kalır. Öğrenci aynı telefonda yeni şifre oluşturur." aria-label="Şifreyi sıfırla">
                          <Icon name="key" className="h-[18px] w-[18px]" />
                        </button>
                      </form>
                    )}
                    {s.activeDevice && (
                      <form action={resetDeviceAction}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <button className="btn-icon-danger" title="Cihazı sıfırla: telefon bağlantısı ve şifre silinir; öğrenci yeni telefonunda şifre oluşturur." aria-label="Cihazı sıfırla">
                          <Icon name="smartphone" className="h-[18px] w-[18px]" />
                        </button>
                      </form>
                    )}
                    <form action={deleteStudentAction}>
                      <input type="hidden" name="studentId" value={s.id} />
                      <DeleteStudentButton name={`${s.firstName} ${s.lastName}`} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  {query ? "Aramayla eşleşen öğrenci yok." : "Henüz öğrenci yok."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="yeni-ogrenci" className="card scroll-mt-6 p-6">
          <h2 className="section-title mb-5">Yeni öğrenci ekle</h2>
          <AddStudentForm />
        </section>
        <section id="csv-ile-ekle" className="card flex scroll-mt-6 flex-col p-6">
          <h2 className="section-title mb-5">CSV ile toplu ekle</h2>
          <ImportStudentsForm />
        </section>
      </div>
    </div>
  );
}

// Bir kapıdaki durum + manuel kayıt düğmeleri. Kapıda hiç kaydı yoksa hem giriş hem çıkış seçilebilir.
// Sütunlar sabit genişlikte: düğmeler satırlar arasında hizalı durur. Dar ekranda düğmelerde yalnızca ikon kalır.
function DoorStatus({ studentId, kiosk, status }: { studentId: string; kiosk: Pick<Kiosk, "id" | "name">; status: Direction | null }) {
  const directions: Direction[] = status === "IN" ? ["OUT"] : status === "OUT" ? ["IN"] : ["IN", "OUT"];
  return (
    <div className="grid grid-cols-[6rem_5.75rem_auto] items-center gap-3">
      <span className="truncate text-[13px] font-semibold" title={kiosk.name}>
        {kiosk.name}
      </span>
      <span>
        {status === "IN" && (
          <span className="badge bg-emerald-50 text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            İçeride
          </span>
        )}
        {status === "OUT" && (
          <span className="badge bg-slate-100 text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full border border-slate-500" />
            Dışarıda
          </span>
        )}
        {status === null && <span className="badge bg-slate-100 text-slate-500">Kayıt yok</span>}
      </span>
      <div className="flex gap-1.5">
        {directions.map((direction) => {
          const label = direction === "IN" ? "Giriş" : "Çıkış";
          return (
            <form key={direction} action={manualEventAction}>
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="kioskId" value={kiosk.id} />
              <input type="hidden" name="direction" value={direction} />
              <input type="hidden" name="note" value="Panelden manuel kayıt" />
              <button className="btn btn-secondary btn-sm" title={`Manuel ${label.toLocaleLowerCase("tr")} (telefonunu unutan öğrenci için)`} aria-label={`Manuel ${label.toLocaleLowerCase("tr")}`}>
                <Icon name={direction === "IN" ? "logIn" : "logOut"} className="h-3.5 w-3.5" />
                <span className="hidden min-[1400px]:inline">{label}</span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
