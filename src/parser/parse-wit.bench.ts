import { bench, describe } from "vitest";

import type { WitParameter } from "../wit.js";
import { parseTypes } from "./core/user-defined.js";
import { parseFunctionSignature } from "./core/utils.js";

// Large workload: 500 functions all sharing a small set of types.
// Models a real WIT interface (e.g., a CRUD API) where the same records,
// enums, and generic wrappers appear across hundreds of function signatures.

const typeDefs = [
  "record user { name: string, email: string, age: u32 }",
  "record post { title: string, body: string, author: user }",
  "record comment { text: string, author: user, post: post }",
  "record tag { name: string, slug: string }",
  "record session { token: string, user: user, expires: u64 }",
  "enum status { draft, published, archived }",
  "flags perms { read, write, admin, delete }",
  "variant payload { text(string), data(post), none }",
] as const;

const funcTemplates = [
  (i: number) => `f${i}a: func(u: user, p: post) -> result<comment, error>;`,
  (i: number) => `f${i}b: func(c: comment) -> list<user>;`,
  (i: number) => `f${i}c: func(p: post, t: tag) -> option<post>;`,
  (i: number) => `f${i}d: func(x: u64, y: u64, z: u64) -> u64;`,
  (i: number) => `f${i}e: func(u: user) -> result<user, error>;`,
  (i: number) => `f${i}f: func(a: string, b: string) -> list<string>;`,
  (i: number) => `f${i}g: func(p: post, c: comment, u: user) -> option<comment>;`,
  (i: number) => `f${i}h: func(t: tag) -> list<tag>;`,
  (i: number) => `f${i}i: func(s: status, u: user) -> result<post, error>;`,
  (i: number) => `f${i}j: func(p: perms, u: user) -> list<post>;`,
  (i: number) => `f${i}k: func(s: session, p: post) -> result<comment, error>;`,
  (i: number) => `f${i}l: func(u: user, c: comment, t: tag) -> option<user>;`,
  (i: number) => `f${i}m: func(p: post) -> result<list<comment>, error>;`,
  (i: number) => `f${i}n: func(s: session) -> option<user>;`,
  (i: number) => `f${i}o: func(u: user, p: perms) -> result<session, error>;`,
  (i: number) => `f${i}p: func(t: tag, p: post, c: comment) -> list<post>;`,
  (i: number) => `f${i}q: func(c: comment, u: user) -> result<post, error>;`,
  (i: number) => `f${i}r: func(s: session, t: tag) -> list<comment>;`,
  (i: number) => `f${i}s: func(p: post, s: status) -> option<post>;`,
  (i: number) => `f${i}t: func(u: user, s: session, p: post, c: comment) -> result<user, error>;`,
];

// 500 functions (20 templates x 25 groups)
const funcSigs: string[] = [];
for (let i = 0; i < 25; i++) {
  for (const tmpl of funcTemplates) {
    funcSigs.push(tmpl(i));
  }
}

const allSigs = [...typeDefs, ...funcSigs];
const types = parseTypes(allSigs);

describe("parseWit parameter cache (500 functions, heavy type sharing)", () => {
  bench("with cache", () => {
    const cache = new Map<string, WitParameter>();
    for (const sig of funcSigs) {
      parseFunctionSignature(
        sig,
        types.records,
        types.variants,
        types.enums,
        types.flags,
        cache,
      );
    }
  });

  bench("without cache", () => {
    for (const sig of funcSigs) {
      parseFunctionSignature(
        sig,
        types.records,
        types.variants,
        types.enums,
        types.flags,
      );
    }
  });
});
