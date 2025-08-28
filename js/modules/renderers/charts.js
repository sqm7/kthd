// js/modules/renderers/charts.js

import { dom } from '../dom.js';
import { state } from '../state.js';
import { renderHeatmapDetailsTable } from './tables.js';

// --- 全局圖表實例 ---
let salesVelocityChartInstance = null;
let priceBandChartInstance = null;
let rankingChartInstance = null;

// ▼▼▼ 【需求修改處】強化 Treemap 功能 ▼▼▼
/**
 * 渲染建案分析樹狀圖 (Treemap)
 * - 支持按不同指標切換 (總價, 面積, 筆數)
 * - Tooltip 顯示數值與百分比
 * - 優化顏色以匹配網站風格
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
    const currentMetric = state.currentTreemapMetric;

    // 根據當前選擇的指標，設定對應的資料鍵、名稱和格式化函式
    const metricConfig = {
        saleAmountSum: { key: 'saleAmountSum', name: '銷售總額', unit: '萬', decimals: 0 },
        houseAreaSum: { key: 'houseAreaSum', name: '房屋面積', unit: '坪', decimals: 2 },
        transactionCount: { key: 'transactionCount', name: '資料筆數', unit: '筆', decimals: 0 }
    }[currentMetric];

    // 1. 準備 Treemap 資料並計算總計
    const totalValue = projectRanking.reduce((sum, p) => sum + p[metricConfig.key], 0);
    const seriesData = projectRanking.map(p => ({
        x: p.projectName,
        y: p[metricConfig.key]
    }));

    // 2. 動態生成符合網站風格的顏色範圍
    const values = seriesData.map(d => d.y).filter(v => v > 0);
    const maxVal = Math.max(...values);
    const colorRanges = [
        { from: 0, to: maxVal * 0.1, color: '#a5b4fc' },      // Light Purple/Blue
        { from: maxVal * 0.1, to: maxVal * 0.3, color: '#8b5cf6' },  // Purple Accent
        { from: maxVal * 0.3, to: maxVal * 0.6, color: '#2dd4bf' },  // Teal
        { from: maxVal * 0.6, to: maxVal, color: '#06b6d4' }     // Cyan Accent
    ];

    const options = {
        series: [{
            name: metricConfig.name,
            data: seriesData
        }],
        chart: {
            type: 'treemap',
            height: 450,
            background: 'transparent',
            toolbar: { show: true },
            foreColor: '#e5e7eb'
        },
        title: {
            text: `建案排名 - 依${metricConfig.name}分佈`,
            align: 'center',
            style: {
                fontSize: '16px',
                color: '#e5e7eb'
            }
        },
        plotOptions: {
            treemap: {
                distributed: true,
                enableShades: false, // 關閉自動陰影，使用自訂顏色
                colorScale: {
                    ranges: colorRanges
                }
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function(value) {
                    const percentage = totalValue > 0 ? (value / totalValue * 100).toFixed(2) : 0;
                    const formattedValue = value.toLocaleString('zh-TW', { 
                        minimumFractionDigits: metricConfig.decimals, 
                        maximumFractionDigits: metricConfig.decimals 
                    });
                    return `${formattedValue} ${metricConfig.unit} (${percentage}%)`;
                },
                title: {
                    formatter: function(seriesName) {
                        return seriesName + ':';
                    }
                }
            }
        },
        noData: {
            text: '無資料可顯示'
        }
    };

    rankingChartInstance = new ApexCharts(dom.rankingChartContainer, options);
    rankingChartInstance.render();
}
// ▲▲▲ 【修改結束】 ▲▲▲


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

    const seriesData = filteredAnalysis.map(item => ({
        x: item.bathrooms !== null ? `${item.roomType}-${item.bathrooms}衛` : item.roomType,
        y: [
            Math.round(item.minPrice),
            Math.round(item.q1Price),
            Math.round(item.medianPrice),
            Math.round(item.q3Price),
            Math.round(item.maxPrice)
        ]
    }));
    
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
            style: {
                fontSize: '16px',
                color: '#e5e7eb'
            }
        },
        plotOptions: {
            boxPlot: {
                colors: {
                    upper: '#06b6d4',
                    lower: '#8b5cf6'
                }
            }
        },
        stroke: {
            show: true,
            width: 1,
            colors: ['#9ca3af']
        },
        xaxis: {
            type: 'category',
            labels: {
                style: {
                    colors: '#9ca3af'
                },
                rotate: -45,
                offsetY: 5,
            },
            categories: seriesData.map(d => d.x).sort()
        },
        yaxis: {
            title: {
                text: '房屋總價 (萬)',
                style: {
                    color: '#9ca3af'
                }
            },
            labels: {
                formatter: function (val) {
                    return val.toLocaleString() + " 萬";
                },
                style: {
                    colors: '#9ca3af'
                }
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
                    const stats = w.globals.series[seriesIndex][dataPointIndex];
                    if (Array.isArray(stats) && stats.length === 5) {
                        return `
                            <div>最高: ${stats[4].toLocaleString()} 萬</div>
                            <div>Q3: ${stats[3].toLocaleString()} 萬</div>
                            <div>中位數: ${stats[2].toLocaleString()} 萬</div>
                            <div>Q1: ${stats[1].toLocaleString()} 萬</div>
                            <div>最低: ${stats[0].toLocaleString()} 萬</div>
                        `;
                    }
                    return value;
                }
            }
        },
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
        
        let paddedMin = overallMin - padding;
        let paddedMax = overallMax + padding;

        options.yaxis.min = Math.max(0, paddedMin);
        options.yaxis.max = paddedMax;
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
    
    const view = state.currentVelocityView;
    const dataForView = state.analysisDataCache.salesVelocityAnalysis[view] || {};
    const timeKeys = Object.keys(dataForView).sort();

    if (timeKeys.length === 0) {
        dom.salesVelocityChart.innerHTML = '<p class="text-gray-500 p-4 text-center">在此條件下無銷售趨勢資料。</p>';
        return;
    }
    
    const series = state.selectedVelocityRooms.map(roomType => {
        return {
            name: roomType,
            data: timeKeys.map(timeKey => dataForView[timeKey][roomType]?.count || 0)
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
                text: '交易筆數',
                style: {
                    color: '#9ca3af'
                }
            },
            labels: {
                style: {
                    colors: '#9ca3af'
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            offsetY: -5
        },
        tooltip: {
            theme: 'dark'
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

                    // ▼▼▼【已根據您的要求修正】▼▼▼
                    // 移除第四站邏輯，不符合前三站的都歸類為"其他"
                    const getRoomCategory = (record) => {
                        const buildingType = record['建物型態'] || '';
                        const mainPurpose = record['主要用途'] || '';
                        const rooms = record['房數'];
                        const houseArea = record['房屋面積(坪)'];

                        // 優先級 1: 特殊商業用途
                        if (buildingType.includes('店舖') || buildingType.includes('店面')) return '店舖';
                        if (buildingType.includes('工廠') || buildingType.includes('倉庫') || buildingType.includes('廠辦')) return '廠辦/工廠';
                        if (mainPurpose.includes('商業') || buildingType.includes('辦公') || buildingType.includes('事務所')) return '辦公/事務所';

                        // 優先級 2: 特殊住宅格局 (0房)
                        const isResidentialBuilding = buildingType.includes('住宅大樓') || buildingType.includes('華廈');
                        if (isResidentialBuilding && rooms === 0) {
                            if (houseArea > 35) return '毛胚';
                            if (houseArea <= 35) return '套房';
                        }

                        // 優先級 3: 標準住宅房型
                        if (typeof rooms === 'number' && !isNaN(rooms)) {
                            if (rooms === 1) return '1房';
                            if (rooms === 2) return '2房';
                            if (rooms === 3) return '3房';
                            if (rooms === 4) return '4房';
                            if (rooms >= 5) return '5房以上';
                        }
                        
                        // ▼▼▼【第四站備用邏輯已移除】▼▼▼

                        // 最終備用選項：以上皆不符合者，歸於此類
                        return '其他'; 
                    };
                    // ▲▲▲【修改結束】▲▲▲

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

                        // 中位數
                        const medianPrice = prices.length > 0 ? (prices.length % 2 === 0 ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2 : prices[Math.floor(prices.length / 2)]) : 0;
                        const medianUnitPrice = unitPrices.length > 0 ? (unitPrices.length % 2 === 0 ? (unitPrices[unitPrices.length / 2 - 1] + unitPrices[unitPrices.length / 2]) / 2 : unitPrices[Math.floor(unitPrices.length / 2)]) : 0;
                        
                        // 算術平均
                        const arithmeticAvgPrice = safeDivide(prices.reduce((s, p) => s + p, 0), prices.length);
                        const arithmeticAvgUnitPrice = safeDivide(unitPrices.reduce((s, p) => s + p, 0), unitPrices.length);

                        // 加權平均
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
                    
                    state.lastHeatmapDetails = { details, roomType, areaRange };
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
