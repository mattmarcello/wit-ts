import { expectTypeOf, test } from "vitest";
import type {
  ParseTypes,
  ParseRecords,
  ParseVariants,
  ParseEnums,
} from "./user-defined.js";

// ============================================================================
// Enum Tests
// ============================================================================

test("ParseEnums - basic enum", () => {
  expectTypeOf<
    ParseEnums<["enum ee { x, y, z }"]>
  >().toEqualTypeOf<{
    ee: readonly ["x", "y", "z"];
  }>();
});

test("ParseEnums - multiple enums", () => {
  expectTypeOf<
    ParseEnums<["enum ee { x, y, z }", "enum ff { p, q, r }"]>
  >().toEqualTypeOf<{
    ee: readonly ["x", "y", "z"];
    ff: readonly ["p", "q", "r"];
  }>();
});

// ============================================================================
// Basic Record Tests
// ============================================================================

test("ParseRecords - basic records", () => {
  expectTypeOf<
    ParseRecords<
      ["record aa { a: u32, b: u32 }", "record bb { p: aa, q: aa }"]
    >
  >().toEqualTypeOf<{
    aa: readonly [
      { readonly name: "a"; readonly type: "u32"; readonly internalType: "u32" },
      { readonly name: "b"; readonly type: "u32"; readonly internalType: "u32" },
    ];
    bb: readonly [
      { readonly name: "p"; readonly type: "aa"; readonly internalType: "aa" },
      { readonly name: "q"; readonly type: "aa"; readonly internalType: "aa" },
    ];
  }>();
});

test("ParseRecords - with generics", () => {
  expectTypeOf<
    ParseRecords<
      [
        "record aa { a: u32, b: u32 }",
        "record bb { p: list<aa>, q: option<aa>, r: result<aa, error> }",
      ]
    >
  >().toEqualTypeOf<{
    aa: readonly [
      { readonly name: "a"; readonly type: "u32"; readonly internalType: "u32" },
      { readonly name: "b"; readonly type: "u32"; readonly internalType: "u32" },
    ];
    bb: readonly [
      { readonly name: "p"; readonly type: "list<aa>"; readonly internalType: "list<aa>" },
      { readonly name: "q"; readonly type: "option<aa>"; readonly internalType: "option<aa>" },
      { readonly name: "r"; readonly type: "result<aa, error>"; readonly internalType: "result<aa, error>" },
    ];
  }>();
});

// ============================================================================
// Basic Variant Tests
// ============================================================================

