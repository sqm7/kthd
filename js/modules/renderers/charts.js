// js/modules/renderers/charts.js
// 這個模組負責所有圖表的渲染與互動邏輯

import { dom } from '../dom.js';
import { calculateQuantile, safeDivide } from './reports.js';
import { CHART_COLORS, DEFAULT_VISIBLE_ROOM_TYPES } from '../config.js';
import { formatNumber, debounce } from '../utils.js';

/**
 * 渲染總價帶分析的箱型圖 (Boxplot)
 * @param {object} analysisResult - 後端回傳的分析結果物件
 */
export function renderPriceBandChart(analysisResult) {
    if (!analysisResult || !analysisResult.priceBandAnalysis || !analysisResult.priceBandAnalysis.datasets) {
        console.error("無效的總價帶分析資料");
        dom.priceBandContainer.innerHTML = '<p>總價帶分析資料不足。</p>';
        return;
    }

    const { labels, datasets } = analysisResult.priceBandAnalysis;

    if (!labels || labels.length === 0 || !datasets[0].data.some(d => d !== null)) {
        dom.priceBandContainer.innerHTML = '<p class="text-center text-gray-500">此篩選條件下無足夠資料可供繪製總價帶圖表。</p>';
        return;
    }
    
    // 清空容器並重新加入 canvas
    dom.priceBandContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'priceBandChart';
    dom.priceBandContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');

    const chartData = {
        labels: labels,
        datasets: [{
            label: '總價分佈 (萬)',
            data: datasets[0].data,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
            itemRadius: 3,
            itemStyle: 'circle',
            hitRadius: 5,
        }]
    };

    new Chart(ctx, {
        type: 'boxplot',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2.5,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '交易總價 (萬元)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = context.raw;
                            if (!item) return '';
                            const transactionCount = datasets[0].transactions[context.dataIndex];
                            return [
                                `總戶數: ${transactionCount}`,
                                `最高價: ${formatNumber(item.max)} 萬`,
                                `Q3 (75%): ${formatNumber(item.q3)} 萬`,
                                `中位價: ${formatNumber(item.median)} 萬`,
                                `Q1 (25%): ${formatNumber(item.q1)} 萬`,
                                `最低價: ${formatNumber(item.min)} 萬`,
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * 渲染房型去化分析的堆疊長條圖
 * @param {object} analysisResult - 後端回傳的分析結果物件
 * @param {Array} mainData - 主要的交易資料陣列
 */
export function renderSalesVelocityChart(analysisResult, mainData) {
    if (!analysisResult || !analysisResult.salesVelocityAnalysis) {
        console.error("無效的去化分析資料");
        dom.salesVelocityContainer.innerHTML = '<p>去化分析資料不足。</p>';
        return;
    }

    const { weekly, monthly, quarterly, yearly, allRoomTypes } = analysisResult.salesVelocityAnalysis;
    
    if (!allRoomTypes || allRoomTypes.length === 0) {
        dom.salesVelocityContainer.innerHTML = '<p class="text-center text-gray-500">此篩選條件下無足夠資料可供繪製去化圖表。</p>';
        dom.areaHeatmapContainer.innerHTML = '';
        if (dom.roomTypeFilterContainer) dom.roomTypeFilterContainer.innerHTML = '';
        return;
    }

    const viewData = { weekly, monthly, quarterly, yearly };
    let currentView = 'monthly';
    let currentChart = null;

    // ▼▼▼ 【修改處】更新前端的房型分類邏輯以和後端同步 ▼▼▼
    const getRoomCategory = (record) => {
        const rooms = record['房數'];
        const buildingType = record['建物型態'] || '';
        const houseArea = record['房屋面積(坪)'];
        const mainPurpose = record['主要用途'] || '';

        if (buildingType.includes('店舖') || buildingType.includes('店面')) return '店舖';
        if (buildingType.includes('廠辦')) return '廠辦'; // 新增「廠辦」判斷
        if (buildingType.includes('工廠')) return '工廠';
        if (buildingType.includes('倉庫')) return '倉庫';
        if (mainPurpose.includes('商業') || buildingType.includes('辦公')) return '辦公';
        if ((buildingType.includes('住宅大樓') || buildingType.includes('華廈')) && rooms === 0 && houseArea > 35) return '毛胚';
        if ((buildingType.includes('住宅大樓') || buildingType.includes('華廈')) && rooms === 0 && houseArea <= 35) return '套房';
        if (rooms === null || typeof rooms !== 'number' || isNaN(rooms)) return '其他';
        if (rooms === 0) return '套房';
        if (rooms >= 5) return '5房以上';
        return `${rooms}房`;
    };
    // ▲▲▲ 【修改結束】 ▲▲▲

    const createChart = (view) => {
        const data = viewData[view];
        if (!data || Object.keys(data).length === 0) {
            dom.salesVelocityChartContainer.innerHTML = '<p class="text-center text-gray-500">此時間維度無資料。</p>';
            if(currentChart) currentChart.destroy();
            return;
        }

        dom.salesVelocityChartContainer.innerHTML = '<canvas id="salesVelocityChart"></canvas>';
        const ctx = dom.salesVelocityChart.getContext('2d');
        const labels = Object.keys(data).sort();
        
        const datasets = allRoomTypes.map(roomType => {
            const colorIndex = allRoomTypes.indexOf(roomType) % CHART_COLORS.length;
            return {
                label: roomType,
                data: labels.map(label => data[label][roomType]?.count || 0),
                backgroundColor: CHART_COLORS[colorIndex],
                borderColor: CHART_COLORS[colorIndex],
                fill: false,
            };
        });

        if (currentChart) {
            currentChart.destroy();
        }
        
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2.5,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: '交易戶數' } }
                },
                plugins: {
                    legend: {
                        display: false // 將圖例交給外部的篩選器控制
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            footer: (tooltipItems) => {
                                let total = 0;
                                tooltipItems.forEach(item => total += item.raw);
                                return '期間總計: ' + total + '戶';
                            }
                        }
                    }
                }
            }
        });
    };
    
    // 渲染房型篩選器
    const renderRoomTypeFilters = () => {
        dom.roomTypeFilterContainer.innerHTML = allRoomTypes.map(type => {
            const colorIndex = allRoomTypes.indexOf(type) % CHART_COLORS.length;
            const isChecked = DEFAULT_VISIBLE_ROOM_TYPES.includes(type);
            return `
                <label class="inline-flex items-center mr-4 mb-2 cursor-pointer">
                    <input type="checkbox" class="form-checkbox h-4 w-4 rounded" data-room-type="${type}" ${isChecked ? 'checked' : ''}>
                    <span class="ml-2 text-sm" style="color: ${CHART_COLORS[colorIndex]};">${type}</span>
                </label>
            `;
        }).join('');

        dom.roomTypeFilterContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const type = e.target.dataset.roomType;
                const isChecked = e.target.checked;
                const datasetIndex = currentChart.data.datasets.findIndex(d => d.label === type);
                if (datasetIndex !== -1) {
                    currentChart.setDatasetVisibility(datasetIndex, isChecked);
                    currentChart.update();
                }
            }
        });
    };

    // 初始化時根據預設值設定可見性
    const setInitialVisibility = () => {
        currentChart.data.datasets.forEach((dataset, index) => {
            const isVisible = DEFAULT_VISIBLE_ROOM_TYPES.includes(dataset.label);
            currentChart.setDatasetVisibility(index, isVisible);
        });
        currentChart.update();
    };

    dom.salesVelocityViewSelector.addEventListener('change', (e) => {
        currentView = e.target.value;
        createChart(currentView);
        if(currentChart) setInitialVisibility();
    });

    createChart(currentView);
    renderRoomTypeFilters();
    if(currentChart) setInitialVisibility();

    // 渲染面積分佈熱力圖
    renderAreaHeatmap(mainData, allRoomTypes, getRoomCategory);
}

