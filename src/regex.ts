export function execTyped<type>(regex: RegExp, string: string) {
  const match = regex.exec(string);
  return match?.groups as type | undefined;
}

export const isGenericRegex =
  /^(?<outer>borrow|list|option|result|tuple)\s*<(?<inner>[\s\S]+)>\s*$/;
