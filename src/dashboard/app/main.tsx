import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router.js";
import "./styles/theme.css";
import "./styles/lcars.css";

const root = document.getElementById("root")!;
createRoot(root).render(<RouterProvider router={router} />);
