// js/modules/renderers.js

import { dom } from './dom.js';
import * as ui from './ui.js';
import { state } from './state.js';

// --- Heatmap related functions ---
const heatmapColorMapping = { high: { label: '高度溢價 (> 5%)', color: 'rgba(244, 63, 94, 0.5)' }, medium: { label: '中度溢價 (2-5%)', color: 'rgba(234, 179, 8, 0.4)' }, low: { label: '微幅溢價 (0-2%)', color: 'rgba(34, 197, 94, 0.3)' }, discount: { label: '建案折價 (< 0%)', color: 'rgba(139, 92, 246, 0.4)' }, };
const specialTypeMapping = { storefront: { label: '店舖類型', icon: '<i class="fas fa-store"></i>' }, anchor: { label: '基準戶', icon: '<i class="fas fa-anchor"></i>' }, terrace: { label: '露台戶', icon: '<i class="fas fa-seedling"></i>' }, insider: { label: '親友/員工', icon: '<i class="fas fa-users"></i>' }, };
function getPremiumCategory(premium) { if (premium === null) return 'none'; if (premium < 0) return 'discount'; if (premium === 0) return 'anchor'; if (premium > 5) return 'high'; if (premium > 2) return 'medium'; return 'low'; }
function getHeatmapColor(premium) { if (premium === null) return '#1f2937'; const category = getPremiumCategory(premium); return heatmapColorMapping[category] ? heatmapColorMapping[category].color : 'rgba(34, 197, 94, 0.2)'; }

/**
 * @FINAL
 * 動態生成熱力圖的顏色區間 (簡化標籤版)
 * @param {number} maxValue - 資料中的最大值
 * @returns {Array} - 用於 ApexCharts 的 colorScale.ranges 陣列
 */
function generateColorRanges(maxValue) {
    const palette = ['#fef9c3', '#fef08a', '#fde047', '#facc15', '#fbbf24', '#f97316', '#ea580c', '#dc2626', '#b91c1c'];
    const ranges = [{
        from: 0, to: 0, color: '#1a1d29', name: '0 戶' // 修改此行：設為與背景色相同的實心色 (透明度0%)
    }];

    if (maxValue <= 0) return ranges;

    // 固定級距策略，提供一致的視覺體驗
    const steps = [1, 2, 5, 10, 20, 35, 50, 100, 200];
    let lastStep = 0;

    for (let i = 0; i < steps.length; i++) {
        const from = lastStep + 1;
        const to = steps[i];
        if (from > maxValue) break;
        
        ranges.push({
            from: from,
            to: Math.min(to, maxValue),
            color: palette[i],
            name: `${from}-${Math.min(to, maxValue)} 戶`
        });
        lastStep = Math.min(to, maxValue);
    }
    
    if (maxValue > lastStep) {
        ranges.push({
            from: lastStep + 1,
            to: maxValue,
            color: palette[palette.length - 1],
            name: `> ${lastStep} 戶`
        });
    }

    return ranges;
}


export function renderHeatmapLegends() {
    dom.heatmapColorLegend.innerHTML = Object.entries(heatmapColorMapping).map(([key, {label, color}]) => ` <div class="legend-item" data-filter-type="premium" data-filter-value="${key}"> <span class="color-legend-swatch" style="background-color: ${color};"></span> <span>${label}</span> </div> `).join('');
    dom.heatmapIconLegend.innerHTML = Object.entries(specialTypeMapping).map(([key, {label, icon}]) => ` <div class="legend-item" data-filter-type="special" data-filter-value="${key}"> <span class="icon-legend-symbol">${icon}</span> <span>${label}</span> </div> `).join('');
}

