import { dom } from './modules/dom.js';
import { state, getFilters } from './modules/state.js';
import { initializeMap } from './modules/map.js';
import { fetchDistricts, fetchProjectNames, fetchAndDisplayData, performAnalysis, fetchShareData, generateShareLink } from './modules/api.js';
import { showMessage, setupTabs, updateDistrictCheckboxes, updateProjectNameTags, clearAllFilters, handleDateRangeChange, switchAverageType, applyUrlFilters, setupRoomTypeFilters, switchVelocityView, setupPriceBandRoomFilters, setupPriceGridProjectFilter, switchHeatmapView, handleShareClick, copyShareUrl } from './modules/ui.js';
import * as tableRenderer from './modules/renderers/tables.js';
import * as chartRenderer from './modules/renderers/charts.js';
import {
    handleDistrictInputChange,
    handleDistrictSuggestionClick,
    handleDistrictSelection,
    handleProjectNameInputChange,
    handleProjectNameSuggestionClick,
    handleProjectNameSelection,
    handleModal,
    handleHeatmapIntervalChange,
    handleHeatmapMetricToggle,
    handleTreemapMetricChange, // 引入新的事件處理
} from './modules/eventHandlers.js';

// 初始化應用程式
function initialize() {
    // --- 一般事件綁定 ---
    dom.countySelect.addEventListener('change', () => {
        const county = dom.countySelect.value;
        if (county) {
            dom.districtFilterWrapper.classList.remove('hidden');
            fetchDistricts(county);
        } else {
            dom.districtFilterWrapper.classList.add('hidden');
            state.selectedDistricts = [];
            updateDistrictCheckboxes();
        }
        state.selectedProjects = [];
        updateProjectNameTags();
        dom.projectFilterWrapper.classList.add('hidden');
    });

    dom.typeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        if (type === '預售屋') {
            dom.projectFilterWrapper.classList.remove('hidden');
        } else {
            dom.projectFilterWrapper.classList.add('hidden');
            state.selectedProjects = [];
            updateProjectNameTags();
        }
    });

    dom.dateRangeSelect.addEventListener('change', handleDateRangeChange);
    dom.setTodayBtn.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        dom.dateEndInput.value = today;
        handleDateRangeChange(); 
    });
    
    dom.searchBtn.addEventListener('click', () => fetchAndDisplayData(true));
    dom.analyzeBtn.addEventListener('click', performAnalysis);
    
    dom.districtInputArea.addEventListener('input', handleDistrictInputChange);
    dom.districtSuggestions.addEventListener('click', handleDistrictSuggestionClick);
    dom.districtContainer.addEventListener('click', handleDistrictSelection);
    dom.clearDistrictsBtn.addEventListener('click', () => {
        state.selectedDistricts = [];
        updateDistrictCheckboxes();
    });
    
    dom.projectNameInput.addEventListener('input', handleProjectNameInputChange);
    dom.projectNameSuggestions.addEventListener('click', handleProjectNameSuggestionClick);
    dom.projectNameContainer.addEventListener('click', handleProjectNameSelection);
    dom.clearProjectsBtn.addEventListener('click', () => {
        state.selectedProjects = [];
        updateProjectNameTags();
    });

    dom.modalCloseBtn.addEventListener('click', () => handleModal(false));
    window.addEventListener('click', (event) => {
        if (event.target == dom.modal) {
            handleModal(false);
        }
    });

    setupTabs();
    handleDateRangeChange();

    dom.avgTypeToggle.addEventListener('click', (e) => { 
        if (e.target.matches('.avg-type-btn')) switchAverageType(e.target.dataset.type); 
    });
    
    // ▼▼▼ 【新增處】綁定Treemap指標切換事件 ▼▼▼
    dom.treemapMetricToggle.addEventListener('click', handleTreemapMetricChange);
    // ▲▲▲ 【新增結束】 ▲▲▲
    
    // --- 去化分析與垂直水平分析相關事件 ---
    dom.analyzeHeatmapBtn.addEventListener('click', () => switchHeatmapView(true));
    dom.backToGridBtn.addEventListener('click', () => switchHeatmapView(false));
    
    dom.velocitySubTabsContainer.addEventListener('click', (e) => {
        if (e.target.matches('[data-view]')) {
            switchVelocityView(e.target.dataset.view);
        }
    });

    dom.heatmapIntervalIncrementBtn.addEventListener('click', () => handleHeatmapIntervalChange(1));
    dom.heatmapIntervalDecrementBtn.addEventListener('click', () => handleHeatmapIntervalChange(-1));
    dom.heatmapIntervalInput.addEventListener('change', chartRenderer.renderAreaHeatmap);
    dom.heatmapMinAreaInput.addEventListener('change', chartRenderer.renderAreaHeatmap);
    dom.heatmapMaxAreaInput.addEventListener('change', chartRenderer.renderAreaHeatmap);

    dom.heatmapMetricToggle.addEventListener('click', handleHeatmapMetricToggle);

    // --- 分享功能事件 ---
    dom.sharePriceGridBtn.addEventListener('click', handleShareClick);
    dom.shareModalCloseBtn.addEventListener('click', () => dom.shareModal.classList.add('hidden'));
    dom.copyShareUrlBtn.addEventListener('click', copyShareUrl);
    
    // --- 初始化應用程式狀態 ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('report_id')) {
        const reportId = urlParams.get('report_id');
        fetchShareData(reportId);
    } else {
        applyUrlFilters();
    }
    
    initializeMap();
    console.log("SQM App Initialized.");
}

// 執行初始化
initialize();
