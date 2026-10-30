// Uygulama ayarları: tüm ortam değişkenleri yalnızca burada okunur (.env.local).
// Boş değer ("AUTH_SECRET=") tanımsız sayılır; .env.example değişkenleri boş bırakır.
export const config = {
  /** JWT imzalama anahtarı. Tanımsızsa geliştirmede sabit anahtar kullanılır; canlıda auth.ts hata fırlatır. */
  authSecret: process.env.AUTH_SECRET || "dev-only-secret-change-me-dev-only-secret-change-me",
  /** true ise kioskun BLE jetonu olmadan okutma reddedilir. Prototip ölçümlerinden sonra açın. */
  bleRequired: process.env.BLE_REQUIRED === "true",
  /** Son kayıttan sonra bu süre içinde tekrar okutma yeni olay oluşturmaz (yön değişmez; çift okutma koruması). */
  duplicateWindowSeconds: Number(process.env.DUPLICATE_WINDOW_SECONDS || 120),
  /** "mock": WhatsApp mesajları yalnızca kaydedilir ve konsola yazılır. "insider": Insider API'siyle gerçekten gönderilir. */
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "mock",
  /** Insider API anahtarı: gizli; yalnızca sunucuda okunur (NEXT_PUBLIC_ değildir, tarayıcıya gitmez), loglanmaz, commit'lenmez. */
  insiderApiKey: process.env.INSIDER_API_KEY || "",
  /** Insider'da onaylı WhatsApp şablonunun adı (gövde parametreleri: veli, öğrenci, tarih, konum, işlem). */
  whatsappTemplate: process.env.WHATSAPP_TEMPLATE || "",
  /** Panel çerezi yalnızca HTTPS'te gönderilsin mi? Yerelde (http) COOKIE_SECURE=false. */
  cookieSecure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
  timeZone: "Europe/Istanbul",
};
