import Constants from "expo-constants";

/**
 * Sunucu (AdminPanel) adresi.
 * - Geliştirme: `.env` dosyasına EXPO_PUBLIC_API_URL=http://<Mac'in yerel IP'si>:3000 yazın.
 * - TestFlight / mağaza: HTTPS adresi zorunludur (örn. https://panel.okulunuz.com).
 */
export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "http://localhost:3000"
).replace(/\/$/, "");

// Açılış ekranı en az bu kadar görünür; oturum kontrolü bu sürede yapılır.
export const SPLASH_DURATION_MS = 1000;

// Tasarım sistemi: tek koyu yeşil (brand), sıcak sarı vurgu (accent), beyaz zemin.
// Kırmızı yalnızca uyarı ve hata içindir.
export const colors = {
  brand: "#006160",
  brandDark: "#004746",
  brandSoft: "#DDEFEE",
  success: "#3C9D6B",
  accent: "#F5B73D",
  ink: "#14211A",
  inkSoft: "#3D433F",
  muted: "#6B7570",
  line: "#E2DFD6",
  lineSoft: "#ECEAE3",
  lineStrong: "#A8A294",
  bg: "#FFFFFF",
  danger: "#D04A3B",
  dangerSoft: "#FCE8E6",
  dangerInk: "#8F1C13",
  dangerLine: "#F1B8B2",
  warn: "#9A5B00",
  warnSoft: "#FBF0DC",
  warnInk: "#7A4700",
  white: "#ffffff",
};
