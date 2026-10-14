import JSONModel from "sap/ui/model/json/JSONModel";
import type { Select$ChangeEvent } from "sap/m/Select";
import type Admin from "../Admin.controller";
import ReportService, { SalesReport } from "../../service/ReportService";

const YEARS_AVAILABLE = 5;
const PERCENT = 100;

interface MonthRow {
    month: string;
    orders: number;
    items: number;
    revenue: number;
    refunds: number;
    share: number;
}

export default class ReportsSection {

    public readonly model: JSONModel;

    constructor(private readonly controller: Admin) {
        const currentYear = new Date().getFullYear();

        this.model = new JSONModel({
            year: String(currentYear),
            years: Array.from({ length: YEARS_AVAILABLE }, (_, index) => ({ key: String(currentYear - index) })),
            loaded: false,
            summary: null,
            months: [],
            topProducts: [],
            topReturned: []
        });
    }

    public onYearChange = (event: Select$ChangeEvent): void => {
        this.model.setProperty("/year", event.getParameter("selectedItem")?.getKey() ?? this.model.getProperty("/year"));
        void this.load();
    };

    public onRefresh = (): void => {
        void this.load();
    };

    public async load(): Promise<void> {
        try {
            const year = Number(this.model.getProperty("/year"));
            const report = await this.controller.runBusy(() => new ReportService(this.controller.getAdminModel()).salesReport(year));

            this.model.setProperty("/summary", report);
            this.model.setProperty("/months", this.buildMonths(report));
            this.model.setProperty("/topProducts", report.TopProducts);
            this.model.setProperty("/topReturned", report.TopReturned);
            this.model.setProperty("/loaded", true);
        } catch (error) {
            this.controller.handleError(error, "reportLoadError");
        }
    }

    private buildMonths(report: SalesReport): MonthRow[] {
        const highestRevenue = Math.max(...report.Months.map((month) => Number(month.Revenue)), 0);

        return report.Months.map((month) => ({
            month: this.controller.getText(`month.${month.Month}`),
            orders: month.Orders,
            items: month.Items,
            revenue: Number(month.Revenue),
            refunds: Number(month.Refunds),
            share: highestRevenue ? Math.round(Number(month.Revenue) / highestRevenue * PERCENT) : 0
        }));
    }

}
