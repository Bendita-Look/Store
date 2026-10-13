sap.ui.define(["../util/http"], function (___util_http) {
  "use strict";

  const adminRequest = ___util_http["adminRequest"];
  class MediaService {
    static objectUrls = new Map();
    static draftImagePath(imageId) {
      return `ProductImages(ID=${imageId},IsActiveEntity=false)/Image`;
    }
    static async loadDraftImage(imageId) {
      const cached = this.objectUrls.get(imageId);
      if (cached) {
        return cached;
      }
      const response = await adminRequest(this.draftImagePath(imageId));
      const objectUrl = URL.createObjectURL(await response.blob());
      this.objectUrls.set(imageId, objectUrl);
      return objectUrl;
    }
    static async uploadDraftImage(imageId, content, contentType) {
      await adminRequest(this.draftImagePath(imageId), {
        method: "PUT",
        headers: {
          "Content-Type": contentType
        },
        body: content
      });
      this.objectUrls.set(imageId, URL.createObjectURL(content));
    }
    static settingsBannerPath(settingsId, isActiveEntity) {
      return `StoreSettings(ID=${settingsId},IsActiveEntity=${isActiveEntity})/BannerImage`;
    }
    static async loadMedia(path) {
      const response = await adminRequest(path);
      return URL.createObjectURL(await response.blob());
    }
    static async uploadMedia(path, content, contentType) {
      await adminRequest(path, {
        method: "PUT",
        headers: {
          "Content-Type": contentType
        },
        body: content
      });
    }
    static async deleteMedia(path) {
      await adminRequest(path, {
        method: "DELETE"
      });
    }
    static release(imageId) {
      const objectUrl = this.objectUrls.get(imageId);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        this.objectUrls.delete(imageId);
      }
    }
  }
  return MediaService;
});
//# sourceMappingURL=MediaService-dbg.js.map
