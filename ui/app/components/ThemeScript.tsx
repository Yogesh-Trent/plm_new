import { THEME_STORAGE_KEY } from "@/app/lib/theme";

// Runs synchronously in <head> before first paint so the correct theme class is
// on <html> before any styles apply — prevents a flash of the wrong theme.
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});var c=t==="apple"?"theme-apple":"theme-paper";document.documentElement.classList.add(c);}catch(e){document.documentElement.classList.add("theme-paper");}})();`;
  // type is executable JS on the server (runs during HTML parse, before paint)
  // and inert on the client, which stops React 19's "script tag" warning on soft
  // navigations. See Next.js "preventing flash before hydration" guide.
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: js }}
    />
  );
}
