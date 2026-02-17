import { describe, expect, test } from "vitest";
import { parseTypes, execWitType } from "./user-defined.js";

describe("execWitType", () => {
  test("plain identifier", () => {
    expect(execWitType("u64")).toEqual({ base: "u64" });
    expect(execWitType("aa")).toEqual({ base: "aa" });
  });

  test("single-arg wrappers", () => {
    expect(execWitType("list<u64>")).toEqual({ wrapper: "list", base: "u64" });
    expect(execWitType("option<aa>")).toEqual({ wrapper: "option", base: "aa" });
    expect(execWitType("borrow<bb>")).toEqual({ wrapper: "borrow", base: "bb" });
  });

  test("wrapper payload is opaque (no recursion here)", () => {
    expect(execWitType("option<list<u64>>")).toEqual({
      wrapper: "option",
      base: "list<u64>",
    });
  });

  test("result<ok, error>", () => {
    expect(execWitType("result<string, error>")).toEqual({
      wrapper: "result",
      base: "string",
    });
    expect(execWitType("result< list<u8> , error >")).toEqual({
      wrapper: "result",
      base: "list<u8>",
    });
  });

  test("rejects result with non-error err channel", () => {
    expect(execWitType("result<string, string>")).toBeNull();
    expect(execWitType("result<string>")).toBeNull();
  });

  test("rejects malformed wrappers", () => {
    expect(execWitType("list<u64")).toBeNull();
    expect(execWitType("list<u64>>")).toBeNull();
    expect(execWitType("")).toBeNull();
    expect(execWitType("1abc")).toBeNull();
  });
});

