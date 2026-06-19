// ============================================================================
// RagDonut — RAG breakdown donut + counts
// ----------------------------------------------------------------------------
// Spec §8.7 — "RAG donut: count of Red / Amber / Green people for the week".
// Uses Recharts PieChart + custom centre label showing total headcount.
// ============================================================================

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface RagDonutProps {
  red: number;
  amber: number;
  green: number;
}

const RagDonut = ({ red, amber, green }: RagDonutProps) => {
  const data = [
    { name: "Red", value: red, fill: "#dc2626" },
    { name: "Amber", value: amber, fill: "#f59e0b" },
    { name: "Green", value: green, fill: "#16a34a" },
  ];
  const total = red + amber + green;
  const empty = total === 0;

  return (
    <div className="rounded-md border p-4 flex flex-col items-center">
      <h3 className="text-sm font-semibold mb-2">RAG breakdown</h3>
      <div className="relative w-full h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={empty ? [{ name: "—", value: 1, fill: "#e5e7eb" }] : data}
              dataKey="value"
              innerRadius={45}
              outerRadius={65}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {(empty ? [{ fill: "#e5e7eb" }] : data).map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            {!empty && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground">people</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full mt-2 text-xs">
        <div className="text-center">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: "#dc2626" }}
            aria-hidden
          />
          Red <span className="tabular-nums font-medium">{red}</span>
        </div>
        <div className="text-center">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: "#f59e0b" }}
            aria-hidden
          />
          Amber <span className="tabular-nums font-medium">{amber}</span>
        </div>
        <div className="text-center">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: "#16a34a" }}
            aria-hidden
          />
          Green <span className="tabular-nums font-medium">{green}</span>
        </div>
      </div>
    </div>
  );
};

export default RagDonut;
