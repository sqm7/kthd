// js/app.js (已修正錯誤)

// 從模組中引入設定與 Supabase Client
import { supabase, API_ENDPOINTS, districtData, countyCodeMap } from './modules/config.js';

// 認證輔助函數
async function getAuthHeaders() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        console.error('無法獲取 Session，將跳轉回登入頁面');
        window.location.href = 'login.html';
        return null;
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
    };
}

async function checkAuthOnLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
}

// DOM Elements
const dom = {
  countySelect: document.getElementById('county'),
  filterCard: document.getElementById('filter-card'),
  districtFilterWrapper: document.getElementById('district-filter-wrapper'),
  districtContainer: document.getElementById('district-container'),
  districtInputArea: document.getElementById('district-input-area'),
  districtSuggestions: document.getElementById('district-suggestions'),
  clearDistrictsBtn: document.getElementById('clear-districts-btn'),
  projectFilterWrapper: document.getElementById('project-filter-wrapper'),
  typeSelect: document.getElementById('type'),
  buildingTypeSelect: document.getElementById('building-type'),
  dateRangeSelect: document.getElementById('date-range'),
  dateStartInput: document.getElementById('date-start'),
  dateEndInput: document.getElementById('date-end'),
  setTodayBtn: document.getElementById('set-today-btn'),
  searchBtn: document.getElementById('search-btn'),
  analyzeBtn: document.getElementById('analyze-btn'),
  messageArea: document.getElementById('message-area'),
  tabsContainer: document.getElementById('tabs-container'),
  rankingReportContent: document.getElementById('ranking-report-content'),
  metricCardsContainer: document.getElementById('metric-cards-container'),
  rankingTable: document.getElementById('ranking-table'),
  rankingPaginationControls: document.createElement('div'),
  priceBandReportContent: document.getElementById('price-band-report-content'),
  priceBandTable: document.getElementById('price-band-table'),
  unitPriceReportContent: document.getElementById('unit-price-report-content'),
  residentialStatsTableContainer: document.getElementById('residential-stats-table-container'),
  residentialStatsExtraInfo: document.getElementById('residential-stats-extra-info'),
  typeComparisonTableContainer: document.getElementById('type-comparison-table-container'),
  parkingReportContent: document.getElementById('parking-report-content'),
  parkingRatioTableContainer: document.getElementById('parking-ratio-table-container'),
  avgPriceByTypeTableContainer: document.getElementById('avg-price-by-type-table-container'),
  rampPlanePriceByFloorTableContainer: document.getElementById('ramp-plane-price-by-floor-table-container'),
  velocityReportContent: document.getElementById('velocity-report-content'),
  velocityRoomFilterContainer: document.getElementById('velocity-room-filter-container'),
  velocitySubTabsContainer: document.getElementById('velocity-sub-tabs-container'),
  velocityTableContainer: document.getElementById('velocity-table-container'),
  priceGridReportContent: document.getElementById('price-grid-report-content'),
  unitColorLegendContainer: document.getElementById('unit-color-legend-container'),
  horizontalPriceGridContainer: document.getElementById('horizontal-price-grid-container'),
  priceGridProjectFilterContainer: document.getElementById('price-grid-project-filter-container'),
  dataListContent: document.getElementById('data-list-content'),
  resultsTable: document.getElementById('results-table'),
  paginationControls: document.getElementById('pagination-controls'),
  modal: document.getElementById('details-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalContent: document.getElementById('modal-content'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  projectNameContainer: document.getElementById('project-name-container'),
  projectNameInput: document.getElementById('project-name-input'),
  projectNameSuggestions: document.getElementById('project-name-suggestions'),
  clearProjectsBtn: document.getElementById('clear-projects-btn'),
  avgTypeToggle: document.getElementById('avg-type-toggle'),
  analyzeHeatmapBtn: document.getElementById('analyze-heatmap-btn'),
  backToGridBtn: document.getElementById('back-to-grid-btn'),
  floorPremiumInput: document.getElementById('floor-premium-input'),
  heatmapInfoContainer: document.getElementById('heatmap-info-container'),
  heatmapLegendContainer: document.getElementById('heatmap-legend-container'),
  heatmapColorLegend: document.getElementById('heatmap-color-legend'),
  heatmapIconLegend: document.getElementById('heatmap-icon-legend'),
  heatmapSummaryTableContainer: document.getElementById('heatmap-summary-table-container'),
  heatmapHorizontalComparisonTableContainer: document.getElementById('heatmap-horizontal-comparison-table-container'),
  sharePriceGridBtn: document.getElementById('share-price-grid-btn'),
  shareModal: document.getElementById('share-modal'),
  shareModalTitle: document.getElementById('share-modal-title'),
  shareModalContent: document.getElementById('share-modal-content'),
  shareModalCloseBtn: document.getElementById('share-modal-close-btn'),
  shareUrlInput: document.getElementById('share-url-input'),
  copyShareUrlBtn: document.getElementById('copy-share-url-btn'),
  copyFeedback: document.getElementById('copy-feedback'),
  areaHeatmapChart: document.getElementById('area-heatmap-chart'),
  heatmapIntervalInput: document.getElementById('heatmap-interval-input'),
  heatmapIntervalIncrementBtn: document.getElementById('heatmap-interval-increment'),
  heatmapIntervalDecrementBtn: document.getElementById('heatmap-interval-decrement'),
};

// State variables
let currentPage = 1, pageSize = 30, totalRecords = 0;
let selectedDistricts = [], selectedProjects = [], suggestionDebounceTimer;
let analysisDataCache = null; 
let currentSort = { key: 'saleAmountSum', order: 'desc' };
let rankingCurrentPage = 1, rankingPageSize = 15;
let currentAverageType = 'arithmetic';
let currentVelocityView = 'monthly';
let selectedVelocityRooms = [];
let selectedPriceGridProject = null;
let isHeatmapActive = false;
let currentLegendFilter = { type: null, value: null };
let areaHeatmapChart = null; 

// --- Heatmap related functions ---
const heatmapColorMapping = { high: { label: '高度溢價 (> 5%)', color: 'rgba(244, 63, 94, 0.5)' }, medium: { label: '中度溢價 (2-5%)', color: 'rgba(234, 179, 8, 0.4)' }, low: { label: '微幅溢價 (0-2%)', color: 'rgba(34, 197, 94, 0.3)' }, discount: { label: '建案折價 (< 0%)', color: 'rgba(139, 92, 246, 0.4)' }, };
const specialTypeMapping = { storefront: { label: '店舖類型', icon: '<i class="fas fa-store"></i>' }, anchor: { label: '基準戶', icon: '<i class="fas fa-anchor"></i>' }, terrace: { label: '露台戶', icon: '<i class="fas fa-seedling"></i>' }, insider: { label: '親友/員工', icon: '<i class="fas fa-users"></i>' }, };
function getPremiumCategory(premium) { if (premium === null) return 'none'; if (premium < 0) return 'discount'; if (premium === 0) return 'anchor'; if (premium > 5) return 'high'; if (premium > 2) return 'medium'; return 'low'; }
function getHeatmapColor(premium) { if (premium === null) return '#1f2937'; const category = getPremiumCategory(premium); return heatmapColorMapping[category] ? heatmapColorMapping[category].color : 'rgba(34, 197, 94, 0.2)'; }

function renderHeatmapLegends() {
    dom.heatmapColorLegend.innerHTML = Object.entries(heatmapColorMapping).map(([key, {label, color}]) => ` <div class="legend-item" data-filter-type="premium" data-filter-value="${key}"> <span class="color-legend-swatch" style="background-color: ${color};"></span> <span>${label}</span> </div> `).join('');
    dom.heatmapIconLegend.innerHTML = Object.entries(specialTypeMapping).map(([key, {label, icon}]) => ` <div class="legend-item" data-filter-type="special" data-filter-value="${key}"> <span class="icon-legend-symbol">${icon}</span> <span>${label}</span> </div> `).join('');
}

function handleLegendClick(e) {
    const legendItem = e.target.closest('.legend-item'); if (!legendItem) return;
    const { filterType, filterValue } = legendItem.dataset;
    if (legendItem.classList.contains('active')) {
        legendItem.classList.remove('active');
        currentLegendFilter = { type: null, value: null };
    } else {
        dom.heatmapLegendContainer.querySelectorAll('.legend-item.active').forEach(item => item.classList.remove('active'));
        legendItem.classList.add('active');
        currentLegendFilter = { type: filterType, value: filterValue };
    }
    applyHeatmapGridFilter();
}

function applyHeatmapGridFilter() {
    const { type, value } = currentLegendFilter;
    const allCells = dom.horizontalPriceGridContainer.querySelectorAll('.heatmap-cell');
    if (!type || !value) {
        allCells.forEach(cell => cell.classList.remove('dimmed'));
        return;
    }
    allCells.forEach(cell => {
        const cellValue = cell.dataset[type === 'premium' ? 'premiumCategory' : 'specialType'];
        if (cellValue === value) {
            cell.classList.remove('dimmed');
        } else {
            cell.classList.add('dimmed');
        }
    });
}

function renderPriceGapHeatmap() {
    const container = dom.horizontalPriceGridContainer;
    const localAnalysisData = JSON.parse(JSON.stringify(analysisDataCache));
    const projectAnalysisData = localAnalysisData.priceGridAnalysis.byProject[selectedPriceGridProject];

    if (!projectAnalysisData) {
        container.innerHTML = '<p class="text-gray-500 p-4 text-center">找不到此建案的熱力圖分析資料。</p>';
        return;
    }
    renderHeatmapLegends();
    currentLegendFilter = { type: null, value: null };
    const { horizontalGrid, sortedFloors, sortedUnits, unitColorMap, summary } = projectAnalysisData;
    let tableHtml = '<table class="min-w-full divide-y divide-gray-800 border-collapse">';
    let headerHtml = '<thead><tr><th class="sticky left-0 bg-dark-card z-10 p-2">樓層 \\ 戶別</th>';
    sortedUnits.forEach(unit => { headerHtml += `<th class="text-center p-2" style="background-color:${unitColorMap[unit] || '#4b5563'}80;">${unit}</th>`; });
    headerHtml += '</tr></thead>';
    let bodyHtml = '<tbody>';
    sortedFloors.forEach(floor => {
        bodyHtml += `<tr class="hover:bg-gray-800/50"><td class="font-bold sticky left-0 bg-dark-card z-10 p-2">${floor}</td>`;
        sortedUnits.forEach(unit => {
            const cellDataArray = horizontalGrid[floor] ? horizontalGrid[floor][unit] : null;
            if (cellDataArray && cellDataArray.length > 0) {
                const cellContent = cellDataArray.map(tx => {
                    const { premium, isStorefront, remark, tooltipInfo } = tx;
                    const remarkText = remark || '';
                    let specialType = 'none';
                    let iconHtml = '';
                    const premiumCategory = getPremiumCategory(premium);
                    let bgColor = getHeatmapColor(premium);
                    
                    let formattedTooltip = '';
                    const baseInfo = `交易總價: ${formatNumber(tooltipInfo.totalPrice, 0)} 萬\n房屋總價: ${formatNumber(tooltipInfo.housePrice, 0)} 萬\n車位總價: ${formatNumber(tooltipInfo.parkingPrice, 0)} 萬\n房屋面積: ${formatNumber(tooltipInfo.houseArea, 2)} 坪\n房間數: ${tooltipInfo.rooms || '-'} 房`;

                    if (premium === 0) {
                        specialType = 'anchor';
                        iconHtml = `<span class="has-tooltip" data-tooltip="${specialTypeMapping[specialType].label}">${specialTypeMapping[specialType].icon}</span> `;
                        formattedTooltip = `本戶為基準戶\n--------------------\n${baseInfo}`;
                    } else {
                        let specialLabel = '';
                        if (isStorefront) {
                            specialType = 'storefront';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}">${specialTypeMapping[specialType].icon}</span> `;
                            bgColor = '#1f2937';
                        } else if (remarkText.includes('露台')) {
                            specialType = 'terrace';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}: ${remarkText}">${specialTypeMapping[specialType].icon}</span> `;
                        } else if (remarkText.includes('親友') || remarkText.includes('員工')) {
                            specialType = 'insider';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}: ${remarkText}">${specialTypeMapping[specialType].icon}</span> `;
                        }

                        const premiumLine = `調價幅度: ${formatNumber(premium, 2)} %`;

                        if (specialLabel) {
                            formattedTooltip = `${specialLabel}\n${premiumLine}\n--------------------\n${baseInfo}`;
                        } else {
                            formattedTooltip = `${premiumLine}\n--------------------\n${baseInfo}`;
                        }
                    }

                    return `<div class="has-tooltip py-1 heatmap-cell" data-tooltip="${formattedTooltip}" data-premium-category="${premiumCategory}" data-special-type="${specialType}" style="border-radius: 4px; margin-bottom: 4px; padding: 2px 4px; background-color: ${bgColor}; border: ${specialType === 'anchor' ? '1px solid #06b6d4' : 'none'};"> <span class="font-semibold">${iconHtml}${tx.unitPrice.toFixed(1)}萬</span><br><span class="text-xs text-gray-400">(${tx.transactionDate})</span> </div>`;
                }).join('');
                bodyHtml += `<td style="vertical-align: top; padding: 4px 8px; border-left: 1px solid #374151;">${cellContent}</td>`;
            } else {
                bodyHtml += `<td style="background-color: #1a1d29; border-left: 1px solid #374151;">-</td>`;
            }
        });
        bodyHtml += `</tr>`;
    });
    bodyHtml += '</tbody>';
    tableHtml += headerHtml + bodyHtml + '</table>';
    container.innerHTML = tableHtml;
    renderHeatmapSummaryTable(summary);
    dom.heatmapSummaryTableContainer.classList.remove('hidden');
    renderHorizontalComparisonTable(projectAnalysisData);
    dom.heatmapHorizontalComparisonTableContainer.classList.remove('hidden');
}

