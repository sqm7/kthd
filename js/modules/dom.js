// js/modules/dom.js

// 將所有DOM元素的引用集中管理
export const dom = {
    // Filter elements
    filterCard: document.getElementById('filter-card'),
    countySelect: document.getElementById('county'),
    districtContainer: document.getElementById('district-container'),
    districtInputArea: document.getElementById('district-input-area'),
    districtSuggestions: document.getElementById('district-suggestions'),
    districtFilterWrapper: document.getElementById('district-filter-wrapper'),
    clearDistrictsBtn: document.getElementById('clear-districts-btn'),
    typeSelect: document.getElementById('type'),
    buildingTypeSelect: document.getElementById('building-type'),
    projectNameInput: document.getElementById('project-name-input'),
    projectNameContainer: document.getElementById('project-name-container'),
    projectNameSuggestions: document.getElementById('project-name-suggestions'),
    projectFilterWrapper: document.getElementById('project-filter-wrapper'),
    clearProjectsBtn: document.getElementById('clear-projects-btn'),
    dateRangeSelect: document.getElementById('date-range'),
    dateStartInput: document.getElementById('date-start'),
    dateEndInput: document.getElementById('date-end'),
    setTodayBtn: document.getElementById('set-today-btn'),
    analyzeBtn: document.getElementById('analyze-btn'),
    searchBtn: document.getElementById('search-btn'),
    
    // Results container and tabs
    resultsContainer: document.getElementById('results-container'),
    tabsContainer: document.getElementById('tabs-container'),
    messageArea: document.getElementById('message-area'),
    
    // Ranking report
    rankingReportContent: document.getElementById('ranking-report-content'),
    metricCardsContainer: document.getElementById('metric-cards-container'),
    rankingTable: document.getElementById('ranking-table'),
    rankingChartContainer: document.getElementById('ranking-chart-container'),
    rankingPaginationControls: document.createElement('div'), // Pagination for ranking table
    excludeCommercialToggle: document.getElementById('exclude-commercial-toggle'),

    // Price band report
    priceBandReportContent: document.getElementById('price-band-report-content'),
    priceBandChart: document.getElementById('price-band-chart'),
    priceBandTable: document.getElementById('price-band-table'),
    priceBandRoomFilterContainer: document.getElementById('price-band-room-filter-container'),

    // Unit price report
    unitPriceReportContent: document.getElementById('unit-price-report-content'),
    avgTypeToggle: document.getElementById('avg-type-toggle'),
    residentialStatsTableContainer: document.getElementById('residential-stats-table-container'),
    officeStatsTableContainer: document.getElementById('office-stats-table-container'),
    storeStatsTableContainer: document.getElementById('store-stats-table-container'),
    residentialStatsExtraInfo: document.getElementById('residential-stats-extra-info'),
    officeStatsExtraInfo: document.getElementById('office-stats-extra-info'),
    storeStatsExtraInfo: document.getElementById('store-stats-extra-info'),
    typeComparisonTableContainer: document.getElementById('type-comparison-table-container'),

// Parking report
    parkingReportContent: document.getElementById('parking-report-content'),
    parkingRatioTableContainer: document.getElementById('parking-ratio-table-container'),
    parkingRatioChartContainer: document.getElementById('parking-ratio-chart-container'), // <-- 新增這一行
    avgPriceByTypeTableContainer: document.getElementById('avg-price-by-type-table-container'),
    rampPlanePriceByFloorTableContainer: document.getElementById('ramp-plane-price-by-floor-table-container'),
    
    // Sales velocity report
    velocityReportContent: document.getElementById('velocity-report-content'),
    velocityRoomFilterContainer: document.getElementById('velocity-room-filter-container'),
    velocitySubTabsContainer: document.getElementById('velocity-sub-tabs-container'),
    salesVelocityChart: document.getElementById('sales-velocity-chart'),
    velocityTableContainer: document.getElementById('velocity-table-container'),
    velocityMetricToggle: document.getElementById('velocity-metric-toggle'), // 【關鍵修正】
    areaHeatmapChart: document.getElementById('area-heatmap-chart'),
    heatmapDetailsContainer: document.getElementById('heatmap-details-container'),
    heatmapDetailsContent: document.getElementById('heatmap-details-content'),
    heatmapMetricToggle: document.getElementById('heatmap-metric-toggle'),
    heatmapDetailsControls: document.getElementById('heatmap-details-controls'),
    heatmapMinAreaInput: document.getElementById('heatmap-min-area-input'),
    heatmapMaxAreaInput: document.getElementById('heatmap-max-area-input'),
    heatmapIntervalInput: document.getElementById('heatmap-interval-input'),
    heatmapIntervalIncrementBtn: document.getElementById('heatmap-interval-increment'),
    heatmapIntervalDecrementBtn: document.getElementById('heatmap-interval-decrement'),
    
    // Price grid report
    priceGridReportContent: document.getElementById('price-grid-report-content'),
    priceGridProjectFilterContainer: document.getElementById('price-grid-project-filter-container'),
    horizontalPriceGridContainer: document.getElementById('horizontal-price-grid-container'),
    unitColorLegendContainer: document.getElementById('unit-color-legend-container'),
    floorPremiumInput: document.getElementById('floor-premium-input'),
    analyzeHeatmapBtn: document.getElementById('analyze-heatmap-btn'),
    backToGridBtn: document.getElementById('back-to-grid-btn'),
    heatmapInfoContainer: document.getElementById('heatmap-info-container'),
    heatmapLegendContainer: document.getElementById('heatmap-legend-container'),
    heatmapColorLegend: document.getElementById('heatmap-color-legend'),
    heatmapIconLegend: document.getElementById('heatmap-icon-legend'),
    heatmapSummaryTableContainer: document.getElementById('heatmap-summary-table-container'),
    heatmapHorizontalComparisonTableContainer: document.getElementById('heatmap-horizontal-comparison-table-container'),
    sharePriceGridBtn: document.getElementById('share-price-grid-btn'),

    // Data list
    dataListContent: document.getElementById('data-list-content'),
    tableContainer: document.getElementById('table-container'),
    resultsTable: document.getElementById('results-table'),
    paginationControls: document.getElementById('pagination-controls'),

    // Modal
    modal: document.getElementById('details-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalContent: document.getElementById('modal-content'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    
    // Share Modal
    shareModal: document.getElementById('share-modal'),
    shareModalCloseBtn: document.getElementById('share-modal-close-btn'),
    shareUrlInput: document.getElementById('share-url-input'),
    copyShareUrlBtn: document.getElementById('copy-share-url-btn'),
    copyFeedback: document.getElementById('copy-feedback'),

    // User status
    userStatusContainer: document.getElementById('user-status-container'),
};
