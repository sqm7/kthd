// js/modules/eventHandlers.js

import { dom } from './dom.js';
import { state } from './state.js';
import {
    fetchData,
    fetchProjects,
    fetchDistrictsForCounty,
    performAnalysis,
    generateShareLink,
} from './api.js';
import {
    updateProjectNameSuggestions,
    updateDistrictSuggestions,
    updateUIForNewCounty,
    handleProjectSelection,
    handleDistrictSelection,
    clearSelectedProjects,
    clearSelectedDistricts,
    updateDateInputs,
    showTab,
    updateLoadingButton,
    updatePriceBandRoomFilter,
    updateVelocityRoomFilter,
    updatePriceGridProjectFilter,
    showShareModal,
    hideShareModal,
    copyToClipboard,
    updateHeatmapControls,
} from './ui.js';
import {
    renderSalesVelocityChart,
    renderPriceBandChart,
    renderAreaHeatmap,
    renderRankingChart,
} from './renderers/charts.js';
import {
    renderHeatmapDetailsTable
} from './renderers/tables.js';


let projectFetchController = null;
let districtFetchController = null;
let projectSuggestionsTimeout = null;
let districtSuggestionsTimeout = null;

/**
 * 初始化所有事件監聽器
 */
export function setupEventListeners() {
    // --- 篩選器相關事件 ---

    // 縣市選擇
    dom.countySelect.addEventListener('change', async (e) => {
        const county = e.target.value;
        await updateUIForNewCounty(county);
        if (county) {
            await fetchDistrictsForCounty(county);
        }
    });

    // 行政區點擊展開/關閉
    dom.districtInputArea.addEventListener('click', () => {
        if (!dom.countySelect.value) return;
        dom.districtSuggestions.classList.toggle('hidden');
    });

    // 行政區輸入篩選
    dom.districtInputArea.addEventListener('input', () => {
        const query = dom.districtInputArea.value.toLowerCase();
        updateDistrictSuggestions(query);
    });
    
    // 行政區建議列表點擊
    dom.districtSuggestions.addEventListener('click', (e) => {
        if (e.target.tagName === 'DIV' && e.target.dataset.value) {
            handleDistrictSelection(e.target.dataset.value);
            dom.districtSuggestions.classList.add('hidden');
        }
    });

    // 清除已選行政區
    dom.clearDistrictsBtn.addEventListener('click', clearSelectedDistricts);


    // 建案輸入框獲取焦點
    dom.projectNameInput.addEventListener('focus', async () => {
        if (dom.countySelect.value && state.projectNames.length === 0) {
            await fetchProjects(dom.countySelect.value, state.selectedDistricts);
        }
        updateProjectNameSuggestions('');
        dom.projectNameSuggestions.classList.remove('hidden');
    });

    // 建案輸入框輸入
    dom.projectNameInput.addEventListener('input', () => {
        const query = dom.projectNameInput.value;
        if (projectSuggestionsTimeout) clearTimeout(projectSuggestionsTimeout);
        projectSuggestionsTimeout = setTimeout(() => {
             updateProjectNameSuggestions(query);
        }, 300);
    });

    // 建案建議列表點擊
    dom.projectNameSuggestions.addEventListener('click', (e) => {
        if (e.target.tagName === 'DIV' && e.target.dataset.value) {
            handleProjectSelection(e.target.dataset.value);
            dom.projectNameInput.value = '';
            updateProjectNameSuggestions('');
            dom.projectNameSuggestions.classList.add('hidden');
        }
    });
    
    // 清除已選建案
    dom.clearProjectsBtn.addEventListener('click', clearSelectedProjects);


    // 點擊頁面其他地方關閉建議列表
    document.addEventListener('click', (e) => {
        if (!dom.projectFilterWrapper.contains(e.target)) {
            dom.projectNameSuggestions.classList.add('hidden');
        }
        if (!dom.districtFilterWrapper.contains(e.target)) {
            dom.districtSuggestions.classList.add('hidden');
        }
    });
    
    // --- 日期相關事件 ---

    // 快捷時間範圍選擇
    dom.dateRangeSelect.addEventListener('change', (e) => {
        updateDateInputs(e.target.value);
    });

    // 手動設定今日日期
    dom.setTodayBtn.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        dom.dateEndInput.value = today;
        dom.dateRangeSelect.value = 'custom';
    });
    
    // 手動更改日期時，切換快捷選項為"自訂"
    dom.dateStartInput.addEventListener('change', () => dom.dateRangeSelect.value = 'custom');
    dom.dateEndInput.addEventListener('change', () => dom.dateRangeSelect.value = 'custom');


    // --- 主要操作按鈕事件 ---
    
    // 查詢按鈕
    dom.searchBtn.addEventListener('click', () => {
        updateLoadingButton(dom.searchBtn, true, '查詢中...');
        fetchData();
    });
    
    // 分析按鈕
    dom.analyzeBtn.addEventListener('click', () => {
        updateLoadingButton(dom.analyzeBtn, true, '分析中...');
        performAnalysis();
    });

    // --- Tab 頁籤切換事件 ---

    dom.tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
            const tabName = e.target.dataset.tab;
            showTab(tabName);
        }
    });

    // --- 報表內部篩選器與選項事件 ---

    // 總價帶分析-房型篩選器
    dom.priceBandRoomFilterContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const roomType = e.target.value;
            if (e.target.checked) {
                state.selectedPriceBandRoomTypes.push(roomType);
            } else {
                state.selectedPriceBandRoomTypes = state.selectedPriceBandRoomTypes.filter(r => r !== roomType);
            }
            renderPriceBandChart();
        }
    });
    
    // 房型去化分析-房型篩選器
    dom.velocityRoomFilterContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const roomType = e.target.value;
            if (e.target.checked) {
                state.selectedVelocityRooms.push(roomType);
            } else {
                state.selectedVelocityRooms = state.selectedVelocityRooms.filter(r => r !== roomType);
            }
            renderSalesVelocityChart();
            renderAreaHeatmap();
        }
    });

    // 房型去化分析-時間顆粒度切換 (週/月/季/年)
    dom.velocitySubTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('sub-tab-btn')) {
            dom.velocitySubTabsContainer.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentVelocityView = e.target.dataset.view;
            renderSalesVelocityChart();
        }
    });
    
    // 房屋單價分析-平均數類型切換
    dom.avgTypeToggle.addEventListener('click', (e) => {
        if (e.target.classList.contains('avg-type-btn')) {
            dom.avgTypeToggle.querySelectorAll('.avg-type-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentAvgType = e.target.dataset.type;
            // TODO: 重新渲染需要使用此狀態的表格
            console.log(`平均數類型切換為: ${state.currentAvgType}`);
        }
    });
    
    // 熱力圖-面積級距與範圍控制
    [dom.heatmapIntervalInput, dom.heatmapMinAreaInput, dom.heatmapMaxAreaInput].forEach(input => {
        input.addEventListener('change', renderAreaHeatmap);
    });
    
    dom.heatmapIntervalDecrement.addEventListener('click', () => updateHeatmapControls('decrement'));
    dom.heatmapIntervalIncrement.addEventListener('click', () => updateHeatmapControls('increment'));

    // 熱力圖詳細資料-統計類型切換
    dom.heatmapMetricToggle.addEventListener('click', (e) => {
        if (e.target.classList.contains('avg-type-btn')) {
            dom.heatmapMetricToggle.querySelectorAll('.avg-type-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.currentHeatmapMetric = e.target.dataset.type;
            renderHeatmapDetailsTable();
        }
    });
    
    // 銷控表-建案篩選器
    dom.priceGridProjectFilterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip')) {
            const previouslyActive = document.querySelector('.filter-chip.active');
            if (previouslyActive) {
                previouslyActive.classList.remove('active');
            }
            e.target.classList.add('active');
            state.selectedPriceGridProject = e.target.dataset.value;
            // TODO: 觸發銷控表重新渲染
            console.log(`銷控表建案切換為: ${state.selectedPriceGridProject}`);
        }
    });

    // 銷控表進階分析按鈕
    dom.analyzeHeatmapBtn.addEventListener('click', () => {
        console.log("開始分析銷控表熱力圖...");
        // TODO: 執行熱力圖分析邏輯
    });

    // 返回銷控表按鈕
    dom.backToGridBtn.addEventListener('click', () => {
        console.log("返回原始銷控表...");
        // TODO: 執行返回邏輯
    });

    // --- Modal 相關事件 ---

    // 附表詳情 Modal 關閉
    dom.modalCloseBtn.addEventListener('click', () => dom.detailsModal.classList.add('hidden'));
    
    // 分享 Modal 開啟與關閉
    dom.sharePriceGridBtn.addEventListener('click', generateShareLink);
    dom.shareModalCloseBtn.addEventListener('click', hideShareModal);
    dom.copyShareUrlBtn.addEventListener('click', () => {
        copyToClipboard(dom.shareUrlInput.value, dom.copyFeedback);
    });
    
    // 點擊 Modal 背景關閉
    window.addEventListener('click', (e) => {
        if (e.target === dom.detailsModal) {
            dom.detailsModal.classList.add('hidden');
        }
        if (e.target === dom.shareModal) {
            hideShareModal();
        }
    });
    
    // 核心指標與排名 - 圖表指標切換
    dom.rankingMetricToggle.addEventListener('click', (e) => {
        if (e.target.classList.contains('ranking-metric-btn')) {
            document.querySelectorAll('.ranking-metric-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const metric = e.target.dataset.metric;
            renderRankingChart(metric);
        }
    });

}
