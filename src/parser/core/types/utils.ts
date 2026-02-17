import type { Trim, Prettify, Join } from "../../../type-utils.js";
import type { IsFunctionSignature } from "./signatures.js";
import type { Error_ } from "../../../error.js";
import type {
  EnumLookup,
  FlagsLookup,
  RecordLookup,
  VariantLookup,
  EnumToComponents,
} from "./user-defined.js";

type ParseOptions = {
  records?: RecordLookup | unknown;
  variants?: VariantLookup | unknown;
  enums?: EnumLookup | unknown;
  flags?: FlagsLookup | unknown;
};
type DefaultParseOptions = {};

type Readonlyify<T> = { readonly [K in keyof T]: T[K] };
type HasRecords<Opts> = Opts extends { records: Record<string, unknown> }
  ? true
  : false;

type HasVariants<Opts> = Opts extends { variants: Record<string, unknown> }
  ? true
  : false;

type HasEnums<Opts> = Opts extends { enums: Record<string, unknown> }
  ? true
  : false;

type HasFlags<Opts> = Opts extends { flags: Record<string, unknown> }
  ? true
  : false;

type RecordsOf<Opts> = Opts extends { records: infer R extends RecordLookup }
  ? R
  : never;

type VariantsOf<Opts> = Opts extends { variants: infer R extends VariantLookup }
  ? R
  : never;

type EnumsOf<Opts> = Opts extends { enums: infer E extends EnumLookup }
  ? E
  : never;

type FlagsOf<Opts> = Opts extends { flags: infer F extends FlagsLookup }
  ? F
  : never;

type WithName<Shallow> = Shallow extends { name: infer N extends string }
  ? { readonly name: N }
  : {};
type GetComponents<T> = T extends { components: infer C }
  ? { readonly components: C }
  : {};

type MapCaseFields<
  Fields extends readonly {
    readonly name?: string | undefined;
    readonly type: string;
  }[],
  V extends VariantLookup,
  R extends RecordLookup,
  E extends EnumLookup,
> = {
  readonly [I in keyof Fields]: Fields[I] extends {
    readonly name?: infer N extends string | undefined;
    readonly internalType: infer IT extends string;
    readonly type: infer T extends string;
  }
    ? Prettify<
        { readonly name: N } & MapGenericType<
          IT extends "_" ? T : IT,
          { variants: V; records: R; enums: E }
        >
      >
    : never;
};
type AsUserDefinedFallback<
  T extends string,
  Opts extends ParseOptions,
> = HasFlags<Opts> extends true
  ? T extends keyof FlagsOf<Opts>
    ? Readonlyify<{
        type: "flags";
        internalType: T;
        components: EnumToComponents<FlagsOf<Opts>[T]>;
      }>
    : Readonlyify<{ type: T; internalType: T }>
  : Readonlyify<{ type: T; internalType: T }>;

type AsUserDefinedType<
  T extends string,
  Opts extends ParseOptions,
> = T extends "_"
  ? Readonlyify<{ type: "_"; internalType: "_" }>
  : HasRecords<Opts> extends true
    ? T extends keyof RecordsOf<Opts>
      ? Readonlyify<{
          type: "record";
          internalType: T;
          components: RecordsOf<Opts>[T];
        }>
      : HasVariants<Opts> extends true
        ? T extends keyof VariantsOf<Opts>
          ? Readonlyify<{
              type: "variant";
              internalType: T;
              components: MapCaseFields<
                VariantsOf<Opts>[T],
                VariantsOf<Opts>,
                RecordsOf<Opts>,
                EnumsOf<Opts>
              >;
            }>
          : HasEnums<Opts> extends true
            ? T extends keyof EnumsOf<Opts>
              ? Readonlyify<{
                  type: "enum";
                  internalType: T;
                  components: EnumToComponents<EnumsOf<Opts>[T]>;
                }>
              : AsUserDefinedFallback<T, Opts>
            : AsUserDefinedFallback<T, Opts>
        : HasEnums<Opts> extends true
          ? T extends keyof EnumsOf<Opts>
            ? Readonlyify<{
                type: "enum";
                internalType: T;
                components: EnumToComponents<EnumsOf<Opts>[T]>;
              }>
            : AsUserDefinedFallback<T, Opts>
          : AsUserDefinedFallback<T, Opts>
    : HasVariants<Opts> extends true
      ? T extends keyof VariantsOf<Opts>
        ? Readonlyify<{
            type: "variant";
            internalType: T;
            components: VariantsOf<Opts>[T];
          }>
        : HasEnums<Opts> extends true
          ? T extends keyof EnumsOf<Opts>
            ? Readonlyify<{
                type: "enum";
                internalType: T;
                components: EnumToComponents<EnumsOf<Opts>[T]>;
              }>
            : AsUserDefinedFallback<T, Opts>
          : AsUserDefinedFallback<T, Opts>
      : HasEnums<Opts> extends true
        ? T extends keyof EnumsOf<Opts>
          ? Readonlyify<{
              type: "enum";
              internalType: T;
              components: EnumToComponents<EnumsOf<Opts>[T]>;
            }>
          : AsUserDefinedFallback<T, Opts>
        : AsUserDefinedFallback<T, Opts>;

type MapMultiElements<
  parts extends readonly string[],
  Opts extends ParseOptions,
> = readonly [...{
  [K in keyof parts]: MapGenericType<Trim<parts[K] & string>, Opts>;
}];

