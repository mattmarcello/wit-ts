import { assertType, test } from "vitest";

import type { FormatWitParameter } from "./format-wit-parameter.js";
import type { FormatWitFunction } from "./format-wit-function.js";
import type { FormatWit } from "./format-wit.js";
import type { ParseWit } from "../parser/parse-wit.js";

test("FormatWitParameter - primitive with name", () => {
  assertType<
    FormatWitParameter<{ name: "a"; type: "u64"; internalType: "u64" }>
  >("a: u64" as const);
});

test("FormatWitParameter - primitive without name", () => {
  assertType<FormatWitParameter<{ type: "u64"; internalType: "u64" }>>(
    "u64" as const,
  );
});

test("FormatWitParameter - record uses internalType", () => {
  assertType<
    FormatWitParameter<{
      name: "a";
      type: "record";
      internalType: "aa";
      components: readonly [
        { name: "x"; type: "u32"; internalType: "u32" },
      ];
    }>
  >("a: aa" as const);
});

test("FormatWitParameter - wrapped type", () => {
  assertType<
    FormatWitParameter<{
      type: "result<record, error>";
      internalType: "result<aa, error>";
      components: readonly [
        { name: "x"; type: "u32"; internalType: "u32" },
      ];
    }>
  >("result<aa, error>" as const);
});

test("FormatWitFunction - with inputs and outputs", () => {
  assertType<
    FormatWitFunction<{
      name: "f";
      type: "function";
      inputs: readonly [
        { name: "a"; type: "string"; internalType: "string" },
        { name: "b"; type: "u64"; internalType: "u64" },
      ];
      outputs: readonly [{ type: "u64"; internalType: "u64" }];
    }>
  >("f: func(a: string, b: u64) -> u64;" as const);
});

test("FormatWitFunction - no return", () => {
  assertType<
    FormatWitFunction<{
      name: "f";
      type: "function";
      inputs: readonly [{ name: "a"; type: "u64"; internalType: "u64" }];
      outputs: readonly [];
    }>
  >("f: func(a: u64);" as const);
});

test("FormatWitFunction - no inputs no outputs", () => {
  assertType<
    FormatWitFunction<{
      name: "f";
      type: "function";
      inputs: readonly [];
      outputs: readonly [];
    }>
  >("f: func();" as const);
});

test("FormatWit - simple function with record", () => {
  type Input = ParseWit<
    readonly [
      "record aa { a: u32, b: u32 }",
      "f: func(a: aa) -> u64;",
    ]
  >;

  assertType<FormatWit<Input>>([
    "record aa { a: u32, b: u32 }",
    "f: func(a: aa) -> u64;",
  ] as const);
});

test("FormatWit - primitives only", () => {
  type Input = ParseWit<
    readonly [
      "f: func(a: string, b: u64) -> u64;",
    ]
  >;

  assertType<FormatWit<Input>>([
    "f: func(a: string, b: u64) -> u64;",
  ] as const);
});
