import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "super_admin") {
        navigate({ to: "/super-admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Left panel – Form ───────────────────────────── */}
      <div className="relative z-10 flex w-full flex-col justify-between border-r border-border bg-background px-8 shadow-2xl md:w-[480px] lg:px-12">
        {/* Header logo */}
        <div className="pt-10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div className="leading-none">
              <p className="text-base font-bold tracking-tight text-foreground">Medical AI</p>
              <p className="text-[11px] text-muted-foreground">Plateforme médicale intelligente</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto w-full max-w-sm py-12">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Bon retour parmi nous
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connectez-vous à l'espace de votre cabinet médical ou clinique.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Adresse email</label>
              <Input
                type="email"
                placeholder="dr.dupont@cabinet.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-surface"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Mot de passe</label>
                <a href="#" className="text-xs font-medium text-primary hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-surface"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Connexion…
                </span>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-8 rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comptes de démonstration
            </p>
            <div className="space-y-2">
              {[
                { label: "Super Admin (vous)", email: "admin@medical-ai.com", pw: "admin123" },
                { label: "Clinique dentaire", email: "demo@dentaire-tunis.com", pw: "demo123" },
                { label: "Cabinet cardiologie", email: "demo@cabinet-cardio.com", pw: "demo123" },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <p className="text-xs font-medium text-foreground">{d.label}</p>
                  <p className="text-[11px] text-muted-foreground">{d.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pb-8 text-xs text-muted-foreground">
          <Lock className="size-3" />
          Données médicales sécurisées de bout en bout
        </div>
      </div>

      {/* ── Right panel – Branding ───────────────────────── */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-muted/20 p-12 lg:flex">
        <div className="absolute top-1/4 left-1/4 size-[600px] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 size-[500px] rounded-full bg-accent/5 blur-[120px]" />

        <div className="relative z-10 max-w-xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm">
            <Sparkles className="size-4 text-primary" />
            Plateforme IA médicale multi-spécialités
          </div>

          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground">
            Récupérez les patients<br />
            <span className="text-primary">que vous perdez.</span>
          </h2>

          <p className="mb-12 text-lg text-muted-foreground">
            Notre IA identifie automatiquement les opportunités perdues, remplit votre agenda et communique avec vos patients via WhatsApp.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: "🤖", title: "IA WhatsApp", desc: "Répond automatiquement 24/7" },
              { icon: "📅", title: "Agenda intelligent", desc: "Créneaux remplis automatiquement" },
              { icon: "❤️", title: "Patients récupérés", desc: "+30% de fidélisation" },
              { icon: "💰", title: "Revenus récupérés", desc: "ROI mesurable et transparent" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="mb-2 text-2xl">{f.icon}</div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Specialities */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["Dentisterie", "Cardiologie", "Dermatologie", "Ophtalmologie", "Pédiatrie", "Gynécologie"].map((s) => (
              <span key={s} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
