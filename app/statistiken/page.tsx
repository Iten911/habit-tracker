"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppMenu from "@/components/AppMenu";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type ProfileRow = {
  id: string;
  username: string;
  created_at: string;
};

type HabitRow = {
  id: number;
  created_at: string;
};

type HabitEntryRow = {
  id: number;
  habit_id: number;
  user_id: string;
  entry_date: string;
  completed: boolean;
  created_at: string;
};

type StatisticsData = {
  todayCompleted: number;
  todayTotalHabits: number;
  yesterdayCompleted: number;
  yesterdayTotalHabits: number;
  weekCompleted: number;
  weekTotalPossible: number;
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

export default function StatistikenPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");

  const [statistics, setStatistics] = useState<StatisticsData>({
    todayCompleted: 0,
    todayTotalHabits: 0,
    yesterdayCompleted: 0,
    yesterdayTotalHabits: 0,
    weekCompleted: 0,
    weekTotalPossible: 0,
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [today] = useState(getTodayDateString());
  const [yesterday] = useState(getYesterdayDateString());
  const [last7Days] = useState(getLast7DaysDates());

  const last7DaysStart = last7Days[0];

  const pieData = useMemo(() => {
    return [
      { name: "Erledigt", value: statistics.todayCompleted },
      {
        name: "Offen",
        value: Math.max(0, statistics.todayTotalHabits - statistics.todayCompleted),
      },
    ];
  }, [statistics.todayCompleted, statistics.todayTotalHabits]);

  const COLORS = ["#22c55e", "#ef4444"];

  const resetStatistics = useCallback(() => {
    setStatistics({
      todayCompleted: 0,
      todayTotalHabits: 0,
      yesterdayCompleted: 0,
      yesterdayTotalHabits: 0,
      weekCompleted: 0,
      weekTotalPossible: 0,
    });
  }, []);

  const fetchProfile = useCallback(async (currentUserId: string) => {
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
  }, []);

  const fetchStatistics = useCallback(
    async (currentUserId: string) => {
      setMessage("");

      const [{ data: habitsData, error: habitsError }, { data: entriesData, error: entriesError }] =
        await Promise.all([
          supabase
            .from("habits")
            .select("id, created_at")
            .eq("user_id", currentUserId),
          supabase
            .from("habit_entries")
            .select("id, habit_id, user_id, entry_date, completed, created_at")
            .eq("user_id", currentUserId)
            .gte("entry_date", last7DaysStart)
            .lte("entry_date", today)
            .eq("completed", true),
        ]);

      if (habitsError) {
        console.error("Fehler beim Laden der Habits:", habitsError);
        setMessage(habitsError.message);
        return;
      }

      if (entriesError) {
        console.error("Fehler beim Laden der Einträge:", entriesError);
        setMessage(entriesError.message);
        return;
      }

      const habits = (habitsData as HabitRow[]) ?? [];
      const entries = (entriesData as HabitEntryRow[]) ?? [];

      const habitCreatedDates = habits.map((habit) => habit.created_at.slice(0, 10));

      const todayTotalHabits = habitCreatedDates.filter(
        (createdDate) => createdDate <= today
      ).length;

      const yesterdayTotalHabits = habitCreatedDates.filter(
        (createdDate) => createdDate <= yesterday
      ).length;

      let weekTotalPossible = 0;

      for (const day of last7Days) {
        for (const createdDate of habitCreatedDates) {
          if (createdDate <= day) {
            weekTotalPossible += 1;
          }
        }
      }

      let todayCompleted = 0;
      let yesterdayCompleted = 0;

      for (const entry of entries) {
        if (entry.entry_date === today) {
          todayCompleted += 1;
        }

        if (entry.entry_date === yesterday) {
          yesterdayCompleted += 1;
        }
      }

      const weekCompleted = entries.length;

      setStatistics({
        todayCompleted,
        todayTotalHabits,
        yesterdayCompleted,
        yesterdayTotalHabits,
        weekCompleted,
        weekTotalPossible,
      });
    },
    [last7Days, last7DaysStart, today, yesterday]
  );

  const loadStatisticsPage = useCallback(
    async (currentUserId: string) => {
      setPageLoading(true);

      try {
        await Promise.all([
          fetchProfile(currentUserId),
          fetchStatistics(currentUserId),
        ]);
      } finally {
        setPageLoading(false);
      }
    },
    [fetchProfile, fetchStatistics]
  );

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
        setCurrentUsername("");
        resetStatistics();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resetStatistics]);

  useEffect(() => {
    if (!userId) {
      setCurrentUsername("");
      resetStatistics();
      setPageLoading(false);
      return;
    }

    loadStatisticsPage(userId);
  }, [userId, loadStatisticsPage, resetStatistics]);

  const handleSignOut = useCallback(async () => {
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Fehler beim Ausloggen:", error);
      setMessage(error.message);
      return;
    }
  }, []);

  if (authLoading || (userId && pageLoading)) {
    return (
      <main className="min-h-screen p-8">
        <p>Lade Statistiken...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen p-8">
        <AppMenu currentPath="/statistiken" />
        <h1 className="text-3xl font-bold">Statistiken</h1>
        <p className="mt-4 text-gray-600">Bitte logge dich zuerst ein.</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen p-8">
      <AppMenu currentPath="/statistiken" />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Statistiken</h1>
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
            {statistics.todayCompleted} / {statistics.todayTotalHabits}
          </p>
          <p className="mt-2 text-sm text-gray-500">Erledigte Routinen heute</p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Gestern</p>
          <p className="mt-2 text-3xl font-bold">
            {statistics.yesterdayCompleted} / {statistics.yesterdayTotalHabits}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Erledigte Routinen gestern
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="text-sm text-gray-500">Letzte 7 Tage</p>
          <p className="mt-2 text-3xl font-bold">
            {statistics.weekCompleted} / {statistics.weekTotalPossible}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Erledigte Häkchen in 7 Tagen
          </p>
        </div>
      </div>

      <div className="mt-10 h-80">
        <h2 className="mb-4 text-lg font-semibold">
          Heute: erledigt vs offen
        </h2>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={120}
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
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