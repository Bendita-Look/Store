export interface ZipCodeAddress {
    Address: string;
    District: string;
    City: string;
    State: string;
}

interface ViaCepResponse {
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean | string;
}

const VIACEP_URL = "https://viacep.com.br/ws";
const ZIP_CODE_DIGITS = 8;

export default class AddressService {

    public static normalizeZipCode(zipCode: string): string {
        return (zipCode ?? "").replace(/\D/g, "");
    }

    public static isCompleteZipCode(zipCode: string): boolean {
        return this.normalizeZipCode(zipCode).length === ZIP_CODE_DIGITS;
    }

    public static async lookup(zipCode: string): Promise<ZipCodeAddress | null> {
        const digits = this.normalizeZipCode(zipCode);
        const response = await fetch(`${VIACEP_URL}/${digits}/json/`);

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as ViaCepResponse;

        if (payload.erro) {
            return null;
        }

        return {
            Address: payload.logradouro ?? "",
            District: payload.bairro ?? "",
            City: payload.localidade ?? "",
            State: payload.uf ?? ""
        };
    }

}
