"use client";

import Link from "next/link";

type AppMenuProps = {
  currentPath: "/" | "/dashboard";
};

export default function AppMenu({ currentPath }: AppMenuProps) {
  const baseClass = "rounded-lg border px-4 py-2 text-sm";
  const activeClass = "bg-black text-white";
  const inactiveClass = "bg-white text-black";

  return (
    <nav className="mb-6 flex gap-2">
      <Link
        href="/"
        className={`${baseClass} ${
          currentPath === "/" ? activeClass : inactiveClass
        }`}
      >
        Habits
      </Link>

      <Link
        href="/dashboard"
        className={`${baseClass} ${
          currentPath === "/dashboard" ? activeClass : inactiveClass
        }`}
      >
        Dashboard
      </Link>
    </nav>
  );
}