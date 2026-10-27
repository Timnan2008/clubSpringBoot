import { createRoot } from "react-dom/client";
import LaunchFilm from "./LaunchFilm";

const root = document.getElementById("launch-root");
if (root) createRoot(root).render(<LaunchFilm />);
