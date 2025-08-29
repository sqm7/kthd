// js/modules/eventHandlers.js

import { supabase } from '../supabase-client.js';
import { state, getFilters, resetStateForNewAnalysis } from './state.js';
import { dom } from './dom.js';
import { fetchDistricts, fetchProjectNames, fetchAnalysisData, fetchData, fetchSubData } from './api.js';
import { renderTable, renderPagination, renderSelectedItems, renderSuggestions, renderRankingReport, renderAnalysisReport, renderHeatmapDetailsTable } from './renderers/uiComponents.js';
import { debounce, isValidDateRange, showLoading, hideLoading, showAlert } from './utils.js';
import * as chartRenderer from './renderers/charts.js';

// --- 全域事件處理 (解決監聽遺失問題) ---
/**
 * 初始化全域事件監聽器，使用事件委派來處理動態生成的元素
 */
export function initGlobalEventListeners() {
    document.body.addEventListener('click', async (e) => {
        // 處理登出按鈕
        if (e.target.closest('#logout-button')) {
            e.preventDefault();
            showLoading('正在登出...');
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('登出失敗:', error);
                showAlert('登出時發生錯誤，請稍後再試。');
            } else {
                window.location.href = '/login.html';
            }
            hideLoading();
        }

        // 可以在這裡為其他未來可能動態生成的元素增加事件處理
    });
}


// --- 篩選器事件處理 ---
export async function handleCountyChange() {
    const county = dom.countySelect.value;
    state.selectedDistricts = [];
    renderSelectedItems(state.selectedDistricts, dom.selectedDistrictsContainer, 'districts');
    await fetchDistricts(county);
}

export function handleDistrictChange() {
    const district = dom.districtSelect.value;
    if (district && !state.selectedDistricts.includes(district)) {
        state.selectedDistricts.push(district);
        renderSelectedItems(state.selectedDistricts, dom.selectedDistrictsContainer, 'districts');
    }
    dom.districtSelect.value = '';
}

export function handleTypeChange() {
    // 邏輯可根據需求擴充
}

export function handleDateChange() {
    // 邏輯可根據需求擴充
}

export function handleBuildingTypeChange() {
    // 邏輯可根據需求擴充
}


// --- 建案名稱自動完成 ---
export const handleProjectNameInput = debounce(async (e) => {
    const query = e.target.value;
    if (query.length < 2) {
        dom.suggestionsList.innerHTML = '';
        dom.suggestionsList.classList.add('hidden');
        return;
    }
    const projects = await fetchProjectNames(query, getFilters());
    renderSuggestions(projects, dom.suggestionsList, 'projectName');
}, 300);

export function handleProjectNameSelect(e) {
    if (e.target.tagName === 'LI') {
        const projectName = e.target.textContent;
        if (!state.selectedProjects.includes(projectName)) {
            state.selectedProjects.push(projectName);
            renderSelectedItems(state.selectedProjects, dom.selectedProjectsContainer, 'projects');
        }
        dom.projectNameInput.value = '';
        dom.suggestionsList.innerHTML = '';
        dom.suggestionsList.classList.add('hidden');
    }
}

export function handleProjectNameBlur() {
    setTimeout(() => {
        dom.suggestionsList.classList.add('hidden');
    }, 150);
}


// --- 標籤移除 ---
export function handleRemoveDistrict(e) {
    if (e.target.classList.contains('remove-btn')) {
        const district = e.target.dataset.item;
        state.selectedDistricts = state.selectedDistricts.filter(d => d !== district);
        renderSelectedItems(state.selectedDistricts, dom.selectedDistrictsContainer, 'districts');
    }
}

export function handleRemoveProject(e) {
    if (e.target.classList.contains('remove-btn')) {
        const project = e.target.dataset.item;
        state.selectedProjects = state.selectedProjects.filter(p => p !== project);
        renderSelectedItems(state.selectedProjects, dom.selectedProjectsContainer, 'projects');
    }
}


