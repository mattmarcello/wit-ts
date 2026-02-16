import { assertType, test } from "vitest";

import type {
  IsFunctionSignature,
  IsRecordSignature,
  IsEnumSignature,
  IsVariantSignature,
  IsSignature,
} from "./signatures.js";

test("IsFunctionSignature", () => {
  assertType<IsFunctionSignature<"f: func(a: string, b: u64) -> u64;">>(true);
  assertType<IsFunctionSignature<"g: func(a: string, b: string) -> result<u64, error>;">>(true);
  assertType<IsFunctionSignature<"h: func() -> list<u64>;">>(true);
  assertType<IsFunctionSignature<"export f: func(a: u64) -> u64;">>(true);
  assertType<IsFunctionSignature<"export h: func() -> list<u64>;">>(true);
  assertType<IsFunctionSignature<"j: func(a: u64);">>(true);
  assertType<IsFunctionSignature<"k: func();">>(true);
});

test("IsRecordSignature", () => {
  assertType<IsRecordSignature<"record aa { a: string, b: s64 }">>(true);
  assertType<IsRecordSignature<"record bb { a: string, b: string }">>(true);
});

test("IsEnumSignature", () => {
  assertType<IsEnumSignature<"enum ee { x, y, z }">>(true);
});

test("IsVariantSignature", () => {
  assertType<IsVariantSignature<"variant vv { a, b, c(list<string>) }">>(true);
});

test("IsSignature", () => {
  assertType<IsSignature<"record aa { a: string, b: s64 }">>(true);
  assertType<IsSignature<"record bb { a: string, b: string }">>(true);
  assertType<IsSignature<"f: func(a: string, b: u64) -> u64;">>(true);
  assertType<IsSignature<"g: func(a: string, b: string) -> result<u64, error>;">>(true);
  assertType<IsSignature<"h: func() -> list<u64>;">>(true);
  assertType<IsSignature<"enum ee { x, y, z }">>(true);
  assertType<IsSignature<"variant vv { a, b, c(list<string>) }">>(true);
});
