import { expectTypeOf, describe, expect, test } from "vitest";

import type { ParseWit } from "./parse-wit.js";
import { parseWit } from "./parse-wit.js";

const wit = [
  // Enums
  "enum ee { x, y, z }",

  // Records
  "record aa { a: u32, b: u32 }",
  "record bb { a: u32, b: u32 }",
  "record cc { a: u64, b: string, c: option<list<u8>> }",
  "record dd { p: aa, q: bb }",

  // Variants
  "variant vv { a(u32), b(dd), c(aa) }",
  "variant ww { p, q, r(list<string>) }",

  // Functions
  "f: func(a: aa, b: aa) -> result<aa, error>;",
  "g: func() -> list<vv>;",
  "h: func(a: string, b: string) -> option<cc>;",
  "j: func(a: u64, b: u64) -> u64;",
  "k: func(a: string);",
  "m: func(a: ww) -> result<string, error>;",
] as const;

type W = ParseWit<typeof wit>;

describe("parseWit (runtime)", () => {
  test("parses functions with records, variants, and primitives", () => {
    const out = parseWit([
      "record aa { a: u32, b: u32 }",
      "record bb { a: u32, b: u32 }",
      "f: func(a: aa, b: aa) -> result<aa, error>;",
      "g: func(a: bb) -> u64;",
      "h: func(a: string) -> option<string>;",
      "j: func();",
    ]);

    expect(out).toEqual([
      {
        name: "f",
        type: "function",
        inputs: [
          {
            name: "a",
            type: "record",
            internalType: "aa",
            components: [
              { name: "a", type: "u32", internalType: "u32" },
              { name: "b", type: "u32", internalType: "u32" },
            ],
          },
          {
            name: "b",
            type: "record",
            internalType: "aa",
            components: [
              { name: "a", type: "u32", internalType: "u32" },
              { name: "b", type: "u32", internalType: "u32" },
            ],
          },
        ],
        outputs: [
          {
            type: "result<record, error>",
            internalType: "result<aa, error>",
            components: [
              { name: "a", type: "u32", internalType: "u32" },
              { name: "b", type: "u32", internalType: "u32" },
            ],
          },
        ],
      },
      {
        name: "g",
        type: "function",
        inputs: [
          {
            name: "a",
            type: "record",
            internalType: "bb",
            components: [
              { name: "a", type: "u32", internalType: "u32" },
              { name: "b", type: "u32", internalType: "u32" },
            ],
          },
        ],
        outputs: [
          { type: "u64", internalType: "u64" },
        ],
      },
      {
        name: "h",
        type: "function",
        inputs: [
          { name: "a", type: "string", internalType: "string" },
        ],
        outputs: [
          { type: "option<string>", internalType: "option<string>" },
        ],
      },
      {
        name: "j",
        type: "function",
        inputs: [],
        outputs: [],
      },
    ]);
  });
});

test("ParseWit - function with record params and result return", () => {
  expectTypeOf<W[0]>().toEqualTypeOf<{
    readonly name: "f";
    readonly type: "function";
    readonly inputs: readonly [
      {
        readonly name: "a";
        readonly type: "record";
        readonly internalType: "aa";
        readonly components: readonly [
          { readonly name: "a"; readonly type: "u32"; readonly internalType: "u32" },
          { readonly name: "b"; readonly type: "u32"; readonly internalType: "u32" },
        ];
      },
      {
        readonly name: "b";
        readonly type: "record";
        readonly internalType: "aa";
        readonly components: readonly [
          { readonly name: "a"; readonly type: "u32"; readonly internalType: "u32" },
          { readonly name: "b"; readonly type: "u32"; readonly internalType: "u32" },
        ];
      },
    ];
    readonly outputs: readonly [
      {
        readonly type: "result<record, error>";
        readonly internalType: "result<aa, error>";
        readonly components: readonly [
          { readonly name: "a"; readonly type: "u32"; readonly internalType: "u32" },
          { readonly name: "b"; readonly type: "u32"; readonly internalType: "u32" },
        ];
      },
    ];
  }>();
});

