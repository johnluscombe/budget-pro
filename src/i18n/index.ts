import en from "./en";

export const locale = "en-US";

type MessageKeys<Tree> = {
    [Key in keyof Tree & string]: Tree[Key] extends string
        ? Key
        : `${Key}.${MessageKeys<Tree[Key]>}`;
}[keyof Tree & string];

type MessageAt<
    Tree,
    Path extends string
> = Path extends `${infer Head}.${infer Rest}`
    ? Head extends keyof Tree
        ? MessageAt<Tree[Head], Rest>
        : never
    : Path extends keyof Tree
      ? Tree[Path]
      : never;

export type TranslationKey = MessageKeys<typeof en>;
type ParameterNames<Message extends string> =
    Message extends `${string}{${infer Name}}${infer Rest}`
        ? Name | ParameterNames<Rest>
        : never;
type TranslationArguments<Key extends TranslationKey> = [
    ParameterNames<MessageAt<typeof en, Key> & string>
] extends [never]
    ? [parameters?: Record<string, never>]
    : [
          parameters: Record<
              ParameterNames<MessageAt<typeof en, Key> & string>,
              string | number
          >
      ];

function lookup(key: TranslationKey): string {
    let message: unknown = en;
    for (const segment of key.split(".")) {
        if (
            typeof message !== "object" ||
            message === null ||
            !Object.hasOwn(message, segment)
        ) {
            throw new Error(`Unknown translation key: ${key}`);
        }
        message = (message as Record<string, unknown>)[segment];
    }
    if (typeof message !== "string") {
        throw new Error(`Translation key must identify a message: ${key}`);
    }
    return message;
}

/** Translate a dotted message key without interpreting inserted user values. */
export function t<Key extends TranslationKey>(
    key: Key,
    ...[parameters]: TranslationArguments<Key>
): string {
    const values: Record<string, string | number> = parameters ?? {};
    return lookup(key).replace(/\{(\w+)\}/g, (_match, name: string) => {
        if (!Object.hasOwn(values, name)) {
            throw new Error(`Missing translation parameter: ${name} (${key})`);
        }
        return String(values[name]);
    });
}
