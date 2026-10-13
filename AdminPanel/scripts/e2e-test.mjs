// Uçtan uca API testi: mobil uygulamanın yaptığı istekleri çalışan sunucuya (npm run dev) gönderir.
// Ortak veritabanında KENDİ verisini oluşturur ve sonunda (test başarısız olsa da) yalnızca onu siler (kök AGENTS.md §7.1).
// Kullanım: npm run dev açıkken ayrı terminalde `npm run test:e2e` (adres: API_URL, varsayılan http://localhost:3000).
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const API = `${process.env.API_URL ?? "http://localhost:3000"}/api/mobile`;
const suffix = randomBytes(4).toString("hex");
const hex = (n) => randomBytes(n).toString("hex");

// Testin oluşturduğu kayıtlar — temizlik yalnızca bu kimlikleri siler.
const student = { id: `stu_${hex(8)}`, email: `test+e2e-${suffix}@izmirfen.test`, firstName: "E2E", lastName: `Test ${suffix}` };
const otherStudent = { id: `stu_${hex(8)}`, email: `test+e2e-${suffix}-b@izmirfen.test` };
const guardianId = `gua_${hex(8)}`;
const kiosk = { id: `kiosk_${hex(8)}`, name: `TEST e2e-${suffix}` };
const kioskAccount = { id: `adm_${hex(8)}`, email: `test+e2e-${suffix}-kiosk@izmirfen.test`, password: hex(12) };
const device = { id: `e2e-${suffix}-phone-1`, secret: hex(32) };
const secondDeviceId = `e2e-${suffix}-phone-2`;
const studentPassword = hex(8);
const deviceIds = [device.id, secondDeviceId];
const studentIds = [student.id, otherStudent.id];

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
});

let failures = 0;
function check(name, condition, detail) {
  console.log(`${condition ? "✓" : "✗"} ${name}${condition || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!condition) failures++;
}

async function call(method, path, payload, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function createTestData() {
  await db.query(
    `INSERT INTO students (id, school_no, first_name, last_name, email, class_name) VALUES
       ($1, 'E2E-1', $2, $3, $4, 'E2E'), ($5, 'E2E-2', 'E2E', $6, $7, 'E2E')`,
    [student.id, student.firstName, student.lastName, student.email, otherStudent.id, `Test ${suffix} B`, otherStudent.email],
  );
  await db.query("INSERT INTO guardians (id, full_name, phone) VALUES ($1, 'E2E Veli', '+900000000000')", [guardianId]);
  await db.query("INSERT INTO student_guardians (student_id, guardian_id) VALUES ($1, $2)", [student.id, guardianId]);
  await db.query("INSERT INTO kiosks (id, name, secret) VALUES ($1, $2, $3)", [kiosk.id, kiosk.name, hex(32)]);
  await db.query("INSERT INTO admin_users (id, full_name, email, role, password_hash) VALUES ($1, $2, $3, 'KIOSK', $4)", [
    kioskAccount.id,
    `TEST e2e-${suffix} tablet`,
    kioskAccount.email,
    await bcrypt.hash(kioskAccount.password, 10),
  ]);
}

async function cleanup() {
  await db.query("DELETE FROM scan_attempts WHERE device_id = ANY($1)", [deviceIds]);
  // devices, attendance_events, wp_messages, student_guardians öğrenciyle birlikte silinir (CASCADE).
  await db.query("DELETE FROM students WHERE id = ANY($1)", [studentIds]);
  await db.query("DELETE FROM guardians WHERE id = ANY($1)", [[guardianId]]);
  await db.query("DELETE FROM kiosks WHERE id = $1", [kiosk.id]);
  await db.query("DELETE FROM admin_users WHERE id = $1", [kioskAccount.id]);
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM students WHERE id = ANY($1))
          + (SELECT count(*) FROM devices WHERE id = ANY($2))
          + (SELECT count(*) FROM scan_attempts WHERE device_id = ANY($2))
          + (SELECT count(*) FROM guardians WHERE id = $3)
          + (SELECT count(*) FROM kiosks WHERE id = $4)
          + (SELECT count(*) FROM admin_users WHERE id = $5) AS n`,
    [studentIds, deviceIds, guardianId, kiosk.id, kioskAccount.id],
  );
  check("temizlik: test kaydı kalmadı", Number(rows[0].n) === 0, rows[0]);
}

