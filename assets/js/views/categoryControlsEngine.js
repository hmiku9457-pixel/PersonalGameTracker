/* =========================================================
   Personal Game Tracker
   Category Controls Engine
   ========================================================= */

import {
    getCurrentLocale
} from "../services/languageService.js";


const categoryElementCache =
    new WeakMap();

const scheduledCategoryUpdateFrames =
    new WeakMap();

const categoryStateChangeHandlers =
    new WeakMap();


export function resetCategoryControlsEngine(
    container
) {
    const pendingUpdateFrame =
        scheduledCategoryUpdateFrames.get(
            container
        );

    if (
        pendingUpdateFrame !==
        undefined
    ) {
        cancelAnimationFrame(
            pendingUpdateFrame
        );
    }

    scheduledCategoryUpdateFrames.delete(
        container
    );

    categoryElementCache.delete(
        container
    );

    const previousHandler =
        categoryStateChangeHandlers.get(
            container
        );

    if (previousHandler) {
        container.removeEventListener(
            "tracker-item-state-changed",
            previousHandler
        );

        categoryStateChangeHandlers.delete(
            container
        );
    }
}


export function setCategoryStateChangeHandler(
    container,
    handler
) {
    const previousHandler =
        categoryStateChangeHandlers.get(
            container
        );

    if (previousHandler) {
        container.removeEventListener(
            "tracker-item-state-changed",
            previousHandler
        );
    }

    container.addEventListener(
        "tracker-item-state-changed",
        handler
    );

    categoryStateChangeHandlers.set(
        container,
        handler
    );
}


export function scheduleCategoryControlsUpdate(
    container,
    state,
    resultCount,
    emptyMessage,
    formatResultCount
) {
    const previousFrame =
        scheduledCategoryUpdateFrames.get(
            container
        );

    if (
        previousFrame !==
        undefined
    ) {
        cancelAnimationFrame(
            previousFrame
        );
    }

    const frame =
        requestAnimationFrame(
            () => {
                scheduledCategoryUpdateFrames.delete(
                    container
                );

                if (
                    !container.isConnected
                ) {
                    return;
                }

                applyCategoryControls(
                    container,
                    state,
                    resultCount,
                    emptyMessage,
                    formatResultCount
                );
            }
        );

    scheduledCategoryUpdateFrames.set(
        container,
        frame
    );
}


export function applyCategoryControls(
    container,
    state,
    resultCount,
    emptyMessage,
    formatResultCount
) {
    const pendingFrame =
        scheduledCategoryUpdateFrames.get(
            container
        );

    if (
        pendingFrame !==
        undefined
    ) {
        cancelAnimationFrame(
            pendingFrame
        );

        scheduledCategoryUpdateFrames.delete(
            container
        );
    }

    const categoryElements =
        getCategoryElements(
            container
        );

    const query =
        normalizeSearchText(
            state.query
        );

    const searchTerms =
        query
            .split(/\s+/)
            .filter(Boolean);

    const searchIsActive =
        searchTerms.length > 0;

    const statusIsActive =
        state.status !==
            "all";

    const groups =
        categoryElements.groups;

    if (
        searchIsActive &&
        !state.searchActive
    ) {
        state.searchActive =
            true;

        state.groupOpenState.clear();

        for (
            const group
            of groups
        ) {
            state.groupOpenState.set(
                group,
                group.open
            );
        }
    }

    if (
        !searchIsActive &&
        state.searchActive
    ) {
        for (
            const group
            of groups
        ) {
            if (
                state.groupOpenState.has(
                    group
                )
            ) {
                group.open =
                    state.groupOpenState.get(
                        group
                    );
            }
        }

        state.groupOpenState.clear();

        state.searchActive =
            false;
    }

    if (state.sortDirty) {
        sortCategoryItems(
            categoryElements,
            state.sort
        );

        state.sortDirty =
            false;
    }

    let visibleItemCount =
        0;

    for (
        const item
        of categoryElements.items
    ) {
        const searchText =
            getItemSearchText(
                item
            );

        const matchesSearch =
            searchTerms.every(
                term =>
                    searchText.includes(
                        term
                    )
            );

        const matchesStatus =
            matchesStatusFilter(
                item,
                state.status
            );

        const visible =
            matchesSearch &&
            matchesStatus;

        item.hidden =
            !visible;

        if (visible) {
            visibleItemCount++;
        }
    }

    for (
        const list
        of categoryElements.lists
    ) {
        const listEntries =
            categoryElements.listItems.get(
                list
            ) ?? [];

        list.hidden =
            !listEntries.some(
                item =>
                    !item.hidden
            );
    }

    for (
        const group
        of groups
    ) {
        const groupEntries =
            categoryElements.groupItems.get(
                group
            ) ?? [];

        const hasVisibleItem =
            groupEntries.some(
                item =>
                    !item.hidden
            );

        group.hidden =
            !hasVisibleItem;

        if (
            searchIsActive &&
            hasVisibleItem
        ) {
            group.open =
                true;
        }
    }

    if (searchIsActive) {
        resultCount.textContent =
            formatResultCount(
                visibleItemCount,
                true
            );

        resultCount.hidden =
            false;
    }
    else if (statusIsActive) {
        resultCount.textContent =
            formatResultCount(
                visibleItemCount,
                false
            );

        resultCount.hidden =
            false;
    }
    else {
        resultCount.textContent =
            "";

        resultCount.hidden =
            true;
    }

    const filteringIsActive =
        searchIsActive ||
        statusIsActive;

    emptyMessage.hidden =
        !(
            filteringIsActive &&
            visibleItemCount === 0
        );
}


