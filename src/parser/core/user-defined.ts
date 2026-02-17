import type { WitParameter } from "../../wit.js";
import {
  InvalidRecordSignatureError,
  InvalidSignatureError,
} from "./errors/signature.js";
import {
  execRecordSignature,
  execVariantSignature,
  execEnumSignature,
  execFlagsSignature,
  isRecordSignature,
  isVariantSignature,
  isEnumSignature,
  isFlagsSignature,
} from "./signatures.js";
import { parseWitParameter, splitParameters } from "./utils.js";
import type {
  EnumLookup,
  FlagsLookup,
  RecordLookup,
  VariantLookup,
} from "./types/user-defined.js";

type TypeKind = "record" | "variant" | "enum" | "flags";

type TypeSignatureHandler = {
  kind: TypeKind;
  isSignature: (sig: string) => boolean;
  execSignature: (sig: string) => any;
  parseComponents: (match: any, kind: TypeKind) => WitParameter[] | string[];
  validateComponents: (components: any[], signature: string) => void;
};

function normalizeVariantCaseToken(caseItem: string): string {
  const s = caseItem.trim();
  if (!s) return "";
  // ok(string)  ->  ok: string
  // ok ( string ) -> ok: string
  const m = /^([A-Za-z$_][A-Za-z0-9$_-]*)\s*(?:\(\s*([\s\S]*?)\s*\))?$/.exec(s);
  if (!m) throw new Error(`Invalid variant case: ${caseItem}`);
  const name = m[1]!;
  const payload = m[2];
  // No payload means a unit-like case. Use "_"
  return payload == null || payload.trim() === ""
    ? `${name}: _`
    : `${name}: ${payload.trim()}`;
}

const typeHandlers: TypeSignatureHandler[] = [
  {
    kind: "record",
    isSignature: isRecordSignature,
    execSignature: execRecordSignature,
    parseComponents: (match, kind) => {
      const properties = splitParameters(match.properties);
      const components: WitParameter[] = [];

      for (let k = 0; k < properties.length; k++) {
        const property = properties[k]!;
        const trimmed = property.trim();
        if (!trimmed) continue;

        const witParameter = parseWitParameter(trimmed, { type: kind });
        components.push(witParameter);
      }

      return components;
    },
    validateComponents: (components, signature) => {
      if (!components.length) {
        throw new InvalidRecordSignatureError({ signature });
      }
    },
  },
  {
    kind: "variant",
    isSignature: isVariantSignature,
    execSignature: execVariantSignature,
    parseComponents: (match, kind) => {
      const cases = match.cases.split(",");
      const components: WitParameter[] = [];

      for (let k = 0; k < cases.length; k++) {
        const caseItem = cases[k]!;
        const trimmed = caseItem.trim();
        if (!trimmed) continue;

        const normalized = normalizeVariantCaseToken(trimmed);
        const witParameter = parseWitParameter(normalized, { type: kind });
        components.push(witParameter);
      }

      return components;
    },
    validateComponents: (components, signature) => {
      if (!components.length) {
        throw new InvalidSignatureError({ signature, type: "variant" });
      }
    },
  },
  {
    kind: "enum",
    isSignature: isEnumSignature,
    execSignature: execEnumSignature,
    parseComponents: (match) => {
      const cases = match.cases.split(",");
      const components: string[] = [];

      for (let k = 0; k < cases.length; k++) {
        const caseItem = cases[k]!;
        const trimmed = caseItem.trim();
        if (!trimmed) continue;

        // Validate it's a simple identifier (no payloads)
        if (!/^[A-Za-z$_][A-Za-z0-9$_-]*$/.test(trimmed)) {
          throw new Error(
            `Invalid enum case: ${trimmed}. Enums cannot have payloads.`,
          );
        }

        components.push(trimmed);
      }

      return components;
    },
    validateComponents: (components, signature) => {
      if (!components.length) {
        throw new InvalidSignatureError({ signature, type: "enum" });
      }
    },
  },
  {
    kind: "flags",
    isSignature: isFlagsSignature,
    execSignature: execFlagsSignature,
    parseComponents: (match) => {
      const cases = match.cases.split(",");
      const components: string[] = [];

      for (let k = 0; k < cases.length; k++) {
        const caseItem = cases[k]!;
        const trimmed = caseItem.trim();
        if (!trimmed) continue;

        if (!/^[A-Za-z$_][A-Za-z0-9$_-]*$/.test(trimmed)) {
          throw new Error(
            `Invalid flags case: ${trimmed}. Flags cannot have payloads.`,
          );
        }

        components.push(trimmed);
      }

      return components;
    },
    validateComponents: (components, signature) => {
      if (!components.length) {
        throw new InvalidSignatureError({ signature, type: "flags" });
      }
    },
  },
];

