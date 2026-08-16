/* =========================================================
   Personal Game Tracker
   Category Progress View
   ========================================================= */

import {
    calculateCategoryProgress
} from "../services/progressCalculationService.js";


export function updateCategoryGroupProgress(
    groupElement
) {
    if (!groupElement) {
        return;
    }

    const progressElement =
        groupElement.querySelector(
            ".category-group-progress"
        );

    if (!progressElement) {
        return;
    }

    const items =
        groupElement.querySelectorAll(
            ".tracker-item"
        );

    const completedItems =
        groupElement.querySelectorAll(
            ".tracker-item.is-completed"
        );

    progressElement.textContent =
        `${completedItems.length} / ${items.length}`;
}


export function updateAllCategoryGroupProgress(
    container
) {
    if (!container) {
        return;
    }

    const groups =
        container.querySelectorAll(
            ".category-group"
        );

    for (
        const group of groups
    ) {
        updateCategoryGroupProgress(
            group
        );
    }
}


export function updateCurrentCategoryProgress(
    categoryData,
    progressData
) {
    const element =
        document.querySelector(
            "[data-current-category-progress]"
        );

    if (!element) {
        return;
    }

    const progress =
        calculateCategoryProgress(
            categoryData,
            progressData
        );

    const percent =
        progress.total > 0
            ? Math.round(
                (
                    progress.completed /
                    progress.total
                ) * 100
            )
            : 0;

    element.textContent =
        `${progress.completed} / ${progress.total} · ${percent} %`;
}
