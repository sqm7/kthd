// js/modules/renderers/tables.js

import { dom } from '../dom.js';
import * as ui from '../ui.js';
import { state } from '../state.js';

// ▼▼▼ 【新增輔助函式】用來計算中位數 ▼▼▼
function calculateMedian(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
// ▲▲▲ 新增結束 ▲▲▲


// ▼▼▼ 【新增函式】根據勾選的建案更新統計列 ▼▼▼
export function updateHeatmapDetailsSummary() {
    const selectedCheckboxes = dom.heatmapDetailsContent.querySelectorAll('.project-checkbox:checked');
    const selectedProjectNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.projectName);

    const summaryRow = dom.heatmapDetailsContent.querySelector('#heatmap-summary-row');
    if (!summaryRow) return;

    // 如果沒有選擇任何建案，則清空統計數據
    if (selectedProjectNames.length === 0) {
        summaryRow.querySelector('.summary-total-price').textContent = '-';
        summaryRow.querySelector('.summary-unit-price').textContent = '-';
        return;
    }

    // 從 state 中篩選出對應的原始交易紀錄
    const relevantTransactions = state.lastHeatmapDetails.rawTransactions.filter(tx => 
        selectedProjectNames.includes(tx['建案名稱'])
    );

    const totalPrices = relevantTransactions.map(tx => tx['房屋總價(萬)']).filter(p => typeof p === 'number');
    const unitPrices = relevantTransactions.map(tx => tx['房屋單價(萬)']).filter(p => typeof p === 'number');

    const medianTotalPrice = calculateMedian(totalPrices);
    const medianUnitPrice = calculateMedian(unitPrices);

    summaryRow.querySelector('.summary-total-price').textContent = ui.formatNumber(medianTotalPrice, 0);
    summaryRow.querySelector('.summary-unit-price').textContent = ui.formatNumber(medianUnitPrice, 2);
}
// ▲▲▲ 新增結束 ▲▲▲


