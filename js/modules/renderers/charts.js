// js/modules/renderers/charts.js

import { dom } from '../dom.js';
import { state } from '../state.js';
import { renderHeatmapDetailsTable } from './tables.js';
import { THEME_COLORS } from '../config.js'; // 引入佈景主題顏色

// --- 全局圖表實例 ---
let salesVelocityChartInstance = null;
let priceBandChartInstance = null;
let rankingChartInstance = null;
let parkingRatioChartInstance = null; // <-- 新增這一行


/**
 * 渲染核心指標與排名的圖表
 * @description 此函式現在會根據 state.currentSort.key 動態切換 Treemap 和 Bar Chart。
 * Bar Chart 增加了 Y 軸標籤的間距與對齊樣式。
 */
export function renderRankingChart() {
    if (rankingChartInstance) {
        rankingChartInstance.destroy();
        rankingChartInstance = null;
    }

    if (!state.analysisDataCache || !state.analysisDataCache.projectRanking || state.analysisDataCache.projectRanking.length === 0) {
        dom.rankingChartContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無排名資料可繪製圖表。</p>';
        return;
    }

    const { projectRanking } = state.analysisDataCache;
    const sortKey = state.currentSort.key; // 獲取當前的排序指標

    // ▼▼▼ 【修改處】判斷要顯示長條圖還是方塊圖 ▼▼▼
    const barChartKeys = ['averagePrice', 'minPrice', 'maxPrice', 'medianPrice', 'avgParkingPrice'];
    const isBarChart = barChartKeys.includes(sortKey);

    if (isBarChart) {
        // --- 水平長條圖邏輯 (您要求修改的部分) ---
        const keyDetails = {
            averagePrice: { title: '建案平均單價排行', unit: '萬/坪' },
            minPrice: { title: '建案最低單價排行', unit: '萬/坪' },
            maxPrice: { title: '建案最高單價排行', unit: '萬/坪' },
            medianPrice: { title: '建案單價中位數排行', unit: '萬/坪' },
            avgParkingPrice: { title: '車位平均單價排行', unit: '萬' },
        }[sortKey];

        // 過濾掉無效數據(如0元)，並進行排序以便圖表顯示
        const sortedData = [...projectRanking]
            .filter(p => p[sortKey] > 0)
            .sort((a, b) => a[sortKey] - b[sortKey]) // 升序排列，長條圖會由上至下顯示從大到小
            .slice(-30); // 只顯示前30名，避免圖表過於擁擠

        if (sortedData.length === 0) {
            dom.rankingChartContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">此指標無有效資料可繪製長條圖。</p>';
            return;
        }

        const options = {
            series: [{
                name: keyDetails.unit,
                data: sortedData.map(p => ({
                    x: p.projectName,
                    y: parseFloat(p[sortKey].toFixed(2))
                }))
            }],
            chart: {
                type: 'bar',
                height: 800,
                background: 'transparent',
                toolbar: { show: true },
                foreColor: THEME_COLORS['text-light']
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '80%',
                    borderRadius: 4,
                    dataLabels: {
                        position: 'top',
                    }
                }
            },
            dataLabels: {
                enabled: true,
                offsetX: 40,
                style: {
                    fontSize: '13px',
                    colors: ['#ffffff']
                },
                background: {
                    enabled: true,
                    foreColor: '#000000',
                    padding: 6,
                    borderRadius: 2,
                    borderWidth: 1,
                    borderColor: '#4f4f4f',
                    opacity: 0.6,
                },
                formatter: function (val) {
                    return val.toLocaleString();
                }
            },
            xaxis: {
                categories: sortedData.map(p => p.projectName),
                title: {
                    text: keyDetails.unit,
                    style: { color: THEME_COLORS['text-dark'] }
                },
                labels: {
                    style: { colors: [THEME_COLORS['text-dark']] }
                }
            },
            yaxis: {
                labels: {
                    // 【需求修改】增加與圖表的間距，並添加CSS class 以實現靠右對齊
                    offsetX: -10, // 讓標籤向左移動10px，創造與圖表的間距
                    style: {
                        colors: [THEME_COLORS['text-light']],
                        fontSize: '14px',
                        cssClass: 'apexcharts-yaxis-label-right-align',
                    },
                }
            },
            grid: {
                borderColor: '#374151'
            },
            title: {
                text: keyDetails.title,
                align: 'center',
                style: { fontSize: '16px', color: THEME_COLORS['text-light'] }
            },
            tooltip: {
                theme: 'dark',
                x: {
                    show: false
                },
                y: {
                    title: {
                        formatter: function () {
                            return ''
                        }
                    }
                }
            }
        };
        rankingChartInstance = new ApexCharts(dom.rankingChartContainer, options);
        rankingChartInstance.render();

    } else {
        // --- 原有的 Treemap (方塊樹圖) 邏輯 ---
        const chartConfig = {
            saleAmountSum: { title: '建案銷售總額佔比', unit: '萬', yLabel: '銷售總額' },
            houseAreaSum: { title: '建案房屋面積佔比', unit: '坪', yLabel: '房屋面積' },
            transactionCount: { title: '建案交易筆數佔比', unit: '筆', yLabel: '資料筆數' }
        }[sortKey] || { title: '建案銷售總額佔比', unit: '萬', yLabel: '銷售總額' };

        const totalValue = projectRanking.reduce((sum, p) => sum + (p[sortKey] || 0), 0);
        const seriesData = projectRanking.map(p => ({
            x: p.projectName,
            y: Math.round(p[sortKey] * 100) / 100
        }));

        const options = {
            series: [{
                name: chartConfig.yLabel,
                data: seriesData
            }],
            chart: {
                type: 'treemap',
                height: 450,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false }
                },
                foreColor: THEME_COLORS['text-light']
            },
            title: {
                text: chartConfig.title,
                align: 'center',
                style: { fontSize: '16px', color: THEME_COLORS['text-light'] }
            },
            plotOptions: {
                treemap: {
                    distributed: true,
                    enableShades: false,
                    colorScale: {
                        ranges: [
                            { from: 0, to: totalValue * 0.1, color: THEME_COLORS['cyan-accent'] },
                            { from: totalValue * 0.1, to: totalValue * 0.3, color: '#4f91f7' },
                            { from: totalValue * 0.3, to: totalValue * 0.6, color: '#7c3aed' },
                            { from: totalValue * 0.6, to: Infinity, color: THEME_COLORS['purple-accent'] }
                        ]
                    }
                }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: function(value) {
                        const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : 0;
                        const formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
                        return `${formattedValue} ${chartConfig.unit} (${percentage}%)`;
                    },
                    title: {
                        formatter: function(seriesName) {
                            return seriesName + ':';
                        }
                    }
                }
            },
            noData: { text: '無資料可顯示' }
        };

        rankingChartInstance = new ApexCharts(dom.rankingChartContainer, options);
        rankingChartInstance.render();
    }
    // ▲▲▲ 【修改結束】 ▲▲▲
}


