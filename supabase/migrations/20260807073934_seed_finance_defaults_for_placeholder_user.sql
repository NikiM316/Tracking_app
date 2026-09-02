-- Seed finance_settings and default system categories for the single placeholder
-- user, matching the fitness domain's single-user prototype mode.

INSERT INTO finance_settings (user_id, base_currency)
VALUES ('00000000-0000-0000-0000-000000000000', 'EUR')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO finance_categories (user_id, kind, name, is_system, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Housing', true, 1),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Utilities', true, 2),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Groceries', true, 3),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Dining Out', true, 4),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Transportation', true, 5),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Health & Fitness', true, 6),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Insurance', true, 7),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Entertainment', true, 8),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Shopping', true, 9),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Subscriptions', true, 10),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Travel', true, 11),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Personal Care', true, 12),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Education', true, 13),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Gifts & Donations', true, 14),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Debt Payments', true, 15),
  ('00000000-0000-0000-0000-000000000000', 'expense', 'Other', true, 16),
  ('00000000-0000-0000-0000-000000000000', 'income', 'Salary', true, 1),
  ('00000000-0000-0000-0000-000000000000', 'income', 'Freelance & Business', true, 2),
  ('00000000-0000-0000-0000-000000000000', 'income', 'Investments', true, 3),
  ('00000000-0000-0000-0000-000000000000', 'income', 'Gifts Received', true, 4),
  ('00000000-0000-0000-0000-000000000000', 'income', 'Other Income', true, 5)
ON CONFLICT (user_id, kind, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name) DO NOTHING;
