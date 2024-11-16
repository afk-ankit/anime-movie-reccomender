import OpenAI from "openai";

export const client = new OpenAI({
  apiKey: import.meta.env.VITE_API_KEY, // This is the default and can be omitted
  dangerouslyAllowBrowser: true,
});
