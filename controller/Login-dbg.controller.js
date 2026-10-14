sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController", "../auth/AuthenticationService", "../auth/providers/XsuaaAuthHelper", "../auth/storage/LoginPreferences", "../util/http"], function (JSONModel, __BaseController, ___auth_AuthenticationService, ___auth_providers_XsuaaAuthHelper, ___auth_storage_LoginPreferences, ___util_http) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const AuthRequestError = ___auth_providers_XsuaaAuthHelper["AuthRequestError"];
  const LoginPreferences = ___auth_storage_LoginPreferences["LoginPreferences"];
  const isBackendUnavailableError = ___util_http["isBackendUnavailableError"];
  const LOGIN_ERRORS = {
    invalid_credentials: "loginInvalidCredentials",
    too_many_attempts: "loginTooManyAttempts",
    missing_credentials: "loginRequired"
  };
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Login = BaseController.extend("apps.dflc.benditalook.controller.Login", {
    onInit: function _onInit() {
      this.loginModel = new JSONModel(this.initialState());
      this.getView()?.setModel(this.loginModel, "login");
      this.getRouter().getRoute("login")?.attachPatternMatched(() => this.onRouteMatched());
    },
    onTogglePassword: function _onTogglePassword() {
      this.loginModel.setProperty("/showPassword", !this.loginModel.getProperty("/showPassword"));
    },
    onPasswordLogin: async function _onPasswordLogin() {
      const {
        email,
        password
      } = this.loginModel.getData();
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
        this.byId("loginPassword")?.focus();
      } finally {
        this.loginModel.setProperty("/busy", false);
      }
    },
    onLogin: async function _onLogin() {
      try {
        await AuthenticationService.login();
        await this.redirectWhenAuthenticated();
      } catch (error) {
        this.handleError(error, "loginError");
      }
    },
    onRouteMatched: async function _onRouteMatched() {
      this.loginModel.setData(this.initialState());
      await this.redirectWhenAuthenticated();
    },
    validate: function _validate(email, password) {
      const emailState = email.trim() ? "None" : "Error";
      const passwordState = password ? "None" : "Error";
      this.loginModel.setProperty("/emailState", emailState);
      this.loginModel.setProperty("/passwordState", passwordState);
      return emailState === "None" && passwordState === "None";
    },
    errorKey: function _errorKey(error) {
      if (isBackendUnavailableError(error)) {
        return "backendUnavailable";
      }
      return error instanceof AuthRequestError ? LOGIN_ERRORS[error.code] ?? "loginFailed" : "loginFailed";
    },
    initialState: function _initialState() {
      return {
        email: LoginPreferences.loadEmail(),
        password: "",
        showPassword: false,
        emailState: "None",
        passwordState: "None",
        error: "",
        busy: false
      };
    },
    redirectWhenAuthenticated: async function _redirectWhenAuthenticated() {
      if (await AuthenticationService.isAuthenticated()) {
        this.navTo("admin", {}, true);
      }
    }
  });
  return Login;
});
//# sourceMappingURL=Login-dbg.controller.js.map
