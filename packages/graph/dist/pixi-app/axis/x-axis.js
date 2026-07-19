import { Container, Text } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import { BaseGraphic } from '../../lib/base-graphic';
import { getGraphDisplayTimeBounds, ObservationModeEnum, ReadingTypeEnum, TimeDisplayFormatEnum, } from '@actograph/core';
import { formatAxisLabel, formatChronoAxisLabel, formatCalendarFixed, formatChronometerFixed, getCalendarFixedFormatNotation, } from '../../utils/duration.utils';
import { CHRONOMETER_T0 } from '../../utils/chronometer.constants';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../../types/graph-render-options';
const timeSteps = {
    '10ms': 10,
    '100ms': 100,
    '1s': 1000,
    '10s': 10 * 1000,
    '1m': 60 * 1000,
    '10m': 60 * 10 * 1000,
    '30m': 60 * 30 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 60 * 60 * 2 * 1000,
    '4h': 60 * 60 * 4 * 1000,
    '6h': 60 * 60 * 6 * 1000,
    '8h': 60 * 60 * 8 * 1000,
    '12h': 60 * 60 * 12 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '2d': 24 * 60 * 60 * 2 * 1000,
    '3d': 24 * 60 * 60 * 3 * 1000,
    '4d': 24 * 60 * 60 * 4 * 1000,
    '5d': 24 * 60 * 60 * 5 * 1000,
    '6d': 24 * 60 * 60 * 6 * 1000,
    '7d': 24 * 60 * 60 * 7 * 1000,
    '8d': 24 * 60 * 60 * 8 * 1000,
    '1w': 24 * 60 * 60 * 7 * 1000,
    '2w': 24 * 60 * 60 * 14 * 1000,
    '3w': 24 * 60 * 60 * 21 * 1000,
    '4w': 24 * 60 * 60 * 28 * 1000,
    '1M': 24 * 60 * 60 * 30 * 1000,
    '2M': 24 * 60 * 60 * 60 * 1000,
    '3M': 24 * 60 * 60 * 90 * 1000,
    '6M': 24 * 60 * 60 * 180 * 1000,
    '1y': 24 * 60 * 60 * 365 * 1000,
    '2y': 24 * 60 * 60 * 365 * 2 * 1000,
    '3y': 24 * 60 * 60 * 365 * 3 * 1000,
    '4y': 24 * 60 * 60 * 365 * 4 * 1000,
    '5y': 24 * 60 * 60 * 365 * 5 * 1000,
    '6y': 24 * 60 * 60 * 365 * 6 * 1000,
    '10y': 24 * 60 * 60 * 365 * 10 * 1000,
    '20y': 24 * 60 * 60 * 365 * 20 * 1000,
};
export class xAxis extends BaseGroup {
    getAxisStart() {
        return { ...this.axisStart };
    }
    getAxisEnd() {
        return { ...this.axisEnd };
    }
    constructor(app, yAxis) {
        super(app);
        this.readings = [];
        this.pixelsPerMsec = 0;
        this.axisStartTimeInMsec = 0;
        this.axisEndTimeInMsec = 0;
        /** Min/max timestamps from setData (START/STOP or sorted bounds) */
        this.minTimeInMsec = 0;
        this.maxTimeInMsec = 0;
        /** Total duration in ms for adaptive label formatting (Bug 3.9) */
        this.totalDurationMs = 0;
        this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
        this.styleOptions = {
            axis: { color: 'black', width: 2 },
            tick: { color: 'black', width: 1 },
            label: { color: 'black', fontSize: 12, fontFamily: 'Arial' },
            /** Mention de format sous la flèche de fin d'axe (ex. "(hh:mn:sec)") — voir getFormatMentionText(). */
            formatMention: { color: '#666666', fontSize: 11, fontFamily: 'Arial', fontStyle: 'italic' },
        };
        this.ticks = [];
        this.axisStart = null;
        this.axisEnd = null;
        this.yAxis = yAxis;
        this.graphic = new BaseGraphic(this.app);
        this.addChild(this.graphic);
        this.labelsContainer = new Container();
        this.addChild(this.labelsContainer);
    }
    getReadingTimeInMsec(reading) {
        const timeInMsec = new Date(reading.dateTime).getTime();
        return Number.isFinite(timeInMsec) ? timeInMsec : null;
    }
    getPosFromDateTime(dateTime) {
        const dateTimeInMsec = new Date(dateTime).getTime();
        const axisStart = this.yAxis.getAxisStart();
        if (!axisStart || typeof axisStart.x !== 'number') {
            throw new Error('No axis start found');
        }
        const pos = axisStart.x + (dateTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;
        return pos;
    }
    getDateTimeFromPos(xPos) {
        if (this.pixelsPerMsec === 0) {
            throw new Error('Axis not initialized: pixelsPerMsec is 0');
        }
        if (this.axisStartTimeInMsec === 0) {
            throw new Error('Axis not initialized: axisStartTimeInMsec is 0');
        }
        const axisStart = this.yAxis.getAxisStart();
        if (!axisStart || axisStart.x === undefined) {
            throw new Error('No axis start found');
        }
        const pixelsFromStart = xPos - axisStart.x;
        const timeDiffInMsec = pixelsFromStart / this.pixelsPerMsec;
        const dateTimeInMsec = this.axisStartTimeInMsec + timeDiffInMsec;
        return new Date(dateTimeInMsec);
    }
    clear() {
        this.destroyAxisLabels();
        this.ticks = [];
        this.pixelsPerMsec = 0;
        this.axisStartTimeInMsec = 0;
        this.axisEndTimeInMsec = 0;
        this.minTimeInMsec = 0;
        this.maxTimeInMsec = 0;
        this.totalDurationMs = 0;
        super.clear();
    }
    destroyAxisLabels() {
        const labels = this.labelsContainer.removeChildren();
        for (const label of labels) {
            label.destroy({ children: true });
        }
    }
    /**
     * Met à jour le format d'affichage du temps. Ne touche ni aux bornes ni au
     * pas de temps de l'axe (calculés dans setData) : recalcule uniquement le
     * texte des labels déjà présents, pour permettre un changement de format à
     * chaud sans recharger l'observation.
     */
    setGraphRenderOptions(options) {
        this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS, ...options };
        if (this.ticks.length > 0) {
            this.ticks = this.ticks.map((tick) => ({
                ...tick,
                label: this.computeLabelForTick(tick.dateTime),
            }));
        }
    }
    /**
     * Largeur d'un texte pour le style des labels de tick, via un canvas 2D
     * hors-DOM réutilisé (measureText). Fallback grossier si `document` n'est
     * pas disponible (SSR).
     */
    measureLabelWidth(text) {
        if (typeof document === 'undefined') {
            return text.length * this.styleOptions.label.fontSize * 0.6;
        }
        if (!xAxis.measureCanvas) {
            xAxis.measureCanvas = document.createElement('canvas');
        }
        const ctx = xAxis.measureCanvas.getContext('2d');
        if (!ctx) {
            return text.length * this.styleOptions.label.fontSize * 0.6;
        }
        ctx.font = `${this.styleOptions.label.fontSize}px ${this.styleOptions.label.fontFamily}`;
        return ctx.measureText(text).width;
    }
    /**
     * Espace vertical nécessaire sous la ligne de l'axe X pour contenir
     * entièrement les labels de tick, inclinés à 45°. `getRequiredHeight()` de
     * YAxis ne réservait qu'une marge fixe de 20px, insuffisante dès que les
     * labels dépassent quelques caractères (ex. format "Full" : 24 caractères)
     * — d'où le rognage observé en export PNG/JPEG quand le canvas est
     * redimensionné exactement à la hauteur "requise".
     */
    getRequiredBottomMargin() {
        if (this.ticks.length === 0)
            return 0;
        let maxLabelWidth = 0;
        for (const tick of this.ticks) {
            if (!tick.label)
                continue;
            const width = this.measureLabelWidth(tick.label);
            if (width > maxLabelWidth)
                maxLabelWidth = width;
        }
        if (maxLabelWidth === 0)
            return 0;
        const angleRad = (45 * Math.PI) / 180;
        const fontSize = this.styleOptions.label.fontSize;
        // Étendue verticale de la boîte de texte pivotée à 45° depuis son point
        // d'ancrage (proche du coin haut-gauche, voir anchor.set(-0.05, 0) dans draw()).
        const rotatedExtent = maxLabelWidth * Math.sin(angleRad) + fontSize * Math.cos(angleRad);
        const labelOffsetFromAxis = 12; // doit rester aligné avec `label.y = xAxisStart.y + 12` dans draw()
        const safetyPadding = 8;
        return Math.ceil(labelOffsetFromAxis + rotatedExtent + safetyPadding);
    }
    computeLabelForTick(dateTime) {
        const format = this.graphRenderOptions.timeDisplayFormat ?? TimeDisplayFormatEnum.Auto;
        const isChronometer = this.observation?.mode === ObservationModeEnum.Chronometer;
        if (format !== TimeDisplayFormatEnum.Auto) {
            return isChronometer
                ? formatChronometerFixed(dateTime, CHRONOMETER_T0, format)
                : formatCalendarFixed(dateTime, format);
        }
        return isChronometer
            ? formatChronoAxisLabel(dateTime, CHRONOMETER_T0, this.totalDurationMs)
            : formatAxisLabel(dateTime, this.totalDurationMs);
    }
    /**
     * Mention de format affichée sous la flèche de fin d'axe (ex. "(hh:mn:sec)").
     * Uniquement pour un format fixe (pas Auto, adaptatif donc auto-descriptif)
     * en mode calendrier (le mode chronomètre porte déjà l'unité en toutes
     * lettres dans chaque valeur, ex. "62m03s" — pas d'ambiguïté à lever).
     */
    getFormatMentionText() {
        const format = this.graphRenderOptions.timeDisplayFormat ?? TimeDisplayFormatEnum.Auto;
        if (format === TimeDisplayFormatEnum.Auto)
            return null;
        if (this.observation?.mode === ObservationModeEnum.Chronometer)
            return null;
        return `(${getCalendarFixedFormatNotation(format)})`;
    }
    setData(observation) {
        super.setData(observation);
        const readings = observation.readings;
        if (!readings?.length) {
            const now = Date.now();
            this.readings = [];
            this.minTimeInMsec = now;
            this.maxTimeInMsec = now + 1;
            this.totalDurationMs = 1;
            this.ticks = [{ dateTime: new Date(now), label: '' }];
            return;
        }
        this.readings = readings;
        // Bug 3.3: Use graph display bounds (START through last STOP, or in-progress session)
        const sortedByTime = [...readings].sort((a, b) => {
            const ta = this.getReadingTimeInMsec(a) ?? 0;
            const tb = this.getReadingTimeInMsec(b) ?? 0;
            return ta - tb;
        });
        const displayBounds = getGraphDisplayTimeBounds(readings);
        let minTimeInMsec;
        let maxTimeInMsec;
        if (displayBounds) {
            minTimeInMsec = displayBounds.startMs;
            maxTimeInMsec = displayBounds.endMs;
        }
        else {
            minTimeInMsec = this.getReadingTimeInMsec(sortedByTime[0]) ?? Date.now();
            maxTimeInMsec =
                this.getReadingTimeInMsec(sortedByTime[sortedByTime.length - 1]) ?? minTimeInMsec + 1;
        }
        // Some legacy mobile auto-corrections persisted START at Unix epoch (1970-01-01).
        // In Calendar mode this creates absurd decades-long axes. If we detect this sentinel,
        // realign the axis start to the earliest non-START reading.
        if (this.observation?.mode !== ObservationModeEnum.Chronometer && minTimeInMsec <= 1000) {
            const firstNonStart = sortedByTime.find((r) => r.type !== ReadingTypeEnum.START);
            const firstNonStartTime = firstNonStart ? this.getReadingTimeInMsec(firstNonStart) : null;
            if (firstNonStartTime !== null) {
                minTimeInMsec = firstNonStartTime;
            }
        }
        // Bug 3.8: Guard against invalid dates (NaN)
        if (!Number.isFinite(minTimeInMsec))
            minTimeInMsec = Date.now();
        if (!Number.isFinite(maxTimeInMsec))
            maxTimeInMsec = minTimeInMsec + 1;
        // Bug 3.8: Ensure min <= max (chronological order)
        if (minTimeInMsec > maxTimeInMsec) {
            [minTimeInMsec, maxTimeInMsec] = [maxTimeInMsec, minTimeInMsec];
        }
        this.minTimeInMsec = minTimeInMsec;
        this.maxTimeInMsec = maxTimeInMsec;
        this.totalDurationMs = maxTimeInMsec - minTimeInMsec;
        const idealTimeStep = (maxTimeInMsec - minTimeInMsec) / 5;
        let bestTimeStep = null;
        let diff = Number.MAX_SAFE_INTEGER;
        for (const timeStep of Object.keys(timeSteps)) {
            const timeStepValue = timeSteps[timeStep];
            const delta = Math.abs(timeStepValue - idealTimeStep);
            if (delta < diff) {
                bestTimeStep = timeStep;
                diff = delta;
            }
        }
        if (!bestTimeStep) {
            throw new Error('No best time step found');
        }
        const mainTimeStepInMsec = timeSteps[bestTimeStep];
        const ticks = [];
        const tickTimesInMsec = [minTimeInMsec];
        // Ensure we always have a label at axis origin (X/Y intersection),
        // then add aligned ticks strictly within the axis end.
        const firstAlignedTickTimeInMsec = Math.ceil(minTimeInMsec / mainTimeStepInMsec) * mainTimeStepInMsec;
        let currentTimeInMsec = firstAlignedTickTimeInMsec;
        while (currentTimeInMsec <= maxTimeInMsec) {
            if (currentTimeInMsec > minTimeInMsec) {
                tickTimesInMsec.push(currentTimeInMsec);
            }
            currentTimeInMsec += mainTimeStepInMsec;
        }
        for (const tickTimeInMsec of tickTimesInMsec) {
            const dateTime = new Date(tickTimeInMsec);
            ticks.push({ dateTime, label: this.computeLabelForTick(dateTime) });
        }
        this.ticks = ticks;
    }
    draw() {
        this.graphic.clear();
        this.graphic.x = 0;
        this.graphic.y = 0;
        this.destroyAxisLabels();
        this.labelsContainer.x = 0;
        this.labelsContainer.y = 0;
        this.x = 0;
        this.y = 0;
        this.scale.set(1);
        this.rotation = 0;
        const width = this.app.screen.width;
        const xAxisStart = this.yAxis.getAxisStart();
        if (!xAxisStart ||
            typeof xAxisStart.x !== 'number' ||
            typeof xAxisStart.y !== 'number') {
            throw new Error('No x axis start found');
        }
        this.axisStart = xAxisStart;
        const xAxisEnd = {
            x: width * 0.9,
            y: xAxisStart.y,
        };
        if (!xAxisEnd ||
            typeof xAxisEnd.x !== 'number' ||
            typeof xAxisEnd.y !== 'number') {
            throw new Error('No x axis end found');
        }
        this.axisEnd = xAxisEnd;
        this.graphic.moveTo(xAxisStart.x, xAxisStart.y);
        this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
        this.graphic.setStrokeStyle({
            color: this.styleOptions.axis.color,
            width: this.styleOptions.axis.width,
        });
        this.graphic.stroke();
        this.graphic.moveTo(xAxisEnd.x, xAxisEnd.y);
        this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y - 10);
        this.graphic.lineTo(xAxisEnd.x - 10, xAxisEnd.y + 10);
        this.graphic.lineTo(xAxisEnd.x, xAxisEnd.y);
        this.graphic.closePath();
        this.graphic.fill({ color: this.styleOptions.axis.color });
        const axisLengthInPixels = xAxisEnd.x - xAxisStart.x - 20;
        // Bug 3.3: Use stored min/max from setData (START/STOP bounds)
        this.axisStartTimeInMsec = this.minTimeInMsec;
        this.axisEndTimeInMsec = this.maxTimeInMsec;
        // Bug 3.8: Guard against zero or negative duration (avoids NaN/Infinity)
        let axisTimeLengthInMsec = this.maxTimeInMsec - this.minTimeInMsec;
        if (axisTimeLengthInMsec <= 0 || !Number.isFinite(axisTimeLengthInMsec)) {
            axisTimeLengthInMsec = 1; // 1ms minimum to avoid division by zero
        }
        const pixelsPerMsec = axisLengthInPixels / axisTimeLengthInMsec;
        this.pixelsPerMsec = Number.isFinite(pixelsPerMsec) ? pixelsPerMsec : 0;
        if (this.ticks.length === 0) {
            console.warn('No ticks generated for X axis');
            this.visible = true;
            this.alpha = 1;
            return;
        }
        const maxTickXPos = xAxisEnd.x - 20;
        for (const tick of this.ticks) {
            const tickTimeInMsec = new Date(tick.dateTime).getTime();
            const tickXpos = xAxisStart.x + (tickTimeInMsec - this.axisStartTimeInMsec) * this.pixelsPerMsec;
            // Bug 3.8: Skip invalid positions (NaN, Infinity)
            if (!Number.isFinite(tickXpos)) {
                continue;
            }
            // Keep ticks strictly within the visible X axis segment (before arrow tip).
            if (tickXpos < xAxisStart.x || tickXpos > maxTickXPos) {
                continue;
            }
            tick.pos = tickXpos;
            this.graphic.moveTo(tickXpos, xAxisStart.y - 10);
            this.graphic.lineTo(tickXpos, xAxisStart.y + 10);
            this.graphic.setStrokeStyle({
                color: this.styleOptions.tick.color,
                width: this.styleOptions.tick.width,
            });
            this.graphic.stroke();
            const label = new Text({
                text: tick.label,
                style: {
                    fontSize: this.styleOptions.label.fontSize,
                    fill: this.styleOptions.label.color,
                    fontFamily: this.styleOptions.label.fontFamily,
                },
            });
            label.x = tickXpos;
            label.y = xAxisStart.y + 12;
            label.anchor.set(-0.05, 0);
            label.angle = 45;
            label.visible = true;
            label.alpha = 1;
            this.labelsContainer.addChild(label);
        }
        const formatMentionText = this.getFormatMentionText();
        if (formatMentionText) {
            const formatMention = new Text({
                text: formatMentionText,
                style: {
                    fontSize: this.styleOptions.formatMention.fontSize,
                    fill: this.styleOptions.formatMention.color,
                    fontFamily: this.styleOptions.formatMention.fontFamily,
                    fontStyle: this.styleOptions.formatMention.fontStyle,
                },
            });
            // Horizontale (pas inclinée comme les labels de tick), centrée sous la
            // flèche de fin d'axe, à la même hauteur que les labels de tick.
            // Clamp pour éviter le débordement à droite sur un graphe étroit
            // (ex. "(JJ.MM.AAAA hh:mn:sec:ms)" avec seulement 10% de marge).
            formatMention.anchor.set(0.5, 0);
            const preferredX = xAxisEnd.x - 5;
            const halfWidth = formatMention.width / 2;
            formatMention.x = Math.min(width - halfWidth, Math.max(halfWidth, preferredX));
            formatMention.y = xAxisStart.y + 12;
            formatMention.angle = 0;
            formatMention.visible = true;
            formatMention.alpha = 1;
            this.labelsContainer.addChild(formatMention);
        }
        this.labelsContainer.visible = true;
        this.labelsContainer.alpha = 1;
        this.visible = true;
        this.alpha = 1;
    }
}
/** Canvas hors-DOM réutilisé pour mesurer les labels (measureText), partagé entre instances. */
xAxis.measureCanvas = null;
//# sourceMappingURL=x-axis.js.map