function renderHeatmapSummaryTable(summary) { if (!summary || summary.transactionCount === 0) { dom.heatmapSummaryTableContainer.innerHTML = ''; return; } const { totalBaselineHousePrice, totalPricePremiumValue, totalSoldArea } = summary; const premiumPercentage = (totalPricePremiumValue / totalBaselineHousePrice) * 100; const avgPriceAdjustment = totalPricePremiumValue / totalSoldArea; const formatValue = (value, unit = '', decimals = 2) => { const num = formatNumber(value, decimals); return value > 0 ? `<span class="summary-value-positive">+${num} ${unit}</span>` : `<span class="summary-value-negative">${num} ${unit}</span>`; }; const tableHtml = ` <h3 class="report-section-title mt-8">調價幅度統計摘要 (排除店舖)</h3> <div class="overflow-x-auto"> <table class="min-w-full summary-table"> <thead> <tr> <th>基準房屋總價</th> <th>調價幅度總額</th> <th>總溢價率</th> <th>已售房屋坪數</th> <th>平均單價調價</th> </tr> </thead> <tbody> <tr> <td>${formatNumber(totalBaselineHousePrice, 0)} 萬</td> <td>${formatValue(totalPricePremiumValue, '萬', 0)}</td> <td>${formatValue(premiumPercentage, '%')}</td> <td>${formatNumber(totalSoldArea)} 坪</td> <td>${formatValue(avgPriceAdjustment, '萬/坪')}</td> </tr> </tbody> </table> </div> `; dom.heatmapSummaryTableContainer.innerHTML = tableHtml; }
function renderHorizontalComparisonTable(projectData) { if (!projectData || !projectData.horizontalComparison || projectData.horizontalComparison.length === 0) { dom.heatmapHorizontalComparisonTableContainer.innerHTML = ''; return; } const { horizontalComparison, refFloorForComparison } = projectData; const formatValue = (value, unit = '', decimals = 2, addSign = false) => { if (typeof value !== 'number' || isNaN(value)) return '-'; const num = formatNumber(value, decimals); if (addSign) { return value > 0 ? `<span class="summary-value-positive">+${num} ${unit}</span>` : value < 0 ? `<span class="summary-value-negative">${num} ${unit}</span>` : `<span>${num} ${unit}</span>`; } return (unit === '%') ? num + unit : num + ' ' + unit; }; const tableHtml = ` <h3 class="report-section-title mt-8">戶型水平價差與溢價貢獻 (基準樓層: F${refFloorForComparison || 'N/A'})</h3> <p class="text-sm text-gray-500 mt-2 mb-4">* 水平價差是將各戶型基準價換算至共同基準樓層後的價差，以最低價戶型為 0 基準。</p> <div class="overflow-x-auto"> <table class="min-w-full summary-table"> <thead> <tr> <th>戶型</th> <th>基準戶 (樓/價)</th> <th>水平價差(萬/坪)</th> <th>去化戶數</th> <th>溢價貢獻</th> <th>貢獻佔比</th> <th>基準房屋總價</th> <th>平均單價調價</th> </tr> </thead> <tbody> ${horizontalComparison.map(item => ` <tr> <td>${item.unitType}</td> <td>${item.anchorInfo}</td> <td>${formatValue(item.horizontalPriceDiff, '萬/坪', 2, true)}</td> <td>${item.unitsSold.toLocaleString()} 戶</td> <td>${formatValue(item.timePremiumContribution, '萬', 0, true)}</td> <td>${formatValue(item.contributionPercentage, '%')}</td> <td>${formatNumber(item.baselineHousePrice, 0)} 萬</td> <td>${formatValue(item.avgPriceAdjustment, '萬/坪', 2, true)}</td> </tr> `).join('')} </tbody> </table> </div> `; dom.heatmapHorizontalComparisonTableContainer.innerHTML = tableHtml; }

async function handleShareClick(reportType) {
    const btnIdMapping = { 'price_grid': 'sharePriceGridBtn' };
    const btnId = btnIdMapping[reportType];
    const btn = dom[btnId];
    if (!btn) { console.error(`分享按鈕 "${btnId}" 未在 dom 物件中定義。`); return; }
    btn.disabled = true;
    btn.innerHTML = `<div class="loader-sm"></div>`;
    try {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw new Error(`認證刷新失敗: ${refreshError.message}`);
        if (!session) throw new Error('認證刷新後無法取得 Session，請重新登入');
        const headers = await getAuthHeaders();
        if (!headers) throw new Error("認證失敗，無法取得認證標頭");
        const filters = getFilters();
        const viewOptions = {};
        if (isHeatmapActive) {
            const floorPremium = parseFloat(dom.floorPremiumInput.value);
            if (typeof floorPremium === 'number' && !isNaN(floorPremium)) { viewOptions.floorPremium = floorPremium; }
        }
        const payload = {
            report_type: reportType,
            filters: filters,
            date_config: {},
            view_mode: isHeatmapActive ? 'heatmap' : 'standard',
            view_options: viewOptions
        };
        const dateRangeValue = dom.dateRangeSelect.value;
        if (dateRangeValue === 'custom') {
            payload.date_config = { type: 'absolute', start: dom.dateStartInput.value, end: dom.dateEndInput.value };
        } else {
            payload.date_config = { type: 'relative', value: dateRangeValue };
        }
        const response = await fetch(API_ENDPOINTS.GENERATE_SHARE_LINK, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: '產生分享連結失敗，伺服器未提供詳細資訊' }));
            throw new Error(err.error);
        }
        const result = await response.json();
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

