import { z } from "zod";
import { ApiError, body, handler, ok, rateLimit, requireStudent } from "@/lib/api";
import { createFeedback, getActiveDevice } from "@/lib/db/repo";

// Öğrencinin uygulamadan gönderdiği geri bildirim; panelde "Geri bildirimler" sayfasında görünür.
const schema = z.object({ message: z.string().trim().min(1, "Geri bildiriminizi yazın.").max(1000, "Geri bildirim en fazla 1000 karakter olabilir.") });

export const POST = handler(async (req: Request) => {
  const claims = await requireStudent(req);
  const device = await getActiveDevice(claims.deviceId);
  if (!device || device.studentId !== claims.sub)
    throw new ApiError(401, "Bu cihazın bağlantısı kaldırılmış. Tekrar kayıt olmanız gerekiyor.", "DEVICE_REVOKED");
  rateLimit(`feedback:${claims.sub}`, 5);
  const { message } = await body(req, schema);
  const feedback = await createFeedback(claims.sub, message);
  return ok({ id: feedback.id }, 201);
});