test("ParseVariants - basic variants", () => {
  expectTypeOf<
    ParseVariants<
      [
        "variant vv { a(string), b(string) }",
        "variant ww { p(vv), q(string) }",
      ]
    >
  >().toEqualTypeOf<{
    vv: readonly [
      { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
    ];
    ww: readonly [
      { readonly name: "p"; readonly type: "vv"; readonly internalType: "vv" },
      { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
    ];
  }>();
});

test("ParseVariants - with unit cases", () => {
  expectTypeOf<
    ParseVariants<
      [
        "variant vv { a, b, c, d, e, f, g }",
        "variant ww { p(string), q(vv) }",
      ]
    >
  >().toEqualTypeOf<{
    vv: readonly [
      { readonly name: "a"; readonly type: "_"; readonly internalType: "_" },
      { readonly name: "b"; readonly type: "_"; readonly internalType: "_" },
      { readonly name: "c"; readonly type: "_"; readonly internalType: "_" },
      { readonly name: "d"; readonly type: "_"; readonly internalType: "_" },
      { readonly name: "e"; readonly type: "_"; readonly internalType: "_" },
      { readonly name: "f"; readonly type: "_"; readonly internalType: "_" },
      { readonly name: "g"; readonly type: "_"; readonly internalType: "_" },
    ];
    ww: readonly [
      { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "q"; readonly type: "vv"; readonly internalType: "vv" },
    ];
  }>();
});

test("ParseVariants - with generics", () => {
  expectTypeOf<
    ParseVariants<
      [
        "variant vv { a(string), b(string) }",
        "variant ww { p(option<string>), q(list<string>), r(vv) }",
      ]
    >
  >().toEqualTypeOf<{
    vv: readonly [
      { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
    ];
    ww: readonly [
      { readonly name: "p"; readonly type: "option<string>"; readonly internalType: "option<string>" },
      { readonly name: "q"; readonly type: "list<string>"; readonly internalType: "list<string>" },
      { readonly name: "r"; readonly type: "vv"; readonly internalType: "vv" },
    ];
  }>();
});

// ============================================================================
// Cross-Type Reference Tests
// ============================================================================

test("ParseTypes - record referencing variant", () => {
  expectTypeOf<
    ParseTypes<
      [
        "variant vv { a(string), b(string) }",
        "record aa { p: vv, q: list<vv> }",
      ]
    >
  >().toEqualTypeOf<{
    records: {
      aa: readonly [
        {
          readonly name: "p";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
            { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
          ];
        },
        {
          readonly name: "q";
          readonly type: "list<variant>";
          readonly internalType: "list<vv>";
          readonly components: readonly [
            { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
            { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
          ];
        },
      ];
    };
    variants: {
      vv: readonly [
        { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
        { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
      ];
    };
    enums: {};
  }>();
});

test("ParseTypes - record referencing enum", () => {
  expectTypeOf<
    ParseTypes<
      ["enum ee { x, y, z }", "record aa { a: ee, b: ee }"]
    >
  >().toEqualTypeOf<{
    variants: {};
    records: {
      aa: readonly [
        {
          readonly name: "a";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
        {
          readonly name: "b";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
      ];
    };
    enums: { ee: readonly ["x", "y", "z"] };
  }>();
});

test("ParseTypes - variant referencing enum", () => {
  expectTypeOf<
    ParseTypes<
      ["enum ee { x, y, z }", "variant vv { a(ee), b(string) }"]
    >
  >().toEqualTypeOf<{
    records: {};
    variants: {
      vv: readonly [
        {
          readonly name: "a";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
        { readonly name: "b"; readonly type: "string"; readonly internalType: "string" },
      ];
    };
    enums: { ee: readonly ["x", "y", "z"] };
  }>();
});

test("ParseTypes - variant with nested record", () => {
  expectTypeOf<
    ParseTypes<
      [
        "record aa { a: u8, b: u8, c: u8 }",
        "variant vv { p(string), q(string), r(aa) }",
        "record bb { x: vv, y: vv }",
      ]
    >
  >().toEqualTypeOf<{
    enums: {};
    records: {
      aa: readonly [
        { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
        { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
        { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
      ];
      bb: readonly [
        {
          readonly name: "x";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
            { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
            {
              readonly name: "r";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
              ];
            },
          ];
        },
        {
          readonly name: "y";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
            { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
            {
              readonly name: "r";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
              ];
            },
          ];
        },
      ];
    };
    variants: {
      vv: readonly [
        { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
        { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
        {
          readonly name: "r";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
            { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
            { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
          ];
        },
      ];
    };
  }>();
});

test("ParseTypes - enum wrapped in generics", () => {
  expectTypeOf<
    ParseTypes<
      ["enum ee { x, y, z }", "record aa { a: ee, b: list<ee> }"]
    >
  >().toEqualTypeOf<{
    variants: {};
    records: {
      aa: readonly [
        {
          readonly name: "a";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
        {
          readonly name: "b";
          readonly type: "list<enum>";
          readonly internalType: "list<ee>";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
      ];
    };
    enums: { ee: readonly ["x", "y", "z"] };
  }>();
});

// ============================================================================
// Complex Mixed Type Tests
// ============================================================================

test("ParseTypes - all three types together", () => {
  expectTypeOf<
    ParseTypes<
      [
        "enum ee { x, y, z }",
        "record aa { a: string, b: ee }",
        "variant vv { p(aa), q(string) }",
      ]
    >
  >().toEqualTypeOf<{
    enums: { ee: readonly ["x", "y", "z"] };
    records: {
      aa: readonly [
        { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
        {
          readonly name: "b";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
      ];
    };
    variants: {
      vv: readonly [
        {
          readonly name: "p";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            { readonly name: "a"; readonly type: "string"; readonly internalType: "string" },
            {
              readonly name: "b";
              readonly type: "enum";
              readonly internalType: "ee";
              readonly components: readonly [
                { readonly name: "x"; readonly type: "_" },
                { readonly name: "y"; readonly type: "_" },
                { readonly name: "z"; readonly type: "_" },
              ];
            },
          ];
        },
        { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
      ];
    };
  }>();
});

test("ParseTypes - deeply nested types", () => {
  expectTypeOf<
    ParseTypes<
      [
        "enum ee { x, y, z }",
        "record aa { a: u32, b: u32 }",
        "variant vv { p(u32), q(ee) }",
        "record bb { a: vv }",
      ]
    >
  >().toEqualTypeOf<{
    enums: { ee: readonly ["x", "y", "z"] };
    records: {
      aa: readonly [
        { readonly name: "a"; readonly type: "u32"; readonly internalType: "u32" },
        { readonly name: "b"; readonly type: "u32"; readonly internalType: "u32" },
      ];
      bb: readonly [
        {
          readonly name: "a";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            { readonly name: "p"; readonly type: "u32"; readonly internalType: "u32" },
            {
              readonly name: "q";
              readonly type: "enum";
              readonly internalType: "ee";
              readonly components: readonly [
                { readonly name: "x"; readonly type: "_" },
                { readonly name: "y"; readonly type: "_" },
                { readonly name: "z"; readonly type: "_" },
              ];
            },
          ];
        },
      ];
    };
    variants: {
      vv: readonly [
        { readonly name: "p"; readonly type: "u32"; readonly internalType: "u32" },
        {
          readonly name: "q";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
            { readonly name: "z"; readonly type: "_" },
          ];
        },
      ];
    };
  }>();
});

// ============================================================================
// Circular Reference Tests
// ============================================================================

test("ParseTypes - detects circular record reference", () => {
  expectTypeOf<
    ParseTypes<["record aa { b: bb }", "record bb { a: aa }"]>
  >().toEqualTypeOf<{
    records: {
      aa: readonly [
        {
          readonly name: "b";
          readonly type: "record";
          readonly internalType: "bb";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                ['Error: Circular reference detected at "bb".'],
              ];
            },
          ];
        },
      ];
      bb: readonly [
        {
          readonly name: "a";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            {
              readonly name: "b";
              readonly type: "record";
              readonly internalType: "bb";
              readonly components: readonly [
                ['Error: Circular reference detected at "aa".'],
              ];
            },
          ];
        },
      ];
    };
    variants: {};
    enums: ParseEnums<["record aa { b: bb }", "record bb { a: aa }"]>;
  }>();
});

test("ParseTypes - detects circular variant reference", () => {
  type T = ParseTypes<["variant vv { a(ww) }", "variant ww { a(vv) }"]>;

  expectTypeOf<T>().toEqualTypeOf<{
    records: {};
    variants: {
      vv: readonly [
        {
          readonly name: "a";
          readonly type: "variant";
          readonly internalType: "ww";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "variant";
              readonly internalType: "vv";
              readonly components: readonly [
                ['Error: Circular reference detected at "ww".'],
              ];
            },
          ];
        },
      ];
      ww: readonly [
        {
          readonly name: "a";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "variant";
              readonly internalType: "ww";
              readonly components: readonly [
                ['Error: Circular reference detected at "vv".'],
              ];
            },
          ];
        },
      ];
    };
    enums: {};
  }>();
});

test("ParseTypes - detects circular reference across record and variant", () => {
  expectTypeOf<
    ParseTypes<["record aa { a: vv }", "variant vv { a(aa) }"]>
  >().toMatchTypeOf<{
    records: {
      aa: readonly [
        {
          readonly name: "a";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                ['Error: Circular reference detected at "vv".'],
              ];
            },
          ];
        },
      ];
    };
    variants: {
      vv: readonly [
        {
          readonly name: "a";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "variant";
              readonly internalType: "vv";
              readonly components: readonly [
                ['Error: Circular reference detected at "aa".'],
              ];
            },
          ];
        },
      ];
    };
  }>();
});

test("ParseTypes - detects circular reference with enum in the chain", () => {
  expectTypeOf<
    ParseTypes<
      ["enum ee { x, y }", "record aa { a: ee, b: aa }"]
    >
  >().toEqualTypeOf<{
    records: {
      aa: readonly [
        {
          readonly name: "a";
          readonly type: "enum";
          readonly internalType: "ee";
          readonly components: readonly [
            { readonly name: "x"; readonly type: "_" },
            { readonly name: "y"; readonly type: "_" },
          ];
        },
        {
          readonly name: "b";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "enum";
              readonly internalType: "ee";
              readonly components: readonly [
                { readonly name: "x"; readonly type: "_" },
                { readonly name: "y"; readonly type: "_" },
              ];
            },
            ['Error: Circular reference detected at "aa".'],
          ];
        },
      ];
    };
    enums: { ee: readonly ["x", "y"] };
    variants: {};
  }>();
});

test("ParseTypes - detects multi-level circular reference", () => {
  expectTypeOf<
    ParseTypes<["record aa { b: bb }", "record bb { c: cc }", "record cc { a: aa }"]>
  >().toEqualTypeOf<{
    records: {
      aa: readonly [
        {
          readonly name: "b";
          readonly type: "record";
          readonly internalType: "bb";
          readonly components: readonly [
            {
              readonly name: "c";
              readonly type: "record";
              readonly internalType: "cc";
              readonly components: readonly [
                {
                  readonly name: "a";
                  readonly type: "record";
                  readonly internalType: "aa";
                  readonly components: readonly [
                    ['Error: Circular reference detected at "bb".'],
                  ];
                },
              ];
            },
          ];
        },
      ];
      bb: readonly [
        {
          readonly name: "c";
          readonly type: "record";
          readonly internalType: "cc";
          readonly components: readonly [
            {
              readonly name: "a";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                {
                  readonly name: "b";
                  readonly type: "record";
                  readonly internalType: "bb";
                  readonly components: readonly [
                    ['Error: Circular reference detected at "cc".'],
                  ];
                },
              ];
            },
          ];
        },
      ];
      cc: readonly [
        {
          readonly name: "a";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            {
              readonly name: "b";
              readonly type: "record";
              readonly internalType: "bb";
              readonly components: readonly [
                {
                  readonly name: "c";
                  readonly type: "record";
                  readonly internalType: "cc";
                  readonly components: readonly [
                    ['Error: Circular reference detected at "aa".'],
                  ];
                },
              ];
            },
          ];
        },
      ];
    };
    variants: {};
    enums: {};
  }>();
});

