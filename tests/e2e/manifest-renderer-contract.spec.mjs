import {
    expect,
    test
} from "@playwright/test";

const COMMS_MANIFEST =
    "**/data/theDivision2/collectibles/comms/manifest.json";

const ROUTES = {
    comms:
        "#game/theDivision2/collectibles/comms",

    missions:
        "#game/theDivision2/collectibles/comms/missions"
};

test.beforeEach(async ({ page }) => {
    await installSupabaseMock(
        page
    );
});

test("unbekannter Manifest-Renderer fällt nicht auf die generische Ansicht zurück", async ({ page }) => {
    await mutateJsonResponse(
        page,
        COMMS_MANIFEST,
        manifest => ({
            ...manifest,
            renderer:
                "unknown-renderer"
        })
    );

    await page.goto(
        `/${ROUTES.comms}`
    );

    await expect(
        page.locator(
            ".error-message"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".comms-section-card"
        )
    ).toHaveCount(0);
});

test("Comms-Listenansicht ohne dataFile verwendet keinen stillen Missions-Fallback", async ({ page }) => {
    await mutateJsonResponse(
        page,
        COMMS_MANIFEST,
        manifest => ({
            ...manifest,
            categories:
                manifest.categories.map(
                    category => {
                        if (
                            category.id !==
                            "missions"
                        ) {
                            return category;
                        }

                        const copy = {
                            ...category
                        };

                        delete copy.dataFile;

                        return copy;
                    }
                )
        })
    );

    await page.goto(
        `/${ROUTES.missions}`
    );

    await expect(
        page.locator(
            ".error-message"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".tracker-item"
        )
    ).toHaveCount(0);
});

async function mutateJsonResponse(
    page,
    urlPattern,
    mutate
) {
    await page.route(
        urlPattern,
        async route => {
            const response =
                await route.fetch();

            const json =
                await response.json();

            await route.fulfill({
                response,
                json:
                    mutate(
                        json
                    )
            });
        }
    );
}

async function installSupabaseMock(page) {
    await page.addInitScript(() => {
        function result(
            data = []
        ) {
            const query = {
                select() {
                    return query;
                },

                eq() {
                    return query;
                },

                order() {
                    return query;
                },

                range() {
                    return query;
                },

                insert() {
                    return query;
                },

                delete() {
                    return query;
                },

                maybeSingle() {
                    return Promise.resolve({
                        data:
                            data[0] ??
                            null,
                        error:
                            null
                    });
                },

                then(resolve) {
                    return Promise.resolve({
                        data,
                        error:
                            null
                    }).then(
                        resolve
                    );
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
                                    session:
                                        null
                                },
                                error:
                                    null
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
                                error:
                                    null
                            };
                        },

                        async signUp() {
                            return {
                                data: {},
                                error:
                                    null
                            };
                        },

                        async signOut() {
                            return {
                                error:
                                    null
                            };
                        }
                    },

                    from() {
                        return result([]);
                    }
                };
            }
        };
    });

    await page.route(
        "https://cdn.jsdelivr.net/**",
        route =>
            route.abort()
    );
}
