// ============================================================================
// AdminGate — admin-only render wrapper
// ----------------------------------------------------------------------------
// Renders children if userRole === 'admin'; otherwise renders a soft
// "admin only" notice. Use for buttons / panels that should be visible-but-
// non-functional for non-admins, or pass `hideForNonAdmin` to hide entirely.
// ============================================================================

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert } from "lucide-react";

export interface AdminGateProps {
  children: ReactNode;
  /** If true, renders nothing for non-admins. Default: shows the notice. */
  hideForNonAdmin?: boolean;
  /** Custom message shown to non-admins. */
  message?: string;
}

const AdminGate = ({
  children,
  hideForNonAdmin = false,
  message = "Admin role required to edit this section.",
}: AdminGateProps) => {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";

  if (isAdmin) return <>{children}</>;

  if (hideForNonAdmin) return null;

  return (
    <div
      role="note"
      className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground"
    >
      <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden />
      <span>{message}</span>
    </div>
  );
};

export default AdminGate;
