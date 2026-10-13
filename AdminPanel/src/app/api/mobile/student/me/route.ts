import { ApiError, handler, ok, requireStudent } from "@/lib/api";
import { getActiveDevice, getStudent, listEvents } from "@/lib/db/repo";

// Öğrenci ana ekranı: durum, sıradaki yön ve son 10 hareket.
export const GET = handler(async (req: Request) => {
  const claims = await requireStudent(req);
  // Panelden "Cihazı sıfırla" yapıldıysa token hâlâ geçerli olsa da cihaz artık bağlı değildir.
  const device = await getActiveDevice(claims.deviceId);
  if (!device || device.studentId !== claims.sub)
    throw new ApiError(401, "Bu cihazın bağlantısı kaldırılmış. Tekrar kayıt olmanız gerekiyor.", "DEVICE_REVOKED");

  const student = await getStudent(claims.sub);
  if (!student) throw new ApiError(404, "Öğrenci bulunamadı.", "NOT_FOUND");
  const events = await listEvents({ studentId: student.id, limit: 10 });
  // İlk okutmada yönü öğrenci seçer; sonrasında yön mevcut durumun tersidir.
  const needsDirection = events.length === 0;

  return ok({
    student: { id: student.id, firstName: student.firstName, lastName: student.lastName, className: student.className, presenceStatus: student.presenceStatus },
    needsDirection,
    nextDirection: needsDirection ? null : student.presenceStatus === "IN" ? "OUT" : "IN",
    events: events.map((e) => ({ id: e.id, direction: e.direction, occurredAt: e.occurredAt, kioskName: e.kioskName })),
  });
});
