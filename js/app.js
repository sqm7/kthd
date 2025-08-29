// js/app.js

import { supabase } from './supabase-client.js';
import { state, resetStateForNewAnalysis } from './modules/state.js';
import { dom } from './modules/dom.js';
import {
    initGlobalEventListeners, // 引入全域事件監聽初始化函式
    handleCountyChange,
    handleDistrictChange,
    handleTypeChange,
    handleDateChange,
    handleBuildingTypeChange,
    handleProjectNameInput,
    handleProjectNameSelect,
    handleProjectNameBlur,
    handleRemoveDistrict,
    handleRemoveProject,
    handleAnalysisButtonClick,
    handlePageClick,
    handleSortClick,
    handleTabClick,
    handleAverageTypeChange,
    handleVelocityViewChange,
    handleVelocityRoomFilterChange,
    handlePriceBandRoomTypeChange,
    handlePriceGridProjectChange,
    handleHeatmapToggle,
    handleLegendFilter,
    handleHeatmapDetailMetricChange,
    handleRankingChartMetricChange,
    handleShareButtonClick
} from './modules/eventHandlers.js';
import { initializeUI } from './modules/ui.js';

/**
 * 主要應用程式初始化函數
 */
async function initialize() {
    // 1. 檢查用戶登入狀態 (這是會自動跳轉的核心邏輯)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.log("未登入，導向登入頁面...");
        // 如果沒有 session，就直接跳轉，後面的代碼不會執行
        window.location.href = '/login.html';
        return; 
    }
    
    // 如果已登入，則繼續執行後續初始化
    console.log("已登入:", session.user.email);
    if (dom.userEmail) {
        dom.userEmail.textContent = session.user.email;
    }

    // 2. 初始化UI元件 (載入縣市、設定預設日期等)
    await initializeUI();

    // 3. 綁定事件監聽器
    // --- 主要篩選器事件 ---
    dom.countySelect.addEventListener('change', handleCountyChange);
    dom.districtSelect.addEventListener('change', handleDistrictChange);
    dom.typeSelect.addEventListener('change', handleTypeChange);
    dom.dateStartInput.addEventListener('change', handleDateChange);
    dom.dateEndInput.addEventListener('change', handleDateChange);
    dom.buildingTypeSelect.addEventListener('change', handleBuildingTypeChange);
    dom.projectNameInput.addEventListener('input', handleProjectNameInput);
    dom.projectNameInput.addEventListener('blur', handleProjectNameBlur);
    dom.suggestionsList.addEventListener('mousedown', handleProjectNameSelect);
    dom.selectedDistrictsContainer.addEventListener('click', handleRemoveDistrict);
    dom.selectedProjectsContainer.addEventListener('click', handleRemoveProject);
    dom.analysisButton.addEventListener('click', handleAnalysisButtonClick);
    dom.shareButton.addEventListener('click', handleShareButtonClick);

    // --- 分頁與排序事件 ---
    dom.pagination.addEventListener('click', handlePageClick);
    dom.dataTable.tHead.addEventListener('click', (e) => handleSortClick(e, 'main'));
    
    // --- 報告頁籤與互動元件事件 ---
    dom.tabsContainer.addEventListener('click', handleTabClick);
    dom.rankingChartMetricToggle.addEventListener('click', handleRankingChartMetricChange);
    dom.rankingTable.addEventListener('click', (e) => handleSortClick(e, 'ranking'));
    dom.averageTypeToggle.addEventListener('click', handleAverageTypeChange);
    dom.velocityViewToggle.addEventListener('click', handleVelocityViewChange);
    dom.velocityRoomFilter.addEventListener('click', handleVelocityRoomFilterChange);
    dom.priceBandRoomTypeFilter.addEventListener('click', handlePriceBandRoomTypeChange);
    dom.priceGridProjectSelect.addEventListener('change', handlePriceGridProjectChange);
    dom.heatmapToggle.addEventListener('click', handleHeatmapToggle);
    dom.chartLegendContainer.addEventListener('click', handleLegendFilter);
    dom.heatmapDetailMetricToggle.addEventListener('click', handleHeatmapDetailMetricChange);
}


/**
 * 檢查 URL 中是否有 token (用於從分享連結載入)
 */
async function checkForSharedFilters() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
        showLoading('正在從分享連結載入報告...');
        try {
            const { data, error } = await supabase.functions.invoke('public-report', {
                body: { token }
            });

            if (error) throw error;
            
            if (data && data.filters) {
                console.log('從分享連結載入篩選條件:', data.filters);
                resetStateForNewAnalysis(); 
                await initializeUI(data.filters);
                await handleAnalysisButtonClick();
            }
        } catch (error) {
            console.error('無法從分享連結載入報告:', error);
            showAlert('載入分享報告失敗，將顯示預設頁面。');
            window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
            hideLoading();
        }
    }
}


// --- 應用程式啟動 ---

// ▼▼▼ 【關鍵修正】 ▼▼▼
// 確保所有操作都在 DOM (頁面) 完全載入後才執行
document.addEventListener('DOMContentLoaded', async () => {
    
    // 步驟 1: 設定全域事件監聽器 (例如：登出按鈕)
    initGlobalEventListeners();

    // 步驟 2: 執行主要初始化流程 (包含檢查登入狀態)
    await initialize();
    
    // 步驟 3: 檢查是否有分享連結的 token
    await checkForSharedFilters();
});
