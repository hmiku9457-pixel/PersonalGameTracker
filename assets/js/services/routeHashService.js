/* =========================================================
   Personal Game Tracker
   Route Hash Service
   ========================================================= */

export function getRouteParts() {
    const hash =
        window.location.hash
            .replace(/^#/, "");

    if (!hash) {
        return [];
    }

    return hash
        .split("/")
        .filter(Boolean)
        .map(part => {
            try {
                return decodeURIComponent(
                    part
                );
            }
            catch {
                return part;
            }
        });
}


export function buildGameHash(
    gameId,
    routeIds = []
) {
    const parts = [
        "game",

        encodeURIComponent(
            gameId
        ),

        ...routeIds.map(
            routeId =>
                encodeURIComponent(
                    routeId
                )
        )
    ];

    return `#${parts.join("/")}`;
}
