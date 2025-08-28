// js/modules/eventHandlers.js (修正版)

import { state, getFilters } from './state.js';
import { dom } from './dom.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { districtData, countyCodeMap } from './config.js';

// 引入所有渲染模組
import * as reportRenderer from './renderers/reports.js';
import * as tableRenderer from './renderers/tables.js';
import * as chartRenderer from './renderers/charts.js';
import * as heatmapRenderer from './renderers/heatmap.js';
import * as componentRenderer from './renderers/uiComponents.js';

// Main data fetching and analysis functions
export async function mainFetchData() {
    ui.showLoading('查詢中，請稍候...');
    try {
        const filters = getFilters();
        const pagination = { page: state.currentPage, limit: state.pageSize };
        const result = await api.fetchData(filters, pagination);
        
        state.totalRecords = result.count || 0;
        if (!result.data || result.data.length === 0) {
            ui.showMessage('找不到符合條件的資料。');
            componentRenderer.renderPagination();
            return;
        }
        tableRenderer.renderTable(result.data);
        componentRenderer.renderPagination();
        dom.messageArea.classList.add('hidden');
        dom.tabsContainer.classList.remove('hidden');
        ui.switchTab('data-list');
    } catch (error) {
        console.error('查詢錯誤:', error);
        ui.showMessage(`查詢錯誤: ${error.message}`, true);
        state.totalRecords = 0;
        componentRenderer.renderPagination();
    }
}

export async function mainAnalyzeData() {
    if (!dom.countySelect.value) return ui.showMessage('請先選擇一個縣市再進行分析。');
    ui.showLoading('分析中，請稍候...');
    try {
        state.analysisDataCache = await api.analyzeData(getFilters());

        if (!state.analysisDataCache.coreMetrics || state.analysisDataCache.projectRanking.length === 0) {
            const msg = state.analysisDataCache.message || '找不到符合條件的分析資料。';
            ui.showMessage(msg);
            return;
        }
        dom.messageArea.classList.add('hidden');
        dom.tabsContainer.classList.remove('hidden');
        document.querySelectorAll('.report-header').forEach(el => { el.style.display = 'block'; });
        state.currentSort = { key: 'saleAmountSum', order: 'desc' };
        state.rankingCurrentPage = 1;
        reportRenderer.renderRankingReport();
        reportRenderer.renderPriceBandReport();
        chartRenderer.renderPriceBandChart(); 
        reportRenderer.renderUnitPriceReport();
        reportRenderer.renderParkingAnalysisReport();
        reportRenderer.renderSalesVelocityReport();
        reportRenderer.renderPriceGridAnalysis();
        ui.switchTab('ranking-report');
    } catch(error) {
        console.error("數據分析失敗:", error);
        ui.showMessage(`數據分析失敗: ${error.message}`, true);
        state.analysisDataCache = null;
    }
}

export async function mainShowSubTableDetails(btn) {
    const { id, type, county } = btn.dataset;
    dom.modalTitle.textContent = `附表詳細資料 (編號: ${id})`;
    dom.modalContent.innerHTML = '<div class="loader mx-auto"></div>';
    dom.modal.classList.remove('hidden');
    try {
        const result = await api.fetchSubData(id, type, county);
        let contentHTML = '<div class="space-y-6">';
        if (type !== '預售交易' && result.build) contentHTML += tableRenderer.renderSubTable('建物資料', result.build);
        if (result.land) contentHTML += tableRenderer.renderSubTable('土地資料', result.land);
        if (result.park) contentHTML += tableRenderer.renderSubTable('車位資料', result.park);
        contentHTML = (contentHTML === '<div class="space-y-6">') ? '<p>此筆紀錄沒有對應的附表資料。</p>' : contentHTML + '</div>';
        dom.modalContent.innerHTML = contentHTML;
    } catch (error) {
        dom.modalContent.innerHTML = `<p class="text-red-400 font-semibold">查詢失敗:</p><p class="mt-2 text-sm text-gray-400">${error.message}</p>`;
    }
}

