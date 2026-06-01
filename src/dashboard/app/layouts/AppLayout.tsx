import { Outlet, useLocation } from "react-router";
import { LcarsSidebar, NAV_ITEMS } from "../components/LcarsSidebar.js";

export function AppLayout() {
  const location = useLocation();
  const activeNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const activeColor = activeNav?.color ?? "var(--text-muted)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sidebar-width) 1fr",
        height: "100vh",
      }}
    >
      <LcarsSidebar />
      <main
        style={{
          overflow: "auto",
          padding: "24px",
          borderLeft: `var(--bar-width) solid ${activeColor}`,
          transition: "border-color 0.15s",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
