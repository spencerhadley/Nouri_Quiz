import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { QUESTIONS } from "@/lib/questions";

const redis = Redis.fromEnv();

type Participant = {
  id: string;
  name: string;
  score: number;
  answered: boolean;
  lastAnswer?: number | boolean | number[];
  lastAnswerScored?: boolean;
};

type Room = {
  code: string;
  hostToken: string;
  status: "lobby" | "question" | "finished";
  currentQuestion: number;
  answersRevealed: boolean;
  createdAt: number;
  participants: Record<string, Participant>;
  questionCount: number;
};

async function getRoom(code: string) {
  return await redis.get<Room>(`room:${code}`);
}

function publicRoom(room: Room, isHost: boolean, participantId?: string) {
  const q = room.currentQuestion >= 0 ? QUESTIONS[room.currentQuestion] : null;
  const participants = Object.values(room.participants).map((p) => ({
    id: p.id,
    name: p.name,
    score: isHost || room.status === "finished" ? p.score : undefined,
    answered: p.answered,
  }));

  return {
    code: room.code,
    status: room.status,
    currentQuestion: room.currentQuestion,
    questionCount: room.questionCount,
    answersRevealed: room.answersRevealed,
    participants,
    question: q ? {
      id: q.id,
      text: q.text,
      type: q.type,
      choices: q.choices,
      // Correct answers are only transmitted to host, or after reveal.
      correct: isHost || room.answersRevealed ? q.correct : undefined,
    } : null,
    myParticipant: participantId ? room.participants[participantId] ?? null : null,
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const hostToken = url.searchParams.get("hostToken");
  const participantId = url.searchParams.get("participantId");
  const room = await getRoom(code.toUpperCase());

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const isHost = hostToken === room.hostToken;
  return NextResponse.json(publicRoom(room, isHost, participantId ?? undefined));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = await req.json();
  if (body.hostToken !== room.hostToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = body.action;

  if (action === "start") {
    room.status = "question";
    room.currentQuestion = 0;
    room.answersRevealed = false;
    Object.values(room.participants).forEach((p) => { p.answered = false; p.lastAnswer = undefined; });
  } else if (action === "next") {
    if (room.currentQuestion < QUESTIONS.length - 1) {
      room.currentQuestion += 1;
      room.answersRevealed = false;
      Object.values(room.participants).forEach((p) => { p.answered = false; p.lastAnswer = undefined; });
    } else {
      room.status = "finished";
      room.answersRevealed = true;
    }
  } else if (action === "reveal") {
    if (Object.keys(room.participants).length === 0 || Object.values(room.participants).some((p) => !p.answered)) {
      return NextResponse.json({ error: "Wait until every player has answered." }, { status: 400 });
    }
    room.answersRevealed = true;
    const q = QUESTIONS[room.currentQuestion];
    Object.values(room.participants).forEach((p) => {
      if (p.answered && p.lastAnswer !== undefined && !p.lastAnswerScored) {
        if (isCorrect(p.lastAnswer, q.correct, q.type)) p.score += 1;
        p.lastAnswerScored = true;
      }
    });
  } else if (action === "finish") {
    room.status = "finished";
    room.answersRevealed = true;
    const q = room.currentQuestion >= 0 ? QUESTIONS[room.currentQuestion] : null;
    if (q) {
      Object.values(room.participants).forEach((p) => {
        if (p.answered && p.lastAnswer !== undefined && !p.lastAnswerScored) {
          if (isCorrect(p.lastAnswer, q.correct, q.type)) p.score += 1;
          p.lastAnswerScored = true;
        }
      });
    }
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await redis.set(`room:${room.code}`, room, { ex: 60 * 60 * 8 });
  return NextResponse.json(publicRoom(room, true));
}

function isCorrect(answer: unknown, correct: unknown, type: string) {
  if (type === "multi") {
    const a = Array.isArray(answer) ? [...answer].sort() : [];
    const c = Array.isArray(correct) ? [...correct].sort() : [];
    return JSON.stringify(a) === JSON.stringify(c);
  }
  return answer === correct;
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = await req.json();
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const participantId = body.participantId || crypto.randomUUID();
  const existing = room.participants[participantId];
  room.participants[participantId] = {
    id: participantId,
    name: body.name.trim().slice(0, 30),
    score: existing?.score ?? 0,
    answered: existing?.answered ?? false,
    lastAnswer: existing?.lastAnswer,
    lastAnswerScored: existing?.lastAnswerScored,
  };

  await redis.set(`room:${room.code}`, room, { ex: 60 * 60 * 8 });
  return NextResponse.json({ participantId, room: publicRoom(room, false, participantId) });
}