function copyShareUrl() {
    dom.shareUrlInput.select();
    document.execCommand('copy');
    dom.copyFeedback.classList.remove('hidden');
    setTimeout(() => { dom.copyFeedback.classList.add('hidden'); }, 2000);
}

function initialize() {
    if (!dom.countySelect) {
        console.error("錯誤：無法找到縣市選單元素(ID='county')。請檢查 HTML 的 ID 是否正確。");
        showMessage("系統初始化失敗：找不到縣市選單。", true);
        return;
    }
    checkAuthOnLoad();
    try {
        const countyNames = Object.keys(districtData);
        if (countyNames.length === 0) {
            console.error("錯誤：districtData 物件為空，沒有縣市資料可以填入。");
            return;
        }
        countyNames.forEach(name => {
            dom.countySelect.add(new Option(name, name));
        });
    } catch (error) {
        console.error("填入縣市資料時發生錯誤:", error);
        showMessage("系統初始化失敗：載入縣市資料時出錯。", true);
        return;
    }
    
    dom.rankingPaginationControls.id = 'ranking-pagination-controls';
    dom.rankingPaginationControls.className = 'flex justify-between items-center mt-4 text-sm text-gray-400';
    dom.rankingReportContent.querySelector('.overflow-x-auto').insertAdjacentElement('afterend', dom.rankingPaginationControls);

    dom.searchBtn.addEventListener('click', () => { currentPage = 1; fetchData(); });
    dom.analyzeBtn.addEventListener('click', analyzeData);
    dom.countySelect.addEventListener('change', updateDistrictOptions);
    dom.districtContainer.addEventListener('click', onDistrictContainerClick);
    dom.districtSuggestions.addEventListener('click', onDistrictSuggestionClick);
    dom.clearDistrictsBtn.addEventListener('click', clearSelectedDistricts);
    dom.typeSelect.addEventListener('change', toggleAnalyzeButtonState);
    dom.dateRangeSelect.addEventListener('change', handleDateRangeChange);
    dom.dateStartInput.addEventListener('input', () => { if (document.activeElement === dom.dateStartInput) dom.dateRangeSelect.value = 'custom'; });
    dom.dateEndInput.addEventListener('input', () => { if (document.activeElement === dom.dateEndInput) dom.dateRangeSelect.value = 'custom'; });
    dom.setTodayBtn.addEventListener('click', () => {
        dom.dateEndInput.value = formatDate(new Date());
        dom.dateRangeSelect.value = 'custom';
    });
    dom.modalCloseBtn.addEventListener('click', () => dom.modal.classList.add('hidden'));
    dom.resultsTable.addEventListener('click', e => { if (e.target.closest('.details-btn')) showSubTableDetails(e.target.closest('.details-btn')); });
    
    dom.projectNameInput.addEventListener('focus', onProjectInputFocus);
    dom.projectNameInput.addEventListener('input', onProjectInput);

    dom.projectNameSuggestions.addEventListener('click', onSuggestionClick);
    dom.projectNameContainer.addEventListener('click', e => { if (e.target.classList.contains('multi-tag-remove')) removeProject(e.target.dataset.name); });
    
    document.addEventListener('click', e => {
        const isClickInsideProject = dom.projectFilterWrapper.contains(e.target);
        if (!isClickInsideProject) {
            dom.projectNameSuggestions.classList.add('hidden');
            dom.projectNameInput.value = '';
        }
        const isClickInsideDistrict = dom.districtFilterWrapper.contains(e.target);
        if (!isClickInsideDistrict) dom.districtSuggestions.classList.add('hidden');
        if (!isClickInsideDistrict && !isClickInsideProject) dom.filterCard.classList.remove('z-elevate-filters');
        const isClickInsideHeatmap = dom.horizontalPriceGridContainer.contains(e.target) || dom.heatmapLegendContainer.contains(e.target);
        if (currentLegendFilter.type && !isClickInsideHeatmap) {
            dom.heatmapLegendContainer.querySelectorAll('.legend-item.active').forEach(item => item.classList.remove('active'));
            currentLegendFilter = { type: null, value: null };
            applyHeatmapGridFilter();
        }
    });

    dom.clearProjectsBtn.addEventListener('click', clearSelectedProjects);
    dom.tabsContainer.addEventListener('click', e => { if (e.target.matches('.tab-button')) switchTab(e.target.dataset.tab); });
    dom.rankingTable.addEventListener('click', e => { 
        const header = e.target.closest('.sortable-th'); 
        if (!header) return; 
        const sortKey = header.dataset.sortKey; 
        if (currentSort.key === sortKey) { 
            currentSort.order = currentSort.order === 'desc' ? 'asc' : 'desc'; 
        } else { 
            currentSort.key = sortKey; 
            currentSort.order = 'desc'; 
        } 
        rankingCurrentPage = 1;
        renderRankingReport(); 
    });
    dom.avgTypeToggle.addEventListener('click', (e) => { if (e.target.matches('.avg-type-btn')) { const type = e.target.dataset.type; switchAverageType(type); } });
    dom.velocityRoomFilterContainer.addEventListener('click', handleVelocityRoomFilterClick);
    dom.velocitySubTabsContainer.addEventListener('click', handleVelocitySubTabClick);
    dom.priceGridProjectFilterContainer.addEventListener('click', handlePriceGridProjectFilterClick);
    dom.analyzeHeatmapBtn.addEventListener('click', analyzeHeatmap);
    dom.backToGridBtn.addEventListener('click', handleBackToGrid);
    dom.heatmapLegendContainer.addEventListener('click', handleLegendClick);
    dom.sharePriceGridBtn.addEventListener('click', () => handleShareClick('price_grid'));
    dom.shareModalCloseBtn.addEventListener('click', () => dom.shareModal.classList.add('hidden'));
    dom.copyShareUrlBtn.addEventListener('click', copyShareUrl);
    
    dom.heatmapIntervalInput.addEventListener('change', renderAreaHeatmap);
    dom.heatmapIntervalIncrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 0.5;
        const max = parseFloat(input.max) || 5.0;
        let newValue = (parseFloat(input.value) || 0) + step;
        if (newValue > max) newValue = max;
        input.value = newValue.toFixed(1);
        renderAreaHeatmap();
    });
    dom.heatmapIntervalDecrementBtn.addEventListener('click', () => {
        const input = dom.heatmapIntervalInput;
        const step = parseFloat(input.step) || 0.5;
        const min = parseFloat(input.min) || 0.5;
        let newValue = (parseFloat(input.value) || 0) - step;
        if (newValue < min) newValue = min;
        input.value = newValue.toFixed(1);
        renderAreaHeatmap();
    });

    handleDateRangeChange();
    toggleAnalyzeButtonState();
}

