# Routes (Next.js file-based, AdminPanel/src/app)

Project: İzmir Fen giriş-çıkış — AdminPanel (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 via @import "tailwindcss" + @theme in globals.css; no component library — custom utility classes .btn/.input/.card/.table/.badge in globals.css; Server Components + Server Actions; Turkish UI). Mobile app QrScannerApp is Expo (out of scope for panel design). Brand logo: QrScannerApp/assets/logo.png.

| URL | File | Layout | Summary |
| --- | --- | --- | --- |
| /login | login/page.tsx + LoginForm.tsx | root | admin login |
| / | (panel)/page.tsx | (panel) | Canlı durum dashboard: per-kiosk occupancy cards, today stats, recent events |
| /hareketler | (panel)/hareketler/page.tsx | (panel) | entry/exit events table |
| /ogrenciler | (panel)/ogrenciler/page.tsx + StudentForms.tsx + DeleteStudentButton.tsx | (panel) | students: search, table (student, phone, guardians, per-door status + manual in/out, device, actions: reset password/device, delete), add-student form (2 guardians), CSV import |
| /kiosklar | (panel)/kiosklar/page.tsx + AccountForms.tsx + DeleteKioskButton.tsx | (panel) | kiosks table + kiosk tablet accounts |
| /denemeler | (panel)/denemeler/page.tsx | (panel) | rejected scans |
| /whatsapp | (panel)/whatsapp/page.tsx | (panel) | WhatsApp message log |
| /denetim | (panel)/denetim/page.tsx | (panel) | audit log |
| /destek, /gizlilik | (public)/… | (public) | static public pages |
