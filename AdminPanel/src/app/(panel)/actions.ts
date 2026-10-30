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
  createStudents,
  deleteKiosk,
  deleteStudent,
  findAdminByEmail,
  findTakenStudentPhones,
  getKiosk,
  getStudent,
  lastEventForStudent,
  resetStudentDevice,
  resetStudentPassword,
  setKioskAccountPassword,
  setKioskStatus,
  setKioskWhatsApp,
  type NewStudent,
} from "@/lib/db/repo";
import { parseCsv } from "@/lib/csv";
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

const optionalPhone = z.union([z.literal(""), phoneField]).default("");

// Veli bildirimi WhatsApp'la gider: veli numaraları öğrencininki gibi doğrulanır ve +905XXXXXXXXX biçiminde saklanır.
// En fazla iki veli; telefonu girilen her veliye giriş-çıkış mesajı gider.
const studentSchema = z
  .object({
    schoolNo: z.string().trim().min(1),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    className: z.string().trim().min(1),
    phone: phoneField,
    email: z.union([z.literal(""), z.email()]).default(""),
    guardian1Name: z.string().trim().default(""),
    guardian1Phone: optionalPhone,
    guardian2Name: z.string().trim().default(""),
    guardian2Phone: optionalPhone,
  })
  .superRefine((s, ctx) => {
    if ((s.guardian1Name && !s.guardian1Phone) || (s.guardian2Name && !s.guardian2Phone))
      ctx.addIssue({ code: "custom", message: "Adı yazılan velinin telefonunu da girin." });
    if (s.guardian1Phone && s.guardian1Phone === s.guardian2Phone) ctx.addIssue({ code: "custom", message: "İki velinin telefonu aynı olamaz." });
  })
  .transform(({ guardian1Name, guardian1Phone, guardian2Name, guardian2Phone, email, ...student }): NewStudent => ({
    ...student,
    email: email || null,
    guardians: [
      { fullName: guardian1Name, phone: guardian1Phone },
      { fullName: guardian2Name, phone: guardian2Phone },
    ].filter((g) => g.phone),
  }));

type FormResult = { error?: string; ok?: boolean; count?: number };

// Tek öğrenci formu ve CSV aynı alan adlarını kullanır; CSV sütun adı → form alanı.
const CSV_COLUMNS: Record<string, string> = {
  okul_no: "schoolNo",
  ad: "firstName",
  soyad: "lastName",
  sinif: "className",
  telefon: "phone",
  eposta: "email",
  veli1_ad: "guardian1Name",
  veli1_telefon: "guardian1Phone",
  veli2_ad: "guardian2Name",
  veli2_telefon: "guardian2Phone",
};
const CSV_REQUIRED = ["okul_no", "ad", "soyad", "sinif", "telefon"];
const MAX_IMPORT_ERRORS_SHOWN = 10;

function studentIssueMessage(issue: z.core.$ZodIssue): string {
  const field = String(issue.path[0] ?? "");
  if (!field) return issue.message;
  if (field.startsWith("guardian") && field.endsWith("Phone")) return "Geçerli bir veli cep telefonu numarası girin.";
  return "Lütfen zorunlu alanları doğru doldurun.";
}

// Veritabanının tekil indeks hataları yerine Türkçe mesaj; diğer hataların ayrıntısı yalnızca sunucu logunda kalır.
function studentDbError(e: unknown): string {
  const constraint = (e as { constraint?: string }).constraint;
  if (constraint === "students_email_uq") return "Bu e-posta ile kayıtlı bir öğrenci var.";
  // Aynı telefon: insertStudent'in kendi hatası ya da aynı anda iki kayıtta ön kontrolü geçen ikincisinin tekil indeks hatası.
  const duplicatePhone = "Bu telefon numarası ile kayıtlı bir öğrenci var.";
  if (constraint === "students_phone_uq" || (e instanceof Error && e.message === duplicatePhone)) return duplicatePhone;
  console.error("[db] öğrenci oluşturulamadı", e);
  return "Kayıt oluşturulamadı.";
}

