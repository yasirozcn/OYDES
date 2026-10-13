// Uygulama ayarları: tüm ortam değişkenleri yalnızca burada okunur (.env.local).
// Boş değer ("AUTH_SECRET=") tanımsız sayılır; .env.example değişkenleri boş bırakır.
export const config = {
  /** JWT imzalama anahtarı. Tanımsızsa geliştirmede sabit anahtar kullanılır; canlıda auth.ts hata fırlatır. */
  authSecret: process.env.AUTH_SECRET || "dev-only-secret-change-me-dev-only-secret-change-me",
  /** true ise kioskun BLE jetonu olmadan okutma reddedilir. Prototip ölçümlerinden sonra açın. */
  bleRequired: process.env.BLE_REQUIRED === "true",
  /** Son kayıttan sonra bu süre içinde tekrar okutma yeni olay oluşturmaz (yön değişmez; çift okutma koruması). */
  duplicateWindowSeconds: Number(process.env.DUPLICATE_WINDOW_SECONDS || 120),
  /** "mock": WhatsApp mesajları yalnızca kaydedilir ve konsola yazılır. */
  whatsappProvider: process.env.WHATSAPP_PROVIDER || "mock",
  schoolShortName: process.env.SCHOOL_SHORT_NAME || "Izmir Fen",
  /** Panel çerezi yalnızca HTTPS'te gönderilsin mi? Yerelde (http) COOKIE_SECURE=false. */
  cookieSecure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
  timeZone: "Europe/Istanbul",
};
