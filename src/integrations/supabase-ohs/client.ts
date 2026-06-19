import { createClient } from '@supabase/supabase-js';

const OHS_SUPABASE_URL = import.meta.env.VITE_OHS_SUPABASE_URL as string;
const OHS_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_OHS_SUPABASE_PUBLISHABLE_KEY as string;

// Separate Supabase client for the OHS database
export const supabaseOHS = createClient(OHS_SUPABASE_URL, OHS_SUPABASE_PUBLISHABLE_KEY);
