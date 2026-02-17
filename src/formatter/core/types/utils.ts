import type { WitFunction, WitParameter } from "../../../wit.js";
import type { Join } from "../../../type-utils.js";

// Format a single parameter signature: "name: type" or just "type"
export type FormatWitParameterSignature<param extends WitParameter> =
  param extends { internalType: infer IT extends string }
    ? param extends { name: infer N extends string }
      ? `${N}: ${IT}`
      : IT
    : param extends { name: infer N extends string }
      ? `${N}: ${param["type"]}`
      : param["type"];

// Format an array of parameters into comma-separated string
export type FormatWitParameters<params extends readonly WitParameter[]> = Join<
  FormatWitParameterSignatures<params>
>;

type FormatWitParameterSignatures<params extends readonly WitParameter[]> = {
  [K in keyof params]: FormatWitParameterSignature<params[K]>;
} extends infer R extends readonly string[]
  ? R
  : never;

// Format a full function signature
export type FormatFunctionSignature<fn extends WitFunction> =
  fn["outputs"] extends readonly []
    ? `${fn["name"]}: func(${FormatWitParameters<fn["inputs"]>});`
    : `${fn["name"]}: func(${FormatWitParameters<fn["inputs"]>}) -> ${FormatWitParameters<fn["outputs"]>};`;

// Format a variant case: unit cases -> just name, payload cases -> "name(internalType)"
type FormatVariantCase<param extends WitParameter> = param extends {
  type: "_";
  name: infer N extends string;
}
  ? N
  : param extends {
        name: infer N extends string;
        internalType: infer IT extends string;
      }
    ? `${N}(${IT})`
    : param extends { name: infer N extends string }
      ? `${N}(${param["type"]})`
      : never;

type FormatVariantCases<params extends readonly WitParameter[]> = {
  [K in keyof params]: FormatVariantCase<params[K]>;
} extends infer R extends readonly string[]
  ? R
  : never;

// Format enum cases: just the names
type FormatEnumCases<params extends readonly WitParameter[]> = {
  [K in keyof params]: params[K] extends { name: infer N extends string }
    ? N
    : never;
} extends infer R extends readonly string[]
  ? R
  : never;

// Extract the base type from a wrapper type
type ExtractBaseType<T extends string> =
  T extends `result<${infer Inner}, error>`
    ? Inner
    : T extends `list<${infer Inner}>`
      ? Inner
      : T extends `option<${infer Inner}>`
        ? Inner
        : T;

// Extract the user-defined type name from internalType
type ExtractTypeName<param extends WitParameter> = param extends {
  internalType: infer IT extends string;
  type: infer T extends string;
}
  ? IT extends T
    ? IT
    : ExtractBaseType<IT>
  : never;

// Format a single type definition string
type FormatTypeDefinition<
  name extends string,
  param extends WitParameter,
> = param extends { components: infer C extends readonly WitParameter[] }
  ? ExtractBaseType<param["type"]> extends "record"
    ? `record ${name} { ${FormatWitParameters<C>} }`
    : ExtractBaseType<param["type"]> extends "variant"
      ? `variant ${name} { ${Join<FormatVariantCases<C>>} }`
      : ExtractBaseType<param["type"]> extends "enum"
        ? `enum ${name} { ${Join<FormatEnumCases<C>>} }`
        : ExtractBaseType<param["type"]> extends "flags"
          ? `flags ${name} { ${Join<FormatFlagsCases<C>>} }`
          : never
  : never;

type FormatFlagsCases<params extends readonly WitParameter[]> = {
  [K in keyof params]: params[K] extends { name: infer N extends string }
    ? N
    : never;
} extends infer R extends readonly string[]
  ? R
  : never;

// Check if a type is a user-defined type
type IsUserDefinedType<T extends string> = ExtractBaseType<T> extends
  | "record"
  | "variant"
  | "enum"
  | "flags"
  ? true
  : false;

// Collect type definitions from parameters (recursive, with dedup via Seen union)
export type CollectTypeDefinitions<
  params extends readonly WitParameter[],
  seen extends string = never,
> = params extends readonly [
  infer head extends WitParameter,
  ...infer tail extends readonly WitParameter[],
]
  ? IsUserDefinedType<head["type"]> extends true
    ? head extends { components: infer C extends readonly WitParameter[] }
      ? ExtractTypeName<head> extends infer name extends string
        ? name extends seen
          ? CollectTypeDefinitions<tail, seen>
          : [
              ...CollectTypeDefinitions<C, seen | name>,
              FormatTypeDefinition<name, head>,
              ...CollectTypeDefinitions<tail, seen | name>,
            ]
        : CollectTypeDefinitions<tail, seen>
      : CollectTypeDefinitions<tail, seen>
    : CollectTypeDefinitions<tail, seen>
  : [];
