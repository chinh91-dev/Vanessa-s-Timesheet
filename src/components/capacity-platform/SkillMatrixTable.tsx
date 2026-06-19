// ============================================================================
// SkillMatrixTable — render rows from public.get_skill_matrix()
// ----------------------------------------------------------------------------
// Columns: skill_name, category_name, weight, active_headcount, coverage_pct,
// trainers/experts/capable/aware breakdown, spof_risk, weighted_risk_score,
// top_sme_name, action_needed.
//
// Click a row → onSkillClick(row) so the parent can open the ratings drawer.
// ============================================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SkillMatrixRow } from "@/lib/capacity-platform/types";

const fmtPct = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${(Number(n) * 100).toFixed(0)}%`;
const fmtNum = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : Number(n).toLocaleString();
const fmtScore = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : Number(n).toFixed(2);

const riskBadge = (level: string): JSX.Element => {
  const map: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
    Critical: "destructive",
    High: "destructive",
    Medium: "default",
    Low: "secondary",
  };
  return <Badge variant={map[level] ?? "outline"}>{level}</Badge>;
};

const spofBadge = (level: string): JSX.Element => {
  const isHot = level === "SPOF" || level === "NONE";
  return (
    <Badge variant={isHot ? "destructive" : "outline"}>{level}</Badge>
  );
};

export interface SkillMatrixTableProps {
  rows: SkillMatrixRow[];
  onSkillClick?: (row: SkillMatrixRow) => void;
}

const SkillMatrixTable = ({ rows, onSkillClick }: SkillMatrixTableProps) => {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center">
        No skills found.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">HC</TableHead>
            <TableHead className="text-right">Coverage</TableHead>
            <TableHead>T / E / C / A</TableHead>
            <TableHead>SPOF</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Top SME</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.skill_id}
              onClick={onSkillClick ? () => onSkillClick(r) : undefined}
              className={onSkillClick ? "cursor-pointer hover:bg-accent/50" : ""}
            >
              <TableCell>
                <div className="font-medium">{r.skill_name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {r.skill_code}
                </div>
              </TableCell>
              <TableCell className="text-sm">{r.category_name ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtScore(r.weight)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtNum(r.active_headcount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtPct(r.coverage_pct)}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {r.trainers}/{r.experts}/{r.capable}/{r.aware}
              </TableCell>
              <TableCell>{spofBadge(r.spof_risk)}</TableCell>
              <TableCell>{riskBadge(r.risk_level)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtScore(r.weighted_risk_score)}
              </TableCell>
              <TableCell className="text-sm">
                {r.top_sme_name ?? "—"}
              </TableCell>
              <TableCell className="text-xs">
                {r.action_needed ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SkillMatrixTable;
