// Apply the last small preference cache before React and the API connection load.
try {
  const value = JSON.parse(localStorage.getItem("club-appearance") || "{}");
  const mode =
    value.mode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : value.mode;
  document.documentElement.dataset.theme = mode === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}
