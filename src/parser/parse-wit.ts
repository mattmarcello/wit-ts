import type { Wit } from "../wit.js";
import type { Filter } from "../type-utils.js";
import type { Error_ } from "../error.js";
import {
  isRecordSignature,
  isVariantSignature,
  isEnumSignature,
  isFlagsSignature,
} from "./core/signatures.js";
import { parseTypes } from "./core/user-defined.js";
import { parseSignature } from "./core/utils.js";
import type { Signatures } from "./core/types/signatures.js";
import type {
  EnumLookup,
  FlagsLookup,
  ParseTypes,
  RecordLookup,
  VariantLookup,
} from "./core/types/user-defined.js";
import type { ParseSignature } from "./core/types/utils.js";

export type ParseWit<signatures extends readonly string[]> =
  string[] extends signatures
    ? Wit // If `T` was not able to be inferred (e.g. just `string[]`), return `Wit`
    : signatures extends readonly string[]
      ? signatures extends Signatures<signatures> // Validate signatures
        ? ParseTypes<signatures> extends infer types extends {
            records?: RecordLookup;
            variants?: VariantLookup;
            enums?: EnumLookup;
            flags?: FlagsLookup;
          }
          ? {
              [key in keyof signatures]: signatures[key] extends string
                ? ParseSignature<signatures[key], types>
                : never;
            } extends infer mapped extends readonly unknown[]
            ? Filter<mapped, never> extends infer result
              ? result extends readonly []
                ? never
                : result
              : never
            : never
          : never
        : never
      : never;

export function parseWit<const signatures extends readonly string[]>(
  signatures: signatures["length"] extends 0
    ? Error_<"At least one signature required">
    : Signatures<signatures> extends signatures
      ? signatures
      : Signatures<signatures>,
): ParseWit<signatures> {
  const types = parseTypes(signatures as readonly string[]);
  const wit = [];
  const length = signatures.length as number;
  for (let i = 0; i < length; i++) {
    const signature = (signatures as readonly string[])[i]!;
    if (isRecordSignature(signature)) continue;
    if (isVariantSignature(signature)) continue;
    if (isEnumSignature(signature)) continue;
    if (isFlagsSignature(signature)) continue;
    wit.push(
      parseSignature(
        signature,
        types.records,
        types.variants,
        types.enums,
        types.flags,
      ),
    );
  }
  return wit as unknown as ParseWit<signatures>;
}
