import JSONModel from "sap/ui/model/json/JSONModel";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type { IconTabBar$SelectEvent } from "sap/m/IconTabBar";
import BaseController from "./BaseController";
import OrdersSection from "./admin/OrdersSection";
import ProductsSection from "./admin/ProductsSection";
import CategoriesSection from "./admin/CategoriesSection";
import BackupSection from "./admin/BackupSection";
import ReportsSection from "./admin/ReportsSection";
import SettingsSection from "./admin/SettingsSection";
import EmailServerSection from "./admin/EmailServerSection";
import PromotionsSection from "./admin/PromotionsSection";
import StoreSaleSection from "./admin/StoreSaleSection";
import OrderEditSection from "./admin/OrderEditSection";
import OrderReturnSection from "./admin/OrderReturnSection";
import ProductPicker from "./admin/ProductPicker";
import WhatsappComposer from "./admin/WhatsappComposer";
import StockSection from "./admin/StockSection";
import { AuthenticationService } from "../auth/AuthenticationService";

const DEFAULT_TAB = "orders";
const REPORTS_TAB = "reports";
const SETTINGS_TAB = "settings";

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Admin extends BaseController {

    public readonly orders = new OrdersSection(this);

    public readonly products = new ProductsSection(this);

    public readonly categories = new CategoriesSection(this);

    public readonly backup = new BackupSection(this);

    public readonly reports = new ReportsSection(this);

    public readonly settings = new SettingsSection(this);

    public readonly emailServer = new EmailServerSection(this);

    public readonly promotions = new PromotionsSection(this);

    public readonly storeSale = new StoreSaleSection(this);

    public readonly orderEdit = new OrderEditSection(this);

    public readonly orderReturn = new OrderReturnSection(this);

    public readonly productPicker = new ProductPicker(this);

    public readonly whatsapp = new WhatsappComposer(this);

    public readonly stock = new StockSection(this);

    private viewModel: JSONModel;

    public onInit(): void {
        this.viewModel = new JSONModel({ tab: DEFAULT_TAB, userName: "" });
        this.getView()?.setModel(this.viewModel, "adminView");
        this.getView()?.setModel(this.reports.model, "report");
        this.getView()?.setModel(this.settings.model, "settings");
        this.getView()?.setModel(this.emailServer.model, "emailServer");
        this.getView()?.setModel(this.orders.filterModel, "ordersFilter");
        this.getView()?.setModel(this.products.filterModel, "productsFilter");

        this.getRouter().getRoute("admin")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    public onTabSelect(event: IconTabBar$SelectEvent): void {
        this.navTo("admin", { tab: event.getParameter("key") }, true);
    }

    public onOpenStore(): void {
        this.navTo("catalog");
    }

    public async onLogout(): Promise<void> {
        await AuthenticationService.logout();
        this.navTo("catalog", {}, true);
    }

    public byControlId<ControlType>(id: string): ControlType {
        return this.byId(id) as ControlType;
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { tab } = event.getParameter("arguments") as { tab?: string };
        const adminModel = await this.ensureAdminModel();

        if (!adminModel) {
            this.navTo("login", {}, true);
            return;
        }

        const selectedTab = tab || DEFAULT_TAB;

        this.viewModel.setProperty("/tab", selectedTab);
        this.viewModel.setProperty("/userName", AuthenticationService.getSession()?.userName ?? "");
        this.orders.refresh();
        this.products.refresh();
        this.promotions.refresh();
        this.stock.refresh();

        if (selectedTab === REPORTS_TAB) {
            await this.reports.load();
        }

        if (selectedTab === SETTINGS_TAB) {
            await Promise.all([this.settings.load(), this.emailServer.load()]);
        }
    }

}
