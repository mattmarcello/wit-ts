import { expectTypeOf, test } from "vitest";

import type { ParseWit } from "./parser/parse-wit.js";
import type { ExtractWitFunctions } from "./utils.js";
import type {
  WitParameterToPrimitiveType,
  WitParametersToPrimitiveTypes,
  Result,
} from "./utils.js";
import type { Wit } from "./wit.js";

// The motivating example from the README: derive a typed API client from WIT strings.
type WitClient<wit extends Wit> = {
  [fn in ExtractWitFunctions<wit> as fn["name"]]: (
    ...args: WitParametersToPrimitiveTypes<fn["inputs"]>
  ) => Promise<WitParameterToPrimitiveType<fn["outputs"][0]>>;
};

const wit = [
  "record user { name: string, age: u32 }",
  "record post { title: string, body: string }",
  "variant api-error { not-found, unauthorized(string) }",
  "get-user: func(id: u64) -> user;",
  "create-post: func(author: user, post: post) -> result<post, api-error>;",
  "list-posts: func(limit: u32) -> list<post>;",
] as const;

type Client = WitClient<ParseWit<typeof wit>>;

test("WitClient - get-user has correct signature", () => {
  expectTypeOf<Client["get-user"]>().toEqualTypeOf<
    (id: bigint) => Promise<{ name: string; age: number }>
  >();
});

test("WitClient - create-post has correct signature", () => {
  expectTypeOf<Client["create-post"]>().toEqualTypeOf<
    (
      author: { name: string; age: number },
      post: { title: string; body: string },
    ) => Promise<
      Result<
        { title: string; body: string },
        ["not-found"] | ["unauthorized", string]
      >
    >
  >();
});

test("WitClient - list-posts has correct signature", () => {
  expectTypeOf<Client["list-posts"]>().toEqualTypeOf<
    (limit: number) => Promise<readonly { title: string; body: string }[]>
  >();
});

// Flags primitive type mapping
const witWithFlags = [
  "flags permissions { read, write, exec }",
  "check-access: func(p: permissions) -> bool;",
] as const;

type FlagsClient = WitClient<ParseWit<typeof witWithFlags>>;

test("WitClient - flags parameter maps to record of booleans", () => {
  expectTypeOf<FlagsClient["check-access"]>().toEqualTypeOf<
    (p: { read: boolean; write: boolean; exec: boolean }) => Promise<boolean>
  >();
});

// Tuple primitive type mapping
const witWithTuple = [
  "record point { x: s32, y: s32 }",
  "variant shape { circle(u32), rect(point) }",
  "enum color { red, green, blue }",
  "get-info: func(id: u64) -> tuple<shape, color, string>;",
  "swap: func(t: tuple<u32, u64>) -> tuple<u64, u32>;",
] as const;

type TupleClient = WitClient<ParseWit<typeof witWithTuple>>;

test("WitClient - tuple of variant, enum, and primitive", () => {
  expectTypeOf<TupleClient["get-info"]>().toEqualTypeOf<
    (id: bigint) => Promise<
      readonly [
        ["circle", number] | ["rect", { x: number; y: number }],
        "red" | "green" | "blue",
        string,
      ]
    >
  >();
});

test("WitClient - tuple of primitives", () => {
  expectTypeOf<TupleClient["swap"]>().toEqualTypeOf<
    (t: readonly [number, bigint]) => Promise<readonly [bigint, number]>
  >();
});
