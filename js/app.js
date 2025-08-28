// js/app.js (最終修正版，適配所有拆分後的模組)

import { districtData } from './modules/config.js';
import * as api from './modules/api.js';
import { dom } from './modules/dom.js';
import * as ui from './modules/ui.js';
import { 
    mainFetchData, 
    mainAnalyzeData, 
    mainShowSubTableDetails, 
    updateDistrictOptions, 
    toggleAnalyzeButtonState, 
    handleDateRangeChange,
    onDistrictContainerClick,
    onDistrictSuggestionClick,
    clearSelectedDistricts,
    onProjectInputFocus,
    onProjectInput,
    onSuggestionClick,
    removeProject,
    clearSelectedProjects,
    handleGlobalClick,
    switchAverageType,
    handlePriceBandRoomFilterClick,
    handleVelocityRoomFilterClick,
    handleVelocitySubTabClick,
    handleHeatmapMetricToggle, // 引入新的事件處理函式
    handlePriceGridProjectFilterClick,
    analyzeHeatmap,
    handleBackToGrid,
    handleLegendClick,
    handleShareClick,
    copyShareUrl
} from './modules/eventHandlers.js';
import { state } from './modules/state.js';

// 引入拆分後的渲染模組
import * as reportRenderer from './modules/renderers/reports.js';
import * as chartRenderer from './modules/renderers/charts.js';

