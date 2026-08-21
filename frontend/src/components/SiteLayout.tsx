import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";


export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bone text-ink">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
     
    </div>
  );
}
