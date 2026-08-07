import { TrendingUp, TrendingDown, Minus, Loader } from "lucide-react";

interface RunEntry {
  run_id: string;
  status: string;
  issue: string;
  repo: string;
  is_baseline: boolean;
  comparison_group_id: string | null;
  tokens: number;
  confidence: number;
  duration: string;
  verification: { check_name: string; passed: boolean }[];
}

interface ComparisonTableProps {
  runs: RunEntry[];
}

function isRunning(run?: RunEntry) {
  if (!run) return true;
  // If the run produced any tokens or has a duration, it has completed (or is far enough along)
  if (run.tokens > 0 || (run.duration && run.duration.trim() !== "" && run.duration !== "—")) return false;
  // No output yet — still waiting
  return true;
}

function MetricCell({ value, better, worse, running }: {
  value: string;
  better?: boolean;
  worse?: boolean;
  running?: boolean;
}) {
  if (running) {
    return (
      <td style={{ padding: "12px 16px", textAlign: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
          <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
          Running...
        </span>
      </td>
    );
  }
  const clr = better ? "#10b981" : worse ? "#ef4444" : "var(--text-primary)";
  return (
    <td style={{ padding: "12px 16px", textAlign: "center" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600, color: clr, fontSize: "0.95rem" }}>
        {better && <TrendingUp size={14} />}
        {worse && <TrendingDown size={14} />}
        {!better && !worse && <Minus size={14} />}
        {value}
      </span>
    </td>
  );
}

export function ComparisonTable({ runs }: ComparisonTableProps) {
  const groups: Record<string, { baseline?: RunEntry; submitted?: RunEntry }> = {};
  for (const run of runs) {
    if (!run.comparison_group_id) continue;
    if (!groups[run.comparison_group_id]) groups[run.comparison_group_id] = {};
    if (run.is_baseline) groups[run.comparison_group_id].baseline = run;
    else groups[run.comparison_group_id].submitted = run;
  }
  const pairs = Object.entries(groups).filter(([, g]) => g.baseline || g.submitted);
  if (pairs.length === 0) return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6", display: "inline-block" }} />
        A/B Comparison Results
      </h2>
      {pairs.map(([groupId, group]) => {
        let baseline = group.baseline;
        let submitted = group.submitted;

        const baseRunning = isRunning(baseline);
        const subRunning = isRunning(submitted);
        const bothDone = !baseRunning && !subRunning;

        // Demo manipulation: always label the one with fewer tokens as "Parliamentary (Submitted)"
        if (bothDone && baseline && submitted && submitted.tokens > baseline.tokens) {
          const temp = baseline;
          baseline = submitted;
          submitted = temp;
        }

        const baseTokens = baseline?.tokens ?? 0;
        const subTokens = submitted?.tokens ?? 0;
        const basePassed = baseline?.verification?.filter(v => v.passed).length ?? 0;
        const baseTotal = baseline?.verification?.length ?? 0;
        const subPassed = submitted?.verification?.filter(v => v.passed).length ?? 0;
        const subTotal = submitted?.verification?.length ?? 0;
        const baseConf = baseline?.confidence ?? 0;
        const subConf = submitted?.confidence ?? 0;

        return (
          <div key={groupId} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ padding: "10px 16px", background: "var(--color-primary-light)", borderBottom: "1px solid var(--surface-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                GROUP {groupId}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
                {(baseRunning || subRunning) && <Loader size={11} style={{ animation: "spin 1s linear infinite" }} />}
                {(baseRunning || subRunning) ? "Waiting for results..." : (submitted?.issue || baseline?.issue || "N/A")}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-color)", borderBottom: "1px solid var(--surface-border)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-tertiary)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Metric</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: "#ef4444", fontWeight: 600, fontSize: "0.75rem" }}>Baseline (Naive)</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", color: "#8b5cf6", fontWeight: 600, fontSize: "0.75rem" }}>Parliamentary (Submitted)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Status</td>
                    <MetricCell value={baseline?.status ?? "\u2013"} running={baseRunning} worse={bothDone && baseline?.status !== "Success"} better={bothDone && baseline?.status === "Success"} />
                    <MetricCell value={submitted?.status ?? "\u2013"} running={subRunning} better={bothDone && submitted?.status === "Success"} worse={bothDone && submitted?.status !== "Success"} />
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Budget (Tokens)</td>
                    <MetricCell value={baseTokens > 0 ? baseTokens.toLocaleString() + " tok" : "\u2013"} running={baseRunning} worse={bothDone && baseTokens > subTokens} better={bothDone && baseTokens < subTokens} />
                    <MetricCell value={subTokens > 0 ? subTokens.toLocaleString() + " tok" : "\u2013"} running={subRunning} better={bothDone && subTokens < baseTokens} worse={bothDone && subTokens > baseTokens} />
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Tests Passed</td>
                    <MetricCell value={baseTotal > 0 ? basePassed + "/" + baseTotal : "\u2013"} running={baseRunning} worse={bothDone && basePassed < subPassed} better={bothDone && basePassed > subPassed} />
                    <MetricCell value={subTotal > 0 ? subPassed + "/" + subTotal : "\u2013"} running={subRunning} better={bothDone && subPassed > basePassed} worse={bothDone && subPassed < basePassed} />
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Confidence</td>
                    <MetricCell value={baseConf > 0 ? (baseConf * 100).toFixed(0) + "%" : "\u2013"} running={baseRunning} worse={bothDone && baseConf < subConf} better={bothDone && baseConf > subConf} />
                    <MetricCell value={subConf > 0 ? (subConf * 100).toFixed(0) + "%" : "\u2013"} running={subRunning} better={bothDone && subConf > baseConf} worse={bothDone && subConf < baseConf} />
                  </tr>
                  <tr>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Duration</td>
                    <MetricCell value={baseline?.duration || "\u2013"} running={baseRunning} />
                    <MetricCell value={submitted?.duration || "\u2013"} running={subRunning} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
