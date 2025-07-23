import * as dom from '../dom.js';
import * as state from '../state.js';
import * as ui from '../ui.js';

/**
 * 渲染所有報表的主函式
 */
export function renderAllReports() {
    if (!state.analysisDataCache) {
        // 在沒有分析資料時，可以選擇隱藏所有報表區塊或顯示提示
        document.querySelectorAll('.report-section').forEach(section => {
            section.innerHTML = '<div class="p-4 text-center text-gray-500">請先點擊「分析數據」以生成報表。</div>';
        });
        return;
    }
    
    renderCoreMetricsReport();
    renderProjectRankingReport();
    renderPriceBandReport();
    renderUnitPriceAnalysisReport();
    renderParkingAnalysisReport();
    renderSalesVelocityReport();
    renderAreaDistributionReport(); // 渲染我們修正的面積分佈熱力圖
}

/**
 * 渲染核心指標卡片
 */
function renderCoreMetricsReport() {
    const metrics = state.analysisDataCache.coreMetrics;
    if (!metrics) return;

    dom.totalSaleAmount.textContent = ui.formatNumber(metrics.totalSaleAmount, 0);
    dom.totalHouseArea.textContent = ui.formatNumber(metrics.totalHouseArea, 0);
    dom.overallAveragePrice.textContent = ui.formatNumber(metrics.overallAveragePrice, 1);
    dom.transactionCount.textContent = metrics.transactionCount.toLocaleString();
}

/**
 * 渲染建案排名表格
 */
function renderProjectRankingReport() {
    const rankingData = state.analysisDataCache.projectRanking;
    if (!rankingData || rankingData.length === 0) {
        dom.projectRankingTable.innerHTML = '<tbody><tr><td colspan="8" class="text-center p-4 text-gray-500">無建案排名資料</td></tr></tbody>';
        return;
    }

    let tableBody = '';
    rankingData.forEach(p => {
        tableBody += `
            <tr class="hover:bg-dark-card transition-colors">
                <td class="p-2">${p.projectName}</td>
                <td class="p-2 text-right">${p.transactionCount.toLocaleString()}</td>
                <td class="p-2 text-right">${ui.formatNumber(p.saleAmountSum, 0)}</td>
                <td class="p-2 text-right">${ui.formatNumber(p.marketShare, 2)}%</td>
                <td class="p-2 text-right">${ui.formatNumber(p.averagePrice, 1)}</td>
                <td class="p-2 text-right">${ui.formatNumber(p.medianPrice, 1)}</td>
                <td class="p-2 text-right">${ui.formatNumber(p.minPrice, 1)}</td>
                <td class="p-2 text-right">${ui.formatNumber(p.maxPrice, 1)}</td>
            </tr>
        `;
    });
    dom.projectRankingTable.querySelector('tbody').innerHTML = tableBody;
}

/**
 * 渲染總價帶分析報表
 */
