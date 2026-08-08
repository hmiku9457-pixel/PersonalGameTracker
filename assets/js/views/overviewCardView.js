/* =========================================================
   Personal Game Tracker
   Shared Overview Card View
   ========================================================= */

import {
    getCurrentLanguage,
    getLocalizedText
} from "../services/languageService.js";

/**
 * Erstellt die gemeinsame Metazeile einer Übersichtskarte.
 *
 * Beispiel:
 * 13 Videos · 3 Sammlungen
 *
 * @param {Object} entry
 * @returns {HTMLElement|null}
 */
export function createOverviewMeta(entry = {}) {
    const itemCount = Number(entry.itemCount);

    if (!Number.isInteger(itemCount) || itemCount < 0) {
        return null;
    }

    const language = getCurrentLanguage();
    const locale = language === "en"
        ? "en-US"
        : "de-DE";
    const numberFormatter = new Intl.NumberFormat(locale);

    const itemLabel = getLocalizedText(
        entry.itemLabel,
        language === "en" ? "items" : "Einträge"
    );

    const parts = [
        numberFormatter.format(itemCount) + " " + itemLabel
    ];

    const groupCount = Number(entry.groupCount);

    if (Number.isInteger(groupCount) && groupCount > 0) {
        const groupLabel = getLocalizedText(
            entry.groupLabel,
            language === "en" ? "groups" : "Gruppen"
        );

        parts.push(
            numberFormatter.format(groupCount) + " " + groupLabel
        );
    }

    const element = document.createElement("p");
    element.className = "overview-card-meta";
    element.textContent = parts.join(" · ");

    return element;
}

/**
 * Erstellt die gemeinsame Fortschrittsanzeige aller Übersichtskarten.
 *
 * Die Komponente wird direkt beim Rendern erzeugt. Es gibt bewusst
 * keine DOM-Beobachtung und keine nachträgliche DOM-Transformation.
 *
 * @param {{label?:string,hidden?:boolean}} options
 * @returns {{element:HTMLElement,bar:HTMLElement,fill:HTMLElement,count:HTMLElement,percent:HTMLElement}}
 */
export function createOverviewProgress(options = {}) {
    const element = document.createElement("div");
    element.className = "overview-card-progress";
    element.hidden = options.hidden ?? true;

    const label = document.createElement("div");
    label.className = "overview-card-progress-label";
    label.textContent = options.label || getProgressLabel();

    const bar = document.createElement("div");
    bar.className = "overview-card-progress-bar";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", label.textContent);
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "0");
    bar.setAttribute("aria-valuenow", "0");

    const fill = document.createElement("div");
    fill.className = "overview-card-progress-fill";
    fill.style.width = "0%";

    const overlay = document.createElement("div");
    overlay.className = "overview-card-progress-overlay";

    const count = document.createElement("span");
    count.className = "overview-card-progress-count";
    count.textContent = "0 / 0";

    const percent = document.createElement("span");
    percent.className = "overview-card-progress-percent";
    percent.textContent = "0 %";

    overlay.append(count, percent);
    bar.append(fill, overlay);
    element.append(label, bar);

    return {
        element,
        bar,
        fill,
        count,
        percent
    };
}

/**
 * Aktualisiert eine bereits gerenderte Fortschrittskomponente.
 *
 * @param {HTMLElement|object} target
 * @param {{completed?:number,total?:number,percentage?:number}} progress
 */
export function updateOverviewProgress(target, progress = {}) {
    const component = resolveComponent(target);
    if (!component) {
        return;
    }

    const completed = Math.max(0, Number(progress.completed) || 0);
    const total = Math.max(0, Number(progress.total) || 0);
    const calculatedPercentage =
        total > 0
            ? Math.round((completed / total) * 100)
            : 0;
    const percentage = Number.isFinite(Number(progress.percentage))
        ? Math.max(0, Math.min(100, Math.round(Number(progress.percentage))))
        : calculatedPercentage;

    component.element.hidden = false;
    component.count.textContent = completed + " / " + total;
    component.percent.textContent = percentage + " %";
    component.fill.style.width = percentage + "%";
    component.bar.setAttribute("aria-valuemin", "0");
    component.bar.setAttribute("aria-valuemax", String(total));
    component.bar.setAttribute("aria-valuenow", String(completed));
}

function resolveComponent(target) {
    const element = target?.element instanceof HTMLElement
        ? target.element
        : target instanceof HTMLElement
            ? target
            : null;

    if (!element) {
        return null;
    }

    const bar = target?.bar || element.querySelector(".overview-card-progress-bar");
    const fill = target?.fill || element.querySelector(".overview-card-progress-fill");
    const count = target?.count || element.querySelector(".overview-card-progress-count");
    const percent = target?.percent || element.querySelector(".overview-card-progress-percent");

    if (!bar || !fill || !count || !percent) {
        return null;
    }

    return {
        element,
        bar,
        fill,
        count,
        percent
    };
}

function getProgressLabel() {
    return getCurrentLanguage() === "en"
        ? "Progress"
        : "Fortschritt";
}
