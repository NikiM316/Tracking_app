/**
 * A minimal in-memory stand-in for the subset of the Supabase query builder
 * that features/monk/lib/challenge-ops.ts actually uses.
 *
 * The point is to test the date-walking and finalization logic — which day
 * rows get created, in what order, what they get scored as, and when a
 * challenge is closed — without a database. It deliberately implements only
 * the chains the module calls, and throws on anything else so an untested
 * query shape fails loudly instead of silently returning empty data.
 */

type Row = Record<string, unknown>;
type Filter = { column: string; value: unknown };
type Order = { column: string; ascending: boolean };

export type FakeSupabaseResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

/** Column defaults the real schema would apply on INSERT. */
const TABLE_DEFAULTS: Record<string, Row> = {
  monk_days: {
    status: "in_progress",
    finalized_at: null,
    finalization_source: null,
    social_media_actual_minutes: null,
    gaming_actual_minutes: null,
    gaming_limit_minutes: 30,
    accomplished: null,
    failed_to_do: null,
    why_failed: null,
    improve_tomorrow: null,
  },
  monk_habit_logs: {
    is_completed: false,
    completed_at: null,
  },
  monk_tasks: {
    is_mandatory: false,
    is_completed: false,
    completed_at: null,
    sort_order: 0,
  },
};

export class FakeSupabase {
  readonly tables: Record<string, Row[]>;

  /** Every query issued, in order — useful for asserting query counts. */
  readonly queryLog: string[] = [];

  private idCounter = 0;

  constructor(seed: Record<string, Row[]> = {}) {
    this.tables = {};
    for (const [table, rows] of Object.entries(seed)) {
      this.tables[table] = rows.map((row) => ({ ...row }));
    }
  }

  rows(table: string): Row[] {
    this.tables[table] ??= [];
    return this.tables[table];
  }

  nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  from(table: string): FakeQuery {
    return new FakeQuery(this, table);
  }
}

class FakeQuery implements PromiseLike<FakeSupabaseResult> {
  private operation: "select" | "insert" | "update" = "select";
  private payload: Row[] = [];
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private wantsCount = false;
  private headOnly = false;
  private returnsRows = false;

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string,
  ) {}

  select(
    _columns?: string,
    options?: { count?: "exact"; head?: boolean },
  ): this {
    if (this.operation === "select") {
      this.db.queryLog.push(`select ${this.table}`);
    }
    this.returnsRows = true;
    if (options?.count) this.wantsCount = true;
    if (options?.head) this.headOnly = true;
    return this;
  }

  insert(rows: Row | Row[]): this {
    this.operation = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.db.queryLog.push(`insert ${this.table}`);
    return this;
  }

  update(patch: Row): this {
    this.operation = "update";
    this.payload = [patch];
    this.db.queryLog.push(`update ${this.table}`);
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  private matching(): Row[] {
    const rows = this.db.rows(this.table).filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value),
    );

    for (const order of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const left = a[order.column];
        const right = b[order.column];
        if (left === right) return 0;
        const ascending = (left as number) < (right as number) ? -1 : 1;
        return order.ascending ? ascending : -ascending;
      });
    }

    return rows;
  }

  private run(): FakeSupabaseResult {
    if (this.operation === "insert") {
      const inserted = this.payload.map((row) => {
        const created: Row = {
          id: this.db.nextId(this.table),
          created_at: new Date().toISOString(),
          ...TABLE_DEFAULTS[this.table],
          ...row,
        };
        this.db.rows(this.table).push(created);
        return created;
      });

      return { data: this.returnsRows ? inserted : null, error: null };
    }

    if (this.operation === "update") {
      const targets = this.matching();
      const patch = this.payload[0];
      for (const target of targets) {
        Object.assign(target, patch);
      }
      return { data: this.returnsRows ? targets : null, error: null };
    }

    const rows = this.matching();

    if (this.wantsCount) {
      return {
        data: this.headOnly ? null : rows,
        error: null,
        count: rows.length,
      };
    }

    return { data: rows, error: null };
  }

  async maybeSingle(): Promise<FakeSupabaseResult> {
    const result = this.run();
    const rows = (result.data as Row[] | null) ?? [];

    if (rows.length > 1) {
      return {
        data: null,
        error: { message: "more than one row returned", code: "PGRST116" },
      };
    }

    return { data: rows[0] ?? null, error: null };
  }

  async single(): Promise<FakeSupabaseResult> {
    const result = this.run();
    const rows = (result.data as Row[] | null) ?? [];

    if (rows.length !== 1) {
      return {
        data: null,
        error: {
          message: `expected exactly one row, got ${rows.length}`,
          code: "PGRST116",
        },
      };
    }

    return { data: rows[0], error: null };
  }

  then<TResult1 = FakeSupabaseResult, TResult2 = never>(
    onfulfilled?:
      | ((value: FakeSupabaseResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/**
 * Builds a fake client typed loosely enough to pass where the real
 * `SupabaseClient` is expected. The cast is contained here so the tests
 * themselves stay free of `any`.
 */
export function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const db = new FakeSupabase(seed);
  return {
    db,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: db as any,
  };
}