// --- 主要操作按鈕 ---
export async function handleAnalysisButtonClick() {
    if (!isValidDateRange(dom.dateStartInput.value, dom.dateEndInput.value)) {
        showAlert('起始日期不能晚於結束日期。');
        return;
    }

    showLoading('正在進行數據分析...');
    resetStateForNewAnalysis();
    
    try {
        const filters = getFilters();
        state.analysisDataCache = await fetchAnalysisData(filters);

        // 觸發第一個頁籤的渲染
        const activeTab = dom.tabsContainer.querySelector('.tab.active')?.dataset.tab || 'ranking-report';
        await renderContentForTab(activeTab);

        dom.mainContent.classList.remove('hidden');

    } catch (error) {
        console.error('分析失敗:', error);
        showAlert(error.message || '分析數據時發生未知錯誤。');
    } finally {
        hideLoading();
    }
}

export async function handleShareButtonClick() {
    const filters = getFilters();
    showLoading('正在生成分享連結...');
    try {
        const { data, error } = await supabase.functions.invoke('generate-share-link', {
            body: { filters },
        });

        if (error) throw error;
        
        const shareUrl = `${window.location.origin}/report-viewer.html?token=${data.token}`;
        
        await navigator.clipboard.writeText(shareUrl);
        showAlert('分享連結已複製到剪貼簿！');

    } catch (error) {
        console.error('生成分享連結失敗:', error);
        showAlert('生成分享連結時發生錯誤。');
    } finally {
        hideLoading();
    }
}


// --- 分頁與排序 ---
export async function handlePageClick(e) {
    e.preventDefault();
    const target = e.target.closest('a');
    if (target && !target.parentElement.classList.contains('disabled')) {
        const newPage = parseInt(target.dataset.page, 10);
        if (newPage !== state.currentPage) {
            state.currentPage = newPage;
            showLoading('正在載入資料...');
            const data = await fetchData(getFilters(), state.currentPage, state.pageSize, state.currentSort);
            renderTable(data, dom.dataTable);
            hideLoading();
        }
    }
}

export async function handleSortClick(e, tableType = 'main') {
    const th = e.target.closest('th[data-sort-key]');
    if (!th) return;

    showLoading('正在重新排序...');

    const key = th.dataset.sortKey;
    let order = 'desc';

    if (state.currentSort.key === key && state.currentSort.order === 'desc') {
        order = 'asc';
    }
    state.currentSort = { key, order };

    // 更新箭頭指示
    dom.dataTable.querySelectorAll('th').forEach(header => header.classList.remove('sort-asc', 'sort-desc'));
    th.classList.add(order === 'asc' ? 'sort-asc' : 'sort-desc');

    if (tableType === 'main') {
        state.currentPage = 1;
        const data = await fetchData(getFilters(), state.currentPage, state.pageSize, state.currentSort);
        renderTable(data, dom.dataTable);
        const total = data.length > 0 ? data[0].total_records : 0;
        renderPagination(total, state.currentPage, state.pageSize, dom.pagination);
    } else if (tableType === 'ranking') {
        state.rankingCurrentPage = 1;
        renderRankingReport(state.analysisDataCache.projectRanking);
    }
    
    hideLoading();
}


// --- 報告頁籤邏輯 ---
export async function handleTabClick(e) {
    const tab = e.target.closest('.tab');
    if (!tab || tab.classList.contains('active')) return;

    dom.tabsContainer.querySelector('.tab.active')?.classList.remove('active');
    tab.classList.add('active');
    
    const tabName = tab.dataset.tab;
    await renderContentForTab(tabName);
}

async function renderContentForTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    const activeContent = document.getElementById(tabName);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }

    showLoading('正在載入報告...');
    try {
        switch(tabName) {
            case 'ranking-report':
                renderRankingReport(state.analysisDataCache.projectRanking || []);
                break;
            case 'analysis-report':
                renderAnalysisReport(state.analysisDataCache || {});
                break;
            case 'raw-data':
                state.currentPage = 1;
                const filters = getFilters();
                const rawData = await fetchData(filters, state.currentPage, state.pageSize, state.currentSort);
                const total = rawData.length > 0 ? rawData[0].total_records : 0;
                renderTable(rawData, dom.dataTable);
                renderPagination(total, state.currentPage, state.pageSize, dom.pagination);
                break;
            case 'sub-data':
                 state.currentPage = 1;
                 const subDataFilters = getFilters();
                 const subData = await fetchSubData(subDataFilters, state.currentPage, state.pageSize, state.currentSort);
                 const subTotal = subData.length > 0 ? subData[0].total_records : 0;
                 renderTable(subData, dom.subDataTable);
                 renderPagination(subTotal, state.currentPage, state.pageSize, dom.subPagination);
                 break;
        }
    } catch (error) {
        console.error(`載入 ${tabName} 失敗:`, error);
        showAlert(`載入報告時發生錯誤: ${error.message}`);
    } finally {
        hideLoading();
    }
}


