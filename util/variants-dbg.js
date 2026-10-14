sap.ui.define([], function () {
  "use strict";

  const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "U", "UNICO", "ÚNICO"];
  function sortBySize(variants) {
    const position = size => {
      const index = SIZE_ORDER.indexOf(size.toUpperCase());
      const numericSize = Number(size);
      if (index !== -1) {
        return index;
      }
      return SIZE_ORDER.length + (Number.isNaN(numericSize) ? 0 : numericSize);
    };
    return [...variants].sort((first, second) => position(first.Size) - position(second.Size));
  }
  function imagesForColor(images, colorId) {
    const sorted = [...images].sort((first, second) => (first.SortOrder ?? 0) - (second.SortOrder ?? 0));
    const forColor = sorted.filter(image => !image.Color_ID || image.Color_ID === colorId);
    return forColor.length ? forColor : sorted;
  }
  var __exports = {
    __esModule: true
  };
  __exports.sortBySize = sortBySize;
  __exports.imagesForColor = imagesForColor;
  return __exports;
});
//# sourceMappingURL=variants-dbg.js.map
