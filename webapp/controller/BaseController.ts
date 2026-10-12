import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import type Router from "sap/ui/core/routing/Router";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import InstanceManager from "sap/m/InstanceManager";
import formatter from "../model/formatter";
import type CartModel from "../model/CartModel";
import type Component from "../Component";
import { getBackendErrorMessage } from "../util/feedback";
import { isBackendUnavailableError, isSessionExpiredError } from "../util/http";

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default abstract class BaseController extends Controller {

    public readonly formatter = formatter;

    protected getRouter(): Router {
        return UIComponent.getRouterFor(this);
    }

    protected getAppComponent(): Component {
        return this.getOwnerComponent() as unknown as Component;
    }

    public navTo(route: string, parameters?: object, replace?: boolean): void {
        this.getRouter().navTo(route, parameters, replace);
    }

    public onNavBack(): void {
        if (History.getInstance().getPreviousHash() !== undefined) {
            window.history.go(-1);
            return;
        }

        this.navTo("catalog", {}, true);
    }

    public onGoHome(): void {
        this.navTo("catalog");
    }

    public onOpenCart(): void {
        this.navTo("cart");
    }

    public formatStatus(status: string | null | undefined): string {
        return status ? this.getText(`orderStatus.${status}`) : "";
    }

    public formatDeliveryType(deliveryType: string | null | undefined): string {
        return deliveryType ? this.getText(`deliveryType.${deliveryType}`) : "";
    }

    public formatChannel(channel: string | null | undefined): string {
        return channel ? this.getText(`channel.${channel}`) : "";
    }

    public formatFulfillment(fulfillment: string | null | undefined): string {
        return fulfillment ? this.getText(`fulfillment.${fulfillment}`) : "";
    }

    public formatReward(
        rewardType: string | null | undefined,
        rewardValue: number | string | null | undefined,
        gift: string | null | undefined,
        maxDiscount?: number | string | null
    ): string {
        if (!rewardType) {
            return "";
        }

        const value = Number(rewardValue ?? 0);
        const details: Record<string, string> = {
            PERCENT: this.getText("rewardSummary.PERCENT", [value]),
            FIXED: this.getText("rewardSummary.FIXED", [this.formatter.currency(value)]),
            GIFT: this.getText("rewardSummary.GIFT", [gift ?? ""]),
            CHEAPEST_FREE: this.getText("rewardSummary.CHEAPEST_FREE")
        };

        const summary = details[rewardType] ?? "";

        return maxDiscount
            ? this.getText("rewardSummaryLimit", [summary, this.formatter.currency(Number(maxDiscount))])
            : summary;
    }

    public formatCouponUsage(couponCode: string | null | undefined, usedCount: number | null | undefined, maxUses: number | null | undefined): string {
        if (!couponCode) {
            return this.getText("automaticPromotion");
        }

        return maxUses
            ? this.getText("couponUsageLimited", [couponCode, usedCount ?? 0, maxUses])
            : this.getText("couponUsage", [couponCode, usedCount ?? 0]);
    }

    public formatPeriod(startDate: string | null | undefined, endDate: string | null | undefined): string {
        if (!startDate && !endDate) {
            return this.getText("noPeriod");
        }

        return this.getText("periodRange", [this.formatter.date(startDate) || "...", this.formatter.date(endDate) || "..."]);
    }

    public refreshStoreInfo(): Promise<void> {
        return this.getAppComponent().refreshStoreInfo();
    }

    public getText(key: string, parameters?: unknown[]): string {
        const bundle = (this.getAppComponent().getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
        return bundle.getText(key, parameters) ?? key;
    }

    public getCatalogModel(): ODataModel {
        return this.getAppComponent().getModel("catalog") as ODataModel;
    }

    protected getCartModel(): CartModel {
        return this.getAppComponent().getModel("cart") as CartModel;
    }

    public getStoreModel(): JSONModel {
        return this.getAppComponent().getModel("store") as JSONModel;
    }

    protected ensureAdminModel(): Promise<ODataModel | null> {
        return this.getAppComponent().ensureAdminModel();
    }

    public getAdminModel(): ODataModel {
        return this.getAppComponent().getModel() as ODataModel;
    }

    public showToast(key: string, parameters?: unknown[]): void {
        MessageToast.show(this.getText(key, parameters));
    }

    public confirm(key: string, parameters?: unknown[]): Promise<boolean> {
        return new Promise((resolve) => {
            MessageBox.confirm(this.getText(key, parameters), {
                onClose: (action: string | null) => resolve(action === MessageBox.Action.OK)
            });
        });
    }

    public handleError(error: unknown, key: string): void {
        if (isSessionExpiredError(error)) {
            return;
        }

        if (isBackendUnavailableError(error)) {
            this.getAppComponent().notifyBackendUnavailable();
            return;
        }

        const detail = getBackendErrorMessage(error);
        const message = this.getText(key);

        MessageBox.error(detail ? `${message}\n\n${detail}` : message);
    }

    public async runBusy<Result>(action: () => Promise<Result>): Promise<Result> {
        const controls = [this.getView(), ...InstanceManager.getOpenDialogs()];

        controls.forEach((control) => control?.setBusy(true));

        try {
            return await action();
        } finally {
            controls.forEach((control) => control?.setBusy(false));
        }
    }

}
