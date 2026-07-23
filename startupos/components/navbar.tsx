"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <p className="font-semibold text-gray-900">StartupOS</p>

      <div className="flex gap-4">
        {/* Home */}
        <Link
          href="/"
          className={
            pathname === "/"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
        >
          Home
        </Link>

        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={
            pathname === "/dashboard"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
        >
          Dashboard
        </Link>

        {/* Tasks */}
        <Link
          href="/tasks"
          className={
            pathname === "/tasks"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
        >
          Tasks
        </Link>

        {/* Documents */}
        <Link
          href="/documents"
          className={
            pathname === "/documents"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
        >
          Documents
        </Link>

        {/* Agents */}
        <Link
          href="/agents"
          className={
            pathname === "/agents"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
        >
          Agents
        </Link>


        {/*Extract*/}
        <Link
        href="/extract"
        className={
            pathname === "/extract"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
        >
          Extract
        </Link>

      {/*Ask*/}
        <Link
        href="/ask"
        className={
            pathname === "/ask"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
          >
          Ask
        </Link>

        {/*Reports*/}
        <Link
        href="/report"
        className={
            pathname === "/report"
              ? "text-sm text-gray-900 font-semibold"
              : "text-sm text-gray-600 hover:text-gray-900"
          }
          >
          Reports
        </Link>
      </div>
    </nav>
  );
}