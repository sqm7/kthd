// js/modules/renderers/reports.js

import { dom } from '../dom.js';
import { state } from '../state.js';
import * as ui from '../ui.js';
import { renderRankingPagination } from './uiComponents.js';
import { renderVelocityTable } from './tables.js';
import { renderAreaHeatmap, renderSalesVelocityChart, renderPriceBandChart, renderRankingChart } from './charts.js';
import { displayCurrentPriceGrid } from './heatmap.js';


export function renderRankingReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.coreMetrics) return;
    
    const { coreMetrics, projectRanking } = state.analysisDataCache;
    
    dom.metricCardsContainer.innerHTML = `<div class="metric-card"><div class="metric-card-title">市場去化總銷售金額</div><div><span class="metric-card-value">${ui.formatNumber(coreMetrics.totalSaleAmount, 0)}</span><span class="metric-card-unit">萬</span></div></div><div class="metric-card"><div class="metric-card-title">總銷去化房屋坪數</div><div><span class="metric-card-value">${ui.formatNumber(coreMetrics.totalHouseArea, 2)}</span><span class="metric-card-unit">坪</span></div></div><div class="metric-card"><div class="metric-card-title">總平均單價</div><div><span class="metric-card-value">${ui.formatNumber(coreMetrics.overallAveragePrice, 2)}</span><span class="metric-card-unit">萬/坪</span></div></div><div class="metric-card"><div class="metric-card-title">總交易筆數</div><div><span class="metric-card-value">${coreMetrics.transactionCount.toLocaleString()}</span><span class="metric-card-unit">筆</span></div></div>`;
    
    // ▼▼▼ 【新增】呼叫新的圖表渲染函式 ▼▼▼
    renderRankingChart();
    // ▲▲▲ 【新增結束】 ▲▲▲

    projectRanking.sort((a, b) => {
        const valA = a[state.currentSort.key];
        const valB = b[state.currentSort.key];
        return state.currentSort.order === 'desc' ? valB - valA : valA - valB;
    });

    const pagedData = projectRanking.slice((state.rankingCurrentPage - 1) * state.rankingPageSize, state.rankingCurrentPage * state.rankingPageSize);
    
    const tableHeaders = [{ key: 'rank', label: '排名', sortable: false },{ key: 'projectName', label: '建案名稱', sortable: false },{ key: 'saleAmountSum', label: '交易總價(萬)', sortable: true },{ key: 'houseAreaSum', label: '房屋面積(坪)', sortable: true },{ key: 'transactionCount', label: '資料筆數', sortable: true },{ key: 'marketShare', label: '市場佔比(%)', sortable: true },{ key: 'averagePrice', label: '平均單價(萬)', sortable: true },{ key: 'minPrice', label: '最低單價(萬)', sortable: true },{ key: 'maxPrice', label: '最高單價(萬)', sortable: true },{ key: 'medianPrice', label: '單價中位數(萬)', sortable: true },{ key: 'avgParkingPrice', label: '車位平均單價', sortable: true }];
    let headerHtml = '<thead><tr>';
    tableHeaders.forEach(h => { if (h.sortable) { const sortClass = state.currentSort.key === h.key ? state.currentSort.order : ''; headerHtml += `<th class="sortable-th ${sortClass}" data-sort-key="${h.key}">${h.label}<span class="sort-icon">▼</span></th>`; } else { headerHtml += `<th>${h.label}</th>`; } });
    headerHtml += '</tr></thead>';
    
    let bodyHtml = '<tbody>';
    pagedData.forEach((proj, index) => { 
        const rankNumber = (state.rankingCurrentPage - 1) * state.rankingPageSize + index + 1;
        bodyHtml += `<tr class="hover:bg-dark-card transition-colors"><td>${rankNumber}</td><td>${proj.projectName}</td><td>${ui.formatNumber(proj.saleAmountSum, 0)}</td><td>${ui.formatNumber(proj.houseAreaSum)}</td><td>${proj.transactionCount.toLocaleString()}</td><td>${ui.formatNumber(proj.marketShare)}%</td><td>${ui.formatNumber(proj.averagePrice)}</td><td>${ui.formatNumber(proj.minPrice)}</td><td>${ui.formatNumber(proj.maxPrice)}</td><td>${ui.formatNumber(proj.medianPrice)}</td><td>${ui.formatNumber(proj.avgParkingPrice, 0)}</td></tr>`; 
    });
    bodyHtml += '</tbody>';
    
    let footerHtml = `<tfoot class="bg-dark-card font-bold"><tr class="border-t-2 border-gray-600"><td colspan="2">總計</td><td>${ui.formatNumber(coreMetrics.totalSaleAmount, 0)}</td><td>${ui.formatNumber(coreMetrics.totalHouseArea)}</td><td>${coreMetrics.transactionCount.toLocaleString()}</td><td colspan="6"></td></tr></tfoot>`;
    
    dom.rankingTable.innerHTML = headerHtml + bodyHtml + footerHtml;

    renderRankingPagination(projectRanking.length);
}

