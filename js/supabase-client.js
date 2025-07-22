// Supabase 客戶端配置
import { createClient } from '@supabase/supabase-js'

// 從環境變數讀取配置
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// 創建 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
