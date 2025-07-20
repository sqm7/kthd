// js/app.js (最終修正版，適配所有拆分後的模組)

import { districtData } from './modules/config.js';
import * as api from './modules/api.js';
import { dom } from './modules/dom.js';
import * as ui from './modules/ui.js';
import * as handlers from './modules/eventHandlers.js';
import { state } from './modules/state.js';

// 引入拆分後的渲染模組
import * as reportRenderer from './modules/renderers/reports.js';
import * as chartRenderer from './modules/renderers/charts.js';

function initialize() {
    api.checkAuth().catch(err => {
        console.error("認證檢查失敗:", err);
    });

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
    
    // 初始化排名報告的分頁控制器容器
    dom.rankingPaginationControls.id = 'ranking-pagination-controls';
    dom.rankingPaginationControls.className = 'flex justify-between items-center mt-4 text-sm text-gray-400';
    dom.rankingReportContent.querySelector('.overflow-x-auto').insertAdjacentElement('afterend', dom.rankingPaginationControls);

    // --- 主要按鈕與篩選器事件 ---
    dom.searchBtn.addEventListener('click', () => { state.currentPage = 1; handlers.mainFetchData(); });
    dom.analyzeBtn.addEventListener('click', handlers.mainAnalyzeData);
    dom.countySelect.addEventListener('change', handlers.updateDistrictOptions);
    dom.typeSelect.addEventListener('change', handlers.toggleAnalyzeButtonState);
    
    // --- 日期相關事件 ---
    dom.dateRangeSelect.addEventListener('change', handlers.handleDateRangeChange);
    dom.dateStartInput.addEventListener('input', () => { if (document.activeElement === dom.dateStartInput) dom.dateRangeSelect.value = 'custom'; });
    dom.dateEndInput.addEventListener('input', () => { if (document.activeElement === dom.dateEndInput) dom.dateRangeSelect.value = 'custom'; });
    dom.setTodayBtn.addEventListener('click', () => {
        dom.dateEndInput.value = ui.formatDate(new Date());
        dom.dateRangeSelect.value = 'custom';
    });

    // --- 行政區與建案名稱篩選器 (使用事件委派) ---
    dom.districtContainer.addEventListener('click', handlers.onDistrictContainerClick);
    dom.districtSuggestions.addEventListener('click', handlers.onDistrictSuggestionClick);
    dom.clearDistrictsBtn.addEventListener('click', handlers.clearSelectedDistricts);

    dom.projectNameInput.addEventListener('focus', handlers.onProjectInputFocus);
    dom.projectNameInput.addEventListener('input', handlers.onProjectInput);
    dom.projectNameSuggestions.addEventListener('click', handlers.onSuggestionClick);
    dom.projectNameContainer.addEventListener('click', e => { 
        if (e.target.classList.contains('multi-tag-remove')) handlers.removeProject(e.target.dataset.name); 
    });
    dom.clearProjectsBtn.addEventListener('click', handlers.clearSelectedProjects);
    
    // --- 彈出視窗與全域點擊事件 ---
    dom.modalCloseBtn.addEventListener('click', () => dom.modal.classList.add('hidden'));
    dom.resultsTable.addEventListener('click', e => { 
        const detailsBtn = e.target.closest('.details-btn');
        if (detailsBtn) handlers.mainShowSubTableDetails(detailsBtn); 
    });
    document.addEventListener('click', handlers.handleGlobalClick);

    // --- 報告頁籤與互動元件事件 ---
    dom.tabsContainer.addEventListener('click', (e) => {
        if (e.target.matches('.tab-button')) {
            const tabId = e.target.dataset.tab;
            ui.switchTab(tabId);
            if (tabId === 'velocity-report' && state.analysisDataCache) {
                // ▼▼▼ 修改 ▼▼▼
                // 確保兩個圖表都重新渲染
                chartRenderer.renderSalesVelocityChart();
                chartRenderer.renderAreaHeatmap();
                // ▲▲▲ 修改結束 ▲▲▲
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
        if (e.target.matches('.avg-type-btn')) handlers.switchAverageType(e.target.dataset.type); 
    });
    
    // --- 去化分析與垂直水平分析相關事件 ---
    dom.velocityRoomFilterContainer.addEventListener('click', handlers.handleVelocityRoomFilterClick);
    dom.velocitySubTabsContainer.addEventListener('click', handlers.handleVelocitySubTabClick);
    dom.priceGridProjectFilterContainer.addEventListener('click', handlers.handlePriceGridProjectFilterClick);
    dom.analyzeHeatmapBtn.addEventListener('click', handlers.analyzeHeatmap);
    dom.backToGridBtn.addEventListener('click', handlers.handleBackToGrid);
    dom.heatmapLegendContainer.addEventListener('click', handlers.handleLegendClick);
    
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
    dom.sharePriceGridBtn.addEventListener('click', () => handlers.handleShareClick('price_grid'));
    dom.shareModalCloseBtn.addEventListener('click', () => dom.shareModal.classList.add('hidden'));
    dom.copyShareUrlBtn.addEventListener('click', handlers.copyShareUrl);

    // 【修正】處理分頁變更的自訂事件
    document.addEventListener('pageChange', (e) => {
        if (e.detail.type === 'main') {
            handlers.mainFetchData();
        } else if (e.detail.type === 'ranking') {
            reportRenderer.renderRankingReport();
        }
    });

    // --- 初始化應用狀態 ---
    handlers.handleDateRangeChange();
    handlers.toggleAnalyzeButtonState();
    handlers.updateDistrictOptions();
}

initialize();

// 導出需要在其他模組中被呼叫的頂層函式
export { mainFetchData, removeDistrict } from './modules/eventHandlers.js';
