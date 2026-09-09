"use client";

import { useState } from "react";

import { Button } from "@/features/core/components/Button";
import {
  addTask,
  deleteTask,
  reorderTasks,
  updateTask,
} from "@/features/monk/actions/today";
import type { MonkTask } from "@/lib/supabase/monk-types";

import type { ChecklistAct } from "./checklist-shared";

type TasksSectionProps = {
  dayId: string;
  tasks: MonkTask[];
  locked: boolean;
  isPending: boolean;
  mutatingIds: Set<string>;
  act: ChecklistAct;
};

export function TasksSection({
  dayId,
  tasks,
  locked,
  isPending,
  mutatingIds,
  act,
}: TasksSectionProps) {
  const [newTask, setNewTask] = useState("");
  const [newTaskMandatory, setNewTaskMandatory] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Today&apos;s tasks
      </h2>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No tasks yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
            >
              {editingTaskId === task.id ? (
                <div className="space-y-2">
                  <input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      disabled={locked || isPending}
                      onClick={() =>
                        act(async () => {
                          const result = await updateTask({
                            taskId: task.id,
                            title: editingTitle,
                          });
                          if (!("error" in result)) {
                            setEditingTaskId(null);
                          }
                          return result;
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setEditingTaskId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    disabled={locked || mutatingIds.has(task.id)}
                    onClick={() =>
                      act(
                        () =>
                          updateTask({
                            taskId: task.id,
                            isCompleted: !task.is_completed,
                          }),
                        { type: "toggleTask", id: task.id },
                      )
                    }
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border disabled:opacity-50 ${
                      task.is_completed
                        ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                        : "border-zinc-600"
                    }`}
                  >
                    {task.is_completed ? "✓" : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${
                        task.is_completed ? "text-zinc-400 line-through" : "text-zinc-100"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {task.is_mandatory ? "Mandatory" : "Optional"}
                    </p>
                  </div>
                  {locked ? null : (
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        disabled={index === 0 || isPending}
                        aria-label="Move up"
                        onClick={() => {
                          const ids = tasks.map((item) => item.id);
                          const next = [...ids];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          act(() => reorderTasks(dayId, next));
                        }}
                        className="text-xs text-zinc-500 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === tasks.length - 1 || isPending}
                        aria-label="Move down"
                        onClick={() => {
                          const ids = tasks.map((item) => item.id);
                          const next = [...ids];
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          act(() => reorderTasks(dayId, next));
                        }}
                        className="text-xs text-zinc-500 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              )}
              {locked || editingTaskId === task.id ? null : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3 text-xs"
                    onClick={() =>
                      act(() =>
                        updateTask({
                          taskId: task.id,
                          isMandatory: !task.is_mandatory,
                        }),
                      )
                    }
                  >
                    {task.is_mandatory ? "Make optional" : "Make mandatory"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3 text-xs"
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTitle(task.title);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-10 px-3 text-xs text-red-400"
                    onClick={() =>
                      act(() => deleteTask(task.id), {
                        type: "deleteTask",
                        id: task.id,
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {locked ? null : (
        <div className="mt-4 space-y-2">
          <input
            value={newTask}
            placeholder="Add a task for today"
            onChange={(event) => setNewTask(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base outline-none focus:border-emerald-500"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={newTaskMandatory}
              onChange={(event) => setNewTaskMandatory(event.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Mandatory
          </label>
          <Button
            fullWidth
            variant="secondary"
            disabled={isPending || newTask.trim().length === 0}
            onClick={() =>
              act(async () => {
                const result = await addTask({
                  dayId,
                  title: newTask,
                  isMandatory: newTaskMandatory,
                });
                if (!("error" in result)) {
                  setNewTask("");
                  setNewTaskMandatory(false);
                }
                return result;
              })
            }
          >
            Add task
          </Button>
        </div>
      )}
    </section>
  );
}
