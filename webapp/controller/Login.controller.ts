import JSONModel from "sap/ui/model/json/JSONModel";
import type Input from "sap/m/Input";
import BaseController from "./BaseController";
import { AuthenticationService } from "../auth/AuthenticationService";
import { AuthRequestError } from "../auth/providers/XsuaaAuthHelper";
import { LoginPreferences } from "../auth/storage/LoginPreferences";
import { isBackendUnavailableError } from "../util/http";

const LOGIN_ERRORS: Record<string, string> = {
    invalid_credentials: "loginInvalidCredentials",
    too_many_attempts: "loginTooManyAttempts",
    missing_credentials: "loginRequired"
};

interface LoginState {
    email: string;
    password: string;
}

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Login extends BaseController {

    private loginModel: JSONModel;

    public onInit(): void {
        this.loginModel = new JSONModel(this.initialState());
        this.getView()?.setModel(this.loginModel, "login");
        this.getRouter().getRoute("login")?.attachPatternMatched(() => this.onRouteMatched());
    }

    public onTogglePassword(): void {
        this.loginModel.setProperty("/showPassword", !this.loginModel.getProperty("/showPassword"));
    }

    public async onPasswordLogin(): Promise<void> {
        const { email, password } = this.loginModel.getData() as LoginState;

        if (!this.validate(email, password)) {
            return;
        }

        this.loginModel.setProperty("/error", "");
        this.loginModel.setProperty("/busy", true);

        try {
            await AuthenticationService.loginWithPassword(email.trim(), password);
            LoginPreferences.saveEmail(email.trim());
            this.loginModel.setData(this.initialState());
            this.navTo("admin", {}, true);
        } catch (error) {
            this.loginModel.setProperty("/password", "");
            this.loginModel.setProperty("/error", this.getText(this.errorKey(error)));
            (this.byId("loginPassword") as Input | undefined)?.focus();
        } finally {
            this.loginModel.setProperty("/busy", false);
        }
    }

    public async onLogin(): Promise<void> {
        try {
            await AuthenticationService.login();
            await this.redirectWhenAuthenticated();
        } catch (error) {
            this.handleError(error, "loginError");
        }
    }

    private async onRouteMatched(): Promise<void> {
        this.loginModel.setData(this.initialState());
        await this.redirectWhenAuthenticated();
    }

    private validate(email: string, password: string): boolean {
        const emailState = email.trim() ? "None" : "Error";
        const passwordState = password ? "None" : "Error";

        this.loginModel.setProperty("/emailState", emailState);
        this.loginModel.setProperty("/passwordState", passwordState);

        return emailState === "None" && passwordState === "None";
    }

    private errorKey(error: unknown): string {
        if (isBackendUnavailableError(error)) {
            return "backendUnavailable";
        }

        return error instanceof AuthRequestError ? LOGIN_ERRORS[error.code] ?? "loginFailed" : "loginFailed";
    }

    private initialState(): object {
        return {
            email: LoginPreferences.loadEmail(),
            password: "",
            showPassword: false,
            emailState: "None",
            passwordState: "None",
            error: "",
            busy: false
        };
    }

    private async redirectWhenAuthenticated(): Promise<void> {
        if (await AuthenticationService.isAuthenticated()) {
            this.navTo("admin", {}, true);
        }
    }

}
