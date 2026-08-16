/* =========================================================
   Personal Game Tracker
   Progress Calculation Service
   ========================================================= */

export function getCompletedCountForCategory(
    progressData,
    categoryId
) {
    if (
        typeof categoryId !== "string" ||
        !progressData?.completedByCategory
    ) {
        return 0;
    }

    const value =
        Number(
            progressData.completedByCategory[
                categoryId
            ]
        );

    return Number.isInteger(value) &&
        value > 0
            ? value
            : 0;
}


export function getExternalItemStatus(
    item,
    progressData
) {
    if (
        !item?.id ||
        !progressData?.progress
    ) {
        return null;
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            progressData.progress,
            item.id
        )
    ) {
        return null;
    }

    const value =
        progressData.progress[
            item.id
        ];

    if (
        typeof value === "boolean"
    ) {
        return value;
    }

    if (
        value &&
        typeof value === "object"
    ) {
        return Boolean(
            value.found ||
            value.completed ||
            value.collected ||
            value.unlocked
        );
    }

    return Boolean(
        value
    );
}


export function isItemCompleted(
    item,
    progressData = null
) {
    const externalStatus =
        getExternalItemStatus(
            item,
            progressData
        );

    if (
        externalStatus !== null
    ) {
        return externalStatus;
    }

    return Boolean(
        item?.found ||
        item?.completed ||
        item?.collected ||
        item?.unlocked
    );
}


export function calculateItemsProgress(
    items,
    progressData = null
) {
    if (!Array.isArray(items)) {
        return {
            completed: 0,
            total: 0
        };
    }

    let completed =
        0;

    for (const item of items) {
        if (
            isItemCompleted(
                item,
                progressData
            )
        ) {
            completed++;
        }
    }

    return {
        completed,
        total:
            items.length
    };
}


export function calculateGroupedProgress(
    groups,
    progressData = null
) {
    if (!Array.isArray(groups)) {
        return {
            completed: 0,
            total: 0
        };
    }

    let completed =
        0;

    let total =
        0;

    for (const group of groups) {
        const result =
            calculateItemsProgress(
                group?.items ?? [],
                progressData
            );

        completed +=
            result.completed;

        total +=
            result.total;
    }

    return {
        completed,
        total
    };
}


export function calculateCategoryProgress(
    data,
    progressData = null
) {
    if (!data) {
        return {
            completed: 0,
            total: 0
        };
    }

    if (Array.isArray(data)) {
        return calculateItemsProgress(
            data,
            progressData
        );
    }

    if (
        Array.isArray(
            data.items
        )
    ) {
        return calculateItemsProgress(
            data.items,
            progressData
        );
    }

    if (
        Array.isArray(
            data.groups
        )
    ) {
        return calculateGroupedProgress(
            data.groups,
            progressData
        );
    }

    if (
        Array.isArray(
            data.sections
        )
    ) {
        let completed =
            0;

        let total =
            0;

        for (
            const section
            of data.sections
        ) {
            const result =
                calculateCategoryProgress(
                    section,
                    progressData
                );

            completed +=
                result.completed;

            total +=
                result.total;
        }

        return {
            completed,
            total
        };
    }

    return {
        completed: 0,
        total: 0
    };
}
