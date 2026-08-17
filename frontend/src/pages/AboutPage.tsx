import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";

const PRINCIPLES = [
  {
    n: "01",
    title: "Verifiable by construction",
    body: "Every answer is a query. If you can't inspect the SQL, you can't trust the number — so we never let an answer out without the statement that produced it.",
  },
  {
    n: "02",
    title: "Scope is a promise",
    body: "You decide which tables the AI may read. The ones you leave off are simply not part of the context, which means the model can't reason about data it was never shown.",
  },
  {
    n: "03",
    title: "Small by default",
    body: "QueryMind writes real, runnable SQL instead of synthesizing plausible narratives. You get the rows, the query, and the time it took — not a summary you have to take on faith.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
            about querymind
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            A data tool is only useful if you can check its work.
          </h1>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-8 space-y-5 text-[15.5px] leading-relaxed text-ink/85">
            <p>
              Ask a large language model a question about your data and it will happily
              give you an answer. The problem is you can't tell whether that answer is
              true — you can't see where it came from, and you certainly can't re-run it.
            </p>
            <p>
              QueryMind exists because "trust me" is not a data strategy. It's a
              conversational SQL agent that treats every question the same way an analyst
              would: translate it into a real query, run that query against your actual
              database, and show you the query next to the result.
            </p>
            <p>
              You connect a Postgres or MySQL database, choose exactly which tables the
              agent may read, and then ask questions in plain English. What comes back is
              never a plausible-sounding summary — it's SQL you can read, rows you can
              count, and a number you can verify against the source.
            </p>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <blockquote className="mt-10 rounded-xl border-l-2 border-amber bg-panel px-6 py-5 font-mono text-[13.5px] leading-relaxed text-ink">
            SELECT * FROM answers WHERE sql IS NOT NULL;
            <span className="mt-2 block text-mute">
              — the only kind of answer we ship
            </span>
          </blockquote>
        </Reveal>
      </section>

      <section className="border-t border-line/80 bg-panel/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              How we work
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.n} delay={i * 110}>
                <article className="flex h-full flex-col rounded-xl border border-line bg-panel p-6">
                  <span className="font-mono text-[11px] text-amber">{p.n}</span>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-mute">{p.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-panel p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Who it's for
              </h2>
              <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-mute">
                Analysts, engineers, and product teams who want answers they can defend —
                people who'd rather read five lines of SQL than take a number on faith.
              </p>
            </div>
            <Link to="/contact" className="btn btn-primary shrink-0">
              Talk to us
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