export async function mainFetchProjectNameSuggestions(query) {
    const county = dom.countySelect.value;
    const countyCode = countyCodeMap[county];
    if (!countyCode) {
        dom.projectNameSuggestions.classList.add('hidden');
        dom.filterCard.classList.remove('z-elevate-filters');
        return;
    }
    try {
        dom.filterCard.classList.add('z-elevate-filters');
        const processedQuery = query.trim().split(/\s+/).join('%');
        const names = await api.fetchProjectNameSuggestions(countyCode, processedQuery, state.selectedDistricts);
        componentRenderer.renderSuggestions(names);
    } catch (error) {
        console.error("獲取建案建議失敗:", error);
        dom.projectNameSuggestions.innerHTML = `<div class="p-2 text-red-400">讀取建議失敗。</div>`;
        dom.projectNameSuggestions.classList.remove('hidden');
    }
}

export function handleDateRangeChange() {
    const value = dom.dateRangeSelect.value;
    if (value === 'custom') return;
    const endDate = new Date();
    let startDate = new Date();
    switch (value) {
        case '1q': startDate.setMonth(endDate.getMonth() - 3); break;
        case '2q': startDate.setMonth(endDate.getMonth() - 6); break;
        case '3q': startDate.setMonth(endDate.getMonth() - 9); break;
        case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        case 'this_year': startDate = new Date(endDate.getFullYear(), 0, 1); break;
        case 'last_2_years': startDate = new Date(endDate.getFullYear() - 1, 0, 1); break;
        case 'last_3_years': startDate = new Date(endDate.getFullYear() - 2, 0, 1); break;
    }
    dom.dateStartInput.value = ui.formatDate(startDate);
    dom.dateEndInput.value = ui.formatDate(endDate);
}

export function updateDistrictOptions() {
    const selectedCounty = dom.countySelect.value;
    clearSelectedDistricts();
    dom.districtSuggestions.innerHTML = '';
    if (selectedCounty && districtData[selectedCounty]) {
        const districtNames = districtData[selectedCounty];
        const selectAllHtml = `<label class="suggestion-item font-bold text-cyan-400" data-name="all"><input type="checkbox" id="district-select-all"><span class="flex-grow">全選/全不選</span></label><hr class="border-gray-600 mx-2">`;
        const districtsHtml = districtNames.map(name => {
            const isChecked = state.selectedDistricts.includes(name);
            return `<label class="suggestion-item" data-name="${name}"><input type="checkbox" ${isChecked ? 'checked' : ''}><span class="flex-grow">${name}</span></label>`
        }).join('');
        dom.districtSuggestions.innerHTML = selectAllHtml + districtsHtml;
        dom.districtContainer.classList.remove('disabled');
        dom.districtInputArea.textContent = "點擊選擇行政區";
        dom.projectNameInput.disabled = false;
        dom.projectNameInput.placeholder = "輸入建案名稱搜尋...";
    } else {
        dom.districtContainer.classList.add('disabled');
        dom.districtInputArea.textContent = "請先選縣市";
        dom.projectNameInput.disabled = true;
        dom.projectNameInput.placeholder = "請先選縣市...";
    }
    toggleAnalyzeButtonState();
    clearSelectedProjects();
}

export function clearSelectedDistricts() {
    state.selectedDistricts = [];
    componentRenderer.renderDistrictTags();
    dom.districtSuggestions.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
}

export function onDistrictContainerClick(e) {
    if (e.target.classList.contains('multi-tag-remove')) {
        e.stopPropagation();
        removeDistrict(e.target.dataset.name);
        return;
    }
    if (dom.districtContainer.classList.contains('disabled')) return;
    const isHidden = dom.districtSuggestions.classList.toggle('hidden');
    dom.filterCard.classList.toggle('z-elevate-filters', !isHidden);
}


export function onDistrictSuggestionClick(e) {
    const target = e.target.closest('.suggestion-item'); if (!target) return;
    const name = target.dataset.name;
    const checkbox = target.querySelector('input[type="checkbox"]'); if (!name || !checkbox) return;
    const allDistrictNames = districtData[dom.countySelect.value] || [];
    const selectAllCheckbox = document.getElementById('district-select-all');
    setTimeout(() => {
        const isChecked = checkbox.checked;
        if (name === 'all') {
            state.selectedDistricts = isChecked ? [...allDistrictNames] : [];
            dom.districtSuggestions.querySelectorAll('label:not([data-name="all"]) input[type="checkbox"]').forEach(cb => { cb.checked = isChecked; });
        } else {
            if (isChecked) {
              if (!state.selectedDistricts.includes(name)) state.selectedDistricts.push(name);
            } else {
                state.selectedDistricts = state.selectedDistricts.filter(d => d !== name);
            }
        }
        if (selectAllCheckbox) {
           selectAllCheckbox.checked = allDistrictNames.length > 0 && state.selectedDistricts.length === allDistrictNames.length;
        }
        componentRenderer.renderDistrictTags();
    }, 0);
}

