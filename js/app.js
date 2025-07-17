// js/app.js (最終版)

import { districtData } from './modules/config.js';
import * as api from './modules/api.js';
import { dom } from './modules/dom.js';
import * as ui from './modules/ui.js';
import * as handlers from './modules/eventHandlers.js';
import { state } from './modules/state.js';
import * as renderers from './modules/renderers.js';


function initialize() {
    // 1. 初始認證檢查
    api.checkAuth().catch(err => {
        console.error("認證檢查失敗:", err);
        // 即使檢查失敗，api 模組內部也會處理跳轉
    });

    // 2. 填充靜態下拉選單
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
    
    // 3. 動態創建 DOM 元素
    dom.rankingPaginationControls.id = 'ranking-pagination-controls';
    dom.rankingPaginationControls.className = 'flex justify-between items-center mt-4 text-sm text-gray-400';
    dom.rankingReportContent.querySelector('.overflow-x-auto').insertAdjacentElement('afterend', dom.rankingPaginationControls);

    // 4. 綁定所有事件監聽器
    dom.searchBtn.addEventListener('click', () => { state.currentPage = 1; handlers.mainFetchData(); });
    dom.analyzeBtn.addEventListener('click', handlers.mainAnalyzeData);
    dom.countySelect.addEventListener('change', handlers.updateDistrictOptions);
    dom.districtContainer.addEventListener('click', handlers.onDistrictContainerClick);
    dom.districtSuggestions.addEventListener('click', handlers.onDistrictSuggestionClick);
    dom.clearDistrictsBtn.addEventListener('click', handlers.clearSelectedDistricts);
    dom.typeSelect.addEventListener('change', handlers.toggleAnalyzeButtonState);
    dom.dateRangeSelect.addEventListener('change', handlers.handleDateRangeChange);
    
    // 自訂日期輸入
    dom.dateStartInput.addEventListener('input', () => { if (document.activeElement === dom.dateStartInput) dom.dateRangeSelect.value = 'custom'; });
    dom.dateEndInput.addEventListener('input', () => { if (document.activeElement === dom.dateEndInput) dom.dateRangeSelect.value = 'custom'; });
    dom.setTodayBtn.addEventListener('click', () => {
        dom.dateEndInput.value = ui.formatDate(new Date());
        dom.dateRangeSelect.value = 'custom';
    });

    // Modal
    dom.modalCloseBtn.addEventListener('click', () => dom.modal.classList.add('hidden'));
    dom.resultsTable.addEventListener('click', e => { 
        const detailsBtn = e.target.closest('.details-btn');
        if (detailsBtn) handlers.mainShowSubTableDetails(detailsBtn); 
    });
    
    // 建案名稱篩選
    dom.projectNameInput.addEventListener('focus', handlers.onProjectInputFocus);
    dom.projectNameInput.addEventListener('input', handlers.onProjectInput);
    dom.projectNameSuggestions.addEventListener('click', handlers.onSuggestionClick);
    dom.projectNameContainer.addEventListener('click', e => { 
        if (e.target.classList.contains('multi-tag-remove')) handlers.removeProject(e.target.dataset.name); 
    });
    dom.clearProjectsBtn.addEventListener('click', handlers.clearSelectedProjects);

    // 全域點擊事件 (關閉下拉選單)
    document.addEventListener('click', handlers.handleGlobalClick);

    // Tab 切換
    dom.tabsContainer.addEventListener('click', handlers.handleTabClick);
    
    // 報表交互
    dom.rankingTable.addEventListener('click', handlers.handleRankingSort);
    dom.avgTypeToggle.addEventListener('click', (e) => { 
        if (e.target.matches('.avg-type-btn')) handlers.switchAverageType(e.target.dataset.type); 
    });
    dom.velocityRoomFilterContainer.addEventListener('click', handlers.handleVelocityRoomFilterClick);
    dom.velocitySubTabsContainer.addEventListener('click', handlers.handleVelocitySubTabClick);
    dom.priceGridProjectFilterContainer.addEventListener('click', handlers.handlePriceGridProjectFilterClick);
    
    // 熱力圖相關
    dom.analyzeHeatmapBtn.addEventListener('click', handlers.analyzeHeatmap);
    dom.backToGridBtn.addEventListener('click', handlers.handleBackToGrid);
    dom.heatmapLegendContainer.addEventListener('click', renderers.handleLegendClick);
    dom.heatmapIntervalInput.addEventListener('change', renderers.renderAreaHeatmap);
    dom.heatmapIntervalIncrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 0.5;
        const max = parseFloat(input.max) || 5.0;
        let newValue = (parseFloat(input.value) || 0) + step;
        if (newValue > max) newValue = max;
        input.value = newValue.toFixed(1);
        renderers.renderAreaHeatmap();
    });
    dom.heatmapIntervalDecrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 0.5;
        const min = parseFloat(input.min) || 0.5;
        let newValue = (parseFloat(input.value) || 0) - step;
        if (newValue < min) newValue = min;
        input.value = newValue.toFixed(1);
        renderers.renderAreaHeatmap();
    });

    // 分享功能
    dom.sharePriceGridBtn.addEventListener('click', () => handlers.handleShareClick('price_grid'));
    dom.shareModalCloseBtn.addEventListener('click', () => dom.shareModal.classList.add('hidden'));
    dom.copyShareUrlBtn.addEventListener('click', handlers.copyShareUrl);

    // 5. 初始狀態設定
    handlers.handleDateRangeChange();
    handlers.toggleAnalyzeButtonState();
    handlers.updateDistrictOptions();
}

// 啟動應用程式
initialize();

// 為了讓 renderers.js 中的 circular dependency 可以運作
// 我們需要把一些 handlers 導出給他們用
export { mainFetchData, removeDistrict } from './modules/eventHandlers.js';
