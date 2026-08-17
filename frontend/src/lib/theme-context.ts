import { createContext } from "react";
import type { Theme } from "./theme";

export interface ThemeValue {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeValue>({ theme: "dark", toggle: () => {} });
