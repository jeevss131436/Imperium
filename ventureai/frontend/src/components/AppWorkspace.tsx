import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Loader2,
  Lock,
  CircleAlert,
  ArrowRight,
  MapPin,
  Globe,
  Layers,
} from "lucide-react";
import { AGENTS, type AgentConfig } from "@/config/agents";
import { StatusGlyph } from "@/components/ui/status-glyph";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { runSourcing, ApiError, type StartupProfile } from "@/lib/api";
import { cn } from "@/lib/utils";

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; profile: StartupProfile }
  | { status: "error"; message: string };

/**
 * The workspace. A three-pane editorial console: the agent index on the left,
 * the active agent's intake in the center, and its output below. Agents that
 * aren't wired into the backend render an elegant "deployment pending" state
 * instead of a dead form.
 */
export function AppWorkspace() {
  const [activeId, setActiveId] = useState<string>(AGENTS[0].id);
  const active = AGENTS.find((a) => a.id === activeId)!;

  return (
    <div className="container py-12 sm:py-16">
      <header className="mb-10 flex flex-col gap-4 border-b border-ink/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-mono mb-3">Workspace — Deal Console</p>
          <h1 className="font-display text-4xl font-bold tracking-tightest sm:text-5xl">
            Run the committee
          </h1>
        </div>
        <p className="max-w-sm font-sans text-sm leading-relaxed text-muted-foreground">
          Select an agent from the index. Live agents accept input now; the rest
          are queued for deployment.
        </p>
      </header>

      <div className="grid gap-px bg-ink/10 lg:grid-cols-[300px_1fr]">
        <AgentIndex active={activeId} onSelect={setActiveId} />
        <section className="bg-paper p-6 sm:p-10">
          <AgentPanel key={active.id} agent={active} />
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Left rail — the numbered index of agents.                          */
/* ------------------------------------------------------------------ */

function AgentIndex({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="bg-paper" aria-label="Agent index">
      <p className="label-mono px-6 pb-4 pt-6">Index</p>
      <ul>
        {AGENTS.map((agent) => {
          const isActive = agent.id === active;
          return (
            <li key={agent.id}>
              <button
                onClick={() => onSelect(agent.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 border-t border-ink/10 px-6 py-5 text-left transition-colors duration-300",
                  isActive ? "bg-ink text-paper" : "hover:bg-ink/[0.04]",
                )}
              >
                <span className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-[0.2em]",
                      isActive ? "text-paper/60" : "text-muted-foreground",
                    )}
                  >
                    {agent.code}
                  </span>
                  <span className="font-display text-lg font-bold leading-none tracking-tight">
                    {agent.name}
                  </span>
                </span>
                {isActive ? (
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                ) : (
                  <StatusGlyph available={agent.isAvailable} className="shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Center/right — the active agent's panel.                           */
/* ------------------------------------------------------------------ */

function AgentPanel({ agent }: { agent: AgentConfig }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">
          <agent.icon className="mt-1 h-8 w-8 shrink-0" strokeWidth={1.3} />
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
              {agent.code} · {agent.role}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tightest">
              {agent.name}
            </h2>
            <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-muted-foreground">
              {agent.summary}
            </p>
          </div>
        </div>
        <StatusGlyph available={agent.isAvailable} />
      </div>

      <div className="pt-8">
        {agent.isAvailable ? (
          <LiveAgent agent={agent} />
        ) : (
          <PendingState agent={agent} />
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Live agent — real intake + run, wired to the sourcing endpoint.    */
/* ------------------------------------------------------------------ */

function LiveAgent({ agent }: { agent: AgentConfig }) {
  const field = agent.fields[0];
  const [value, setValue] = useState("");
  const [run, setRun] = useState<RunState>({ status: "idle" });

  const submit = async () => {
    if (!value.trim() || run.status === "running") return;
    setRun({ status: "running" });
    try {
      const profile = await runSourcing(value.trim());
      setRun({ status: "done", profile });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 0
          ? "The backend isn't responding. Start the FastAPI server on :8000 and try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      setRun({ status: "error", message });
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Intake */}
      <div className="flex flex-col gap-5">
        <label htmlFor={field.key} className="label-mono text-ink/70">
          {field.label}
        </label>
        <Textarea
          id={field.key}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.placeholder}
          disabled={run.status === "running"}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        {field.helper && (
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            {field.helper}
          </p>
        )}
        <div className="flex items-center gap-4">
          <Button
            onClick={submit}
            disabled={!value.trim() || run.status === "running"}
            size="lg"
          >
            {run.status === "running" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Sourcing
              </>
            ) : (
              <>
                Run agent
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </>
            )}
          </Button>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            ⌘ + Enter
          </span>
        </div>
      </div>

      {/* Output */}
      <div className="border-l-0 lg:border-l lg:border-ink/10 lg:pl-10">
        <p className="label-mono mb-5 text-ink/70">Output — {agent.outputType}</p>
        <AnimatePresence mode="wait">
          {run.status === "idle" && <OutputIdle key="idle" />}
          {run.status === "running" && <OutputRunning key="running" />}
          {run.status === "error" && (
            <OutputError key="error" message={run.message} />
          )}
          {run.status === "done" && (
            <ProfileCard key="done" profile={run.profile} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function OutputIdle() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[220px] flex-col items-start justify-center gap-3 border border-dashed border-ink/15 p-8"
    >
      <p className="font-display text-xl tracking-tight">Awaiting input</p>
      <p className="font-sans text-sm leading-relaxed text-muted-foreground">
        Run the agent to produce a structured profile and a first-pass
        conviction score.
      </p>
    </motion.div>
  );
}

function OutputRunning() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[220px] flex-col gap-4 border border-ink/15 p-8"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        <span className="label-mono text-ink/70">Reasoning</span>
      </div>
      <div className="flex flex-col gap-3 pt-2">
        {[100, 82, 64].map((w) => (
          <div
            key={w}
            className="h-3 animate-pulse-dot bg-ink/10"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function OutputError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[220px] flex-col items-start justify-center gap-3 border border-ink/30 p-8"
    >
      <div className="flex items-center gap-2">
        <CircleAlert className="h-4 w-4" strokeWidth={1.75} />
        <span className="label-mono text-ink/70">Run failed</span>
      </div>
      <p className="font-sans text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Result — a structured startup profile dossier.                     */
/* ------------------------------------------------------------------ */

function ProfileCard({ profile }: { profile: StartupProfile }) {
  const meta: { icon: typeof Layers; label: string; value?: string | null }[] = [
    { icon: Layers, label: "Stage", value: profile.stage },
    { icon: Globe, label: "Industry", value: profile.industry },
    { icon: MapPin, label: "Location", value: profile.location },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="border border-ink/15"
    >
      {/* Score header */}
      <div className="flex items-stretch border-b border-ink/15">
        <div className="flex w-32 shrink-0 flex-col items-center justify-center border-r border-ink/15 bg-ink py-6 text-paper">
          <span className="font-display text-5xl font-bold leading-none tracking-tightest">
            {profile.score}
          </span>
          <span className="mt-2 font-mono text-[9px] uppercase tracking-ledger text-paper/60">
            Conviction
          </span>
        </div>
        <div className="flex flex-col justify-center p-6">
          <h3 className="font-display text-2xl font-bold leading-tight tracking-tight">
            {profile.company_name}
          </h3>
          {profile.one_liner && (
            <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">
              {profile.one_liner}
            </p>
          )}
        </div>
      </div>

      {/* Meta grid */}
      <dl className="grid grid-cols-3 border-b border-ink/15">
        {meta.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-2 border-r border-ink/15 p-4 last:border-r-0"
          >
            <dt className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-ledger text-muted-foreground">
              <Icon className="h-3 w-3" strokeWidth={1.5} />
              {label}
            </dt>
            <dd className="font-sans text-sm text-ink">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {/* Founders */}
      {profile.founders.length > 0 && (
        <div className="border-b border-ink/15 p-5">
          <p className="label-mono mb-3 text-ink/60">Founders</p>
          <div className="flex flex-wrap gap-2">
            {profile.founders.map((f) => (
              <span
                key={f}
                className="border border-ink/20 px-3 py-1 font-mono text-[11px] tracking-wide"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {profile.summary && (
        <div className="p-5">
          <p className="label-mono mb-3 text-ink/60">Analyst summary</p>
          <p className="font-sans text-sm leading-relaxed text-ink/90">
            {profile.summary}
          </p>
        </div>
      )}
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Pending — the elegant empty state for un-deployed agents.          */
/* ------------------------------------------------------------------ */

function PendingState({ agent }: { agent: AgentConfig }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border border-dashed border-ink/20"
    >
      {/* Faint diagonal hatch — reads as "under construction" without color. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #FFFFFF 0, #FFFFFF 1px, transparent 1px, transparent 12px)",
        }}
      />
      <div className="relative flex flex-col items-start gap-6 p-10 sm:p-14">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5" strokeWidth={1.4} />
          <span className="label-mono text-ink/70">
            {agent.code} · Deployment pending
          </span>
        </div>

        <h3 className="max-w-md font-display text-3xl font-bold leading-tight tracking-tightest">
          {agent.name} isn't online yet.
        </h3>

        <p className="max-w-md font-sans text-sm leading-relaxed text-muted-foreground">
          The logic exists in the backend, but this agent still needs its Band
          runtime and credentials before it can take input. It will surface here
          automatically the moment it's deployed.
        </p>

        <dl className="grid w-full max-w-md grid-cols-1 gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
          <div className="bg-paper p-4">
            <dt className="label-mono mb-1.5 text-muted-foreground">Will produce</dt>
            <dd className="font-sans text-sm text-ink">{agent.capability}</dd>
          </div>
          <div className="bg-paper p-4">
            <dt className="label-mono mb-1.5 text-muted-foreground">Event</dt>
            <dd className="font-mono text-sm text-ink">{agent.outputType}</dd>
          </div>
        </dl>

        <Button variant="outline" size="md" disabled>
          <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
          Locked
        </Button>
      </div>
    </motion.div>
  );
}