export function removeDistrict(name) {
    state.selectedDistricts = state.selectedDistricts.filter(d => d !== name);
    componentRenderer.renderDistrictTags();
    const checkbox = dom.districtSuggestions.querySelector(`label[data-name="${name}"] input`);
    if (checkbox) checkbox.checked = false;
    const selectAllCheckbox = document.getElementById('district-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

export function onProjectInputFocus() {
    if (!dom.projectNameInput.value.trim() && dom.countySelect.value) {
        mainFetchProjectNameSuggestions('');
    }
}

export function onProjectInput() {
    clearTimeout(state.suggestionDebounceTimer);
    state.suggestionDebounceTimer = setTimeout(() => {
        mainFetchProjectNameSuggestions(dom.projectNameInput.value);
    }, 300);
}

export function onSuggestionClick(e) {
    const target = e.target.closest('.suggestion-item'); if (!target) return;
    const name = target.dataset.name;
    const checkbox = target.querySelector('input[type="checkbox"]'); if (!name || !checkbox) return;
    setTimeout(() => {
        if (checkbox.checked) {
            if (!state.selectedProjects.includes(name)) { state.selectedProjects.push(name); }
        } else {
            state.selectedProjects = state.selectedProjects.filter(p => p !== name);
        }
        componentRenderer.renderProjectTags();
    }, 0);
}

export function removeProject(name) {
    state.selectedProjects = state.selectedProjects.filter(p => p !== name);
    componentRenderer.renderProjectTags();
    const openSuggestionCheckbox = dom.projectNameSuggestions.querySelector(`label[data-name="${name}"] input`);
    if (openSuggestionCheckbox) openSuggestionCheckbox.checked = false;
}

export function clearSelectedProjects() {
    state.selectedProjects = [];
    componentRenderer.renderProjectTags();
    const suggestionCheckboxes = dom.projectNameSuggestions.querySelectorAll('input[type="checkbox"]');
    suggestionCheckboxes.forEach(cb => cb.checked = false);
}

export function toggleAnalyzeButtonState() {
    const isCountySelected = !!dom.countySelect.value;
    const isValidType = dom.typeSelect.value === '預售交易';
    dom.analyzeBtn.disabled = !(isCountySelected && isValidType);
    dom.analyzeHeatmapBtn.disabled = !(isCountySelected && isValidType);
}

// ▼▼▼ 【新增處】處理Treemap指標切換 ▼▼▼
export function handleTreemapMetricChange(e) {
    const button = e.target.closest('.avg-type-btn');
    if (!button || button.classList.contains('active')) return;

    const metric = button.dataset.metric;
    state.currentTreemapMetric = metric;

    dom.treemapMetricToggle.querySelector('.active').classList.remove('active');
    button.classList.add('active');

    // Re-render the chart with the new metric
    if (state.analysisDataCache) {
        chartRenderer.renderRankingChart();
    }
}
// ▲▲▲ 【新增結束】 ▲▲▲

export function switchAverageType(type) {
    if (state.currentAverageType === type || !type) return;
    state.currentAverageType = type;
    dom.avgTypeToggle.querySelector('.avg-type-btn.active').classList.remove('active');
    dom.avgTypeToggle.querySelector(`.avg-type-btn[data-type="${type}"]`).classList.add('active');
    if (state.analysisDataCache) { reportRenderer.renderUnitPriceReport(); }
}

// ▼▼▼ 【修改處】 ▼▼▼
export function handlePriceBandRoomFilterClick(e) {
    const button = e.target.closest('.capsule-btn');
    if (!button) return;
    const roomType = button.dataset.roomType;
    if (!roomType) return;

    button.classList.toggle('active');
    
    // 更新 state
    if (button.classList.contains('active')) {
        if (!state.selectedPriceBandRoomTypes.includes(roomType)) {
            state.selectedPriceBandRoomTypes.push(roomType);
        }
    } else {
        state.selectedPriceBandRoomTypes = state.selectedPriceBandRoomTypes.filter(r => r !== roomType);
    }
    
    // 【核心修改】呼叫主渲染函式來更新整個區塊 (表格 + 圖表)
    // 這會使其行為與 '房型去化分析' 的篩選器一致
    reportRenderer.renderPriceBandReport();
}
// ▲▲▲ 【修改結束】 ▲▲▲

export function handleVelocityRoomFilterClick(e) {
    const button = e.target.closest('.capsule-btn'); if (!button) return;
    const roomType = button.dataset.roomType;
    button.classList.toggle('active');
    if (button.classList.contains('active')) {
        if (!state.selectedVelocityRooms.includes(roomType)) state.selectedVelocityRooms.push(roomType);
    } else {
        state.selectedVelocityRooms = state.selectedVelocityRooms.filter(r => r !== roomType);
    }
    const { allRoomTypes } = state.analysisDataCache.salesVelocityAnalysis;
    state.selectedVelocityRooms.sort((a, b) => allRoomTypes.indexOf(a) - allRoomTypes.indexOf(b));
    tableRenderer.renderVelocityTable();
    chartRenderer.renderSalesVelocityChart();
    chartRenderer.renderAreaHeatmap(); 
}

export function handleVelocitySubTabClick(e) {
    const button = e.target.closest('.sub-tab-btn');
    if (!button) return;
    state.currentVelocityView = button.dataset.view;
    dom.velocitySubTabsContainer.querySelector('.active').classList.remove('active');
    button.classList.add('active');
    tableRenderer.renderVelocityTable();
    chartRenderer.renderSalesVelocityChart();
    chartRenderer.renderAreaHeatmap();
}

// ▼▼▼ 【新增處】處理熱力圖詳細數據的統計類型切換 ▼▼▼
export function handleHeatmapMetricToggle(e) {
    const button = e.target.closest('.avg-type-btn');
    if (!button || button.classList.contains('active')) return;

    const metricType = button.dataset.type;
    state.currentHeatmapDetailMetric = metricType;

    dom.heatmapMetricToggle.querySelector('.active').classList.remove('active');
    button.classList.add('active');

    // 重新渲染表格
    if (state.lastHeatmapDetails) {
        tableRenderer.renderHeatmapDetailsTable();
    }
}
// ▲▲▲ 【新增結束】 ▲▲▲

export function handlePriceGridProjectFilterClick(e) {
    const button = e.target.closest('.capsule-btn');
    if (!button) return;
    
    if (button.classList.contains('active')) {
         return;
    }
    
    state.selectedPriceGridProject = button.dataset.project;
    syncMainProjectFilter(state.selectedPriceGridProject);

    if (dom.priceGridProjectFilterContainer.querySelector('.active')) {
        dom.priceGridProjectFilterContainer.querySelector('.active').classList.remove('active');
    }
    button.classList.add('active');
    
    state.isHeatmapActive = false;
    dom.analyzeHeatmapBtn.innerHTML = `<i class="fas fa-fire mr-2"></i>開始分析`;
    dom.backToGridBtn.classList.add('hidden');
    dom.heatmapInfoContainer.classList.add('hidden');
    dom.heatmapSummaryTableContainer.classList.add('hidden');
    dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');
    heatmapRenderer.displayCurrentPriceGrid();
}

export function syncMainProjectFilter(projectName) {
    if (!projectName) {
        state.selectedProjects = [];
    } else {
        state.selectedProjects = [projectName];
    }
    componentRenderer.renderProjectTags();
    dom.projectNameSuggestions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const itemName = cb.closest('.suggestion-item').dataset.name;
        cb.checked = (itemName === projectName);
    });
}

