// js/modules/config.js

// ▼▼▼ 【新增處】提供 app.js 需要的縣市與行政區資料 ▼▼▼
export const districtData = {
    "台北市": [
        "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", 
        "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
    ],
    "新北市": [
        "板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", 
        "樹林區", "鶯歌區", "三峽區", "淡水區", "汐止區", "瑞芳區", 
        "土城區", "蘆洲區", "五股區", "泰山區", "林口區", "深坑區", 
        "石碇區", "坪林區", "三芝區", "石門區", "八里區", "平溪區", 
        "雙溪區", "貢寮區", "金山區", "萬里區", "烏來區"
    ],
    // 您可以根據需求自行增加更多縣市
};
// ▲▲▲ 【新增結束】 ▲▲▲


// 網站使用的主要顏色主題
export const THEME_COLORS = {
    'dark-bg': '#111827',
    'dark-card': '#1f2937',
    'cyan-accent': '#22d3ee',
    'purple-accent': '#a855f7',
    'light-text': '#f3f4f6',
    'dark-text': '#9ca3af'
};

// 縣市代碼，用於 API 或其他需要代碼的地方
export const countyCodeMap = {
    "台北市": "A",
    "新北市": "F",
    // ... 其他縣市代碼
};

// 價格級距與對應顏色，用於價差網格圖
export const priceTiers = [
    { max: 40, color: 'bg-blue-900', legendColor: 'bg-blue-900' },
    { max: 50, color: 'bg-blue-800', legendColor: 'bg-blue-800' },
    { max: 60, color: 'bg-blue-700', legendColor: 'bg-blue-700' },
    { max: 70, color: 'bg-cyan-800', legendColor: 'bg-cyan-800' },
    { max: 80, color: 'bg-cyan-700', legendColor: 'bg-cyan-700' },
    { max: 90, color: 'bg-cyan-600', legendColor: 'bg-cyan-600' },
    { max: 100, color: 'bg-emerald-700', legendColor: 'bg-emerald-700' },
    { max: 120, color: 'bg-emerald-600', legendColor: 'bg-emerald-600' },
    { max: 140, color: 'bg-yellow-600', legendColor: 'bg-yellow-600' },
    { max: 160, color: 'bg-amber-600', legendColor: 'bg-amber-600' },
    { max: 180, color: 'bg-orange-600', legendColor: 'bg-orange-600' },
    { max: 200, color: 'bg-red-700', legendColor: 'bg-red-700' },
    { max: Infinity, color: 'bg-red-600', legendColor: 'bg-red-600' }
];

// 熱力圖的顏色配置
export const heatmapColorRanges = [
    { from: 15, to: Infinity, name: '> 15%', color: '#991b1b' }, // 深紅
    { from: 10, to: 15, name: '10-15%', color: '#dc2626' },
    { from: 7, to: 10, name: '7-10%', color: '#f97316' },
    { from: 5, to: 7, name: '5-7%', color: '#f59e0b' },
    { from: 3, to: 5, name: '3-5%', color: '#eab308' },
    { from: 1, to: 3, name: '1-3%', color: '#84cc16' }, // 淺綠
    { from: -1, to: 1, name: '-1% ~ 1%', color: '#374151' }, // 平盤 (灰色)
    { from: -3, to: -1, name: '-3% ~ -1%', color: '#0ea5e9' }, // 淺藍
    { from: -5, to: -3, name: '-5% ~ -3%', color: '#2563eb' },
    { from: -7, to: -5, name: '-7% ~ -5%', color: '#4f46e5' },
    { from: -10, to: -7, name: '-10% ~ -7%', color: '#7c3aed' },
    { from: -Infinity, to: -10, name: '< -10%', color: '#9333ea' }, // 深紫
];

// 特殊交易圖示配置
export const specialTransactionConfig = {
    isTopFloor: { icon: 'fas fa-crown text-yellow-400', label: '頂樓戶' },
    hasSpecialDeal: { icon: 'fas fa-handshake text-red-500', label: '親友/特殊交易' },
    isLowestFloor: { icon: 'fas fa-leaf text-green-500', label: '露台/約定專用' },
    hasMultipleParking: { icon: 'fas fa-car-side text-blue-400', label: '含2車位(含)以上' },
    isPenthouse: { icon: 'fas fa-gem text-purple-400', label: '樓中樓' },
};