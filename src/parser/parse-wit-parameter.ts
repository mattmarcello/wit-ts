import type { Error_ } from "../error.js";
import type { WitParameter } from "../wit.js";
import type { Narrow } from "../narrow.js";
import type { Filter } from "../type-utils.js";
import { InvalidWitParameterError } from "./core/errors/wit-parameter.js";
import {
  isRecordSignature,
  isVariantSignature,
  isEnumSignature,
} from "./core/signatures.js";
import type {
  IsRecordSignature,
  IsVariantSignature,
  IsEnumSignature,
} from "./core/types/signatures.js";
import type { ParseWitParameter as ParseWitParameter_ } from "./core/types/utils.js";
import { parseWitParameter as parseWitParameter_ } from "./core/utils.js";
import { parseTypes } from "./core/user-defined.js";
import type { ParseTypes } from "./core/types/user-defined.js";

export type ParseWitParameter<
  param extends string | readonly string[] | readonly unknown[],
> =
  | (param extends string
      ? param extends ""
        ? never
        : string extends param
          ? WitParameter
          : ParseWitParameter_<param>
      : never)
  | (param extends readonly string[]
      ? string[] extends param
        ? WitParameter // Return generic WitParameter item since type was not inferrable
        : ParseTypes<param> extends infer types extends {
              records: any;
              variants: any;
              enums: any;
            }
          ? {
              [key in keyof param]: param[key] extends string
                ? IsRecordSignature<param[key]> extends true
                  ? never
                  : IsVariantSignature<param[key]> extends true
                    ? never
                    : IsEnumSignature<param[key]> extends true
                      ? never
                      : ParseWitParameter_<
                          param[key],
                          {
                            variants: types["variants"];
                            records: types["records"];
                            enums: types["enums"];
                          }
                        >
                : never;
            } extends infer mapped extends readonly unknown[]
            ? Filter<mapped, never>[0] extends infer result
              ? result extends undefined
                ? never
                : result
              : never
            : never
          : never
      : never);

export function parseWitParameter<
  param extends string | readonly string[] | readonly unknown[],
>(
  param: Narrow<param> &
    (
      | (param extends string
          ? param extends ""
            ? Error_<"Empty string is not allowed.">
            : unknown
          : never)
      | (param extends readonly string[]
          ? param extends readonly [] // empty array
            ? Error_<"At least one parameter required.">
            : string[] extends param
              ? unknown
              : unknown
          : never)
    ),
): ParseWitParameter<param> {
  let witParameter: WitParameter | undefined;
  if (typeof param === "string")
    witParameter = parseWitParameter_(param, {}) as ParseWitParameter<param>;
  else {
    const types = parseTypes(param as readonly string[]);
    const length = param.length as number;
    for (let i = 0; i < length; i++) {
      const signature = (param as readonly string[])[i]!;
      if (isRecordSignature(signature)) continue;
      if (isVariantSignature(signature)) continue;
      if (isEnumSignature(signature)) continue;

      witParameter = parseWitParameter_(signature, {
        enums: types["enums"],
        variants: types["variants"],
        records: types["records"],
      });
      break;
    }
  }
  if (!witParameter) throw new InvalidWitParameterError({ param });
  return witParameter as ParseWitParameter<param>;
}
