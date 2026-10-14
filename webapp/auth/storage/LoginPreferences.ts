const EMAIL_KEY = "benditaLook.adminEmail";

export class LoginPreferences {

    public static loadEmail(): string {
        return localStorage.getItem(EMAIL_KEY) ?? "";
    }

    public static saveEmail(email: string): void {
        localStorage.setItem(EMAIL_KEY, email);
    }

}