export function parseTypes(signatures: readonly string[]) {
  const shallowRecords: RecordLookup = {};
  const shallowVariants: VariantLookup = {};
  const shallowEnums: EnumLookup = {};
  const shallowFlags: FlagsLookup = {};
  const signaturesLength = signatures.length;

  // First pass: parse all signatures into shallow structures
  for (let i = 0; i < signaturesLength; i++) {
    const signature = signatures[i]!;

    for (const handler of typeHandlers) {
      if (!handler.isSignature(signature)) continue;

      const match = handler.execSignature(signature);
      if (!match) {
        throw new InvalidSignatureError({ signature, type: handler.kind });
      }

      const components = handler.parseComponents(match, handler.kind);
      handler.validateComponents(components, signature);

      // Store in appropriate lookup
      switch (handler.kind) {
        case "record":
          shallowRecords[match.name] = components as WitParameter[];
          break;
        case "variant":
          shallowVariants[match.name] = components as WitParameter[];
          break;
        case "enum":
          shallowEnums[match.name] = components as string[];
          break;
        case "flags":
          shallowFlags[match.name] = components as string[];
          break;
      }

      break; // Found matching handler, no need to check others
    }
  }

  // Check for namespace collisions
  assertNoCollisions(shallowRecords, shallowVariants, shallowEnums, shallowFlags);

  // Second pass: resolve all references
  const resolvedRecords: RecordLookup = {};
  const recordEntries = Object.entries(shallowRecords);
  for (let i = 0; i < recordEntries.length; i++) {
    const [name, parameters] = recordEntries[i]!;
    resolvedRecords[name] = resolveTypes(
      parameters,
      shallowRecords,
      shallowVariants,
      shallowEnums,
      shallowFlags,
      new Set<string>(),
    );
  }

  const resolvedVariants: VariantLookup = {};
  const variantEntries = Object.entries(shallowVariants);
  for (let i = 0; i < variantEntries.length; i++) {
    const [name, parameters] = variantEntries[i]!;
    resolvedVariants[name] = resolveTypes(
      parameters,
      shallowRecords,
      shallowVariants,
      shallowEnums,
      shallowFlags,
      new Set<string>(),
    );
  }

  // Enums and flags don't need resolution as they have no type references
  const resolvedEnums: EnumLookup = { ...shallowEnums };
  const resolvedFlags: FlagsLookup = { ...shallowFlags };

  return {
    records: resolvedRecords,
    variants: resolvedVariants,
    enums: resolvedEnums,
    flags: resolvedFlags,
  };
}

type WitWrapper = "borrow" | "list" | "option" | "result";

type ExecWitType =
  | { wrapper?: Exclude<WitWrapper, "result">; base: string }
  | { wrapper: "result"; base: string }
  | null;

