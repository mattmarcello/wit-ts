import type { Error_ } from "./error.js";
import type {
  Wit,
  MBits,
  WitInt,
  WitList,
  WitType,
  WitParameterKind,
  WitParameter,
  WitRecord,
  WitOption,
  WitResult,
  WitVariant,
  WitEnum,
  WitFlag,
} from "./wit.js";
import type { ResolvedRegister } from "./register.js";
import type { Merge, Prettify } from "./type-utils.js";
import type { WitError } from "./built-ins.js";

export type IsWit<wit> = wit extends Wit ? true : false;

export type ExtractWitFunctions<
  wit extends Wit,
> = Extract<wit[number], { type: "function" }>;

export type ExtractWitFunctionNames<
  wit extends Wit,
> = ExtractWitFunctions<wit>["name"];

export type ExtractWitFunction<
  wit extends Wit,
  functionName extends ExtractWitFunctionNames<wit>,
> = Extract<ExtractWitFunctions<wit>, { name: functionName }>;

type NoBits = "";
type GreaterThan48Bits = Exclude<MBits, 8 | 16 | 32 | NoBits>;
type LessThanOrEqualTo48Bits = Exclude<MBits, GreaterThan48Bits | NoBits>;

export type Option<T> = ["none"] | ["some", T];
export type Result<T, E> = ["ok", T] | ["err", E];

export type WitTypeToPrimitiveType<witType extends WitType> =
  PrimitiveTypeLookup[witType];

interface PrimitiveTypeLookup
  extends WitIntMap,
    WitListMap,
    WitOptionMap,
    WitResultMap {
  bool: boolean;
  string: string;
  record: Record<string, unknown>;
  variant: [string, unknown];
  enum: string;
  flags: Record<string, boolean>;
  error: unknown;
}

type WitIntMap = {
  [_ in WitInt]: _ extends `${
    | "u"
    | "s"}${infer bits extends keyof BitsTypeLookup}`
    ? BitsTypeLookup[bits]
    : never;
};

type WitListMap = { [_ in WitList]: readonly unknown[] };

type WitOptionMap = { [_ in WitOption]: Option<unknown> };

type WitResultMap = { [_ in WitResult]: Result<unknown, WitError.T> };

type BitsTypeLookup = {
  [key in MBits]: ResolvedRegister[key extends LessThanOrEqualTo48Bits
    ? "intType"
    : "bigIntType"];
};

type WitBasicType = Exclude<
  WitType,
  WitRecord | WitList | WitResult | WitOption | WitVariant | WitEnum | WitFlag
>;

export type WitParametersToPrimitiveTypes<
  witParameters extends readonly WitParameter[],
  witParameterKind extends WitParameterKind = WitParameterKind,
> = Prettify<{
  [key in keyof witParameters]: WitParameterToPrimitiveType<
    witParameters[key],
    witParameterKind
  >;
}>;

type MaybeExtractListParameterType<T> = T extends `list<${infer Inner}>`
  ? Inner
  : undefined;

type MaybeExtractOptionParameterType<T> = T extends `option<${infer Inner}>`
  ? Inner
  : undefined;

type MaybeExtractResultParameterType<T> =
  T extends `result<${infer Ok}, ${infer Err}>` ? [Ok, Err] : undefined;

type WitListToPrimitiveType<
  witParameter extends WitParameter | { name: string; type: unknown },
  witParameterKind extends WitParameterKind,
  head extends string,
> = readonly WitParameterToPrimitiveType<
  Merge<witParameter, { type: head }>,
  witParameterKind
>[];

type WitOptionToPrimitiveType<
  witParameter extends WitParameter | { name: string; type: unknown },
  witParameterKind extends WitParameterKind,
  inner extends string,
> =
  Option<
    WitParameterToPrimitiveType<
      Merge<witParameter, { type: inner }>,
      witParameterKind
    >
  > extends infer O
    ? O
    : never;

type WitResultToPrimitiveType<
  witParameter extends WitParameter | { name: string; type: unknown },
  witParameterKind extends WitParameterKind,
  ok extends string,