// --- 報告頁籤內的互動元件事件 ---

export function handleRankingChartMetricChange(e) {
    const button = e.target.closest('.avg-type-btn');
    if (!button || button.classList.contains('active')) return;

    const metric = button.dataset.metric;
    state.currentRankingChartMetric = metric;

    dom.rankingChartMetricToggle.querySelector('.active').classList.remove('active');
    button.classList.add('active');

    chartRenderer.renderRankingChart();
}

export function handleAverageTypeChange(e) {
    const button = e.target.closest('.avg-type-btn');
    if (!button || button.classList.contains('active')) return;

    state.currentAverageType = button.dataset.type; // 'arithmetic' or 'median'
    dom.averageTypeToggle.querySelector('.active').classList.remove('active');
    button.classList.add('active');

    renderAnalysisReport(state.analysisDataCache || {});
}

export function handleVelocityViewChange(e) {
    const button = e.target.closest('.avg-type-btn');
    if (!button || button.classList.contains('active')) return;

    state.currentVelocityView = button.dataset.view; // 'monthly' or 'quarterly'
    dom.velocityViewToggle.querySelector('.active').classList.remove('active');
    button.classList.add('active');
    
    chartRenderer.renderSalesVelocityChart(state.analysisDataCache.salesVelocity);
}

export function handleVelocityRoomFilterChange(e) {
    const button = e.target.closest('.room-filter-btn');
    if (!button) return;

    const roomType = button.dataset.room;
    button.classList.toggle('active');

    if (state.selectedVelocityRooms.includes(roomType)) {
        state.selectedVelocityRooms = state.selectedVelocityRooms.filter(r => r !== roomType);
    } else {
        state.selectedVelocityRooms.push(roomType);
    }

    chartRenderer.renderSalesVelocityChart(state.analysisDataCache.salesVelocity);
}

export function handlePriceBandRoomTypeChange(e) {
    const button = e.target.closest('.room-filter-btn');
    if (!button) return;
    
    const roomType = button.dataset.room;
    button.classList.toggle('active');

    if (state.selectedPriceBandRoomTypes.includes(roomType)) {
        state.selectedPriceBandRoomTypes = state.selectedPriceBandRoomTypes.filter(r => r !== roomType);
    } else {
        state.selectedPriceBandRoomTypes.push(roomType);
    }
    
    chartRenderer.renderPriceBandChart(state.analysisDataCache.priceDistribution);
}

export function handlePriceGridProjectChange() {
    state.selectedPriceGridProject = dom.priceGridProjectSelect.value || null;
    chartRenderer.renderPriceGridChart(state.analysisDataCache.priceGrid);
}


// --- 熱力圖相關 ---

export function handleHeatmapToggle() {
    state.isHeatmapActive = !state.isHeatmapActive;
    dom.heatmapToggle.classList.toggle('active', state.isHeatmapActive);
    chartRenderer.renderAreaPriceHeatmap(state.analysisDataCache.districtPrices);
}

export function handleLegendFilter(e) {
    const item = e.target.closest('[data-legend-type]');
    if (!item) return;

    const type = item.dataset.legendType;
    const value = item.dataset.legendValue;

    // 如果點擊的是當前已激活的圖例，則取消篩選
    if (item.classList.contains('active')) {
        state.currentLegendFilter = { type: null, value: null };
        item.classList.remove('active');
    } else {
        // 否則，設置新的篩選並更新樣式
        dom.chartLegendContainer.querySelectorAll('.legend-item').forEach(el => el.classList.remove('active'));
        state.currentLegendFilter = { type, value };
        item.classList.add('active');
    }
    
    chartRenderer.renderPriceBandChart(state.analysisDataCache.priceDistribution);
}

export function handleHeatmapDetailMetricChange(e) {
    const button = e.target.closest('.avg-type-btn');
    if (!button || button.classList.contains('active')) return;
    
    state.currentHeatmapDetailMetric = button.dataset.metric;
    
    dom.heatmapDetailMetricToggle.querySelector('.active').classList.remove('active');
    button.classList.add('active');

    if (state.lastHeatmapDetails) {
        renderHeatmapDetailsTable(state.lastHeatmapDetails);
    }
}
