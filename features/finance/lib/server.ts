import { PLACEHOLDER_USER_ID } from "@/lib/utils/placeholder-user";

export function getPlaceholderUserId(): string {
  return process.env.PLACEHOLDER_USER_ID || PLACEHOLDER_USER_ID;
}

export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}
