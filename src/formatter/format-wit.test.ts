import { describe, expect, test } from "vitest";

import { formatWit } from "./format-wit.js";
import { formatWitFunction } from "./format-wit-function.js";
import { formatWitParameter } from "./format-wit-parameter.js";
import { parseWit } from "../parser/parse-wit.js";

describe("formatWitParameter", () => {
  test("primitive with name", () => {
    expect(
      formatWitParameter({ name: "a", type: "u64", internalType: "u64" }),
    ).toBe("a: u64");
  });

  test("primitive without name (output)", () => {
    expect(formatWitParameter({ type: "u64", internalType: "u64" })).toBe(
      "u64",
    );
  });

  test("record uses internalType", () => {
    expect(
      formatWitParameter({
        name: "a",
        type: "record",
        internalType: "aa",
        components: [
          { name: "a", type: "u32", internalType: "u32" },
          { name: "b", type: "u32", internalType: "u32" },
        ],
      }),
    ).toBe("a: aa");
  });

  test("wrapped record uses internalType", () => {
    expect(
      formatWitParameter({
        type: "result<record, error>",
        internalType: "result<aa, error>",
        components: [
          { name: "a", type: "u32", internalType: "u32" },
          { name: "b", type: "u32", internalType: "u32" },
        ],
      }),
    ).toBe("result<aa, error>");
  });

  test("option type", () => {
    expect(
      formatWitParameter({
        name: "a",
        type: "option<string>",
        internalType: "option<string>",
      }),
    ).toBe("a: option<string>");
  });
});

describe("formatWitFunction", () => {
  test("with inputs and outputs", () => {
    expect(
      formatWitFunction({
        name: "f",
        type: "function",
        inputs: [
          { name: "a", type: "string", internalType: "string" },
          { name: "b", type: "u64", internalType: "u64" },
        ],
        outputs: [{ type: "u64", internalType: "u64" }],
      }),
    ).toBe("f: func(a: string, b: u64) -> u64;");
  });

  test("no return", () => {
    expect(
      formatWitFunction({
        name: "f",
        type: "function",
        inputs: [{ name: "a", type: "u64", internalType: "u64" }],
        outputs: [],
      }),
    ).toBe("f: func(a: u64);");
  });

  test("no inputs", () => {
    expect(
      formatWitFunction({
        name: "f",
        type: "function",
        inputs: [],
        outputs: [{ type: "string", internalType: "string" }],
      }),
    ).toBe("f: func() -> string;");
  });

  test("no inputs no outputs", () => {
    expect(
      formatWitFunction({
        name: "f",
        type: "function",
        inputs: [],
        outputs: [],
      }),
    ).toBe("f: func();");
  });
});

describe("formatWit", () => {
  test("emits type definitions before function signatures", () => {
    const parsed = parseWit([
      "record aa { a: u32, b: u32 }",
      "f: func(a: aa) -> u64;",
    ]);

    expect(formatWit(parsed)).toEqual([
      "record aa { a: u32, b: u32 }",
      "f: func(a: aa) -> u64;",
    ]);
  });

  test("deduplicates type definitions", () => {
    const parsed = parseWit([
      "record aa { a: u32, b: u32 }",
      "f: func(a: aa) -> result<aa, error>;",
      "g: func(b: aa) -> u64;",
    ]);

    const result = formatWit(parsed);
    const recordDefs = result.filter((s) => s.startsWith("record"));
    expect(recordDefs).toHaveLength(1);
    expect(recordDefs[0]).toBe("record aa { a: u32, b: u32 }");
  });

  test("nested types appear before parents", () => {
    const parsed = parseWit([
      "record aa { a: u32, b: u32 }",
      "record bb { p: aa, q: u64 }",
      "f: func(x: bb) -> u64;",
    ]);

    const result = formatWit(parsed);
    const aaIdx = result.indexOf("record aa { a: u32, b: u32 }");
    const bbIdx = result.indexOf("record bb { p: aa, q: u64 }");
    expect(aaIdx).toBeLessThan(bbIdx);
  });

  test("variant type definitions", () => {
    const parsed = parseWit([
      "variant vv { a(u32), b(string), c }",
      "f: func(x: vv) -> u64;",
    ]);

    expect(formatWit(parsed)).toEqual([
      "variant vv { a(u32), b(string), c }",
      "f: func(x: vv) -> u64;",
    ]);
  });

  test("enum type definitions", () => {
    const parsed = parseWit([
      "enum ee { x, y, z }",
      "f: func(a: ee) -> u64;",
    ]);

    expect(formatWit(parsed)).toEqual([
      "enum ee { x, y, z }",
      "f: func(a: ee) -> u64;",
    ]);
  });

  test("round-trip: formatWit(parseWit(sigs)) reparsed equals original", () => {
    const sigs = [
      "enum ee { x, y, z }",
      "record aa { a: u32, b: u32 }",
      "record bb { a: u32, b: u32 }",
      "variant vv { a(u32), b(aa), c }",
      "f: func(a: aa, b: bb) -> result<aa, error>;",
      "g: func() -> list<vv>;",
      "h: func(a: string, b: string) -> option<u64>;",
      "j: func(a: u64, b: u64) -> u64;",
      "k: func(a: string);",
    ] as const;

    const parsed = parseWit(sigs);
    const formatted = formatWit(parsed);
    const reparsed = parseWit(formatted);

    expect(reparsed).toEqual(parsed);
  });

  test("multiple functions with mixed types", () => {
    const parsed = parseWit([
      "record aa { a: u32, b: string }",
      "enum ee { x, y }",
      "f: func(a: aa, b: ee) -> u64;",
      "g: func() -> option<aa>;",
    ]);

    const result = formatWit(parsed);
    expect(result).toContain("record aa { a: u32, b: string }");
    expect(result).toContain("enum ee { x, y }");
    expect(result).toContain("f: func(a: aa, b: ee) -> u64;");
    expect(result).toContain("g: func() -> option<aa>;");
  });
});