async function analyzeHeatmap() {
    isHeatmapActive = true;
    const btn = dom.analyzeHeatmapBtn;
    btn.disabled = true;
    btn.innerHTML = `<div class="loader-sm"></div><span class="ml-2">分析中...</span>`;
    btn.classList.add('btn-loading');
    try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const floorPremium = parseFloat(dom.floorPremiumInput.value);
        const payload = { filters: { ...getFilters(), floorPremium: (typeof floorPremium === 'number' && floorPremium >= 0) ? floorPremium : 0.3 } };
        
        if (!analysisDataCache || !analysisDataCache.priceGridAnalysis) {
             console.log("No analysis cache found. Fetching new data for heatmap...");
             await analyzeData(); 
             if (!analysisDataCache) { 
                 throw new Error("無法獲取基礎分析資料，請先執行標準分析。");
             }
        }
        
        renderPriceGapHeatmap(); 
        
        dom.heatmapInfoContainer.classList.remove('hidden');
        btn.innerHTML = `<i class="fas fa-sync-alt mr-2"></i>重新分析`;
        dom.backToGridBtn.classList.remove('hidden');
    } catch (error) {
        console.error("熱力圖分析失敗:", error);
        showMessage(`熱力圖分析失敗: ${error.message}`, true);
        isHeatmapActive = false;
        dom.heatmapInfoContainer.classList.add('hidden');
        dom.heatmapSummaryTableContainer.classList.add('hidden');
        dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');
        btn.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>分析失敗`;
    } finally {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
    }
}

function handleBackToGrid() {
    isHeatmapActive = false;
    displayCurrentPriceGrid();
    dom.backToGridBtn.classList.add('hidden');
    dom.heatmapInfoContainer.classList.add('hidden');
    dom.heatmapSummaryTableContainer.classList.add('hidden');
    dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');
    dom.analyzeHeatmapBtn.innerHTML = `<i class="fas fa-fire mr-2"></i>開始分析`;
}

function switchAverageType(type) {
    if (currentAverageType === type || !type) return;
    currentAverageType = type;
    dom.avgTypeToggle.querySelector('.avg-type-btn.active').classList.remove('active');
    dom.avgTypeToggle.querySelector(`.avg-type-btn[data-type="${type}"]`).classList.add('active');
    if (analysisDataCache) { renderUnitPriceReport(); }
}

function switchTab(targetTab) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    const contentEl = document.getElementById(`${targetTab}-content`);
    const buttonEl = document.querySelector(`button[data-tab="${targetTab}"]`);
    if(contentEl) contentEl.classList.add('active');
    if(buttonEl) buttonEl.classList.add('active');

    if (targetTab === 'velocity-report' && analysisDataCache) {
        renderAreaHeatmap();
    }
}

function showLoading(message) {
    dom.messageArea.innerHTML = `<div class="loader mx-auto"></div><p class="mt-4">${message}</p>`;
    dom.messageArea.classList.remove('hidden');
    dom.tabsContainer.classList.add('hidden');
    document.querySelectorAll('.report-header').forEach(el => el.style.display = 'none');
    ['ranking-report-content', 'price-band-report-content', 'unit-price-report-content', 'parking-report-content', 'velocity-report-content', 'price-grid-report-content', 'data-list-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
}

function showMessage(message, isError = false) {
    const messageClass = isError ? 'bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg' : '';
    dom.messageArea.innerHTML = `<div class="${messageClass}">${message}</div>`;
    dom.messageArea.classList.remove('hidden');
    dom.tabsContainer.classList.add('hidden');
    document.querySelectorAll('.report-header').forEach(el => el.style.display = 'none');
}

function formatDate(date) { return date.toISOString().split('T')[0]; }

function handleDateRangeChange() {
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
    dom.dateStartInput.value = formatDate(startDate);
    dom.dateEndInput.value = formatDate(endDate);
}

async function analyzeData() {
    if (!dom.countySelect.value) return showMessage('請先選擇一個縣市再進行分析。');
    showLoading('分析中，請稍候...');
    try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const response = await fetch(API_ENDPOINTS.RANKING_ANALYSIS, { method: 'POST', headers: headers, body: JSON.stringify({ filters: getFilters() }) });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: `分析請求失敗: ${response.status}` }));
            throw new Error(err.error);
        }
        analysisDataCache = await response.json();
        if (!analysisDataCache.coreMetrics || analysisDataCache.projectRanking.length === 0) {
            const msg = analysisDataCache.message || '找不到符合條件的分析資料。';
            showMessage(msg);
            return;
        }
        dom.messageArea.classList.add('hidden');
        dom.tabsContainer.classList.remove('hidden');
        document.querySelectorAll('.report-header').forEach(el => { el.style.display = 'block'; });
        currentSort = { key: 'saleAmountSum', order: 'desc' };
        rankingCurrentPage = 1;
        renderRankingReport();
        renderPriceBandReport();
        renderUnitPriceReport();
        renderParkingAnalysisReport();
        renderSalesVelocityReport();
        renderPriceGridAnalysis();
        switchTab('ranking-report');
    } catch(error) {
        console.error("數據分析失敗:", error);
        showMessage(`數據分析失敗: ${error.message}`, true);
        analysisDataCache = null;
    }
}

async function fetchData() {
    showLoading('查詢中，請稍候...');
    try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const response = await fetch(API_ENDPOINTS.QUERY_DATA, { method: 'POST', headers: headers, body: JSON.stringify({ filters: getFilters(), pagination: { page: currentPage, limit: pageSize } }) });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: '無法解析伺服器回應' }));
            throw new Error(err.error);
        }
        const result = await response.json();
        totalRecords = result.count || 0;
        if (!result.data || result.data.length === 0) {
            showMessage('找不到符合條件的資料。');
            renderPagination();
            return;
        }
        renderTable(result.data);
        renderPagination();
        dom.messageArea.classList.add('hidden');
        dom.tabsContainer.classList.remove('hidden');
        switchTab('data-list');
    } catch (error) {
        console.error('查詢錯誤:', error);
        showMessage(`查詢錯誤: ${error.message}`, true);
        totalRecords = 0;
        renderPagination();
    }
}

function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    return num.toLocaleString('zh-TW', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function renderRankingReport() {
    if (!analysisDataCache || !analysisDataCache.coreMetrics) return;
    
    const { coreMetrics, projectRanking } = analysisDataCache;
    
    dom.metricCardsContainer.innerHTML = `<div class="metric-card"><div class="metric-card-title">市場去化總銷售金額</div><div><span class="metric-card-value">${formatNumber(coreMetrics.totalSaleAmount, 0)}</span><span class="metric-card-unit">萬</span></div></div><div class="metric-card"><div class="metric-card-title">總銷去化房屋坪數</div><div><span class="metric-card-value">${formatNumber(coreMetrics.totalHouseArea, 2)}</span><span class="metric-card-unit">坪</span></div></div><div class="metric-card"><div class="metric-card-title">總平均單價</div><div><span class="metric-card-value">${formatNumber(coreMetrics.overallAveragePrice, 2)}</span><span class="metric-card-unit">萬/坪</span></div></div><div class="metric-card"><div class="metric-card-title">總交易筆數</div><div><span class="metric-card-value">${coreMetrics.transactionCount.toLocaleString()}</span><span class="metric-card-unit">筆</span></div></div>`;
    
    projectRanking.sort((a, b) => {
        const valA = a[currentSort.key];
        const valB = b[currentSort.key];
        return currentSort.order === 'desc' ? valB - valA : valA - valB;
    });

    const pagedData = projectRanking.slice((rankingCurrentPage - 1) * rankingPageSize, rankingCurrentPage * rankingPageSize);
    
    const tableHeaders = [{ key: 'rank', label: '排名', sortable: false },{ key: 'projectName', label: '建案名稱', sortable: false },{ key: 'saleAmountSum', label: '交易總價(萬)', sortable: true },{ key: 'houseAreaSum', label: '房屋面積(坪)', sortable: true },{ key: 'transactionCount', label: '資料筆數', sortable: true },{ key: 'marketShare', label: '市場佔比(%)', sortable: true },{ key: 'averagePrice', label: '平均單價(萬)', sortable: true },{ key: 'minPrice', label: '最低單價(萬)', sortable: true },{ key: 'maxPrice', label: '最高單價(萬)', sortable: true },{ key: 'medianPrice', label: '單價中位數(萬)', sortable: true },{ key: 'avgParkingPrice', label: '車位平均單價', sortable: true }];
    let headerHtml = '<thead><tr>';
    tableHeaders.forEach(h => { if (h.sortable) { const sortClass = currentSort.key === h.key ? currentSort.order : ''; headerHtml += `<th class="sortable-th ${sortClass}" data-sort-key="${h.key}">${h.label}<span class="sort-icon">▼</span></th>`; } else { headerHtml += `<th>${h.label}</th>`; } });
    headerHtml += '</tr></thead>';
    
    let bodyHtml = '<tbody>';
    pagedData.forEach((proj, index) => { 
        const rankNumber = (rankingCurrentPage - 1) * rankingPageSize + index + 1;
        bodyHtml += `<tr class="hover:bg-dark-card transition-colors"><td>${rankNumber}</td><td>${proj.projectName}</td><td>${formatNumber(proj.saleAmountSum, 0)}</td><td>${formatNumber(proj.houseAreaSum)}</td><td>${proj.transactionCount.toLocaleString()}</td><td>${formatNumber(proj.marketShare)}%</td><td>${formatNumber(proj.averagePrice)}</td><td>${formatNumber(proj.minPrice)}</td><td>${formatNumber(proj.maxPrice)}</td><td>${formatNumber(proj.medianPrice)}</td><td>${formatNumber(proj.avgParkingPrice, 0)}</td></tr>`; 
    });
    bodyHtml += '</tbody>';
    
    let footerHtml = `<tfoot class="bg-dark-card font-bold"><tr class="border-t-2 border-gray-600"><td colspan="2">總計</td><td>${formatNumber(coreMetrics.totalSaleAmount, 0)}</td><td>${formatNumber(coreMetrics.totalHouseArea)}</td><td>${coreMetrics.transactionCount.toLocaleString()}</td><td colspan="6"></td></tr></tfoot>`;
    
    dom.rankingTable.innerHTML = headerHtml + bodyHtml + footerHtml;

    renderRankingPagination(projectRanking.length);
}

function renderPriceBandReport() {
    if (!analysisDataCache || !analysisDataCache.priceBandAnalysis) return;
    const { priceBandAnalysis } = analysisDataCache;
    priceBandAnalysis.sort((a, b) => { if (a.rooms !== b.rooms) return a.rooms - b.rooms; return a.bathrooms - b.bathrooms; });
    const tableHeaders = ['房數', '衛浴數', '筆數', '平均房屋總價', '最低房屋總價', '1/4分位房屋總價', '中位數房屋總價', '3/4分位房屋總價', '最高房屋總價'];
    let headerHtml = '<thead><tr>' + tableHeaders.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
    let bodyHtml = '<tbody>';
    priceBandAnalysis.forEach(item => { bodyHtml += `<tr class="hover:bg-dark-card transition-colors"><td>${item.rooms}</td><td>${item.bathrooms}</td><td>${item.count.toLocaleString()}</td><td>${formatNumber(item.avgPrice, 0)}</td><td>${formatNumber(item.minPrice, 0)}</td><td>${formatNumber(item.q1Price, 0)}</td><td>${formatNumber(item.medianPrice, 0)}</td><td>${formatNumber(item.q3Price, 0)}</td><td>${formatNumber(item.maxPrice, 0)}</td></tr>`; });
    bodyHtml += '</tbody>';
    dom.priceBandTable.innerHTML = headerHtml + bodyHtml;
}

function renderUnitPriceReport() {
    if (!analysisDataCache || !analysisDataCache.unitPriceAnalysis) return;
    const { residentialStats, typeComparison } = analysisDataCache.unitPriceAnalysis;
    const statsContainer = dom.residentialStatsTableContainer;
    if (residentialStats && residentialStats.avgPrice) {
        const avgPriceToShow = residentialStats.avgPrice[currentAverageType];
        const minPriceTooltip = residentialStats.minPriceProject ? `建案: ${residentialStats.minPriceProject}\n戶型: ${residentialStats.minPriceUnit || '-'}\n樓層: ${residentialStats.minPriceFloor || '-'}` : '';
        const maxPriceTooltip = residentialStats.maxPriceProject ? `建案: ${residentialStats.maxPriceProject}\n戶型: ${residentialStats.maxPriceUnit || '-'}\n樓層: ${residentialStats.maxPriceFloor || '-'}` : '';
        statsContainer.innerHTML = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th class="w-1/2">統計項目</th><th class="w-1/2">房屋單價 (萬/坪)</th></tr></thead><tbody><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">平均單價</td><td>${formatNumber(avgPriceToShow)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">最低單價</td><td><span class="has-tooltip" data-tooltip="${minPriceTooltip}">${formatNumber(residentialStats.minPrice)}</span></td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">1/4分位數單價</td><td>${formatNumber(residentialStats.q1Price)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">中位數單價</td><td>${formatNumber(residentialStats.medianPrice)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">3/4分位數單價</td><td>${formatNumber(residentialStats.q3Price)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">最高單價</td><td><span class="has-tooltip" data-tooltip="${maxPriceTooltip}">${formatNumber(residentialStats.maxPrice)}</span></td></tr></tbody></table>`;
        dom.residentialStatsExtraInfo.innerHTML = `<p><span class="font-semibold text-cyan-400">最低房屋單價建案：</span>${residentialStats.minPriceProject || 'N/A'}</p><p><span class="font-semibold text-purple-400">最高房屋單價建案：</span>${residentialStats.maxPriceProject || 'N/A'}</p>`;
    } else {
        statsContainer.innerHTML = '<p class="text-gray-500">無符合條件的住宅交易資料可供分析。</p>';
        dom.residentialStatsExtraInfo.innerHTML = '';
    }
    const comparisonContainer = dom.typeComparisonTableContainer;
    if (typeComparison && typeComparison.length > 0) {
        let comparisonHtml = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>建案名稱</th><th>住宅均價(萬/坪)</th><th>店舖均價(萬/坪)</th><th>店舖對住宅倍數</th><th>事務所均價(萬/坪)</th><th>事務所對住宅倍數</th></tr></thead><tbody>`;
        typeComparison.forEach(item => {
            const residentialAvgToShow = (item.residentialAvg && typeof item.residentialAvg === 'object') ? item.residentialAvg[currentAverageType] : 0;
            const shopAvgToShow = (item.shopAvg && typeof item.shopAvg === 'object') ? item.shopAvg[currentAverageType] : 0;
            const officeAvgToShow = (item.officeAvg && typeof item.officeAvg === 'object') ? item.officeAvg[currentAverageType] : 0;
            comparisonHtml += `<tr class="hover:bg-dark-card"><td>${item.projectName}</td><td>${residentialAvgToShow > 0 ? formatNumber(residentialAvgToShow) : '-'}</td><td>${shopAvgToShow > 0 ? formatNumber(shopAvgToShow) : '-'}</td><td>${item.shopMultiple > 0 ? formatNumber(item.shopMultiple) + ' 倍' : '-'}</td><td>${officeAvgToShow > 0 ? formatNumber(officeAvgToShow) : '-'}</td><td>${item.officeMultiple > 0 ? formatNumber(item.officeMultiple) + ' 倍' : '-'}</td></tr>`;
        });
        comparisonHtml += `</tbody></table>`;
        comparisonContainer.innerHTML = comparisonHtml;
    } else {
        comparisonContainer.innerHTML = '<p class="text-gray-500">無符合條件的建案可進行類型比較。</p>';
    }
}

function renderParkingAnalysisReport() {
    if (!analysisDataCache || !analysisDataCache.parkingAnalysis) return;
    const { parkingRatio, avgPriceByType, rampPlanePriceByFloor } = analysisDataCache.parkingAnalysis;
    if (parkingRatio) {
        dom.parkingRatioTableContainer.innerHTML = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>配置類型</th><th>交易筆數</th><th>佔比(%)</th></tr></thead><tbody><tr class="hover:bg-dark-card"><td>有搭車位</td><td>${parkingRatio.withParking.count.toLocaleString()}</td><td>${formatNumber(parkingRatio.withParking.percentage, 2)}%</td></tr><tr class="hover:bg-dark-card"><td>沒搭車位</td><td>${parkingRatio.withoutParking.count.toLocaleString()}</td><td>${formatNumber(parkingRatio.withoutParking.percentage, 2)}%</td></tr></tbody></table>`;
    } else {
        dom.parkingRatioTableContainer.innerHTML = '<p class="text-gray-500">無車位配比資料可供分析。</p>';
    }
    if (avgPriceByType && avgPriceByType.length > 0) {
        let avgPriceHtml = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>車位類型</th><th>交易筆數</th><th>車位總數</th><th>平均單價(萬)</th><th>單價中位數(萬)</th><th>單價3/4位數(萬)</th></tr></thead><tbody>`;
        avgPriceByType.sort((a, b) => b.transactionCount - a.transactionCount).forEach(item => { avgPriceHtml += `<tr class="hover:bg-dark-card"><td>${item.type}</td><td>${item.transactionCount.toLocaleString()}</td><td>${item.count.toLocaleString()}</td><td>${formatNumber(item.avgPrice, 0)}</td><td>${formatNumber(item.medianPrice, 0)}</td><td>${formatNumber(item.q3Price, 0)}</td></tr>`; });
        avgPriceHtml += `</tbody></table>`;
        dom.avgPriceByTypeTableContainer.innerHTML = avgPriceHtml;
    } else {
        dom.avgPriceByTypeTableContainer.innerHTML = '<p class="text-gray-500">無含車位的交易資料可供分析。</p>';
    }
    if (rampPlanePriceByFloor && rampPlanePriceByFloor.some(item => item.count > 0)) {
        const floorMapping = {'B1': '地下一樓', 'B2': '地下二樓', 'B3': '地下三樓', 'B4': '地下四樓', 'B5_below': '地下五樓含以下'};
        let floorPriceHtml = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>樓層</th><th>筆數</th><th>均價(萬)</th><th>中位數(萬)</th><th>3/4位數(萬)</th><th>最高價(萬)</th><th>最低價(萬)</th></tr></thead><tbody>`;
        rampPlanePriceByFloor.forEach(item => {
            if (item && item.count > 0) {
                const maxPriceTooltip = item.maxPriceProject ? `建案: ${item.maxPriceProject}\n戶型: ${item.maxPriceUnit || '-'}\n樓層: ${item.maxPriceFloor || '-'}` : '';
                const minPriceTooltip = item.minPriceProject ? `建案: ${item.minPriceProject}\n戶型: ${item.minPriceUnit || '-'}\n樓層: ${item.minPriceFloor || '-'}` : '';
                floorPriceHtml += `<tr class="hover:bg-dark-card"><td>${floorMapping[item.floor] || item.floor}</td><td>${item.count.toLocaleString()}</td><td>${formatNumber(item.avgPrice, 0)}</td><td>${formatNumber(item.medianPrice, 0)}</td><td>${formatNumber(item.q3Price, 0)}</td><td><span class="has-tooltip" data-tooltip="${maxPriceTooltip}">${formatNumber(item.maxPrice, 0)}</span></td><td><span class="has-tooltip" data-tooltip="${minPriceTooltip}">${formatNumber(item.minPrice, 0)}</span></td></tr>`;
            }
        });
        floorPriceHtml += `</tbody></table>`;
        dom.rampPlanePriceByFloorTableContainer.innerHTML = floorPriceHtml;
    } else {
        dom.rampPlanePriceByFloorTableContainer.innerHTML = '<p class="text-gray-500">無符合條件的坡道平面車位交易資料可供分析。</p>';
    }
}

