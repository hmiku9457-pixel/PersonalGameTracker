/* =========================================================
   Personal Game Tracker
   View Scope Service
   ========================================================= */

let activeScope = null;
let nextScopeId = 0;

/**
 * Startet einen neuen Lebenszyklus für die aktuelle Route.
 * Der vorherige Scope wird vollständig beendet.
 *
 * @returns {object}
 */
export function beginViewScope() {
    activeScope?.dispose();

    const controller =
        new AbortController();

    const cleanupCallbacks =
        new Set();

    const scope = {
        id: ++nextScopeId,
        signal: controller.signal,

        isCurrent() {
            return (
                activeScope === scope &&
                !controller.signal.aborted
            );
        },

        onDispose(callback) {
            if (
                typeof callback !== "function"
            ) {
                return () => {};
            }

            if (controller.signal.aborted) {
                callback();
                return () => {};
            }

            cleanupCallbacks.add(callback);

            return () => {
                cleanupCallbacks.delete(callback);
            };
        },

        dispose() {
            if (controller.signal.aborted) {
                return;
            }

            controller.abort();

            for (
                const callback
                of cleanupCallbacks
            ) {
                try {
                    callback();
                }
                catch (error) {
                    console.error(
                        "View-Cleanup ist fehlgeschlagen:",
                        error
                    );
                }
            }

            cleanupCallbacks.clear();
        }
    };

    activeScope = scope;

    return scope;
}

/**
 * Gibt den aktiven View-Scope zurück.
 *
 * @returns {object|null}
 */
export function getActiveViewScope() {
    return activeScope;
}

/**
 * Prüft, ob ein Scope weiterhin zur sichtbaren Route gehört.
 *
 * @param {object|null} scope
 * @returns {boolean}
 */
export function isViewScopeCurrent(scope) {
    return Boolean(
        scope &&
        scope === activeScope &&
        typeof scope.isCurrent === "function" &&
        scope.isCurrent()
    );
}

/**
 * Registriert eine Aufräumfunktion im aktiven View-Scope.
 *
 * @param {Function} callback
 * @param {object|null} scope
 * @returns {Function}
 */
export function registerViewCleanup(
    callback,
    scope = activeScope
) {
    if (
        !scope ||
        typeof scope.onDispose !== "function"
    ) {
        return () => {};
    }

    return scope.onDispose(callback);
}

/**
 * Schließt einen erfolgreichen Routenwechsel ab und setzt den
 * Tastaturfokus auf die Überschrift des neuen Hauptinhalts.
 *
 * @param {object} scope
 * @returns {boolean}
 */
export function completeViewRender(scope) {
    if (!isViewScopeCurrent(scope)) {
        return false;
    }

    queueMicrotask(() => {
        if (!isViewScopeCurrent(scope)) {
            return;
        }

        focusMainHeading();
    });

    return true;
}

/**
 * Setzt den Fokus auf die erste Überschrift im Hauptinhalt.
 */
function focusMainHeading() {
    const mainContent =
        document.getElementById(
            "main-content"
        );

    const heading =
        mainContent?.querySelector(
            "h1, h2"
        );

    if (!heading) {
        return;
    }

    const hadTabIndex =
        heading.hasAttribute(
            "tabindex"
        );

    if (!hadTabIndex) {
        heading.setAttribute(
            "tabindex",
            "-1"
        );
    }

    heading.focus({
        preventScroll: true
    });

    if (!hadTabIndex) {
        heading.addEventListener(
            "blur",
            () => {
                heading.removeAttribute(
                    "tabindex"
                );
            },
            {
                once: true
            }
        );
    }
}
