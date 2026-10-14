sap.ui.define([], function () {
  "use strict";

  const LOCAL_CATALOG_SERVICE = "/api/service/Catalog/";
  const LOCAL_ADMIN_SERVICE = "/api/service/BenditaLook/";
  const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;
  const MIN_TOKEN_LIFETIME_SECONDS = 60;
  const NETWORK_FAILURE_STATUS = 0;
  class AuthRequestError extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
      this.name = "AuthRequestError";
    }
  }
  let runtimeConfig = {
    catalogService: LOCAL_CATALOG_SERVICE,
    adminService: LOCAL_ADMIN_SERVICE
  };
  class XsuaaAuthHelper {
    static getConfig() {
      return runtimeConfig;
    }
    static setLocalOverrides() {
      runtimeConfig.catalogService = LOCAL_CATALOG_SERVICE;
      runtimeConfig.adminService = LOCAL_ADMIN_SERVICE;
      if (runtimeConfig.auth) {
        runtimeConfig.auth.tokenEndpoint = "/auth/login";
        runtimeConfig.auth.refreshEndpoint = "/auth/refresh";
        runtimeConfig.auth.passwordEndpoint = "/auth/password";
        runtimeConfig.auth.redirectUri = "";
      }
    }
    static createAuthorizationFlow() {
      const config = this.getConfig().auth;
      if (!config?.clientId || !config.authDomain) {
        throw new Error("XSUAA client configuration is missing in runtime-config.json");
      }
      const state = this.generateRandomString(32);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: this.getRedirectUri(),
        scope: config.scope || "openid",
        state
      });
      return {
        authorizeUrl: `${config.authDomain}/oauth/authorize?${params.toString()}`,
        state
      };
    }
    static async exchangeAuthorizationCode(code) {
      const endpoint = this.getConfig().auth?.tokenEndpoint;
      if (!endpoint) {
        throw new Error("Token endpoint is not configured");
      }
      return this.postToken(endpoint, {
        code,
        redirect_uri: this.getRedirectUri()
      });
    }
    static async loginWithPassword(username, password) {
      const auth = this.getConfig().auth;
      const endpoint = auth?.passwordEndpoint ?? auth?.tokenEndpoint.replace(/\/login$/, "/password");
      if (!endpoint) {
        throw new Error("Password endpoint is not configured");
      }
      return this.postToken(endpoint, {
        username,
        password
      });
    }
    static async refresh(refreshToken) {
      const endpoint = this.getConfig().auth?.refreshEndpoint;
      if (!endpoint) {
        throw new Error("Refresh endpoint is not configured");
      }
      return this.postToken(endpoint, {
        refresh_token: refreshToken
      });
    }
    static createSession(tokenResponse) {
      const expiresIn = Math.max(tokenResponse.expires_in ?? DEFAULT_TOKEN_LIFETIME_SECONDS, MIN_TOKEN_LIFETIME_SECONDS);
      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + expiresIn * 1000,
        userName: tokenResponse.user_name ?? this.extractUserName(tokenResponse.id_token) ?? this.extractUserName(tokenResponse.access_token) ?? ""
      };
    }
    static getRedirectUri() {
      const configured = this.getConfig().auth?.redirectUri;
      if (configured) {
        return configured;
      }
      const currentUrl = new URL(window.location.href);
      currentUrl.search = "";
      currentUrl.hash = "";
      return currentUrl.toString();
    }
    static async loadRuntimeConfig() {
      const url = sap.ui.require.toUrl("apps/dflc/benditalook/config/runtime-config.json");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Runtime configuration could not be loaded");
      }
      const payload = await response.json();
      runtimeConfig = {
        catalogService: payload.catalogService || LOCAL_CATALOG_SERVICE,
        adminService: payload.adminService || LOCAL_ADMIN_SERVICE,
        auth: payload.auth
      };
    }
    static async postToken(endpoint, body) {
      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      } catch {
        throw new AuthRequestError("backend_unavailable", "Authentication service is unreachable", NETWORK_FAILURE_STATUS);
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.error) {
        throw new AuthRequestError(payload.error ?? "token_request_failed", payload.error_description ?? "Token request failed", response.status);
      }
      return payload;
    }
    static generateRandomString(length) {
      const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const values = new Uint8Array(length);
      crypto.getRandomValues(values);
      return Array.from(values, value => possible[value % possible.length]).join("");
    }
    static extractUserName(token) {
      const payload = token?.split(".")[1];
      if (!payload) {
        return null;
      }
      try {
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
        const decoded = decodeURIComponent(Array.from(atob(padded), character => "%" + ("00" + character.charCodeAt(0).toString(16)).slice(-2)).join(""));
        const claims = JSON.parse(decoded);
        return claims.given_name ?? claims.user_name ?? claims.name ?? null;
      } catch {
        return null;
      }
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.AuthRequestError = AuthRequestError;
  __exports.XsuaaAuthHelper = XsuaaAuthHelper;
  return __exports;
});
//# sourceMappingURL=XsuaaAuthHelper-dbg.js.map
