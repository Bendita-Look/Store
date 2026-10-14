sap.ui.define(["sap/ui/model/json/JSONModel", "../../service/ReportService"], function (JSONModel, __ReportService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const ReportService = _interopRequireDefault(__ReportService);
  const YEARS_AVAILABLE = 5;
  const PERCENT = 100;
  class ReportsSection {
    constructor(controller) {
      this.controller = controller;
      const currentYear = new Date().getFullYear();
      this.model = new JSONModel({
        year: String(currentYear),
        years: Array.from({
          length: YEARS_AVAILABLE
        }, (_, index) => ({
          key: String(currentYear - index)
        })),
        loaded: false,
        summary: null,
        months: [],
        topProducts: [],
        topReturned: []
      });
    }
    onYearChange = event => {
      this.model.setProperty("/year", event.getParameter("selectedItem")?.getKey() ?? this.model.getProperty("/year"));
      void this.load();
    };
    onRefresh = () => {
      void this.load();
    };
    async load() {
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
    buildMonths(report) {
      const highestRevenue = Math.max(...report.Months.map(month => Number(month.Revenue)), 0);
      return report.Months.map(month => ({
        month: this.controller.getText(`month.${month.Month}`),
        orders: month.Orders,
        items: month.Items,
        revenue: Number(month.Revenue),
        refunds: Number(month.Refunds),
        share: highestRevenue ? Math.round(Number(month.Revenue) / highestRevenue * PERCENT) : 0
      }));
    }
  }
  return ReportsSection;
});
//# sourceMappingURL=ReportsSection-dbg.js.map
