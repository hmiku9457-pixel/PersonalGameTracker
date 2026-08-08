import {
    chromium
} from "@playwright/test";

import {
    spawn
} from "node:child_process";

import {
    mkdir,
    writeFile
} from "node:fs/promises";

const server = spawn(
    process.execPath,
    ["scripts/serveStatic.mjs"],
    {
        stdio: "inherit"
    }
);

const routes = [
    "#games",
    "#game/theDivision2",
    "#game/theDivision2/collectibles",
    "#game/theDivision2/collectibles/comms",
    "#game/theDivision2/collectibles/comms/washington",
    "#game/theDivision2/collectibles/comms/missions"
];

try {
    await waitForServer();

    const browser =
        await chromium.launch();

    const page =
        await browser.newPage();

    await page.addInitScript(() => {
        window.supabase = {
            createClient() {
                const result = () => {
                    const query = {
                        select() { return query; },
                        eq() { return query; },
                        order() { return query; },
                        range() { return query; },
                        then(resolve) {
                            return Promise.resolve({
                                data: [],
                                error: null
                            }).then(resolve);
                        }
                    };

                    return query;
                };

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
                        }
                    },
                    from: result
                };
            }
        };
    });

    await page.route(
        "https://cdn.jsdelivr.net/**",
        route => route.abort()
    );

    const results = [];

    for (const hash of routes) {
        const started =
            Date.now();

        await page.goto(
            `http://127.0.0.1:4173/${hash}`,
            {
                waitUntil:
                    "networkidle"
            }
        );

        const metrics =
            await page.evaluate(() => {
                const resources =
                    performance.getEntriesByType(
                        "resource"
                    );

                return {
                    requestCount:
                        resources.length,

                    jsonRequestCount:
                        resources.filter(
                            entry =>
                                entry.name.includes(
                                    ".json"
                                )
                        ).length,

                    transferSize:
                        resources.reduce(
                            (sum, entry) =>
                                sum +
                                (entry.transferSize ?? 0),
                            0
                        ),

                    domElements:
                        document.querySelectorAll(
                            "*"
                        ).length
                };
            });

        results.push({
            route: hash,
            renderTimeMs:
                Date.now() - started,
            ...metrics
        });
    }

    await browser.close();

    await mkdir(
        "artifacts",
        {
            recursive: true
        }
    );

    await writeFile(
        "artifacts/performance-baseline.json",
        JSON.stringify(
            {
                createdAt:
                    new Date().toISOString(),
                results
            },
            null,
            2
        ) + "\n"
    );

    console.table(results);
}
finally {
    server.kill("SIGTERM");
}

async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const response =
                await fetch(
                    "http://127.0.0.1:4173"
                );

            if (response.ok) {
                return;
            }
        }
        catch {
            // Server startet noch.
        }

        await new Promise(
            resolvePromise =>
                setTimeout(
                    resolvePromise,
                    100
                )
        );
    }

    throw new Error(
        "Lokaler Testserver ist nicht gestartet."
    );
}
