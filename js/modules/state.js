// js/modules/state.js

import { dom } from './dom.js';
import { countyCodeMap } from './config.js';

// 使用一個物件來封裝所有狀態，方便管理和傳遞
export const state = {
    currentPage: 1,
    pageSize: 30,
    totalRecords: 0,
    selectedDistricts: [],
    selectedProjects: [],
    suggestionDebounceTimer: null,
    analysisDataCache: null,
    currentSort: { key: 'saleAmountSum', order: 'desc' },
    rankingCurrentPage: 1,
    rankingPageSize: 15,
    currentAverageType: 'arithmetic',
    currentVelocityView: 'monthly',
    selectedVelocityRooms: [],
    selectedPriceBandRoomTypes: [],
    selectedPriceGridProject: null,
    isHeatmapActive: false,
    currentLegendFilter: { type: null, value: null },
    areaHeatmapChart: null,
    lastHeatmapDetails: null, 
    currentHeatmapDetailMetric: 'median',
    excludeCommercialInRanking: false, // 核心指標與排名報告中，是否排除商辦店面的開關狀態
};

// 根據當前狀態獲取篩選條件
export function getFilters() {
    const filters = {};
    if (dom.countySelect.value) filters.countyCode = countyCodeMap[dom.countySelect.value] || '';
    if (state.selectedDistricts.length > 0) filters.districts = state.selectedDistricts;
    if (dom.typeSelect.value) filters.type = dom.typeSelect.value;
    if (dom.dateStartInput.value) filters.dateStart = dom.dateStartInput.value;
    if (dom.dateEndInput.value) filters.dateEnd = dom.dateEndInput.value;
    if (dom.buildingTypeSelect.value) filters.buildingType = dom.buildingTypeSelect.value;
    if (state.selectedProjects.length > 0) filters.projectNames = state.selectedProjects;
    
    // 將開關的狀態加入到篩選條件中
    filters.excludeCommercial = state.excludeCommercialInRanking;
    
    return filters;
}
