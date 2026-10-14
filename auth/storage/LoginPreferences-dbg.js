sap.ui.define([], function () {
  "use strict";

  const EMAIL_KEY = "benditaLook.adminEmail";
  class LoginPreferences {
    static loadEmail() {
      return localStorage.getItem(EMAIL_KEY) ?? "";
    }
    static saveEmail(email) {
      localStorage.setItem(EMAIL_KEY, email);
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.LoginPreferences = LoginPreferences;
  return __exports;
});
//# sourceMappingURL=LoginPreferences-dbg.js.map
