"use server";

// Panelin tüm yönetici işlemleri (Server Action). Her işlem önce oturumu doğrular, sonra denetim kaydı yazar.
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addAudit,
  createKiosk,
  createKioskAccount,
  createStudent,
  deleteKiosk,
  findAdminByEmail,
  getKiosk,
  getStudent,
  lastEventForStudent,
  resetStudentDevice,
  resetStudentPassword,
  setKioskAccountPassword,
  setKioskStatus,
  setKioskWhatsApp,
} from "@/lib/db/repo";
import { phoneField } from "@/lib/phone";
import { manualEvent } from "@/lib/scan";
import { requireWebAdmin } from "@/lib/session";

// Şifreyi siler; cihaz bağlı kalır. Öğrenci aynı telefonda yeni şifre oluşturur.
export async function resetPasswordAction(form: FormData) {
  const admin = await requireWebAdmin();
  const studentId = String(form.get("studentId"));
  await resetStudentPassword(studentId);
  await addAudit({ adminUserId: admin.id, action: "PASSWORD_RESET", entity: "student", entityId: studentId, beforeValue: null, afterValue: null });
  revalidatePath("/ogrenciler");
}

// Cihaz bağlantısını kaldırır (REVOKED) ve şifreyi siler; öğrenci yeni telefonunda şifre oluşturur.
export async function resetDeviceAction(form: FormData) {
  const admin = await requireWebAdmin();
  const studentId = String(form.get("studentId"));
  await resetStudentDevice(studentId, admin.id);
  await addAudit({ adminUserId: admin.id, action: "DEVICE_RESET", entity: "student", entityId: studentId, beforeValue: null, afterValue: null });
  revalidatePath("/ogrenciler");
}

const studentSchema = z.object({
  schoolNo: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  className: z.string().trim().min(1),
  phone: phoneField,
  email: z.union([z.literal(""), z.email()]).default(""),
  guardianName: z.string().default(""),
  // Veli bildirimi WhatsApp'la gider: numara öğrencininki gibi doğrulanır ve +905XXXXXXXXX biçiminde saklanır.
  guardianPhone: z.union([z.literal(""), phoneField]).default(""),
});

export async function createStudentAction(_prev: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireWebAdmin();
  const parsed = studentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues.some((i) => i.path[0] === "guardianPhone")
        ? "Geçerli bir veli cep telefonu numarası girin."
        : "Lütfen zorunlu alanları doğru doldurun.",
    };
  try {
    const student = await createStudent({ ...parsed.data, email: parsed.data.email || null });
    await addAudit({ adminUserId: admin.id, action: "STUDENT_CREATED", entity: "student", entityId: student.id, beforeValue: null, afterValue: { phone: student.phone } });
  } catch (e) {
    // Aynı e-postayla ikinci öğrenci: veritabanının tekil indeks hatası (students_email_uq) yerine Türkçe mesaj.
    const constraint = (e as { constraint?: string }).constraint;
    if (constraint === "students_email_uq") return { error: "Bu e-posta ile kayıtlı bir öğrenci var." };
    // Aynı telefon: createStudent'in kendi hatası ya da aynı anda iki kayıtta ön kontrolü geçen ikincisinin tekil indeks hatası.
    // Diğer hataların (ör. bağlantı koptu) ayrıntısı yalnızca sunucu logunda kalır.
    const duplicatePhone = "Bu telefon numarası ile kayıtlı bir öğrenci var.";
    if (constraint === "students_phone_uq" || (e instanceof Error && e.message === duplicatePhone)) return { error: duplicatePhone };
    console.error("[db] öğrenci oluşturulamadı", e);
    return { error: "Kayıt oluşturulamadı." };
  }
  revalidatePath("/ogrenciler");
  return { ok: true };
}

// Telefonunu unutan öğrenci için manuel giriş/çıkış. Öğrenci zaten o durumdaysa (ör. çift tıklama) kayıt açılmaz.
export async function manualEventAction(form: FormData) {
  const admin = await requireWebAdmin();
  const direction = form.get("direction") === "IN" ? "IN" : "OUT";
  const note = String(form.get("note") ?? "").trim() || "Manuel kayıt";
  const [student, kiosk] = await Promise.all([getStudent(String(form.get("studentId"))), getKiosk(String(form.get("kioskId")))]);
  if (!student || !kiosk) return;
  // Her kapının durumu ayrıdır: bu kapıda zaten aynı yöndeyse (içerideyken "giriş") bir şey yapılmaz.
  const last = await lastEventForStudent(student.id, kiosk.id);
  if (last?.direction === direction) return;
  const event = await manualEvent(student.id, kiosk, direction, note);
  await addAudit({ adminUserId: admin.id, action: "MANUAL_EVENT", entity: "attendance_event", entityId: event.id, beforeValue: null, afterValue: { direction, kioskId: kiosk.id, note } });
  revalidatePath("/");
  revalidatePath("/ogrenciler");
  revalidatePath("/hareketler");
}

