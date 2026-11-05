// Keeps tsconfig.api.json from failing with "no inputs" (TS18003) while api/
// has no functions yet. The leading underscore stops Vercel from deploying it
// as a function. Delete once api/ask.ts exists.
export {};