export function renderPriceBandReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.priceBandAnalysis) return;
    
    const { priceBandAnalysis } = state.analysisDataCache;

    const allRoomTypes = [...new Set(priceBandAnalysis.map(item => item.roomType))];
    
    const sortOrder = ['套房', '1房', '2房', '3房', '4房', '5房以上', '毛胚', '店舖', '辦公/事務所', '廠辦/工廠', '其他'];

    allRoomTypes.sort((a, b) => {
        const mapToNewCategory = (type) => {
            if (type === '工廠/倉庫') return '廠辦/工廠';
            if (type === '辦公') return '辦公/事務所';
            return type;
        };
        const sortKeyA = mapToNewCategory(a);
        const sortKeyB = mapToNewCategory(b);
        const indexA = sortOrder.indexOf(sortKeyA);
        const indexB = sortOrder.indexOf(sortKeyB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    if (state.selectedPriceBandRoomTypes.length === 0) {
        const defaultSelections = ['套房', '1房', '2房', '3房', '4房', '毛胚'];
        state.selectedPriceBandRoomTypes = allRoomTypes.filter(roomType => defaultSelections.includes(roomType));
    }

    dom.priceBandRoomFilterContainer.innerHTML = allRoomTypes.map(roomType => {
        const isActive = state.selectedPriceBandRoomTypes.includes(roomType);
        return `<button class="capsule-btn ${isActive ? 'active' : ''}" data-room-type="${roomType}">${roomType}</button>`;
    }).join('');

    const filteredDataForTable = priceBandAnalysis.filter(item => state.selectedPriceBandRoomTypes.includes(item.roomType));

    filteredDataForTable.sort((a, b) => { 
        const mapToNewCategory = (type) => {
            if (type === '工廠/倉庫') return '廠辦/工廠';
            if (type === '辦公') return '辦公/事務所';
            return type;
        };
        const sortKeyA = mapToNewCategory(a.roomType);
        const sortKeyB = mapToNewCategory(b.roomType);
        const indexA = sortOrder.indexOf(sortKeyA);
        const indexB = sortOrder.indexOf(sortKeyB);
        if (indexA !== indexB) return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        return (a.bathrooms || 0) - (b.bathrooms || 0);
    });
    
    const tableHeaders = ['房型', '衛浴', '筆數', '平均總價(萬)', '最低總價(萬)', '1/4位總價(萬)', '中位數總價(萬)', '3/4位總價(萬)', '最高總價(萬)'];

    let headerHtml = '<thead><tr>' + tableHeaders.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
    let bodyHtml = '<tbody>';

    if (filteredDataForTable.length > 0) {
        filteredDataForTable.forEach(item => { 
            bodyHtml += `<tr class="hover:bg-dark-card transition-colors"><td>${item.roomType}</td><td>${item.bathrooms !== null ? item.bathrooms : '-'}</td><td>${item.count.toLocaleString()}</td><td>${ui.formatNumber(item.avgPrice, 0)}</td><td>${ui.formatNumber(item.minPrice, 0)}</td><td>${ui.formatNumber(item.q1Price, 0)}</td><td>${ui.formatNumber(item.medianPrice, 0)}</td><td>${ui.formatNumber(item.q3Price, 0)}</td><td>${ui.formatNumber(item.maxPrice, 0)}</td></tr>`; 
        });
    } else {
        bodyHtml += `<tr><td colspan="${tableHeaders.length}" class="text-center p-4 text-gray-500">請至少選擇一個房型以顯示數據</td></tr>`;
    }

    bodyHtml += '</tbody>';
    dom.priceBandTable.innerHTML = headerHtml + bodyHtml;

    renderPriceBandChart();
}

export function renderUnitPriceReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.unitPriceAnalysis) return;
    const { residentialStats, typeComparison } = state.analysisDataCache.unitPriceAnalysis;
    const statsContainer = dom.residentialStatsTableContainer;
    if (residentialStats && residentialStats.avgPrice) {
        const avgPriceToShow = residentialStats.avgPrice[state.currentAverageType];
        const minPriceTooltip = residentialStats.minPriceProject ? `建案: ${residentialStats.minPriceProject}\n戶型: ${residentialStats.minPriceUnit || '-'}\n樓層: ${residentialStats.minPriceFloor || '-'}` : '';
        const maxPriceTooltip = residentialStats.maxPriceProject ? `建案: ${residentialStats.maxPriceProject}\n戶型: ${residentialStats.maxPriceUnit || '-'}\n樓層: ${residentialStats.maxPriceFloor || '-'}` : '';
        statsContainer.innerHTML = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th class="w-1/2">統計項目</th><th class="w-1/2">房屋單價 (萬/坪)</th></tr></thead><tbody><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">平均單價</td><td>${ui.formatNumber(avgPriceToShow)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">最低單價</td><td><span class="has-tooltip" data-tooltip="${minPriceTooltip}">${ui.formatNumber(residentialStats.minPrice)}</span></td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">1/4分位數單價</td><td>${ui.formatNumber(residentialStats.q1Price)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">中位數單價</td><td>${ui.formatNumber(residentialStats.medianPrice)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">3/4分位數單價</td><td>${ui.formatNumber(residentialStats.q3Price)}</td></tr><tr class="hover:bg-dark-card"><td class="font-medium text-gray-300">最高單價</td><td><span class="has-tooltip" data-tooltip="${maxPriceTooltip}">${ui.formatNumber(residentialStats.maxPrice)}</span></td></tr></tbody></table>`;
        dom.residentialStatsExtraInfo.innerHTML = `<p><span class="font-semibold text-cyan-400">最低房屋單價建案：</span>${residentialStats.minPriceProject || 'N/A'}</p><p><span class="font-semibold text-purple-400">最高房屋單價建案：</span>${residentialStats.maxPriceProject || 'N/A'}</p>`;
    } else {
        statsContainer.innerHTML = '<p class="text-gray-500">無符合條件的住宅交易資料可供分析。</p>';
        dom.residentialStatsExtraInfo.innerHTML = '';
    }
    const comparisonContainer = dom.typeComparisonTableContainer;
    if (typeComparison && typeComparison.length > 0) {
        let comparisonHtml = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>建案名稱</th><th>住宅均價(萬/坪)</th><th>店舖均價(萬/坪)</th><th>店舖對住宅倍數</th><th>事務所均價(萬/坪)</th><th>事務所對住宅倍數</th></tr></thead><tbody>`;
        typeComparison.forEach(item => {
            const residentialAvgToShow = (item.residentialAvg && typeof item.residentialAvg === 'object') ? item.residentialAvg[state.currentAverageType] : 0;
            const shopAvgToShow = (item.shopAvg && typeof item.shopAvg === 'object') ? item.shopAvg[state.currentAverageType] : 0;
            const officeAvgToShow = (item.officeAvg && typeof item.officeAvg === 'object') ? item.officeAvg[state.currentAverageType] : 0;
            comparisonHtml += `<tr class="hover:bg-dark-card"><td>${item.projectName}</td><td>${residentialAvgToShow > 0 ? ui.formatNumber(residentialAvgToShow) : '-'}</td><td>${shopAvgToShow > 0 ? ui.formatNumber(shopAvgToShow) : '-'}</td><td>${item.shopMultiple > 0 ? ui.formatNumber(item.shopMultiple) + ' 倍' : '-'}</td><td>${officeAvgToShow > 0 ? ui.formatNumber(officeAvgToShow) : '-'}</td><td>${item.officeMultiple > 0 ? ui.formatNumber(item.officeMultiple) + ' 倍' : '-'}</td></tr>`;
        });
        comparisonHtml += `</tbody></table>`;
        comparisonContainer.innerHTML = comparisonHtml;
    } else {
        comparisonContainer.innerHTML = '<p class="text-gray-500">無符合條件的建案可進行類型比較。</p>';
    }
}

export function renderParkingAnalysisReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.parkingAnalysis) return;
    const { parkingRatio, avgPriceByType, rampPlanePriceByFloor } = state.analysisDataCache.parkingAnalysis;
    if (parkingRatio) {
        dom.parkingRatioTableContainer.innerHTML = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>配置類型</th><th>交易筆數</th><th>佔比(%)</th></tr></thead><tbody><tr class="hover:bg-dark-card"><td>有搭車位</td><td>${parkingRatio.withParking.count.toLocaleString()}</td><td>${ui.formatNumber(parkingRatio.withParking.percentage, 2)}%</td></tr><tr class="hover:bg-dark-card"><td>沒搭車位</td><td>${parkingRatio.withoutParking.count.toLocaleString()}</td><td>${ui.formatNumber(parkingRatio.withoutParking.percentage, 2)}%</td></tr></tbody></table>`;
    } else {
        dom.parkingRatioTableContainer.innerHTML = '<p class="text-gray-500">無車位配比資料可供分析。</p>';
    }
    if (avgPriceByType && avgPriceByType.length > 0) {
        let avgPriceHtml = `<table class="min-w-full divide-y divide-gray-800"><thead><tr><th>車位類型</th><th>交易筆數</th><th>車位總數</th><th>平均單價(萬)</th><th>單價中位數(萬)</th><th>單價3/4位數(萬)</th></tr></thead><tbody>`;
        avgPriceByType.sort((a, b) => b.transactionCount - a.transactionCount).forEach(item => { avgPriceHtml += `<tr class="hover:bg-dark-card"><td>${item.type}</td><td>${item.transactionCount.toLocaleString()}</td><td>${item.count.toLocaleString()}</td><td>${ui.formatNumber(item.avgPrice, 0)}</td><td>${ui.formatNumber(item.medianPrice, 0)}</td><td>${ui.formatNumber(item.q3Price, 0)}</td></tr>`; });
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
                floorPriceHtml += `<tr class="hover:bg-dark-card"><td>${floorMapping[item.floor] || item.floor}</td><td>${item.count.toLocaleString()}</td><td>${ui.formatNumber(item.avgPrice, 0)}</td><td>${ui.formatNumber(item.medianPrice, 0)}</td><td>${ui.formatNumber(item.q3Price, 0)}</td><td><span class="has-tooltip" data-tooltip="${maxPriceTooltip}">${ui.formatNumber(item.maxPrice, 0)}</span></td><td><span class="has-tooltip" data-tooltip="${minPriceTooltip}">${ui.formatNumber(item.minPrice, 0)}</span></td></tr>`;
            }
        });
        floorPriceHtml += `</tbody></table>`;
        dom.rampPlanePriceByFloorTableContainer.innerHTML = floorPriceHtml;
    } else {
        dom.rampPlanePriceByFloorTableContainer.innerHTML = '<p class="text-gray-500">無符合條件的坡道平面車位交易資料可供分析。</p>';
    }
}

