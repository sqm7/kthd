// js/modules/renderers/uiComponents.js

import { dom } from '../dom.js';
import * as ui from '../ui.js';
import { state } from '../state.js';
// 移除 'app.js' 的動態導入，解決循環依賴問題

export function renderPagination() {
    // 讓 onPageChange 回呼直接由 eventHandlers 處理，避免在此處導入 app.js
    ui.createPaginationControls(dom.paginationControls, state.totalRecords, state.currentPage, state.pageSize, (page) => {
        state.currentPage = page;
        // The actual call to mainFetchData will be handled by the event handler setup in app.js
        document.dispatchEvent(new CustomEvent('pageChange', { detail: { type: 'main' } }));
    });
}

export function renderRankingPagination(totalItems) {
    // 同上，改為發送自訂事件
    ui.createPaginationControls(dom.rankingPaginationControls, totalItems, state.rankingCurrentPage, state.rankingPageSize, (page) => {
        state.rankingCurrentPage = page;
        document.dispatchEvent(new CustomEvent('pageChange', { detail: { type: 'ranking' } }));
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
            removeBtn.dataset.name = name; // 只設定 data-name 供事件委派使用
            tagElement.appendChild(removeBtn);
            // 【關鍵修正】移除這裡的 addEventListener，改由 eventHandlers.js 統一處理
            dom.districtContainer.insertBefore(tagElement, dom.districtInputArea);
       });
    } else {
        dom.districtInputArea.classList.remove('hidden');
    }
    dom.clearDistrictsBtn.classList.toggle('hidden', state.selectedDistricts.length === 0);
}