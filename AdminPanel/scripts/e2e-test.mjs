// Uçtan uca API testi: mobil uygulamanın yaptığı istekleri çalışan sunucuya (npm run dev) gönderir.
// Ortak veritabanında KENDİ verisini oluşturur ve sonunda (test başarısız olsa da) yalnızca onu siler (kök AGENTS.md §7.1).
// Kullanım: npm run dev açıkken ayrı terminalde `npm run test:e2e` (adres: API_URL, varsayılan http://localhost:3000).
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { buildQrPayload, bleToken, currentSlot, requestSignature } from "../src/lib/protocol.ts";

const API = `${process.env.API_URL ?? "http://localhost:3000"}/api/mobile`;
const suffix = randomBytes(4).toString("hex");
const hex = (n) => randomBytes(n).toString("hex");
// Test numaraları 0500 000 XX XX aralığından (gerçek operatörlere ayrılmamış); saklanan biçim +905XXXXXXXXX.
const testPhone = () => `+905000${String(randomBytes(3).readUIntBE(0, 3) % 1e6).padStart(6, "0")}`;
// "+905000123456" → "0500 012 34 56": uygulamaya yazılabilecek yerel biçim.
const localFormat = (phone) => `0${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`;

// Testin oluşturduğu kayıtlar — temizlik yalnızca bu kimlikleri siler.
const student = { id: `stu_${hex(8)}`, phone: testPhone(), firstName: "E2E", lastName: `Test ${suffix}` };
const otherStudent = { id: `stu_${hex(8)}`, phone: testPhone() };
const guardianId = `gua_${hex(8)}`;
const kiosk = { id: `kiosk_${hex(8)}`, name: `TEST e2e-${suffix}`, secret: hex(32) };
const disabledKiosk = { id: `kiosk_${hex(8)}`, name: `TEST e2e-${suffix} kapali` };
const kioskIds = [kiosk.id, disabledKiosk.id];
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mobil uygulamanın okutma isteği: QR + kioskun BLE jetonu + cihaz anahtarıyla imza.
function scan(token, slot, { qr = buildQrPayload(kiosk.secret, kiosk.id, slot), direction, deviceSecret = device.secret } = {}) {
  const ble = { token: bleToken(kiosk.secret, kiosk.id, slot), rssi: -60 };
  const timestamp = Date.now();
  return call("POST", "/scan", { qr, ble, timestamp, signature: requestSignature(deviceSecret, qr, ble.token, timestamp), direction }, token);
}

// WhatsApp gönderimi arka planda: mesajlar QUEUED'dan çıkana kadar kısa süre bekler.
async function eventMessages(eventId) {
  let rows = [];
  for (let i = 0; i < 20; i++) {
    ({ rows } = await db.query("SELECT status, attempt_count, sent_at FROM wp_messages WHERE event_id = $1", [eventId]));
    if (rows.length && rows.every((m) => m.status !== "QUEUED")) break;
    await sleep(250);
  }
  return rows;
}

