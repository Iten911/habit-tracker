"use client";

import { useEffect, useState } from "react";
import AppMenu from "@/components/AppMenu";
import { supabase } from "@/lib/supabase";

type HabitRow = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
};

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [totalHabits, setTotalHabits] = useState(0);
  const [completedHabits, setCompletedHabits] = useState(0);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setCurrentUsername("");
      setTotalHabits(0);
      setCompletedHabits(0);
      return;
    }

    fetchProfile(userId);
    fetchDashboardData(userId);
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
      setCurrentUsername("Kein Profil");
      return;
    }

    const profile = data as ProfileRow;
    setCurrentUsername(profile.username);
  }

  async function fetchDashboardData(currentUserId: string) {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Fehler beim Laden der Dashboard-Daten:", error);
      setMessage(error.message);
      return;
    }

    const habits = (data as HabitRow[]) ?? [];
    const completedCount = habits.filter((habit) => habit.completed).length;

    setTotalHabits(habits.length);
    setCompletedHabits(completedCount);
  }

  async function handleSignOut() {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Fehler beim Ausloggen:", error);
      setMessage(error.message);
      return;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p>Lade Dashboard...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen p-8">
        <AppMenu currentPath="/dashboard" />
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-4 text-gray-600">
          Bitte logge dich zuerst ein.
        </p>
      </main>
    );
  }

  const openHabits = totalHabits - completedHabits;

  return (
    <main className="relative min-h-screen p-8">
      <AppMenu currentPath="/dashboard" />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Deine Übersicht auf einen Blick</p>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-lg border px-4 py-2"
        >
          Ausloggen
        </button>
      </div>

      {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Gesamte Routinen</p>
          <p className="mt-2 text-3xl font-bold">{totalHabits}</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Erledigt</p>
          <p className="mt-2 text-3xl font-bold">{completedHabits}</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Noch offen</p>
          <p className="mt-2 text-3xl font-bold">{openHabits}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <h2 className="mb-2 text-lg font-semibold">Info</h2>
        <p className="text-sm text-gray-600">
          Hier siehst du aktuell eine einfache Übersicht deiner Routinen.
        </p>
      </div>

      <div className="fixed bottom-4 right-4 rounded-lg border bg-white px-4 py-2 text-sm shadow">
        Eingeloggt als:{" "}
        <span className="font-semibold">{currentUsername || "Unbekannt"}</span>
      </div>
    </main>
  );
}