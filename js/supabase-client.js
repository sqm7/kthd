// Supabase 客戶端配置
import { createClient } from '@supabase/supabase-js'

// 請將 'YOUR_SUPABASE_URL' 和 'YOUR_SUPABASE_ANON_KEY' 替換為您自己的金鑰
const supabaseUrl = 'https://zxbmbbfrzbtuueysicoc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Ym1iYmZyemJ0dXVleXNpY29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODg5ODksImV4cCI6MjA2NjI2NDk4OX0.1IUynv5eK1xF_3pb-oasqaTrPvbeAOC4Sc1oykPBy4M'

// 創建 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase