import type { WitParameter } from "../../../wit.js";
import type { Trim, Join } from "../../../type-utils.js";
import type {
  RecordSignature,
  VariantSignature,
  EnumSignature,
  FlagsSignature,
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
export type FlagsLookup = Record<string, readonly string[]>;
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
// Flags Types
// ============================================================================

export type ParseFlags<signatures extends readonly string[]> = {
  [signature in signatures[number] as ParseFlag<signature> extends infer flag_ extends
    { name: string }
    ? flag_["name"]
    : never]: ParseFlag<signature>["cases"];
};

type ParseFlag<signature extends string> =
  signature extends FlagsSignature<infer name, infer cases>
    ? {
        readonly name: Trim<name>;
        readonly cases: ParseFlagsCases<cases>;
      }
    : never;

type ParseFlagsCases<
  signature extends string,
  result extends readonly string[] = [],
> =
  Trim<signature> extends `${infer head},${infer tail}`
    ? ParseFlagsCases<tail, readonly [...result, Trim<head>]>
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

type ResolveElement<
  typeName extends string,
  records extends ComponentLookup | unknown,
  variants extends ComponentLookup | unknown,
  enums extends EnumLookup | unknown,
  flags extends FlagsLookup | unknown,
  keyReferences extends { [_: string]: unknown } | unknown,
> = ResolveDirectType<
  { readonly type: Trim<typeName>; readonly name: undefined },
  records, variants, enums, flags, keyReferences
> extends infer R extends { type: string }
  ? Omit<R, "name">
  : { readonly type: Trim<typeName>; readonly internalType: Trim<typeName> };

type ResolveMultiElements<
  parts extends readonly string[],
  records extends ComponentLookup | unknown,
  variants extends ComponentLookup | unknown,
  enums extends EnumLookup | unknown,
  flags extends FlagsLookup | unknown,
  keyReferences extends { [_: string]: unknown } | unknown,
> = readonly [...{
  [K in keyof parts]: ResolveElement<
    parts[K] & string, records, variants, enums, flags, keyReferences
  >;
}];

type ExtractElementTypes<elements extends readonly { type: string }[]> = {
  [K in keyof elements]: elements[K]["type"];
} extends infer R extends readonly string[] ? R : never;

type ResolveMultiElementType<
  param extends WitParameter & { type: string },
  wrapper extends string,
  inner extends string,
  records extends ComponentLookup | unknown,
  variants extends ComponentLookup | unknown,
  enums extends EnumLookup | unknown,
  flags extends FlagsLookup | unknown,
  keyReferences extends { [_: string]: unknown } | unknown,
> = SplitParameters<Trim<inner>> extends infer parts extends readonly string[]
  ? ResolveMultiElements<parts, records, variants, enums, flags, keyReferences> extends
    infer elements extends readonly { type: string }[]
    ? {
        readonly name: param["name"];
        readonly type: `${wrapper}<${Join<ExtractElementTypes<elements>>}>`;
        readonly internalType: param["type"];
        readonly components: elements;
      }
    : param
  : param;

export type ResolveTypes<
  witParameters extends readonly (WitParameter & { type: string })[],
  records extends ComponentLookup | unknown = unknown,
  variants extends ComponentLookup | unknown = unknown,
  enums extends EnumLookup | unknown = unknown,
  flags extends FlagsLookup | unknown = unknown,
  keyReferences extends { [_: string]: unknown } | unknown = unknown,
> = readonly [
  ...{
    [key in keyof witParameters]: witParameters[key]["type"] extends  // Handle wrapped types (list<T>, option<T>)
    `list<${infer inner}>`
      ? ResolveWrappedType<
          witParameters[key],
          "list",
          inner,
          records,
          variants,
          enums,
          flags,
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
            flags,
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
              flags,
              keyReferences
            >
          : // Multi-element wrappers (result, tuple)
            witParameters[key]["type"] extends `result<${infer inner}>`
            ? ResolveMultiElementType<
                witParameters[key],
                "result",
                inner,
                records,
                variants,
                enums,
                flags,
                keyReferences
              >
            : witParameters[key]["type"] extends `tuple<${infer inner}>`
              ? ResolveMultiElementType<
                  witParameters[key],
                  "tuple",
                  inner,
                  records,
                  variants,
                  enums,
                  flags,
                  keyReferences
                >
              : // Handle direct type references
                ResolveDirectType<
                  witParameters[key],
                  records,
                  variants,
                  enums,
                  flags,
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
  flags extends FlagsLookup | unknown,
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
              flags,
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
                  flags,
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
              : [flags] extends [FlagsLookup]
                ? inner extends keyof flags
                  ? inner extends keyof keyReferences
                    ? Error_<`Circular reference detected at "${inner}".`>
                    : {
                        readonly name: param["name"];
                        readonly type: wrapper extends "result"
                          ? `result<flags, error>`
                          : `${wrapper}<flags>`;
                        readonly internalType: wrapper extends "result"
                          ? `result<${inner}, error>`
                          : `${wrapper}<${inner}>`;
                        readonly components: EnumToComponents<flags[inner]>;
                      }
                  : param
                : param
            : [flags] extends [FlagsLookup]
              ? inner extends keyof flags
                ? inner extends keyof keyReferences
                  ? Error_<`Circular reference detected at "${inner}".`>
                  : {
                      readonly name: param["name"];
                      readonly type: wrapper extends "result"
                        ? `result<flags, error>`
                        : `${wrapper}<flags>`;
                      readonly internalType: wrapper extends "result"
                        ? `result<${inner}, error>`
                        : `${wrapper}<${inner}>`;
                      readonly components: EnumToComponents<flags[inner]>;
                    }
                : param
              : param
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
            : [flags] extends [FlagsLookup]
              ? inner extends keyof flags
                ? inner extends keyof keyReferences
                  ? Error_<`Circular reference detected at "${inner}".`>
                  : {
                      readonly name: param["name"];
                      readonly type: wrapper extends "result"
                        ? `result<flags, error>`
                        : `${wrapper}<flags>`;
                      readonly internalType: wrapper extends "result"
                        ? `result<${inner}, error>`
                        : `${wrapper}<${inner}>`;
                      readonly components: EnumToComponents<flags[inner]>;
                    }
                : param
              : param
          : [flags] extends [FlagsLookup]
            ? inner extends keyof flags
              ? inner extends keyof keyReferences
                ? Error_<`Circular reference detected at "${inner}".`>
                : {
                    readonly name: param["name"];
                    readonly type: wrapper extends "result"
                      ? `result<flags, error>`
                      : `${wrapper}<flags>`;
                    readonly internalType: wrapper extends "result"
                      ? `result<${inner}, error>`
                      : `${wrapper}<${inner}>`;
                    readonly components: EnumToComponents<flags[inner]>;
                  }
              : param
            : param
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
                flags,
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
            : [flags] extends [FlagsLookup]
              ? inner extends keyof flags
                ? inner extends keyof keyReferences
                  ? Error_<`Circular reference detected at "${inner}".`>
                  : {
                      readonly name: param["name"];
                      readonly type: wrapper extends "result"
                        ? `result<flags, error>`
                        : `${wrapper}<flags>`;
                      readonly internalType: wrapper extends "result"
                        ? `result<${inner}, error>`
                        : `${wrapper}<${inner}>`;
                      readonly components: EnumToComponents<flags[inner]>;
                    }
                : param
              : param
          : [flags] extends [FlagsLookup]
            ? inner extends keyof flags
              ? inner extends keyof keyReferences
                ? Error_<`Circular reference detected at "${inner}".`>
                : {
                    readonly name: param["name"];
                    readonly type: wrapper extends "result"
                      ? `result<flags, error>`
                      : `${wrapper}<flags>`;
                    readonly internalType: wrapper extends "result"
                      ? `result<${inner}, error>`
                      : `${wrapper}<${inner}>`;
                    readonly components: EnumToComponents<flags[inner]>;
                  }
              : param
            : param
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
          : [flags] extends [FlagsLookup]
            ? inner extends keyof flags
              ? inner extends keyof keyReferences
                ? Error_<`Circular reference detected at "${inner}".`>
                : {
                    readonly name: param["name"];
                    readonly type: wrapper extends "result"
                      ? `result<flags, error>`
                      : `${wrapper}<flags>`;
                    readonly internalType: wrapper extends "result"
                      ? `result<${inner}, error>`
                      : `${wrapper}<${inner}>`;
                    readonly components: EnumToComponents<flags[inner]>;
                  }
              : param
            : param
        : [flags] extends [FlagsLookup]
          ? inner extends keyof flags
            ? inner extends keyof keyReferences
              ? Error_<`Circular reference detected at "${inner}".`>
              : {
                  readonly name: param["name"];
                  readonly type: wrapper extends "result"
                    ? `result<flags, error>`
                    : `${wrapper}<flags>`;
                  readonly internalType: wrapper extends "result"
                    ? `result<${inner}, error>`
                    : `${wrapper}<${inner}>`;
                  readonly components: EnumToComponents<flags[inner]>;
                }
            : param
          : param;

type ResolveDirectType<
  param extends WitParameter & { type: string },
  records extends ComponentLookup | unknown,
  variants extends ComponentLookup | unknown,
  enums extends EnumLookup | unknown,
  flags extends FlagsLookup | unknown,
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
              flags,
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
                  flags,
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
              : [flags] extends [FlagsLookup]
                ? param["type"] extends keyof flags
                  ? param["type"] extends keyof keyReferences
                    ? Error_<`Circular reference detected at "${param["type"]}".`>
                    : {
                        readonly name: param["name"];
                        readonly type: "flags";
                        readonly internalType: param["type"];
                        readonly components: EnumToComponents<flags[param["type"]]>;
                      }
                  : param
                : param
            : [flags] extends [FlagsLookup]
              ? param["type"] extends keyof flags
                ? param["type"] extends keyof keyReferences
                  ? Error_<`Circular reference detected at "${param["type"]}".`>
                  : {
                      readonly name: param["name"];
                      readonly type: "flags";
                      readonly internalType: param["type"];
                      readonly components: EnumToComponents<flags[param["type"]]>;
                    }
                : param
              : param
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
            : [flags] extends [FlagsLookup]
              ? param["type"] extends keyof flags
                ? param["type"] extends keyof keyReferences
                  ? Error_<`Circular reference detected at "${param["type"]}".`>
                  : {
                      readonly name: param["name"];
                      readonly type: "flags";
                      readonly internalType: param["type"];
                      readonly components: EnumToComponents<flags[param["type"]]>;
                    }
                : param
              : param
          : [flags] extends [FlagsLookup]
            ? param["type"] extends keyof flags
              ? param["type"] extends keyof keyReferences
                ? Error_<`Circular reference detected at "${param["type"]}".`>
                : {
                    readonly name: param["name"];
                    readonly type: "flags";
                    readonly internalType: param["type"];
                    readonly components: EnumToComponents<flags[param["type"]]>;
                  }
              : param
            : param
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
                flags,
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
            : [flags] extends [FlagsLookup]
              ? param["type"] extends keyof flags
                ? param["type"] extends keyof keyReferences
                  ? Error_<`Circular reference detected at "${param["type"]}".`>
                  : {
                      readonly name: param["name"];
                      readonly type: "flags";
                      readonly internalType: param["type"];
                      readonly components: EnumToComponents<flags[param["type"]]>;
                    }
                : param
              : param
          : [flags] extends [FlagsLookup]
            ? param["type"] extends keyof flags
              ? param["type"] extends keyof keyReferences
                ? Error_<`Circular reference detected at "${param["type"]}".`>
                : {
                    readonly name: param["name"];
                    readonly type: "flags";
                    readonly internalType: param["type"];
                    readonly components: EnumToComponents<flags[param["type"]]>;
                  }
              : param
            : param
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
          : [flags] extends [FlagsLookup]
            ? param["type"] extends keyof flags
              ? param["type"] extends keyof keyReferences
                ? Error_<`Circular reference detected at "${param["type"]}".`>
                : {
                    readonly name: param["name"];
                    readonly type: "flags";
                    readonly internalType: param["type"];
                    readonly components: EnumToComponents<flags[param["type"]]>;
                  }
              : param
            : param
        : [flags] extends [FlagsLookup]
          ? param["type"] extends keyof flags
            ? param["type"] extends keyof keyReferences
              ? Error_<`Circular reference detected at "${param["type"]}".`>
              : {
                  readonly name: param["name"];
                  readonly type: "flags";
                  readonly internalType: param["type"];
                  readonly components: EnumToComponents<flags[param["type"]]>;
                }
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
    ? ParseFlags<signatures> extends infer flags extends FlagsLookup
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
                  enums,
                  flags
                >;
              };
              variants: {
                [K in keyof shallowVariants]: ResolveTypes<
                  shallowVariants[K],
                  shallowRecords,
                  shallowVariants,
                  enums,
                  flags
                >;
              };
              enums: enums;
              flags: flags;
            }
          : never
        : never
      : never
    : never;