export function applyHeatmapGridFilter() {
    const { type, value } = state.currentLegendFilter;
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

export function renderPriceGapHeatmap() {
    const container = dom.horizontalPriceGridContainer;
    const localAnalysisData = JSON.parse(JSON.stringify(state.analysisDataCache));
    const projectAnalysisData = localAnalysisData.priceGridAnalysis.byProject[state.selectedPriceGridProject];

    if (!projectAnalysisData) {
        container.innerHTML = '<p class="text-gray-500 p-4 text-center">找不到此建案的熱力圖分析資料。</p>';
        return;
    }
    renderHeatmapLegends();
    state.currentLegendFilter = { type: null, value: null };
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
                    const baseInfo = `交易總價: ${ui.formatNumber(tooltipInfo.totalPrice, 0)} 萬\n房屋總價: ${ui.formatNumber(tooltipInfo.housePrice, 0)} 萬\n車位總價: ${ui.formatNumber(tooltipInfo.parkingPrice, 0)} 萬\n房屋面積: ${ui.formatNumber(tooltipInfo.houseArea, 2)} 坪\n房間數: ${tooltipInfo.rooms || '-'} 房`;

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

                        const premiumLine = `調價幅度: ${ui.formatNumber(premium, 2)} %`;

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

export function renderHeatmapSummaryTable(summary) { if (!summary || summary.transactionCount === 0) { dom.heatmapSummaryTableContainer.innerHTML = ''; return; } const { totalBaselineHousePrice, totalPricePremiumValue, totalSoldArea } = summary; const premiumPercentage = (totalPricePremiumValue / totalBaselineHousePrice) * 100; const avgPriceAdjustment = totalPricePremiumValue / totalSoldArea; const formatValue = (value, unit = '', decimals = 2) => { const num = ui.formatNumber(value, decimals); return value > 0 ? `<span class="summary-value-positive">+${num} ${unit}</span>` : `<span class="summary-value-negative">${num} ${unit}</span>`; }; const tableHtml = ` <h3 class="report-section-title mt-8">調價幅度統計摘要 (排除店舖)</h3> <div class="overflow-x-auto"> <table class="min-w-full summary-table"> <thead> <tr> <th>基準房屋總價</th> <th>調價幅度總額</th> <th>總溢價率</th> <th>已售房屋坪數</th> <th>平均單價調價</th> </tr> </thead> <tbody> <tr> <td>${ui.formatNumber(totalBaselineHousePrice, 0)} 萬</td> <td>${formatValue(totalPricePremiumValue, '萬', 0)}</td> <td>${formatValue(premiumPercentage, '%')}</td> <td>${ui.formatNumber(totalSoldArea)} 坪</td> <td>${formatValue(avgPriceAdjustment, '萬/坪')}</td> </tr> </tbody> </table> </div> `; dom.heatmapSummaryTableContainer.innerHTML = tableHtml; }
export function renderHorizontalComparisonTable(projectData) { if (!projectData || !projectData.horizontalComparison || projectData.horizontalComparison.length === 0) { dom.heatmapHorizontalComparisonTableContainer.innerHTML = ''; return; } const { horizontalComparison, refFloorForComparison } = projectData; const formatValue = (value, unit = '', decimals = 2, addSign = false) => { if (typeof value !== 'number' || isNaN(value)) return '-'; const num = ui.formatNumber(value, decimals); if (addSign) { return value > 0 ? `<span class="summary-value-positive">+${num} ${unit}</span>` : value < 0 ? `<span class="summary-value-negative">${num} ${unit}</span>` : `<span>${num} ${unit}</span>`; } return (unit === '%') ? num + unit : num + ' ' + unit; }; const tableHtml = ` <h3 class="report-section-title mt-8">戶型水平價差與溢價貢獻 (基準樓層: F${refFloorForComparison || 'N/A'})</h3> <p class="text-sm text-gray-500 mt-2 mb-4">* 水平價差是將各戶型基準價換算至共同基準樓層後的價差，以最低價戶型為 0 基準。</p> <div class="overflow-x-auto"> <table class="min-w-full summary-table"> <thead> <tr> <th>戶型</th> <th>基準戶 (樓/價)</th> <th>水平價差(萬/坪)</th> <th>去化戶數</th> <th>溢價貢獻</th> <th>貢獻佔比</th> <th>基準房屋總價</th> <th>平均單價調價</th> </tr> </thead> <tbody> ${horizontalComparison.map(item => ` <tr> <td>${item.unitType}</td> <td>${item.anchorInfo}</td> <td>${formatValue(item.horizontalPriceDiff, '萬/坪', 2, true)}</td> <td>${item.unitsSold.toLocaleString()} 戶</td> <td>${formatValue(item.timePremiumContribution, '萬', 0, true)}</td> <td>${formatValue(item.contributionPercentage, '%')}</td> <td>${ui.formatNumber(item.baselineHousePrice, 0)} 萬</td> <td>${formatValue(item.avgPriceAdjustment, '萬/坪', 2, true)}</td> </tr> `).join('')} </tbody> </table> </div> `; dom.heatmapHorizontalComparisonTableContainer.innerHTML = tableHtml; }

export function renderRankingReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.coreMetrics) return;
    
    const { coreMetrics, projectRanking } = state.analysisDataCache;
    
    dom.metricCardsContainer.innerHTML = `<div class="metric-card"><div class="metric-card-title">市場去化總銷售金額</div><div><span class="metric-card-value">${ui.formatNumber(coreMetrics.totalSaleAmount, 0)}</span><span class="metric-card-unit">萬</span></div></div><div class="metric-card"><div class="metric-card-title">總銷去化房屋坪數</div><div><span class="metric-card-value">${ui.formatNumber(coreMetrics.totalHouseArea, 2)}</span><span class="metric-card-unit">坪</span></div></div><div class="metric-card"><div class="metric-card-title">總平均單價</div><div><span class="metric-card-value">${ui.formatNumber(coreMetrics.overallAveragePrice, 2)}</span><span class="metric-card-unit">萬/坪</span></div></div><div class="metric-card"><div class="metric-card-title">總交易筆數</div><div><span class="metric-card-value">${coreMetrics.transactionCount.toLocaleString()}</span><span class="metric-card-unit">筆</span></div></div>`;
    
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
    priceBandAnalysis.sort((a, b) => { if (a.rooms !== b.rooms) return a.rooms - b.rooms; return a.bathrooms - b.bathrooms; });
    const tableHeaders = ['房數', '衛浴數', '筆數', '平均房屋總價', '最低房屋總價', '1/4分位房屋總價', '中位數房屋總價', '3/4分位房屋總價', '最高房屋總價'];
    let headerHtml = '<thead><tr>' + tableHeaders.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
    let bodyHtml = '<tbody>';
    priceBandAnalysis.forEach(item => { bodyHtml += `<tr class="hover:bg-dark-card transition-colors"><td>${item.rooms}</td><td>${item.bathrooms}</td><td>${item.count.toLocaleString()}</td><td>${ui.formatNumber(item.avgPrice, 0)}</td><td>${ui.formatNumber(item.minPrice, 0)}</td><td>${ui.formatNumber(item.q1Price, 0)}</td><td>${ui.formatNumber(item.medianPrice, 0)}</td><td>${ui.formatNumber(item.q3Price, 0)}</td><td>${ui.formatNumber(item.maxPrice, 0)}</td></tr>`; });
    bodyHtml += '</tbody>';
    dom.priceBandTable.innerHTML = headerHtml + bodyHtml;
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

export function renderAreaHeatmap() {
    if (state.areaHeatmapChart) {
        state.areaHeatmapChart.destroy();
        state.areaHeatmapChart = null;
    }
    if (!state.analysisDataCache || !state.analysisDataCache.areaDistributionAnalysis) {
        dom.areaHeatmapChart.innerHTML = '<p class="text-gray-500 p-4 text-center">無面積分佈資料可供分析。</p>';
        return;
    }

    const distributionData = state.analysisDataCache.areaDistributionAnalysis;
    const interval = parseFloat(dom.heatmapIntervalInput.value);
    const userMinArea = parseFloat(dom.heatmapMinAreaInput.value);
    const userMaxArea = parseFloat(dom.heatmapMaxAreaInput.value);

    let allAreas = [];
    state.selectedVelocityRooms.forEach(roomType => {
        if (distributionData[roomType]) {
            const filteredAreas = distributionData[roomType].filter(area => area >= userMinArea && area <= userMaxArea);
            allAreas.push(...filteredAreas);
        }
    });

    if (allAreas.length === 0 || isNaN(interval) || interval <= 0 || isNaN(userMinArea) || isNaN(userMaxArea) || userMinArea >= userMaxArea) {
        dom.areaHeatmapChart.innerHTML = '<p class="text-gray-500 p-4 text-center">在此面積範圍內無資料，或範圍/級距設定無效。</p>';
        return;
    }
    
    const yAxisCategories = [];
    for (let i = userMinArea; i < userMaxArea; i += interval) {
        yAxisCategories.push(`${i.toFixed(1)}-${(i + interval).toFixed(1)}`);
    }

    const baseHeight = 200; 
    const heightPerCategory = 25;
    const dynamicHeight = baseHeight + (yAxisCategories.length * heightPerCategory);

    let maxValue = 0;
    const seriesData = yAxisCategories.map(category => {
        const [lower, upper] = category.split('-').map(parseFloat);
        const dataPoints = state.selectedVelocityRooms.map(roomType => {
            const roomData = distributionData[roomType] || [];
            const count = roomData.filter(area => area >= lower && area < upper && area >= userMinArea && area <= userMaxArea).length;
            if (count > maxValue) {
                maxValue = count;
            }
            return count;
        });
        return {
            name: category,
            data: dataPoints
        };
    });

    const colorRanges = generateColorRanges(maxValue);

    const options = {
        series: seriesData,
        chart: {
            height: dynamicHeight, 
            type: 'heatmap',
            background: 'transparent',
            toolbar: { show: true, tools: { download: true } },
            foreColor: '#e5e7eb'
        },
        dataLabels: {
            enabled: true,
            style: { 
                colors: ['#111827'],
                fontWeight: 'bold'
            },
            formatter: (val) => val > 0 ? val : ''
        },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                radius: 0,
                useFillColorAsStroke: true, // 【修正】改回 true，移除多餘框線
                colorScale: {
                    ranges: colorRanges
                }
            }
        },
        xaxis: {
            type: 'category',
            categories: state.selectedVelocityRooms,
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
                formatter: (val) => {
                    if (val === 0) return '無成交紀錄';
                    return `${val} 戶`;
                }
            }
        },
        grid: {
            borderColor: '#374151'
        },
    };

    state.areaHeatmapChart = new ApexCharts(dom.areaHeatmapChart, options);
    state.areaHeatmapChart.render();
}

