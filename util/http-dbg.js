sap.ui.define(["../auth/AuthenticationService", "../auth/providers/XsuaaAuthHelper"], function (___auth_AuthenticationService, ___auth_providers_XsuaaAuthHelper) {
  "use strict";

  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const XsuaaAuthHelper = ___auth_providers_XsuaaAuthHelper["XsuaaAuthHelper"];
  const UNAVAILABLE_STATUSES = [0, 502, 503, 504];
  const AUTHORIZATION_STATUSES = [401, 403];
  class BackendUnavailableError extends Error {
    constructor() {
      super("Backend unavailable");
      this.name = "BackendUnavailableError";
    }
  }
  class SessionExpiredError extends Error {
    constructor() {
      super("Session expired");
      this.name = "SessionExpiredError";
    }
  }
  class RequestFailedError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
      this.name = "RequestFailedError";
    }
  }
  const STORE_URL_HEADER = "X-Store-Url";
  function storeUrlHeader() {
    return {
      [STORE_URL_HEADER]: `${window.location.origin}${window.location.pathname}`
    };
  }
  function buildAuthHeaders(headers = {}) {
    const result = new Headers(headers);
    const token = AuthenticationService.getSession()?.accessToken;
    result.set(STORE_URL_HEADER, storeUrlHeader()[STORE_URL_HEADER]);
    if (token) {
      result.set("Authorization", `Bearer ${token}`);
    }
    return result;
  }
  async function adminRequest(path, init = {}) {
    let response;
    try {
      response = await fetch(`${XsuaaAuthHelper.getConfig().adminService}${path}`, {
        ...init,
        headers: buildAuthHeaders(init.headers)
      });
    } catch {
      throw new BackendUnavailableError();
    }
    if (response.status === 401) {
      AuthenticationService.notifySessionExpired();
      throw new SessionExpiredError();
    }
    if (!response.ok) {
      throw new RequestFailedError(await readErrorMessage(response), response.status);
    }
    return response;
  }
  async function readErrorMessage(response) {
    try {
      const payload = await response.json();
      return payload.error?.message ?? response.statusText;
    } catch {
      return response.statusText;
    }
  }
  function isAuthorizationError(error) {
    return AUTHORIZATION_STATUSES.includes(error?.status ?? -1);
  }
  function isAuthenticationError(error) {
    return error?.status === 401;
  }
  function isSessionExpiredError(error) {
    return error instanceof SessionExpiredError;
  }
  function isBackendUnavailableError(error) {
    const visited = new Set();
    let current = error;
    while (current && typeof current === "object" && !visited.has(current)) {
      visited.add(current);
      if (current instanceof BackendUnavailableError || UNAVAILABLE_STATUSES.includes(current.status ?? -1)) {
        return true;
      }
      current = current.cause;
    }
    return false;
  }
  var __exports = {
    __esModule: true
  };
  __exports.BackendUnavailableError = BackendUnavailableError;
  __exports.SessionExpiredError = SessionExpiredError;
  __exports.RequestFailedError = RequestFailedError;
  __exports.storeUrlHeader = storeUrlHeader;
  __exports.buildAuthHeaders = buildAuthHeaders;
  __exports.adminRequest = adminRequest;
  __exports.isAuthorizationError = isAuthorizationError;
  __exports.isAuthenticationError = isAuthenticationError;
  __exports.isSessionExpiredError = isSessionExpiredError;
  __exports.isBackendUnavailableError = isBackendUnavailableError;
  return __exports;
});
//# sourceMappingURL=http-dbg.js.map