export async function analyzeHeatmap() {
    state.isHeatmapActive = true;
    const btn = dom.analyzeHeatmapBtn;
    btn.disabled = true;
    btn.innerHTML = `<div class="loader-sm"></div><span class="ml-2">分析中...</span>`;
    btn.classList.add('btn-loading');
    try {
        if (!state.analysisDataCache || !state.analysisDataCache.priceGridAnalysis) {
             console.log("No analysis cache found. Fetching new data for heatmap...");
             await mainAnalyzeData(); 
             if (!state.analysisDataCache) { 
                 throw new Error("無法獲取基礎分析資料，請先執行標準分析。");
             }
        }
        
        heatmapRenderer.renderPriceGapHeatmap(); 
        
        dom.heatmapInfoContainer.classList.remove('hidden');
        btn.innerHTML = `<i class="fas fa-sync-alt mr-2"></i>重新分析`;
        dom.backToGridBtn.classList.remove('hidden');
    } catch (error) {
        console.error("熱力圖分析失敗:", error);
        ui.showMessage(`熱力圖分析失敗: ${error.message}`, true);
        state.isHeatmapActive = false;
        dom.heatmapInfoContainer.classList.add('hidden');
        dom.heatmapSummaryTableContainer.classList.add('hidden');
        dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');
        btn.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>分析失敗`;
    } finally {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
    }
}

export function handleBackToGrid() {
    state.isHeatmapActive = false;
    heatmapRenderer.displayCurrentPriceGrid();
    dom.backToGridBtn.classList.add('hidden');
    dom.heatmapInfoContainer.classList.add('hidden');
    dom.heatmapSummaryTableContainer.classList.add('hidden');
    dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');
    dom.analyzeHeatmapBtn.innerHTML = `<i class="fas fa-fire mr-2"></i>開始分析`;
}

export async function handleShareClick(reportType) {
    const btnIdMapping = { 'price_grid': 'sharePriceGridBtn' };
    const btnId = btnIdMapping[reportType];
    const btn = dom[btnId];
    if (!btn) { console.error(`分享按鈕 "${btnId}" 未在 dom 物件中定義。`); return; }
    btn.disabled = true;
    btn.innerHTML = `<div class="loader-sm"></div>`;
    try {
        const filters = getFilters();
        const viewOptions = {};
        if (state.isHeatmapActive) {
            const floorPremium = parseFloat(dom.floorPremiumInput.value);
            if (typeof floorPremium === 'number' && !isNaN(floorPremium)) { viewOptions.floorPremium = floorPremium; }
        }
        const payload = {
            report_type: reportType,
            filters: filters,
            date_config: {},
            view_mode: state.isHeatmapActive ? 'heatmap' : 'standard',
            view_options: viewOptions
        };
        const dateRangeValue = dom.dateRangeSelect.value;
        if (dateRangeValue === 'custom') {
            payload.date_config = { type: 'absolute', start: dom.dateStartInput.value, end: dom.dateEndInput.value };
        } else {
            payload.date_config = { type: 'relative', value: dateRangeValue };
        }

        const result = await api.generateShareLink(payload);
        
        dom.shareUrlInput.value = result.publicUrl;
        dom.shareModal.classList.remove('hidden');
        dom.copyFeedback.classList.add('hidden');
    } catch (error) {
        console.error("分享失敗:", error);
        alert(`產生分享連結失敗: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-share-alt mr-2"></i>分享/內嵌`;
    }
}

