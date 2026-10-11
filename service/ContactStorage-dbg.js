sap.ui.define(["sap/ui/util/Storage"], function (Storage) {
  "use strict";

  const STORAGE_KEY = "benditaLook.contact";
  const REMEMBERED_FIELDS = ["CustomerName", "CustomerEmail", "CustomerPhone", "FulfillmentType", "ZipCode", "Address", "AddressNumber", "Complement", "District", "City", "State"];
  class ContactStorage {
    static storage = new Storage(Storage.Type.local);
    static load() {
      return this.storage.get(STORAGE_KEY) ?? {};
    }
    static save(contact) {
      const remembered = Object.fromEntries(REMEMBERED_FIELDS.map(field => [field, contact[field]]));
      this.storage.put(STORAGE_KEY, remembered);
    }
    static clear() {
      this.storage.remove(STORAGE_KEY);
    }
  }
  return ContactStorage;
});
//# sourceMappingURL=ContactStorage-dbg.js.map
