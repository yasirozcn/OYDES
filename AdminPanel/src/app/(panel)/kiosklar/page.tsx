// Kiosklar: kiosk listesi (durum, son sinyal, WhatsApp bildirimi, devre dışı bırakma, silme), yeni kiosk ve kiosk tablet hesapları.
import { listKioskAccounts, listKiosks } from "@/lib/db/repo";
import { requireWebAdmin } from "@/lib/session";
import { formatDateTime } from "@/lib/whatsapp";
import { createKioskAction, deleteKioskAction, toggleKioskAction, toggleKioskWhatsAppAction } from "../actions";
import { AddKioskAccountForm, ResetKioskPasswordForm } from "./AccountForms";
import DeleteKioskButton from "./DeleteKioskButton";

export const dynamic = "force-dynamic";

// Kiosk ekranı açıkken sunucuya düzenli istek atar; son 60 saniyede sinyal varsa çevrimiçi sayılır.
const ONLINE_WINDOW_MS = 60_000;

function isOnline(lastSeenAt: string | null) {
  return !!lastSeenAt && Date.now() - Date.parse(lastSeenAt) < ONLINE_WINDOW_MS;
}

export default async function KiosksPage() {
  await requireWebAdmin();
  const [kiosks, accounts] = await Promise.all([listKiosks(), listKioskAccounts()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Kiosklar</h1>
        <p className="page-sub">
          Kiosk yönsüzdür: aynı QR hem giriş hem çıkış için okutulur. Öğrenci ilk okutmada yönü seçer; sonrasında sistem okuldaysa çıkış, dışarıdaysa giriş kaydeder. Tablette uygulamayı açıp &quot;Yönetici girişi&quot; ile oturum açın ve kioskunu seçin.
        </p>
      </div>

      <div className="card overflow-x-auto rounded-[18px]">
        <table className="table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Durum</th>
              <th>Son sinyal</th>
              <th>WhatsApp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {kiosks.map((k) => {
              const online = isOnline(k.lastSeenAt);
              return (
                <tr key={k.id}>
                  <td className="font-bold">{k.name}</td>
                  <td>
                    {k.status === "ACTIVE" ? (
                      <span className="badge bg-emerald-50 text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-600" />Aktif</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500"><span className="h-2 w-2 rounded-full border-2 border-slate-400" />Devre dışı</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {k.lastSeenAt ? (
                      <span className={`inline-flex items-center gap-2 ${online ? "font-semibold text-emerald-700" : "text-slate-500"}`}>
                        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-600" : "bg-slate-300"}`} />
                        {online && "Çevrimiçi · "}
                        {formatDateTime(k.lastSeenAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Hiç bağlanmadı</span>
                    )}
                  </td>
                  <td>
                    <form action={toggleKioskWhatsAppAction} className="flex items-center gap-2 whitespace-nowrap">
                      <input type="hidden" name="kioskId" value={k.id} />
                      <input type="hidden" name="whatsappEnabled" value={k.whatsappEnabled ? "false" : "true"} />
                      {k.whatsappEnabled ? <span className="badge bg-emerald-50 text-emerald-700">Açık</span> : <span className="badge bg-slate-100 text-slate-500">Kapalı</span>}
                      <button className="btn btn-secondary" title="Kapalıyken giriş-çıkış kaydedilir, yalnızca veliye WhatsApp mesajı yazılmaz.">
                        {k.whatsappEnabled ? "Kapat" : "Aç"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <form action={toggleKioskAction}>
                        <input type="hidden" name="kioskId" value={k.id} />
                        <input type="hidden" name="status" value={k.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                        <button className={`btn ${k.status === "ACTIVE" ? "btn-danger" : "btn-secondary"}`}>{k.status === "ACTIVE" ? "Devre dışı bırak" : "Etkinleştir"}</button>
                      </form>
                      <form action={deleteKioskAction}>
                        <input type="hidden" name="kioskId" value={k.id} />
                        <DeleteKioskButton name={k.name} />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="card p-5 md:p-6">
        <h2 className="mb-4 text-lg font-bold">Yeni kiosk</h2>
        <form action={createKioskAction} className="flex flex-wrap items-end gap-3">
          <label className="block min-w-60 flex-1">
            <span className="mb-1.5 block text-sm font-bold text-slate-900">Ad</span>
            <input name="name" required placeholder="Ana kapı" className="input" />
          </label>
          <button className="btn btn-primary h-11 rounded-xl px-5">Ekle</button>
        </form>
      </section>

      <section className="card overflow-x-auto p-5 md:p-6">
        <h2 className="text-lg font-bold">Kiosk tablet hesapları</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Tablette &quot;Yönetici girişi&quot; ile kullanılan hesaplar. Bu hesaplar panele giremez. Şifreler görüntülenemez, yalnızca yenisi verilebilir.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>E-posta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-bold">{a.fullName}</td>
                <td className="text-sm">{a.email}</td>
                <td>
                  <ResetKioskPasswordForm accountId={a.id} />
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={3} className="text-slate-400">Henüz kiosk hesabı yok.</td>
              </tr>
            )}
          </tbody>
        </table>
        <h3 className="mb-3 mt-6 text-base font-bold">Yeni kiosk hesabı</h3>
        <AddKioskAccountForm />
      </section>
    </div>
  );
}
