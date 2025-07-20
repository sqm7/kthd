// js/modules/renderers/uiComponents.js

import { dom } from '../dom.js';
import * as ui from '../ui.js';
import { state } from '../state.js';

export function renderPagination() {
    ui.createPaginationControls(dom.paginationControls, state.totalRecords, state.currentPage, state.pageSize, (page) => {
        state.currentPage = page;
        // This dynamic import is a bit tricky, let's call it from app.js instead.
        import('../app.js').then(app => app.mainFetchData());
    });
}

export function renderRankingPagination(totalItems) {
    ui.createPaginationControls(dom.rankingPaginationControls, totalItems, state.rankingCurrentPage, state.rankingPageSize, (page) => {
        state.rankingCurrentPage = page;
        // This dynamic import is a bit tricky, let's call it from app.js instead.
        import('./reports.js').then(reports => reports.renderRankingReport());
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
            removeBtn.dataset.name = name;
            tagElement.appendChild(removeBtn);
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                 // This creates a circular dependency, it's better to handle this in eventHandlers.js
                import('../app.js').then(app => app.removeDistrict(name));
            });
            dom.districtContainer.insertBefore(tagElement, dom.districtInputArea);
       });
    } else {
        dom.districtInputArea.classList.remove('hidden');
    }
    dom.clearDistrictsBtn.classList.toggle('hidden', state.selectedDistricts.length === 0);
}