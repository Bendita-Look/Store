import { IAuthenticationProvider } from "../IAuthenticationProvider";
import { UserSession } from "../models/UserSession";
import { AuthenticationService } from "../AuthenticationService";

export class MockAuthenticationProvider implements IAuthenticationProvider {

    private static readonly SESSION_DURATION_MS = 3600000;

    public login(): Promise<UserSession> {
        return Promise.resolve({
            accessToken: "",
            expiresAt: Date.now() + MockAuthenticationProvider.SESSION_DURATION_MS,
            userName: ""
        });
    }

    public loginWithPassword(username: string): Promise<UserSession> {
        return Promise.resolve({
            accessToken: "",
            expiresAt: Date.now() + MockAuthenticationProvider.SESSION_DURATION_MS,
            userName: username
        });
    }

    public logout(): Promise<void> {
        return Promise.resolve();
    }

    public isAuthenticated(): Promise<boolean> {
        const session = AuthenticationService.getSession();
        return Promise.resolve(!!session && session.expiresAt > Date.now());
    }

}
