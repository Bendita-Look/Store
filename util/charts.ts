export interface ChartSeries {
    label: string;
    color: string;
}

export interface ColumnGroup {
    label: string;
    values: number[];
}

export interface ChartSlice {
    label: string;
    value: number;
}

export const CHART_COLORS = ["#a8814f", "#e8a0b4", "#6f9a7e", "#c9a46e", "#8c6e9e", "#d98c6a", "#5f8fa8", "#b5b06a"];

const WIDTH = 960;
const HEIGHT = 300;
const PADDING = { top: 16, right: 12, bottom: 34, left: 84 };
const GRID_LINES = 4;
const DONUT_SIZE = 220;
const DONUT_RADIUS = 90;
const DONUT_THICKNESS = 34;
const BAR_ROW_HEIGHT = 34;
const BAR_LABEL_WIDTH = 240;
const BAR_VALUE_WIDTH = 130;

function escape(text: string): string {
    return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] as string);
}

function niceMax(value: number): number {
    if (value <= 0) {
        return 1;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));

    return Math.ceil(value / magnitude) * magnitude;
}

function legend(series: ChartSeries[]): string {
    const items = series.map((item) => `<span class="blChartLegendItem"><i style="background:${item.color}"></i>${escape(item.label)}</span>`);

    return `<div class="blChartLegend">${items.join("")}</div>`;
}

export function columnChart(groups: ColumnGroup[], series: ChartSeries[], format: (value: number) => string): string {
    const values = groups.flatMap((group) => group.values);
    const max = niceMax(Math.max(...values, 0));
    const min = Math.min(...values, 0) < 0 ? -niceMax(Math.abs(Math.min(...values, 0))) : 0;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const y = (value: number): number => PADDING.top + (max - value) / (max - min) * plotHeight;
    const groupWidth = plotWidth / Math.max(groups.length, 1);
    const barWidth = Math.min(18, groupWidth * 0.8 / Math.max(series.length, 1));

    const grid = Array.from({ length: GRID_LINES + 1 }, (_, index) => {
        const value = min + (max - min) * index / GRID_LINES;
        const position = y(value);

        return `<line x1="${PADDING.left}" x2="${WIDTH - PADDING.right}" y1="${position}" y2="${position}" class="blChartGrid"/>`
            + `<text x="${PADDING.left - 8}" y="${position + 4}" text-anchor="end" class="blChartAxis">${escape(format(value))}</text>`;
    }).join("");

    const bars = groups.map((group, groupIndex) => {
        const start = PADDING.left + groupIndex * groupWidth + (groupWidth - barWidth * series.length) / 2;
        const columns = group.values.map((value, seriesIndex) => {
            const top = y(Math.max(value, 0));
            const height = Math.max(Math.abs(y(value) - y(0)), value === 0 ? 0 : 1);

            return `<rect x="${start + seriesIndex * barWidth}" y="${top}" width="${barWidth - 2}" height="${height}" rx="3" fill="${series[seriesIndex].color}">`
                + `<title>${escape(`${group.label} · ${series[seriesIndex].label}: ${format(value)}`)}</title></rect>`;
        }).join("");

        return columns + `<text x="${PADDING.left + groupIndex * groupWidth + groupWidth / 2}" y="${HEIGHT - 12}" text-anchor="middle" class="blChartAxis">${escape(group.label)}</text>`;
    }).join("");

    return `<div class="blChart">${legend(series)}<div class="blChartScroll blChartTimeline"><svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" preserveAspectRatio="xMidYMid meet">${grid}${bars}</svg></div></div>`;
}

export function donutChart(slices: ChartSlice[], format: (value: number) => string, emptyText: string): string {
    const positive = slices.filter((slice) => slice.value > 0);
    const total = positive.reduce((sum, slice) => sum + slice.value, 0);

    if (!total) {
        return `<div class="blChart blChartEmpty">${escape(emptyText)}</div>`;
    }

    const center = DONUT_SIZE / 2;
    const circumference = 2 * Math.PI * DONUT_RADIUS;
    let offset = 0;

    const arcs = positive.map((slice, index) => {
        const length = slice.value / total * circumference;
        const arc = `<circle cx="${center}" cy="${center}" r="${DONUT_RADIUS}" fill="none" stroke="${CHART_COLORS[index % CHART_COLORS.length]}" stroke-width="${DONUT_THICKNESS}"`
            + ` stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${center} ${center})">`
            + `<title>${escape(`${slice.label}: ${format(slice.value)} (${Math.round(slice.value / total * 100)}%)`)}</title></circle>`;

        offset += length;

        return arc;
    }).join("");

    const series = positive.map((slice, index) => ({
        label: `${slice.label} · ${Math.round(slice.value / total * 100)}%`,
        color: CHART_COLORS[index % CHART_COLORS.length]
    }));

    return `<div class="blChart blChartDonut"><svg viewBox="0 0 ${DONUT_SIZE} ${DONUT_SIZE}" role="img">${arcs}`
        + `<text x="${center}" y="${center + 6}" text-anchor="middle" class="blChartTotal">${escape(format(total))}</text></svg>${legend(series)}</div>`;
}

export function barChart(slices: ChartSlice[], color: string, format: (value: number) => string, emptyText: string): string {
    if (!slices.length) {
        return `<div class="blChart blChartEmpty">${escape(emptyText)}</div>`;
    }

    const max = Math.max(...slices.map((slice) => Math.abs(slice.value)), 1);
    const height = slices.length * BAR_ROW_HEIGHT;
    const plotWidth = WIDTH - BAR_LABEL_WIDTH - BAR_VALUE_WIDTH;

    const rows = slices.map((slice, index) => {
        const top = index * BAR_ROW_HEIGHT;
        const width = Math.max(Math.abs(slice.value) / max * plotWidth, 2);
        const fill = slice.value < 0 ? "#c96b6b" : color;

        return `<text x="${BAR_LABEL_WIDTH - 10}" y="${top + 21}" text-anchor="end" class="blChartLabel">${escape(slice.label)}</text>`
            + `<rect x="${BAR_LABEL_WIDTH}" y="${top + 7}" width="${width}" height="20" rx="4" fill="${fill}"><title>${escape(`${slice.label}: ${format(slice.value)}`)}</title></rect>`
            + `<text x="${BAR_LABEL_WIDTH + width + 8}" y="${top + 21}" class="blChartValue">${escape(format(slice.value))}</text>`;
    }).join("");

    return `<div class="blChart"><div class="blChartScroll"><svg viewBox="0 0 ${WIDTH} ${height}" role="img" preserveAspectRatio="xMidYMid meet">${rows}</svg></div></div>`;
}
