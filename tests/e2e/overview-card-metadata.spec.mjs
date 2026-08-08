import {
    expect,
    test
} from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem(
            "personalGameTracker.language",
            "de"
        );
    });

    await installSupabaseMock(page);
});

test("Übersichtskarten zeigen Manifest-Metadaten, Spielkarten bleiben unverändert", async ({ page }) => {
    await page.goto("/#game/theDivision2");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    const collectibles = page.locator(
        '.category-card[data-category-id="collectibles"]'
    );

    await expect(collectibles).toBeVisible();
    await expect(
        collectibles.locator(".overview-card-meta")
    ).toContainText("1.233 Einträge");
    await expect(
        collectibles.locator(".overview-card-meta")
    ).toContainText("6 Kategorien");

    await page.goto("/#game/theDivision2/collectibles");

    const foundFootage = page.locator(
        '.category-card[data-category-id="foundFootage"]'
    );

    await expect(foundFootage).toBeVisible();
    await expect(
        foundFootage.locator(".overview-card-meta")
    ).toContainText("13 Videos");

    await page.goto("/#games");

    await expect(
        page.locator(".game-card.overview-card")
    ).toHaveCount(0);
    await expect(
        page.locator(".game-card .overview-card-meta")
    ).toHaveCount(0);
});

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
                                data: { session: null },
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
