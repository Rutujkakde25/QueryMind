import { Link } from "react-router-dom";
import { Logo } from "./Navbar";

const links = [
  { to: "/", label: "home" },
  { to: "/about", label: "about" },
  { to: "/contact", label: "contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line/80 bg-bone">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo small />
        <nav aria-label="Footer" className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-1.5 font-mono text-[13px] text-mute transition hover:bg-panel2 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
