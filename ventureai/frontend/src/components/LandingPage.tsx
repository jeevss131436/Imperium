import { Link } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { AGENTS } from "@/config/agents";
import { StatusGlyph } from "@/components/ui/status-glyph";

export function LandingPage() {
  return (
    <>
      <Hero />
      <IndexGrid />
      <CallToAction />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — the thesis. The wordmark is the first and largest statement. */
/* ------------------------------------------------------------------ */

function Hero() {
  const reduce = useReducedMotion();

  const rise: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 },
    }),
  };

  return (
    <section className="relative border-b border-ink/10">
      <div className="container py-24 sm:py-32 lg:py-40">
        <motion.p
          custom={0}
          initial="hidden"
          animate="show"
          variants={rise}
          className="label-mono mb-8"
        >
          VentureAI — Index of Agents
        </motion.p>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={rise}
          className="font-display font-bold leading-[0.92] tracking-tightest text-[clamp(3.5rem,13vw,11rem)]"
        >
          Venture
          <span className="block italic font-medium">conviction,</span>
          <span className="block">at speed.</span>
        </motion.h1>

        <motion.div
          custom={2}
          initial="hidden"
          animate="show"
          variants={rise}
          className="mt-10 grid gap-10 border-t border-ink/10 pt-10 sm:grid-cols-12"
        >
          <p className="font-display text-2xl leading-snug tracking-tight sm:col-span-7 lg:text-3xl">
            The copilot for high-conviction venture capital — a committee of
            specialist agents that source, diligence, and stress-test a deal
            before you ever take the meeting.
          </p>
          <div className="flex flex-col justify-end gap-6 sm:col-span-5">
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Six agents, one pipeline. Each renders its own verdict; you keep
              every one of them.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 bg-ink px-8 py-4 font-mono text-xs uppercase tracking-[0.2em] text-paper transition-all duration-300 ease-out hover:bg-transparent hover:text-ink hover:shadow-[inset_0_0_0_1px_theme(colors.ink)]"
              >
                Enter the workspace
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="container flex items-center gap-3 pb-10 text-muted-foreground"
      >
        <ArrowDown className="h-4 w-4 animate-pulse-dot" strokeWidth={1.5} />
        <span className="label-mono">The index — six agents</span>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Index grid — the signature. A scroll-staggered bento ledger.       */
/* ------------------------------------------------------------------ */

function IndexGrid() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.05 },
    },
  };

  const cell: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  // A deliberate bento rhythm — the first cell spans wide to anchor the grid.
  const spans = [
    "sm:col-span-2 lg:col-span-2 lg:row-span-1",
    "",
    "",
    "",
    "",
    "sm:col-span-2 lg:col-span-2",
  ];

  return (
    <section className="border-b border-ink/10">
      <div className="container py-20 sm:py-28">
        <div className="mb-12 flex flex-col gap-4 border-b border-ink/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-4xl font-bold tracking-tightest sm:text-5xl">
            The committee
          </h2>
          <p className="max-w-md font-sans text-sm leading-relaxed text-muted-foreground">
            Each agent is a numbered entry in the deal ledger. The order is the
            pipeline order — intake to verdict.
          </p>
        </div>

        <motion.ol
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-3"
        >
          {AGENTS.map((agent, i) => {
            const Icon = agent.icon;
            return (
              <motion.li
                key={agent.id}
                variants={cell}
                className={`group relative flex flex-col justify-between gap-10 bg-paper p-8 transition-colors duration-300 hover:bg-ink hover:text-paper sm:min-h-[280px] ${spans[i]}`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground transition-colors duration-300 group-hover:text-paper/60">
                    {agent.code}
                  </span>
                  <Icon
                    className="h-6 w-6 text-ink transition-colors duration-300 group-hover:text-paper"
                    strokeWidth={1.4}
                  />
                </div>

                <div>
                  <div className="mb-4">
                    <StatusGlyph available={agent.isAvailable} />
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    {agent.name}
                  </h3>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground transition-colors duration-300 group-hover:text-paper/70">
                    {agent.summary}
                  </p>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition-colors duration-300 group-hover:text-paper">
                    {agent.capability}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA — stark, inverted, single statement.                           */
/* ------------------------------------------------------------------ */

function CallToAction() {
  return (
    <section className="bg-ink text-paper">
      <div className="container py-28 sm:py-36">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start gap-12"
        >
          <p className="label-mono text-paper/50">Begin a memo</p>
          <h2 className="font-display font-bold leading-[0.95] tracking-tightest text-[clamp(2.75rem,8vw,7rem)]">
            Bring a deal.
            <span className="block italic font-medium text-paper/80">
              Leave with a verdict.
            </span>
          </h2>
          <Link
            to="/app"
            className="group inline-flex items-center gap-3 border border-paper/30 px-9 py-5 font-mono text-xs uppercase tracking-[0.2em] text-paper transition-all duration-300 ease-out hover:bg-paper hover:text-ink"
          >
            Open the workspace
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
