# Pages (dependency trees)

## /ogrenciler (Öğrenciler)
Entry: AdminPanel/src/app/(panel)/ogrenciler/page.tsx
Dependencies:
- AdminPanel/src/app/(panel)/layout.tsx
  - AdminPanel/src/app/(panel)/NavLinks.tsx
- AdminPanel/src/app/(panel)/ogrenciler/StudentForms.tsx
- AdminPanel/src/app/(panel)/ogrenciler/DeleteStudentButton.tsx
- AdminPanel/src/app/(panel)/actions.ts (server actions, no UI)
- AdminPanel/src/app/globals.css

## / (Canlı durum)
Entry: AdminPanel/src/app/(panel)/page.tsx
Dependencies:
- AdminPanel/src/app/(panel)/layout.tsx
  - AdminPanel/src/app/(panel)/NavLinks.tsx
- AdminPanel/src/components/AutoRefresh.tsx
- AdminPanel/src/components/Badges.tsx

## /kiosklar
Entry: AdminPanel/src/app/(panel)/kiosklar/page.tsx
Dependencies:
- AdminPanel/src/app/(panel)/layout.tsx
  - AdminPanel/src/app/(panel)/NavLinks.tsx
- AdminPanel/src/app/(panel)/kiosklar/AccountForms.tsx
- AdminPanel/src/app/(panel)/kiosklar/DeleteKioskButton.tsx

## /hareketler, /denemeler, /whatsapp, /denetim
Entry: AdminPanel/src/app/(panel)/<route>/page.tsx — layout + Badges.tsx

## /login
Entry: AdminPanel/src/app/login/page.tsx
- AdminPanel/src/app/login/LoginForm.tsx