export async function createStudentAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const admin = await requireWebAdmin();
  const parsed = studentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: studentIssueMessage(parsed.error.issues[0]) };
  try {
    const student = await createStudent(parsed.data);
    await addAudit({ adminUserId: admin.id, action: "STUDENT_CREATED", entity: "student", entityId: student.id, beforeValue: null, afterValue: { phone: student.phone } });
  } catch (e) {
    return { error: studentDbError(e) };
  }
  revalidatePath("/ogrenciler");
  return { ok: true };
}

// CSV ile toplu ekleme. Önce tüm satırlar doğrulanır; tek bir hata bile varsa hiçbir öğrenci eklenmez
// (yarım kalan dosyayı tekrar yüklemek mükerrer kayıt üretmesin). Satır numaraları dosyadaki gibidir (başlık = 1).
export async function importStudentsAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const admin = await requireWebAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bir CSV dosyası seçin." };
  const [header = [], ...rows] = parseCsv(await file.text());
  const columns = header.map((h) => h.toLowerCase());
  const unknown = columns.find((c) => !CSV_COLUMNS[c]);
  if (unknown !== undefined) return { error: `Bilinmeyen sütun: "${unknown}". Şablondaki sütun adlarını kullanın.` };
  const missing = CSV_REQUIRED.filter((c) => !columns.includes(c));
  if (missing.length) return { error: `Eksik sütun: ${missing.join(", ")}.` };
  if (!rows.length) return { error: "Dosyada öğrenci satırı yok." };

  const errors: { line: number; text: string }[] = [];
  const students: NewStudent[] = [];
  const rowOfPhone = new Map<string, number>();
  rows.forEach((cells, i) => {
    const line = i + 2;
    const parsed = studentSchema.safeParse(Object.fromEntries(columns.map((c, j) => [CSV_COLUMNS[c], cells[j] ?? ""])));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const column = Object.keys(CSV_COLUMNS).find((c) => CSV_COLUMNS[c] === issue.path[0]);
      errors.push({ line, text: column ? `"${column}" boş veya hatalı.` : issue.message });
      return;
    }
    const firstRow = rowOfPhone.get(parsed.data.phone);
    if (firstRow) errors.push({ line, text: `telefon numarası satır ${firstRow} ile aynı.` });
    else rowOfPhone.set(parsed.data.phone, line);
    students.push(parsed.data);
  });
  for (const phone of await findTakenStudentPhones([...rowOfPhone.keys()]))
    errors.push({ line: rowOfPhone.get(phone) ?? 0, text: "bu telefon numarası ile kayıtlı bir öğrenci var." });
  if (errors.length) {
    const shown = errors.sort((a, b) => a.line - b.line).slice(0, MAX_IMPORT_ERRORS_SHOWN).map((e) => `Satır ${e.line}: ${e.text}`);
    const more = errors.length > MAX_IMPORT_ERRORS_SHOWN ? `\n… ve ${errors.length - MAX_IMPORT_ERRORS_SHOWN} hata daha.` : "";
    return { error: `Hiçbir öğrenci eklenmedi. Dosyayı düzeltip tekrar yükleyin:\n${shown.join("\n")}${more}` };
  }

  try {
    const created = await createStudents(students);
    for (const student of created)
      await addAudit({ adminUserId: admin.id, action: "STUDENT_CREATED", entity: "student", entityId: student.id, beforeValue: null, afterValue: { phone: student.phone, source: "csv" } });
    revalidatePath("/ogrenciler");
    return { ok: true, count: created.length };
  } catch (e) {
    return { error: `Hiçbir öğrenci eklenmedi: ${studentDbError(e)}` };
  }
}

// Öğrenci kalıcı silinir (cihaz, giriş-çıkış ve WhatsApp kayıtlarıyla birlikte). Önceki bilgiler denetim kaydında saklanır.
export async function deleteStudentAction(form: FormData) {
  const admin = await requireWebAdmin();
  const student = await deleteStudent(String(form.get("studentId")));
  if (!student) return;
  await addAudit({
    adminUserId: admin.id,
    action: "STUDENT_DELETED",
    entity: "student",
    entityId: student.id,
    beforeValue: { name: `${student.firstName} ${student.lastName}`, schoolNo: student.schoolNo, className: student.className, phone: student.phone },
    afterValue: null,
  });
  revalidatePath("/");
  revalidatePath("/ogrenciler");
  revalidatePath("/hareketler");
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
