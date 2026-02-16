import type { Error_ } from "../../../error.js";

export type IsSignature<type extends string> =
  | (IsFunctionSignature<type> extends true ? true : never)
  | (IsRecordSignature<type> extends true ? true : never)
  | (IsVariantSignature<type> extends true ? true : never)
  | (IsEnumSignature<type> extends true ? true : never);

export type Signature<
  string1 extends string,
  string2 extends string | unknown = unknown,
> =
  IsSignature<string1> extends true
    ? string1
    : string extends string1 // if exactly `string` (not narrowed), then pass through as valid
      ? string1
      : Error_<`Signature "${string1}" is invalid${string2 extends string
          ? ` at position ${string2}`
          : ""}.`>;

export type Signatures<signatures extends readonly string[]> = {
  [key in keyof signatures]: Signature<signatures[key], key>;
};

export type RecordSignature<
  name extends string = string,
  properties extends string = string,
> = `record ${name} { ${properties} }`;

export type IsRecordSignature<signature extends string> =
  signature extends RecordSignature<infer name> ? IsName<name> : false;

export type VariantSignature<
  name extends string = string,
  cases extends string = string,
> = `variant ${name} { ${cases} }`;

export type IsVariantSignature<signature extends string> =
  signature extends VariantSignature<infer name> ? IsName<name> : false;

export type EnumSignature<
  name extends string = string,
  cases extends string = string,
> = `enum ${name} { ${cases} }`;

export type IsEnumSignature<signature extends string> =
  signature extends EnumSignature<infer name> ? IsName<name> : false;

export type FunctionSignature<
  name extends string = string,
  tail extends string = string,
> = `${string}${name}: func(${tail}`;

export type IsFunctionSignature<signature> =
  signature extends `${string}: func(${string}` // quick pre-check
    ? signature extends ValidFunctionSignatures
      ? _ExtractFnName<signature> extends infer name extends string
        ? IsName<name>
        : false
      : false
    : false;

type _ExtractFnName<S extends string> =
  S extends `export ${infer N}: func(${string}` ? N
    : S extends `${infer N}: func(${string}` ? N
    : never;

export type IsName<name extends string> = name extends ""
  ? false
  : ValidateName<name> extends name
    ? true
    : false;

export type AssertName<name extends string> =
  ValidateName<name> extends infer invalidName extends string[]
    ? `[${invalidName[number]}]`
    : name;

export type ValidateName<
  name extends string,
  checkCharacters extends boolean = false,
> = name extends `${string}${" "}${string}`
  ? Error_<`Identifier "${name}" cannot contain whitespace.`>
  : IsWitKeyword<name> extends true
    ? Error_<`"${name}" is a protected WIT keyword.`>
    : name extends `${number}`
      ? Error_<`Identifier "${name}" cannot be a number string.`>
      : name extends `${number}${string}`
        ? Error_<`Identifier "${name}" cannot start with a number.`>
        : checkCharacters extends true
          ? IsValidCharacter<name> extends true
            ? name
            : Error_<`"${name}" contains invalid character.`>
          : name;

export type IsWitKeyword<word extends string> = word extends WitKeyword
  ? true
  : false;

export type WitKeyword =
  | "package"
  | "world"
  | "interface"
  | "include"
  | "use"
  | "import"
  | "export"
  | "func"
  | "borrow"
  | "record"
  | "list"
  | "enum"
  | "flags"
  | "variant"
  | "option"
  | "result"
  | "bool"
  | "s8"
  | "s16"
  | "s32"
  | "s64"
  | "u8"
  | "u16"
  | "u32"
  | "u64"
  | "f32"
  | "f64"
  | "char"
  | "string";

export type IsValidCharacter<character extends string> =
  character extends `${ValidCharacters}${infer tail}`
    ? tail extends ""
      ? true
      : IsValidCharacter<tail>
    : false;

type ValidCharacters =
  // lowercase letters
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  // special characters
  | "_";

type Returns = `-> ${string};`;
type ValidFunctionSignatures =
  | `${string}: func() ${Returns}`
  | `${string}: func(${string}) ${Returns}`
  | `${string}: func();`
  | `${string}: func(${string});`;