{/* */}
async function setupUserStatus() {
    try {
        const user = await api.getUser();
        const container = document.getElementById('user-status-container');
        if (user && container) {
            container.innerHTML = `
                <p class="text-gray-300">歡迎, ${user.email}</p>
                <button id="logout-btn" class="mt-1 text-red-400 hover:text-red-300 transition-colors">登出</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', async () => {
                try {
                    await api.signOut();
                    window.location.href = 'login.html';
                } catch (e) {
                    alert('登出時發生錯誤。');
                }
            });
        }
    } catch (error) {
        console.error('無法設定使用者狀態:', error);
    }
}
{/* */}

function initialize() {
    api.checkAuth().catch(err => {
        console.error("認證檢查失敗:", err);
    });

    {/* */}
    setupUserStatus(); // 呼叫新的函式來設定右上角的 UI
    {/* */}

    try {
        const countyNames = Object.keys(districtData);
        countyNames.forEach(name => {
            dom.countySelect.add(new Option(name, name));
        });
    } catch (error) {
        console.error("填入縣市資料時發生錯誤:", error);
        ui.showMessage("系統初始化失敗：載入縣市資料時出錯。", true);
        return;
    }
    
    dom.rankingPaginationControls.id = 'ranking-pagination-controls';
    dom.rankingPaginationControls.className = 'flex justify-between items-center mt-4 text-sm text-gray-400';
    dom.rankingReportContent.querySelector('.overflow-x-auto').insertAdjacentElement('afterend', dom.rankingPaginationControls);

    // --- 主要按鈕與篩選器事件 ---
    dom.searchBtn.addEventListener('click', () => { state.currentPage = 1; mainFetchData(); });
    dom.analyzeBtn.addEventListener('click', mainAnalyzeData);
    dom.countySelect.addEventListener('change', updateDistrictOptions);
    dom.typeSelect.addEventListener('change', toggleAnalyzeButtonState);
    
    // --- 日期相關事件 ---
    dom.dateRangeSelect.addEventListener('change', handleDateRangeChange);
    dom.dateStartInput.addEventListener('input', () => { if (document.activeElement === dom.dateStartInput) dom.dateRangeSelect.value = 'custom'; });
    dom.dateEndInput.addEventListener('input', () => { if (document.activeElement === dom.dateEndInput) dom.dateRangeSelect.value = 'custom'; });
    dom.setTodayBtn.addEventListener('click', () => {
        dom.dateEndInput.value = ui.formatDate(new Date());
        dom.dateRangeSelect.value = 'custom';
    });

    // --- 行政區與建案名稱篩選器 (使用事件委派) ---
    dom.districtContainer.addEventListener('click', onDistrictContainerClick);
    dom.districtSuggestions.addEventListener('click', onDistrictSuggestionClick);
    dom.clearDistrictsBtn.addEventListener('click', clearSelectedDistricts);

    dom.projectNameInput.addEventListener('focus', onProjectInputFocus);
    dom.projectNameInput.addEventListener('input', onProjectInput);
    dom.projectNameSuggestions.addEventListener('click', onSuggestionClick);
    dom.projectNameContainer.addEventListener('click', e => { 
        if (e.target.classList.contains('multi-tag-remove')) removeProject(e.target.dataset.name); 
    });
    dom.clearProjectsBtn.addEventListener('click', clearSelectedProjects);
    
    // --- 彈出視窗與全域點擊事件 ---
    dom.modalCloseBtn.addEventListener('click', () => dom.modal.classList.add('hidden'));
    dom.resultsTable.addEventListener('click', e => { 
        const detailsBtn = e.target.closest('.details-btn');
        if (detailsBtn) mainShowSubTableDetails(detailsBtn); 
    });
    document.addEventListener('click', handleGlobalClick);

    // --- 報告頁籤與互動元件事件 ---
    dom.tabsContainer.addEventListener('click', (e) => {
        if (e.target.matches('.tab-button')) {
            const tabId = e.target.dataset.tab;
            ui.switchTab(tabId);
            if (tabId === 'velocity-report' && state.analysisDataCache) {
                chartRenderer.renderSalesVelocityChart();
                chartRenderer.renderAreaHeatmap();
            }
        }
    });
    dom.rankingTable.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-th');
        if (!header) return;
        const sortKey = header.dataset.sortKey;
        if (state.currentSort.key === sortKey) {
            state.currentSort.order = state.currentSort.order === 'desc' ? 'asc' : 'desc';
        } else {
            state.currentSort.key = sortKey;
            state.currentSort.order = 'desc';
        }
        state.rankingCurrentPage = 1;
        reportRenderer.renderRankingReport();
    });
    dom.avgTypeToggle.addEventListener('click', (e) => { 
        if (e.target.matches('.avg-type-btn')) switchAverageType(e.target.dataset.type); 
    });
    
    // --- 去化分析與垂直水平分析相關事件 ---
    dom.priceBandRoomFilterContainer.addEventListener('click', handlePriceBandRoomFilterClick);
    dom.velocityRoomFilterContainer.addEventListener('click', handleVelocityRoomFilterClick);
    dom.velocitySubTabsContainer.addEventListener('click', handleVelocitySubTabClick);
    dom.priceGridProjectFilterContainer.addEventListener('click', handlePriceGridProjectFilterClick);
    dom.analyzeHeatmapBtn.addEventListener('click', analyzeHeatmap);
    dom.backToGridBtn.addEventListener('click', handleBackToGrid);
    dom.heatmapLegendContainer.addEventListener('click', handleLegendClick);
    
    // ▼▼▼ 【新增處】綁定新的事件監聽器 ▼▼▼
    dom.heatmapMetricToggle.addEventListener('click', handleHeatmapMetricToggle);
    // ▲▲▲ 【新增結束】 ▲▲▲

    // 熱力圖面積級距控制
    dom.heatmapIntervalInput.addEventListener('change', chartRenderer.renderAreaHeatmap);
    dom.heatmapMinAreaInput.addEventListener('change', chartRenderer.renderAreaHeatmap);
    dom.heatmapMaxAreaInput.addEventListener('change', chartRenderer.renderAreaHeatmap);
    dom.heatmapIntervalIncrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 1;
        const max = parseFloat(input.max) || 10;
        let newValue = (parseFloat(input.value) || 0) + step;
        if (newValue > max) newValue = max;
        input.value = newValue;
        chartRenderer.renderAreaHeatmap();
    });
    dom.heatmapIntervalDecrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 1;
        const min = parseFloat(input.min) || 1;
        let newValue = (parseFloat(input.value) || 0) - step;
        if (newValue < min) newValue = min;
        input.value = newValue;
        chartRenderer.renderAreaHeatmap();
    });

    // --- 分享功能 ---
    dom.sharePriceGridBtn.addEventListener('click', () => handleShareClick('price_grid'));
    dom.shareModalCloseBtn.addEventListener('click', () => dom.shareModal.classList.add('hidden'));
    dom.copyShareUrlBtn.addEventListener('click', copyShareUrl);

    // --- 處理分頁變更的自訂事件 ---
    document.addEventListener('pageChange', (e) => {
        if (e.detail.type === 'main') {
            mainFetchData();
        } else if (e.detail.type === 'ranking') {
            reportRenderer.renderRankingReport();
        }
    });

    // --- 初始化應用狀態 ---
    handleDateRangeChange();
    toggleAnalyzeButtonState();
    updateDistrictOptions();
}

initialize();