export function copyShareUrl() {
    dom.shareUrlInput.select();
    document.execCommand('copy');
    dom.copyFeedback.classList.remove('hidden');
    setTimeout(() => { dom.copyFeedback.classList.add('hidden'); }, 2000);
}

export function handleLegendClick(e) {
    const legendItem = e.target.closest('.legend-item');
    if (!legendItem) return;
    const { filterType, filterValue } = legendItem.dataset;
    if (legendItem.classList.contains('active')) {
        legendItem.classList.remove('active');
        state.currentLegendFilter = { type: null, value: null };
    } else {
        dom.heatmapLegendContainer.querySelectorAll('.legend-item.active').forEach(item => item.classList.remove('active'));
        legendItem.classList.add('active');
        state.currentLegendFilter = { type: filterType, value: filterValue };
    }
    heatmapRenderer.applyHeatmapGridFilter();
}

export function handleGlobalClick(e) {
    const isClickInsideProject = dom.projectFilterWrapper.contains(e.target);
    if (!isClickInsideProject) {
        dom.projectNameSuggestions.classList.add('hidden');
        dom.projectNameInput.value = '';
    }
    const isClickInsideDistrict = dom.districtFilterWrapper.contains(e.target);
    if (!isClickInsideDistrict) dom.districtSuggestions.classList.add('hidden');
    if (!isClickInsideDistrict && !isClickInsideProject) dom.filterCard.classList.remove('z-elevate-filters');
    const isClickInsideHeatmap = dom.horizontalPriceGridContainer.contains(e.target) || dom.heatmapLegendContainer.contains(e.target);
    if (state.currentLegendFilter.type && !isClickInsideHeatmap) {
        dom.heatmapLegendContainer.querySelectorAll('.legend-item.active').forEach(item => item.classList.remove('active'));
        state.currentLegendFilter = { type: null, value: null };
        heatmapRenderer.applyHeatmapGridFilter();
    }
}