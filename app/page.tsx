"use client";

import { useState } from "react";
import HabitCard from "@/components/HabitCard";
import { Habit } from "@/types/habit";

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([
    { id: 1, title: "Wasser trinken", done: false },
    { id: 2, title: "10 Minuten lesen", done: false },
    { id: 3, title: "Spazieren", done: false },
  ]);

  const [newHabit, setNewHabit] = useState("");

  function toggleHabit(id: number) {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id ? { ...habit, done: !habit.done } : habit
      )
    );
  }

  function addHabit() {
    if (!newHabit.trim()) return;

    const habit: Habit = {
      id: Date.now(),
      title: newHabit,
      done: false,
    };

    setHabits((current) => [...current, habit]);
    setNewHabit("");
  }

  function deleteHabit(id: number) {
    setHabits((current) => current.filter((habit) => habit.id !== id));
  }

  const completedCount = habits.filter((habit) => habit.done).length;

  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-2 text-3xl font-bold">Meine Routinen</h1>

      <p className="mb-6 text-gray-600">
        Heute erledigt: {completedCount} von {habits.length}
      </p>

      <div className="mb-6 flex gap-2">
        <input
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="Neue Routine..."
          className="flex-1 rounded-lg border p-2"
        />

        <button
          onClick={addHabit}
          className="rounded-lg border px-4 py-2"
        >
          Hinzufügen
        </button>
      </div>

      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggle={toggleHabit}
            onDelete={deleteHabit}
          />
        ))}
      </div>
    </main>
  );
}