import { expectTypeOf, expect, test } from "vitest";

import { parseWitParameter } from "./parse-wit-parameter.js";

import type { ParseWitParameter } from "./parse-wit-parameter.js";

test("ParseWitParameter - record type", () => {
  expectTypeOf<
    ParseWitParameter<
      ["record aa { a: u64, b: string, c: option<list<u8>> }", "x: aa"]
    >
  >().toEqualTypeOf<{
    readonly name: "x";
    readonly type: "record";
    readonly internalType: "aa";
    readonly components: readonly [
      { readonly name: "a"; readonly type: "u64"; readonly internalType: "u64" },
      { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "c"; readonly type: "option<list<u8>>"; readonly internalType: "option<list<u8>>" },
    ];
  }>();

  expectTypeOf<
    ParseWitParameter<
      ["record aa { a: u64, b: string, c: option<list<u8>> }", "x: result<aa, error>"]
    >
  >().toEqualTypeOf<{
    readonly name: "x";
    readonly type: "result<record, error>";
    readonly internalType: "result<aa, error>";
    readonly components: readonly [
      { readonly name: "a"; readonly type: "u64"; readonly internalType: "u64" },
      { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "c"; readonly type: "option<list<u8>>"; readonly internalType: "option<list<u8>>" },
    ];
  }>();
});

test("ParseWitParameter - enum type", () => {
  expectTypeOf<
    ParseWitParameter<["enum ee { x, y, z }", "a: ee"]>
  >().toEqualTypeOf<{
    readonly name: "a";
    readonly type: "enum";
    readonly internalType: "ee";
    readonly components: readonly [
      { readonly name: "x"; readonly type: "_" },
      { readonly name: "y"; readonly type: "_" },
      { readonly name: "z"; readonly type: "_" },
    ];
  }>();

  expectTypeOf<
    ParseWitParameter<["enum ee { x, y, z }", "a: option<ee>"]>
  >().toEqualTypeOf<{
    readonly name: "a";
    readonly type: "option<enum>";
    readonly internalType: "option<ee>";
    readonly components: readonly [
      { readonly name: "x"; readonly type: "_" },
      { readonly name: "y"; readonly type: "_" },
      { readonly name: "z"; readonly type: "_" },
    ];
  }>();
});

test("parseWitParameter - error on whitespace", () => {
  expect(() => parseWitParameter(" ")).toThrow("Failed to parse Wit parameter.");
});

test.each([
  {
    signature: "a: u64",
    expected: {
      name: "a",
      type: "u64",
      internalType: "u64",
    },
  },
  {
    signature: [
      "record aa { a: u64, b: string, c: option<list<u8>> }",
      "x: aa",
    ],
    expected: {
      name: "x",
      type: "record",
      internalType: "aa",
      components: [
        { name: "a", type: "u64", internalType: "u64" },
        { name: "b", type: "string", internalType: "string" },
        { name: "c", type: "option<list<u8>>", internalType: "option<list<u8>>" },
      ],
    },
  },
  {
    signature: [
      "record aa { a: u32, b: u32 }",
      "x:  result<aa, error>",
    ],
    expected: {
      name: "x",
      type: "result<record, error>",
      internalType: "result<aa, error>",
      components: [
        { name: "a", type: "u32", internalType: "u32" },
        { name: "b", type: "u32", internalType: "u32" },
      ],
    },
  },
  {
    signature: [
      "record aa { a: u8, b: u8, c: u8 }",
      "variant ww { p, q, r(list<string>) }",
      "variant vv { a(string), b(aa), c(ww) }",
      "x:  vv",
    ],
    expected: {
      name: "x",
      type: "variant",
      internalType: "vv",
      components: [
        { name: "a", type: "string", internalType: "string" },
        {
          name: "b",
          type: "record",
          internalType: "aa",
          components: [
            { name: "a", type: "u8", internalType: "u8" },
            { name: "b", type: "u8", internalType: "u8" },
            { name: "c", type: "u8", internalType: "u8" },
          ],
        },
        {
          name: "c",
          internalType: "ww",
          type: "variant",
          components: [
            { internalType: "_", name: "p", type: "_" },
            { internalType: "_", name: "q", type: "_" },
            { internalType: "list<string>", name: "r", type: "list<string>" },
          ],
        },
      ],
    },
  },
  // Enum test cases
  {
    signature: ["enum ee { x, y, z }", "a: ee"],
    expected: {
      name: "a",
      type: "enum",
      internalType: "ee",
      components: [
        { name: "x", type: "_", internalType: "_" },
        { name: "y", type: "_", internalType: "_" },
        { name: "z", type: "_", internalType: "_" },
      ],
    },
  },
  {
    signature: ["enum ee { x, y, z }", "a: option<ee>"],
    expected: {
      name: "a",
      type: "option<enum>",
      internalType: "option<ee>",
      components: [
        { name: "x", type: "_", internalType: "_" },
        { name: "y", type: "_", internalType: "_" },
        { name: "z", type: "_", internalType: "_" },
      ],
    },
  },
  {
    signature: ["enum ee { x, y, z }", "a: list<ee>"],
    expected: {
      name: "a",
      type: "list<enum>",
      internalType: "list<ee>",
      components: [
        { name: "x", type: "_", internalType: "_" },
        { name: "y", type: "_", internalType: "_" },
        { name: "z", type: "_", internalType: "_" },
      ],
    },
  },
  {
    signature: ["enum ee { x, y, z }", "a: result<ee, error>"],
    expected: {
      name: "a",
      type: "result<enum, error>",
      internalType: "result<ee, error>",
      components: [
        { name: "x", type: "_", internalType: "_" },
        { name: "y", type: "_", internalType: "_" },
        { name: "z", type: "_", internalType: "_" },
      ],
    },
  },
  // Mixed enum with record
  {
    signature: [
      "enum ee { x, y, z }",
      "record aa { a: u32, b: u32, c: ee }",
      "r: aa",
    ],
    expected: {
      name: "r",
      type: "record",
      internalType: "aa",
      components: [
        { name: "a", type: "u32", internalType: "u32" },
        { name: "b", type: "u32", internalType: "u32" },
        {
          name: "c",
          type: "enum",
          internalType: "ee",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
      ],
    },
  },
])("parseWitParameter($signature)", ({ signature, expected }) => {
  expect(parseWitParameter<string | string[]>(signature)).toEqual(expected);
});
