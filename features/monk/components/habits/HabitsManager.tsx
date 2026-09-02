"use client";

import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import {
  createHabit,
  reorderHabits,
  updateHabit,
} from "@/features/monk/actions/habits";
import { formatHabitTarget } from "@/features/monk/lib/format";
import type { ActionResult, HabitPageData } from "@/features/monk/types";
import type { MonkHabit } from "@/lib/supabase/monk-types";

function run(
  result: ActionResult,
  setError: (value: string | null) => void,
) {
  if ("error" in result) {
    setError(result.error);
    return;
  }
  setError(null);
}

export function HabitsManager({ habits }: HabitPageData) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    isMandatory: true,
    targetValue: "",
    targetUnit: "",
  });

  function act(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      run(await fn(), setError);
    });
  }

  function startEdit(habit: MonkHabit) {
    setEditingId(habit.id);
    setDraft({
      name: habit.name,
      isMandatory: habit.is_mandatory,
      targetValue: habit.target_value === null ? "" : String(habit.target_value),
      targetUnit: habit.target_unit ?? "",
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          New habit
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Edits apply from the next open day. Today&apos;s checklist keeps the
          snapshot already taken.
        </p>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            placeholder="Read 10 pages"
            onChange={(event) => setName(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder="Target"
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              className="min-h-11 w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none focus:border-emerald-500"
            />
            <input
              placeholder="unit (pages, min)"
              value={targetUnit}
              onChange={(event) => setTargetUnit(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(event) => setIsMandatory(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Mandatory
          </label>
          <Button
            fullWidth
            disabled={isPending || name.trim().length === 0}
            onClick={() =>
              act(async () => {
                const result = await createHabit({
                  name,
                  isMandatory,
                  targetValue: targetValue === "" ? null : Number(targetValue),
                  targetUnit: targetUnit.trim() || null,
                });
                if (!("error" in result)) {
                  setName("");
                  setTargetValue("");
                  setTargetUnit("");
                  setIsMandatory(true);
                }
                return result;
              })
            }
          >
            Create habit
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          All habits
        </h2>
        {habits.length === 0 ? (
          <p className="text-sm text-zinc-500">None yet.</p>
        ) : (
          habits.map((habit, index) => {
            const target = formatHabitTarget(habit.target_value, habit.target_unit);
            const isEditing = editingId === habit.id;

            return (
              <article
                key={habit.id}
                className={`rounded-2xl border p-4 ${
                  habit.is_active
                    ? "border-zinc-800 bg-zinc-900/60"
                    : "border-zinc-900 bg-zinc-950 opacity-70"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={draft.targetValue}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            targetValue: event.target.value,
                          }))
                        }
                        className="min-h-11 w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                      <input
                        value={draft.targetUnit}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            targetUnit: event.target.value,
                          }))
                        }
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={draft.isMandatory}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            isMandatory: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-emerald-500"
                      />
                      Mandatory
                    </label>
                    <div className="flex gap-2">
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          act(async () => {
                            const result = await updateHabit({
                              habitId: habit.id,
                              name: draft.name,
                              isMandatory: draft.isMandatory,
                              targetValue:
                                draft.targetValue === ""
                                  ? null
                                  : Number(draft.targetValue),
                              targetUnit: draft.targetUnit,
                            });
                            if (!("error" in result)) {
                              setEditingId(null);
                            }
                            return result;
                          })
                        }
                      >
                        Save
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-100">{habit.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {habit.is_mandatory ? "Mandatory" : "Optional"}
                          {target ? ` · ${target}` : ""}
                          {habit.is_active ? "" : " · inactive"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={index === 0 || isPending}
                          aria-label="Move up"
                          onClick={() => {
                            const ids = habits.map((item) => item.id);
                            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                            act(() => reorderHabits(ids));
                          }}
                          className="text-xs text-zinc-500 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === habits.length - 1 || isPending}
                          aria-label="Move down"
                          onClick={() => {
                            const ids = habits.map((item) => item.id);
                            [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                            act(() => reorderHabits(ids));
                          }}
                          className="text-xs text-zinc-500 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        className="min-h-10 px-3 text-xs"
                        onClick={() => startEdit(habit)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-10 px-3 text-xs"
                        onClick={() =>
                          act(() =>
                            updateHabit({
                              habitId: habit.id,
                              isActive: !habit.is_active,
                            }),
                          )
                        }
                      >
                        {habit.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  </>
                )}
              </article>
            );
          })
        )}
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
