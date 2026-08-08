import {
    readFile
} from "node:fs/promises";

import {
    expect,
    test
} from "@playwright/test";

const foundFootageData = JSON.parse(
    await readFile(
        new URL(
            "../../data/theDivision2/collectibles/foundFootage.json",
            import.meta.url
        ),
        "utf8"
    )
);

const foundFootageItemIds =
    extractItems(foundFootageData)
        .slice(0, 11)
        .map(item => item.id);

test(
    "Übersicht zählt Item-IDs statt historische Kategorie-IDs",
    async ({ page }) => {
        const progressRows =
            foundFootageItemIds.map(
                (itemId, index) => ({
                    game_id: "theDivision2",
                    category_id:
                        `legacy-found-footage-${index % 2}`,
                    item_id: itemId,
                    created_at:
                        "2026-01-01T00:00:00.000Z"
                })
            );

        await installAuthenticatedSupabaseMock(
            page,
            progressRows
        );

        await page.goto(
            "/#game/theDivision2/collectibles"
        );

        const foundFootageCard =
            page.locator(
                '.category-card[data-category-id="foundFootage"]'
            );

        await expect(
            foundFootageCard.locator(
                ".overview-card-progress-count"
            )
        ).toHaveText("11 / 13");

        await expect(
            foundFootageCard.locator(
                ".overview-card-progress-percent"
            )
        ).toHaveText("85 %");
    }
);

async function installAuthenticatedSupabaseMock(
    page,
    progressRows
) {
    await page.addInitScript(
        ({ rows }) => {
            function result(data = []) {
                const query = {
                    select() { return query; },
                    eq() { return query; },
                    order() { return query; },
                    range() { return query; },
                    insert() { return query; },
                    delete() { return query; },
                    maybeSingle() {
                        return Promise.resolve({
                            data: data[0] ?? null,
                            error: null
                        });
                    },
                    then(resolve) {
                        return Promise.resolve({
                            data,
                            error: null
                        }).then(resolve);
                    }
                };

                return query;
            }

            window.supabase = {
                createClient() {
                    return {
                        auth: {
                            async getSession() {
                                return {
                                    data: {
                                        session: {
                                            user: {
                                                id: "test-user",
                                                email: "test@example.invalid"
                                            }
                                        }
                                    },
                                    error: null
                                };
                            },
                            async getUser() {
                                return {
                                    data: {
                                        user: {
                                            id: "test-user",
                                            email: "test@example.invalid"
                                        }
                                    },
                                    error: null
                                };
                            },
                            onAuthStateChange() {
                                return {
                                    data: {
                                        subscription: {
                                            unsubscribe() {}
                                        }
                                    }
                                };
                            },
                            async signInWithPassword() {
                                return {
                                    data: {},
                                    error: null
                                };
                            },
                            async signUp() {
                                return {
                                    data: {},
                                    error: null
                                };
                            },
                            async signOut() {
                                return {
                                    error: null
                                };
                            }
                        },
                        from(table) {
                            return result(
                                table === "user_progress"
                                    ? rows
                                    : []
                            );
                        }
                    };
                }
            };
        },
        {
            rows: progressRows
        }
    );

    await page.route(
        "https://cdn.jsdelivr.net/**",
        route => route.abort()
    );
}

function extractItems(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    if (Array.isArray(data?.groups)) {
        return data.groups.flatMap(
            group =>
                Array.isArray(group?.items)
                    ? group.items
                    : []
        );
    }

    if (Array.isArray(data?.sections)) {
        return data.sections.flatMap(
            extractItems
        );
    }

    return [];
}
