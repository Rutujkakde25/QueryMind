import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./lib/theme-provider";
import { SessionProvider } from "./lib/session";
import SiteLayout from "./components/SiteLayout";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AppPage from "./pages/AppPage";
import CloudConnectPage from "./pages/CloudConnectPage";
import LocalConnectPage from "./pages/LocalConnectPage";

export default function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/connect/cloud" element={<CloudConnectPage />} />
              <Route path="/connect/local" element={<LocalConnectPage />} />
              <Route path="/app" element={<AppPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </ThemeProvider>
  );
}