function isAngleBalanced(s: string): boolean {
  let depth = 0;
  for (const ch of s) {
    if (ch === "<") depth++;
    else if (ch === ">") {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

export const witResultRegex =
  /^result\s*<\s*(?<ok>[\s\S]+?)\s*,\s*(?<err>error)\s*>$/;

export const witTypeRegex =
  /^(?:(?<wrapper>borrow|list|option)\s*<\s*(?<wrapped>[\s\S]+?)\s*>|(?<base>[a-zA-Z$_][a-zA-Z0-9$_-]*))$/;

export function execWitType(type: string): ExecWitType {
  const t = type.trim();
  if (!t) return null;

  const rm = t.match(witResultRegex);
  if (rm?.groups?.ok) {
    const ok = rm.groups.ok.trim();
    if (!isAngleBalanced(ok)) return null;
    return { wrapper: "result", base: ok };
  }

  const m = t.match(witTypeRegex);
  if (!m?.groups) return null;

  const wrapper = m.groups.wrapper as "borrow" | "list" | "option" | undefined;
  const base = (m.groups.wrapped ?? m.groups.base)?.trim();
  if (!base) return null;

  if (wrapper) {
    if (!isAngleBalanced(base)) return null;
    return { wrapper, base };
  }

  return { base };
}

function assertNoCollisions(
  records: RecordLookup,
  variants: VariantLookup,
  enums: EnumLookup,
  flags: FlagsLookup,
) {
  const allTypes = [
    ...Object.keys(records).map((k) => ({ name: k, kind: "record" })),
    ...Object.keys(variants).map((k) => ({ name: k, kind: "variant" })),
    ...Object.keys(enums).map((k) => ({ name: k, kind: "enum" })),
    ...Object.keys(flags).map((k) => ({ name: k, kind: "flags" })),
  ];

  const seen = new Map<string, string>();

  for (const { name, kind } of allTypes) {
    const existing = seen.get(name);
    if (existing) {
      throw new Error(
        `Namespace collision: "${name}" is both ${existing} and ${kind}.`,
      );
    }
    seen.set(name, kind);
  }
}

function resolveTypes(
  witParameters: readonly (WitParameter & { indexed?: true })[],
  records: RecordLookup,
  variants: VariantLookup,
  enums: EnumLookup,
  flags: FlagsLookup,
  ancestors = new Set<string>(),
) {
  const components: WitParameter[] = [];

  for (const witParameter of witParameters) {
    const m = execWitType(witParameter.type);
    if (!m?.base) throw new Error(`Invalid WIT type: ${witParameter.type}`);

    const base = m.base.trim();

    // Check if it's a named record
    if (base in records) {
      if (ancestors.has(base)) {
        throw new Error(`Circular reference detected at "${base}".`);
      }

      components.push({
        ...witParameter,
        type: m.wrapper
          ? m.wrapper === "result"
            ? `result<record, error>`
            : `${m.wrapper}<record>`
          : "record",
        components: resolveTypes(
          records[base] ?? [],
          records,
          variants,
          enums,
          flags,
          new Set([...ancestors, base]),
        ),
      });
      continue;
    }

    // Check if it's a named variant
    if (base in variants) {
      if (ancestors.has(base)) {
        throw new Error(`Circular reference detected at "${base}".`);
      }

      components.push({
        ...witParameter,
        type: m.wrapper
          ? m.wrapper === "result"
            ? `result<variant, error>`
            : `${m.wrapper}<variant>`
          : "variant",
        internalType: m.wrapper
          ? m.wrapper === "result"
            ? `result<${base}, error>`
            : `${m.wrapper}<${base}>`
          : base,
        components: resolveTypes(
          variants[base] ?? [],
          records,
          variants,
          enums,
          flags,
          new Set([...ancestors, base]),
        ),
      });
      continue;
    }

    // Check if it's a named enum
    if (base in enums) {
      if (ancestors.has(base)) {
        throw new Error(`Circular reference detected at "${base}".`);
      }

      // Convert enum values to WitParameters for consistency
      const enumCases = enums[base]!.map((caseName) => ({
        name: caseName,
        type: "_", // Unit type
      }));

      components.push({
        ...witParameter,
        type: m.wrapper
          ? m.wrapper === "result"
            ? `result<enum, error>`
            : `${m.wrapper}<enum>`
          : "enum",
        internalType: m.wrapper
          ? m.wrapper === "result"
            ? `result<${base}, error>`
            : `${m.wrapper}<${base}>`
          : base,
        components: enumCases as WitParameter[],
      });
      continue;
    }

    // Check if it's a named flags
    if (base in flags) {
      if (ancestors.has(base)) {
        throw new Error(`Circular reference detected at "${base}".`);
      }

      const flagsCases = flags[base]!.map((caseName) => ({
        name: caseName,
        type: "_",
      }));

      components.push({
        ...witParameter,
        type: m.wrapper
          ? m.wrapper === "result"
            ? `result<flags, error>`
            : `${m.wrapper}<flags>`
          : "flags",
        internalType: m.wrapper
          ? m.wrapper === "result"
            ? `result<${base}, error>`
            : `${m.wrapper}<${base}>`
          : base,
        components: flagsCases as WitParameter[],
      });
      continue;
    }

    // Otherwise, pass through (builtins, generics, etc.)
    components.push(witParameter);
  }

  return components;
}
