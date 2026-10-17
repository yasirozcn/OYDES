"use server";

// Panelin tüm yönetici işlemleri (Server Action). Her işlem önce oturumu doğrular, sonra denetim kaydı yazar.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addAudit, createStudent, getStudent, resetStudentDevice, resetStudentPassword } from "@/lib/db/repo";
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
    if ((e as { constraint?: string }).constraint === "students_email_uq") return { error: "Bu e-posta ile kayıtlı bir öğrenci var." };
    return { error: e instanceof Error ? e.message : "Kayıt oluşturulamadı." };
  }
  revalidatePath("/ogrenciler");
  return { ok: true };
}

// Telefonunu unutan öğrenci için manuel giriş/çıkış. Öğrenci zaten o durumdaysa (ör. çift tıklama) kayıt açılmaz.
export async function manualEventAction(form: FormData) {
  const admin = await requireWebAdmin();
  const direction = form.get("direction") === "IN" ? "IN" : "OUT";
  const note = String(form.get("note") ?? "").trim() || "Manuel kayıt";
  const student = await getStudent(String(form.get("studentId")));
  if (!student || student.presenceStatus === direction) return;
  const event = await manualEvent(student.id, direction, note);
  await addAudit({ adminUserId: admin.id, action: "MANUAL_EVENT", entity: "attendance_event", entityId: event.id, beforeValue: null, afterValue: { direction, note } });
  revalidatePath("/");
  revalidatePath("/ogrenciler");
  revalidatePath("/hareketler");
}
