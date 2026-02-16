import type { WitFunction } from "../wit.js";
import { formatFunctionSignature } from "./core/utils.js";
import type { FormatFunctionSignature } from "./core/types/utils.js";

export type FormatWitFunction<fn extends WitFunction> =
  FormatFunctionSignature<fn>;

export function formatWitFunction<const fn extends WitFunction>(
  fn: fn,
): FormatWitFunction<fn> {
  return formatFunctionSignature(fn) as FormatWitFunction<fn>;
}
