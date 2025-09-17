export default function SettingsPage() {
  return (
    <section className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-8">
      <header>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-white/70">Manage your account, analytics preferences, and support.</p>
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Account</h2>
          <p className="mt-2 text-sm text-white/70">Sign in to sync progress across devices.</p>
          <button className="mt-4 w-full rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/90">
            Sign in with email
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Analytics</h2>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-white">Share gameplay analytics</p>
              <p className="text-white/60">Help us surface the best games by sharing anonymous usage events.</p>
            </div>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase text-white/70">Coming soon</span>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[color:var(--surface)]/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Support</h2>
          <ul className="mt-2 space-y-2 text-sm text-white/80">
            <li>Email: support@gametok.app</li>
            <li>Discord: #gametok-alpha</li>
          </ul>
        </section>
      </div>
    </section>
  );
}
