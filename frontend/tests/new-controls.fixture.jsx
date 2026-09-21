import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import CodeSlots from "../CodeSlots";
import LineSidebar from "../LineSidebar";
import BranchedMenu from "../BranchedMenu";
import CallChip from "../CallChip";
import ForgotPassword from "../ForgotPassword";
import "../auth.css";
function App() {
  const [code, setCode] = useState(""),
    [status, setStatus] = useState("idle"),
    [count, setCount] = useState(0),
    [active, setActive] = useState(0),
    [progress, setProgress] = useState(0.2),
    [upload, setUpload] = useState("running"),
    [retry, setRetry] = useState(0);
  return (
    <main
      style={{
        padding: 24,
        maxWidth: 700,
        margin: "auto",
        color: "#fafafa",
        background: "#16131d",
      }}
    >
      <h1>Controls</h1>
      <CodeSlots
        value={code}
        status={status}
        slotSize={34}
        gap={6}
        onChange={(c) => {
          setCode(c);
          setStatus("idle");
        }}
        onComplete={() => setCount((n) => n + 1)}
      />
      <output id="code">{code}</output>
      <output id="count">{count}</output>
      <button onClick={() => setStatus("error")}>Reject</button>
      <button onClick={() => setStatus("success")}>Accept</button>
      <button
        onClick={() => {
          setStatus("idle");
          setCode("");
        }}
      >
        Reset
      </button>
      <LineSidebar
        items={["学期材料", "社员管理", "文件资料库"]}
        active={active}
        onItemClick={setActive}
      />
      <button onClick={() => setActive(2)}>External selection</button>
      <BranchedMenu
        items={[
          {
            label: "负责人",
            children: [
              { value: "president", label: "社长" },
              { value: "vice", label: "副社长" },
            ],
          },
          { label: "社员", children: [{ value: "member", label: "普通社员" }] },
        ]}
      />
      <CallChip
        name="Upload"
        argument="semester.pdf"
        status={upload}
        progress={progress}
        onRetry={() => {
          setRetry((n) => n + 1);
          setUpload("running");
        }}
      />
      <output id="retry">{retry}</output>
      <button onClick={() => setProgress(0.7)}>70%</button>
      <button onClick={() => setUpload("done")}>Done</button>
      <button onClick={() => setUpload("error")}>Fail</button>
      <ForgotPassword initialEmail="qa@example.invalid" onBack={() => {}} />
    </main>
  );
}
createRoot(document.getElementById("fixture")).render(<App />);
