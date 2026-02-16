import type { WitParameter } from "./wit.js";

export namespace WitError {
  export const param: WitParameter = {
    name: "error",
    type: "variant",
    internalType: "error",
    components: [],
  };

  export type T = unknown;
}
