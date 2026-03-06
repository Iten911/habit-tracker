"use client";

import { useState } from "react";

type Habit = {
  id: number;
  title: string;
  done: boolean;
};

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([
    { id: 1, title: "Wasser trinken", done: false },
    { id: 2, title: "10 Minuten lesen", done: true },
    { id: 3, title: "Spazieren", done: false },
  ]);

  function toggleHabit(id: number) {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id ? { ...habit, done: !habit.done } : habit
      )
    );
  }

  const completedCount = habits.filter((habit) => habit.done).length;

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-2">Meine Routinen</h1>
      <p className="mb-6 text-gray-600">
        Heute erledigt: {completedCount} von {habits.length}
      </p>

      <div className="space-y-3">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <span className={habit.done ? "text-lg line-through" : "text-lg"}>
              {habit.title}
            </span>

            <button
              onClick={() => toggleHabit(habit.id)}
              className="rounded-lg border px-4 py-2"
            >
              {habit.done ? "Rückgängig" : "Abhaken"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}