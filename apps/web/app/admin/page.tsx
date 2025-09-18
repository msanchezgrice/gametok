"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🎮 Clipcade Admin</h1>

        <div className="grid gap-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link
            href={"/admin/analytics" as any}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">📊 Analytics Dashboard</h2>
            <p className="text-gray-400">View game performance metrics, player engagement, and likability scores</p>
          </Link>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link
            href={"/admin/games" as any}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">🎯 Game Management</h2>
            <p className="text-gray-400">Manage your game catalog, view performance stats, add new games</p>
          </Link>

          <div className="bg-gray-800 opacity-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">👥 User Management</h2>
            <p className="text-gray-400">Coming soon: View user accounts, moderate content</p>
          </div>

          <div className="bg-gray-800 opacity-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">🔧 System Settings</h2>
            <p className="text-gray-400">Coming soon: Configure weights, scheduling, features</p>
          </div>
        </div>

        <div className="mt-12 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ Admin access is currently unrestricted for demo purposes.
            In production, add proper authentication.
          </p>
        </div>
      </div>
    </div>
  );
}