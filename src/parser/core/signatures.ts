import { execTyped } from "../../regex.js";

const errorSignatureRegex =
  /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
export function isErrorSignature(signature: string) {
  return errorSignatureRegex.test(signature);
}
export function execErrorSignature(signature: string) {
  return execTyped<{ name: string; parameters: string }>(
    errorSignatureRegex,
    signature,
  );
}

const witFnSignatureRegex =
  /^(?:export\s+)?(?<name>[a-z][a-z0-9-]*)\s*:\s*func\s*\(\s*(?<params>.*?)\s*\)\s*(?:->\s*(?<returns>[^;]+))?;\s*$/;

export function isFunctionSignature(signature: string) {
  return witFnSignatureRegex.test(signature);
}

export function execFunctionSignature(signature: string) {
  const m = witFnSignatureRegex.exec(signature);
  if (!m || !m.groups) return null;

  const name = m.groups.name!;
  const parameters = (m.groups.params ?? "").trim();
  const returns = (m.groups.returns ?? "").trim() || undefined;

  return { name, parameters, returns };
}

const witRecordSignatureRegex =
  /^record\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_-]*)\s*\{(?<properties>[\s\S]*?)\}$/;

export function isRecordSignature(signature: string) {
  return witRecordSignatureRegex.test(signature);
}

export function execRecordSignature(signature: string) {
  return execTyped<{
    name: string;
    properties: string;
  }>(witRecordSignatureRegex, signature);
}

const witVariantSignatureRegex =
  /^variant\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_-]*)\s*\{(?<cases>[\s\S]*?)\}$/;

export function isVariantSignature(signature: string) {
  return witVariantSignatureRegex.test(signature);
}

export function execVariantSignature(signature: string) {
  return execTyped<{
    name: string;
    cases: string;
  }>(witVariantSignatureRegex, signature);
}

const witEnumSignatureRegex =
  /^enum\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_-]*)\s*\{(?<cases>[\s\S]*?)\}$/;

export function isEnumSignature(signature: string) {
  return witEnumSignatureRegex.test(signature);
}

export function execEnumSignature(signature: string) {
  return execTyped<{
    name: string;
    cases: string;
  }>(witEnumSignatureRegex, signature);
}

const witFlagsSignatureRegex =
  /^flags\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_-]*)\s*\{(?<cases>[\s\S]*?)\}$/;

export function isFlagsSignature(signature: string) {
  return witFlagsSignatureRegex.test(signature);
}

export function execFlagsSignature(signature: string) {
  return execTyped<{
    name: string;
    cases: string;
  }>(witFlagsSignatureRegex, signature);
}
