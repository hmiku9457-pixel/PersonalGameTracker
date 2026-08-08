const MAIN_CONTENT_SELECTOR = "#main-content";
const SIMPLE_CARD_SELECTOR = ".category-card, .manifest-card";
const COMMS_CARD_SELECTOR = ".comms-section-card";
const SOURCE_SELECTOR = "[data-category-progress], .category-progress";
const ENHANCED_ATTRIBUTE = "data-progress-card-enhanced";
const STYLE_CLASS = "pgt-progress-card";

let observer = null;
let scheduled = false;

function scheduleEnhancement() {
    if (scheduled) {
        return;
    }

    scheduled = true;

    requestAnimationFrame(() => {
        scheduled = false;
        enhanceProgressCards();
    });
}

function enhanceProgressCards() {
    const mainContent = document.querySelector(
        MAIN_CONTENT_SELECTOR
    );

    if (!mainContent) {
        return;
    }

    for (const card of mainContent.querySelectorAll(SIMPLE_CARD_SELECTOR)) {
        enhanceSimpleProgressCard(card);
    }

    for (const card of mainContent.querySelectorAll(COMMS_CARD_SELECTOR)) {
        enhanceCommsProgressCard(card);
    }
}

function enhanceSimpleProgressCard(card) {
    if (hasUnmanagedDetailedProgress(card)) {
        card.setAttribute(ENHANCED_ATTRIBUTE, "native");
        return;
    }

    const sourceElement = findSimpleProgressSource(card);

    if (!sourceElement) {
        return;
    }

    let progressSection = card.querySelector(
        ".pgt-progress-card-section"
    );

    if (!progressSection) {
        progressSection = createGeneratedProgressSection();
        sourceElement.insertAdjacentElement("afterend", progressSection);
        prepareSourceElement(sourceElement);
        card.classList.add(STYLE_CLASS);
        card.setAttribute(ENHANCED_ATTRIBUTE, "true");
    }

    syncProgressDisplay({
        card,
        sourceElement,
        progressSection,
        labelElement: progressSection.querySelector(
            ".pgt-progress-card-label"
        ),
        barElement: progressSection.querySelector(
            ".pgt-progress-card-bar"
        ),
        fillElement: progressSection.querySelector(
            ".pgt-progress-card-fill"
        ),
        countElement: progressSection.querySelector(
            ".pgt-progress-card-count"
        ),
        percentElement: progressSection.querySelector(
            ".pgt-progress-card-percent"
        ),
        hideUntilReady: true,
        updateLabel: true
    });
}

function enhanceCommsProgressCard(card) {
    const progressSection = card.querySelector(
        ".comms-section-card-progress"
    );

    if (!progressSection) {
        return;
    }

    const progressHeader = findDirectProgressHeader(progressSection);
    const sourceElement = progressHeader?.querySelector("strong") ?? null;
    const labelElement = progressHeader?.querySelector("span") ?? null;
    const barElement = progressSection.querySelector(".progress-bar");
    const fillElement = barElement?.querySelector(".progress-bar-fill") ?? null;

    if (!sourceElement || !labelElement || !barElement || !fillElement) {
        return;
    }

    let overlay = barElement.querySelector(
        ".pgt-progress-card-overlay"
    );

    if (!overlay) {
        overlay = createProgressOverlay();
        barElement.append(overlay);
    }

    prepareSourceElement(sourceElement);
    progressSection.classList.add(
        "pgt-progress-card-section",
        "pgt-progress-card-native-section"
    );
    progressHeader.classList.add("pgt-progress-card-native-header");
    labelElement.classList.add("pgt-progress-card-label");
    barElement.classList.add("pgt-progress-card-bar");
    fillElement.classList.add("pgt-progress-card-fill");
    card.classList.add(STYLE_CLASS);
    card.setAttribute(ENHANCED_ATTRIBUTE, "comms");

    syncProgressDisplay({
        card,
        sourceElement,
        progressSection,
        labelElement,
        barElement,
        fillElement,
        countElement: overlay.querySelector(
            ".pgt-progress-card-count"
        ),
        percentElement: overlay.querySelector(
            ".pgt-progress-card-percent"
        ),
        hideUntilReady: false,
        updateLabel: false
    });
}

function findDirectProgressHeader(progressSection) {
    return Array.from(progressSection.children).find(
        element =>
            element instanceof HTMLElement &&
            !element.classList.contains("progress-bar") &&
            Boolean(element.querySelector("strong"))
    ) ?? null;
}

function prepareSourceElement(sourceElement) {
    sourceElement.classList.add("pgt-progress-card-source");
    sourceElement.setAttribute("aria-hidden", "true");
}

function hasUnmanagedDetailedProgress(card) {
    if (card.querySelector(".pgt-progress-card-section")) {
        return false;
    }

    const hasProgressLabel =
        /(^|\s)(Fortschritt|Progress)(\s|$)/i.test(
            card.textContent || ""
        );

    const hasProgressBar = Boolean(
        card.querySelector(
            [
                "[role=\"progressbar\"]",
                "progress",
                ".progress-bar",
                ".tracker-progress-bar",
                ".category-card-progress",
                ".card-progress-bar"
            ].join(", ")
        )
    );

    return hasProgressLabel && hasProgressBar;
}

