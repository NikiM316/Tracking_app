export const PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000";

export function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID || PLACEHOLDER_USER_ID;
}
