import type { WitFunction, WitParameter } from "../../wit.js";

export function formatWitParameterSignature(param: WitParameter): string {
  const type = param.internalType ?? param.type;
  if (param.name) return `${param.name}: ${type}`;
  return type;
}

export function formatWitParameters(params: readonly WitParameter[]): string {
  return params.map(formatWitParameterSignature).join(", ");
}

export function formatFunctionSignature(fn: WitFunction): string {
  const inputs = formatWitParameters(fn.inputs);
  const outputs = fn.outputs.length
    ? ` -> ${formatWitParameters(fn.outputs)}`
    : "";
  return `${fn.name}: func(${inputs})${outputs};`;
}

function extractBaseName(internalType: string): string | null {
  // result<name, error>
  const resultMatch = internalType.match(
    /^result<\s*([a-zA-Z][a-zA-Z0-9-]*)\s*,\s*error\s*>$/,
  );
  if (resultMatch) return resultMatch[1]!;

  // list<name> or option<name>
  const wrapperMatch = internalType.match(
    /^(?:list|option)<\s*([a-zA-Z][a-zA-Z0-9-]*)\s*>$/,
  );
  if (wrapperMatch) return wrapperMatch[1]!;

  return null;
}

function isUserDefinedType(type: string): boolean {
  return (
    type === "record" ||
    type === "variant" ||
    type === "enum" ||
    type === "flags" ||
    /^(?:list|option)<(?:record|variant|enum|flags)>$/.test(type) ||
    /^result<(?:record|variant|enum|flags), error>$/.test(type)
  );
}

function formatVariantCase(param: WitParameter): string {
  if (param.type === "_") return param.name!;
  const type = param.internalType ?? param.type;
  return `${param.name}(${type})`;
}

function formatTypeDefinition(
  name: string,
  param: WitParameter,
): string | null {
  const baseType =
    param.type === "record" ||
    param.type === "variant" ||
    param.type === "enum" ||
    param.type === "flags"
      ? param.type
      : param.type.match(
            /^(?:list|option)<(record|variant|enum|flags)>$|^result<(record|variant|enum|flags), error>$/,
          )?.[1] ??
        param.type.match(
          /^(?:list|option)<(record|variant|enum|flags)>$|^result<(record|variant|enum|flags), error>$/,
        )?.[2];

  if (!baseType || !param.components) return null;

  switch (baseType) {
    case "record": {
      const fields = param.components
        .map((c) => {
          const t = c.internalType ?? c.type;
          return `${c.name}: ${t}`;
        })
        .join(", ");
      return `record ${name} { ${fields} }`;
    }
    case "variant": {
      const cases = param.components.map(formatVariantCase).join(", ");
      return `variant ${name} { ${cases} }`;
    }
    case "enum": {
      const cases = param.components.map((c) => c.name).join(", ");
      return `enum ${name} { ${cases} }`;
    }
    case "flags": {
      const cases = param.components.map((c) => c.name).join(", ");
      return `flags ${name} { ${cases} }`;
    }
    default:
      return null;
  }
}

function collectFromParam(
  param: WitParameter,
  seen: Set<string>,
  result: string[],
): void {
  if (!isUserDefinedType(param.type) || !param.components) return;

  const name =
    param.internalType && param.internalType !== param.type
      ? extractBaseName(param.internalType) ?? param.internalType
      : param.internalType ?? param.type;

  if (
    name === "record" ||
    name === "variant" ||
    name === "enum" ||
    name === "flags" ||
    name === "_"
  )
    return;

  // Recurse into components first (depth-first) so nested types appear before parents
  for (const component of param.components) {
    collectFromParam(component, seen, result);
  }

  if (seen.has(name)) return;
  seen.add(name);

  const def = formatTypeDefinition(name, param);
  if (def) result.push(def);
}

export function collectTypeDefinitions(
  params: readonly WitParameter[],
  seen: Set<string> = new Set(),
): string[] {
  const result: string[] = [];
  for (const param of params) {
    collectFromParam(param, seen, result);
  }
  return result;
}
