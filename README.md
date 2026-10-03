# Nouri's 13th Quiz

A host-controlled birthday quiz built for Vercel.

## Features

- 13 preloaded questions from Nouri's quiz
- Multiple choice, true/false, and multi-answer questions
- Host creates a room and displays a QR code
- Guests join from their phones with a room code and name
- Correct answers are kept server-side and are not sent to participants before reveal
- Host sees who has answered, but not their answers
- Host reveals answers, then advances
- Scores and final leaderboard
- Room state stored in Upstash Redis, suitable for Vercel serverless deployment

## 1. Create the project

```bash
npm install
npm run dev
```

## 2. Set up Upstash Redis

Create a Redis database in Upstash. Copy the REST URL and REST token into `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## 3. Deploy

Push this directory to GitHub and import it into Vercel. Add the same two environment variables to the Vercel project.

Optionally set:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## Quiz behavior

The host starts the room. Players answer independently.

The host sees `answered / total`, but participant answer values never appear in the host response. The correct answer is only returned to the host or after the host clicks Reveal Answer.

Question 10 is a multi-answer question: all four listed animals are correct. A player must select all four to receive the point.

## Editing questions

Edit `lib/questions.ts`. The `correct` field is zero-based:

- `2` means the third answer
- `true` / `false` is used for true/false questions
- `[0, 1, 2]` is used for multi-answer questions

If you add questions, the app automatically uses the new count.
