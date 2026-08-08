import {
    createReadStream
} from "node:fs";

import {
    stat
} from "node:fs/promises";

import {
    createServer
} from "node:http";

import {
    extname,
    resolve,
    sep
} from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 4173;
const HOST = "127.0.0.1";

const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".webm": "video/webm"
};

const server = createServer(
    async (request, response) => {
        try {
            const requestUrl =
                new URL(
                    request.url ?? "/",
                    `http://${HOST}:${PORT}`
                );

            const pathname =
                decodeURIComponent(
                    requestUrl.pathname
                );

            const relativePath =
                pathname === "/"
                    ? "index.html"
                    : pathname.replace(/^\/+/, "");

            const filePath =
                resolve(
                    ROOT,
                    relativePath
                );

            if (
                filePath !== ROOT &&
                !filePath.startsWith(
                    `${ROOT}${sep}`
                )
            ) {
                response.writeHead(403);
                response.end("Forbidden");
                return;
            }

            const fileStat =
                await stat(filePath);

            if (!fileStat.isFile()) {
                throw new Error("Not a file");
            }

            response.writeHead(
                200,
                {
                    "content-type":
                        MIME_TYPES[extname(filePath)] ??
                        "application/octet-stream",

                    "cache-control":
                        "no-store"
                }
            );

            createReadStream(filePath)
                .pipe(response);
        }
        catch {
            response.writeHead(
                404,
                {
                    "content-type":
                        "text/plain; charset=utf-8"
                }
            );
            response.end("Not found");
        }
    }
);

server.listen(
    PORT,
    HOST,
    () => {
        console.info(
            `Static server: http://${HOST}:${PORT}`
        );
    }
);