// ▼▼▼ 【核心修改函式】 ▼▼▼
export function renderHeatmapDetailsTable() {
    const { details, roomType, areaRange } = state.lastHeatmapDetails || {};
    const metricType = state.currentHeatmapDetailMetric;
    const contentContainer = dom.heatmapDetailsContent;

    if (!details || details.length === 0) {
        contentContainer.innerHTML = `<p class="text-gray-500 text-center">在 ${roomType || ''} / ${areaRange || ''} 坪的範圍內沒有找到詳細交易資料。</p>`;
        dom.heatmapDetailsControls.classList.add('hidden');
        return;
    }
    
    dom.heatmapDetailsControls.classList.remove('hidden');

    const unitPriceMetricLabel = {
        median: '中位數(萬)',
        weighted: '加權平均(萬)',
        arithmetic: '算術平均(萬)'
    }[metricType];
    
    const totalPriceMetricLabel = metricType === 'median' ? '中位數(萬)' : '算術平均(萬)';

    let tableHtml = `
        <h4 class="text-md font-semibold text-cyan-400 mb-2">詳細數據</h4>
        <p class="text-sm text-gray-400 mb-4">房型: <span class="font-bold">${roomType}</span> | 面積區間: <span class="font-bold">${areaRange} 坪</span></p>
        <div class="overflow-y-auto" style="max-height: 550px;">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-800">
                    <tr>
                        <th class="p-2 align-bottom" rowspan="2">
                            <input type="checkbox" id="select-all-projects" class="form-checkbox h-4 w-4 text-cyan-accent bg-gray-700 border-gray-600 focus:ring-cyan-accent rounded" checked>
                        </th>
                        <th class="p-2 align-bottom" rowspan="2">建案名稱 (戶數)</th>
                        <th class="p-2 text-center" colspan="2">總價(萬)</th>
                        <th class="p-2 text-center" colspan="2">房屋單價(萬)</th>
                    </tr>
                    <tr>
                        <th class="p-2 text-center font-normal">區間(萬)</th>
                        <th class="p-2 text-center font-normal">${totalPriceMetricLabel}</th>
                        <th class="p-2 text-center font-normal">區間(萬)</th>
                        <th class="p-2 text-center font-normal">${unitPriceMetricLabel}</th>
                    </tr>
                </thead>
                <tbody>
    `;

    details.forEach(item => {
        const totalPriceToShow = metricType === 'median' ? item.metrics.median.totalPrice : item.metrics.arithmetic.totalPrice;
        const unitPriceToShow = item.metrics[metricType].unitPrice;

        tableHtml += `
            <tr class="border-b border-gray-700 hover:bg-dark-card">
                <td class="p-2 text-center">
                    <input type="checkbox" class="project-checkbox form-checkbox h-4 w-4 text-cyan-accent bg-gray-700 border-gray-600 focus:ring-cyan-accent rounded" data-project-name="${item.projectName}" checked>
                </td>
                <td class="p-2">${item.projectName} (${item.count}戶)</td>
                <td class="p-2 text-center">${ui.formatNumber(item.priceRange.min, 0)} - ${ui.formatNumber(item.priceRange.max, 0)}</td>
                <td class="p-2 text-center font-bold">${ui.formatNumber(totalPriceToShow, 0)}</td>
                <td class="p-2 text-center">${ui.formatNumber(item.unitPriceRange.min, 2)} - ${ui.formatNumber(item.unitPriceRange.max, 2)}</td>
                <td class="p-2 text-center font-bold">${ui.formatNumber(unitPriceToShow, 2)}</td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
                <tfoot class="bg-gray-900 sticky bottom-0">
                    <tr id="heatmap-summary-row" class="border-t-2 border-cyan-400">
                        <td class="p-2 font-bold text-right" colspan="3">選取項目統計 (中位數)</td>
                        <td class="p-2 text-center font-bold summary-total-price"></td>
                        <td class="p-2 text-center font-bold"></td>
                        <td class="p-2 text-center font-bold summary-unit-price"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    contentContainer.innerHTML = tableHtml;

    // 渲染完畢後，立即計算一次初始的總結數據
    updateHeatmapDetailsSummary();
}
// ▲▲▲ 修改結束 ▲▲▲


export function renderTable(data) {
    if (!data || data.length === 0) {
        dom.resultsTable.innerHTML = '<tbody><tr><td colspan="99" class="text-center p-4">無資料</td></tr></tbody>';
        return;
    }

    const isPresale = data[0]['交易類型'] === '預售交易';
    
    // =================================================================
    // 【【【 您可以在此處手動控制第一層與第二層的欄位 】】】
    // =================================================================

    // 1. **第一層：摘要欄位** - 決定哪些欄位永遠顯示在第一層
    const summaryFields = [
        '行政區', '建案名稱', '交易日', '交易筆棟數', '主要用途', '建物型態', 
        '戶型', '樓層', '房屋面積(坪)', '房屋單價(萬)'
    ];

    // 2. **第二層：明細欄位** - 決定點擊「明細」後要顯示哪些欄位
    //    您可以從 'allAvailableFields' 複製需要的欄位到這裡
    const detailsFields = [
        '編號', '地址', '總樓層', '交易總價(萬)',
        '房屋總價(萬)', '車位總價(萬)', 
        '房數', '廳數', '衛浴數','備註', '解約情形'
    ];

    // (這一段是為了方便您參考，列出所有可能的欄位)
    const allAvailableFields = Object.keys(data[0]);
    // console.log("所有可用欄位:", allAvailableFields);
    
    // =================================================================

    // 如果不是預售屋，從摘要欄位中移除 '戶型' 和 '建案名稱'
    if (!isPresale) {
        const indexToRemove = summaryFields.indexOf('戶型');
        if (indexToRemove > -1) summaryFields.splice(indexToRemove, 1);
        const indexToRemove2 = summaryFields.indexOf('建案名稱');
        if (indexToRemove2 > -1) summaryFields.splice(indexToRemove2, 1);
    }
    
    // --- 建立表頭 (<thead>) ---
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    let headerHtml = '<th>操作</th>';
    summaryFields.forEach(header => {
        headerHtml += `<th>${header}</th>`;
    });
    headerRow.innerHTML = headerHtml;
    thead.appendChild(headerRow);

    // --- 建立表格內容 (<tbody>) ---
    const allRowsHtml = data.map((row, index) => {
        const summaryCellsHtml = summaryFields.map(header => {
            const value = row[header];
            let cellContent = (typeof value === 'number' && !Number.isInteger(value)) 
                ? ui.formatNumber(value) 
                : (value ?? "-");
            
            if (header === '戶型') {
                return `<td class="has-tooltip" data-tooltip="原始戶別: ${row['戶別'] || '無資料'}">${cellContent}</td>`;
            }
            return `<td>${cellContent}</td>`;
        }).join('');

        // 【更新】現在只從您定義的 detailsFields 陣列來產生明細
        const detailsGridHtml = detailsFields.map(key => {
            // 檢查該欄位是否存在於資料中
            if (key in row) {
                const value = row[key] !== null && row[key] !== '' ? row[key] : '-';
                return `
                    <div>
                        <div class="key">${key}</div>
                        <div class="value">${value}</div>
                    </div>
                `;
            }
            return ''; // 如果資料中沒有這個欄位，則不顯示
        }).join('');

        return `
            <tbody class="data-item-group">
                <tr class="summary-row" data-details-target="#details-${index}">
                    <td>
                        <div class="flex items-center gap-2">
                            <button class="details-btn" data-id="${row['編號']}" data-type="${row['交易類型']}" data-county="${row['縣市代碼']}">附表</button>
                            <button class="details-toggle-btn">明細</button>
                        </div>
                    </td>
                    ${summaryCellsHtml}
                </tr>
                <tr class="details-row" id="details-${index}">
                    <td colspan="${summaryFields.length + 1}" class="details-cell">
                        <div class="details-grid">${detailsGridHtml}</div>
                    </td>
                </tr>
            </tbody>
        `;
    }).join('');

    dom.resultsTable.innerHTML = '';
    dom.resultsTable.append(thead);
    dom.resultsTable.insertAdjacentHTML('beforeend', allRowsHtml);
}
// --- ▲▲▲ 修改結束 ▲▲▲ ---


export function renderSubTable(title, records) {
    if (!records || !Array.isArray(records) || records.length === 0) {
        return `<div class="mb-4"><h3 class="text-lg font-semibold text-cyan-400 mb-2">${title}</h3><p class="text-sm text-gray-500">無資料</p></div>`;
    }
    const headers = Object.keys(records[0]).filter(h => 
        h !== 'id' && 
        h !== '編號' && 
        h !== '土地持分面積' && 
        h !== '車位價格' && 
        h !== '車位面積'
    );
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

// ▼▼▼ 【最終修正版】 ▼▼▼
export function renderVelocityTable() {
    if (!state.analysisDataCache || !state.analysisDataCache.salesVelocityAnalysis) return;

    // 輔助函式：將週標籤轉換為日期區間
    const getWeekDates = (weekLabel) => {
        const [year, week] = weekLabel.split('-W').map(Number);
        const date = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
        const day = date.getUTCDay() || 7;
        if (day !== 1) {
            date.setUTCDate(date.getUTCDate() - (day - 1));
        }
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const formatDate = (d) => d.toISOString().split('T')[0];
        return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
    };

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
        
        // --- 核心修正點 ---
        // 將 tooltip 屬性與 class 放在同一個 <span> 元素上
        let timeCellHtml;
        const isWeeklyView = state.currentVelocityView === 'weekly';
        if (isWeeklyView) {
            timeCellHtml = `<span class="has-tooltip" data-tooltip="${getWeekDates(timeKey)}">${timeKey}</span>`;
        } else {
            timeCellHtml = timeKey;
        }

        let rowHtml = `<tr class="hover:bg-dark-card"><td class="sticky left-0 bg-dark-card hover:bg-gray-800 z-10 font-mono">${timeCellHtml}</td>`;
        // --- 修正結束 ---
        
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
