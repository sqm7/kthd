// js/app.js

import { supabase } from './supabase-client.js';
import { state, getFilters, resetStateForNewAnalysis } from './modules/state.js';
import { dom } from './modules/dom.js';
import {
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
    handleRankingChartMetricChange, // 引入新的 handler
    handleShareButtonClick
} from './modules/eventHandlers.js';
import { initializeUI } from './modules/ui.js';

/**
 * 主要應用程式初始化函數
 */
async function initialize() {
    // 0. 檢查用戶登入狀態
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.log("未登入，導向登入頁面...");
        window.location.href = '/login.html';
        return; // 確保後續代碼不會執行
    }
    console.log("已登入", session.user.email);

    // 1. 初始化UI元件 (載入縣市、設定預設日期等)
    initializeUI();

    // 2. 綁定事件監聽器
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
    dom.rankingChartMetricToggle.addEventListener('click', handleRankingChartMetricChange); // 新增的事件監聽
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


// --- URL 參數處理 ---
/**
 * 檢查 URL 中是否有 token (用於從分享連結載入)
 * 如果有，則解析並應用篩選條件
 */
async function checkForSharedFilters() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
        try {
            const { data, error } = await supabase.functions.invoke('public-report', {
                body: { token }
            });

            if (error) throw error;
            
            if (data && data.filters) {
                console.log('從分享連結載入篩選條件:', data.filters);
                resetStateForNewAnalysis(); // 重置狀態
                await initializeUI(data.filters); // 使用載入的篩選條件重新初始化UI
                handleAnalysisButtonClick(); // 自動觸發分析
            }
        } catch (error) {
            console.error('無法從分享連結載入報告:', error);
            alert('載入分享報告失敗，將顯示預設頁面。');
            window.history.replaceState({}, document.title, window.location.pathname); // 清除 URL 中的 token
        }
    }
}


// --- 應用程式啟動 ---
// DOM 完全載入後執行初始化
document.addEventListener('DOMContentLoaded', async () => {
    await initialize();
    await checkForSharedFilters(); // 在初始化後檢查分享連結
});