// Yeni kiosk; gizli anahtarı (secret) createKiosk üretir ve hiçbir yerde gösterilmez.
export async function createKioskAction(form: FormData) {
  const admin = await requireWebAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const kiosk = await createKiosk(name);
  await addAudit({ adminUserId: admin.id, action: "KIOSK_CREATED", entity: "kiosk", entityId: kiosk.id, beforeValue: null, afterValue: { name } });
  revalidatePath("/kiosklar");
}

export async function toggleKioskAction(form: FormData) {
  const admin = await requireWebAdmin();
  const kioskId = String(form.get("kioskId"));
  const status = form.get("status");
  if (status !== "ACTIVE" && status !== "DISABLED") return;
  await setKioskStatus(kioskId, status);
  await addAudit({ adminUserId: admin.id, action: "KIOSK_STATUS", entity: "kiosk", entityId: kioskId, beforeValue: null, afterValue: { status } });
  revalidatePath("/kiosklar");
}

// Kioskun veli WhatsApp bildirimini açar/kapatır; kapalıyken giriş-çıkış kaydı yine tutulur, yalnızca mesaj gitmez.
export async function toggleKioskWhatsAppAction(form: FormData) {
  const admin = await requireWebAdmin();
  const kioskId = String(form.get("kioskId"));
  const whatsappEnabled = form.get("whatsappEnabled") === "true";
  await setKioskWhatsApp(kioskId, whatsappEnabled);
  await addAudit({ adminUserId: admin.id, action: "KIOSK_WHATSAPP", entity: "kiosk", entityId: kioskId, beforeValue: null, afterValue: { whatsappEnabled } });
  revalidatePath("/kiosklar");
}

// Kiosk silinir; geçmiş hareket ve okutma kayıtları kalır (kiosk_id NULL olur). Önceki ad ve durum denetim kaydında saklanır.
export async function deleteKioskAction(form: FormData) {
  const admin = await requireWebAdmin();
  const kiosk = await getKiosk(String(form.get("kioskId")));
  if (!kiosk || !(await deleteKiosk(kiosk.id))) return;
  await addAudit({ adminUserId: admin.id, action: "KIOSK_DELETED", entity: "kiosk", entityId: kiosk.id, beforeValue: { name: kiosk.name, status: kiosk.status }, afterValue: null });
  revalidatePath("/kiosklar");
}

const passwordField = z.string().min(10, "Şifre en az 10 karakter olmalı.");

const kioskAccountSchema = z.object({
  fullName: z.string().trim().min(1, "Ad zorunlu."),
  email: z.string().trim().pipe(z.email("Geçerli bir e-posta girin.")),
  password: passwordField,
});

// Kiosk tableti hesabı (role = KIOSK): yalnızca uygulamadaki kiosk moduna girer, panele giremez.
// ADMIN hesabı panelden açılmaz; yalnızca `npm run admin:create` ile.
export async function createKioskAccountAction(_prev: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireWebAdmin();
  const parsed = kioskAccountSchema.safeParse({ fullName: form.get("fullName") ?? "", email: form.get("email") ?? "", password: form.get("password") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { fullName, email, password } = parsed.data;
  if (await findAdminByEmail(email)) return { error: "Bu e-posta zaten kayıtlı." };
  const account = await createKioskAccount(fullName, email, await bcrypt.hash(password, 10));
  await addAudit({ adminUserId: admin.id, action: "KIOSK_ACCOUNT_CREATED", entity: "admin_user", entityId: account.id, beforeValue: null, afterValue: { email: account.email } });
  revalidatePath("/kiosklar");
  return { ok: true };
}

// Yalnızca KIOSK hesabının şifresi değişir. Tablette açık oturum kapanmaz; yeni şifre bir sonraki girişte geçerlidir.
export async function resetKioskAccountPasswordAction(_prev: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireWebAdmin();
  const accountId = String(form.get("accountId"));
  const parsed = passwordField.safeParse(form.get("password") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await setKioskAccountPassword(accountId, await bcrypt.hash(parsed.data, 10)))) return { error: "Kiosk hesabı bulunamadı." };
  await addAudit({ adminUserId: admin.id, action: "KIOSK_ACCOUNT_PASSWORD_RESET", entity: "admin_user", entityId: accountId, beforeValue: null, afterValue: null });
  revalidatePath("/kiosklar");
  return { ok: true };
}
