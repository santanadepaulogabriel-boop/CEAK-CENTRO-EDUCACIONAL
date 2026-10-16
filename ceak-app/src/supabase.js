import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && key && !url.includes('SEU-PROJETO'));
export const supabase = supabaseConfigurado ? createClient(url, key) : null;
