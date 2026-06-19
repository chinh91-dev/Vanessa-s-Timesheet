import { supabase } from "@/integrations/supabase/client";

export interface CreatePortalUserInput {
  email: string;
  full_name?: string;
  company_id: string;
  role?: string;
  password: string;
}

export const createPortalUserDirect = async (input: CreatePortalUserInput) => {
  const { data, error } = await supabase.functions.invoke("customer-admin-create-user", {
    body: input,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