type ExtractTypes<elements extends readonly { type: string }[]> = {
  [K in keyof elements]: elements[K]["type"];
} extends infer R extends readonly string[] ? R : never;

type MapGenericType<T extends string, Opts extends ParseOptions> =
  // list<...>
  T extends `list<${infer U}>`
    ? MapGenericType<Trim<U>, Opts> extends infer M extends { type: string }
      ? Readonlyify<
          { type: `list<${M["type"]}>`; internalType: T } & GetComponents<M>
        >
      : never
    : T extends `option<${infer U}>`
      ? MapGenericType<Trim<U>, Opts> extends infer M extends { type: string }
        ? Readonlyify<
            { type: `option<${M["type"]}>`; internalType: T } & GetComponents<M>
          >
        : never
      : // result<L, R> — elements-as-components
        T extends `result<${infer Inner}>`
        ? SplitParameters<Trim<Inner>> extends infer parts extends readonly string[]
          ? MapMultiElements<parts, Opts> extends infer elements extends readonly { type: string }[]
            ? Readonlyify<{
                type: `result<${Join<ExtractTypes<elements>>}>`;
                internalType: T;
                components: elements;
              }>
            : never
          : never
        : // tuple<...> — elements-as-components
          T extends `tuple<${infer Inner}>`
          ? SplitParameters<Trim<Inner>> extends infer parts extends readonly string[]
            ? MapMultiElements<parts, Opts> extends infer elements extends readonly { type: string }[]
              ? Readonlyify<{
                  type: `tuple<${Join<ExtractTypes<elements>>}>`;
                  internalType: T;
                  components: elements;
                }>
              : never
            : never
          : // scalar or record-mapped
            AsUserDefinedType<T, Opts>;

export type ParseWitParameter<
  signature extends string,
  options extends ParseOptions = DefaultParseOptions,
> = (
  signature extends `${infer left}: ${infer right}`
    ? { readonly type: Trim<right> } & { readonly name: Trim<left> }
    : { readonly type: Trim<signature> }
) extends infer Shallow extends { type: string; name?: string }
  ? Prettify<WithName<Shallow> & MapGenericType<Shallow["type"], options>>
  : never;

export type ParseWitParameters<
  signatures extends readonly string[],
  options extends ParseOptions = DefaultParseOptions,
> = signatures extends [""]
  ? readonly []
  : readonly [
      ...{
        [key in keyof signatures]: ParseWitParameter<signatures[key], options>;
      },
    ];

export type _ParseFunctionParameters<signature extends string> =
  signature extends `${infer head}-> ${string}`
    ? _ParseFunctionParameters<Trim<head>>
    : signature extends `${string}: func(${infer parameters});`
      ? { Inputs: Trim<parameters> }
      : signature extends `${string}: func(${infer parameters}) ${string}`
        ? { Inputs: Trim<parameters> }
        : signature extends `${string}: func();`
          ? { Inputs: "" }
          : // After stripping "-> returns;", the signature is just "name: func(params)"
            signature extends `${string}: func(${infer parameters})`
            ? { Inputs: Trim<parameters> }
            : signature extends `${string}: func()`
              ? { Inputs: "" }
              : never;

export type SplitParameters<
  signature extends string,
  result extends unknown[] = [],
  current extends string = "",
  depth extends readonly number[] = [],
> =
  // end of input
  signature extends ""
    ? current extends ""
      ? [...result]
      : depth["length"] extends 0
        ? [...result, Trim<current>]
        : Error_<`Unbalanced <>. "${current}" has too many opening "<".`>
    : signature extends `${infer char}${infer tail}`
      ? char extends ","
        ? // split only at top level
          depth["length"] extends 0
          ? SplitParameters<tail, [...result, Trim<current>], "">
          : SplitParameters<tail, result, `${current}${char}`, depth>
        : char extends "<"
          ? // enter deeper generic
            SplitParameters<tail, result, `${current}${char}`, [...depth, 1]>
          : char extends ">"
            ? // too many closing '>'
              depth["length"] extends 0
              ? Error_<`Unbalanced <>. "${current}${char}" has too many closing ">".`>
              : SplitParameters<tail, result, `${current}${char}`, Pop<depth>>
            : // accumulate any other char
              SplitParameters<tail, result, `${current}${char}`, depth>
      : [];

type Pop<type extends readonly number[]> = type extends [...infer head, any]
  ? head
  : [];

export type ParseSignature<
  signature extends string,
  types extends {
    records?: RecordLookup | unknown;
    variants?: VariantLookup | unknown;
    enums?: EnumLookup | unknown;
    flags?: FlagsLookup | unknown;
  } = {},
> =
  IsFunctionSignature<signature> extends true
    ? _ParseFunctionParameters<signature> extends infer parsed extends { Inputs: string }
      ? _ExtractFnName<signature> extends infer name extends string
        ? {
            readonly name: name;
            readonly type: "function";
            readonly inputs: ParseWitParameters<
              SplitParameters<parsed["Inputs"]>,
              types
            >;
            readonly outputs: signature extends `${string} -> ${infer returns};`
              ? ParseWitParameters<SplitParameters<Trim<returns>>, types>
              : readonly [];
          }
        : never
      : never
    : never;

type _ExtractFnName<S extends string> =
  S extends `export ${infer N}: func(${string}` ? N
    : S extends `${infer N}: func(${string}` ? N
    : never;
