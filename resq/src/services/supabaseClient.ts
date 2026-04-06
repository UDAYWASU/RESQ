

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'xxxx';
const SUPABASE_ANON_KEY = 'xxxx';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
