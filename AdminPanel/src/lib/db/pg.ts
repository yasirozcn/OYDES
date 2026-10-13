// PostgreSQL bağlantı havuzu. Uygulamanın geri kalanı bunu doğrudan kullanmaz; yalnızca `repo.ts` üzerinden erişir.
import "server-only";
import { Pool, types, type PoolClient } from "pg";

// bigint (time_slot) varsayılan olarak metin döner; kodda sayı bekleniyor.
types.setTypeParser(types.builtins.INT8, (v) => Number(v));

type PgState = { pool?: Pool };
// Next.js geliştirme modunda modüller yeniden yüklenebildiği için havuzu globalde tutuyoruz.
const g = globalThis as unknown as { __fbPg?: PgState };
const state: PgState = g.__fbPg ?? (g.__fbPg = {});

// Havuz ilk sorguda oluşturulur: `next build` sırasında DATABASE_URL yokken modülün yüklenebilmesi için.
function getPool(): Pool {
  if (state.pool) return state.pool;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tanımlı değil. .env.local dosyasını .env.example'dan oluşturun (README: Veritabanına bağlanma).");
  return (state.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Ortak veritabanına ekipteki herkes bağlandığı için her geliştiricinin havuzu küçük tutulur.
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
  }));
}

type Queryable = Pick<PoolClient, "query">;

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** snake_case satırı camelCase nesneye çevirir; tarihleri ISO metnine dönüştürür. */
export function camel<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v instanceof Date ? v.toISOString() : v]),
  ) as T;
}

/** camelCase nesneyi tabloya ekler (kolon adları otomatik snake_case yapılır). */
export async function insertRow(c: Queryable, table: string, row: object): Promise<void> {
  const entries = Object.entries(row);
  const cols = entries.map(([k]) => snake(k));
  const values = entries.map(([k, v]) => ((k === "beforeValue" || k === "afterValue") && v != null ? JSON.stringify(v) : v));
  await c.query(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`, values);
}

/** Tek sorgu; satırları camelCase döner. */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await getPool().query(text, params);
  return r.rows.map((row) => camel<T>(row));
}

/** Transaction: fn içindeki tüm sorgular ya birlikte yazılır ya hiç yazılmaz. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await getPool().connect();
  try {
    await c.query("BEGIN");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
