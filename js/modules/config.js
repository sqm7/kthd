// js/modules/config.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://zxbmbbfrzbtuueysicoc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Ym1iYmZyemJ0dXVleXNpY29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODg5ODksImV4cCI6MjA2NjI2NDk4OX0.1IUynv5eK1xF_3pb-oasqaTrPvbeAOC4Sc1oykPBy4M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const API_ENDPOINTS = {
    QUERY_DATA: 'https://zxbmbbfrzbtuueysicoc.supabase.co/functions/v1/query-data',
    SUB_DATA: 'https://zxbmbbfrzbtuueysicoc.supabase.co/functions/v1/query-sub-data',
    PROJECT_NAMES: 'https://zxbmbbfrzbtuueysicoc.supabase.co/functions/v1/query-names',
    RANKING_ANALYSIS: 'https://zxbmbbfrzbtuueysicoc.supabase.co/functions/v1/analyze-project-ranking',
    GENERATE_SHARE_LINK: 'https://zxbmbbfrzbtuueysicoc.supabase.co/functions/v1/generate-share-link'
};