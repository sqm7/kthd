// js/modules/renderers/heatmap.js

import { dom } from '../dom.js';
import { state } from '../state.js';
import * as ui from '../ui.js';

// --- Heatmap related constants and helpers ---
const heatmapColorMapping = { high: { label: '高度溢價 (> 5%)', color: 'rgba(244, 63, 94, 0.5)' }, medium: { label: '中度溢價 (2-5%)', color: 'rgba(234, 179, 8, 0.4)' }, low: { label: '微幅溢價 (0-2%)', color: 'rgba(34, 197, 94, 0.3)' }, discount: { label: '建案折價 (< 0%)', color: 'rgba(139, 92, 246, 0.4)' }, };

// ▼▼▼ 【修改處】新增 office 圖例 ▼▼▼
const specialTypeMapping = { 
    storefront: { label: '店舖類型', icon: '<i class="fas fa-store"></i>' }, 
    office: { label: '辦公室', icon: '<i class="fas fa-briefcase"></i>' },
    anchor: { label: '基準戶', icon: '<i class="fas fa-anchor"></i>' }, 
    terrace: { label: '露台戶', icon: '<i class="fas fa-seedling"></i>' }, 
    insider: { label: '親友/員工', icon: '<i class="fas fa-users"></i>' }, 
};
// ▲▲▲ 【修改結束】 ▲▲▲

function getPremiumCategory(premium) { if (premium === null) return 'none'; if (premium < 0) return 'discount'; if (premium === 0) return 'anchor'; if (premium > 5) return 'high'; if (premium > 2) return 'medium'; return 'low'; }
function getHeatmapColor(premium) { if (premium === null) return '#1f2937'; const category = getPremiumCategory(premium); return heatmapColorMapping[category] ? heatmapColorMapping[category].color : 'rgba(34, 197, 94, 0.2)'; }

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
                    // ▼▼▼ 【修改處】解構出 isOffice 旗標 ▼▼▼
                    const { premium, isStorefront, isOffice, remark, tooltipInfo } = tx;
                    // ▲▲▲ 【修改結束】 ▲▲▲
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
                        // ▼▼▼ 【修改處】增加對 isOffice 的判斷 ▼▼▼
                        if (isStorefront) {
                            specialType = 'storefront';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}">${specialTypeMapping[specialType].icon}</span> `;
                            bgColor = '#1f2937';
                        } else if (isOffice) {
                            specialType = 'office';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}">${specialTypeMapping[specialType].icon}</span> `;
                            bgColor = '#1f2937';
                        } else if (remarkText.includes('露台')) {
                        // ▲▲▲ 【修改結束】 ▲▲▲
                            specialType = 'terrace';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}: ${remarkText}">${specialTypeMapping[specialType].icon}</span> `;
                        } else if (remarkText.includes('親友') || remarkText.includes('員工')) {
                            specialType = 'insider';
                            specialLabel = specialTypeMapping[specialType].label;
                            iconHtml = `<span class="has-tooltip" data-tooltip="${specialLabel}: ${remarkText}">${specialTypeMapping[specialType].icon}</span> `;
                        }

                        const premiumLine = premium !== null ? `調價幅度: ${ui.formatNumber(premium, 2)} %` : '無調價資訊';

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

