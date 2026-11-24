# Website chatbot

A customer-support chatbot for a website. Built with Next.js and the Vercel AI SDK; answers
come from Claude through Vercel AI Gateway and are limited to the business info you give it.

## Make it yours
Edit `src/lib/business.ts`: business name, greeting, starter questions and everything the bot
should know. It currently holds a made-up example ("Acme Coffee Co.").

## Run locally
```bash
cd website-chatbot
npm install
cp .env.example .env.local   # then add your AI_GATEWAY_API_KEY
npm run dev
```
Open http://localhost:3000.

## Deploy to Vercel
1. Import this repository at vercel.com/new and set **Root Directory** to `website-chatbot`.
2. Add the `AI_GATEWAY_API_KEY` environment variable (from Vercel → AI Gateway → API Keys).
3. Deploy. Optional: set `CHAT_MODEL` to use a different model.
