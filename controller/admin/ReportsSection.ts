import JSONModel from "sap/ui/model/json/JSONModel";
import type { Select$ChangeEvent } from "sap/m/Select";
import type Admin from "../Admin.controller";
import ReportService, { SalesReport } from "../../service/ReportService";
import formatter from "../../model/formatter";
import { barChart, CHART_COLORS, columnChart, donutChart } from "../../util/charts";

const YEARS_AVAILABLE = 5;
const PERCENT = 100;
const SHORT_MONTH_LENGTH = 3;
const DEFAULT_VIEW = "overview";
const CHART_SCROLL_DELAY = 150;

interface MonthRow {
    month: string;
    orders: number;
    items: number;
    revenue: number;
    refunds: number;
    cost: number;
    profit: number;
    margin: number;
    marginText: string;
    purchases: number;
    share: number;
}

export default class ReportsSection {

    public readonly model: JSONModel;

    constructor(private readonly controller: Admin) {
        const currentYear = new Date().getFullYear();

        this.model = new JSONModel({
            year: String(currentYear),
            years: Array.from({ length: YEARS_AVAILABLE }, (_, index) => ({ key: String(currentYear - index) })),
            view: DEFAULT_VIEW,
            loaded: false,
            summary: null,
            months: [],
            topProducts: [],
            topReturned: [],
            topCategories: [],
            charts: { monthly: "", profit: "", categories: "", products: "" }
        });
    }

    public onYearChange = (event: Select$ChangeEvent): void => {
        this.model.setProperty("/year", event.getParameter("selectedItem")?.getKey() ?? this.model.getProperty("/year"));
        void this.load();
    };

    public onRefresh = (): void => {
        void this.load();
    };

    public onViewChange = (): void => {
        this.scrollChartsToLatest();
    };

    public async load(): Promise<void> {
        try {
            const year = Number(this.model.getProperty("/year"));
            const report = await this.controller.runBusy(() => new ReportService(this.controller.getAdminModel()).salesReport(year));
            const months = this.buildMonths(report);

            this.model.setProperty("/summary", { ...report, MarginText: formatter.percent(report.Margin) });
            this.model.setProperty("/months", months);
            this.model.setProperty("/topProducts", report.TopProducts);
            this.model.setProperty("/topReturned", report.TopReturned);
            this.model.setProperty("/topCategories", report.TopCategories.map((category) => ({
                ...category,
                CategoryName: category.CategoryName || this.controller.getText("withoutCategory")
            })));
            this.model.setProperty("/charts", this.buildCharts(report, this.visibleMonths(year, months)));
            this.model.setProperty("/loaded", true);
            this.scrollChartsToLatest();
        } catch (error) {
            this.controller.handleError(error, "reportLoadError");
        }
    }

    private visibleMonths(year: number, months: MonthRow[]): MonthRow[] {
        const today = new Date();

        return year === today.getFullYear() ? months.slice(0, today.getMonth() + 1) : months;
    }

    private scrollChartsToLatest(): void {
        setTimeout(() => {
            document.querySelectorAll<HTMLElement>(".blChartTimeline").forEach((chart) => {
                chart.scrollLeft = chart.scrollWidth;
            });
        }, CHART_SCROLL_DELAY);
    }

    private buildCharts(report: SalesReport, months: MonthRow[]): object {
        const currency = (value: number): string => formatter.currency(value);
        const shortMonth = (row: MonthRow): string => row.month.slice(0, SHORT_MONTH_LENGTH);
        const text = (key: string): string => this.controller.getText(key);

        return {
            monthly: columnChart(
                months.map((row) => ({ label: shortMonth(row), values: [row.revenue, row.cost, row.profit] })),
                [
                    { label: text("kpiNetRevenue"), color: CHART_COLORS[0] },
                    { label: text("kpiCost"), color: CHART_COLORS[1] },
                    { label: text("kpiProfit"), color: CHART_COLORS[2] }
                ],
                currency
            ),
            profit: columnChart(
                months.map((row) => ({ label: shortMonth(row), values: [row.profit, row.purchases] })),
                [
                    { label: text("kpiProfit"), color: CHART_COLORS[2] },
                    { label: text("kpiPurchases"), color: CHART_COLORS[3] }
                ],
                currency
            ),
            categories: donutChart(
                report.TopCategories.map((category) => ({
                    label: category.CategoryName || text("withoutCategory"),
                    value: Number(category.Revenue)
                })),
                currency,
                text("noSalesInYear")
            ),
            products: barChart(
                [...report.TopProducts]
                    .sort((first, second) => Number(second.Profit) - Number(first.Profit))
                    .map((product) => ({ label: product.ProductName, value: Number(product.Profit) })),
                CHART_COLORS[2],
                currency,
                text("noSalesInYear")
            )
        };
    }

    private buildMonths(report: SalesReport): MonthRow[] {
        const highestRevenue = Math.max(...report.Months.map((month) => Number(month.Revenue)), 0);

        return report.Months.map((month) => {
            const revenue = Number(month.Revenue);
            const profit = Number(month.Profit);
            const margin = revenue > 0 ? profit / revenue * PERCENT : 0;

            return {
                month: this.controller.getText(`month.${month.Month}`),
                orders: month.Orders,
                items: month.Items,
                revenue,
                refunds: Number(month.Refunds),
                cost: Number(month.Cost),
                profit,
                margin,
                marginText: revenue > 0 ? formatter.percent(margin) : "-",
                purchases: Number(month.Purchases),
                share: highestRevenue ? Math.round(revenue / highestRevenue * PERCENT) : 0
            };
        });
    }

}
