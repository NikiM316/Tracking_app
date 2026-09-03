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
type RangeFilter = { column: string; op: "gte" | "lte"; value: unknown };
type InFilter = { column: string; values: unknown[] };
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

  /**
   * When true, the next `catch_up_missed_days_tx` call inserts missing days
   * then throws so tests can assert the in-memory transaction rolled back.
   */
  failRpcAfterMissingDays = false;

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

  private cloneTables(): Record<string, Row[]> {
    const copy: Record<string, Row[]> = {};
    for (const [table, rows] of Object.entries(this.tables)) {
      copy[table] = rows.map((row) => ({ ...row }));
    }
    return copy;
  }

  private restoreTables(snapshot: Record<string, Row[]>): void {
    for (const key of Object.keys(this.tables)) {
      delete this.tables[key];
    }
    for (const [table, rows] of Object.entries(snapshot)) {
      this.tables[table] = rows.map((row) => ({ ...row }));
    }
  }

  async rpc(
    name: string,
    args?: {
      payload?: {
        missing_days?: Row[];
        habit_logs?: Row[];
        day_updates?: Row[];
      };
    },
  ): Promise<FakeSupabaseResult> {
    this.queryLog.push(`rpc ${name}`);

    if (name !== "catch_up_missed_days_tx") {
      throw new Error(`unimplemented rpc: ${name}`);
    }

    const snapshot = this.cloneTables();
    const payload = args?.payload ?? {};
    const missingDays = payload.missing_days ?? [];
    const habitLogs = payload.habit_logs ?? [];
    const dayUpdates = payload.day_updates ?? [];

    try {
      for (const row of missingDays) {
        const days = this.rows("monk_days");
        const duplicate = days.some(
          (day) => day.challenge_id === row.challenge_id && day.date === row.date,
        );
        if (duplicate) {
          continue;
        }
        days.push({
          id: this.nextId("monk_days"),
          created_at: new Date().toISOString(),
          ...TABLE_DEFAULTS.monk_days,
          ...row,
        });
      }

      if (this.failRpcAfterMissingDays) {
        this.failRpcAfterMissingDays = false;
        throw new Error("forced failure after missing days");
      }

      for (const row of habitLogs) {
        const dayExists = this.rows("monk_days").some((day) => day.id === row.day_id);
        if (!dayExists) {
          continue;
        }
        const logs = this.rows("monk_habit_logs");
        const duplicate = logs.some(
          (log) => log.day_id === row.day_id && log.habit_id === row.habit_id,
        );
        if (duplicate) {
          continue;
        }
        logs.push({
          id: this.nextId("monk_habit_logs"),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...TABLE_DEFAULTS.monk_habit_logs,
          ...row,
        });
      }

      for (const patch of dayUpdates) {
        const day = this.rows("monk_days").find(
          (row) => row.id === patch.id && row.status === "in_progress",
        );
        if (!day) {
          continue;
        }
        Object.assign(day, {
          status: patch.status,
          finalized_at: patch.finalized_at,
          finalization_source: patch.finalization_source,
        });
      }

      return { data: null, error: null };
    } catch (error) {
      this.restoreTables(snapshot);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : "rpc failed",
        },
      };
    }
  }
}

class FakeQuery implements PromiseLike<FakeSupabaseResult> {
  private operation: "select" | "insert" | "update" = "select";
  private payload: Row[] = [];
  private filters: Filter[] = [];
  private rangeFilters: RangeFilter[] = [];
  private inFilters: InFilter[] = [];
  private orders: Order[] = [];
  private wantsCount = false;
  private headOnly = false;
  private returnsRows = false;
  private executed: FakeSupabaseResult | undefined;

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

  gte(column: string, value: unknown): this {
    this.rangeFilters.push({ column, op: "gte", value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.rangeFilters.push({ column, op: "lte", value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.inFilters.push({ column, values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  private matching(): Row[] {
    const rows = this.db.rows(this.table).filter((row) => {
      if (!this.filters.every((filter) => row[filter.column] === filter.value)) {
        return false;
      }

      for (const filter of this.rangeFilters) {
        const left = row[filter.column] as string | number;
        const right = filter.value as string | number;
        if (filter.op === "gte" && left < right) return false;
        if (filter.op === "lte" && left > right) return false;
      }

      for (const filter of this.inFilters) {
        if (!filter.values.includes(row[filter.column])) {
          return false;
        }
      }

      return true;
    });

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

  private snapshot(row: Row): Row {
    return { ...row };
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
        return this.snapshot(created);
      });

      return { data: this.returnsRows ? inserted : null, error: null };
    }

    if (this.operation === "update") {
      const targets = this.matching();
      const patch = this.payload[0];
      const updated: Row[] = [];
      for (const target of targets) {
        Object.assign(target, patch);
        updated.push(this.snapshot(target));
      }
      return { data: this.returnsRows ? updated : null, error: null };
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

  private execute(): FakeSupabaseResult {
    this.executed ??= this.run();
    return this.executed;
  }

  async maybeSingle(): Promise<FakeSupabaseResult> {
    const result = this.execute();
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
    const result = this.execute();
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
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
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
