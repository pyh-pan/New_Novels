import { createChatCompletion, getModelName } from "./provider";

export { getModelName };

export function getOpenAIClient() {
  return {
    chat: {
      completions: {
        create: async ({
          messages,
          temperature
        }: {
          model?: string;
          messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
          temperature?: number;
        }) => ({
          choices: [
            {
              message: {
                content: await createChatCompletion({ messages, temperature })
              }
            }
          ]
        })
      }
    }
  };
}
