// Öğrenci giriş kimliği: Türkiye cep telefonu numarası. Veritabanında tek biçimde (+905XXXXXXXXX) saklanır;
// kullanıcı "0532 123 45 67", "532-123-4567", "+90 532 …" gibi yazsa da aynı öğrenci bulunur.
import { z } from "zod";

/** Geçerli bir Türkiye cep numarasıysa "+905XXXXXXXXX" döner, değilse null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const national = digits.replace(/^(0090|90|0)(?=5\d{9}$)/, "");
  return /^5\d{9}$/.test(national) ? `+90${national}` : null;
}

/** API gövdelerindeki telefon alanı: doğrular ve +905XXXXXXXXX biçimine çevirir. */
export const phoneField = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (!phone) ctx.addIssue({ code: "custom", message: "Geçerli bir cep telefonu numarası girin." });
  return phone ?? z.NEVER;
});
