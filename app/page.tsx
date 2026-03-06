"use client";

import { useState } from "react";
import HabitCard from "@/components/HabitCard";
import { Habit } from "@/types/habit";

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
      <h1 className="mb-2 text-3xl font-bold">Meine Routinen</h1>

      <p className="mb-6 text-gray-600">
        Heute erledigt: {completedCount} von {habits.length}
      </p>

      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} onToggle={toggleHabit} />
        ))}
      </div>
    </main>
  );
}