/**
 * 渲染總價帶分佈箱型圖
 */
export function renderPriceBandChart() {
    if (priceBandChartInstance) {
        priceBandChartInstance.destroy();
        priceBandChartInstance = null;
    }

    if (!state.analysisDataCache || !state.analysisDataCache.priceBandAnalysis || state.analysisDataCache.priceBandAnalysis.length === 0) {
        dom.priceBandChart.innerHTML = '<p class="text-gray-500 p-4 text-center">無總價帶資料可繪製圖表。</p>';
        return;
    }

    const { priceBandAnalysis } = state.analysisDataCache;
    const filteredAnalysis = priceBandAnalysis.filter(item => state.selectedPriceBandRoomTypes.includes(item.roomType));
    
    if (filteredAnalysis.length === 0) {
        dom.priceBandChart.innerHTML = '<p class="text-gray-500 p-4 text-center">請選擇房型以生成圖表。</p>';
        return;
    }

    const seriesData = filteredAnalysis
        .map(item => {
            const values = [item.minPrice, item.q1Price, item.medianPrice, item.q3Price, item.maxPrice];
            if (values.some(v => typeof v !== 'number' || isNaN(v))) {
                return null; 
            }
            return {
                x: item.bathrooms !== null ? `${item.roomType}-${item.bathrooms}衛` : item.roomType,
                y: values.map(v => Math.round(v))
            };
        })
        .filter(Boolean);
    
    const options = {
        series: [{
            name: '總價分佈',
            type: 'boxPlot',
            data: seriesData
        }],
        chart: {
            type: 'boxPlot',
            height: 450,
            background: 'transparent',
            toolbar: { show: true },
            foreColor: '#e5e7eb'
        },
        title: {
            text: '各房型總價帶分佈箱型圖',
            align: 'center',
            style: { fontSize: '16px', color: '#e5e7eb' }
        },
        plotOptions: {
            boxPlot: { colors: { upper: '#06b6d4', lower: '#8b5cf6' } }
        },
        xaxis: {
            type: 'category',
            labels: { style: { colors: '#9ca3af' }, rotate: -45, offsetY: 5, },
            categories: seriesData.map(d => d.x).sort()
        },
        yaxis: {
            title: { text: '房屋總價 (萬)', style: { color: '#9ca3af' } },
            labels: {
                formatter: function (val) { return val.toLocaleString() + " 萬"; },
                style: { colors: '#9ca3af' }
            }
        },
        // ▼▼▼ 【從這裡開始是本次修正的核心】 ▼▼▼
        tooltip: {
            // 啟用自訂 Tooltip 的功能
            custom: function({ seriesIndex, dataPointIndex, w }) {
                // 從圖表的全域設定中，取得對應數據點的 y 軸陣列資料
                const yData = w.globals.initialSeries[seriesIndex].data[dataPointIndex].y;
                
                // 確保資料是我們預期的格式 (一個包含5個數字的陣列)
                if (Array.isArray(yData) && yData.length === 5) {
                    const [min, q1, median, q3, max] = yData;
                    // 回傳一個我們自己打造的、完整的 HTML 提示框
                    return `
                        <div class="apexcharts-tooltip-box" style="background: #252836; border: 1px solid #4b5563; padding: 8px 12px; border-radius: 8px; font-family: 'Noto Sans TC', sans-serif;">
                            <div><strong>最高總價:</strong> ${max.toLocaleString()} 萬</div>
                            <div><strong>3/4位總價:</strong> ${q3.toLocaleString()} 萬</div>
                            <div><strong>中位數總價:</strong> ${median.toLocaleString()} 萬</div>
                            <div><strong>1/4位總價:</strong> ${q1.toLocaleString()} 萬</div>
                            <div><strong>最低總價:</strong> ${min.toLocaleString()} 萬</div>
                        </div>
                    `;
                }
                // 如果資料不對，回傳一個空的字串
                return '';
            }
        },
        // ▲▲▲ 【核心修正到此結束】 ▲▲▲
        grid: {
            borderColor: '#374151'
        }
    };
    
    if (seriesData.length > 0) {
        const allPrices = seriesData.flatMap(d => d.y);
        const overallMin = Math.min(...allPrices);
        const overallMax = Math.max(...allPrices);
        const range = overallMax - overallMin;
        const padding = range === 0 ? Math.max(overallMin * 0.1, 100) : range * 0.1; 
        options.yaxis.min = Math.max(0, overallMin - padding);
        options.yaxis.max = overallMax + padding;
    }

    priceBandChartInstance = new ApexCharts(dom.priceBandChart, options);
    priceBandChartInstance.render();
}

