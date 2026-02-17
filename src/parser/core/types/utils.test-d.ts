import { assertType, test } from "vitest";
import type {
  ParseWitParameter,
  ParseSignature,
  SplitParameters,
  _ParseFunctionParameters,
} from "./utils.js";

type OptionsWithRecords = {
  records: {
    aa: [
      { type: "u64"; name: "a" },
      { name: "b"; type: "string" },
    ];
  };
};

type OptionsWithVariants = {
  records: {
    bb: [{ name: "a"; type: "u32" }, { name: "b"; type: "u32" }];
  };
  variants: {
    vv: [
      { name: "x"; type: "_"; internalType: "_" },
      { name: "y"; type: "_"; internalType: "_" },
      { name: "z"; type: "list<bb>"; internalType: "_" },
    ];
  };
};

test("ParseWitParameter", () => {
  assertType<ParseWitParameter<"a: u64">>({
    name: "a",
    type: "u64",
    internalType: "u64",
  });

  assertType<ParseWitParameter<"a: aa", OptionsWithRecords>>({
    name: "a",
    type: "record",
    internalType: "aa",
    components: [
      { name: "a", type: "u64" },
      { name: "b", type: "string" },
    ],
  });

  assertType<ParseWitParameter<"u64">>({
    type: "u64",
    internalType: "u64",
  });

  assertType<ParseWitParameter<"a: string">>({
    name: "a",
    type: "string",
    internalType: "string",
  });

  assertType<ParseWitParameter<"b: string">>({
    name: "b",
    type: "string",
    internalType: "string",
  });

  assertType<ParseWitParameter<"a: option<string>">>({
    name: "a",
    type: "option<string>",
    internalType: "option<string>",
  });

  assertType<ParseWitParameter<"a: option<list<string>>">>({
    name: "a",
    type: "option<list<string>>",
    internalType: "option<list<string>>",
  });

  assertType<
    ParseWitParameter<"a: option<list<result<string, error>>>">
  >({
    name: "a",
    type: "option<list<result<string, error>>>",
    internalType: "option<list<result<string, error>>>",
    components: [
      { type: "string", internalType: "string" },
      { type: "error", internalType: "error" },
    ],
  });

  assertType<
    ParseWitParameter<"a: vv", OptionsWithVariants>
  >({
    name: "a",
    type: "variant",
    internalType: "vv",
    components: [
      { name: "x", type: "_", internalType: "_" },
      { name: "y", type: "_", internalType: "_" },
      {
        name: "z",
        type: "list<record>",
        internalType: "list<bb>",
        components: [{ type: "u32", name: "a" }, { type: "u32", name: "b" }],
      },
    ],
  });

  assertType<ParseWitParameter<"a: tuple<u32, string>">>({
    name: "a",
    type: "tuple<u32, string>",
    internalType: "tuple<u32, string>",
    components: [
      { type: "u32", internalType: "u32" },
      { type: "string", internalType: "string" },
    ],
  });

  assertType<ParseWitParameter<"a: tuple<u32, aa>", OptionsWithRecords>>({
    name: "a",
    type: "tuple<u32, record>",
    internalType: "tuple<u32, aa>",
    components: [
      { type: "u32", internalType: "u32" },
      {
        type: "record",
        internalType: "aa",
        components: [
          { name: "a", type: "u64" },
          { name: "b", type: "string" },
        ],
      },
    ],
  });
});

test("_ParseFunctionParameters", () => {
  assertType<
    _ParseFunctionParameters<"f: func(a: string, b: u64) -> u64;">
  >({
    Inputs: "a: string, b: u64",
  });

  assertType<
    _ParseFunctionParameters<"g: func() -> list<u64>;">
  >({
    Inputs: "",
  });

  assertType<
    _ParseFunctionParameters<"export g: func() -> list<u64>;">
  >({
    Inputs: "",
  });

  assertType<
    _ParseFunctionParameters<"h: func(a: string);">
  >({
    Inputs: "a: string",
  });
});

test("SplitParameters", () => {
  assertType<SplitParameters<"u64">>(["u64"]);
  assertType<SplitParameters<"a: string, b: list<u64>">>([
    "a: string",
    "b: list<u64>",
  ]);
});

test("ParseSignature", () => {
  assertType<
    ParseSignature<"f: func(a: string, b: list<u64>) -> u64;">
  >({
    type: "function",
    name: "f",
    inputs: [
      { name: "a", type: "string", internalType: "string" },
      { name: "b", type: "list<u64>", internalType: "list<u64>" },
    ],
    outputs: [
      { type: "u64", internalType: "u64" },
    ],
  });

  assertType<
    ParseSignature<"g: func(a: string, b: list<u64>) -> string;">
  >({
    type: "function",
    name: "g",
    inputs: [
      { name: "a", type: "string", internalType: "string" },
      { name: "b", type: "list<u64>", internalType: "list<u64>" },
    ],
    outputs: [
      { type: "string", internalType: "string" },
    ],
  });

  assertType<
    ParseSignature<
      "h: func() -> list<aa>;",
      OptionsWithRecords
    >
  >({
    type: "function",
    name: "h",
    inputs: [],
    outputs: [
      {
        type: "list<record>",
        internalType: "list<aa>",
        components: [
          { type: "u64", name: "a" },
          { type: "string", name: "b" },
        ],
      },
    ],
  });

  assertType<
    ParseSignature<"i: func(a: u32) -> tuple<u32, string>;">
  >({
    type: "function",
    name: "i",
    inputs: [
      { name: "a", type: "u32", internalType: "u32" },
    ],
    outputs: [
      {
        type: "tuple<u32, string>",
        internalType: "tuple<u32, string>",
        components: [
          { type: "u32", internalType: "u32" },
          { type: "string", internalType: "string" },
        ],
      },
    ],
  });
});
