import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export interface EmailServerInfo {
    Host: string | null;
    Port: number;
    Username: string | null;
    Sender: string | null;
    Saved: boolean;
    PasswordReadable: boolean;
    Source: string;
}

export interface EmailServerInput {
    Host: string;
    Port: number;
    Username: string;
    Sender: string;
    Password: string;
}

export default class EmailServerService {

    constructor(private readonly adminModel: ODataModel) { }

    public async load(): Promise<EmailServerInfo> {
        const operation = this.adminModel.bindContext("/EmailServer(...)");

        await operation.invoke();

        return operation.getBoundContext().getObject() as EmailServerInfo;
    }

    public async save(server: EmailServerInput): Promise<void> {
        const operation = this.adminModel.bindContext("/SaveEmailServer(...)");

        operation.setParameter("Server", server);

        await operation.invoke();
    }

    public async remove(): Promise<void> {
        await this.adminModel.bindContext("/RemoveEmailServer(...)").invoke();
    }

    public async sendTest(recipient: string): Promise<void> {
        const operation = this.adminModel.bindContext("/SendTestEmail(...)");

        operation.setParameter("Recipient", recipient);

        await operation.invoke();
    }

}