function findSimpleProgressSource(card) {
    const explicitSource = card.querySelector(SOURCE_SELECTOR);

    if (explicitSource) {
        return explicitSource;
    }

    const candidates = Array.from(
        card.querySelectorAll("p, span, div, strong, small")
    );

    return candidates.find(element => {
        if (element.closest(".pgt-progress-card-section")) {
            return false;
        }

        if (element.children.length > 0) {
            return false;
        }

        return parseProgressText(element.textContent) !== null;
    }) ?? null;
}

function syncProgressDisplay({
    card,
    sourceElement,
    progressSection,
    labelElement,
    barElement,
    fillElement,
    countElement,
    percentElement,
    hideUntilReady,
    updateLabel
}) {
    const progress = parseProgressText(sourceElement.textContent);

    if (!progress) {
        if (hideUntilReady) {
            setHidden(progressSection, true);
        }
        return;
    }

    const { completed, total } = progress;
    const percent = calculatePercent(completed, total);
    const roundedPercent = Math.round(percent);

    if (updateLabel) {
        setText(labelElement, getProgressLabel());
    }

    setText(countElement, `${completed} / ${total}`);
    setText(percentElement, `${roundedPercent} %`);
    setStyleWidth(fillElement, `${percent.toFixed(2)}%`);

    const accessibleLabel =
        labelElement?.textContent?.trim() ||
        getProgressLabel();

    setAttribute(barElement, "role", "progressbar");
    setAttribute(barElement, "aria-label", accessibleLabel);
    setAttribute(barElement, "aria-valuemin", "0");
    setAttribute(barElement, "aria-valuemax", String(total));
    setAttribute(barElement, "aria-valuenow", String(completed));
    setAttribute(
        barElement,
        "aria-valuetext",
        `${completed} / ${total}, ${roundedPercent} %`
    );

    const sourceIsHidden =
        sourceElement.hidden ||
        sourceElement.closest("[hidden]") !== null;

    if (hideUntilReady) {
        setHidden(progressSection, sourceIsHidden || total <= 0);
    }

    card.dataset.progressCompleted = String(completed);
    card.dataset.progressTotal = String(total);
    card.dataset.progressPercent = String(roundedPercent);
}

function parseProgressText(value) {
    const match = String(value ?? "")
        .trim()
        .match(/^(\d+)\s*\/\s*(\d+)$/);

    if (!match) {
        return null;
    }

    return {
        completed: Number(match[1]),
        total: Number(match[2])
    };
}

function calculatePercent(completed, total) {
    if (!Number.isFinite(total) || total <= 0) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(100, (completed / total) * 100)
    );
}

function createGeneratedProgressSection() {
    const section = document.createElement("div");
    section.className = "pgt-progress-card-section";
    section.hidden = true;

    const label = document.createElement("div");
    label.className = "pgt-progress-card-label";

    const bar = document.createElement("div");
    bar.className = "pgt-progress-card-bar";

    const fill = document.createElement("div");
    fill.className = "pgt-progress-card-fill";

    bar.append(fill, createProgressOverlay());
    section.append(label, bar);

    return section;
}

function createProgressOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "pgt-progress-card-overlay";

    const count = document.createElement("span");
    count.className = "pgt-progress-card-count";

    const percentage = document.createElement("span");
    percentage.className = "pgt-progress-card-percent";

    overlay.append(count, percentage);
    return overlay;
}

function getProgressLabel() {
    const languageSelect = document.getElementById("language-select");
    const language =
        languageSelect?.value ||
        document.documentElement.lang;

    return language === "en"
        ? "Progress"
        : "Fortschritt";
}

function setText(element, value) {
    if (element && element.textContent !== value) {
        element.textContent = value;
    }
}

function setAttribute(element, name, value) {
    if (element && element.getAttribute(name) !== value) {
        element.setAttribute(name, value);
    }
}

function setStyleWidth(element, value) {
    if (element && element.style.width !== value) {
        element.style.width = value;
    }
}

function setHidden(element, hidden) {
    if (element && element.hidden !== hidden) {
        element.hidden = hidden;
    }
}

function setupObserver() {
    const mainContent = document.querySelector(
        MAIN_CONTENT_SELECTOR
    );

    if (!mainContent) {
        return;
    }

    observer?.disconnect();
    observer = new MutationObserver(scheduleEnhancement);
    observer.observe(mainContent, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
            "hidden",
            "class",
            "style"
        ]
    });
}

function initialize() {
    setupObserver();
    scheduleEnhancement();

    document
        .getElementById("language-select")
        ?.addEventListener(
            "change",
            scheduleEnhancement
        );
}

if (document.readyState === "loading") {
    window.addEventListener(
        "DOMContentLoaded",
        initialize,
        { once: true }
    );
} else {
    initialize();
}

window.addEventListener("hashchange", scheduleEnhancement);
window.addEventListener("load", scheduleEnhancement);
