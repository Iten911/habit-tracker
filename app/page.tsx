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
  user_id: string;
};

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Fehler beim Laden der Session:", error);
      }

      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);

      if (!session) {
        setHabits([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      setHabitsLoading(false);
      return;
    }

    fetchHabits(userId);
  }, [userId]);

  async function fetchHabits(currentUserId: string) {
    setHabitsLoading(true);

    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden der Habits:", error);
      setHabitsLoading(false);
      return;
    }

    const formattedHabits: Habit[] = (data as HabitRow[]).map((habit) => ({
      id: habit.id,
      title: habit.title,
      done: habit.completed,
    }));

    setHabits(formattedHabits);
    setHabitsLoading(false);
  }

  async function handleSignUp() {
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      setMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (error) {
      console.error("Fehler bei der Registrierung:", error);
      setMessage(error.message);
      return;
    }

    setMessage("Konto erstellt. Du kannst dich jetzt einloggen.");
    setPassword("");
  }

  async function handleSignIn() {
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      setMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      console.error("Fehler beim Einloggen:", error);
      setMessage(error.message);
      return;
    }

    setMessage("Erfolgreich eingeloggt.");
    setPassword("");
  }

  async function handleSignOut() {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Fehler beim Ausloggen:", error);
      setMessage(error.message);
      return;
    }

    setMessage("Du wurdest ausgeloggt.");
  }

  async function addHabit() {
    if (!newHabit.trim() || !userId) return;

    const trimmedTitle = newHabit.trim();

    const { data, error } = await supabase
      .from("habits")
      .insert([
        {
          title: trimmedTitle,
          completed: false,
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Fehler beim Hinzufügen des Habits:", error);
      setMessage(error.message);
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

  async function toggleHabit(id: number) {
    const habitToUpdate = habits.find((habit) => habit.id === id);
    if (!habitToUpdate || !userId) return;

    const newDoneState = !habitToUpdate.done;

    const { error } = await supabase
      .from("habits")
      .update({ completed: newDoneState })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Habits:", error);
      setMessage(error.message);
      return;
    }

    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id ? { ...habit, done: newDoneState } : habit
      )
    );
  }

  async function deleteHabit(id: number) {
    if (!userId) return;

    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Fehler beim Löschen des Habits:", error);
      setMessage(error.message);
      return;
    }

    setHabits((current) => current.filter((habit) => habit.id !== id));
  }

  const completedCount = habits.filter((habit) => habit.done).length;

  if (authLoading) {
    return (
      <main className="min-h-screen p-8">
        <p>Lade Anmeldung...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="mb-2 text-3xl font-bold">Habit Tracker</h1>
        <p className="mb-6 text-gray-600">
          Bitte registriere dich oder logge dich ein.
        </p>

        <div className="max-w-md space-y-4 rounded-xl border p-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
            className="w-full rounded-lg border p-2"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full rounded-lg border p-2"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSignUp}
              className="rounded-lg border px-4 py-2"
            >
              Registrieren
            </button>

            <button
              onClick={handleSignIn}
              className="rounded-lg border px-4 py-2"
            >
              Einloggen
            </button>
          </div>

          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Meine Routinen</h1>
          <p className="text-gray-600">
            Heute erledigt: {completedCount} von {habits.length}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-lg border px-4 py-2"
        >
          Ausloggen
        </button>
      </div>

      {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}

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

      {habitsLoading ? (
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