/**
 * 渲染銷售速度趨勢圖
 */
export function renderSalesVelocityChart() {
    if (salesVelocityChartInstance) {
        salesVelocityChartInstance.destroy();
        salesVelocityChartInstance = null;
    }
    
    if (!state.analysisDataCache || !state.analysisDataCache.salesVelocityAnalysis || state.selectedVelocityRooms.length === 0) {
        dom.salesVelocityChart.innerHTML = '<p class="text-gray-500 p-4 text-center">請先選擇房型以生成趨勢圖。</p>';
        return;
    }
    
    // ▼▼▼ 【整體修正】 ▼▼▼
    const view = state.currentVelocityView;
    const metric = state.currentVelocityMetric;
    
    const metricDetails = {
        count: { label: '交易筆數', unit: '筆', decimals: 0 },
        priceSum: { label: '產權總價', unit: '萬', decimals: 0 },
        areaSum: { label: '房屋坪數', unit: '坪', decimals: 2 }
    }[metric];

    const dataForView = state.analysisDataCache.salesVelocityAnalysis[view] || {};
    const timeKeys = Object.keys(dataForView).sort();

    if (timeKeys.length === 0) {
        dom.salesVelocityChart.innerHTML = '<p class="text-gray-500 p-4 text-center">在此條件下無銷售趨勢資料。</p>';
        return;
    }
    
    const series = state.selectedVelocityRooms.map(roomType => {
        return {
            name: roomType,
            data: timeKeys.map(timeKey => dataForView[timeKey][roomType]?.[metric] || 0)
        };
    });

    const options = {
        series: series,
        chart: {
            type: 'line',
            height: 350,
            background: 'transparent',
            toolbar: { show: true },
            foreColor: '#e5e7eb',
            zoom: { enabled: false }
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        dataLabels: {
            enabled: false
        },
        markers: {
            size: 4,
            hover: {
                size: 6
            }
        },
        xaxis: {
            categories: timeKeys,
            labels: {
                style: {
                    colors: '#9ca3af'
                }
            }
        },
        yaxis: {
            title: {
                text: metricDetails.label,
                style: {
                    color: '#9ca3af'
                }
            },
            labels: {
                style: {
                    colors: '#9ca3af'
                },
                formatter: function (val) {
                    return val.toLocaleString('zh-TW', { 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0 
                    });
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            offsetY: -5
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function(value) {
                    const formattedValue = value.toLocaleString('zh-TW', { 
                        minimumFractionDigits: metricDetails.decimals, 
                        maximumFractionDigits: metricDetails.decimals 
                    });
                    return `${formattedValue} ${metricDetails.unit}`;
                }
            }
        },
        grid: {
            borderColor: '#374151'
        },
        noData: {
            text: '載入中或無資料...',
            align: 'center',
            verticalAlign: 'middle',
            style: {
                color: '#9ca3af',
                fontSize: '14px',
            }
        }
    };

    salesVelocityChartInstance = new ApexCharts(dom.salesVelocityChart, options);
    salesVelocityChartInstance.render();
}


/**
 * 動態生成熱力圖的顏色區間
 */
function generateColorRanges(maxValue) {
    const palette = ['#fef9c3', '#fef08a', '#fde047', '#facc15', '#fbbf24', '#f97316', '#ea580c', '#dc2626', '#b91c1c'];
    const ranges = [{
        from: 0, to: 0, color: '#252836', name: '0 戶'
    }];

    if (maxValue <= 0) return ranges;

    const steps = [3, 5, 10, 20, 35, 50, 100, 200];
    let lastStep = 0;

    for (let i = 0; i < steps.length; i++) {
        const from = lastStep + 1;
        const to = steps[i];
        if (from > maxValue) break;

        const effectiveTo = Math.min(to, maxValue);
        const labelName = from === effectiveTo ? `${from} 戶` : `戶數: ${from}-${effectiveTo}`;

        ranges.push({
            from: from,
            to: effectiveTo + 0.9,
            color: palette[i],
            name: labelName
        });
        lastStep = effectiveTo;
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

    const dynamicHeight = Math.max(400, yAxisCategories.length * 22);

    const options = {
        series: seriesData,
        chart: {
            height: dynamicHeight,
            type: 'heatmap',
            background: 'transparent',
            toolbar: { show: true, tools: { download: true } },
            foreColor: '#e5e7eb',
            events: {
                dataPointSelection: (event, chartContext, config) => {
                    const { seriesIndex, dataPointIndex } = config;
                    if (seriesIndex < 0 || dataPointIndex < 0) return;

                    const areaRange = config.w.globals.seriesNames[seriesIndex];
                    const roomType = state.selectedVelocityRooms[dataPointIndex];
                    const [lower, upper] = areaRange.split('-').map(parseFloat);

                    const getRoomCategory = (record) => {
                        const unitName = record['戶別'] || '';
                        if (unitName.includes('店舖') || unitName.includes('店面')) return '店舖';
                        if (unitName.includes('事務所') || unitName.includes('辦公')) return '辦公/事務所';
                        const buildingType = record['建物型態'] || '';
        
                        const mainPurpose = record['主要用途'] || '';
                        const rooms = record['房數'];
                        const houseArea = record['房屋面積(坪)'];

                        if (buildingType.includes('店舖') || buildingType.includes('店面')) return '店舖';
                        if (buildingType.includes('工廠') || buildingType.includes('倉庫') || buildingType.includes('廠辦')) return '廠辦/工廠';
                        if (mainPurpose.includes('商業') || buildingType.includes('辦公') || buildingType.includes('事務所')) return '辦公/事務所';

                        const isResidentialBuilding = buildingType.includes('住宅大樓') || buildingType.includes('華廈');
                        if (isResidentialBuilding && rooms === 0) {
                            if (houseArea > 35) return '毛胚';
                            if (houseArea <= 35) return '套房';
                        }

                        if (typeof rooms === 'number' && !isNaN(rooms)) {
                            if (rooms === 1) return '1房';
                            if (rooms === 2) return '2房';
                            if (rooms === 3) return '3房';
                            if (rooms === 4) return '4房';
                            if (rooms >= 5) return '5房以上';
                        }
                        
                        return '其他'; 
                    };

                    const matchingTransactions = state.analysisDataCache.transactionDetails.filter(tx => {
                        const txRoomType = getRoomCategory(tx);
                        const txArea = tx['房屋面積(坪)'];
                        return txRoomType === roomType && txArea >= lower && txArea < upper;
                    });

                    const groupedByProject = matchingTransactions.reduce((acc, tx) => {
                        const projectName = tx['建案名稱'];
                        if (!acc[projectName]) {
                            acc[projectName] = { transactions: [] };
                        }
                        acc[projectName].transactions.push(tx);
                        return acc;
                    }, {});

                    const details = Object.entries(groupedByProject).map(([projectName, data]) => {
                        const txs = data.transactions;
                        const prices = txs.map(t => t['房屋總價(萬)']).filter(p => typeof p === 'number').sort((a, b) => a - b);
                        const unitPrices = txs.map(t => t['房屋單價(萬)']).filter(p => typeof p === 'number').sort((a, b) => a - b);
                        
                        const safeDivide = (a, b) => b > 0 ? a / b : 0;

                        const medianPrice = prices.length > 0 ? (prices.length % 2 === 0 ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2 : prices[Math.floor(prices.length / 2)]) : 0;
                        const medianUnitPrice = unitPrices.length > 0 ? (unitPrices.length % 2 === 0 ? (unitPrices[unitPrices.length / 2 - 1] + unitPrices[unitPrices.length / 2]) / 2 : unitPrices[Math.floor(unitPrices.length / 2)]) : 0;
                        
                        const arithmeticAvgPrice = safeDivide(prices.reduce((s, p) => s + p, 0), prices.length);
                        const arithmeticAvgUnitPrice = safeDivide(unitPrices.reduce((s, p) => s + p, 0), unitPrices.length);

                        const totalHousePrice = txs.reduce((s, t) => s + (t['房屋總價(萬)'] || 0), 0);
                        const totalArea = txs.reduce((s, t) => s + (t['房屋面積(坪)'] || 0), 0);
                        const weightedAvgUnitPrice = safeDivide(totalHousePrice, totalArea);

                        return {
                            projectName: projectName,
                            count: txs.length,
                            priceRange: { min: prices.length > 0 ? prices[0] : 0, max: prices.length > 0 ? prices[prices.length - 1] : 0 },
                            unitPriceRange: { min: unitPrices.length > 0 ? unitPrices[0] : 0, max: unitPrices.length > 0 ? unitPrices[prices.length - 1] : 0 },
                            metrics: {
                                median: { totalPrice: medianPrice, unitPrice: medianUnitPrice },
                                arithmetic: { totalPrice: arithmeticAvgPrice, unitPrice: arithmeticAvgUnitPrice },
                                weighted: { totalPrice: arithmeticAvgPrice, unitPrice: weightedAvgUnitPrice }
                            }
                        };
                    }).sort((a, b) => b.count - a.count);
                    
                    // ▼▼▼ 【核心修改】儲存原始交易紀錄 ▼▼▼
                    state.lastHeatmapDetails = { 
                        details, 
                        rawTransactions: matchingTransactions, // <--- 新增這一行
                        roomType, 
                        areaRange 
                    };
                    // ▲▲▲ 修改結束 ▲▲▲
                    renderHeatmapDetailsTable();
                }
            }
        },
        plotOptions: {
            heatmap: {
                radius: 0,
                useFillColorAsStroke: true,
                enableShades: false,
                colorScale: {
                    ranges: colorRanges
                }
            }
        },
        dataLabels: {
            enabled: true,
            dropShadow: {
                enabled: true,
                top: 1,
                left: 1,
                blur: 1,
                color: '#000',
                opacity: 0.6
            },
            style: {
                colors: [function({ value }) {
                    if (value === 0) {
                        return 'transparent';
                    }
                    return '#e5e7eb';
                }]
            },
            formatter: function(val) {
                if (val === 0) {
                    return '';
                }
                return val;
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
            text: '房型面積分佈熱力圖',
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
/**
 * 渲染房車配比圓餅圖
 */
export function renderParkingRatioChart() {
    if (parkingRatioChartInstance) {
        parkingRatioChartInstance.destroy();
        parkingRatioChartInstance = null;
    }

    if (!state.analysisDataCache || !state.analysisDataCache.parkingAnalysis || !state.analysisDataCache.parkingAnalysis.parkingRatio) {
        dom.parkingRatioChartContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無資料</p>';
        return;
    }

    const { parkingRatio } = state.analysisDataCache.parkingAnalysis;
    const { withParking, withoutParking } = parkingRatio;

    if (withParking.count === 0 && withoutParking.count === 0) {
        dom.parkingRatioChartContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">無資料</p>';
        return;
    }

    const options = {
        series: [withParking.count, withoutParking.count],
        labels: ['有搭車位', '沒搭車位'],
        chart: {
            type: 'donut',
            height: 250,
            background: 'transparent',
            foreColor: THEME_COLORS['text-light']
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: '總筆數',
                            formatter: function (w) {
                                return (withParking.count + withoutParking.count).toLocaleString();
                            }
                        }
                    }
                }
            }
        },
        colors: [THEME_COLORS['cyan-accent'], THEME_COLORS['purple-accent']],
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return `${val.toFixed(1)}%` // 只顯示百分比
            },
            style: {
                colors: [THEME_COLORS['text-light']] // 確保文字顏色與主題一致
            },
            dropShadow: {
                enabled: false // 移除陰影，讓文字更清晰
            }
        },
        legend: {
            show: false
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function(value) {
                    return `${value.toLocaleString()} 筆`;
                }
            }
        }
    };

    parkingRatioChartInstance = new ApexCharts(dom.parkingRatioChartContainer, options);
    parkingRatioChartInstance.render();
}