> =
  Result<
    WitParameterToPrimitiveType<
      Merge<witParameter, { type: ok }>,
      witParameterKind
    >,
    WitError.T
  > extends infer R
    ? R
    : never;

export type WitParameterToPrimitiveType<
  witParameter extends WitParameter | { name: string; type: unknown },
  witParameterKind extends WitParameterKind = WitParameterKind,
> =
  // 1. Basic type
  witParameter["type"] extends WitBasicType
    ? WitTypeToPrimitiveType<witParameter["type"]>
    : // 2. Variant (discriminated union)
      witParameter extends {
          type: "variant";
          components?: infer components extends readonly WitParameter[];
        }
      ? WitVariantToPrimitiveType<components, witParameterKind>
      : // 3. Enum (string literal union)
        witParameter extends {
            type: "enum";
          }
        ? witParameter extends {
            components?: infer components extends readonly WitParameter[];
          }
          ? WitEnumToPrimitiveType<components>
          : never
        : // 3b. Flags (record of booleans)
          witParameter extends {
              type: "flags";
              components?: infer components extends readonly WitParameter[];
            }
          ? WitFlagsToPrimitiveType<components>
          : // 4. Explicit record with components
          witParameter extends {
              type: WitRecord;
              components: infer components extends readonly WitParameter[];
            }
          ? WitComponentsToPrimitiveType<components, witParameterKind>
          : // 5. list<...>
            MaybeExtractListParameterType<
                witParameter["type"]
              > extends infer head extends string
            ? WitListToPrimitiveType<witParameter, witParameterKind, head>
            : // 6. option<...>
              MaybeExtractOptionParameterType<
                  witParameter["type"]
                > extends infer inner extends string
              ? WitOptionToPrimitiveType<witParameter, witParameterKind, inner>
              : // 7. result<Ok, Err>
                MaybeExtractResultParameterType<witParameter["type"]> extends [
                    infer ok extends string,
                    infer _err extends "error",
                  ]
                ? WitResultToPrimitiveType<witParameter, witParameterKind, ok>
                : ResolvedRegister["strictWitType"] extends true
                  ? Error_<`Unknown type '${witParameter["type"] & string}'.`>
                  : witParameter extends { components: Error_<string> }
                    ? witParameter["components"]
                    : unknown;

type WitVariantToPrimitiveType<
  components extends readonly WitParameter[],
  witParameterKind extends WitParameterKind,
> = {
  [K in keyof components]: components[K] extends {
    name: infer CaseName extends string;
  }
    ? components[K] extends { type: "_" }
      ? [CaseName] // Unit case (no value)
      : components[K] extends {
            type: WitRecord;
            name: string;
            components?: infer components extends readonly WitParameter[];
          }
        ? [CaseName, WitComponentsToPrimitiveType<components, witParameterKind>]
        : [
            CaseName,
            WitParameterToPrimitiveType<components[K], witParameterKind>,
          ]
    : never;
}[number];

type WitEnumToPrimitiveType<components extends readonly WitParameter[]> =
  Readonly<{
    [K in keyof components]: components[K] extends {
      name: infer CaseName extends string;
    }
      ? components[K] extends { type: "_" }
        ? CaseName
        : never
      : never;
  }>[number];

type WitFlagsToPrimitiveType<components extends readonly WitParameter[]> = {
  [K in components[number] as K extends { name: infer N extends string }
    ? N
    : never]: boolean;
};

type WitComponentsToPrimitiveType<
  components extends readonly WitParameter[],
  witParameterKind extends WitParameterKind,
> = components extends readonly []
  ? []
  : components[number]["name"] extends Exclude<
        components[number]["name"] & string,
        undefined | ""
      >
    ? {
        [component in components[number] as component["name"] & {}]: WitParameterToPrimitiveType<
          component,
          witParameterKind
        >;
      }
    : {
        [key in keyof components]: WitParameterToPrimitiveType<
          components[key],
          witParameterKind
        >;
      };
