import { IAuthenticationProvider } from "../IAuthenticationProvider";
import { UserSession } from "../models/UserSession";
import { AuthenticationService } from "../AuthenticationService";
import { SessionStorage } from "../storage/SessionStorage";
import { XsuaaAuthHelper } from "./XsuaaAuthHelper";

export class XsuaaAuthenticationProvider implements IAuthenticationProvider {

    public login(): Promise<UserSession> {
        const { authorizeUrl, state } = XsuaaAuthHelper.createAuthorizationFlow();

        SessionStorage.saveOauthState(state);
        window.location.assign(authorizeUrl);

        return Promise.resolve({ accessToken: "", expiresAt: 0, userName: "" });
    }

    public async loginWithPassword(username: string, password: string): Promise<UserSession> {
        return XsuaaAuthHelper.createSession(await XsuaaAuthHelper.loginWithPassword(username, password));
    }

    public logout(): Promise<void> {
        SessionStorage.clear();
        return Promise.resolve();
    }

    public async isAuthenticated(): Promise<boolean> {
        const session = AuthenticationService.getSession();

        if (session?.accessToken && session.expiresAt > Date.now()) {
            return true;
        }

        if (session?.refreshToken && await this.refreshSession(session.refreshToken)) {
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

    private async refreshSession(refreshToken: string): Promise<boolean> {
        try {
            const tokenResponse = await XsuaaAuthHelper.refresh(refreshToken);
            SessionStorage.save(XsuaaAuthHelper.createSession(tokenResponse));
            return true;
        } catch {
            SessionStorage.clear();
            return false;
        }
    }

    private cleanUpAuthorizationParams(): void {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        window.history.replaceState({}, document.title, url.toString());
    }

}
