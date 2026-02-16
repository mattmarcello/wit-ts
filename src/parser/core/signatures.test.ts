import { expect, test, describe } from "vitest";

import { execFunctionSignature, isFunctionSignature } from "./signatures.js";

describe("isFunctionSignature", () => {
  test.each([
    "f: func(a: u64, b: u64) -> u64;",
    "g: func(a: string, b: string) -> result<u64, error>;",
    "h: func() -> list<u64>;",
    "export f: func(a: u64) -> u64;",
    "export h: func() -> list<u64>;",
    "j: func(a: u64);",
    "k: func();",
  ])("%s -> true", (input) => {
    expect(isFunctionSignature(input)).toBe(true);
  });
});

describe("execFunctionSignature", () => {
  test.each([
    {
      input: "f: func(a: u64, b: u64) -> u64;",
      expected: {
        name: "f",
        parameters: "a: u64, b: u64",
        returns: "u64",
      },
    },
    {
      input: "g: func(a: string, b: string, c: string) -> result<u64, error>;",
      expected: {
        name: "g",
        parameters: "a: string, b: string, c: string",
        returns: "result<u64, error>",
      },
    },
    {
      input: "h: func() -> list<u64>;",
      expected: {
        name: "h",
        parameters: "",
        returns: "list<u64>",
      },
    },
    {
      input: "export h: func() -> list<u64>;",
      expected: {
        name: "h",
        parameters: "",
        returns: "list<u64>",
      },
    },
    {
      input: "j: func(a: string);",
      expected: {
        name: "j",
        parameters: "a: string",
        returns: undefined,
      },
    },
    {
      input: "k: func();",
      expected: {
        name: "k",
        parameters: "",
        returns: undefined,
      },
    },
  ])("%s", ({ input, expected }) => {
    expect(execFunctionSignature(input)).toStrictEqual(expected);
  });
});
