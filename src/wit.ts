import type { Prettify } from "./type-utils.js";

export type MBits = 8 | 16 | 32 | 64;

export type WitRecord = "record";
export type WitVariant = "variant";
export type WitEnum = "enum";
export type WitError = "error";
export type WitUnit = "_";

export type WitBool = "bool";
export type WitSInt = `s${MBits}`;
export type WitUInt = `u${MBits}`;
export type WitString = "string";

export type WitInt = WitSInt | WitUInt;

type _BuildOptionTypes<T extends string> = `option<${T}>`;
export type WitOptionWithoutRecord = _BuildOptionTypes<
  | WitBool
  | WitSInt
  | WitUInt
  | WitString
  | WitUnit
>;

export type WitOptionWithRecord = _BuildOptionTypes<WitRecord>;

export type WitOptionWithVariant = _BuildOptionTypes<WitVariant>;

export type WitOptionWithEnum = _BuildOptionTypes<WitEnum>;

export type WitOptionWithList = _BuildOptionTypes<WitList>;

export type WitOption =
  | WitOptionWithoutRecord
  | WitOptionWithRecord
  | WitOptionWithVariant
  | WitOptionWithEnum
  | WitOptionWithList;

type _BuildResultTypes<T extends string> = `result<${T}, error>`;

export type WitResultWithoutRecord = _BuildResultTypes<
  | WitBool
  | WitSInt
  | WitUInt
  | WitString
  | WitOption
  | WitUnit
>;
export type WitResultWithRecord = _BuildResultTypes<WitRecord>;
export type WitResultWithVariant = _BuildResultTypes<WitVariant>;
export type WitResultWithEnum = _BuildResultTypes<WitEnum>;

export type WitResultWithList = _BuildResultTypes<WitList>;

export type WitResult =
  | WitResultWithoutRecord
  | WitResultWithRecord
  | WitResultWithEnum
  | WitResultWithVariant
  | WitResultWithList;

type _BuildListTypes<T extends string> = `list<${T}>`;
export type WitListWithoutRecord = _BuildListTypes<
  | WitBool
  | WitSInt
  | WitUInt
  | WitString
  | WitUnit
>;

export type WitListWithRecord = _BuildListTypes<WitRecord>;

export type WitListWithVariant = _BuildListTypes<WitVariant>;

export type WitListWithEnum = _BuildListTypes<WitEnum>;

export type WitList = Exclude<
  | WitListWithoutRecord
  | WitListWithRecord
  | WitListWithEnum
  | WitListWithVariant,
  _BuildListTypes<WitUnit>
>;

export type WitParameterKind = "inputs" | "outputs";

export type WitType =
  | WitRecord
  | WitResult
  | WitError
  | WitBool
  | WitSInt
  | WitUInt
  | WitString
  | WitList
  | WitVariant
  | WitEnum
  | WitOption;

type ResolvedWitType = ResolvedRegister["strictWitType"] extends true
  ? WitType
  : string;

export type WitInternalType = ResolvedWitType | `record ${string}`;

export type WitParameter = Prettify<{
  type: string;
  name?: string | undefined;
  internalType?: WitInternalType | undefined;
  components?: readonly WitParameter[];
}>;

export type WitItemType = "func";

export type WitFunction = {
  type: "function";
  name: string;
  inputs: readonly WitParameter[];
  outputs: readonly WitParameter[];
};

export type Wit = readonly WitFunction[];

import type { ResolvedRegister } from "./register.js";
