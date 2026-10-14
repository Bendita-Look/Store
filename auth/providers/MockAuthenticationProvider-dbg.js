sap.ui.define(["../AuthenticationService"], function (___AuthenticationService) {
  "use strict";

  const AuthenticationService = ___AuthenticationService["AuthenticationService"];
  class MockAuthenticationProvider {
    static SESSION_DURATION_MS = 3600000;
    login() {
      return Promise.resolve({
        accessToken: "",
        expiresAt: Date.now() + MockAuthenticationProvider.SESSION_DURATION_MS,
        userName: ""
      });
    }
    loginWithPassword(username) {
      return Promise.resolve({
        accessToken: "",
        expiresAt: Date.now() + MockAuthenticationProvider.SESSION_DURATION_MS,
        userName: username
      });
    }
    logout() {
      return Promise.resolve();
    }
    isAuthenticated() {
      const session = AuthenticationService.getSession();
      return Promise.resolve(!!session && session.expiresAt > Date.now());
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.MockAuthenticationProvider = MockAuthenticationProvider;
  return __exports;
});
//# sourceMappingURL=MockAuthenticationProvider-dbg.js.map