describe("parseTypes - records", () => {
  test("basic records with cross-reference", () => {
    const result = parseTypes([
      "record aa { a: u32, b: u32 }",
      "record bb { p: aa, q: aa }",
    ]);

    expect(result.records).toEqual({
      aa: [
        { name: "a", type: "u32", internalType: "u32" },
        { name: "b", type: "u32", internalType: "u32" },
      ],
      bb: [
        {
          type: "record",
          name: "p",
          internalType: "aa",
          components: [
            { name: "a", type: "u32", internalType: "u32" },
            { name: "b", type: "u32", internalType: "u32" },
          ],
        },
        {
          type: "record",
          name: "q",
          internalType: "aa",
          components: [
            { name: "a", type: "u32", internalType: "u32" },
            { name: "b", type: "u32", internalType: "u32" },
          ],
        },
      ],
    });
  });

  test("record with generic field types", () => {
    const result = parseTypes([
      "record aa { a: u64, b: string, c: option<list<u8>> }",
    ]);

    expect(result.records).toEqual({
      aa: [
        { name: "a", type: "u64", internalType: "u64" },
        { name: "b", type: "string", internalType: "string" },
        { name: "c", type: "option<list<u8>>", internalType: "option<list<u8>>" },
      ],
    });
  });

  test("record with list, option, and result wrappers around another record", () => {
    const result = parseTypes([
      "record aa { a: u32, b: u32 }",
      "record bb { p: list<aa>, q: option<aa>, r: result<aa, error> }",
    ]);

    expect(result.records).toEqual({
      aa: [
        { name: "a", type: "u32", internalType: "u32" },
        { name: "b", type: "u32", internalType: "u32" },
      ],
      bb: [
        {
          name: "p",
          type: "list<record>",
          internalType: "list<aa>",
          components: [
            { name: "a", type: "u32", internalType: "u32" },
            { name: "b", type: "u32", internalType: "u32" },
          ],
        },
        {
          name: "q",
          type: "option<record>",
          internalType: "option<aa>",
          components: [
            { name: "a", type: "u32", internalType: "u32" },
            { name: "b", type: "u32", internalType: "u32" },
          ],
        },
        {
          name: "r",
          type: "result<record, error>",
          internalType: "result<aa, error>",
          components: [
            { name: "a", type: "u32", internalType: "u32" },
            { name: "b", type: "u32", internalType: "u32" },
          ],
        },
      ],
    });
  });

  test("record referencing variant", () => {
    const result = parseTypes([
      "variant vv { a(string), b(string) }",
      "record aa { p: vv, q: list<vv> }",
    ]);

    expect(result.records).toEqual({
      aa: [
        {
          name: "p",
          type: "variant",
          internalType: "vv",
          components: [
            { name: "a", type: "string", internalType: "string" },
            { name: "b", type: "string", internalType: "string" },
          ],
        },
        {
          name: "q",
          type: "list<variant>",
          internalType: "list<vv>",
          components: [
            { name: "a", type: "string", internalType: "string" },
            { name: "b", type: "string", internalType: "string" },
          ],
        },
      ],
    });

    expect(result.variants).toEqual({
      vv: [
        { name: "a", type: "string", internalType: "string" },
        { name: "b", type: "string", internalType: "string" },
      ],
    });
  });

  test("variant with nested record reference", () => {
    const result = parseTypes([
      "record aa { a: u8, b: u8, c: u8 }",
      "variant vv { p(string), q(aa) }",
      "record bb { x: vv, y: list<vv> }",
    ]);

    expect(result.records).toEqual({
      aa: [
        { name: "a", type: "u8", internalType: "u8" },
        { name: "b", type: "u8", internalType: "u8" },
        { name: "c", type: "u8", internalType: "u8" },
      ],
      bb: [
        {
          name: "x",
          type: "variant",
          internalType: "vv",
          components: [
            { name: "p", type: "string", internalType: "string" },
            {
              name: "q",
              type: "record",
              internalType: "aa",
              components: [
                { name: "a", type: "u8", internalType: "u8" },
                { name: "b", type: "u8", internalType: "u8" },
                { name: "c", type: "u8", internalType: "u8" },
              ],
            },
          ],
        },
        {
          name: "y",
          type: "list<variant>",
          internalType: "list<vv>",
          components: [
            { name: "p", type: "string", internalType: "string" },
            {
              name: "q",
              type: "record",
              internalType: "aa",
              components: [
                { name: "a", type: "u8", internalType: "u8" },
                { name: "b", type: "u8", internalType: "u8" },
                { name: "c", type: "u8", internalType: "u8" },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("parseTypes - variants", () => {
  test("variant referencing another variant", () => {
    const result = parseTypes([
      "variant vv { a(string), b(string) }",
      "variant ww { p(vv), q(string) }",
    ]);

    expect(result.variants).toEqual({
      vv: [
        { name: "a", type: "string", internalType: "string" },
        { name: "b", type: "string", internalType: "string" },
      ],
      ww: [
        {
          name: "p",
          type: "variant",
          internalType: "vv",
          components: [
            { name: "a", type: "string", internalType: "string" },
            { name: "b", type: "string", internalType: "string" },
          ],
        },
        { name: "q", type: "string", internalType: "string" },
      ],
    });
  });

  test("variant with generic payloads", () => {
    const result = parseTypes([
      "variant vv { a(string), b(string) }",
      "variant ww { p(string), q(u64) }",
      "variant xx { a(option<string>), b(list<string>), c(vv) }",
    ]);

    expect(result.variants).toEqual({
      vv: [
        { name: "a", type: "string", internalType: "string" },
        { name: "b", type: "string", internalType: "string" },
      ],
      ww: [
        { name: "p", type: "string", internalType: "string" },
        { name: "q", type: "u64", internalType: "u64" },
      ],
      xx: [
        { name: "a", type: "option<string>", internalType: "option<string>" },
        { name: "b", type: "list<string>", internalType: "list<string>" },
        {
          name: "c",
          type: "variant",
          internalType: "vv",
          components: [
            { name: "a", type: "string", internalType: "string" },
            { name: "b", type: "string", internalType: "string" },
          ],
        },
      ],
    });
  });

  test("variant with unit cases (no payload)", () => {
    const result = parseTypes([
      "variant vv { a, b, c(list<string>) }",
    ]);

    expect(result.variants).toEqual({
      vv: [
        { name: "a", type: "_", internalType: "_" },
        { name: "b", type: "_", internalType: "_" },
        { name: "c", type: "list<string>", internalType: "list<string>" },
      ],
    });
  });
});

describe("parseTypes - enums", () => {
  test("basic enum", () => {
    const result = parseTypes(["enum ee { x, y, z }"]);

    expect(result.enums).toEqual({
      ee: ["x", "y", "z"],
    });
  });

  test("multiple enums", () => {
    const result = parseTypes([
      "enum ee { x, y, z }",
      "enum ff { p, q, r }",
    ]);

    expect(result.enums).toEqual({
      ee: ["x", "y", "z"],
      ff: ["p", "q", "r"],
    });
  });

  test("record referencing enum", () => {
    const result = parseTypes([
      "enum ee { x, y, z }",
      "record aa { a: ee, b: ee }",
    ]);

    expect(result.records).toEqual({
      aa: [
        {
          name: "a",
          type: "enum",
          internalType: "ee",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
        {
          name: "b",
          type: "enum",
          internalType: "ee",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
      ],
    });
  });

  test("enum wrapped in list, option, and result", () => {
    const result = parseTypes([
      "enum ee { x, y, z }",
      "record aa { a: ee, b: list<ee>, c: option<ee> }",
    ]);

    expect(result.records).toEqual({
      aa: [
        {
          name: "a",
          type: "enum",
          internalType: "ee",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
        {
          name: "b",
          type: "list<enum>",
          internalType: "list<ee>",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
        {
          name: "c",
          type: "option<enum>",
          internalType: "option<ee>",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
      ],
    });
  });

  test("variant referencing enum", () => {
    const result = parseTypes([
      "enum ee { x, y, z }",
      "variant vv { a(ee), b(string) }",
    ]);

    expect(result.variants).toEqual({
      vv: [
        {
          name: "a",
          type: "enum",
          internalType: "ee",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
        { name: "b", type: "string", internalType: "string" },
      ],
    });
  });
});

describe("parseTypes - mixed types", () => {
  test("all three types together", () => {
    const result = parseTypes([
      "enum ee { x, y, z }",
      "record aa { a: string, b: ee }",
      "variant vv { p(aa), q(string) }",
    ]);

    expect(result.enums).toEqual({
      ee: ["x", "y", "z"],
    });

    expect(result.records).toEqual({
      aa: [
        { name: "a", type: "string", internalType: "string" },
        {
          name: "b",
          type: "enum",
          internalType: "ee",
          components: [
            { name: "x", type: "_" },
            { name: "y", type: "_" },
            { name: "z", type: "_" },
          ],
        },
      ],
    });

    expect(result.variants).toEqual({
      vv: [
        {
          name: "p",
          type: "record",
          internalType: "aa",
          components: [
            { name: "a", type: "string", internalType: "string" },
            {
              name: "b",
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
        { name: "q", type: "string", internalType: "string" },
      ],
    });
  });

  test("deeply nested: record -> variant -> record -> enum", () => {
    const result = parseTypes([
      "enum ee { x, y, z }",
      "record aa { a: u32, b: u32 }",
      "record bb { p: aa, q: aa }",
      "variant vv { a(u32), b(bb), c(ee) }",
      "record cc { p: list<vv>, q: ee }",
    ]);

    expect(result.records.cc).toEqual([
      {
        name: "p",
        type: "list<variant>",
        internalType: "list<vv>",
        components: [
          { name: "a", type: "u32", internalType: "u32" },
          {
            name: "b",
            type: "record",
            internalType: "bb",
            components: [
              {
                name: "p",
                type: "record",
                internalType: "aa",
                components: [
                  { name: "a", type: "u32", internalType: "u32" },
                  { name: "b", type: "u32", internalType: "u32" },
                ],
              },
              {
                name: "q",
                type: "record",
                internalType: "aa",
                components: [
                  { name: "a", type: "u32", internalType: "u32" },
                  { name: "b", type: "u32", internalType: "u32" },
                ],
              },
            ],
          },
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
      {
        name: "q",
        type: "enum",
        internalType: "ee",
        components: [
          { name: "x", type: "_" },
          { name: "y", type: "_" },
          { name: "z", type: "_" },
        ],
      },
    ]);
  });
});

describe("parseTypes - error handling", () => {
  test("namespace collision: record and variant", () => {
    expect(() =>
      parseTypes([
        "record aa { a: string }",
        "variant aa { p(string), q(string) }",
      ]),
    ).toThrow('Namespace collision: "aa" is both record and variant.');
  });

  test("namespace collision: record and enum", () => {
    expect(() =>
      parseTypes([
        "record aa { a: string }",
        "enum aa { x, y, z }",
      ]),
    ).toThrow('Namespace collision: "aa" is both record and enum.');
  });

  test("namespace collision: variant and enum", () => {
    expect(() =>
      parseTypes([
        "record bb { a: u8, b: u8, c: u8 }",
        "variant aa { p(string), q(bb) }",
        "enum aa { x, y, z }",
      ]),
    ).toThrow('Namespace collision: "aa" is both variant and enum.');
  });

  test("circular reference in records", () => {
    expect(() =>
      parseTypes(["record aa { b: bb }", "record bb { a: aa }"]),
    ).toThrow('Circular reference detected at "bb".');
  });

  test("circular reference in variants", () => {
    expect(() =>
      parseTypes(["variant vv { a(ww) }", "variant ww { a(vv) }"]),
    ).toThrow('Circular reference detected at "ww".');
  });

  test("circular reference across record and variant", () => {
    expect(() =>
      parseTypes(["record aa { a: vv }", "variant vv { a(aa) }"]),
    ).toThrow('Circular reference detected at "vv".');
  });

  test("rejects enum with payload", () => {
    expect(() =>
      parseTypes(["enum ee { x(string), y, z }"]),
    ).toThrow(
      "Invalid enum case: x(string). Enums cannot have payloads.",
    );
  });

  test("namespace collision: flags and record", () => {
    expect(() =>
      parseTypes([
        "flags aa { read, write }",
        "record aa { a: string }",
      ]),
    ).toThrow('Namespace collision: "aa" is both record and flags.');
  });

  test("rejects flags with payload", () => {
    expect(() =>
      parseTypes(["flags ff { x(string), y, z }"]),
    ).toThrow(
      "Invalid flags case: x(string). Flags cannot have payloads.",
    );
  });
});

describe("parseTypes - flags", () => {
  test("simple flags", () => {
    const result = parseTypes(["flags permissions { read, write, exec }"]);
    expect(result.flags).toEqual({
      permissions: ["read", "write", "exec"],
    });
  });

  test("function using flags param", () => {
    const result = parseTypes([
      "flags permissions { read, write, exec }",
      "record file { name: string, perms: permissions }",
    ]);

    expect(result.records.file).toEqual([
      { name: "name", type: "string", internalType: "string" },
      {
        name: "perms",
        type: "flags",
        internalType: "permissions",
        components: [
          { name: "read", type: "_" },
          { name: "write", type: "_" },
          { name: "exec", type: "_" },
        ],
      },
    ]);
  });

  test("flags in list wrapper", () => {
    const result = parseTypes([
      "flags permissions { read, write, exec }",
      "record multi { perms: list<permissions> }",
    ]);

    expect(result.records.multi![0]).toEqual({
      name: "perms",
      type: "list<flags>",
      internalType: "list<permissions>",
      components: [
        { name: "read", type: "_" },
        { name: "write", type: "_" },
        { name: "exec", type: "_" },
      ],
    });
  });
});