function renderAreaHeatmap() {
    if (areaHeatmapChart) {
        areaHeatmapChart.destroy();
        areaHeatmapChart = null;
    }
    if (!analysisDataCache || !analysisDataCache.areaDistributionAnalysis) {
        dom.areaHeatmapChart.innerHTML = '<p class="text-gray-500 p-4 text-center">無面積分佈資料可供分析。</p>';
        return;
    }

    const distributionData = analysisDataCache.areaDistributionAnalysis;
    const interval = parseFloat(dom.heatmapIntervalInput.value);

    let allAreas = [];
    selectedVelocityRooms.forEach(roomType => {
        if (distributionData[roomType]) {
            allAreas.push(...distributionData[roomType]);
        }
    });

    if (allAreas.length === 0 || isNaN(interval) || interval <= 0) {
        dom.areaHeatmapChart.innerHTML = '<p class="text-gray-500 p-4 text-center">選取的房型無面積資料，或級距設定無效。</p>';
        return;
    }
    
    const minArea = Math.floor(Math.min(...allAreas) / interval) * interval;
    const maxArea = Math.ceil(Math.max(...allAreas) / interval) * interval;

    const yAxisCategories = [];
    for (let i = minArea; i < maxArea; i += interval) {
        yAxisCategories.push(`${i.toFixed(1)}-${(i + interval).toFixed(1)}`);
    }
    const baseHeight = 200; 
    const heightPerCategory = 25;
    const dynamicHeight = baseHeight + (yAxisCategories.length * heightPerCategory);

    const seriesData = yAxisCategories.map(category => {
        const [lower, upper] = category.split('-').map(parseFloat);
        return {
            name: category,
            data: selectedVelocityRooms.map(roomType => {
                const roomData = distributionData[roomType] || [];
                return roomData.filter(area => area >= lower && area < upper).length;
            })
        };
    });

    const options = {
        series: seriesData,
        chart: {
            height: dynamicHeight, 
            type: 'heatmap',
            toolbar: { show: true, tools: { download: true } },
            foreColor: '#e5e7eb'
        },
        dataLabels: {
            enabled: true,
            style: { colors: ['#FFFFFF'] },
            formatter: (val) => val > 0 ? val : ''
        },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.7,
                radius: 4,
                useFillColorAsStroke: false, 
                colorScale: {
                    ranges: [{
                        from: 0, to: 0, color: '#252836', name: '0'
                    }, {
                        from: 1, to: 5, color: '#581c87', name: '1-5 戶' 
                    }, {
                        from: 6, to: 15, color: '#0c4a6e', name: '6-15 戶' 
                    }, {
                        from: 16, to: 30, color: '#06b6d4', name: '16-30 戶'
                    }, {
                        from: 31, to: 9999, color: '#f59e0b', name: '> 30 戶'
                    }]
                }
            }
        },
        xaxis: {
            type: 'category',
            categories: selectedVelocityRooms,
            labels: {
                rotate: 0,
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '12px',
                },
                formatter: (value) => {
                    if (typeof value === 'string' && value.includes('-')) {
                        const parts = value.split('-');
                        return `${parseFloat(parts[0]).toFixed(1)}-${parseFloat(parts[1]).toFixed(1)}`;
                    }
                    return value;
                }
            }
        },
        title: {
            text: '房型面積(坪)分佈熱力圖',
            align: 'center',
            style: { color: '#e5e7eb', fontSize: '16px' }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val, { seriesIndex, dataPointIndex, w }) => {
                    const roomType = w.globals.labels[dataPointIndex];
                    const totalInRoom = (distributionData[roomType] || []).length;
                    const percentage = totalInRoom > 0 ? (val / totalInRoom * 100).toFixed(1) : 0;
                    return `${val} 戶 (${percentage}%)`;
                }
            }
        },
        grid: {
            borderColor: '#374151'
        },
    };

    areaHeatmapChart = new ApexCharts(dom.areaHeatmapChart, options);
    areaHeatmapChart.render();
}

