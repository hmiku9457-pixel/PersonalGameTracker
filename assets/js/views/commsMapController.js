/* =========================================================
   Personal Game Tracker
   Comms Map Controller
   ========================================================= */

const MAP_TRANSFORM_STORAGE_PREFIX =
    "pgt.commsMap.transform.";
const MAP_MIN_SCALE = 1;
const MAP_MAX_SCALE = 5;
const MAP_ZOOM_STEP = 0.35;


/**
 * Erstellt die Bedienlogik für eine Comms-Karte.
 *
 * @param {object} options
 * @returns {{setMapAvailable: function(boolean): void}}
 */
export function createCommsMapController({
    sectionId,
    area,
    viewport,
    canvas,
    uiText,
    signal
}) {
    const controls = createMapControls(
        viewport,
        uiText
    );
    const storageKey =
        `${MAP_TRANSFORM_STORAGE_PREFIX}${sectionId}`;
    const state = readStoredMapTransform(
        storageKey
    );
    const pointers = new Map();

    let dragStart = null;
    let pinchStart = null;
    let mapAvailable = false;
    let persistTimer = null;

    const controlButtons = [
        controls.zoomInButton,
        controls.zoomOutButton,
        controls.resetButton,
        controls.fullscreenButton
    ];

    controls.fullscreenButton.hidden =
        typeof area.requestFullscreen !== "function";

    function clampScale(value) {
        return Math.min(
            MAP_MAX_SCALE,
            Math.max(MAP_MIN_SCALE, value)
        );
    }

    function clampPosition() {
        const rect = viewport.getBoundingClientRect();
        const maxX = Math.max(
            0,
            (rect.width * (state.scale - 1)) / 2
        );
        const maxY = Math.max(
            0,
            (rect.height * (state.scale - 1)) / 2
        );

        state.x = Math.min(
            maxX,
            Math.max(-maxX, state.x)
        );
        state.y = Math.min(
            maxY,
            Math.max(-maxY, state.y)
        );
    }

    function applyTransform() {
        clampPosition();

        canvas.style.transform =
            `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
        controls.zoomLabel.textContent =
            `${Math.round(state.scale * 100)} %`;

        viewport.classList.toggle(
            "is-zoomed",
            state.scale > MAP_MIN_SCALE + 0.001
        );

        controls.zoomOutButton.disabled =
            !mapAvailable ||
            state.scale <= MAP_MIN_SCALE + 0.001;
        controls.zoomInButton.disabled =
            !mapAvailable ||
            state.scale >= MAP_MAX_SCALE - 0.001;
        controls.resetButton.disabled =
            !mapAvailable || (
                state.scale <= MAP_MIN_SCALE + 0.001 &&
                Math.abs(state.x) < 0.5 &&
                Math.abs(state.y) < 0.5
            );
        controls.fullscreenButton.disabled =
            !mapAvailable;
    }

    function schedulePersist() {
        window.clearTimeout(persistTimer);
        persistTimer = window.setTimeout(
            () => {
                try {
                    localStorage.setItem(
                        storageKey,
                        JSON.stringify({
                            scale: state.scale,
                            x: state.x,
                            y: state.y
                        })
                    );
                }
                catch (error) {
                    console.debug(
                        "Kartenposition konnte nicht gespeichert werden.",
                        error
                    );
                }
            },
            120
        );
    }

    function getRelativePoint(
        clientX,
        clientY
    ) {
        const rect = viewport.getBoundingClientRect();
        return {
            x: clientX - (rect.left + rect.width / 2),
            y: clientY - (rect.top + rect.height / 2)
        };
    }

    function zoomAt(
        targetScale,
        clientX = null,
        clientY = null,
        persist = true
    ) {
        if (!mapAvailable) {
            return;
        }

        const nextScale = clampScale(targetScale);
        if (Math.abs(nextScale - state.scale) < 0.0001) {
            return;
        }

        const point = clientX === null || clientY === null
            ? { x: 0, y: 0 }
            : getRelativePoint(clientX, clientY);
        const ratio = nextScale / state.scale;

        state.x =
            point.x - (point.x - state.x) * ratio;
        state.y =
            point.y - (point.y - state.y) * ratio;
        state.scale = nextScale;

        applyTransform();
        if (persist) {
            schedulePersist();
        }
    }

    function resetMap() {
        state.scale = MAP_MIN_SCALE;
        state.x = 0;
        state.y = 0;
        applyTransform();
        schedulePersist();
    }

    function panBy(
        deltaX,
        deltaY
    ) {
        if (!mapAvailable) {
            return;
        }

        state.x += deltaX;
        state.y += deltaY;
        applyTransform();
        schedulePersist();
    }

    function updateFullscreenButton() {
        const active =
            document.fullscreenElement === area;
        const label = active
            ? uiText.exitFullscreen
            : uiText.enterFullscreen;

        controls.fullscreenButton.title = label;
        controls.fullscreenButton.setAttribute(
            "aria-label",
            label
        );
        controls.fullscreenButton.setAttribute(
            "aria-pressed",
            String(active)
        );
    }

    async function toggleFullscreen() {
        if (!mapAvailable) {
            return;
        }

        try {
            if (document.fullscreenElement === area) {
                await document.exitFullscreen();
            }
            else {
                await area.requestFullscreen();
            }
        }
        catch (error) {
            console.warn(
                "Vollbildmodus konnte nicht umgeschaltet werden.",
                error
            );
        }
    }

    controls.zoomInButton.addEventListener(
        "click",
        () => zoomAt(
            state.scale + MAP_ZOOM_STEP
        ),
        { signal }
    );

    controls.zoomOutButton.addEventListener(
        "click",
        () => zoomAt(
            state.scale - MAP_ZOOM_STEP
        ),
        { signal }
    );

    controls.resetButton.addEventListener(
        "click",
        resetMap,
        { signal }
    );

    controls.fullscreenButton.addEventListener(
        "click",
        toggleFullscreen,
        { signal }
    );

    viewport.addEventListener(
        "wheel",
        (event) => {
            if (!mapAvailable) {
                return;
            }

            event.preventDefault();
            const factor = Math.exp(
                -event.deltaY * 0.0015
            );

            zoomAt(
                state.scale * factor,
                event.clientX,
                event.clientY
            );
        },
        {
            passive: false,
            signal
        }
    );

    viewport.addEventListener(
        "dblclick",
        (event) => {
            event.preventDefault();
            zoomAt(
                state.scale + MAP_ZOOM_STEP * 1.5,
                event.clientX,
                event.clientY
            );
        },
        { signal }
    );

    viewport.addEventListener(
        "pointerdown",
        (event) => {
            if (
                !mapAvailable ||
                (
                    event.pointerType === "mouse" &&
                    event.button !== 0
                )
            ) {
                return;
            }

            viewport.setPointerCapture(event.pointerId);
            pointers.set(
                event.pointerId,
                {
                    x: event.clientX,
                    y: event.clientY
                }
            );
            viewport.classList.add("is-dragging");

            if (pointers.size === 1) {
                dragStart = {
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    x: state.x,
                    y: state.y
                };
                pinchStart = null;
            }
            else if (pointers.size === 2) {
                pinchStart = createPinchSnapshot(
                    pointers,
                    viewport,
                    state
                );
                dragStart = null;
            }
        },
        { signal }
    );

    viewport.addEventListener(
        "pointermove",
        (event) => {
            if (!pointers.has(event.pointerId)) {
                return;
            }

            pointers.set(
                event.pointerId,
                {
                    x: event.clientX,
                    y: event.clientY
                }
            );

            if (pointers.size >= 2 && pinchStart) {
                const current = createPinchSnapshot(
                    pointers,
                    viewport,
                    state
                );
                const targetScale = clampScale(
                    pinchStart.scale *
                    (current.distance / pinchStart.distance)
                );
                const ratio =
                    targetScale / pinchStart.scale;

                state.scale = targetScale;
                state.x =
                    pinchStart.midpoint.x -
                    (
                        pinchStart.midpoint.x -
                        pinchStart.x
                    ) * ratio +
                    (
                        current.midpoint.x -
                        pinchStart.midpoint.x
                    );
                state.y =
                    pinchStart.midpoint.y -
                    (
                        pinchStart.midpoint.y -
                        pinchStart.y
                    ) * ratio +
                    (
                        current.midpoint.y -
                        pinchStart.midpoint.y
                    );

                applyTransform();
                return;
            }

            if (pointers.size === 1 && dragStart) {
                state.x =
                    dragStart.x +
                    event.clientX - dragStart.pointerX;
                state.y =
                    dragStart.y +
                    event.clientY - dragStart.pointerY;
                applyTransform();
            }
        },
        { signal }
    );

    function finishPointer(event) {
        pointers.delete(event.pointerId);

        if (pointers.size === 0) {
            viewport.classList.remove("is-dragging");
            dragStart = null;
            pinchStart = null;
            schedulePersist();
            return;
        }

        if (pointers.size === 1) {
            const [remaining] = pointers.values();
            dragStart = {
                pointerX: remaining.x,
                pointerY: remaining.y,
                x: state.x,
                y: state.y
            };
            pinchStart = null;
        }
    }

    viewport.addEventListener(
        "pointerup",
        finishPointer,
        { signal }
    );

    viewport.addEventListener(
        "pointercancel",
        finishPointer,
        { signal }
    );

    viewport.addEventListener(
        "keydown",
        (event) => {
            if (!mapAvailable) {
                return;
            }

            const key = event.key.toLowerCase();

            if (key === "+" || key === "=") {
                event.preventDefault();
                zoomAt(
                    state.scale + MAP_ZOOM_STEP
                );
            }
            else if (key === "-") {
                event.preventDefault();
                zoomAt(
                    state.scale - MAP_ZOOM_STEP
                );
            }
            else if (key === "0" || key === "home") {
                event.preventDefault();
                resetMap();
            }
            else if (key === "f") {
                event.preventDefault();
                toggleFullscreen();
            }
            else if (key === "arrowleft") {
                event.preventDefault();
                panBy(45, 0);
            }
            else if (key === "arrowright") {
                event.preventDefault();
                panBy(-45, 0);
            }
            else if (key === "arrowup") {
                event.preventDefault();
                panBy(0, 45);
            }
            else if (key === "arrowdown") {
                event.preventDefault();
                panBy(0, -45);
            }
        },
        { signal }
    );

    document.addEventListener(
        "fullscreenchange",
        () => {
            updateFullscreenButton();
            window.requestAnimationFrame(
                applyTransform
            );
        },
        { signal }
    );

    const resizeObserver = new ResizeObserver(
        () => applyTransform()
    );
    resizeObserver.observe(viewport);

    signal.addEventListener(
        "abort",
        () => {
            resizeObserver.disconnect();
            window.clearTimeout(persistTimer);

            if (document.fullscreenElement === area) {
                document.exitFullscreen().catch(() => {});
            }
        },
        { once: true }
    );

    applyTransform();
    updateFullscreenButton();

    return {
        setMapAvailable(available) {
            mapAvailable = Boolean(available);

            for (const button of controlButtons) {
                button.disabled = !mapAvailable;
            }

            if (!mapAvailable) {
                state.scale = MAP_MIN_SCALE;
                state.x = 0;
                state.y = 0;
            }

            window.requestAnimationFrame(
                applyTransform
            );
        }
    };
}


function createMapControls(
    viewport,
    uiText
) {
    const element = document.createElement("div");
    element.className = "comms-map-controls";

    const zoomOutButton = createControlButton(
        "−",
        uiText.zoomOut
    );
    const zoomLabel = document.createElement("output");
    zoomLabel.className = "comms-map-zoom-level";
    zoomLabel.setAttribute("aria-live", "polite");
    zoomLabel.textContent = "100 %";
    const zoomInButton = createControlButton(
        "+",
        uiText.zoomIn
    );
    const resetButton = createControlButton(
        "↺",
        uiText.resetMap
    );
    const fullscreenButton = createControlButton(
        "⛶",
        uiText.enterFullscreen
    );

    element.append(
        zoomOutButton,
        zoomLabel,
        zoomInButton,
        resetButton,
        fullscreenButton
    );
    viewport.append(element);

    return {
        element,
        zoomInButton,
        zoomOutButton,
        resetButton,
        fullscreenButton,
        zoomLabel
    };
}


function createControlButton(
    text,
    label
) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "comms-map-control-button";
    button.textContent = text;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.disabled = true;
    return button;
}


function createPinchSnapshot(
    pointers,
    viewport,
    state
) {
    const [first, second] = [
        ...pointers.values()
    ];
    const rect = viewport.getBoundingClientRect();
    const midpoint = {
        x:
            (first.x + second.x) / 2 -
            (rect.left + rect.width / 2),
        y:
            (first.y + second.y) / 2 -
            (rect.top + rect.height / 2)
    };

    return {
        distance: Math.max(
            1,
            Math.hypot(
                second.x - first.x,
                second.y - first.y
            )
        ),
        midpoint,
        scale: state.scale,
        x: state.x,
        y: state.y
    };
}


function readStoredMapTransform(storageKey) {
    const fallback = {
        scale: MAP_MIN_SCALE,
        x: 0,
        y: 0
    };

    try {
        const value = JSON.parse(
            localStorage.getItem(storageKey) ?? "null"
        );

        if (!value || typeof value !== "object") {
            return fallback;
        }

        return {
            scale: Number.isFinite(value.scale)
                ? Math.min(
                    MAP_MAX_SCALE,
                    Math.max(
                        MAP_MIN_SCALE,
                        value.scale
                    )
                )
                : fallback.scale,
            x: Number.isFinite(value.x)
                ? value.x
                : fallback.x,
            y: Number.isFinite(value.y)
                ? value.y
                : fallback.y
        };
    }
    catch (error) {
        console.debug(
            "Gespeicherte Kartenposition konnte nicht gelesen werden.",
            error
        );
        return fallback;
    }
}
