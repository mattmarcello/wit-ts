import type { WitParameter } from "../../../wit.js";
import type { Trim } from "../../../type-utils.js";
import type {
  RecordSignature,
  VariantSignature,
  EnumSignature,
} from "./signatures.js";
import type { ParseWitParameter, SplitParameters } from "./utils.js";
import type { Error_ } from "../../../error.js";

export type ComponentLookup = Record<
  string,
  readonly (WitParameter & { type: string })[]
>;
export type RecordLookup = ComponentLookup;
export type VariantLookup = ComponentLookup;
export type EnumLookup = Record<string, readonly string[]>;
// Enum Types
// ============================================================================

export type ParseEnums<signatures extends readonly string[]> = {
  [signature in signatures[number] as ParseEnum<signature> extends infer enum_ extends
    { name: string }
    ? enum_["name"]
    : never]: ParseEnum<signature>["cases"];
};

export type ParseEnum<signature extends string> =
  signature extends EnumSignature<infer name, infer cases>
    ? {
        readonly name: Trim<name>;
        readonly cases: ParseEnumCases<cases>;
      }
    : never;

export type ParseEnumCases<
  signature extends string,
  result extends readonly string[] = [],
> =
  Trim<signature> extends `${infer head},${infer tail}`
    ? ParseEnumCases<tail, readonly [...result, Trim<head>]>
    : Trim<signature> extends ""
      ? result
      : readonly [...result, Trim<signature>];

// ============================================================================
// Variant Types
// ============================================================================

export type NormalizeVariantCaseToken<S extends string> =
  Trim<S> extends `${infer N}(${infer T})`
    ? `${Trim<N>}: ${Trim<T>}`
    : `${Trim<S>}: _`;

export type ParseVariants<
  signatures extends readonly string[],
  enums extends EnumLookup | unknown = unknown,
  records extends ComponentLookup | unknown = unknown,
> = {
  [signature in signatures[number] as ParseVariant<
    signature,
    {},
    records,
    enums
  > extends infer variant extends { name: string }
    ? variant["name"]
    : never]: ParseVariant<signature, {}, records, enums>["components"];
};

export type ParseVariant<
  signature extends string,
  variants extends ComponentLookup | unknown = unknown,
  records extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
> =
  signature extends VariantSignature<infer name, infer components>
    ? {
        readonly name: name;
        readonly components: ParseVariantCases<
          components,
          variants,
          records,
          enums
        >;
      }
    : never;

export type ParseVariantCases<
  signature extends string,
  variants extends ComponentLookup | unknown = unknown,
  records extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
> =
  SplitParameters<signature> extends infer parts extends readonly string[]
    ? {
        readonly [K in keyof parts]: ParseWitParameter<
          NormalizeVariantCaseToken<parts[K]>,
          { records: records; variants: variants; enums: enums }
        >;
      }
    : SplitParameters<signature>;

// ============================================================================
// Record Types
// ============================================================================

export type ParseRecords<
  signatures extends readonly string[],
  variants extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
> = {
  [signature in signatures[number] as ParseRecord<
    signature,
    {},
    variants,
    enums
  > extends infer record extends { name: string }
    ? record["name"]
    : never]: ParseRecord<signature, {}, variants, enums>["components"];
};

export type ParseRecord<
  signature extends string,
  records extends ComponentLookup | unknown = unknown,
  variants extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
> =
  signature extends RecordSignature<infer name, infer properties>
    ? {
        readonly name: Trim<name>;
        readonly components: ParseRecordProperties<
          properties,
          records,
          variants,
          enums
        >;
      }
    : never;

export type ParseRecordProperties<
  signature extends string,
  records extends ComponentLookup | unknown = unknown,
  variants extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
> =
  SplitParameters<signature> extends infer parts extends readonly string[]
    ? {
        readonly [K in keyof parts]: ParseWitParameter<
          parts[K],
          { records: records; variants: variants; enums: enums }
        >;
      }
    : SplitParameters<signature>; // surface any error types

// ============================================================================
// Unified Type Resolution
// ============================================================================

export type ResolveTypes<
  witParameters extends readonly (WitParameter & { type: string })[],
  records extends ComponentLookup | unknown = unknown,
  variants extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
  keyReferences extends { [_: string]: unknown } | unknown = unknown,
> = readonly [
  ...{
    [key in keyof witParameters]: witParameters[key]["type"] extends  // Handle wrapped types (list<T>, option<T>, result<T, error>)
    `list<${infer inner}>`
      ? ResolveWrappedType<
          witParameters[key],
          "list",
          inner,
          records,
          variants,
          enums,
          keyReferences
        >
      : witParameters[key]["type"] extends `option<${infer inner}>`
        ? ResolveWrappedType<
            witParameters[key],
            "option",
            inner,
            records,
            variants,
            enums,
            keyReferences
          >
        : witParameters[key]["type"] extends `borrow<${infer inner}>`
          ? ResolveWrappedType<
              witParameters[key],
              "borrow",
              inner,
              records,
              variants,
              enums,
              keyReferences
            >
          : witParameters[key]["type"] extends `result<${infer inner}, error>`
            ? ResolveWrappedType<
                witParameters[key],
                "result",
                inner,
                records,
                variants,
                enums,
                keyReferences
              >
            : // Handle direct type references
              ResolveDirectType<
                witParameters[key],
                records,
                variants,
                enums,
                keyReferences
              >;
  },
];

