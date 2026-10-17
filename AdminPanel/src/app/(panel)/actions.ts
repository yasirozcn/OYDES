"use server";

// Panelin tüm yönetici işlemleri (Server Action). Her işlem önce oturumu doğrular.
import { requireWebAdmin } from "@/lib/session";

// GEÇİCİ (BE-4): işlemler BE-4'te repo + audit + revalidatePath ile doldurulunca bu sabit silinir.
const NOT_READY = "Bu işlem henüz hazır değil (BE-4).";

// GEÇİCİ (BE-4): içi boş — resetStudentPassword + PASSWORD_RESET audit gelecek.
export async function resetPasswordAction() {
  await requireWebAdmin();
  console.warn(`[panel] ${NOT_READY}`);
}

// GEÇİCİ (BE-4): içi boş — resetStudentDevice + DEVICE_RESET audit gelecek.
export async function resetDeviceAction() {
  await requireWebAdmin();
  console.warn(`[panel] ${NOT_READY}`);
}

// GEÇİCİ (BE-4): içi boş — zod + phoneField + createStudent + STUDENT_CREATED audit gelecek.
export async function createStudentAction(): Promise<{ error?: string; ok?: boolean }> {
  await requireWebAdmin();
  return { error: NOT_READY };
}

// GEÇİCİ (BE-4): içi boş — getStudent + manualEvent (scan.ts) + MANUAL_EVENT audit gelecek.
export async function manualEventAction() {
  await requireWebAdmin();
  console.warn(`[panel] ${NOT_READY}`);
}
