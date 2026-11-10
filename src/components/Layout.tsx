import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Briefcase, CalendarCheck, LogOut, Menu, MessageSquare, Moon, Sparkles, Sun } from "lucide-react";
import { useAuth } from "../lib/auth";
import { APP_NAME, initials } from "../lib/format";
import { cx } from "./ui";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span className="grid grid-cols-2 gap-0.5" aria-hidden>
        <span className="size-2.5 rounded-[3px] bg-accent" />
        <span className="size-2.5 rounded-[3px] bg-accent" />
        <span className="size-2.5 rounded-[3px] bg-accent" />
        <span className="size-2.5 rounded-[3px] bg-accent/50" />
      </span>
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    try {
      return (localStorage.getItem("jobportal.theme") as "light" | "dark" | null) ?? null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try {
      if (theme) localStorage.setItem("jobportal.theme", theme);
      else localStorage.removeItem("jobportal.theme");
    } catch {
      /* ignore */
    }
  }, [theme]);
  const isDark = theme ? theme === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return { isDark, toggle: () => setTheme(isDark ? "light" : "dark") };
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDark, toggle } = useTheme();

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const links =
    user?.role === "employer"
      ? [
          { to: "/employer", label: "Overview", end: true },
          { to: "/employer/jobs", label: "Jobs" },
          { to: "/employer/candidates", label: "Candidates" },
          { to: "/employer/interviews", label: "Interviews" },
        ]
      : user?.role === "seeker"
        ? [
            { to: "/for-you", label: "For you" },
            { to: "/jobs", label: "Find jobs" },
            { to: "/resume", label: "Resume" },
            { to: "/applications", label: "Applications" },
          ]
        : [{ to: "/jobs", label: "Find jobs" }];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "relative py-5 text-[15px] transition-colors",
      isActive ? "text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent" : "text-ink-2 hover:text-ink",
    );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="mx-auto hidden items-center gap-7 md:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}
            {user?.role === "employer" && (
              <button
                onClick={() => navigate("/employer#assistant")}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover"
              >
                <Sparkles className="size-3.5" aria-hidden /> AI
              </button>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {user ? (
              <>
                <div className="hidden items-center gap-1 lg:flex">
                  {user.role === "employer" ? (
                    <>
                      <IconLink to="/employer/candidates" label="Candidates"><MessageSquare className="size-[18px]" /></IconLink>
                      <IconLink to="/employer/interviews" label="Interviews"><CalendarCheck className="size-[18px]" /></IconLink>
                    </>
                  ) : (
                    <IconLink to="/applications" label="Applications"><Briefcase className="size-[18px]" /></IconLink>
                  )}
                  <IconLink to={user.role === "employer" ? "/employer/interviews" : "/applications"} label="Notifications"><Bell className="size-[18px]" /></IconLink>
                </div>
                <div className="ml-2 hidden text-right sm:block">
                  <p className="text-sm font-medium leading-tight">{user.fullName}</p>
                  <p className="text-xs text-muted">{user.role === "employer" ? (user.company?.name ?? "Hiring Manager") : "Job seeker"}</p>
                </div>
                <div className="relative ml-2" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-full p-0.5 hover:bg-surface-2"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="Account menu"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{initials(user.fullName)}</span>
                    <Menu className="mr-1 size-5 text-ink-2" aria-hidden />
                  </button>
                  {menuOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
                      <div className="border-b border-line px-3 py-2 md:hidden">
                        {links.map((l) => (
                          <NavLink key={l.to} to={l.to} end={l.end} className="block py-1.5 text-sm text-ink-2 hover:text-ink">
                            {l.label}
                          </NavLink>
                        ))}
                      </div>
                      <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
                      <MenuButton onClick={toggle}>
                        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />} {isDark ? "Light mode" : "Dark mode"}
                      </MenuButton>
                      <MenuButton
                        onClick={() => {
                          logout();
                          navigate("/login");
                        }}
                      >
                        <LogOut className="size-4" /> Sign out
                      </MenuButton>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button onClick={toggle} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-label="Toggle dark mode">
                  {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
                </button>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:text-ink">
                  Sign in
                </Link>
                <Link to="/register" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function IconLink({ to, label, children }: { to: string; label: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={label} title={label}>
      {children}
    </Link>
  );
}

function MenuButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
      {children}
    </button>
  );
}