export function renderSalesVelocityReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.salesVelocityAnalysis) return;
    
    const { allRoomTypes } = state.analysisDataCache.salesVelocityAnalysis;

    if (allRoomTypes && allRoomTypes.length > 0) {
        const sortOrder = ['套房', '1房', '2房', '3房', '4房', '5房以上', '毛胚', '店舖', '辦公/事務所', '廠辦/工廠', '其他'];
        allRoomTypes.sort((a, b) => {
            const indexA = sortOrder.indexOf(a);
            const indexB = sortOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        const defaultSelections = ['1房', '2房', '3房'];
        state.selectedVelocityRooms = allRoomTypes.filter(roomType => defaultSelections.includes(roomType));
        if (state.selectedVelocityRooms.length === 0) {
             state.selectedVelocityRooms = [...allRoomTypes];
        }

        dom.velocityRoomFilterContainer.innerHTML = allRoomTypes.map(roomType => {
            const isActive = state.selectedVelocityRooms.includes(roomType);
            return `<button class="capsule-btn ${isActive ? 'active' : ''}" data-room-type="${roomType}">${roomType}</button>`;
        }).join('');
    } else {
        dom.velocityRoomFilterContainer.innerHTML = '<p class="text-gray-500 text-sm">無可用房型</p>';
    }
    renderVelocityTable();
    renderSalesVelocityChart();
    renderAreaHeatmap();
}

export function renderPriceGridAnalysis() {
    state.isHeatmapActive = false;
    dom.analyzeHeatmapBtn.innerHTML = `<i class="fas fa-fire mr-2"></i>開始分析`;
    dom.backToGridBtn.classList.add('hidden');
    dom.heatmapInfoContainer.classList.add('hidden');
    dom.heatmapSummaryTableContainer.classList.add('hidden');
    dom.heatmapHorizontalComparisonTableContainer.classList.add('hidden');

    const reportContent = dom.priceGridReportContent;
    if (!state.analysisDataCache || !state.analysisDataCache.priceGridAnalysis || !state.analysisDataCache.priceGridAnalysis.projectNames || state.analysisDataCache.priceGridAnalysis.projectNames.length === 0) {
        reportContent.querySelector('.my-4.p-4').classList.add('hidden');
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無垂直水平分析資料。</p>';
        return;
    }
    
    reportContent.querySelector('.my-4.p-4').classList.remove('hidden');
    const { projectNames } = state.analysisDataCache.priceGridAnalysis;

    if (projectNames && projectNames.length > 0) {
        state.selectedPriceGridProject = null;
        
        const filterHtml = projectNames.map(name => `<button class="capsule-btn" data-project="${name}">${name}</button>`).join('');
        dom.priceGridProjectFilterContainer.innerHTML = filterHtml;
        dom.priceGridProjectFilterContainer.parentElement.classList.remove('hidden');
        
        displayCurrentPriceGrid();
    } else {
        state.selectedPriceGridProject = null;
        dom.priceGridProjectFilterContainer.parentElement.classList.add('hidden');
        dom.unitColorLegendContainer.innerHTML = '';
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無特定建案資料可供分析。</p>';
    }
}