function renderSalesVelocityReport() {
    if (!analysisDataCache || !analysisDataCache.salesVelocityAnalysis) return;
    const { allRoomTypes } = analysisDataCache.salesVelocityAnalysis;
    if (allRoomTypes && allRoomTypes.length > 0) {
        selectedVelocityRooms = [...allRoomTypes];
        dom.velocityRoomFilterContainer.innerHTML = allRoomTypes.map(roomType => `<button class="capsule-btn active" data-room-type="${roomType}">${roomType}</button>`).join('');
    } else {
        dom.velocityRoomFilterContainer.innerHTML = '<p class="text-gray-500 text-sm">無可用房型</p>';
    }
    renderVelocityTable();
    renderAreaHeatmap();
}

function renderVelocityTable() {
    if (!analysisDataCache || !analysisDataCache.salesVelocityAnalysis) return;
    const dataForView = analysisDataCache.salesVelocityAnalysis[currentVelocityView] || {};
    const timeKeys = Object.keys(dataForView).sort().reverse();
    let headerHtml = '<thead><tr class="velocity-header-group"><th rowspan="2" class="sticky left-0 bg-dark-card z-10">時間</th>';
    selectedVelocityRooms.forEach(roomType => { headerHtml += `<th colspan="3" class="text-center">${roomType}</th>`; });
    headerHtml += `<th colspan="3" class="text-center total-col">總計</th></tr><tr class="velocity-header-sub">`;
    const subHeaders = ['資料筆數', '產權總價(萬)', '房屋坪數(坪)'];
    selectedVelocityRooms.forEach(() => { subHeaders.forEach(sub => headerHtml += `<th>${sub}</th>`); });
    subHeaders.forEach(sub => headerHtml += `<th class="total-col">${sub}</th>`);
    headerHtml += '</tr></thead>';
    let bodyHtml = '<tbody>';
    timeKeys.forEach(timeKey => {
        const periodData = dataForView[timeKey];
        let rowTotal = { count: 0, priceSum: 0, areaSum: 0 };
        let rowHtml = `<tr class="hover:bg-dark-card"><td class="sticky left-0 bg-dark-card hover:bg-gray-800 z-10 font-mono">${timeKey}</td>`;
        selectedVelocityRooms.forEach(roomType => {
            const stats = periodData[roomType];
            if (stats) {
                   rowHtml += `<td>${stats.count.toLocaleString()}</td><td>${formatNumber(stats.priceSum, 0)}</td><td>${formatNumber(stats.areaSum, 2)}</td>`;
                rowTotal.count += stats.count;
                rowTotal.priceSum += stats.priceSum;
                rowTotal.areaSum += stats.areaSum;
            } else {
                 rowHtml += `<td>-</td><td>-</td><td>-</td>`;
            }
        });
        rowHtml += `<td class="font-semibold total-col">${rowTotal.count.toLocaleString()}</td><td class="font-semibold total-col">${formatNumber(rowTotal.priceSum, 0)}</td><td class="font-semibold total-col">${formatNumber(rowTotal.areaSum, 2)}</td></tr>`;
        bodyHtml += rowHtml;
    });
    bodyHtml += '</tbody>';
    dom.velocityTableContainer.innerHTML = timeKeys.length > 0 ? `<table class="min-w-full velocity-table">${headerHtml}${bodyHtml}</table>` : '<p class="text-gray-500 p-4 text-center">在此條件下無資料。</p>';
}

function handleVelocityRoomFilterClick(e) {
    const button = e.target.closest('.capsule-btn'); if (!button) return;
    const roomType = button.dataset.roomType;
    button.classList.toggle('active');
    if (button.classList.contains('active')) {
        if (!selectedVelocityRooms.includes(roomType)) selectedVelocityRooms.push(roomType);
    } else {
        selectedVelocityRooms = selectedVelocityRooms.filter(r => r !== roomType);
    }
    const { allRoomTypes } = analysisDataCache.salesVelocityAnalysis;
    selectedVelocityRooms.sort((a, b) => allRoomTypes.indexOf(a) - allRoomTypes.indexOf(b));
    renderVelocityTable();
    renderAreaHeatmap(); 
}

function handleVelocitySubTabClick(e) {
    const button = e.target.closest('.sub-tab-btn');
    if (!button) return;
    currentVelocityView = button.dataset.view;
    dom.velocitySubTabsContainer.querySelector('.active').classList.remove('active');
    button.classList.add('active');
    renderVelocityTable();
    renderAreaHeatmap();
}

function syncMainProjectFilter(projectName) {
    if (!projectName) {
        selectedProjects = [];
    } else {
        selectedProjects = [projectName];
    }
    renderProjectTags();
    dom.projectNameSuggestions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const itemName = cb.closest('.suggestion-item').dataset.name;
        cb.checked = (itemName === projectName);
    });
}

function renderPriceGridAnalysis() {
    isHeatmapActive = false;
    dom.analyzeHeatmapBtn.innerHTML = `<i class="fas fa-fire mr-2"></i>開始分析`;
    dom.backToGridBtn.classList.add('hidden');
    dom.heatmapInfoContainer.classList.add('hidden');
    dom.heatmapSummaryTableContainer.classList.add('hidden');
    dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');

    const reportContent = dom.priceGridReportContent;
    if (!analysisDataCache || !analysisDataCache.priceGridAnalysis || !analysisDataCache.priceGridAnalysis.projectNames || analysisDataCache.priceGridAnalysis.projectNames.length === 0) {
        reportContent.querySelector('.my-4.p-4').classList.add('hidden');
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無垂直水平分析資料。</p>';
        return;
    }
    
    reportContent.querySelector('.my-4.p-4').classList.remove('hidden');
    const { projectNames } = analysisDataCache.priceGridAnalysis;

    if (projectNames && projectNames.length > 0) {
        selectedPriceGridProject = null;
        
        const filterHtml = projectNames.map(name => `<button class="capsule-btn" data-project="${name}">${name}</button>`).join('');
        dom.priceGridProjectFilterContainer.innerHTML = filterHtml;
        dom.priceGridProjectFilterContainer.parentElement.classList.remove('hidden');
        
        displayCurrentPriceGrid();
    } else {
        selectedPriceGridProject = null;
        dom.priceGridProjectFilterContainer.parentElement.classList.add('hidden');
        dom.unitColorLegendContainer.innerHTML = '';
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無特定建案資料可供分析。</p>';
    }
}

function displayCurrentPriceGrid() {
    if (!selectedPriceGridProject || !analysisDataCache || !analysisDataCache.priceGridAnalysis) {
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">請從上方選擇建案以查看銷控表。</p>';
        dom.unitColorLegendContainer.innerHTML = '';
        dom.analyzeHeatmapBtn.disabled = true;
        return;
    }
    
    const localAnalysisData = JSON.parse(JSON.stringify(analysisDataCache));
    const data = localAnalysisData.priceGridAnalysis.byProject[selectedPriceGridProject];
    
    if (!data) {
        dom.horizontalPriceGridContainer.innerHTML = `<p class="text-gray-500">找不到建案「${selectedPriceGridProject}」的分析資料。</p>`;
        dom.unitColorLegendContainer.innerHTML = '';
        dom.analyzeHeatmapBtn.disabled = true;
        return;
    }
    
    dom.analyzeHeatmapBtn.disabled = false;
    renderUnitColorLegend(data.unitColorMap);
    renderHorizontalPriceGrid(data.horizontalGrid, data.sortedFloors, data.sortedUnits, data.unitColorMap);
}

