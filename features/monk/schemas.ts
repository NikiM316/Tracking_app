import * as z from "zod";

import { uuidSchema } from "@/lib/validation";

const nonNegativeMinutesSchema = z
  .number({ error: "Minutes must be zero or more." })
  .finite("Minutes must be zero or more.")
  .min(0, "Minutes must be zero or more.");

export const habitDraftSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required."),
  isMandatory: z.boolean(),
  targetValue: z.number().finite().nullable(),
  targetUnit: z.string().trim().nullable(),
});

export const startChallengeSchema = z.object({
  socialMediaLimitMinutes: nonNegativeMinutesSchema,
  habits: z.array(habitDraftSchema).optional(),
});

export const toggleHabitLogSchema = z.object({
  logId: uuidSchema,
  completed: z.boolean(),
});

export const addTaskSchema = z.object({
  dayId: uuidSchema,
  title: z.string().trim().min(1, "Task title is required."),
  isMandatory: z.boolean().optional(),
  studyItemId: uuidSchema.nullable().optional(),
});

export const updateTaskSchema = z.object({
  taskId: uuidSchema,
  title: z.string().trim().min(1, "Task title is required.").optional(),
  isMandatory: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
});

export const deleteTaskSchema = z.object({
  taskId: uuidSchema,
});

export const reorderTasksSchema = z.object({
  dayId: uuidSchema,
  orderedIds: z.array(uuidSchema),
});

export const setMinutesSchema = z.object({
  dayId: uuidSchema,
  minutes: nonNegativeMinutesSchema.nullable(),
});

export const setLimitSchema = z.object({
  dayId: uuidSchema,
  minutes: nonNegativeMinutesSchema,
});

export const addStudyItemAsTaskSchema = z.object({
  dayId: uuidSchema,
  studyItemId: uuidSchema,
  isMandatory: z.boolean(),
  todayTarget: z.string().trim().min(1, "Set today's target before adding."),
});

export const toggleStudyPlanItemSchema = z.object({
  itemId: uuidSchema,
  completed: z.boolean(),
});

export const completeStudyModuleSchema = z.object({
  weekId: uuidSchema,
});

export const dayReflectionSchema = z.object({
  accomplished: z.string().nullable().optional(),
  whyFailed: z.string().nullable().optional(),
  failedToDo: z.string().nullable().optional(),
  improveTomorrow: z.string().nullable().optional(),
});

export const finalizeTodaySchema = z.object({
  dayId: uuidSchema,
  reflection: dayReflectionSchema.optional(),
});

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required."),
  isMandatory: z.boolean(),
  targetValue: z.number().finite().nullable(),
  targetUnit: z.string().trim().nullable(),
});

export const updateHabitSchema = z.object({
  habitId: uuidSchema,
  name: z.string().trim().min(1, "Habit name is required.").optional(),
  isMandatory: z.boolean().optional(),
  isActive: z.boolean().optional(),
  targetValue: z.number().finite().nullable().optional(),
  targetUnit: z.string().trim().nullable().optional(),
});

export const reorderHabitsSchema = z.array(uuidSchema);

export type StartChallengeInput = z.infer<typeof startChallengeSchema>;
export type DayReflectionInput = z.infer<typeof dayReflectionSchema>;