export function renderSalesVelocityReport() {
    if (!state.analysisDataCache || !state.analysisDataCache.salesVelocityAnalysis) return;
    const { allRoomTypes } = state.analysisDataCache.salesVelocityAnalysis;
    if (allRoomTypes && allRoomTypes.length > 0) {
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
    renderAreaHeatmap();
}

export function renderVelocityTable() {
    if (!state.analysisDataCache || !state.analysisDataCache.salesVelocityAnalysis) return;
    const dataForView = state.analysisDataCache.salesVelocityAnalysis[state.currentVelocityView] || {};
    const timeKeys = Object.keys(dataForView).sort().reverse();
    let headerHtml = '<thead><tr class="velocity-header-group"><th rowspan="2" class="sticky left-0 bg-dark-card z-10">時間</th>';
    state.selectedVelocityRooms.forEach(roomType => { headerHtml += `<th colspan="3" class="text-center">${roomType}</th>`; });
    headerHtml += `<th colspan="3" class="text-center total-col">總計</th></tr><tr class="velocity-header-sub">`;
    const subHeaders = ['資料筆數', '產權總價(萬)', '房屋坪數(坪)'];
    state.selectedVelocityRooms.forEach(() => { subHeaders.forEach(sub => headerHtml += `<th>${sub}</th>`); });
    subHeaders.forEach(sub => headerHtml += `<th class="total-col">${sub}</th>`);
    headerHtml += '</tr></thead>';
    let bodyHtml = '<tbody>';
    timeKeys.forEach(timeKey => {
        const periodData = dataForView[timeKey];
        let rowTotal = { count: 0, priceSum: 0, areaSum: 0 };
        let rowHtml = `<tr class="hover:bg-dark-card"><td class="sticky left-0 bg-dark-card hover:bg-gray-800 z-10 font-mono">${timeKey}</td>`;
        state.selectedVelocityRooms.forEach(roomType => {
            const stats = periodData[roomType];
            if (stats) {
                   rowHtml += `<td>${stats.count.toLocaleString()}</td><td>${ui.formatNumber(stats.priceSum, 0)}</td><td>${ui.formatNumber(stats.areaSum, 2)}</td>`;
                rowTotal.count += stats.count;
                rowTotal.priceSum += stats.priceSum;
                rowTotal.areaSum += stats.areaSum;
            } else {
                 rowHtml += `<td>-</td><td>-</td><td>-</td>`;
            }
        });
        rowHtml += `<td class="font-semibold total-col">${rowTotal.count.toLocaleString()}</td><td class="font-semibold total-col">${ui.formatNumber(rowTotal.priceSum, 0)}</td><td class="font-semibold total-col">${ui.formatNumber(rowTotal.areaSum, 2)}</td></tr>`;
        bodyHtml += rowHtml;
    });
    bodyHtml += '</tbody>';
    dom.velocityTableContainer.innerHTML = timeKeys.length > 0 ? `<table class="min-w-full velocity-table">${headerHtml}${bodyHtml}</table>` : '<p class="text-gray-500 p-4 text-center">在此條件下無資料。</p>';
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

export function displayCurrentPriceGrid() {
    if (!state.selectedPriceGridProject || !state.analysisDataCache || !state.analysisDataCache.priceGridAnalysis) {
        dom.horizontalPriceGridContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">請從上方選擇建案以查看銷控表。</p>';
        dom.unitColorLegendContainer.innerHTML = '';
        dom.analyzeHeatmapBtn.disabled = true;
        return;
    }
    
    const localAnalysisData = JSON.parse(JSON.stringify(state.analysisDataCache));
    const data = localAnalysisData.priceGridAnalysis.byProject[state.selectedPriceGridProject];
    
    if (!data) {
        dom.horizontalPriceGridContainer.innerHTML = `<p class="text-gray-500">找不到建案「${state.selectedPriceGridProject}」的分析資料。</p>`;
        dom.unitColorLegendContainer.innerHTML = '';
        dom.analyzeHeatmapBtn.disabled = true;
        return;
    }
    
    dom.analyzeHeatmapBtn.disabled = false;
    renderUnitColorLegend(data.unitColorMap);
    renderHorizontalPriceGrid(data.horizontalGrid, data.sortedFloors, data.sortedUnits, data.unitColorMap);
}

export function renderUnitColorLegend(unitColorMap) {
    if (!unitColorMap || Object.keys(unitColorMap).length === 0) {
        dom.unitColorLegendContainer.innerHTML = ''; return;
    }
    let legendHtml = Object.entries(unitColorMap).map(([unit, color]) => `<div class="flex items-center"><span class="w-4 h-4 rounded-full mr-2" style="background-color: ${color};"></span><span>${unit}</span></div>`).join('');
    dom.unitColorLegendContainer.innerHTML = legendHtml;
}

export function renderHorizontalPriceGrid(grid, floors, units, colorMap) {
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
                    const tooltipText = `交易總價: ${ui.formatNumber(tx.tooltipInfo.totalPrice, 0)} 萬\n房屋總價: ${ui.formatNumber(tx.tooltipInfo.housePrice, 0)} 萬\n車位總價: ${ui.formatNumber(tx.tooltipInfo.parkingPrice, 0)} 萬\n房屋面積: ${ui.formatNumber(tx.tooltipInfo.houseArea, 2)} 坪\n房間數: ${tx.tooltipInfo.rooms || '-'} 房`;
                    return `<div class="has-tooltip py-1" data-tooltip="${tooltipText}"><span>${storefrontIcon}${ui.formatNumber(tx.unitPrice, 1)}萬</span>${parkingIcon}<br><span class="text-xs text-gray-400">(${tx.transactionDate})</span></div>`;
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

export function renderTable(data) {
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
                    td.textContent = (typeof value === 'number' && !Number.isInteger(value)) ? ui.formatNumber(value) : (value ?? "-");
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

export function renderSubTable(title, records) {
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

export function renderPagination() {
    ui.createPaginationControls(dom.paginationControls, state.totalRecords, state.currentPage, state.pageSize, (page) => {
        state.currentPage = page;
        import('../app.js').then(app => app.mainFetchData());
    });
}

export function renderRankingPagination(totalItems) {
    ui.createPaginationControls(dom.rankingPaginationControls, totalItems, state.rankingCurrentPage, state.rankingPageSize, (page) => {
        state.rankingCurrentPage = page;
        renderRankingReport();
    });
}

export function renderSuggestions(names) {
    if (names.length === 0) {
        dom.projectNameSuggestions.innerHTML = `<div class="p-2 text-gray-500">${dom.projectNameInput.value ? '無相符建案' : '此區域無預售建案資料'}</div>`;
    } else {
        dom.projectNameSuggestions.innerHTML = names.map(name => {
            const isChecked = state.selectedProjects.includes(name);
            return `<label class="suggestion-item" data-name="${name}"><input type="checkbox" ${isChecked ? 'checked' : ''}><span class="flex-grow">${name}</span></label>`
        }).join('');
    }
    dom.projectNameSuggestions.classList.remove('hidden');
}

export function renderProjectTags() {
    dom.projectNameContainer.querySelectorAll('.multi-tag').forEach(tag => tag.remove());
    dom.projectNameContainer.insertBefore(dom.projectNameInput, dom.projectNameContainer.firstChild);
    state.selectedProjects.forEach(name => {
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
    dom.clearProjectsBtn.classList.toggle('hidden', state.selectedProjects.length === 0);
}

export function renderDistrictTags() {
    dom.districtContainer.querySelectorAll('.multi-tag').forEach(tag => tag.remove());
    dom.districtContainer.insertBefore(dom.districtInputArea, dom.districtContainer.firstChild);
    if (state.selectedDistricts.length > 0) {
        dom.districtInputArea.classList.add('hidden');
        state.selectedDistricts.forEach(name => {
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
                 // This creates a circular dependency, it's better to handle this in eventHandlers.js
                import('../app.js').then(app => app.removeDistrict(name));
            });
            dom.districtContainer.insertBefore(tagElement, dom.districtInputArea);
       });
    } else {
        dom.districtInputArea.classList.remove('hidden');
    }
    dom.clearDistrictsBtn.classList.toggle('hidden', state.selectedDistricts.length === 0);
}
