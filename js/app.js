// js/app.js (最終版)

import { districtData } from './modules/config.js';
import * as api from './modules/api.js';
import { dom } from './modules/dom.js';
import * as ui from './modules/ui.js';
import * as handlers from './modules/eventHandlers.js';
import { state } from './modules/state.js';
import * as renderers from './modules/renderers.js';

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
    
    dom.rankingPaginationControls.id = 'ranking-pagination-controls';
    dom.rankingPaginationControls.className = 'flex justify-between items-center mt-4 text-sm text-gray-400';
    dom.rankingReportContent.querySelector('.overflow-x-auto').insertAdjacentElement('afterend', dom.rankingPaginationControls);

    dom.searchBtn.addEventListener('click', () => { state.currentPage = 1; handlers.mainFetchData(); });
    dom.analyzeBtn.addEventListener('click', handlers.mainAnalyzeData);
    dom.countySelect.addEventListener('change', handlers.updateDistrictOptions);
    dom.districtContainer.addEventListener('click', handlers.onDistrictContainerClick);
    dom.districtSuggestions.addEventListener('click', handlers.onDistrictSuggestionClick);
    dom.clearDistrictsBtn.addEventListener('click', handlers.clearSelectedDistricts);
    dom.typeSelect.addEventListener('change', handlers.toggleAnalyzeButtonState);
    dom.dateRangeSelect.addEventListener('change', handlers.handleDateRangeChange);
    
    dom.dateStartInput.addEventListener('input', () => { if (document.activeElement === dom.dateStartInput) dom.dateRangeSelect.value = 'custom'; });
    dom.dateEndInput.addEventListener('input', () => { if (document.activeElement === dom.dateEndInput) dom.dateRangeSelect.value = 'custom'; });
    dom.setTodayBtn.addEventListener('click', () => {
        dom.dateEndInput.value = ui.formatDate(new Date());
        dom.dateRangeSelect.value = 'custom';
    });

    dom.modalCloseBtn.addEventListener('click', () => dom.modal.classList.add('hidden'));
    dom.resultsTable.addEventListener('click', e => { 
        const detailsBtn = e.target.closest('.details-btn');
        if (detailsBtn) handlers.mainShowSubTableDetails(detailsBtn); 
    });
    
    dom.projectNameInput.addEventListener('focus', handlers.onProjectInputFocus);
    dom.projectNameInput.addEventListener('input', handlers.onProjectInput);
    dom.projectNameSuggestions.addEventListener('click', handlers.onSuggestionClick);
    dom.projectNameContainer.addEventListener('click', e => { 
        if (e.target.classList.contains('multi-tag-remove')) handlers.removeProject(e.target.dataset.name); 
    });
    dom.clearProjectsBtn.addEventListener('click', handlers.clearSelectedProjects);
    
    document.addEventListener('click', handlers.handleGlobalClick);

    dom.tabsContainer.addEventListener('click', handlers.handleTabClick);
    
    dom.rankingTable.addEventListener('click', handlers.handleRankingSort);
    dom.avgTypeToggle.addEventListener('click', (e) => { 
        if (e.target.matches('.avg-type-btn')) handlers.switchAverageType(e.target.dataset.type); 
    });
    dom.velocityRoomFilterContainer.addEventListener('click', handlers.handleVelocityRoomFilterClick);
    dom.velocitySubTabsContainer.addEventListener('click', handlers.handleVelocitySubTabClick);
    dom.priceGridProjectFilterContainer.addEventListener('click', handlers.handlePriceGridProjectFilterClick);
    
    dom.analyzeHeatmapBtn.addEventListener('click', handlers.analyzeHeatmap);
    dom.backToGridBtn.addEventListener('click', handlers.handleBackToGrid);
    dom.heatmapLegendContainer.addEventListener('click', handlers.handleLegendClick);
    
    // ▼▼▼ 修改/新增開始 ▼▼▼
    // 設定熱力圖控制項的預設值
    dom.heatmapIntervalInput.value = 5;
    dom.heatmapMinAreaInput.value = 8;
    dom.heatmapMaxAreaInput.value = 100;
    
    // 為所有熱力圖控制項添加事件監聽
    dom.heatmapIntervalInput.addEventListener('change', renderers.renderAreaHeatmap);
    dom.heatmapMinAreaInput.addEventListener('change', renderers.renderAreaHeatmap);
    dom.heatmapMaxAreaInput.addEventListener('change', renderers.renderAreaHeatmap);
    // ▲▲▲ 修改/新增結束 ▲▲▲

    dom.heatmapIntervalIncrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 1;
        const max = parseFloat(input.max) || 10;
        let newValue = (parseFloat(input.value) || 0) + step;
        if (newValue > max) newValue = max;
        input.value = newValue;
        renderers.renderAreaHeatmap();
    });
    dom.heatmapIntervalDecrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 1;
        const min = parseFloat(input.min) || 1;
        let newValue = (parseFloat(input.value) || 0) - step;
        if (newValue < min) newValue = min;
        input.value = newValue;
        renderers.renderAreaHeatmap();
    });

    dom.sharePriceGridBtn.addEventListener('click', () => handlers.handleShareClick('price_grid'));
    dom.shareModalCloseBtn.addEventListener('click', () => dom.shareModal.classList.add('hidden'));
    dom.copyShareUrlBtn.addEventListener('click', handlers.copyShareUrl);

    handlers.handleDateRangeChange();
    handlers.toggleAnalyzeButtonState();
    handlers.updateDistrictOptions();
}

initialize();

export { mainFetchData, removeDistrict } from './modules/eventHandlers.js';
