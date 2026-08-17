import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useSession } from "../lib/use-session";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="QueryMind home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-panel font-mono text-[13px] font-bold text-ink transition group-hover:border-mute">
        &gt;_
      </span>
      <span
        className={`font-display font-semibold tracking-tight text-ink ${
          small ? "text-base" : "text-lg"
        }`}
      >
        QueryMind
      </span>
    </Link>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 font-mono text-[13px] transition ${
    isActive ? "bg-panel2 text-ink" : "text-mute hover:bg-panel2 hover:text-ink"
  }`;

export default function Navbar() {
  const { dbUrl } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bone/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <nav className="flex items-center gap-1 sm:gap-1.5" aria-label="Primary">
          <NavLink to="/" end className={linkClass}>
            home
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            about
          </NavLink>
          <NavLink to="/contact" className={linkClass}>
            contact
          </NavLink>
          <div className="mx-1.5 hidden h-5 w-px bg-line sm:block" />
          {dbUrl && (
            <Link
              to="/app"
              className="btn btn-ghost hidden !px-3 !py-1.5 font-mono !text-[12.5px] sm:inline-flex"
            >
              open console
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