type ResolveWrappedType<
  param extends WitParameter & { type: string },
  wrapper extends string,
  inner extends string,
  records extends ComponentLookup | unknown,
  variants extends ComponentLookup | unknown,
  enums extends EnumLookup | unknown,
  keyReferences extends { [_: string]: unknown } | unknown,
> =
  // Check if inner type is a record
  [records] extends [ComponentLookup]
    ? inner extends keyof records
      ? inner extends keyof keyReferences
        ? Error_<`Circular reference detected at "${inner}".`>
        : {
            readonly name: param["name"];
            readonly type: wrapper extends "result"
              ? `result<record, error>`
              : `${wrapper}<record>`;
            readonly internalType: wrapper extends "result"
              ? `result<${inner}, error>`
              : `${wrapper}<${inner}>`;
            readonly components: ResolveTypes<
              records[inner],
              records,
              variants,
              enums,
              keyReferences & { [K in inner]: true }
            >;
          }
      : [variants] extends [ComponentLookup]
        ? inner extends keyof variants
          ? inner extends keyof keyReferences
            ? Error_<`Circular reference detected at "${inner}".`>
            : {
                readonly name: param["name"];
                readonly type: wrapper extends "result"
                  ? `result<variant, error>`
                  : `${wrapper}<variant>`;
                readonly internalType: wrapper extends "result"
                  ? `result<${inner}, error>`
                  : `${wrapper}<${inner}>`;
                readonly components: ResolveTypes<
                  variants[inner],
                  records,
                  variants,
                  enums,
                  keyReferences & { [K in inner]: true }
                >;
              }
          : [enums] extends [EnumLookup]
            ? inner extends keyof enums
              ? inner extends keyof keyReferences
                ? Error_<`Circular reference detected at "${inner}".`>
                : {
                    readonly name: param["name"];
                    readonly type: wrapper extends "result"
                      ? `result<enum, error>`
                      : `${wrapper}<enum>`;
                    readonly internalType: wrapper extends "result"
                      ? `result<${inner}, error>`
                      : `${wrapper}<${inner}>`;
                    readonly components: EnumToComponents<enums[inner]>;
                  }
              : param
            : param
        : param
    : param;

type ResolveDirectType<
  param extends WitParameter & { type: string },
  records extends ComponentLookup | unknown,
  variants extends ComponentLookup | unknown,
  enums extends EnumLookup | unknown,
  keyReferences extends { [_: string]: unknown } | unknown,
> =
  // Check if it's a record
  [records] extends [ComponentLookup]
    ? param["type"] extends keyof records
      ? param["type"] extends keyof keyReferences
        ? Error_<`Circular reference detected at "${param["type"]}".`>
        : {
            readonly name: param["name"];
            readonly type: "record";
            readonly internalType: param["type"];
            readonly components: ResolveTypes<
              records[param["type"]],
              records,
              variants,
              enums,
              keyReferences & { [K in param["type"]]: true }
            >;
          }
      : [variants] extends [ComponentLookup]
        ? param["type"] extends keyof variants
          ? param["type"] extends keyof keyReferences
            ? Error_<`Circular reference detected at "${param["type"]}".`>
            : {
                readonly name: param["name"];
                readonly type: "variant";
                readonly internalType: param["type"];
                readonly components: ResolveTypes<
                  variants[param["type"]],
                  records,
                  variants,
                  enums,
                  keyReferences & { [K in param["type"]]: true }
                >;
              }
          : [enums] extends [EnumLookup]
            ? param["type"] extends keyof enums
              ? param["type"] extends keyof keyReferences
                ? Error_<`Circular reference detected at "${param["type"]}".`>
                : {
                    readonly name: param["name"];
                    readonly type: "enum";
                    readonly internalType: param["type"];
                    readonly components: EnumToComponents<enums[param["type"]]>;
                  }
              : param
            : param
        : param
    : param;

export type EnumToComponents<cases extends readonly string[]> = readonly [
  ...{
    [K in keyof cases]: {
      readonly name: cases[K];
      readonly type: "_";
    };
  },
];

// ============================================================================
// Unified Parser
// ============================================================================

export type ParseTypes<signatures extends readonly string[]> =
  ParseEnums<signatures> extends infer enums extends EnumLookup
    ? ParseRecords<signatures, {}, enums> extends infer shallowRecords extends
        ComponentLookup
      ? ParseVariants<
          signatures,
          enums,
          {}
        > extends infer shallowVariants extends ComponentLookup
        ? {
            records: {
              [K in keyof shallowRecords]: ResolveTypes<
                shallowRecords[K],
                shallowRecords,
                shallowVariants,
                enums
              >;
            };
            variants: {
              [K in keyof shallowVariants]: ResolveTypes<
                shallowVariants[K],
                shallowRecords,
                shallowVariants,
                enums
              >;
            };
            enums: enums;
          }
        : never
      : never
    : never;