/**
 * 渲染房型面積分佈熱力圖
 * @param {Array} data - 所有交易資料
 * @param {Array} roomTypes - 所有可用的房型
 * @param {Function} getRoomCategory - 用於分類房型的函式
 */
function renderAreaHeatmap(data, roomTypes, getRoomCategory) {
    if (!data || data.length === 0) {
        dom.areaHeatmapContainer.innerHTML = '';
        return;
    }

    const areaData = {};
    roomTypes.forEach(type => areaData[type] = []);

    data.forEach(record => {
        const category = getRoomCategory(record);
        const area = record['房屋面積(坪)'];
        if (areaData[category] && typeof area === 'number' && area > 0) {
            areaData[category].push(area);
        }
    });

    const maxArea = Math.max(...Object.values(areaData).flat());
    const binSize = 10;
    const bins = Math.ceil(maxArea / binSize);
    const labels = Array.from({ length: bins }, (_, i) => `${i * binSize}-${(i + 1) * binSize}坪`);

    const heatmapData = roomTypes.map(type => {
        const counts = Array(bins).fill(0);
        areaData[type].forEach(area => {
            const binIndex = Math.floor(area / binSize);
            if (binIndex < bins) {
                counts[binIndex]++;
            }
        });
        return counts;
    });

    dom.areaHeatmapContainer.innerHTML = '<canvas id="areaHeatmapChart"></canvas>';
    const ctx = document.getElementById('areaHeatmapChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'heatmap',
        data: {
            labels: labels,
            datasets: roomTypes.map((type, i) => ({
                label: type,
                data: heatmapData[i].map((count, j) => ({ x: labels[j], y: type, v: count })),
                backgroundColor: (context) => {
                    if (!context.raw) return 'rgba(230, 230, 230, 0.2)';
                    const alpha = Math.min(1, 0.1 + context.raw.v / 10);
                    const colorIndex = roomTypes.indexOf(type) % CHART_COLORS.length;
                    const hexColor = CHART_COLORS[colorIndex];
                    // Convert hex to rgba
                    const r = parseInt(hexColor.slice(1, 3), 16);
                    const g = parseInt(hexColor.slice(3, 5), 16);
                    const b = parseInt(hexColor.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                },
                borderColor: 'white',
                borderWidth: 1,
                width: ({ chart }) => (chart.chartArea || {}).width / labels.length - 1,
                height: ({ chart }) => (chart.chartArea || {}).height / roomTypes.length - 1,
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2.5,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: (context) => {
                            const { x, y, v } = context.raw;
                            return `${y} | ${x}: ${v}戶`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'category',
                    labels: roomTypes,
                    offset: true,
                },
                x: {
                    type: 'category',
                    labels: labels,
                    offset: true,
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                    }
                }
            }
        }
    });
}
