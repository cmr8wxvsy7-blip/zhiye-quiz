import { FileUp, House } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export type AppView = "home" | "import" | "practice" | "summary";

interface AppShellProps {
  view: AppView;
  onNavigate: (view: "home" | "import") => void;
  children: ReactNode;
}

const NAV_ITEMS = [
  { view: "home" as const, label: "今日", icon: House },
  { view: "import" as const, label: "导入", icon: FileUp },
];

export function AppShell({ view, onNavigate, children }: AppShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`app-shell ${view === "practice" ? "app-shell--practice" : ""}`}
    >
      <div className="ambient-canvas" aria-hidden="true">
        <motion.span
          className="ambient-orb ambient-orb--blue"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, 34, -10, 0], y: [0, -28, 20, 0], scale: [1, 1.08, 0.96, 1] }
          }
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="ambient-orb ambient-orb--mint"
          animate={
            reduceMotion
              ? undefined
              : { x: [0, -24, 18, 0], y: [0, 22, -12, 0], scale: [1, 0.96, 1.08, 1] }
          }
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="ambient-grain" />
      </div>

      <main className="app-main">{children}</main>

      <nav className="mobile-nav" aria-label="主导航">
        {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => (
          <button
            aria-current={view === itemView ? "page" : undefined}
            className={view === itemView ? "is-active" : ""}
            key={itemView}
            onClick={() => onNavigate(itemView)}
          >
            {view === itemView && (
              <motion.span
                className="nav-active-surface"
                layoutId="mobile-nav-active"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
