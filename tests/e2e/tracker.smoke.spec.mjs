import {
    expect,
    test
} from "@playwright/test";

const ROUTES = {
    games:
        "#games",

    division:
        "#game/theDivision2",

    collectibles:
        "#game/theDivision2/collectibles",

    comms:
        "#game/theDivision2/collectibles/comms",

    washington:
        "#game/theDivision2/collectibles/comms/washington",

    missions:
        "#game/theDivision2/collectibles/comms/missions"
};

test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page);
});

test("wichtigste Routen rendern erwartete Inhalte", async ({ page }) => {
    const mainContent =
        page.locator("#main-content");

    await page.goto(`/${ROUTES.games}`);
    await expect(
        mainContent.locator(
            '.game-card[data-game-id="theDivision2"]'
        )
    ).toBeVisible();

    await navigate(page, ROUTES.division);
    await expect(
        mainContent.locator(
            '.category-card[data-category-id="collectibles"]'
        )
    ).toBeVisible();

    await navigate(page, ROUTES.collectibles);
    await expect(
        mainContent.locator(
            '.category-card[data-category-id="comms"]'
        )
    ).toBeVisible();

    await navigate(page, ROUTES.comms);
    await expect(
        mainContent.locator(
            ".comms-section-card"
        )
    ).toHaveCount(4);
});

test("Washington-Map lädt alle Tracking-Einträge", async ({ page }) => {
    await page.goto(`/${ROUTES.washington}`);

    await expect(
        page.locator(
            ".comms-map-page"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".tracker-item"
        )
    ).toHaveCount(181);
});

test("Missionsliste lädt alle kombinierten Einträge", async ({ page }) => {
    await page.goto(`/${ROUTES.missions}`);

    await expect(
        page.locator(
            ".tracker-item"
        )
    ).toHaveCount(515);
});

test("schneller Routenwechsel lässt nur die letzte Route sichtbar", async ({ page }) => {
    await page.goto(`/${ROUTES.games}`);

    await page.evaluate(
        ({ washington, games }) => {
            window.location.hash =
                washington;

            queueMicrotask(() => {
                window.location.hash =
                    games;
            });
        },
        ROUTES
    );

    await expect(
        page
    ).toHaveURL(/#games$/);

    await expect(
        page.locator(
            ".games-page"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".comms-map-page"
        )
    ).toHaveCount(0);
});

test("Routenwechsel setzt Fokus in den neuen Hauptinhalt", async ({ page }) => {
    await page.goto(`/${ROUTES.games}`);
    await navigate(page, ROUTES.division);

    await expect.poll(
        async () =>
            page.evaluate(() => {
                const active =
                    document.activeElement;

                return Boolean(
                    active &&
                    active.closest(
                        "#main-content"
                    ) &&
                    /H1|H2/.test(
                        active.tagName
                    )
                );
            })
    ).toBe(true);
});

async function navigate(page, hash) {
    await page.evaluate(
        targetHash => {
            window.location.hash =
                targetHash;
        },
        hash
    );

    await expect(page)
        .toHaveURL(
            url =>
                url.hash === hash
        );
}

async function installSupabaseMock(page) {
    await page.addInitScript(() => {
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
                                    session: null
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
                            return { data: {}, error: null };
                        },
                        async signUp() {
                            return { data: {}, error: null };
                        },
                        async signOut() {
                            return { error: null };
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
        route => route.abort()
    );
}