test("ParseVariants - should NOT expand records (shallow pass)", () => {
  type Result = ParseVariants<
    [
      "record aa { a: u8, b: u8, c: u8 }",
      "record bb { a: u16, b: u8, c: u8 }",
      "variant vv { p(string), q(aa), r(bb), s(string) }",
    ]
  >;

  expectTypeOf<Result>().toEqualTypeOf<{
    vv: readonly [
      { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
      { readonly name: "q"; readonly type: "aa"; readonly internalType: "aa" },
      { readonly name: "r"; readonly type: "bb"; readonly internalType: "bb" },
      { readonly name: "s"; readonly type: "string"; readonly internalType: "string" },
    ];
  }>();
});

test("ParseTypes - DOES expand records in variants (deep resolution)", () => {
  type Result = ParseTypes<
    [
      "record aa { a: u8, b: u8, c: u8 }",
      "record bb { a: u16, b: u8, c: u8 }",
      "variant vv { p(string), q(aa), r(bb), s(string) }",
    ]
  >;

  expectTypeOf<Result["variants"]["vv"]>().toEqualTypeOf<
    readonly [
      { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
      {
        readonly name: "q";
        readonly type: "record";
        readonly internalType: "aa";
        readonly components: readonly [
          { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
          { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
          { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
        ];
      },
      {
        readonly name: "r";
        readonly type: "record";
        readonly internalType: "bb";
        readonly components: readonly [
          { readonly name: "a"; readonly type: "u16"; readonly internalType: "u16" },
          { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
          { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
        ];
      },
      { readonly name: "s"; readonly type: "string"; readonly internalType: "string" },
    ]
  >();
});

test("ParseTypes - records in variants are recursively expanded", () => {
  expectTypeOf<
    ParseTypes<
      [
        "record aa { a: u8, b: u8, c: u8 }",
        "variant vv { p(string), q(string), r(aa) }",
        "record bb { x: vv, y: vv }",
      ]
    >
  >().toEqualTypeOf<{
    enums: {};
    records: {
      aa: readonly [
        { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
        { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
        { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
      ];
      bb: readonly [
        {
          readonly name: "x";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
            { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
            {
              readonly name: "r";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
              ];
            },
          ];
        },
        {
          readonly name: "y";
          readonly type: "variant";
          readonly internalType: "vv";
          readonly components: readonly [
            { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
            { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
            {
              readonly name: "r";
              readonly type: "record";
              readonly internalType: "aa";
              readonly components: readonly [
                { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
                { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
              ];
            },
          ];
        },
      ];
    };
    variants: {
      vv: readonly [
        { readonly name: "p"; readonly type: "string"; readonly internalType: "string" },
        { readonly name: "q"; readonly type: "string"; readonly internalType: "string" },
        {
          readonly name: "r";
          readonly type: "record";
          readonly internalType: "aa";
          readonly components: readonly [
            { readonly name: "a"; readonly type: "u8"; readonly internalType: "u8" },
            { readonly name: "b"; readonly type: "u8"; readonly internalType: "u8" },
            { readonly name: "c"; readonly type: "u8"; readonly internalType: "u8" },
          ];
        },
      ];
    };
  }>();
});
