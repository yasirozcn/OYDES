# Design System — İzmir Fen Giriş-Çıkış Paneli (DOQR)

## Product context
School entry/exit system. Students scan a rotating QR at a door kiosk with the DOQR mobile app; parents get WhatsApp messages. This web admin panel (Next.js, Turkish UI) is used by non-technical school staff on desktop/laptop (1280–1920px wide), sometimes on a tablet. Key pages: Canlı durum (dashboard), Giriş-çıkışlar (events), Öğrenciler (students: search, list, per-door status + manual entry/exit, device, password/device reset, delete, add student with up to 2 guardians, CSV import), Kiosklar, Reddedilen okutmalar, WhatsApp kayıtları, Denetim kaydı.
JTBD: find a student fast, see whether they are inside at each door, record a manual entry/exit, fix login problems, add students in bulk. Clarity and calm density over decoration.

## Brand
- Logo: DOQR mark (green "D/Q" with a door), provided as Brand Asset — always use the real image in the sidebar logo position (no initials, no text-only mark). Next to it: "İzmir Fen" (bold) + "Giriş-Çıkış Paneli" (muted).
- Same palette as the DOQR mobile app.

## Colors (hex — use ONLY these)
- brand `#006160` (primary buttons, active nav, links, focus ring)
- brandDark `#004746` (primary hover, active nav text)
- brandSoft `#DDEFEE` (active nav background, selected rows, soft brand chips)
- accent `#F5B73D` (rare highlight only: e.g. small count chip; never large areas)
- ink `#14211A` (primary text) · inkSoft `#3D433F` (secondary text) · muted `#6B7570` (labels, meta)
- line `#E2DFD6` (borders) · lineSoft `#ECEAE3` (dividers, table row borders, hover bg) · lineStrong `#A8A294` (secondary button border)
- bg `#FFFFFF` (cards, sidebar) · page background `#F7F6F2` (warm off-white)
- Status: inside/entry = brand `#006160` on brandSoft; outside/exit = inkSoft on lineSoft; no record = muted on lineSoft
- danger `#D04A3B` · dangerSoft `#FCE8E6` · dangerInk `#8F1C13` · dangerLine `#F1B8B2` (only delete/reset-device, errors)
- warn `#9A5B00` · warnSoft `#FBF0DC` · warnInk `#7A4700` (e.g. "Yeni şifre bekleniyor")

## Typography
- Font: system sans (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). No serif, no display fonts.
- Page title 28px/800, tight letter-spacing (-0.5px). Section title 18px/700. Body 14–15px/400–600. Table header 12px/700 uppercase, letter-spacing 0.06em, muted. Meta 12–13px muted.
- Phone numbers and dates: tabular numerals.

## Spacing, radius, shadow
- 4px grid; page padding 32px desktop / 16px mobile; card padding 20–24px; gaps 12–16px.
- Radius: cards 16px, buttons/inputs 10px, badges/pills 999px.
- Shadow: cards `0 1px 2px rgba(20,33,26,.06)` + 1px `line` border. No heavy or colored shadows, no gradients.

## Components
- Buttons (height 36px, 14px/600, radius 10px, icon 16px left of label, gap 6px): primary = brand bg/white text; secondary = white bg, lineStrong border, ink text; danger = white bg, dangerLine border, danger text; ghost icon button 32×32 for row actions. Every action button has a simple 1.8px-stroke line icon (search, plus, upload, download, log-in arrow, log-out arrow, key, smartphone-reset, trash, x).
- Inputs: height 40px, white, 1px line border, radius 10px, focus 2px brand ring. Search input has a leading search icon.
- Badges/pills: 12px/600, 22–24px tall, dot or icon + label.
- Tables: white card, header row lineSoft-tinted, rows 1px lineSoft dividers, comfortable 14–16px vertical padding; NEVER horizontal overflow at ≥1280px — wrap secondary content, stack per-door controls vertically inside the cell, put row actions in a compact right-aligned column (icon buttons with tooltips or a small "⋯" menu), keep the table within the card width.
- Sidebar: 256px, white, right border; nav items 40px, 20px line icons, active = brandSoft bg + brandDark text + brand icon. Bottom: admin avatar (initials circle is fine for the person) + name/email + "Çıkış yap" secondary button with log-out icon.

## Motion
Subtle only: 120–150ms color/background transitions on hover/focus. No decorative animation.

## Rules
- Turkish copy exactly as given in the product; don't invent features.
- No horizontal page or table overflow; long text truncates or wraps.
- Accessible contrast (WCAG AA), visible focus states.
