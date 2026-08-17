import { useContext } from "react";
import { ThemeContext, type ThemeValue } from "./theme-context";

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