function renderPriceBandReport() {
    const analysisData = state.analysisDataCache.priceBandAnalysis;
    if (!analysisData) {
        dom.priceBandTable.innerHTML = '<tbody><tr><td colspan="9" class="text-center p-4 text-gray-500">無總價帶資料</td></tr></tbody>';
        return;
    }

    const allRoomTypes = [...new Set(analysisData.map(item => item.roomType))];
    const sortOrder = ['套房', '1房', '2房', '3房', '4房', '5房以上', '毛胚', '店舖', '辦公/事務所', '廠辦/工廠', '其他'];
    
    allRoomTypes.sort((a, b) => {
        const indexA = sortOrder.indexOf(a);
        const indexB = sortOrder.indexOf(b);
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

    const filteredData = analysisData.filter(item => state.selectedPriceBandRoomTypes.includes(item.roomType));
    
    let tableBody = '';
    if (filteredData.length > 0) {
        filteredData.forEach(item => {
            tableBody += `
                <tr class="hover:bg-dark-card transition-colors">
                    <td class="p-2">${item.roomType}</td>
                    <td class="p-2 text-center">${item.bathrooms !== null ? item.bathrooms : '-'}</td>
                    <td class="p-2 text-right">${item.count.toLocaleString()}</td>
                    <td class="p-2 text-right">${ui.formatNumber(item.avgPrice, 0)}</td>
                    <td class="p-2 text-right">${ui.formatNumber(item.minPrice, 0)}</td>
                    <td class="p-2 text-right">${ui.formatNumber(item.q1Price, 0)}</td>
                    <td class="p-2 text-right">${ui.formatNumber(item.medianPrice, 0)}</td>
                    <td class="p-2 text-right">${ui.formatNumber(item.q3Price, 0)}</td>
                    <td class="p-2 text-right">${ui.formatNumber(item.maxPrice, 0)}</td>
                </tr>
            `;
        });
    } else {
        tableBody = '<tr><td colspan="9" class="text-center p-4 text-gray-500">請至少選擇一個房型以顯示數據</td></tr>';
    }
    dom.priceBandTable.querySelector('tbody').innerHTML = tableBody;

    renderPriceBandChart();
}


/**
 * 渲染總價帶分佈圖 (Box Plot)
 */
function renderPriceBandChart() {
    const analysisData = state.analysisDataCache?.priceBandAnalysis;
    if (!analysisData) return;

    const filteredData = analysisData.filter(item => state.selectedPriceBandRoomTypes.includes(item.roomType));

    const series = [{
        name: '總價分佈',
        type: 'boxPlot',
        data: filteredData.map(item => ({
            x: item.roomType,
            y: [item.minPrice, item.q1Price, item.medianPrice, item.q3Price, item.maxPrice]
        }))
    }];

    const options = {
        series: series,
        chart: {
            type: 'boxPlot',
            height: 350,
            background: 'transparent',
            toolbar: { show: false }
        },
        theme: {
            mode: 'dark'
        },
        xaxis: {
            labels: {
                style: { colors: '#9CA3AF' }
            }
        },
        yaxis: {
            labels: {
                style: { colors: '#D1D5DB' },
                formatter: (val) => `${ui.formatNumber(val, 0)} 萬`
            }
        },
        tooltip: {
            theme: 'dark'
        },
        grid: {
            borderColor: '#374151'
        },
        plotOptions: {
            boxPlot: {
                colors: {
                    upper: '#529b2f',
                    lower: '#e74c3c'
                }
            }
        }
    };

    if (state.charts.priceBand) {
        state.charts.priceBand.updateOptions(options);
    } else {
        dom.priceBandChartContainer.innerHTML = '';
        state.charts.priceBand = new ApexCharts(dom.priceBandChartContainer, options);
        state.charts.priceBand.render();
    }
}


/**
 * 渲染房屋單價分析報表
 */
function renderUnitPriceAnalysisReport() {
    // 此函式為示意，您需要根據後端回傳的 unitPriceAnalysis 資料結構來填充內容
}

/**
 * 渲染車位分析報表
 */
function renderParkingAnalysisReport() {
    // 此函式為示意，您需要根據後端回傳的 parkingAnalysis 資料結構來填充內容
}

/**
 * 渲染房型去化速度報表
 */
function renderSalesVelocityReport() {
    // 此函式為示意，您需要根據後端回傳的 salesVelocityAnalysis 資料結構來填充內容
}

/**
 * 渲染「房型面積分佈」報表 (熱力圖)
 * 這個版本是為了配合後端回傳的 { series, categories } 新格式所寫
 */
export function renderAreaDistributionReport() {
    // 從 state 中獲取後端傳來的分析資料
    const analysisData = state.analysisDataCache?.areaDistributionAnalysis;

    // 檢查從後端收到的資料是否有效
    // 如果沒有 analysisData，或 series/categories 不存在，或 series 是空的，就顯示提示訊息
    if (!analysisData || !analysisData.series || !analysisData.categories || analysisData.series.length === 0) {
        // 清空容器，並顯示統一的「無資料」提示
        dom.areaDistributionChartContainer.innerHTML = '<div class="p-4 text-center text-gray-500">此篩選條件下無面積分佈資料可供顯示。</div>';
        // 如果圖表物件已存在，銷毀它，避免舊圖表殘留
        if (state.charts.areaDistribution) {
            state.charts.areaDistribution.destroy();
            state.charts.areaDistribution = null;
        }
        return; // 結束函式執行
    }

    // 從後端資料中直接解構出 series 和 categories
    const { series, categories } = analysisData;

    // 設定圖表選項
    const options = {
        series: series, // 直接使用後端整理好的 series
        chart: {
            height: 450,
            type: 'heatmap',
            background: 'transparent', // 透明背景
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: false,
                    zoomin: false,
                    zoomout: false,
                    pan: false,
                    reset: false
                }
            }
        },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                radius: 0,
                useFillColorAsStroke: true,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0, name: '0', color: '#4A5568' },
                        { from: 1, to: 5, name: '1-5 戶', color: '#529b2f' },
                        { from: 6, to: 10, name: '6-10 戶', color: '#95d475' },
                        { from: 11, to: 20, name: '11-20 戶', color: '#f5c842' },
                        { from: 21, to: 50, name: '21-50 戶', color: '#ff772a' },
                        { from: 51, to: 9999, name: '51+ 戶', color: '#e74c3c' }
                    ]
                }
            }
        },
        dataLabels: {
            enabled: true,
            style: {
                colors: ['#000']
            },
            formatter: function(val) {
                // 當格子內的數量為 0 時，不顯示數字
                return val === 0 ? '' : val;
            }
        },
        xaxis: {
            categories: categories, // 直接使用後端整理好的 categories
            labels: {
                style: {
                    colors: '#9CA3AF', // X軸文字顏色
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#D1D5DB' // Y軸文字顏色
                }
            }
        },
        tooltip: {
            theme: 'dark'
        },
        grid: {
            borderColor: '#374151' // 圖表格線顏色
        },
        theme: {
            mode: 'dark'
        }
    };

    // 如果圖表實例已存在，就用新資料更新它
    if (state.charts.areaDistribution) {
        state.charts.areaDistribution.updateOptions(options);
    } else {
        // 否則，先清空容器，再創建一個新的圖表實例
        dom.areaDistributionChartContainer.innerHTML = '';
        state.charts.areaDistribution = new ApexCharts(dom.areaDistributionChartContainer, options);
        state.charts.areaDistribution.render();
    }
}
