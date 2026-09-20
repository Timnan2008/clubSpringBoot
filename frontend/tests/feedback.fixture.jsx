import React from "react";
import { createRoot } from "react-dom/client";
import ClubOperations from "../ClubOperations";
import "../workspace.css";
import "../ControlRefinements.css";
createRoot(document.getElementById("root")).render(
  <main
    className="ws-shell"
    style={{ display: "block", maxWidth: 1000, padding: 24, margin: "24px auto" }}
  >
    <ClubOperations
      club={1}
      token="fixture"
      section="term"
      activities={[
        {
          id: "activity-1",
          kind: "event",
          status: "scheduled",
          title: "机器人搭建与协作实践",
          start: "2026-09-01T15:30",
          end: "2026-09-01T16:30",
          location: "创客教室",
        },
      ]}
      members={[]}
      documents={[{ id: "doc-1", name: "活动照片.pdf" }]}
      onChanged={async () => {}}
    />
  </main>,
);