export function renderHeatmapSummaryTable(summary) { if (!summary || summary.transactionCount === 0) { dom.heatmapSummaryTableContainer.innerHTML = ''; return; } const { totalBaselineHousePrice, totalPricePremiumValue, totalSoldArea } = summary; const premiumPercentage = (totalPricePremiumValue / totalBaselineHousePrice) * 100; const avgPriceAdjustment = totalPricePremiumValue / totalSoldArea; const formatValue = (value, unit = '', decimals = 2) => { const num = ui.formatNumber(value, decimals); return value > 0 ? `<span class="summary-value-positive">+${num} ${unit}</span>` : `<span class="summary-value-negative">${num} ${unit}</span>`; }; const tableHtml = ` <h3 class="report-section-title mt-8">調價幅度統計摘要 (排除店舖/辦公室)</h3> <div class="overflow-x-auto"> <table class="min-w-full summary-table"> <thead> <tr> <th>基準房屋總價</th> <th>調價幅度總額</th> <th>總溢價率</th> <th>已售房屋坪數</th> <th>平均單價調價</th> </tr> </thead> <tbody> <tr> <td>${ui.formatNumber(totalBaselineHousePrice, 0)} 萬</td> <td>${formatValue(totalPricePremiumValue, '萬', 0)}</td> <td>${formatValue(premiumPercentage, '%')}</td> <td>${ui.formatNumber(totalSoldArea)} 坪</td> <td>${formatValue(avgPriceAdjustment, '萬/坪')}</td> </tr> </tbody> </table> </div> `; dom.heatmapSummaryTableContainer.innerHTML = tableHtml; }
export function renderHorizontalComparisonTable(projectData) { if (!projectData || !projectData.horizontalComparison || projectData.horizontalComparison.length === 0) { dom.heatmapHorizontalComparisonTableContainer.innerHTML = ''; return; } const { horizontalComparison, refFloorForComparison } = projectData; const formatValue = (value, unit = '', decimals = 2, addSign = false) => { if (typeof value !== 'number' || isNaN(value)) return '-'; const num = ui.formatNumber(value, decimals); if (addSign) { return value > 0 ? `<span class="summary-value-positive">+${num} ${unit}</span>` : value < 0 ? `<span class="summary-value-negative">${num} ${unit}</span>` : `<span>${num} ${unit}</span>`; } return (unit === '%') ? num + unit : num + ' ' + unit; }; const tableHtml = ` <h3 class="report-section-title mt-8">戶型水平價差與溢價貢獻 (基準樓層: F${refFloorForComparison || 'N/A'})</h3> <p class="text-sm text-gray-500 mt-2 mb-4">* 水平價差是將各戶型基準價換算至共同基準樓層後的價差，以最低價戶型為 0 基準。</p> <div class="overflow-x-auto"> <table class="min-w-full summary-table"> <thead> <tr> <th>戶型</th> <th>基準戶 (樓/價)</th> <th>水平價差(萬/坪)</th> <th>去化戶數</th> <th>溢價貢獻</th> <th>貢獻佔比</th> <th>基準房屋總價</th> <th>平均單價調價</th> </tr> </thead> <tbody> ${horizontalComparison.map(item => ` <tr> <td>${item.unitType}</td> <td>${item.anchorInfo}</td> <td>${formatValue(item.horizontalPriceDiff, '萬/坪', 2, true)}</td> <td>${item.unitsSold.toLocaleString()} 戶</td> <td>${formatValue(item.timePremiumContribution, '萬', 0, true)}</td> <td>${formatValue(item.contributionPercentage, '%')}</td> <td>${ui.formatNumber(item.baselineHousePrice, 0)} 萬</td> <td>${formatValue(item.avgPriceAdjustment, '萬/坪', 2, true)}</td> </tr> `).join('')} </tbody> </table> </div> `; dom.heatmapHorizontalComparisonTableContainer.innerHTML = tableHtml; }

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
                const hasOffice = cellData.some(tx => tx.isOffice);
                let bgColor = `${colorMap[unit] || '#374151'}40`;
                if (hasStorefront) bgColor = 'rgba(107, 33, 168, 0.2)';
                if (hasOffice) bgColor = 'rgba(21, 128, 61, 0.3)';

                let cellContent = cellData.map(tx => {
                    const parkingIcon = tx.hasParking ? ` <i class="fas fa-parking parking-icon" title="含車位"></i>` : '';
                    const storefrontIcon = tx.isStorefront ? `<i class="fas fa-store" title="店舖類型"></i> ` : '';
                    const officeIcon = tx.isOffice ? `<i class="fas fa-briefcase" title="辦公用途"></i> ` : '';
                    const tooltipText = `交易總價: ${ui.formatNumber(tx.tooltipInfo.totalPrice, 0)} 萬\n房屋總價: ${ui.formatNumber(tx.tooltipInfo.housePrice, 0)} 萬\n車位總價: ${ui.formatNumber(tx.tooltipInfo.parkingPrice, 0)} 萬\n房屋面積: ${ui.formatNumber(tx.tooltipInfo.houseArea, 2)} 坪\n房間數: ${tx.tooltipInfo.rooms || '-'} 房`;
                    return `<div class="has-tooltip py-1" data-tooltip="${tooltipText}"><span>${storefrontIcon}${officeIcon}${ui.formatNumber(tx.unitPrice, 1)}萬</span>${parkingIcon}<br><span class="text-xs text-gray-400">(${tx.transactionDate})</span></div>`;
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