function handlePriceGridProjectFilterClick(e) {
    const button = e.target.closest('.capsule-btn');
    if (!button) return;
    
    if (button.classList.contains('active')) {
         return;
    }
    
    selectedPriceGridProject = button.dataset.project;
    syncMainProjectFilter(selectedPriceGridProject);

    if (dom.priceGridProjectFilterContainer.querySelector('.active')) {
        dom.priceGridProjectFilterContainer.querySelector('.active').classList.remove('active');
    }
    button.classList.add('active');
    
    isHeatmapActive = false;
    dom.analyzeHeatmapBtn.innerHTML = `<i class="fas fa-fire mr-2"></i>開始分析`;
    dom.backToGridBtn.classList.add('hidden');
    dom.heatmapInfoContainer.classList.add('hidden');
    dom.heatmapSummaryTableContainer.classList.add('hidden');
    dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');
    displayCurrentPriceGrid();
}

function renderUnitColorLegend(unitColorMap) {
    if (!unitColorMap || Object.keys(unitColorMap).length === 0) {
        dom.unitColorLegendContainer.innerHTML = ''; return;
    }
    let legendHtml = Object.entries(unitColorMap).map(([unit, color]) => `<div class="flex items-center"><span class="w-4 h-4 rounded-full mr-2" style="background-color: ${color};"></span><span>${unit}</span></div>`).join('');
    dom.unitColorLegendContainer.innerHTML = legendHtml;
}

function renderHorizontalPriceGrid(grid, floors, units, colorMap) {
    if (!grid || !floors || !units || floors.length === 0 || units.length === 0) {
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500">無水平價盤資料。</p>';
        return;
    }
    let tableHtml = '<table class="min-w-full divide-y divide-gray-800 border-collapse">';
    let headerHtml = '<thead><tr><th class="sticky left-0 bg-dark-card z-10 p-2">樓層 \\ 戶別</th>';
    units.forEach(unit => { headerHtml += `<th class="text-center p-2" style="background-color:${colorMap[unit] || '#4b5563'}80;">${unit}</th>`; });
    headerHtml += '</tr></thead>';
    let bodyHtml = '<tbody>';
    floors.forEach(floor => {
        bodyHtml += `<tr class="hover:bg-gray-800/50"><td class="font-bold sticky left-0 bg-dark-card z-10 p-2">${floor}</td>`;
        units.forEach(unit => {
            const cellData = grid[floor] ? grid[floor][unit] : null;
            if (cellData && cellData.length > 0) {
                const hasStorefront = cellData.some(tx => tx.isStorefront);
                const bgColor = hasStorefront ? 'rgba(107, 33, 168, 0.2)' : `${colorMap[unit] || '#374151'}40`;
                let cellContent = cellData.map(tx => {
                    const parkingIcon = tx.hasParking ? ` <i class="fas fa-parking parking-icon" title="含車位"></i>` : '';
                    const storefrontIcon = tx.isStorefront ? `<i class="fas fa-store" title="店舖類型"></i> ` : '';
                    const tooltipText = `交易總價: ${formatNumber(tx.tooltipInfo.totalPrice, 0)} 萬\n房屋總價: ${formatNumber(tx.tooltipInfo.housePrice, 0)} 萬\n車位總價: ${formatNumber(tx.tooltipInfo.parkingPrice, 0)} 萬\n房屋面積: ${formatNumber(tx.tooltipInfo.houseArea, 2)} 坪\n房間數: ${tx.tooltipInfo.rooms || '-'} 房`;
                    return `<div class="has-tooltip py-1" data-tooltip="${tooltipText}"><span>${storefrontIcon}${formatNumber(tx.unitPrice, 1)}萬</span>${parkingIcon}<br><span class="text-xs text-gray-400">(${tx.transactionDate})</span></div>`;
                }).join('');
                bodyHtml += `<td style="background-color: ${bgColor}; vertical-align: top; padding: 4px 8px; border-left: 1px solid #374151;"><div class="grid-cell-content">${cellContent}</div></td>`;
            } else {
                bodyHtml += `<td class="bg-dark-card/50" style="border-left: 1px solid #374151;">-</td>`;
            }
        });
        bodyHtml += `</tr>`;
    });
    bodyHtml += '</tbody>';
    tableHtml += headerHtml + bodyHtml + '</table>';
    dom.horizontalPriceGridContainer.innerHTML = tableHtml;
}

function renderTable(data) {
    if (!data || data.length === 0) {
        dom.resultsTable.innerHTML = '<tbody><tr><td colspan="99" class="text-center p-4">無資料</td></tr></tbody>';
        return;
    }
    const isPresale = data[0]['交易類型'] === '預售交易';
    const hiddenColumns = ['編號', '縣市代碼', '交易類型', '戶型'];
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    const actionTh = document.createElement('th');
    actionTh.textContent = '操作';
    headerRow.appendChild(actionTh);
    headers.forEach(header => {
        if (!hiddenColumns.includes(header)) {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
            if (isPresale && header === '戶別') {
                const newTh = document.createElement('th');
                newTh.textContent = '戶型';
                headerRow.appendChild(newTh);
            }
        }
    });
    const thead = document.createElement('thead');
    thead.appendChild(headerRow);
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-dark-card transition-colors';
        const remark = row['備註'] || '';
        if (remark.includes('露台') || remark.includes('親友') || remark.includes('員工')) {
            tr.classList.add('special-remark-row');
        }
        const actionTd = document.createElement('td');
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'details-btn bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded-md';
        detailsBtn.textContent = '附表';
        detailsBtn.dataset.id = row['編號'];
        detailsBtn.dataset.type = row['交易類型'];
        detailsBtn.dataset.county = row['縣市代碼'];
        actionTd.appendChild(detailsBtn);
        tr.appendChild(actionTd);
        headers.forEach(header => {
            if (!hiddenColumns.includes(header)) {
                const td = document.createElement('td');
                const value = row[header];
                if (header === '地址' || header === '備註') {
                    td.innerHTML = `<div class="scrollable-cell">${value ?? "-"}</div>`;
                } else {
                    td.textContent = (typeof value === 'number' && !Number.isInteger(value)) ? formatNumber(value) : (value ?? "-");
                }
                tr.appendChild(td);
                if (isPresale && header === '戶別') {
                    const unitTypeTd = document.createElement('td');
                    unitTypeTd.textContent = row['戶型'] || '-';
                    tr.appendChild(unitTypeTd);
                }
            }
        });
        tbody.appendChild(tr);
    });
    dom.resultsTable.innerHTML = '';
    dom.resultsTable.append(thead, tbody);
}

async function showSubTableDetails(btn) {
    const { id, type, county } = btn.dataset;
    dom.modalTitle.textContent = `附表詳細資料 (編號: ${id})`;
    dom.modalContent.innerHTML = '<div class="loader mx-auto"></div>';
    dom.modal.classList.remove('hidden');
    try {
        if (!id || !type || !county || county === 'undefined') {
            throw new Error(`前端參數不足，無法查詢附表。(縣市代碼: ${county})`);
        }
        const headers = await getAuthHeaders();
        if (!headers) throw new Error("認證失敗，請重新登入。");
        
        const response = await fetch(API_ENDPOINTS.SUB_DATA, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ id, type, county })
        });
        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ error: '無法從伺服器獲取附表資料' }));
            throw new Error(errorResult.error);
        }
        const result = await response.json();
        let contentHTML = '<div class="space-y-6">';
        if (type !== '預售交易' && result.build) contentHTML += renderSubTable('建物資料', result.build);
        if (result.land) contentHTML += renderSubTable('土地資料', result.land);
        if (result.park) contentHTML += renderSubTable('車位資料', result.park);
        contentHTML = (contentHTML === '<div class="space-y-6">') ? '<p>此筆紀錄沒有對應的附表資料。</p>' : contentHTML + '</div>';
        dom.modalContent.innerHTML = contentHTML;
    } catch (error) {
        dom.modalContent.innerHTML = `<p class="text-red-400 font-semibold">查詢失敗:</p><p class="mt-2 text-sm text-gray-400">${error.message}</p>`;
    }
}

function renderPagination() {
    createPaginationControls(dom.paginationControls, totalRecords, currentPage, pageSize, (page) => {
        currentPage = page;
        fetchData();
    });
}

function renderRankingPagination(totalItems) {
    createPaginationControls(dom.rankingPaginationControls, totalItems, rankingCurrentPage, rankingPageSize, (page) => {
        rankingCurrentPage = page;
        renderRankingReport();
    });
}

