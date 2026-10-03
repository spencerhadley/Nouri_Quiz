import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { QUESTIONS } from "@/lib/questions";
import { createRoomCode, createId } from "@/lib/room";

const redis = Redis.fromEnv();

export async function POST() {
  const code = createRoomCode();
  const hostToken = createId();
  const room = {
    code,
    hostToken,
    status: "lobby",
    currentQuestion: -1,
    answersRevealed: false,
    createdAt: Date.now(),
    participants: {} as Record<string, { id: string; name: string; score: number; answered: boolean; lastAnswer?: number | boolean | number[] }>,
    questionCount: QUESTIONS.length,
  };

  await redis.set(`room:${code}`, room, { ex: 60 * 60 * 8 });
  return NextResponse.json({ code, hostToken });
}
