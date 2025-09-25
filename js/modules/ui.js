// js/modules/ui.js

import { dom } from './dom.js';

export function showLoading(message) {
    dom.messageArea.innerHTML = `<div class="loader mx-auto"></div><p class="mt-4">${message}</p>`;
    dom.messageArea.classList.remove('hidden');
    dom.tabsContainer.classList.add('hidden');
    document.querySelectorAll('.report-header').forEach(el => el.style.display = 'none');
    ['ranking-report-content', 'price-band-report-content', 'unit-price-report-content', 'parking-report-content', 'velocity-report-content', 'price-grid-report-content', 'data-list-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
}

export function showMessage(message, isError = false) {
    const messageClass = isError ? 'bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg' : '';
    dom.messageArea.innerHTML = `<div class="${messageClass}">${message}</div>`;
    dom.messageArea.classList.remove('hidden');
    dom.tabsContainer.classList.add('hidden');
    document.querySelectorAll('.report-header').forEach(el => el.style.display = 'none');
}

export function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    return num.toLocaleString('zh-TW', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

export function switchTab(targetTab) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    const contentEl = document.getElementById(`${targetTab}-content`);
    const buttonEl = document.querySelector(`button[data-tab="${targetTab}"]`);
    if(contentEl) contentEl.classList.add('active');
    if(buttonEl) buttonEl.classList.add('active');

    // 這段邏輯因為與 renderAreaHeatmap 耦合，暫時保留在 app.js 中處理
    // if (targetTab === 'velocity-report' && analysisDataCache) {
    //     renderAreaHeatmap();
    // }
}

export function createPaginationControls(container, totalItems, currentPage, pageSize, onPageChange) {
    container.innerHTML = '';
    if (totalItems === 0) {
        container.innerHTML = `<span>共 0 筆資料</span>`;
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    let paginationHtml = `<div class="flex-1">共 ${totalItems} 筆資料</div><div class="flex items-center space-x-1">`;
    
    paginationHtml += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;

    let startPage, endPage;
    if (totalPages <= 9) {
        startPage = 1;
        endPage = totalPages;
    } else {
        if (currentPage <= 5) {
            startPage = 1;
            endPage = 7;
        } else if (currentPage + 4 >= totalPages) {
            startPage = totalPages - 8;
            endPage = totalPages;
        } else {
            startPage = currentPage - 4;
            endPage = currentPage + 3;
        }
    }

    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHtml += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>&raquo;</button>`;
    paginationHtml += '</div>';
    
    container.innerHTML = paginationHtml;
    
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.currentTarget.dataset.page);
            if (!isNaN(page)) {
                onPageChange(page);
            }
        });
    });

    const styleId = 'pagination-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .pagination-btn { background-color: #374151; color: #d1d5db; font-weight: 500; border: none; padding: 0.5rem 0.75rem; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s; }
            .pagination-btn:hover:not(:disabled) { background-color: #06b6d4; color: white; }
            .pagination-btn.active { background-color: #06b6d4; color: white; cursor: default; }
            .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .pagination-ellipsis { color: #9ca3af; padding: 0.5rem 0.25rem; }
        `;
        document.head.appendChild(style);
    }
}

/**
 * 將 YYYY-Www 格式的週數轉換為日期區間字串
 * @param {string} weekString - 例如 "2025-W29"
 * @returns {string} - 例如 "2025/07/14 ~ 2025/07/20"
 */
export function getDateRangeOfWeek(weekString) {
    try {
        const [year, weekNumber] = weekString.replace('W', '').split('-').map(Number);
        
        // 找到該年的1月4日，這一天保證在第一週
        const simple = new Date(year, 0, 4);
        // 取得1月4日是星期幾 (0=週日, 1=週一...)
        const dayOfWeek = simple.getDay() || 7; // 將週日(0)視為7
        // 移至該週的週一
        simple.setDate(simple.getDate() - dayOfWeek + 1);
        
        // 計算目標週的開始日期
        const weekStart = new Date(simple);
        weekStart.setDate(simple.getDate() + (weekNumber - 1) * 7);
        
        // 計算結束日期
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dt = String(d.getDate()).padStart(2, '0');
            return `${y}/${m}/${dt}`;
        };

        return `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`;
    } catch (e) {
        console.error("解析週數失敗:", weekString, e);
        return "日期解析錯誤";
    }
}

// ▼▼▼ 【這就是修正的部分】 ▼▼▼
/**
 * 計算給定陣列的特定分位數值 (前端版本)
 * @param {number[]} sortedArr - 一個已經排序好的數字陣列
 * @param {number} q - 要計算的分位數 (例如 0.5 代表中位數)
 * @returns {number} 計算後的分位數值
 */
export function calculateQuantile(sortedArr, q) {
    if (!sortedArr || sortedArr.length === 0) return 0;
    const pos = (sortedArr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
      return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
    } else {
      return sortedArr[base];
    }
}
// ▲▲▲ 【修正結束】 ▲▲▲