function normalizeSearchText(
    value
) {
    return String(
        value ?? ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /ß/g,
            "ss"
        )
        .toLowerCase()
        .trim();
}


function getItemSearchText(
    itemElement
) {
    if (
        itemElement.dataset.searchText
    ) {
        return itemElement.dataset
            .searchText;
    }

    const values = [];

    if (
        itemElement.dataset.itemId
    ) {
        values.push(
            itemElement.dataset.itemId
        );
    }

    const name =
        itemElement.querySelector(
            ".tracker-item-name"
        );

    if (name?.textContent) {
        values.push(
            name.textContent
        );
    }

    const description =
        itemElement.querySelector(
            ".tracker-item-description"
        );

    if (
        description?.textContent
    ) {
        values.push(
            description.textContent
        );
    }

    const detailElements =
        itemElement.querySelectorAll(
            [
                ".tracker-item-details dt",
                ".tracker-item-details dd"
            ].join(", ")
        );

    for (
        const detailElement
        of detailElements
    ) {
        if (
            detailElement.textContent
        ) {
            values.push(
                detailElement.textContent
            );
        }
    }

    const searchText =
        normalizeSearchText(
            values.join(" ")
        );

    itemElement.dataset.searchText =
        searchText;

    return searchText;
}


function getItemSortName(
    itemElement
) {
    if (
        itemElement.dataset.sortName
    ) {
        return itemElement.dataset
            .sortName;
    }

    const name =
        itemElement.querySelector(
            ".tracker-item-name"
        );

    const sortName =
        String(
            name?.textContent ??
            itemElement.dataset.itemId ??
            ""
        )
            .trim();

    itemElement.dataset.sortName =
        sortName;

    return sortName;
}


function matchesStatusFilter(
    item,
    status
) {
    if (
        status === "all"
    ) {
        return true;
    }

    const completed =
        item.classList.contains(
            "is-completed"
        );

    if (
        status === "completed"
    ) {
        return completed;
    }

    if (
        status === "incomplete"
    ) {
        return !completed;
    }

    return true;
}


function getCategoryElements(
    container
) {
    const cached =
        categoryElementCache.get(
            container
        );

    if (cached) {
        return cached;
    }

    const items =
        Array.from(
            container.querySelectorAll(
                ".tracker-item"
            )
        );

    const lists =
        Array.from(
            container.querySelectorAll(
                ".tracker-list"
            )
        );

    const groups =
        Array.from(
            container.querySelectorAll(
                ".category-group"
            )
        );

    const listItems =
        new Map();

    for (
        const list
        of lists
    ) {
        listItems.set(
            list,
            Array.from(
                list.querySelectorAll(
                    ":scope > .tracker-item"
                )
            )
        );
    }

    const groupItems =
        new Map();

    for (
        const group
        of groups
    ) {
        groupItems.set(
            group,
            Array.from(
                group.querySelectorAll(
                    ".tracker-item"
                )
            )
        );
    }

    const result = {
        items,
        lists,
        groups,
        listItems,
        groupItems
    };

    categoryElementCache.set(
        container,
        result
    );

    return result;
}


function sortCategoryItems(
    categoryElements,
    direction
) {
    const locale =
        getCurrentLocale();

    for (
        const list
        of categoryElements.lists
    ) {
        const items =
            categoryElements.listItems.get(
                list
            ) ?? [];

        items.sort(
            (first, second) => {
                const firstName =
                    getItemSortName(
                        first
                    );

                const secondName =
                    getItemSortName(
                        second
                    );

                const comparison =
                    firstName.localeCompare(
                        secondName,
                        locale,
                        {
                            sensitivity:
                                "base",

                            numeric:
                                true
                        }
                    );

                return direction ===
                    "desc"
                    ? -comparison
                    : comparison;
            }
        );

        list.append(
            ...items
        );
    }
}
