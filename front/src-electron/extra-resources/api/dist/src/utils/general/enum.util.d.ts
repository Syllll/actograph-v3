export declare function enumKeys<
  O extends Record<string, unknown>,
  K extends keyof O = keyof O
>(obj: O): K[];
export declare function enumValues<O extends Record<string, unknown>>(
  obj: O
): O[keyof O][];
