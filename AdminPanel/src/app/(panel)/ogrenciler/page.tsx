// Öğrenciler: liste (sınıf + soyada göre), kapı bazında durum + manuel giriş-çıkış, cihaz/şifre sıfırlama ve yeni öğrenci formu.
import { listDoorPresence, listKiosks, listStudents } from "@/lib/db/repo";
import type { Direction, Kiosk } from "@/lib/db/types";
import { requireWebAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/whatsapp";
import { manualEventAction, resetDeviceAction, resetPasswordAction } from "../actions";
import { AddStudentForm } from "./StudentForms";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  await requireWebAdmin();
  const [students, kiosks, presence] = await Promise.all([listStudents(), listKiosks(), listDoorPresence()]);
  const doors = kiosks.filter((k) => k.status === "ACTIVE");
  const doorStatus = (studentId: string, kioskId: string) => presence.find((p) => p.studentId === studentId && p.kioskId === kioskId)?.direction ?? null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Öğrenciler</h1>
        <p className="page-sub">
          Öğrenciler uygulamada kayıt olamaz; yalnızca burada tanımlanan telefon numaraları giriş yapabilir. Öğrenci ilk girişte şifresini oluşturur ve hesabı o telefona bağlanır. Şifresini unutan öğrenci için <b>Şifreyi sıfırla</b>, telefon değiştiren öğrenci için <b>Cihazı sıfırla</b>.
        </p>
      </div>

      <div className="card overflow-x-auto rounded-[18px]">
        <table className="table">
          <thead>
            <tr>
              <th>Öğrenci</th>
              <th>Telefon</th>
              <th>Veli</th>
              <th>Durum</th>
              <th>Cihaz</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="font-bold whitespace-nowrap">
                    {s.firstName} {s.lastName}
                  </div>
                  <div className="text-[13px] whitespace-nowrap text-slate-500">
                    {s.className} · No {s.schoolNo}
                  </div>
                </td>
                <td className="whitespace-nowrap text-slate-600">{s.phone}</td>
                <td className="text-xs text-slate-600">
                  {s.guardians.map((g) => (
                    <div key={g.id}>
                      {g.fullName} · {g.phone}
                    </div>
                  ))}
                </td>
                <td>
                  <div className="space-y-1.5">
                    {doors.length === 0 && <span className="text-xs text-slate-400">Kiosk yok</span>}
                    {doors.map((k) => (
                      <DoorStatus key={k.id} studentId={s.id} kiosk={k} status={doorStatus(s.id, k.id)} />
                    ))}
                  </div>
                </td>
                <td className="text-xs">
                  {s.activeDevice ? (
                    <div>
                      <div className="font-medium text-slate-700">{s.activeDevice.platform === "ios" ? "iPhone" : s.activeDevice.platform === "android" ? "Android" : s.activeDevice.platform}</div>
                      <div className="text-slate-400">{formatDateTime(s.activeDevice.boundAt)}</div>
                    </div>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-500">Henüz giriş yapmadı</span>
                  )}
                  {s.activeDevice && !s.passwordHash && <div className="mt-1"><span className="badge bg-amber-50 text-amber-700">Yeni şifre bekleniyor</span></div>}
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {s.passwordHash && (
                      <form action={resetPasswordAction}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <button className="btn btn-secondary" title="Şifreyi siler; telefon bağlı kalır. Öğrenci aynı telefonda yeni şifre oluşturur.">
                          Şifreyi sıfırla
                        </button>
                      </form>
                    )}
                    {s.activeDevice && (
                      <form action={resetDeviceAction}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <button className="btn btn-danger" title="Telefon bağlantısını ve şifreyi siler; öğrenci yeni telefonunda şifre oluşturarak giriş yapar.">
                          Cihazı sıfırla
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card p-5 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Yeni öğrenci ekle</h2>
        <AddStudentForm />
      </section>
    </div>
  );
}

// Bir kapıdaki durum + manuel kayıt düğmesi. Kapıda hiç kaydı yoksa hem giriş hem çıkış seçilebilir.
function DoorStatus({ studentId, kiosk, status }: { studentId: string; kiosk: Pick<Kiosk, "id" | "name">; status: Direction | null }) {
  const directions: Direction[] = status === "IN" ? ["OUT"] : status === "OUT" ? ["IN"] : ["IN", "OUT"];
  return (
    <div className="flex items-center gap-2 text-xs whitespace-nowrap">
      <span className="font-bold text-slate-700">{kiosk.name}</span>
      {status === "IN" && <span className="badge bg-emerald-50 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-600" />İçeride</span>}
      {status === "OUT" && <span className="badge bg-slate-100 text-slate-500"><span className="h-2 w-2 rounded-full border-2 border-slate-400" />Dışarıda</span>}
      {status === null && <span className="badge bg-slate-100 text-slate-400">Kayıt yok</span>}
      {directions.map((direction) => (
        <form key={direction} action={manualEventAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="kioskId" value={kiosk.id} />
          <input type="hidden" name="direction" value={direction} />
          <input type="hidden" name="note" value="Panelden manuel kayıt" />
          <button className="btn btn-secondary h-7 px-2 text-xs" title="Telefonunu unutan öğrenci için">
            Manuel {direction === "IN" ? "giriş" : "çıkış"}
          </button>
        </form>
      ))}
    </div>
  );
}
