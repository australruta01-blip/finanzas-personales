import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vfzsecznuhntiyumoyvx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmenNlY3pudWhudGl5dW1veXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTM2OTksImV4cCI6MjA5NTU4OTY5OX0.luJWeTU0-NhumWAfCX3340XoOsl3YosUqPuyJSF2u6A'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
