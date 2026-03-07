import React from "react";
import { Habit } from "@/types/habit";

type HabitCardProps = {
  habit: Habit;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
};

function HabitCardComponent({ habit, onToggle, onDelete }: HabitCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <span className={habit.done ? "text-lg line-through" : "text-lg"}>
        {habit.title}
      </span>

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(habit.id)}
          className="rounded-lg border px-4 py-2"
        >
          {habit.done ? "Rückgängig" : "Abhaken"}
        </button>

        <button
          onClick={() => onDelete(habit.id)}
          className="rounded-lg border px-4 py-2 text-red-600"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

export default React.memo(HabitCardComponent);