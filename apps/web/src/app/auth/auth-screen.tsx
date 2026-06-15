import type { ReactNode } from "react";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="auth-screen">
      <section className="auth-brand">
        <div className="brand-mark">RB</div>
        <h1>RescueBase</h1>
        <p>Sanitätslager, Rucksackchecks und Nachfüllaufträge.</p>
      </section>
      {children}
    </main>
  );
}
