// supabase_project/js/modules/ui.js (修正後)

import { dom } from './dom.js';
import { state } from './state.js';
import * as reportRenderer from './renderers/reports.js';

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {Date} date - 日期物件
 * @returns {string} 格式化後的日期字串
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * 顯示訊息
 * @param {string} message - 要顯示的訊息
 * @param {boolean} isError - 是否為錯誤訊息
 */
export function showMessage(message, isError = false) {
    dom.messageArea.textContent = message;
    dom.messageArea.className = `text-center p-8 ${isError ? 'text-red-400' : 'text-gray-400'}`;
    dom.messageArea.classList.remove('hidden');
    dom.tabsContainer.classList.add('hidden');
    
    // 隱藏所有報告內容
    const allContent = document.querySelectorAll('.tab-content');
    allContent.forEach(content => content.classList.add('hidden'));
}

/**
 * 隱藏訊息區域
 */
export function hideMessage() {
    dom.messageArea.classList.add('hidden');
    dom.tabsContainer.classList.remove('hidden');
}

/**
 * 更新多選標籤的顯示
 * @param {HTMLElement} container - 標籤容器
 * @param {string[]} items - 要顯示的項目陣列
 * @param {string} placeholder - 沒有項目時的預留文字
 * @param {string} type - 類型 ('district' or 'project')
 */
export function updateMultiSelectTags(container, items, placeholder, type) {
    const inputElement = type === 'district' ? dom.districtInputArea : dom.projectNameInput;
    const clearBtn = type === 'district' ? dom.clearDistrictsBtn : dom.clearProjectsBtn;

    container.querySelectorAll('.multi-tag').forEach(tag => tag.remove());
    
    if (items.length > 0) {
        items.forEach(item => {
            const tag = document.createElement('div');
            tag.className = 'multi-tag';
            tag.textContent = item;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'multi-tag-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.dataset.name = item;
            tag.appendChild(removeBtn);
            container.insertBefore(tag, inputElement);
        });
        inputElement.placeholder = '新增更多...';
        clearBtn.classList.remove('hidden');
    } else {
        inputElement.placeholder = placeholder;
        clearBtn.classList.add('hidden');
    }
}


/**
 * 顯示建議列表
 * @param {string[]} suggestions - 建議項目陣列
 * @param {HTMLElement} container - 建議列表的容器
 * @param {string} type - 'district' 或 'project'
 */
export function showSuggestions(suggestions, container, type) {
    container.innerHTML = '';
    if (suggestions.length === 0) {
        container.classList.add('hidden');
        return;
    }
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.className = 'p-2 hover:bg-gray-700 cursor-pointer suggestion-item';
        div.dataset.type = type;
        div.dataset.value = suggestion;
        container.appendChild(div);
    });
    container.classList.remove('hidden');
}


/**
 * 切換頁籤 (這是修正雙重捲軸問題的核心)
 * @param {string} tabId - 要顯示的頁籤ID
 * @param {boolean} pushState - 是否更新瀏覽器歷史紀錄
 */
export function switchTab(tabId, pushState = true) {
    // 更新URL
    if (pushState) {
        const url = new URL(window.location);
        url.searchParams.set('tab', tabId);
        window.history.pushState({ tabId }, '', url);
    }
    state.activeTab = tabId;

    // 更新按鈕樣式
    dom.tabsContainer.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // 隱藏所有內容區塊
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // 顯示目標內容區塊
    const activeContent = document.getElementById(`${tabId}-content`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }

    // =================================================================
    // ▼▼▼ 這是最關鍵的修正 ▼▼▼
    // =================================================================
    // 只有在不是「垂直水平分析」(銷控表) 的頁籤時，才去設定最小高度
    // 如果是銷控表，則將最小高度設為 'auto'，讓它可以自由延展，從而消除內部捲軸
    const resultsContainer = dom.resultsContainer;
    if (tabId === 'price-grid-report') {
        resultsContainer.style.minHeight = 'auto'; 
    } else {
        // 對於其他頁籤，維持原有的高度計算，以避免頁面跳動
        if (activeContent) {
            // 使用 requestAnimationFrame 確保在下一次重繪前計算高度，避免閃爍
            requestAnimationFrame(() => {
                const contentHeight = activeContent.scrollHeight;
                resultsContainer.style.minHeight = `${contentHeight}px`;
            });
        }
    }
    // =================================================================
    // ▲▲▲ 修正結束 ▲▲▲
    // =================================================================

    // 如果切換到資料列表，重新渲染表格和分頁
    if (tabId === 'data-list' && state.currentData) {
        reportRenderer.renderTable(state.currentData, state.currentPage);
    }
}
