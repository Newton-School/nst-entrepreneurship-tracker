import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getEmailPreviewHtmlFn } from "@/lib/email/preview.actions";

export const Route = createFileRoute("/email-preview")({
  component: EmailPreviewPage,
});

function EmailPreviewPage() {
  const [template, setTemplate] = React.useState<string>("student");
  const [score, setScore] = React.useState<number>(78);
  const [html, setHtml] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);

  // Fetch preview markup when params change
  React.useEffect(() => {
    setLoading(true);
    getEmailPreviewHtmlFn({ data: { template, score } })
      .then((res) => {
        setHtml(res.html);
      })
      .catch((err) => {
        console.error("Failed to render preview:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [template, score]);

  const applyScenario = (type: "A" | "B" | "C") => {
    if (type === "A") {
      setScore(78);
      setTemplate("student");
    } else if (type === "B") {
      setScore(58);
      setTemplate("mentor-follow-up");
    } else if (type === "C") {
      setScore(34);
      setTemplate("mentor-low");
    }
  };

  return (
    <div style={previewPageWrapper}>
      <header style={previewHeader}>
        <h1 style={previewTitle}>NST Email Preview Center</h1>
        <p style={previewSubtitle}>Inspect and verify React Email templates live</p>
      </header>

      <div style={previewGrid}>
        {/* Controls */}
        <div style={controlPanel}>
          <h2 style={sectionTitle}>Select Template</h2>
          <div style={buttonGroup}>
            <button
              onClick={() => setTemplate("student")}
              style={{
                ...templateButton,
                ...(template === "student" ? activeTemplateButton : {}),
              }}
            >
              Student Result
            </button>
            <button
              onClick={() => setTemplate("mentor-follow-up")}
              style={{
                ...templateButton,
                ...(template === "mentor-follow-up" ? activeTemplateButton : {}),
              }}
            >
              Mentor Follow-Up (41-69%)
            </button>
            <button
              onClick={() => setTemplate("mentor-low")}
              style={{
                ...templateButton,
                ...(template === "mentor-low" ? activeTemplateButton : {}),
              }}
            >
              Mentor Low Score (&le;40%)
            </button>
            <button
              onClick={() => setTemplate("board")}
              style={{
                ...templateButton,
                ...(template === "board" ? activeTemplateButton : {}),
              }}
            >
              Academic Board Low (&le;40%)
            </button>
            <button
              onClick={() => setTemplate("password-reset")}
              style={{
                ...templateButton,
                ...(template === "password-reset" ? activeTemplateButton : {}),
              }}
            >
              Password Reset
            </button>
          </div>

          <h2 style={sectionTitle}>Adjust Score ({score}%)</h2>
          <div style={sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              style={sliderInput}
            />
            <div style={sliderTicks}>
              <span>0%</span>
              <span>40% (Low)</span>
              <span>70% (High)</span>
              <span>100%</span>
            </div>
          </div>

          <h2 style={sectionTitle}>Test Scenarios</h2>
          <div style={scenarioGroup}>
            <button onClick={() => applyScenario("A")} style={scenarioButton}>
              Scenario A (78% Student Result)
            </button>
            <button onClick={() => applyScenario("B")} style={scenarioButton}>
              Scenario B (58% Mentor Follow-Up)
            </button>
            <button onClick={() => applyScenario("C")} style={scenarioButton}>
              Scenario C (34% Low Score Warnings)
            </button>
          </div>
        </div>

        {/* Display Panel */}
        <div style={previewDisplay}>
          <div style={displayHeader}>
            <span style={dot} />
            <span style={dot} />
            <span style={dot} />
            <span style={deviceLabel}>Rendered Transactional Email</span>
          </div>

          {loading ? (
            <div style={loader}>Loading preview...</div>
          ) : (
            <iframe srcDoc={html} style={iframePreview} title="Email Preview" />
          )}
        </div>
      </div>
    </div>
  );
}

const previewPageWrapper = {
  minHeight: "100vh",
  backgroundColor: "#0d0e12",
  color: "#e5e7eb",
  fontFamily: "'JetBrains Mono', monospace",
  padding: "40px",
};

const previewHeader = {
  marginBottom: "32px",
  borderBottom: "1px solid #1f2231",
  paddingBottom: "20px",
};

const previewTitle = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#c99b2e",
  margin: 0,
};

const previewSubtitle = {
  fontSize: "14px",
  color: "#9ca3af",
  margin: "6px 0 0 0",
};

const previewGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 2fr",
  gap: "32px",
  alignItems: "start",
};

const controlPanel = {
  backgroundColor: "#161821",
  borderRadius: "12px",
  border: "1px solid #2e3244",
  padding: "24px",
};

const sectionTitle = {
  fontSize: "13px",
  fontWeight: "bold",
  color: "#e5e7eb",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "24px 0 12px 0",
};

const buttonGroup = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const templateButton = {
  backgroundColor: "#1f2231",
  border: "1px solid #2e3244",
  borderRadius: "6px",
  color: "#9ca3af",
  padding: "12px",
  textAlign: "left" as const,
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "500",
  transition: "all 0.2s",
};

const activeTemplateButton = {
  backgroundColor: "#c99b2e",
  borderColor: "#c99b2e",
  color: "#111827",
  fontWeight: "600",
};

const sliderContainer = {
  marginTop: "8px",
};

const sliderInput = {
  width: "100%",
  accentColor: "#c99b2e",
};

const sliderTicks = {
  display: "flex",
  justifyContent: "space-between" as const,
  fontSize: "11px",
  color: "#6b7280",
  marginTop: "6px",
};

const scenarioGroup = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const scenarioButton = {
  backgroundColor: "#1f2231",
  border: "1px solid #2e3244",
  borderRadius: "6px",
  color: "#c99b2e",
  padding: "10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold",
  transition: "all 0.2s",
};

const previewDisplay = {
  backgroundColor: "#161821",
  borderRadius: "12px",
  border: "1px solid #2e3244",
  overflow: "hidden" as const,
  display: "flex",
  flexDirection: "column" as const,
  height: "700px",
};

const displayHeader = {
  backgroundColor: "#11131c",
  padding: "12px 20px",
  borderBottom: "1px solid #2e3244",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const dot = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#2e3244",
  display: "inline-block",
};

const deviceLabel = {
  color: "#9ca3af",
  fontSize: "12px",
  marginLeft: "12px",
};

const loader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  color: "#9ca3af",
};

const iframePreview = {
  width: "100%",
  height: "100%",
  border: "none",
  backgroundColor: "#ffffff",
};
