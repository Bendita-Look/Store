import BaseComponent from "sap/ui/core/UIComponent";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";
import type MobileRouter from "sap/m/routing/Router";
import MessageBox from "sap/m/MessageBox";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import { createDeviceModel } from "./model/models";
import CartModel from "./model/CartModel";
import { AuthenticationService } from "./auth/AuthenticationService";
import { AuthenticatedProviderFactory } from "./auth/providers/AuthenticatedProviderFactory";
import { XsuaaAuthHelper } from "./auth/providers/XsuaaAuthHelper";
import { SessionStorage } from "./auth/storage/SessionStorage";
import Environment from "./util/Environment";
import { isAuthenticationError, isAuthorizationError, isBackendUnavailableError, isSessionExpiredError, storeUrlHeader } from "./util/http";
import { getBackendErrorMessage } from "./util/feedback";
import StoreService from "./service/StoreService";

const ADMIN_ROUTE = "admin";
const LOGIN_ROUTE = "login";

/**
 * @namespace apps.dflc.benditalook
 */
export default class Component extends BaseComponent {

    public static metadata = {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    };

    private sessionExpiredShown = false;

    private unexpectedErrorShown = false;

    private backendUnavailableShown = false;

    public init(): void {
        super.init();

        void this.start();
    }

    private async start(): Promise<void> {
        await this.loadRuntimeConfig();

        AuthenticationService.initialize(AuthenticatedProviderFactory.create());
        AuthenticationService.onSessionExpired(() => this.handleSessionExpired());
        AuthenticationService.onAuthError((message) => this.handleAuthError(message));

        this.registerGlobalErrorHandlers();

        this.setModel(createDeviceModel(), "device");
        this.setModel(new CartModel(), "cart");
        this.setModel(new JSONModel({}), "store");
        this.setModel(this.createODataModel(XsuaaAuthHelper.getConfig().catalogService), "catalog");

        void this.refreshStoreInfo();

        const router = this.getRouter() as MobileRouter;

        router.getTargetHandler().setCloseDialogs(false);
        router.initialize();

        await this.completeLoginRedirect();
    }

    public async ensureAdminModel(): Promise<ODataModel | null> {
        if (!await AuthenticationService.isAuthenticated()) {
            return null;
        }

        const accessToken = AuthenticationService.getSession()?.accessToken ?? "";
        const current = this.getModel() as ODataModel | undefined;

        if (current && current.getHttpHeaders().Authorization === this.authorizationHeader(accessToken)) {
            return current;
        }

        const model = this.createODataModel(XsuaaAuthHelper.getConfig().adminService, accessToken);
        this.setModel(model);
        current?.destroy();

        return model;
    }

    public async refreshStoreInfo(): Promise<void> {
        try {
            const storeInfo = await new StoreService(this.getModel("catalog") as ODataModel).storeInfo();
            (this.getModel("store") as JSONModel).setData(storeInfo);
        } catch (error) {
            if (isBackendUnavailableError(error)) {
                this.notifyBackendUnavailable();
            }
        }
    }

    public notifyBackendUnavailable(): void {
        if (this.backendUnavailableShown) {
            return;
        }

        this.backendUnavailableShown = true;

        const retry = this.getText("retry");

        MessageBox.error(this.getText("backendUnavailable"), {
            actions: [retry, MessageBox.Action.CLOSE],
            emphasizedAction: retry,
            onClose: (action: string | null) => {
                this.backendUnavailableShown = false;

                if (action === retry) {
                    window.location.reload();
                }
            }
        });
    }

    public handleUnexpectedError(reason: unknown): void {
        if (!reason || isSessionExpiredError(reason) || isBackendUnavailableError(reason) || this.unexpectedErrorShown) {
            return;
        }

        this.unexpectedErrorShown = true;

        const detail = getBackendErrorMessage(reason);
        const message = this.getText("unexpectedError");

        MessageBox.error(detail ? `${message}\n\n${detail}` : message, {
            onClose: () => {
                this.unexpectedErrorShown = false;
            }
        });
    }

    private async loadRuntimeConfig(): Promise<void> {
        try {
            await XsuaaAuthHelper.loadRuntimeConfig();
        } catch (error) {
            console.error(error);
        }

        if (Environment.isLocal()) {
            XsuaaAuthHelper.setLocalOverrides();
            delete XsuaaAuthHelper.getConfig().auth;
        }
    }

    private async completeLoginRedirect(): Promise<void> {
        if (!new URLSearchParams(window.location.search).has("code")) {
            return;
        }

        if (await AuthenticationService.isAuthenticated()) {
            this.getRouter().navTo(ADMIN_ROUTE, {}, true);
        }
    }

    private createODataModel(serviceUrl: string, accessToken = ""): ODataModel {
        const model = new ODataModel({
            serviceUrl,
            httpHeaders: {
                ...storeUrlHeader(),
                ...(accessToken ? { Authorization: this.authorizationHeader(accessToken) as string } : {})
            },
            operationMode: "Server",
            autoExpandSelect: true,
            earlyRequests: true
        });

        model.attachSessionTimeout(() => AuthenticationService.notifySessionExpired());
        model.getMetaModel().requestObject("/").catch((error: unknown) => {
            if (accessToken && isAuthenticationError(error)) {
                AuthenticationService.notifySessionExpired();
            } else if (!isAuthorizationError(error)) {
                this.notifyBackendUnavailable();
            }
        });

        return model;
    }

    private authorizationHeader(accessToken: string): string | undefined {
        return accessToken ? `Bearer ${accessToken}` : undefined;
    }

    private registerGlobalErrorHandlers(): void {
        window.addEventListener("unhandledrejection", (event) => {
            event.preventDefault();
            this.handleUnexpectedError(event.reason);
        });

        window.addEventListener("error", (event) => this.handleUnexpectedError(event.error));
    }

    private handleSessionExpired(): void {
        if (this.sessionExpiredShown) {
            return;
        }

        this.sessionExpiredShown = true;
        SessionStorage.clear();

        MessageBox.warning(this.getText("sessionExpiredMessage"), {
            title: this.getText("sessionExpiredTitle"),
            onClose: () => {
                this.sessionExpiredShown = false;
                this.getRouter().navTo(LOGIN_ROUTE);
            }
        });
    }

    private handleAuthError(message: string): void {
        MessageBox.error(this.getText("authError", [message]), {
            onClose: () => {
                AuthenticationService.clearAuthError();
                this.getRouter().navTo(LOGIN_ROUTE);
            }
        });
    }

    private getText(key: string, parameters?: string[]): string {
        const bundle = (this.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
        return bundle.getText(key, parameters) ?? key;
    }

}
