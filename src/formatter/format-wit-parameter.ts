import type { WitParameter } from "../wit.js";
import { formatWitParameterSignature } from "./core/utils.js";
import type { FormatWitParameterSignature } from "./core/types/utils.js";

export type FormatWitParameter<param extends WitParameter> =
  FormatWitParameterSignature<param>;

export function formatWitParameter<const param extends WitParameter>(
  param: param,
): FormatWitParameter<param> {
  return formatWitParameterSignature(param) as FormatWitParameter<param>;
}
