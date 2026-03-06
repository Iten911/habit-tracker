import { Habit } from "@/types/habit";

type HabitCardProps = {
  habit: Habit;
  onToggle: (id: number) => void;
};

export default function HabitCard({ habit, onToggle }: HabitCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4">
      <span className={habit.done ? "text-lg line-through" : "text-lg"}>
        {habit.title}
      </span>

      <button
        onClick={() => onToggle(habit.id)}
        className="rounded-lg border px-4 py-2"
      >
        {habit.done ? "Rückgängig" : "Abhaken"}
      </button>
    </div>
  );
}