import { Link } from "react-router-dom";

const OPTIONS = [
  {
    to: "/connect/cloud",
    tag: "cloud",
    title: "Cloud database",
    description:
      "Hosted Postgres or MySQL that's reachable over the internet. Paste a connection URL and you're in.",
    points: ["Paste a connection URL", "Postgres or MySQL", "Connects in seconds"],
    cta: "Connect a cloud database",
  },
  {
    to: "/connect/local",
    tag: "local",
    title: "Local database",
    description:
      "A database on your machine or private network. Run the AskDB Agent connector — no ports to open, your password never leaves your machine.",
    points: ["Download the AskDB Agent", "Pair with a one-time code", "Nothing inbound exposed"],
    cta: "Connect a local database",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* --------------------------------- HERO --------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:pb-32 lg:pt-28">
        <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-widest text-mute">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber" />
          english in · sql out
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Ask in English. Get the <mark className="mark">real query</mark>.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-mute sm:text-base">
          Type a question about your database. QueryMind writes the SQL, runs it, and shows
          you the query behind every answer — and you decide which tables it may read before
          it sees anything.
        </p>
        <div className="mt-8">
          <a href="#connect" className="btn btn-primary">
            Connect a database
          </a>
        </div>
      </section>

      {/* ------------------------------- CONNECT ------------------------------- */}
      <section
        id="connect"
        className="scroll-mt-20 border-t border-line/80 bg-panel/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
              the next step
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Connect a database.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-mute">
              Pick where your data lives. From there it's a click to the console.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {OPTIONS.map((opt) => (
              <Link
                key={opt.to}
                to={opt.to}
                className="console-card group flex flex-col p-6 transition hover:border-mute"
              >
                <span className="font-mono text-[11.5px] uppercase tracking-widest text-amber">
                  {opt.tag}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink">
                  {opt.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-mute">
                  {opt.description}
                </p>
                <ul className="mt-4 flex flex-col gap-1.5">
                  {opt.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center gap-2 font-mono text-[12px] text-mute"
                    >
                      <span className="text-amber">›</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="btn btn-primary mt-6 self-start group-hover:brightness-105">
                  {opt.cta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
