import { Outlet } from "react-router";
import { LcarsSidebar } from "../components/LcarsSidebar.js";

export function AppLayout() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sidebar-width) 1fr",
        height: "100vh",
        borderTop: "var(--bar-width) solid var(--text-muted)",
        borderLeft: "var(--bar-width) solid var(--text-muted)",
        borderBottom: "var(--bar-width) solid var(--text-muted)",
      }}
    >
      <LcarsSidebar />
      <main
        style={{
          overflow: "auto",
          padding: "24px",
          borderLeft: "var(--bar-width) solid var(--text-muted)",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
