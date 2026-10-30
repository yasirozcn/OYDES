# Extractable components

## Layout Components

## PanelSidebar
- Source: `AdminPanel/src/app/(panel)/layout.tsx` + `AdminPanel/src/app/(panel)/NavLinks.tsx`
- Category: layout
- Description: Left sidebar with school logo + name, nav links with icons, admin user box and logout
- Extractable props: activeItem (string: "canli" | "hareketler" | "ogrenciler" | "kiosklar" | "denemeler" | "whatsapp" | "denetim", default "canli")
- Hardcoded: logo image, menu labels, icon SVGs, all CSS

## Basic Components

## Badge
- Source: `AdminPanel/src/components/Badges.tsx` + `.badge` in globals.css
- Category: basic
- Description: Pill status badges (Giriş/Çıkış/Manuel/İçeride/Dışarıda/Kayıt yok)
- Extractable props: none
- Hardcoded: colors per variant

## Button
- Source: `.btn` classes in `AdminPanel/src/app/globals.css`
- Category: basic
- Description: primary/secondary/danger buttons
- Extractable props: none
