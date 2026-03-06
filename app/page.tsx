"use client";

import { useEffect, useState } from "react";
import HabitCard from "@/components/HabitCard";
import { Habit } from "@/types/habit";
import { supabase } from "@/lib/supabase";

type HabitRow = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHabits();
  }, []);

  async function fetchHabits() {
    setLoading(true);

    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden der Habits:", error);
      setLoading(false);
      return;
    }

    const formattedHabits: Habit[] = (data as HabitRow[]).map((habit) => ({
      id: habit.id,
      title: habit.title,
      done: habit.completed,
    }));

    setHabits(formattedHabits);
    setLoading(false);
  }

  async function toggleHabit(id: number) {
    const habitToUpdate = habits.find((habit) => habit.id === id);
    if (!habitToUpdate) return;

    const newDoneState = !habitToUpdate.done;

    const { error } = await supabase
      .from("habits")
      .update({ completed: newDoneState })
      .eq("id", id);

    if (error) {
      console.error("Fehler beim Aktualisieren des Habits:", error);
      return;
    }

    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id ? { ...habit, done: newDoneState } : habit
      )
    );
  }

  async function addHabit() {
    if (!newHabit.trim()) return;

    const trimmedTitle = newHabit.trim();

    const { data, error } = await supabase
      .from("habits")
      .insert([{ title: trimmedTitle, completed: false }])
      .select()
      .single();

    if (error) {
      console.error("Fehler beim Hinzufügen des Habits:", error);
      return;
    }

    const newHabitFromDb: Habit = {
      id: data.id,
      title: data.title,
      done: data.completed,
    };

    setHabits((current) => [...current, newHabitFromDb]);
    setNewHabit("");
  }

  async function deleteHabit(id: number) {
    const { error } = await supabase.from("habits").delete().eq("id", id);

    if (error) {
      console.error("Fehler beim Löschen des Habits:", error);
      return;
    }

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

        <button onClick={addHabit} className="rounded-lg border px-4 py-2">
          Hinzufügen
        </button>
      </div>

      {loading ? (
        <p>Lade Routinen...</p>
      ) : (
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
      )}
    </main>
  );
}