// Core types
export {
  type Wit,
  type WitFunction,
  type WitParameter,
  type WitParameterKind,
  type WitType,
  type WitItemType,
  type WitInternalType,
  type WitRecord,
  type WitVariant,
  type WitEnum,
  type WitError,
  type WitUnit,
  type WitBool,
  type WitSInt,
  type WitUInt,
  type WitInt,
  type WitString,
  type WitOption,
  type WitResult,
  type WitList,
  type MBits,
} from "./wit.js";

// Register
export { type Register, type ResolvedRegister, type DefaultRegister } from "./register.js";

// Error
export { BaseError, type Error_ } from "./error.js";

// Type utilities
export {
  type Prettify,
  type Filter,
  type Trim,
  type OneOf,
  type IsNever,
  type IsNarrowable,
  type Merge,
  type UnionEvaluate,
  type UnionToTuple,
  type IsUnion,
  type UnionOmit,
  type Assign,
  type ExactPartial,
  type Join,
} from "./type-utils.js";

// Narrow
export { type Narrow, narrow } from "./narrow.js";

// Regex
export { execTyped, isGenericRegex } from "./regex.js";

// Built-ins
export { WitError as WitErrorBuiltin } from "./built-ins.js";

// Utils
export {
  type IsWit,
  type ExtractWitFunctions,
  type ExtractWitFunctionNames,
  type ExtractWitFunction,
  type Option,
  type Result,
  type WitTypeToPrimitiveType,
  type WitParametersToPrimitiveTypes,
  type WitParameterToPrimitiveType,
} from "./utils.js";

// Parser
export { type ParseWit, parseWit } from "./parser/parse-wit.js";
export {
  type ParseWitParameter,
  parseWitParameter,
} from "./parser/parse-wit-parameter.js";

// Parser core
export {
  isFunctionSignature,
  isRecordSignature,
  isVariantSignature,
  isEnumSignature,
  execFunctionSignature,
  execRecordSignature,
  execVariantSignature,
  execEnumSignature,
} from "./parser/core/signatures.js";

export {
  parseSignature,
  parseFunctionSignature,
  splitParameters,
  parseWitParameter as parseWitParameterCore,
  enumToComponents,
} from "./parser/core/utils.js";

export { parseTypes } from "./parser/core/user-defined.js";

// Parser type-level
export {
  type ParseSignature,
  type ParseWitParameter as ParseWitParameterType,
  type ParseWitParameters,
  type SplitParameters,
  type _ParseFunctionParameters,
} from "./parser/core/types/utils.js";

export {
  type IsSignature,
  type Signature,
  type Signatures,
  type IsFunctionSignature,
  type IsRecordSignature,
  type IsVariantSignature,
  type IsEnumSignature,
  type IsName,
  type ValidateName,
  type WitKeyword,
} from "./parser/core/types/signatures.js";

export {
  type ParseTypes,
  type ParseEnums,
  type ParseRecords,
  type ParseVariants,
  type ResolveTypes,
  type EnumToComponents,
  type RecordLookup,
  type VariantLookup,
  type EnumLookup,
  type ComponentLookup,
} from "./parser/core/types/user-defined.js";

// Formatter
export { type FormatWit, formatWit } from "./formatter/format-wit.js";
export {
  type FormatWitFunction,
  formatWitFunction,
} from "./formatter/format-wit-function.js";
export {
  type FormatWitParameter,
  formatWitParameter,
} from "./formatter/format-wit-parameter.js";

// Formatter core
export {
  formatWitParameterSignature,
  formatWitParameters,
  formatFunctionSignature,
  collectTypeDefinitions,
} from "./formatter/core/utils.js";

// Formatter type-level
export {
  type FormatWitParameterSignature,
  type FormatWitParameters as FormatWitParametersType,
  type FormatFunctionSignature,
  type CollectTypeDefinitions,
} from "./formatter/core/types/utils.js";

// Errors
export { InvalidSignatureError, UnknownSignatureError, InvalidRecordSignatureError } from "./parser/core/errors/signature.js";
export { InvalidWitParameterError, WitProtectedKeywordError } from "./parser/core/errors/wit-parameter.js";
export { InvalidGenericDepthError } from "./parser/core/errors/split-parameters.js";
