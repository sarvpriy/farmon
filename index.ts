// import("./runtime/inject.js");

import { inject } from "./runtime/inject.js";

export function init(config = {}) {
  inject(config);
}
