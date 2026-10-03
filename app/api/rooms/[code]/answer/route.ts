import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { QUESTIONS } from "@/lib/questions";

const redis = Redis.fromEnv();

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await redis.get<any>(`room:${code.toUpperCase()}`);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = await req.json();
  const p = room.participants?.[body.participantId];
  if (!p) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  if (room.status !== "question") return NextResponse.json({ error: "Quiz is not accepting answers" }, { status: 400 });
  if (p.answered) return NextResponse.json({ error: "Answer already submitted" }, { status: 400 });

  const q = QUESTIONS[room.currentQuestion];
  const answer = body.answer;

  // Validate answer shape without exposing the correct answer.
  if (q.type === "multi") {
    if (!Array.isArray(answer) || answer.some((x: any) => !Number.isInteger(x) || x < 0 || x >= q.choices.length)) {
      return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
    }
  } else if (q.type === "boolean") {
    if (typeof answer !== "boolean") return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  } else if (!Number.isInteger(answer) || answer < 0 || answer >= q.choices.length) {
    return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  }

  p.answered = true;
  p.lastAnswer = answer;
  p.lastAnswerScored = false;

  await redis.set(`room:${room.code}`, room, { ex: 60 * 60 * 8 });

  // Do not return correct answer here.
  return NextResponse.json({
    code: room.code,
    status: room.status,
    currentQuestion: room.currentQuestion,
    questionCount: room.questionCount,
    answersRevealed: false,
    participants: Object.values(room.participants).map((x: any) => ({ id: x.id, name: x.name, answered: x.answered })),
    question: { id: q.id, text: q.text, type: q.type, choices: q.choices },
    myParticipant: { id: p.id, name: p.name, score: p.score, answered: p.answered, lastAnswer: p.lastAnswer },
  });
}
