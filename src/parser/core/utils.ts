import type { WitItemType, WitParameter } from "../../wit.js";
import { execTyped, isGenericRegex } from "../../regex.js";
import {
  InvalidWitParameterError,
  WitProtectedKeywordError,
} from "./errors/wit-parameter.js";
import {
  InvalidSignatureError,
  UnknownSignatureError,
} from "./errors/signature.js";
import { InvalidGenericDepthError } from "./errors/split-parameters.js";
import { execFunctionSignature, isFunctionSignature } from "./signatures.js";
import type {
  EnumLookup,
  EnumToComponents,
  FlagsLookup,
  RecordLookup,
  VariantLookup,
} from "./types/user-defined.js";

export type ParseOptions = {
  records?: RecordLookup;
  variants?: VariantLookup;
  enums?: EnumLookup;
  flags?: FlagsLookup;
  type?: WitItemType | "record" | "variant" | "enum" | "flags";
  ancestors?: Set<string>;
  cache?: Map<string, WitParameter>;
};

/**
 * Pre-seeded cache for common WIT primitive types.
 * Skips regex + type resolution entirely for the most frequent scalars.
 *
 * Modeled after abitype's parameterCache approach.
 * @see .references/abitype/packages/abitype/src/human-readable/runtime/cache.ts
 */
const primitiveParam = (type: string): WitParameter => ({
  type,
  internalType: type,
});

export const witParameterSeed: ReadonlyMap<string, WitParameter> = new Map([
  // Boolean
  ["bool", primitiveParam("bool")],
  // Unsigned integers
  ["u8", primitiveParam("u8")],
  ["u16", primitiveParam("u16")],
  ["u32", primitiveParam("u32")],
  ["u64", primitiveParam("u64")],
  // Signed integers
  ["s8", primitiveParam("s8")],
  ["s16", primitiveParam("s16")],
  ["s32", primitiveParam("s32")],
  ["s64", primitiveParam("s64")],
  // Floats
  ["f32", primitiveParam("f32")],
  ["f64", primitiveParam("f64")],
  // String / char
  ["string", primitiveParam("string")],
  ["char", primitiveParam("char")],
]);

export const witParameterRegex =
  /^(?:(?<name>[a-z][a-z0-9-]*)\s*:\s*)?(?<type>_|(?:borrow|list|option|result)\s*<[\s\S]+>|[a-z][a-z0-9-]*|(?:record|variant|flags|enum)\s*\{[\s\S]*\})$/;

export function isGeneric(type: string): boolean {
  return isGenericRegex.test(type.trim());
}

export function execGeneric<T extends { outer: string; inner: string }>(
  type: string,
) {
  const m = type.trim().match(isGenericRegex);
  if (!m || !m.groups) return null;
  return m.groups as unknown as T;
}

