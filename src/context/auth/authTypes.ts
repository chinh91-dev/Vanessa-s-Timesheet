
import { Session, User } from "@supabase/supabase-js";

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: "employee" | "manager" | "admin" | "sale_user" | "sale_manager" | "customer" | null;
  employmentType: "full-time" | "part-time" | "temporary" | "casual" | "fixed-term" | null;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  loading: boolean;
}
