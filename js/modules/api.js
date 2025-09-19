// js/modules/api.js

import { supabase, API_ENDPOINTS } from './config.js';

// 內部輔助函數：獲取認證標頭
async function getAuthHeaders() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        console.error('無法獲取 Session，將跳轉回登入頁面');
        window.location.href = 'login.html';
        return null;
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
    };
}

// 導出(export)的函式，供 app.js 使用

export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}

{/* */}
export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('登出失敗:', error);
        throw error;
    }
}
{/* */}


export async function fetchData(filters, pagination) {
    const headers = await getAuthHeaders();
    if (!headers) throw new Error("認證失敗");

    const response = await fetch(API_ENDPOINTS.QUERY_DATA, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ filters, pagination })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '無法解析伺服器回應' }));
        throw new Error(err.error);
    }
    return response.json();
}

export async function analyzeData(filters) {
    const headers = await getAuthHeaders();
    if (!headers) throw new Error("認證失敗");

    const response = await fetch(API_ENDPOINTS.RANKING_ANALYSIS, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ filters })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `分析請求失敗: ${response.status}` }));
        throw new Error(err.error);
    }
    return response.json();
}

export async function fetchSubData(id, type, county) {
    if (!id || !type || !county || county === 'undefined') {
        throw new Error(`前端參數不足，無法查詢附表。(縣市代碼: ${county})`);
    }
    const headers = await getAuthHeaders();
    if (!headers) throw new Error("認證失敗，請重新登入。");

    const response = await fetch(API_ENDPOINTS.SUB_DATA, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ id, type, county })
    });

    if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: '無法從伺服器獲取附表資料' }));
        throw new Error(errorResult.error);
    }
    return response.json();
}

export async function fetchProjectNameSuggestions(countyCode, query, districts) {
    const headers = await getAuthHeaders();
    if (!headers) throw new Error("認證標頭獲取失敗");

    const payload = { countyCode, query, districts };
    const response = await fetch(API_ENDPOINTS.PROJECT_NAMES, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`伺服器錯誤: ${response.status}`);
    return response.json();
}


export async function generateShareLink(payload) {
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error(`認證刷新失敗: ${refreshError.message}`);
    if (!session) throw new Error('認證刷新後無法取得 Session，請重新登入');
    
    const headers = await getAuthHeaders();
    if (!headers) throw new Error("認證失敗，無法取得認證標頭");

    const response = await fetch(API_ENDPOINTS.GENERATE_SHARE_LINK, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '產生分享連結失敗，伺服器未提供詳細資訊' }));
        throw new Error(err.error);
    }
    return response.json();
}