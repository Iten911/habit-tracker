"use client";

import { useEffect, useState } from "react";
import AppMenu from "@/components/AppMenu";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
};

type HabitRow = {
  id: number;
  created_at: string;
};

function formatDateToString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return formatDateToString(new Date());
}

function getYesterdayDateString() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDateToString(date);
}

function getLast7DaysDates() {
  const dates: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(formatDateToString(date));
  }

  return dates;
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");

  const [todayCompleted, setTodayCompleted] = useState(0);
  const [todayTotalHabits, setTodayTotalHabits] = useState(0);

  const [yesterdayCompleted, setYesterdayCompleted] = useState(0);
  const [yesterdayTotalHabits, setYesterdayTotalHabits] = useState(0);

  const [weekCompleted, setWeekCompleted] = useState(0);
  const [weekTotalPossible, setWeekTotalPossible] = useState(0);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const last7Days = getLast7DaysDates();
  const last7DaysStart = last7Days[0];

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
      setTodayCompleted(0);
      setTodayTotalHabits(0);
      setYesterdayCompleted(0);
      setYesterdayTotalHabits(0);
      setWeekCompleted(0);
      setWeekTotalPossible(0);
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
    setMessage("");

    const { data: habitsData, error: habitsError } = await supabase
      .from("habits")
      .select("id, created_at")
      .eq("user_id", currentUserId);

    if (habitsError) {
      console.error("Fehler beim Laden der Habits:", habitsError);
      setMessage(habitsError.message);
      return;
    }

    const habits = (habitsData as HabitRow[]) ?? [];

    const todayTotal = habits.filter((habit) => {
      const createdDate = habit.created_at.slice(0, 10);
      return createdDate <= today;
    }).length;

    const yesterdayTotal = habits.filter((habit) => {
      const createdDate = habit.created_at.slice(0, 10);
      return createdDate <= yesterday;
    }).length;

    let weekTotal = 0;

    for (const day of last7Days) {
      const habitsAvailableThatDay = habits.filter((habit) => {
        const createdDate = habit.created_at.slice(0, 10);
        return createdDate <= day;
      }).length;

      weekTotal += habitsAvailableThatDay;
    }

    setTodayTotalHabits(todayTotal);
    setYesterdayTotalHabits(yesterdayTotal);
    setWeekTotalPossible(weekTotal);

    const { data: todayEntries, error: todayError } = await supabase
      .from("habit_entries")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("entry_date", today)
      .eq("completed", true);

    if (todayError) {
      console.error("Fehler beim Laden von heute:", todayError);
      setMessage(todayError.message);
      return;
    }

    const { data: yesterdayEntries, error: yesterdayError } = await supabase
      .from("habit_entries")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("entry_date", yesterday)
      .eq("completed", true);

    if (yesterdayError) {
      console.error("Fehler beim Laden von gestern:", yesterdayError);
      setMessage(yesterdayError.message);
      return;
    }

    const { data: weekEntries, error: weekError } = await supabase
      .from("habit_entries")
      .select("id")
      .eq("user_id", currentUserId)
      .gte("entry_date", last7DaysStart)
      .lte("entry_date", today)
      .eq("completed", true);

    if (weekError) {
      console.error("Fehler beim Laden der letzten 7 Tage:", weekError);
      setMessage(weekError.message);
      return;
    }

    setTodayCompleted(todayEntries?.length ?? 0);
    setYesterdayCompleted(yesterdayEntries?.length ?? 0);
    setWeekCompleted(weekEntries?.length ?? 0);
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
        <p className="mt-4 text-gray-600">Bitte logge dich zuerst ein.</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen p-8">
      <AppMenu currentPath="/dashboard" />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Deine Tages- und Wochenübersicht</p>
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
          <p className="text-sm text-gray-500">Heute</p>
          <p className="mt-2 text-3xl font-bold">
            {todayCompleted} / {todayTotalHabits}
          </p>
          <p className="mt-2 text-sm text-gray-500">Erledigte Routinen heute</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Gestern</p>
          <p className="mt-2 text-3xl font-bold">
            {yesterdayCompleted} / {yesterdayTotalHabits}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Erledigte Routinen gestern
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Letzte 7 Tage</p>
          <p className="mt-2 text-3xl font-bold">
            {weekCompleted} / {weekTotalPossible}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Erledigte Häkchen in 7 Tagen
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <h2 className="mb-2 text-lg font-semibold">Info</h2>
        <p className="text-sm text-gray-600">Heute: {today}</p>
        <p className="text-sm text-gray-600">Gestern: {yesterday}</p>
      </div>

      <div className="fixed bottom-4 right-4 rounded-lg border bg-white px-4 py-2 text-sm shadow">
        Eingeloggt als:{" "}
        <span className="font-semibold">{currentUsername || "Unbekannt"}</span>
      </div>
    </main>
  );
}