async function run() {
  // ---- ayarlar
  const cfg = await call("GET", "/config");
  check(
    "config: alanlar",
    cfg.status === 200 &&
      typeof cfg.data.bleRequired === "boolean" &&
      cfg.data.bleServiceUuid === "6f1b0000-5a1e-4c1a-9b9e-fb0000000001" &&
      cfg.data.slotSeconds === 5 &&
      typeof cfg.data.duplicateWindowSeconds === "number" &&
      typeof cfg.data.serverTime === "number",
    cfg,
  );

  // ---- e-posta kontrolü
  let r = await call("POST", "/student/check-email", { email: student.email.toUpperCase(), deviceId: device.id });
  check("check-email: yeni öğrenci → create-password (büyük/küçük harf duyarsız)", r.status === 200 && r.data.next === "create-password" && r.data.firstName === student.firstName, r);
  r = await call("POST", "/student/check-email", { email: `yok-${suffix}@izmirfen.test`, deviceId: device.id });
  check("check-email: bilinmeyen e-posta → 404 NOT_FOUND", r.status === 404 && r.data.code === "NOT_FOUND", r);

  // ---- şifre oluşturma + cihaz bağlama
  const setPassword = { email: student.email, password: studentPassword, deviceId: device.id, deviceSecret: device.secret, platform: "ios" };
  r = await call("POST", "/student/set-password", { ...setPassword, password: "kisa" });
  check("set-password: kısa şifre → 400 VALIDATION", r.status === 400 && r.data.code === "VALIDATION", r);
  r = await call("POST", "/student/set-password", setPassword);
  check("set-password: token döner", r.status === 200 && typeof r.data.token === "string" && r.data.student?.id === student.id, r);
  let studentToken = r.data?.token;
  const bound = await db.query("SELECT status, student_id, platform FROM devices WHERE id = $1", [device.id]);
  check("set-password: devices'ta ACTIVE kayıt", bound.rows[0]?.status === "ACTIVE" && bound.rows[0]?.student_id === student.id && bound.rows[0]?.platform === "ios", bound.rows[0]);
  r = await call("POST", "/student/set-password", setPassword);
  check("set-password: ikinci kez → 409 ALREADY_HAS_PASSWORD", r.status === 409 && r.data.code === "ALREADY_HAS_PASSWORD", r);

  // ---- cihaz kuralları
  r = await call("POST", "/student/check-email", { email: student.email, deviceId: device.id });
  check("check-email: şifre var → password", r.status === 200 && r.data.next === "password", r);
  r = await call("POST", "/student/check-email", { email: student.email, deviceId: secondDeviceId });
  check("check-email: ikinci telefon → 403 WRONG_DEVICE", r.status === 403 && r.data.code === "WRONG_DEVICE", r);
  r = await call("POST", "/student/check-email", { email: otherStudent.email, deviceId: device.id });
  check("check-email: aynı telefona ikinci öğrenci → 409 DEVICE_TAKEN", r.status === 409 && r.data.code === "DEVICE_TAKEN", r);
  r = await call("POST", "/student/set-password", { ...setPassword, email: otherStudent.email });
  check("set-password: aynı telefona ikinci öğrenci → 409 DEVICE_TAKEN", r.status === 409 && r.data.code === "DEVICE_TAKEN", r);

  // ---- öğrenci girişi
  r = await call("POST", "/student/login", { email: student.email, password: studentPassword, deviceId: device.id });
  check("login: doğru şifre → token", r.status === 200 && typeof r.data.token === "string" && r.data.student?.className === "E2E", r);
  if (r.data?.token) studentToken = r.data.token;
  r = await call("POST", "/student/login", { email: student.email, password: `${studentPassword}x`, deviceId: device.id });
  check("login: yanlış şifre → 401 BAD_CREDENTIALS", r.status === 401 && r.data.code === "BAD_CREDENTIALS", r);
  r = await call("POST", "/student/login", { email: otherStudent.email, password: studentPassword, deviceId: secondDeviceId });
  check("login: şifresi olmayan öğrenci → 401 BAD_CREDENTIALS", r.status === 401 && r.data.code === "BAD_CREDENTIALS", r);
  r = await call("POST", "/student/login", { email: student.email, password: studentPassword, deviceId: secondDeviceId });
  check("login: başka telefon → 403 WRONG_DEVICE", r.status === 403 && r.data.code === "WRONG_DEVICE", r);

  // ---- öğrenci bilgisi
  r = await call("GET", "/student/me", null, studentToken);
  check(
    "me: ilk okutma öncesi needsDirection=true, nextDirection=null",
    r.status === 200 && r.data.needsDirection === true && r.data.nextDirection === null && r.data.student?.presenceStatus === "OUT" && r.data.events?.length === 0,
    r,
  );
  r = await call("GET", "/student/me", null, "bozuk.token.degeri");
  check("me: bozuk token → 401 UNAUTHORIZED", r.status === 401 && r.data.code === "UNAUTHORIZED", r);

  // ---- kiosk tableti girişi
  r = await call("POST", "/admin/login", { email: kioskAccount.email, password: kioskAccount.password });
  check("admin/login: KIOSK hesabı → token", r.status === 200 && typeof r.data.token === "string" && r.data.admin?.id === kioskAccount.id, r);
  r = await call("POST", "/admin/login", { email: kioskAccount.email, password: `${kioskAccount.password}x` });
  check("admin/login: yanlış şifre → 401 BAD_CREDENTIALS", r.status === 401 && r.data.code === "BAD_CREDENTIALS", r);
  // İmzanın ilk karakteri değiştirilir (son karakterin bazı bitleri kullanılmaz, değişiklik fark edilmeyebilir).
  const [header, payload, signature] = studentToken.split(".");
  const forged = `${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  r = await call("GET", "/student/me", null, forged);
  check("me: imzası bozulmuş token → 401 UNAUTHORIZED", r.status === 401 && r.data.code === "UNAUTHORIZED", r);

  // ---- cihaz iptali (panelden "Cihazı sıfırla" ile aynı etki; yalnızca kendi cihazımız)
  await db.query("UPDATE devices SET status = 'REVOKED', revoked_at = now() WHERE id = $1 AND student_id = $2", [device.id, student.id]);
  r = await call("GET", "/student/me", null, studentToken);
  check("me: cihaz REVOKED → 401 DEVICE_REVOKED", r.status === 401 && r.data.code === "DEVICE_REVOKED", r);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tanımlı değil (.env.local).");
  process.exit(1);
}
await db.connect();
try {
  await createTestData();
  await run();
} catch (e) {
  failures++;
  console.error("✗ beklenmeyen hata:", e instanceof Error ? e.message : e);
} finally {
  await cleanup();
  await db.end();
}
console.log(failures ? `\n${failures} kontrol başarısız.` : "\nTüm kontroller geçti.");
process.exit(failures ? 1 : 0);
