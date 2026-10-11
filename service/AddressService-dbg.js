sap.ui.define([], function () {
  "use strict";

  const VIACEP_URL = "https://viacep.com.br/ws";
  const ZIP_CODE_DIGITS = 8;
  class AddressService {
    static normalizeZipCode(zipCode) {
      return (zipCode ?? "").replace(/\D/g, "");
    }
    static isCompleteZipCode(zipCode) {
      return this.normalizeZipCode(zipCode).length === ZIP_CODE_DIGITS;
    }
    static async lookup(zipCode) {
      const digits = this.normalizeZipCode(zipCode);
      const response = await fetch(`${VIACEP_URL}/${digits}/json/`);
      if (!response.ok) {
        return null;
      }
      const payload = await response.json();
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
  return AddressService;
});
//# sourceMappingURL=AddressService-dbg.js.map
