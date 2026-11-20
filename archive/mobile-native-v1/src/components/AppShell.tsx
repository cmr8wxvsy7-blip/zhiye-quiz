import { FileUp, House } from "lucide-react";
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
  return (
    <div
      className={`app-shell ${view === "practice" ? "app-shell--practice" : ""}`}
    >
      <main className="app-main">{children}</main>

      <nav className="mobile-nav" aria-label="主导航">
        {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => (
          <button
            aria-current={view === itemView ? "page" : undefined}
            className={view === itemView ? "is-active" : ""}
            key={itemView}
            onClick={() => onNavigate(itemView)}
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
