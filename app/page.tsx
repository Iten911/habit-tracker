"use client";

import { useEffect, useState } from "react";
import HabitCard from "@/components/HabitCard";
import AppMenu from "@/components/AppMenu";
import { Habit } from "@/types/habit";
import { supabase } from "@/lib/supabase";

type HabitRow = {
  id: number;
  title: string;
  created_at: string;
  user_id: string;
};

type HabitEntryRow = {
  id: number;
  habit_id: number;
  user_id: string;
  entry_date: string;
  completed: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
};

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");

  const [authLoading, setAuthLoading] = useState(true);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const today = getTodayDateString();

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
        setCurrentUsername("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      setCurrentUsername("");
      setHabitsLoading(false);
      return;
    }

    fetchProfile(userId);
    fetchHabitsForToday(userId);
  }, [userId]);

  async function fetchProfile(currentUserId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .maybeSingle();

    if (error) {
      console.error("Fehler beim Laden des Profils:", error);
      setCurrentUsername("Unbekannt");
      return;
    }

    if (!data) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const usernameFromMeta =
        user?.user_metadata?.username?.toString().trim() || "User";

      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert([
          {
            id: currentUserId,
            username: usernameFromMeta,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Fehler beim Erstellen des Profils:", insertError);
        setCurrentUsername("Kein Profil");
        return;
      }

      const newProfile = insertedProfile as ProfileRow;
      setCurrentUsername(newProfile.username);
      return;
    }

    const profile = data as ProfileRow;
    setCurrentUsername(profile.username);
  }

  async function fetchHabitsForToday(currentUserId: string) {
    setHabitsLoading(true);

    const { data: habitsData, error: habitsError } = await supabase
      .from("habits")
      .select("id, title, created_at, user_id")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (habitsError) {
      console.error("Fehler beim Laden der Habits:", habitsError);
      setHabitsLoading(false);
      return;
    }

    const { data: entriesData, error: entriesError } = await supabase
      .from("habit_entries")
      .select("*")
      .eq("user_id", currentUserId)
      .eq("entry_date", today);

    if (entriesError) {
      console.error("Fehler beim Laden der Tages-Einträge:", entriesError);
      setHabitsLoading(false);
      return;
    }

    const habitsRows = (habitsData as HabitRow[]) ?? [];
    const entriesRows = (entriesData as HabitEntryRow[]) ?? [];

    const formattedHabits: Habit[] = habitsRows.map((habit) => {
      const todayEntry = entriesRows.find((entry) => entry.habit_id === habit.id);

      return {
        id: habit.id,
        title: habit.title,
        done: todayEntry?.completed ?? false,
      };
    });

    setHabits(formattedHabits);
    setHabitsLoading(false);
  }

  async function handleSignUp() {
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !password.trim() || !trimmedUsername) {
      setMessage("Bitte E-Mail, Passwort und Benutzername eingeben.");
      return;
    }

    const { data: existingProfile, error: usernameCheckError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", trimmedUsername)
      .maybeSingle();

    if (usernameCheckError) {
      console.error("Fehler beim Prüfen des Benutzernamens:", usernameCheckError);
      setMessage("Benutzername konnte nicht geprüft werden.");
      return;
    }

    if (existingProfile) {
      setMessage("Dieser Benutzername ist bereits vergeben.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          username: trimmedUsername,
        },
      },
    });

    if (error) {
      console.error("Fehler bei der Registrierung:", error);

      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("already registered") ||
        errorMessage.includes("user already registered")
      ) {
        setMessage("Diese E-Mail-Adresse wird bereits verwendet.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setMessage("Konto erstellt. Bitte jetzt einloggen.");
    setPassword("");
  }

  async function handleSignIn() {
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();

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
      done: false,
    };

    setHabits((current) => [...current, newHabitFromDb]);
    setNewHabit("");
  }

  async function toggleHabit(id: number) {
    if (!userId) return;

    const habitToUpdate = habits.find((habit) => habit.id === id);
    if (!habitToUpdate) return;

    const newDoneState = !habitToUpdate.done;

    const { data: existingEntry, error: fetchEntryError } = await supabase
      .from("habit_entries")
      .select("*")
      .eq("habit_id", id)
      .eq("user_id", userId)
      .eq("entry_date", today)
      .maybeSingle();

    if (fetchEntryError) {
      console.error("Fehler beim Laden des Tages-Eintrags:", fetchEntryError);
      setMessage(fetchEntryError.message);
      return;
    }

    if (existingEntry) {
      const { error: updateError } = await supabase
        .from("habit_entries")
        .update({ completed: newDoneState })
        .eq("id", existingEntry.id);

      if (updateError) {
        console.error("Fehler beim Aktualisieren des Tages-Eintrags:", updateError);
        setMessage(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("habit_entries").insert([
        {
          habit_id: id,
          user_id: userId,
          entry_date: today,
          completed: newDoneState,
        },
      ]);

      if (insertError) {
        console.error("Fehler beim Erstellen des Tages-Eintrags:", insertError);
        setMessage(insertError.message);
        return;
      }
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
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Benutzername"
            className="w-full rounded-lg border p-2"
          />

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
    <main className="relative min-h-screen p-8">
      <AppMenu currentPath="/" />
      
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Meine Routinen</h1>
          <p className="text-gray-600">
            Heute erledigt: {completedCount} von {habits.length}
          </p>
          <p className="text-sm text-gray-500">Datum: {today}</p>
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addHabit();
            }
          }}
          placeholder="Neue Routine..."
          className="flex-1 rounded-lg border p-2"
        />

        <button onClick={addHabit} className="rounded-lg border px-4 py-2">
          Hinzufügen
        </button>
      </div>

      {habitsLoading ? (
        <p>Lade Routinen...</p>
      ) : habits.length === 0 ? (
        <p className="text-gray-500">
          Noch keine Routinen. Füge deine erste Routine hinzu.
        </p>
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

      <div className="fixed bottom-4 right-4 rounded-lg border bg-white px-4 py-2 text-sm shadow">
        Eingeloggt als:{" "}
        <span className="font-semibold">{currentUsername || "Unbekannt"}</span>
      </div>
    </main>
  );
}