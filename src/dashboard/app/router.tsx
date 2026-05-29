import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./layouts/AppLayout.js";
import { TimelinePage } from "./pages/TimelinePage.js";
import { BoardPage } from "./pages/BoardPage.js";
import { AchievementsPage } from "./pages/AchievementsPage.js";
import { AnalyticsPage } from "./pages/AnalyticsPage.js";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/timeline" replace /> },
      { path: "timeline", element: <TimelinePage /> },
      { path: "board", element: <BoardPage /> },
      { path: "achievements", element: <AchievementsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
    ],
  },
]);
