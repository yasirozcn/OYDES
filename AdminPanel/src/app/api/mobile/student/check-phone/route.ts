import { z } from "zod";
import { ApiError, body, clientIp, handler, ok, rateLimit } from "@/lib/api";
import { findStudentByPhone, getActiveDevice, getActiveDeviceForStudent } from "@/lib/db/repo";
import { phoneField } from "@/lib/phone";

const schema = z.object({ phone: phoneField, deviceId: z.string().min(8).max(100) });

// Öğrenci telefon numarasını girer. Yalnızca okul veritabanındaki numaralar devam edebilir.
// Yanıt: şifre henüz yoksa "create-password", varsa "password".
export const POST = handler(async (req: Request) => {
  rateLimit(`check:${clientIp(req)}`, 30);
  const { phone, deviceId } = await body(req, schema);
  const student = await findStudentByPhone(phone);
  if (!student || !student.isActive) throw new ApiError(404, "Bu telefon numarası okul kayıtlarında bulunamadı.", "NOT_FOUND");

  const device = await getActiveDevice(deviceId);
  if (device && device.studentId !== student.id)
    throw new ApiError(409, "Bu telefon başka bir öğrenci hesabına bağlı. Bir telefonda yalnızca bir öğrenci hesabı kullanılabilir.", "DEVICE_TAKEN");
  const bound = await getActiveDeviceForStudent(student.id);
  if (bound && bound.id !== deviceId)
    throw new ApiError(403, "Hesabınız başka bir telefona bağlı. Telefon değiştirdiyseniz okul yönetiminden cihaz sıfırlaması isteyin.", "WRONG_DEVICE");

  return ok({ next: student.passwordHash ? "password" : "create-password", firstName: student.firstName });
});
