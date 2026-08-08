import {
    defineConfig
} from "@playwright/test";

export default defineConfig({
    testDir:
        "./tests/e2e",

    timeout:
        30_000,

    fullyParallel:
        false,

    retries:
        process.env.CI
            ? 1
            : 0,

    expect: {
        timeout:
            10_000
    },

    reporter:
        process.env.CI
            ? [
                ["line"],
                [
                    "html",
                    {
                        open: "never"
                    }
                ]
            ]
            : "list",

    use: {
        baseURL:
            "http://127.0.0.1:4173",

        browserName:
            "chromium",

        trace:
            "retain-on-failure",

        screenshot:
            "only-on-failure"
    },

    webServer: {
        command:
            "node scripts/serveStatic.mjs",

        url:
            "http://127.0.0.1:4173",

        reuseExistingServer:
            !process.env.CI,

        timeout:
            15_000
    }
});
