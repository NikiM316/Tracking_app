import * as z from "zod";

import { isValidStrictCalendarDate } from "@/features/finance/lib/months";
import { toFiniteNumber } from "@/features/finance/utils";
import { Constants } from "@/lib/supabase/database.generated";
import { currencySchema, uuidSchema } from "@/lib/validation";

function coerceFiniteNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number" || typeof value === "string") {
    return toFiniteNumber(value);
  }
  return value;
}

const finiteNumberSchema = z.preprocess(
  coerceFiniteNumber,
  z.number({ error: "Must be a number." }).finite("Must be a number."),
);

const positiveAmountSchema = z.preprocess(
  coerceFiniteNumber,
  z
    .number({ error: "Amount must be a positive number." })
    .finite("Amount must be a positive number.")
    .positive("Amount must be a positive number."),
);

const nonZeroAmountSchema = z.preprocess(
  coerceFiniteNumber,
  z
    .number({ error: "Amount must be a number." })
    .finite("Amount must be a number.")
    .refine((value) => value !== 0, "Amount cannot be zero."),
);

export const isoDateSchema = z
  .iso
  .date("Date must be YYYY-MM-DD.")
  .refine(isValidStrictCalendarDate, "Date is not a valid calendar day.");

export const financeAccountTypeSchema = z.enum(
  Constants.public.Enums.finance_account_type,
);

export const financeTransactionTypeSchema = z.enum(
  Constants.public.Enums.finance_transaction_type,
);

export const financeCategoryKindSchema = z.enum(
  Constants.public.Enums.finance_category_kind,
);

export const financeSecurityTypeSchema = z.enum(
  Constants.public.Enums.finance_security_type,
);

export const financeInvestmentTradeTypeSchema = z.enum(["buy", "sell"]);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required."),
  accountType: financeAccountTypeSchema,
  currency: currencySchema.optional(),
  openingBalance: finiteNumberSchema.optional(),
});

const cashflowTransactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  accountId: uuidSchema,
  categoryId: uuidSchema,
  amount: positiveAmountSchema,
  currency: currencySchema.optional(),
  date: isoDateSchema.optional(),
  payee: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const transferTransactionSchema = z
  .object({
    type: z.literal("transfer"),
    accountId: uuidSchema,
    transferAccountId: uuidSchema,
    amount: positiveAmountSchema,
    currency: currencySchema.optional(),
    date: isoDateSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((input) => input.transferAccountId !== input.accountId, {
    error: "Transfer destination must differ from the source account.",
    path: ["transferAccountId"],
  });

export const createTransactionSchema = z.discriminatedUnion("type", [
  cashflowTransactionSchema,
  transferTransactionSchema,
]);

export const updateTransactionSchema = z
  .object({
    id: uuidSchema,
    date: isoDateSchema.optional(),
    amount: positiveAmountSchema.optional(),
    category_id: uuidSchema.nullable().optional(),
  })
  .refine(
    (input) =>
      input.date !== undefined ||
      input.amount !== undefined ||
      input.category_id !== undefined,
    "No changes provided.",
  );

export const deleteTransactionSchema = z.object({
  id: uuidSchema,
});

export const bulkImportTransactionRowSchema = z.object({
  date: isoDateSchema,
  amount: nonZeroAmountSchema,
  description: z.string(),
});

export const bulkInsertTransactionsSchema = z.object({
  accountId: uuidSchema,
  transactions: z.array(z.unknown()).min(1, "No valid transaction rows to import."),
});

export const createPortfolioSchema = z.object({
  name: z.string().trim().min(1, "Portfolio name is required."),
  baseCurrency: currencySchema.optional(),
});

export const createSecuritySchema = z.object({
  symbol: z.string().trim().min(1, "Symbol is required."),
  name: z.string().trim().optional(),
  securityType: financeSecurityTypeSchema,
  currency: currencySchema.optional(),
});

export const createInvestmentTransactionSchema = z.object({
  portfolioId: uuidSchema,
  type: financeInvestmentTradeTypeSchema,
  symbol: z.string().trim().min(1, "Asset symbol is required."),
  name: z.string().trim().optional(),
  securityType: financeSecurityTypeSchema,
  quantity: z.preprocess(
    coerceFiniteNumber,
    z
      .number({ error: "Quantity must be a positive number." })
      .finite("Quantity must be a positive number.")
      .positive("Quantity must be a positive number."),
  ),
  price: z.preprocess(
    coerceFiniteNumber,
    z
      .number({ error: "Price must be zero or greater." })
      .finite("Price must be zero or greater.")
      .min(0, "Price must be zero or greater."),
  ),
  currency: currencySchema.optional(),
  tradeDate: isoDateSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const fetchHistoricalMonthSchema = isoDateSchema;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type BulkImportTransactionRow = z.infer<typeof bulkImportTransactionRowSchema>;
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type CreateSecurityInput = z.infer<typeof createSecuritySchema>;
export type CreateInvestmentTransactionInput = z.infer<
  typeof createInvestmentTransactionSchema
>;