test("ParseWit - function returning option of record", () => {
  expectTypeOf<W[2]>().toEqualTypeOf<{
    readonly name: "h";
    readonly type: "function";
    readonly inputs: readonly [
      { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
    ];
    readonly outputs: readonly [
      {
        readonly type: "option<record>";
        readonly internalType: "option<cc>";
        readonly components: readonly [
          { readonly name: "a"; readonly type: "u64"; readonly internalType: "u64" },
          { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
          { readonly name: "c"; readonly type: "option<list<u8>>"; readonly internalType: "option<list<u8>>" },
        ];
      },
    ];
  }>();
});

test("ParseWit - function with primitive params and return", () => {
  type F = W[3];

  expectTypeOf<F["name"]>().toEqualTypeOf<"j">();
  expectTypeOf<F["type"]>().toEqualTypeOf<"function">();
  expectTypeOf<F["inputs"]["length"]>().toEqualTypeOf<2>();
  expectTypeOf<F["inputs"][0]["name"]>().toEqualTypeOf<"a">();
  expectTypeOf<F["inputs"][0]["type"]>().toEqualTypeOf<"u64">();
  expectTypeOf<F["outputs"]["length"]>().toEqualTypeOf<1>();
  expectTypeOf<F["outputs"][0]["type"]>().toEqualTypeOf<"u64">();
});

test("ParseWit - function with no return", () => {
  type F = W[4];

  expectTypeOf<F["name"]>().toEqualTypeOf<"k">();
  expectTypeOf<F["type"]>().toEqualTypeOf<"function">();
  expectTypeOf<F["inputs"]["length"]>().toEqualTypeOf<1>();
  expectTypeOf<F["inputs"][0]["name"]>().toEqualTypeOf<"a">();
  expectTypeOf<F["inputs"][0]["type"]>().toEqualTypeOf<"string">();
  expectTypeOf<F["outputs"]>().toEqualTypeOf<readonly []>();
});

test("ParseWit - function returning list of variant", () => {
  type F = W[1];

  expectTypeOf<F["name"]>().toEqualTypeOf<"g">();
  expectTypeOf<F["type"]>().toEqualTypeOf<"function">();
  expectTypeOf<F["inputs"]>().toEqualTypeOf<readonly []>();

  type Out = F["outputs"][0];
  expectTypeOf<Out["type"]>().toEqualTypeOf<"list<variant>">();
  expectTypeOf<Out["internalType"]>().toEqualTypeOf<"list<vv>">();
  expectTypeOf<Out["components"]["length"]>().toEqualTypeOf<3>();
});

test("ParseWit - function with variant input", () => {
  type F = W[5];

  expectTypeOf<F["name"]>().toEqualTypeOf<"m">();
  expectTypeOf<F["type"]>().toEqualTypeOf<"function">();
  expectTypeOf<F["inputs"]["length"]>().toEqualTypeOf<1>();
  expectTypeOf<F["inputs"][0]["name"]>().toEqualTypeOf<"a">();
  expectTypeOf<F["inputs"][0]["type"]>().toEqualTypeOf<"variant">();
  expectTypeOf<F["inputs"][0]["internalType"]>().toEqualTypeOf<"ww">();
  expectTypeOf<F["inputs"][0]["components"]["length"]>().toEqualTypeOf<3>();
  expectTypeOf<F["outputs"]["length"]>().toEqualTypeOf<1>();
  expectTypeOf<F["outputs"][0]["type"]>().toEqualTypeOf<"result<string, error>">();
});

describe("parseWit - flags", () => {
  test("parses function with flags parameter", () => {
    const out = parseWit([
      "flags permissions { read, write, exec }",
      "check-perms: func(p: permissions) -> bool;",
    ]);

    expect(out).toEqual([
      {
        name: "check-perms",
        type: "function",
        inputs: [
          {
            name: "p",
            type: "flags",
            internalType: "permissions",
            components: [
              { name: "read", type: "_", internalType: "_" },
              { name: "write", type: "_", internalType: "_" },
              { name: "exec", type: "_", internalType: "_" },
            ],
          },
        ],
        outputs: [
          { type: "bool", internalType: "bool" },
        ],
      },
    ]);
  });
});