export function parseWitParameter(param: string, options?: ParseOptions) {
  // Fast path: check pre-seeded primitives before any regex work.
  // Mirrors abitype's parameterCache pattern — the cache check is the very
  // first thing, so common scalars like "u64" or "string" skip parsing entirely.
  const seeded = witParameterSeed.get(param);
  if (seeded) return seeded;

  const match = execTyped<{
    array?: string;
    name?: string;
    type: string;
  }>(witParameterRegex, param);

  if (!match) throw new InvalidWitParameterError({ param });

  const isGenericType = isGeneric(match.type);

  if (match.name && isWitKeyword(match.name))
    throw new WitProtectedKeywordError({ param, name: match.name });

  const cache = options?.cache;
  const cached = cache?.get(match.type);
  if (cached) {
    return {
      ...cached,
      ...(match.name ? { name: match.name } : {}),
    } as WitParameter;
  }

  const name = match.name ? { name: match.name } : {};
  const records = options?.records ?? {};
  const variants = options?.variants ?? {};
  const enums = options?.enums ?? {};
  const flags = options?.flags ?? {};
  const ancestors = options?.ancestors ?? new Set<string>();

  let type: string;
  let components = {};
  if (isGenericType) {
    const g = execGeneric<{ outer: string; inner: string }>(match.type)!;
    const parts = splitParameters(g.inner);

    const parsed = parts.map((p) =>
      parseWitParameter(p, { records, variants, enums, flags, ancestors, ...(cache && { cache }) }),
    );

    // normalize inner types for the outer type string
    const innerTypeSig = parsed.map((x) => x.type).join(", ");

    switch (g.outer) {
      case "list":
      case "option": {
        if (parsed.length !== 1) {
          throw new InvalidWitParameterError({
            param,
          });
        }
        const t = parsed[0]!;
        type = `${g.outer}<${t.type}>`;

        // flatten record fields for list/option only
        components = t.components ? { components: t.components } : {};
        break;
      }

      case "result": {
        if (parsed.length !== 2) {
          throw new InvalidWitParameterError({
            param,
          });
        }
        const left = parsed[0]!;

        type = `result<${innerTypeSig}>`;

        components = {
          ...(left.components && { components: left.components }),
        };
        break;
      }

      default: {
        type = `${g.outer}<${innerTypeSig}>`;
        components = {};
      }
    }
  } else if (match.type in records) {
    // scalar that maps to a record in `records`
    type = "record";
    components = { components: records[match.type] };
  } else if (match.type in variants) {
    // scalar that maps to a variant in `variants`
    type = "variant";
    components = { components: variants[match.type] };
  } else if (match.type in enums) {
    // scalar that maps to an enum in `enums`
    type = "enum";
    components = { components: enumToComponents(enums[match.type]!) };
  } else if (match.type in flags) {
    // scalar that maps to a flags in `flags`
    type = "flags";
    components = { components: enumToComponents(flags[match.type]!) };
  } else {
    type = match.type;
  }

  const witParameter: WitParameter = {
    type: `${type}${match.array ?? ""}`,
    internalType: match.type,
    ...(name as { name: string }),
    ...components,
  };

  // store in cache keyed on the type string (without name)
  if (cache) {
    const { name: _, ...withoutName } = witParameter as WitParameter & { name?: string };
    cache.set(match.type, withoutName as WitParameter);
  }

  return witParameter;
}
export const witKeywordRegex =
  /^(?:package|world|interface|include|use|import|export|func|borrow|record|list|enum|flags|variant|option|result|tuple|bool|s8|s16|s32|s64|u8|u16|u32|u64|f32|f64|char|string)$/;

export function isWitKeyword(word: string): boolean {
  return witKeywordRegex.test(word);
}

export function splitParameters(
  params: string,
  result: string[] = [],
): readonly string[] {
  const s = params.trim();
  if (s.length === 0) return result;

  let current = "";
  let depth = 0; // nesting depth for <...>

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;

    if (ch === "<") {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ">") {
      depth -= 1;
      if (depth < 0)
        throw new InvalidGenericDepthError({
          current: s.slice(0, i + 1),
          depth,
        });
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      const tok = current.trim();
      if (tok.length) result.push(tok);
      current = "";
      continue;
    }

    current += ch;
  }

  if (depth !== 0) throw new InvalidGenericDepthError({ current, depth });
  const tail = current.trim();
  if (tail.length) result.push(tail);
  return result;
}

export function parseSignature(
  signature: string,
  records: RecordLookup = {},
  variants: VariantLookup = {},
  enums: EnumLookup = {},
  flags: FlagsLookup = {},
  cache?: Map<string, WitParameter>,
) {
  if (isFunctionSignature(signature))
    return parseFunctionSignature(signature, records, variants, enums, flags, cache);

  throw new UnknownSignatureError({ signature });
}

export function parseFunctionSignature(
  signature: string,
  records: RecordLookup = {},
  variants: VariantLookup = {},
  enums: EnumLookup = {},
  flags: FlagsLookup = {},
  cache?: Map<string, WitParameter>,
) {
  const match = execFunctionSignature(signature);
  if (!match) throw new InvalidSignatureError({ signature, type: "func" });

  const inputs = [];
  if (match.parameters) {
    const inputParams = splitParameters(match.parameters);
    const inputLength = inputParams.length;
    for (let i = 0; i < inputLength; i++) {
      inputs.push(
        parseWitParameter(inputParams[i]!, {
          records,
          variants,
          enums,
          flags,
          ...(cache && { cache }),
        }),
      );
    }
  }

  const outputs = [];
  if (match.returns) {
    const outputParams = splitParameters(match.returns);
    const outputLength = outputParams.length;
    for (let i = 0; i < outputLength; i++) {
      outputs.push(
        parseWitParameter(outputParams[i]!, {
          records,
          variants,
          enums,
          flags,
          ...(cache && { cache }),
        }),
      );
    }
  }

  return {
    name: match.name,
    type: "function",
    inputs,
    outputs,
  };
}

export function enumToComponents<cases extends readonly string[]>(
  cases: cases,
): EnumToComponents<cases> {
  return cases.map((caseName) => ({
    name: caseName,
    type: "_" as const,
    internalType: "_" as const,
  })) as EnumToComponents<cases>;
}
