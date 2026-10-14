sap.ui.define(["../AuthenticationService", "../storage/SessionStorage", "./XsuaaAuthHelper"], function (___AuthenticationService, ___storage_SessionStorage, ___XsuaaAuthHelper) {
  "use strict";

  const AuthenticationService = ___AuthenticationService["AuthenticationService"];
  const SessionStorage = ___storage_SessionStorage["SessionStorage"];
  const XsuaaAuthHelper = ___XsuaaAuthHelper["XsuaaAuthHelper"];
  class XsuaaAuthenticationProvider {
    login() {
      const {
        authorizeUrl,
        state
      } = XsuaaAuthHelper.createAuthorizationFlow();
      SessionStorage.saveOauthState(state);
      window.location.assign(authorizeUrl);
      return Promise.resolve({
        accessToken: "",
        expiresAt: 0,
        userName: ""
      });
    }
    async loginWithPassword(username, password) {
      return XsuaaAuthHelper.createSession(await XsuaaAuthHelper.loginWithPassword(username, password));
    }
    logout() {
      SessionStorage.clear();
      return Promise.resolve();
    }
    async isAuthenticated() {
      const session = AuthenticationService.getSession();
      if (session?.accessToken && session.expiresAt > Date.now()) {
        return true;
      }
      if (session?.refreshToken && (await this.refreshSession(session.refreshToken))) {
        return true;
      }
      const searchParams = new URLSearchParams(window.location.search);
      const authCode = searchParams.get("code");
      if (!authCode) {
        return false;
      }
      const savedState = SessionStorage.loadOauthState();
      const state = searchParams.get("state");
      if (savedState && state && savedState !== state) {
        this.cleanUpAuthorizationParams();
        return false;
      }
      try {
        const tokenResponse = await XsuaaAuthHelper.exchangeAuthorizationCode(authCode);
        SessionStorage.save(XsuaaAuthHelper.createSession(tokenResponse));
        this.cleanUpAuthorizationParams();
        return true;
      } catch (error) {
        this.cleanUpAuthorizationParams();
        AuthenticationService.notifyAuthError(error instanceof Error ? error.message : String(error));
        return false;
      }
    }
    async refreshSession(refreshToken) {
      try {
        const tokenResponse = await XsuaaAuthHelper.refresh(refreshToken);
        SessionStorage.save(XsuaaAuthHelper.createSession(tokenResponse));
        return true;
      } catch {
        SessionStorage.clear();
        return false;
      }
    }
    cleanUpAuthorizationParams() {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, document.title, url.toString());
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.XsuaaAuthenticationProvider = XsuaaAuthenticationProvider;
  return __exports;
});
//# sourceMappingURL=XsuaaAuthenticationProvider-dbg.js.map
