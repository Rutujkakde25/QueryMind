import ConnectForm from "../components/ConnectForm";

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
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
              the next step
            </p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Connect a database.
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-mute">
              Postgres or MySQL — paste a URL, or use connection details. From there it's a
              click to the console.
            </p>
          </div>
          <div className="lg:justify-self-end">
            <ConnectForm />
          </div>
        </div>
      </section>
    </div>
  );
}
