import React from "react";
import { createRoot } from "react-dom/client";
import OpenClawPage from "./OpenClawPage";
const root = document.getElementById("openclaw-root");
if (root) createRoot(root).render(<OpenClawPage />);