function createPaginationControls(container, totalItems, currentPage, pageSize, onPageChange) {
    container.innerHTML = '';
    if (totalItems === 0) {
        container.innerHTML = `<span>共 0 筆資料</span>`;
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    let paginationHtml = `<div class="flex-1">共 ${totalItems} 筆資料</div><div class="flex items-center space-x-1">`;
    
    paginationHtml += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;

    let startPage, endPage;
    if (totalPages <= 9) {
        startPage = 1;
        endPage = totalPages;
    } else {
        if (currentPage <= 5) {
            startPage = 1;
            endPage = 7;
        } else if (currentPage + 4 >= totalPages) {
            startPage = totalPages - 8;
            endPage = totalPages;
        } else {
            startPage = currentPage - 4;
            endPage = currentPage + 3;
        }
    }

    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHtml += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>&raquo;</button>`;
    paginationHtml += '</div>';
    
    container.innerHTML = paginationHtml;
    
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.currentTarget.dataset.page);
            if (!isNaN(page)) {
                onPageChange(page);
            }
        });
    });

    const style = document.createElement('style');
    style.textContent = `
        .pagination-btn { background-color: #374151; color: #d1d5db; font-weight: 500; border: none; padding: 0.5rem 0.75rem; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s; }
        .pagination-btn:hover:not(:disabled) { background-color: #06b6d4; color: white; }
        .pagination-btn.active { background-color: #06b6d4; color: white; cursor: default; }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination-ellipsis { color: #9ca3af; padding: 0.5rem 0.25rem; }
    `;
    document.head.appendChild(style);
}

function renderSubTable(title, records) {
    if (!records || !Array.isArray(records) || records.length === 0) {
        return `<div class="mb-4"><h3 class="text-lg font-semibold text-cyan-400 mb-2">${title}</h3><p class="text-sm text-gray-500">無資料</p></div>`;
    }
    const headers = Object.keys(records[0]).filter(h => h !== 'id' && h !== '編號');
    let html = `<div><h3 class="text-lg font-semibold text-cyan-400 mb-2">${title}</h3><div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead><tr class="border-b border-gray-600">`;
    headers.forEach(header => { html += `<th class="py-2 pr-2 font-medium text-gray-400">${header}</th>` });
    html += '</tr></thead><tbody>';
    records.forEach(record => {
        html += '<tr class="border-b border-gray-700 last:border-b-0">';
        headers.forEach(header => { html += `<td class="py-2 pr-2">${record[header] ?? "-"}</td>` });
        html += '</tr>'
    });
    html += '</tbody></table></div></div>';
    return html;
}

function updateDistrictOptions() {
    const selectedCounty = dom.countySelect.value;
    clearSelectedDistricts();
    dom.districtSuggestions.innerHTML = '';
    if (selectedCounty && districtData[selectedCounty]) {
        const districtNames = districtData[selectedCounty];
        const selectAllHtml = `<label class="suggestion-item font-bold text-cyan-400" data-name="all"><input type="checkbox" id="district-select-all"><span class="flex-grow">全選/全不選</span></label><hr class="border-gray-600 mx-2">`;
        const districtsHtml = districtNames.map(name => {
            const isChecked = selectedDistricts.includes(name);
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

function clearSelectedDistricts() {
    selectedDistricts = [];
    renderDistrictTags();
    dom.districtSuggestions.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function renderDistrictTags() {
    dom.districtContainer.querySelectorAll('.multi-tag').forEach(tag => tag.remove());
    dom.districtContainer.insertBefore(dom.districtInputArea, dom.districtContainer.firstChild);
    if (selectedDistricts.length > 0) {
        dom.districtInputArea.classList.add('hidden');
        selectedDistricts.forEach(name => {
            const tagElement = document.createElement('span');
            tagElement.className = 'multi-tag';
            tagElement.textContent = name;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'multi-tag-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.dataset.name = name;
            tagElement.appendChild(removeBtn);
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeDistrict(name);
            });
            dom.districtContainer.insertBefore(tagElement, dom.districtInputArea);
       });
    } else {
        dom.districtInputArea.classList.remove('hidden');
    }
    dom.clearDistrictsBtn.classList.toggle('hidden', selectedDistricts.length === 0);
}

function onDistrictContainerClick(e) {
    if (dom.districtContainer.classList.contains('disabled')) return;
    if (!e.target.classList.contains('multi-tag-remove')) {
        const isHidden = dom.districtSuggestions.classList.toggle('hidden');
        dom.filterCard.classList.toggle('z-elevate-filters', !isHidden);
    }
}

function onDistrictSuggestionClick(e) {
    const target = e.target.closest('.suggestion-item'); if (!target) return;
    const name = target.dataset.name;
    const checkbox = target.querySelector('input[type="checkbox"]'); if (!name || !checkbox) return;
    const allDistrictNames = districtData[dom.countySelect.value] || [];
    const selectAllCheckbox = document.getElementById('district-select-all');
    setTimeout(() => {
        const isChecked = checkbox.checked;
        if (name === 'all') {
            selectedDistricts = isChecked ? [...allDistrictNames] : [];
            dom.districtSuggestions.querySelectorAll('label:not([data-name="all"]) input[type="checkbox"]').forEach(cb => { cb.checked = isChecked; });
        } else {
            if (isChecked) {
              if (!selectedDistricts.includes(name)) selectedDistricts.push(name);
            } else {
                selectedDistricts = selectedDistricts.filter(d => d !== name);
            }
        }
        if (selectAllCheckbox) {
           selectAllCheckbox.checked = allDistrictNames.length > 0 && selectedDistricts.length === allDistrictNames.length;
        }
        renderDistrictTags();
    }, 0);
}

function removeDistrict(name) {
    selectedDistricts = selectedDistricts.filter(d => d !== name);
    renderDistrictTags();
    const checkbox = dom.districtSuggestions.querySelector(`label[data-name="${name}"] input`);
    if (checkbox) checkbox.checked = false;
    const selectAllCheckbox = document.getElementById('district-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

function onProjectInputFocus() {
    if (!dom.projectNameInput.value.trim() && dom.countySelect.value) {
        fetchProjectNameSuggestions('');
    }
}

function onProjectInput() {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = setTimeout(() => {
        fetchProjectNameSuggestions(dom.projectNameInput.value);
    }, 300);
}

async function fetchProjectNameSuggestions(query) {
    const county = dom.countySelect.value;
    const countyCode = countyCodeMap[county];
    if (!countyCode) {
        dom.projectNameSuggestions.classList.add('hidden');
        dom.filterCard.classList.remove('z-elevate-filters');
        return;
    }
    try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        dom.filterCard.classList.add('z-elevate-filters');
        const processedQuery = query.trim().split(/\s+/).join('%');
        const payload = { countyCode, query: processedQuery, districts: selectedDistricts };
        const response = await fetch(API_ENDPOINTS.PROJECT_NAMES, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`伺服器錯誤: ${response.status}`);
        const names = await response.json();
        renderSuggestions(names);
    } catch (error) {
        console.error("獲取建案建議失敗:", error);
        dom.projectNameSuggestions.innerHTML = `<div class="p-2 text-red-400">讀取建議失敗。</div>`;
        dom.projectNameSuggestions.classList.remove('hidden');
    }
}

function renderSuggestions(names) {
    if (names.length === 0) {
        dom.projectNameSuggestions.innerHTML = `<div class="p-2 text-gray-500">${dom.projectNameInput.value ? '無相符建案' : '此區域無預售建案資料'}</div>`;
    } else {
        dom.projectNameSuggestions.innerHTML = names.map(name => {
            const isChecked = selectedProjects.includes(name);
            return `<label class="suggestion-item" data-name="${name}"><input type="checkbox" ${isChecked ? 'checked' : ''}><span class="flex-grow">${name}</span></label>`
        }).join('');
    }
    dom.projectNameSuggestions.classList.remove('hidden');
}

function onSuggestionClick(e) {
    const target = e.target.closest('.suggestion-item'); if (!target) return;
    const name = target.dataset.name;
    const checkbox = target.querySelector('input[type="checkbox"]'); if (!name || !checkbox) return;
    setTimeout(() => {
        if (checkbox.checked) {
            if (!selectedProjects.includes(name)) { selectedProjects.push(name); }
        } else {
            selectedProjects = selectedProjects.filter(p => p !== name);
        }
        renderProjectTags();
    }, 0);
}

function removeProject(name) {
    selectedProjects = selectedProjects.filter(p => p !== name);
    renderProjectTags();
    const openSuggestionCheckbox = dom.projectNameSuggestions.querySelector(`label[data-name="${name}"] input`);
    if (openSuggestionCheckbox) openSuggestionCheckbox.checked = false;
}

function renderProjectTags() {
    dom.projectNameContainer.querySelectorAll('.multi-tag').forEach(tag => tag.remove());
    dom.projectNameContainer.insertBefore(dom.projectNameInput, dom.projectNameContainer.firstChild);
    selectedProjects.forEach(name => {
        const tagElement = document.createElement('span');
        tagElement.className = 'multi-tag';
        tagElement.textContent = name;
        const removeBtn = document.createElement('span');
        removeBtn.className = 'multi-tag-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.dataset.name = name;
        tagElement.appendChild(removeBtn);
        dom.projectNameContainer.insertBefore(tagElement, dom.projectNameInput);
    });
    dom.clearProjectsBtn.classList.toggle('hidden', selectedProjects.length === 0);
}

function clearSelectedProjects() {
    selectedProjects = [];
    renderProjectTags();
    const suggestionCheckboxes = dom.projectNameSuggestions.querySelectorAll('input[type="checkbox"]');
    suggestionCheckboxes.forEach(cb => cb.checked = false);
}

function toggleAnalyzeButtonState() {
    const isCountySelected = !!dom.countySelect.value;
    const isValidType = dom.typeSelect.value === '預售交易';
    dom.analyzeBtn.disabled = !(isCountySelected && isValidType);
    dom.analyzeHeatmapBtn.disabled = !(isCountySelected && isValidType);
}

// 啟動應用程式
initialize();
