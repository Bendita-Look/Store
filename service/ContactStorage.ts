import Storage from "sap/ui/util/Storage";
import type { CustomerContact } from "./OrderService";

const STORAGE_KEY = "benditaLook.contact";

const REMEMBERED_FIELDS: Array<keyof CustomerContact> = [
    "CustomerName",
    "CustomerEmail",
    "CustomerPhone",
    "FulfillmentType",
    "ZipCode",
    "Address",
    "AddressNumber",
    "Complement",
    "District",
    "City",
    "State"
];

export default class ContactStorage {

    private static readonly storage = new Storage(Storage.Type.local);

    public static load(): Partial<CustomerContact> {
        return (this.storage.get(STORAGE_KEY) as Partial<CustomerContact> | null) ?? {};
    }

    public static save(contact: CustomerContact): void {
        const remembered = Object.fromEntries(REMEMBERED_FIELDS.map((field) => [field, contact[field]]));
        this.storage.put(STORAGE_KEY, remembered);
    }

    public static clear(): void {
        this.storage.remove(STORAGE_KEY);
    }

}