async function createTestData() {
  await db.query(
    `INSERT INTO students (id, school_no, first_name, last_name, phone, class_name) VALUES
       ($1, 'E2E-1', $2, $3, $4, 'E2E'), ($5, 'E2E-2', 'E2E', $6, $7, 'E2E')`,
    [student.id, student.firstName, student.lastName, student.phone, otherStudent.id, `Test ${suffix} B`, otherStudent.phone],
  );
  await db.query("INSERT INTO guardians (id, full_name, phone) VALUES ($1, 'E2E Veli', '+900000000000')", [guardianId]);
  await db.query("INSERT INTO student_guardians (student_id, guardian_id) VALUES ($1, $2)", [student.id, guardianId]);
  await db.query("INSERT INTO kiosks (id, name, secret, status) VALUES ($1, $2, $3, 'ACTIVE'), ($4, $5, $6, 'DISABLED')", [
    kiosk.id,
    kiosk.name,
    kiosk.secret,
    disabledKiosk.id,
    disabledKiosk.name,
    hex(32),
  ]);
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
  await db.query("DELETE FROM kiosks WHERE id = ANY($1)", [kioskIds]);
  // Test tablet hesabının KIOSK_LOGIN / KIOSK_START kayıtları.
  await db.query("DELETE FROM audit_logs WHERE admin_user_id = $1", [kioskAccount.id]);
  await db.query("DELETE FROM admin_users WHERE id = $1", [kioskAccount.id]);
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM students WHERE id = ANY($1))
          + (SELECT count(*) FROM devices WHERE id = ANY($2))
          + (SELECT count(*) FROM scan_attempts WHERE device_id = ANY($2))
          + (SELECT count(*) FROM guardians WHERE id = $3)
          + (SELECT count(*) FROM kiosks WHERE id = ANY($4))
          + (SELECT count(*) FROM admin_users WHERE id = $5)
          + (SELECT count(*) FROM audit_logs WHERE admin_user_id = $5) AS n`,
    [studentIds, deviceIds, guardianId, kioskIds, kioskAccount.id],
  );
  check("temizlik: test kaydı kalmadı", Number(rows[0].n) === 0, rows[0]);
}

// Kök AGENTS.md §4 test vektörleri: sunucunun protocol.ts'i (mobildeki ile aynı sonucu vermeli).
function checkProtocolVectors() {
  const kioskSecret = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
  const deviceSecret = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const qr = buildQrPayload(kioskSecret, "kiosk_ana", 358175649);
  const vectors = [
    [qr, "FB2.kiosk_ana.358175649.ivyQsF9B06xMvaPuD6iMnw"],
    [buildQrPayload(kioskSecret, "kiosk_ana", 358175650), "FB2.kiosk_ana.358175650.ICWLy0KU5DhU-qSqdH3iWA"],
    [bleToken(kioskSecret, "kiosk_ana", 358175649), "548e111d76ce75ae"],
    [bleToken(kioskSecret, "kiosk_ana", 358175650), "9fae1e1ae653d81d"],
    [requestSignature(deviceSecret, qr, "548e111d76ce75ae", 1791125763537), "b1d5809f5f7aa836a6d9eaa99ea69471dde822176d6539d82f1b286b7484c53b"],
    [requestSignature(deviceSecret, qr, null, 1791125763537), "a05cdbeae0232aa7b98e6f0b3c105c1436077b56f903dcf2d5718f12000b3d63"],
    [currentSlot(1791125763537), 358225152],
  ];
  for (const [actual, expected] of vectors) check(`protokol: ${expected}`, actual === expected, actual);
}

async function run() {
  checkProtocolVectors();

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

  // ---- telefon numarası kontrolü
  let r = await call("POST", "/student/check-phone", { phone: localFormat(student.phone), deviceId: device.id });
  check("check-phone: yeni öğrenci → create-password (0XXX XXX XX XX biçimi de kabul)", r.status === 200 && r.data.next === "create-password" && r.data.firstName === student.firstName, r);
  r = await call("POST", "/student/check-phone", { phone: "12345", deviceId: device.id });
  check("check-phone: geçersiz numara → 400 VALIDATION", r.status === 400 && r.data.code === "VALIDATION", r);
  r = await call("POST", "/student/check-phone", { phone: testPhone(), deviceId: device.id });
  check("check-phone: kayıtlı olmayan numara → 404 NOT_FOUND", r.status === 404 && r.data.code === "NOT_FOUND", r);

  // ---- şifre oluşturma + cihaz bağlama
  const setPassword = { phone: student.phone, password: studentPassword, deviceId: device.id, deviceSecret: device.secret, platform: "ios" };
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
  r = await call("POST", "/student/check-phone", { phone: student.phone, deviceId: device.id });
  check("check-phone: şifre var → password", r.status === 200 && r.data.next === "password", r);
  r = await call("POST", "/student/check-phone", { phone: student.phone, deviceId: secondDeviceId });
  check("check-phone: ikinci telefon → 403 WRONG_DEVICE", r.status === 403 && r.data.code === "WRONG_DEVICE", r);
  r = await call("POST", "/student/check-phone", { phone: otherStudent.phone, deviceId: device.id });
  check("check-phone: aynı telefona ikinci öğrenci → 409 DEVICE_TAKEN", r.status === 409 && r.data.code === "DEVICE_TAKEN", r);
  r = await call("POST", "/student/set-password", { ...setPassword, phone: otherStudent.phone });
  check("set-password: aynı telefona ikinci öğrenci → 409 DEVICE_TAKEN", r.status === 409 && r.data.code === "DEVICE_TAKEN", r);

  // ---- öğrenci girişi
  r = await call("POST", "/student/login", { phone: student.phone, password: studentPassword, deviceId: device.id });
  check("login: doğru şifre → token", r.status === 200 && typeof r.data.token === "string" && r.data.student?.className === "E2E", r);
  if (r.data?.token) studentToken = r.data.token;
  r = await call("POST", "/student/login", { phone: student.phone, password: `${studentPassword}x`, deviceId: device.id });
  check("login: yanlış şifre → 401 BAD_CREDENTIALS", r.status === 401 && r.data.code === "BAD_CREDENTIALS", r);
  r = await call("POST", "/student/login", { phone: otherStudent.phone, password: studentPassword, deviceId: secondDeviceId });
  check("login: şifresi olmayan öğrenci → 401 BAD_CREDENTIALS", r.status === 401 && r.data.code === "BAD_CREDENTIALS", r);
  r = await call("POST", "/student/login", { phone: student.phone, password: studentPassword, deviceId: secondDeviceId });
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
  const kioskToken = r.data?.token;
  r = await call("POST", "/admin/login", { email: kioskAccount.email, password: `${kioskAccount.password}x` });
  check("admin/login: yanlış şifre → 401 BAD_CREDENTIALS", r.status === 401 && r.data.code === "BAD_CREDENTIALS", r);
  // İmzanın ilk karakteri değiştirilir (son karakterin bazı bitleri kullanılmaz, değişiklik fark edilmeyebilir).
  const [header, payload, signature] = studentToken.split(".");
  const forged = `${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  r = await call("GET", "/student/me", null, forged);
  check("me: imzası bozulmuş token → 401 UNAUTHORIZED", r.status === 401 && r.data.code === "UNAUTHORIZED", r);

  // ---- kiosk: liste → başlatma → feed
  r = await call("GET", "/kiosks", null, kioskToken);
  const listed = r.data?.kiosks ?? [];
  check(
    "kiosks: test kioskü listede, devre dışı kiosk listede yok",
    r.status === 200 && listed.some((k) => k.id === kiosk.id && k.name === kiosk.name) && !listed.some((k) => k.id === disabledKiosk.id),
    r,
  );
  r = await call("POST", `/kiosks/${kiosk.id}/start`, null, kioskToken);
  check(
    "kiosks/start: anahtar ve ayarlar döner",
    r.status === 200 &&
      r.data.kiosk?.id === kiosk.id &&
      r.data.kiosk?.name === kiosk.name &&
      r.data.secret === kiosk.secret &&
      r.data.slotSeconds === 5 &&
      r.data.bleServiceUuid === "6f1b0000-5a1e-4c1a-9b9e-fb0000000001" &&
      typeof r.data.bleRequired === "boolean" &&
      typeof r.data.serverTime === "number",
    r,
  );
  const audit = await db.query("SELECT 1 FROM audit_logs WHERE admin_user_id = $1 AND action = 'KIOSK_START' AND entity_id = $2", [kioskAccount.id, kiosk.id]);
  check("kiosks/start: audit_logs'a KIOSK_START yazıldı", audit.rowCount === 1, audit.rowCount);
  r = await call("POST", `/kiosks/${disabledKiosk.id}/start`, null, kioskToken);
  check("kiosks/start: devre dışı kiosk → 404 NOT_FOUND", r.status === 404 && r.data.code === "NOT_FOUND", r);
  r = await call("POST", `/kiosks/kiosk_yok_${suffix}/start`, null, kioskToken);
  check("kiosks/start: olmayan kiosk → 404 NOT_FOUND", r.status === 404 && r.data.code === "NOT_FOUND", r);

  // ---- okutma: redler (hepsi scan_attempts'a REJECTED yazılır)
  const s0 = currentSlot();
  r = await scan(studentToken, s0 - 3);
  check("scan: eski QR → 422 EXPIRED_QR", r.status === 422 && r.data.code === "EXPIRED_QR" && r.data.error === "QR kodun süresi doldu. Ekrandaki güncel kodu okutun.", r);
  r = await scan(studentToken, s0, { qr: `FB2.${kiosk.id}.${s0}.sahteimza` });
  check("scan: sahte QR → 422 INVALID_QR", r.status === 422 && r.data.code === "INVALID_QR", r);
  r = await scan(studentToken, s0, { qr: buildQrPayload(hex(32), disabledKiosk.id, s0) });
  check("scan: devre dışı kiosk → 422 UNKNOWN_KIOSK", r.status === 422 && r.data.code === "UNKNOWN_KIOSK", r);
  r = await scan(studentToken, s0, { deviceSecret: hex(32) });
  check("scan: yanlış imza → 422 BAD_SIGNATURE", r.status === 422 && r.data.code === "BAD_SIGNATURE", r);
  const rejected = await db.query("SELECT reject_reason FROM scan_attempts WHERE device_id = $1 AND result = 'REJECTED'", [device.id]);
  const reasons = rejected.rows.map((a) => a.reject_reason);
  check(
    "scan: redler scan_attempts'ta REJECTED",
    ["EXPIRED_QR", "INVALID_QR", "UNKNOWN_KIOSK", "BAD_SIGNATURE"].every((code) => reasons.includes(code)),
    reasons,
  );

  // ---- okutma: ilk okutma yön ister (hiçbir tabloya yazılmaz), sonra IN
  const countRows = async () =>
    (
      await db.query(
        "SELECT (SELECT count(*) FROM scan_attempts WHERE device_id = $1)::int AS attempts, (SELECT count(*) FROM attendance_events WHERE student_id = $2)::int AS events",
        [device.id, student.id],
      )
    ).rows[0];
  const before = await countRows();
  r = await scan(studentToken, s0);
  const after = await countRows();
  check("scan: ilk okutma, yön yok → 422 DIRECTION_REQUIRED", r.status === 422 && r.data.code === "DIRECTION_REQUIRED", r);
  check("scan: DIRECTION_REQUIRED kaydedilmedi", after.attempts === before.attempts && after.events === 0, { before, after });

  r = await scan(studentToken, s0, { direction: "IN" });
  const inEvent = r.data;
  check(
    "scan: direction IN → giriş kaydı",
    r.status === 200 &&
      inEvent.direction === "IN" &&
      inEvent.duplicate === false &&
      inEvent.bleVerified === true &&
      inEvent.studentName === `${student.firstName} ${student.lastName}` &&
      typeof inEvent.eventId === "string" &&
      typeof inEvent.occurredAt === "string" &&
      /^\d{2}:\d{2}$/.test(inEvent.time),
    r,
  );
  const presence = async () => (await db.query("SELECT presence_status FROM students WHERE id = $1", [student.id])).rows[0]?.presence_status;
  check("scan: presence_status = IN", (await presence()) === "IN");
  const stored = await db.query("SELECT source, kiosk_id, scan_attempt_id FROM attendance_events WHERE id = $1", [inEvent.eventId]);
  check("scan: attendance_events source APP + kiosk + deneme", stored.rows[0]?.source === "APP" && stored.rows[0]?.kiosk_id === kiosk.id && stored.rows[0]?.scan_attempt_id != null, stored.rows[0]);
  let msgs = await eventMessages(inEvent.eventId);
  check("scan: veliye bir WhatsApp mesajı MOCK_SENT", msgs.length === 1 && msgs[0].status === "MOCK_SENT" && msgs[0].attempt_count === 1 && msgs[0].sent_at != null, msgs);

  // ---- okutma: aynı QR tekrar → REPLAY
  r = await scan(studentToken, s0, { direction: "IN" });
  check("scan: aynı QR tekrar → 422 REPLAY", r.status === 422 && r.data.code === "REPLAY", r);
  const replay = await db.query("SELECT 1 FROM scan_attempts WHERE device_id = $1 AND result = 'REJECTED' AND reject_reason = 'REPLAY'", [device.id]);
  check("scan: REPLAY scan_attempts'ta REJECTED", replay.rowCount === 1, replay.rowCount);

  // ---- okutma: pencere içinde yeni QR → çift okutma (yeni olay/mesaj yok), sonra pencere geçince yön otomatik OUT
  // Kısa pencerede (ör. DUPLICATE_WINDOW_SECONDS=2) ortak veritabanının gecikmesi pencereyi aşar: çift okutma denenmez, pencere gerçekten beklenir.
  // Uzun pencerede çift okutma denenir, sonra yalnızca kendi test olayımızın saati pencere kadar geri alınır.
  const windowSeconds = Number(process.env.DUPLICATE_WINDOW_SECONDS || 120);
  if (windowSeconds < 30) {
    console.log(`  (pencere ${windowSeconds} sn: çift okutma kontrolü atlandı, pencere bekleniyor)`);
    await sleep((windowSeconds + 1) * 1000);
  } else {
    r = await scan(studentToken, s0 + 1);
    const messageCount = async () => (await db.query("SELECT count(*)::int AS n FROM wp_messages w JOIN attendance_events e ON e.id = w.event_id WHERE e.student_id = $1", [student.id])).rows[0].n;
    check("scan: pencere içinde → duplicate: true, son olay döner", r.status === 200 && r.data.duplicate === true && r.data.eventId === inEvent.eventId && r.data.direction === "IN", r);
    check("scan: çift okutmada yeni wp_messages yok", (await messageCount()) === 1);
    await db.query("UPDATE attendance_events SET occurred_at = occurred_at - make_interval(secs => $3) WHERE id = $1 AND student_id = $2", [
      inEvent.eventId,
      student.id,
      windowSeconds + 1,
    ]);
  }
  const used = [s0, s0 + 1];
  const now = currentSlot();
  const nextSlot = [now, now + 1, now - 1, now - 2].find((s) => !used.includes(s));
  r = await scan(studentToken, nextSlot, { direction: "IN" });
  check(`scan: pencere (${windowSeconds} sn) geçince → OUT`, r.status === 200 && r.data.direction === "OUT" && r.data.duplicate === false && r.data.eventId !== inEvent.eventId, r);
  check("scan: presence_status = OUT", (await presence()) === "OUT");
  msgs = await eventMessages(r.data?.eventId);
  check("scan: çıkışta da veliye bir WhatsApp mesajı MOCK_SENT", msgs.length === 1 && msgs[0].status === "MOCK_SENT", msgs);

  // Feed'de görünecek bir hareket ve bir okutma denemesi (öğrenci ve cihazla birlikte temizlenir).
  const eventId = `evt_${hex(8)}`;
  const attemptId = `att_${hex(8)}`;
  await db.query("INSERT INTO attendance_events (id, student_id, direction, source, kiosk_id) VALUES ($1, $2, 'IN', 'APP', $3)", [eventId, student.id, kiosk.id]);
  await db.query(
    `INSERT INTO scan_attempts (id, device_id, student_id, kiosk_id, time_slot, ble_token, ble_rssi, ble_ok, result, reject_reason)
     VALUES ($1, $2, $3, $4, 1, 'abcdef0123456789', -60, false, 'REJECTED', 'EXPIRED_QR')`,
    [attemptId, device.id, student.id, kiosk.id],
  );
  await db.query("UPDATE kiosks SET last_seen_at = NULL WHERE id = $1", [kiosk.id]);
  r = await call("GET", `/kiosks/${kiosk.id}/feed`, null, kioskToken);
  const event = r.data?.events?.find((e) => e.id === eventId);
  const attempt = r.data?.attempts?.find((a) => a.id === attemptId);
  check(
    "kiosks/feed: son 60 sn'deki hareket ve deneme döner",
    r.status === 200 &&
      typeof r.data.serverTime === "number" &&
      event?.name === `${student.firstName} ${student.lastName}` &&
      event.className === "E2E" &&
      event.direction === "IN" &&
      typeof event.occurredAt === "string" &&
      /^\d{2}:\d{2}$/.test(event.time) &&
      attempt?.studentName === `${student.firstName} ${student.lastName}` &&
      attempt.result === "REJECTED" &&
      attempt.rejectReason === "EXPIRED_QR" &&
      attempt.bleToken === "abcdef0123456789" &&
      attempt.bleRssi === -60 &&
      attempt.bleOk === false &&
      /^\d{2}:\d{2}$/.test(attempt.time),
    r,
  );
  const seen = await db.query("SELECT last_seen_at FROM kiosks WHERE id = $1", [kiosk.id]);
  check("kiosks/feed: last_seen_at güncellendi", seen.rows[0]?.last_seen_at != null, seen.rows[0]);
  r = await call("GET", `/kiosks/${kiosk.id}/feed?since=${encodeURIComponent("2100-01-01T00:00:00.000Z")}`, null, kioskToken);
  check("kiosks/feed: since sonrası kayıt yoksa boş listeler", r.status === 200 && r.data.events?.length === 0 && r.data.attempts?.length === 0, r);

  // ---- kiosk uç noktaları öğrenci token'ını kabul etmez
  for (const [method, path] of [
    ["GET", "/kiosks"],
    ["POST", `/kiosks/${kiosk.id}/start`],
    ["GET", `/kiosks/${kiosk.id}/feed`],
  ]) {
    r = await call(method, path, null, studentToken);
    check(`${method} ${path}: öğrenci token'ı → 401 UNAUTHORIZED`, r.status === 401 && r.data.code === "UNAUTHORIZED", r);
  }

  // ---- cihaz iptali (panelden "Cihazı sıfırla" ile aynı etki; yalnızca kendi cihazımız)
  await db.query("UPDATE devices SET status = 'REVOKED', revoked_at = now() WHERE id = $1 AND student_id = $2", [device.id, student.id]);
  r = await call("GET", "/student/me", null, studentToken);
  check("me: cihaz REVOKED → 401 DEVICE_REVOKED", r.status === 401 && r.data.code === "DEVICE_REVOKED", r);
  r = await scan(studentToken, currentSlot());
  check("scan: cihaz REVOKED → 422 DEVICE_NOT_BOUND", r.status === 422 && r.data.code === "DEVICE_NOT_BOUND", r);
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
