/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";

type Room = any;

function getInitialMode() {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname;
  if (path.startsWith("/host")) return "host";
  if (path.startsWith("/join")) return "join";
  return "home";
}

export default function QuizClient() {
  const [mode, setMode] = useState(getInitialMode());
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");

  if (mode === "host") return <HostView room={room} setRoom={setRoom} error={error} setError={setError} />;
  if (mode === "join") return <JoinView room={room} setRoom={setRoom} error={error} setError={setError} />;
  return <Home setMode={setMode} />;
}

function Home({ setMode }: { setMode: (m: string) => void }) {
  return (
    <main className="center-page">
      <div className="hero-card">
        <div className="eyebrow">NOURI’S 13TH BIRTHDAY</div>
        <h1>How Well Do You Know Nouri?</h1>
        <p className="lead">13 questions. One very important birthday. No peeking.</p>
        <button className="primary big" onClick={() => { history.pushState({}, "", "/host"); setMode("host"); }}>
          Host the Quiz
        </button>
        <button className="secondary big" onClick={() => { history.pushState({}, "", "/join"); setMode("join"); }}>
          Join a Quiz
        </button>
      </div>
    </main>
  );
}

function HostView({ room, setRoom, error, setError }: any) {
  const [creating, setCreating] = useState(false);
  const [hostToken, setHostToken] = useState("");
  const [qr, setQr] = useState("");

  async function createRoom() {
    setCreating(true); setError("");
    const res = await fetch("/api/rooms", { method: "POST" });
    const data = await res.json();
    localStorage.setItem("nouri-host-token", data.hostToken);
    localStorage.setItem("nouri-host-code", data.code);
    setHostToken(data.hostToken);
    await refresh(data.code, data.hostToken);
    setCreating(false);
  }

  async function refresh(code?: string, token?: string) {
    const c = code || room?.code || localStorage.getItem("nouri-host-code");
    const t = token || hostToken || localStorage.getItem("nouri-host-token");
    if (!c || !t) return;
    const res = await fetch(`/api/rooms/${c}?hostToken=${encodeURIComponent(t)}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data);
    const joinUrl = `${window.location.origin}/join?code=${c}`;
    const QRCode = await import("qrcode");
    setQr(await QRCode.toDataURL(joinUrl, { width: 420, margin: 2 }));
  }

  useEffect(() => {
    const token = localStorage.getItem("nouri-host-token");
    const code = localStorage.getItem("nouri-host-code");
    if (token && code) {
      setHostToken(token);
      refresh(code, token);
    }
  }, []);

  useEffect(() => {
    if (!room?.code) return;
    const timer = setInterval(() => refresh(), 1000);
    return () => clearInterval(timer);
  }, [room?.code, hostToken]);

  async function action(action: string) {
    setError("");
    const res = await fetch(`/api/rooms/${room.code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, hostToken }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Something went wrong.");
    setRoom(data);
  }

  if (!room) {
    return (
      <main className="center-page">
        <div className="hero-card">
          <div className="eyebrow">HOST</div>
          <h1>Nouri’s 13th Quiz</h1>
          <p className="lead">Create a room, put the QR code on the big screen, and let everyone join.</p>
          <button className="primary big" disabled={creating} onClick={createRoom}>
            {creating ? "Creating…" : "Create Quiz Room"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  const answered = room.participants.filter((p: any) => p.answered).length;
  const total = room.participants.length;
  const q = room.question;
  const isLast = room.currentQuestion === room.questionCount - 1;

  return (
    <main className="host-page">
      <header className="topbar">
        <div><span className="eyebrow">NOURI’S 13TH QUIZ</span><strong>HOST</strong></div>
        <div className="room-pill">ROOM <b>{room.code}</b></div>
      </header>

      {room.status === "lobby" && (
        <section className="host-grid lobby">
          <div className="qr-card">
            <h2>Scan to Join</h2>
            {qr && <img src={qr} alt={`QR code for room ${room.code}`} />}
            <div className="join-url">{window.location.origin}/join?code={room.code}</div>
            <div className="room-code">{room.code}</div>
            <p>Or type the room code on your phone.</p>
          </div>
          <div className="players-card">
            <h2>Players <span>{total}</span></h2>
            <PlayerList participants={room.participants} />
            <button className="primary big" disabled={total === 0} onClick={() => action("start")}>
              Start Quiz
            </button>
            {total === 0 && <p className="muted">Waiting for players…</p>}
          </div>
        </section>
      )}

      {room.status === "question" && q && (
        <section className="host-question">
          <div className="question-meta">
            <span>QUESTION {room.currentQuestion + 1} OF {room.questionCount}</span>
            <span>{answered} / {total} ANSWERED</span>
          </div>
          <div className="question-card">
            <h1>{q.text}</h1>
            <div className="host-choices">
              {q.choices.map((choice: string, i: number) => (
                <div key={choice} className={`host-choice ${room.answersRevealed && isChoiceCorrect(q.correct, i) ? "correct" : ""}`}>
                  <span>{letter(i)}</span>{choice}
                  {room.answersRevealed && isChoiceCorrect(q.correct, i) && <b>✓</b>}
                </div>
              ))}
            </div>
          </div>

          <div className="host-bottom">
            <div className="players-card compact">
              <h2>Players <span>{answered}/{total}</span></h2>
              <PlayerList participants={room.participants} showScores={room.answersRevealed} />
            </div>
            <div className="host-controls">
              {!room.answersRevealed ? (
                <button className="primary big" disabled={answered === 0} onClick={() => action("reveal")}>
                  Reveal Answer
                </button>
              ) : (
                <button className="primary big" onClick={() => action(isLast ? "finish" : "next")}>
                  {isLast ? "Show Final Scores" : "Next Question"}
                </button>
              )}
              <button className="secondary" onClick={() => action("finish")}>End Quiz Now</button>
              {error && <p className="error">{error}</p>}
            </div>
          </div>
        </section>
      )}

      {room.status === "finished" && (
        <section className="results-card">
          <div className="eyebrow">THAT’S A WRAP</div>
          <h1>Final Scores</h1>
          <Leaderboard participants={room.participants} />
          <button className="secondary" onClick={() => { localStorage.removeItem("nouri-host-code"); localStorage.removeItem("nouri-host-token"); location.reload(); }}>
            New Quiz Room
          </button>
        </section>
      )}
    </main>
  );
}

function JoinView({ room, setRoom, error, setError }: any) {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [code, setCode] = useState(params?.get("code")?.toUpperCase() || "");
  const [name, setName] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem("nouri-participant-id");
    const savedCode = localStorage.getItem("nouri-participant-code");
    if (savedId && savedCode === code) {
      setParticipantId(savedId);
      setJoined(true);
    }
  }, []);

  useEffect(() => {
    if (!joined || !code || !participantId) return;
    let active = true;
    async function poll() {
      const res = await fetch(`/api/rooms/${code}?participantId=${participantId}`, { cache: "no-store" });
      if (res.ok && active) setRoom(await res.json());
    }
    poll();
    const timer = setInterval(poll, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [joined, code, participantId]);

  async function join() {
    setError("");
    const res = await fetch(`/api/rooms/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, participantId: participantId || undefined }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Could not join.");
    localStorage.setItem("nouri-participant-id", data.participantId);
    localStorage.setItem("nouri-participant-code", code);
    setParticipantId(data.participantId);
    setRoom(data.room);
    setJoined(true);
  }

  async function answer(value: any) {
    setSelected(value);
    const res = await fetch(`/api/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, answer: value }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not submit answer.");
    else setRoom(data);
  }

  if (!joined) {
    return (
      <main className="center-page">
        <div className="hero-card">
          <div className="eyebrow">JOIN THE QUIZ</div>
          <h1>How Well Do You Know Nouri?</h1>
          <label>Room code</label>
          <input className="big-input code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCDE" maxLength={5} />
          <label>Your name</label>
          <input className="big-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouri, Alex, Grandma…" maxLength={30} />
          <button className="primary big" disabled={code.length !== 5 || !name.trim()} onClick={join}>Join Quiz</button>
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  if (!room) return <main className="center-page"><div className="hero-card"><div className="spinner">Waiting…</div></div></main>;

  if (room.status === "lobby") {
    return <main className="center-page"><div className="hero-card"><div className="eyebrow">YOU’RE IN</div><h1>Hey, {room.myParticipant?.name}!</h1><p className="lead">The host will start the quiz soon. Keep this screen open.</p><div className="waiting-dot" /><p>{room.participants.length} players are in the room.</p></div></main>;
  }

  if (room.status === "finished") {
    const me = room.myParticipant;
    return <main className="center-page"><div className="hero-card"><div className="eyebrow">FINAL SCORE</div><h1>{me?.score} / {room.questionCount}</h1><p className="lead">Nice work, {me?.name}!</p><Leaderboard participants={room.participants} /></div></main>;
  }

  const q = room.question;
  if (!q) return null;

  const hasAnswered = room.myParticipant?.answered;
  return (
    <main className="phone-page">
      <div className="phone-header">
        <span>Q{room.currentQuestion + 1}/{room.questionCount}</span>
        <span>{room.myParticipant?.score ?? 0} pts</span>
      </div>
      <div className="phone-question">
        <div className="eyebrow">NOURI’S 13TH QUIZ</div>
        <h1>{q.text}</h1>
      </div>
      <div className="answer-list">
        {q.choices.map((choice: string, i: number) => {
          const correct = room.answersRevealed && isChoiceCorrect(q.correct, i);
          const mine = Array.isArray(selected) ? selected.includes(i) : selected === i;
          return (
            <button
              key={choice}
              className={`answer-button ${mine ? "selected" : ""} ${correct ? "correct" : ""}`}
              disabled={hasAnswered || room.answersRevealed}
              onClick={() => answer(q.type === "multi" ? toggleMulti(selected, i) : q.type === "boolean" ? i === 0 : i)}
            >
              <span>{letter(i)}</span>
              <b>{choice}</b>
              {correct && <em>✓</em>}
            </button>
          );
        })}
      </div>
      {q.type === "multi" && !hasAnswered && (
        <button className="primary submit-multi" disabled={!Array.isArray(selected) || selected.length === 0} onClick={() => answer(selected)}>
          Submit Answer
        </button>
      )}
      {hasAnswered && !room.answersRevealed && <div className="waiting-card">Answer locked in. Waiting for the host…</div>}
      {room.answersRevealed && <div className="reveal-card">{isMyAnswerCorrect(room) ? "🎉 You got it!" : "Not this time!"}</div>}
      {error && <p className="error">{error}</p>}
    </main>
  );
}

function toggleMulti(selected: any, i: number) {
  const a = Array.isArray(selected) ? [...selected] : [];
  return a.includes(i) ? a.filter(x => x !== i) : [...a, i].sort();
}

function isChoiceCorrect(correct: any, i: number) {
  return Array.isArray(correct) ? correct.includes(i) : correct === i || (correct === true && i === 0) || (correct === false && i === 1);
}

function isMyAnswerCorrect(room: any) {
  const answer = room.myParticipant?.lastAnswer;
  const correct = room.question?.correct;
  if (Array.isArray(correct)) return JSON.stringify([...(answer || [])].sort()) === JSON.stringify([...correct].sort());
  return answer === correct;
}

function letter(i: number) {
  return String.fromCharCode(65 + i);
}

function PlayerList({ participants, showScores = false }: { participants: any[]; showScores?: boolean }) {
  return (
    <div className="player-list">
      {participants.length === 0 && <div className="muted">No players yet.</div>}
      {participants.map((p) => (
        <div className="player-row" key={p.id}>
          <span className={`status-dot ${p.answered ? "done" : ""}`} />
          <span>{p.name}</span>
          <small>{showScores ? `${p.score} pts` : p.answered ? "answered" : "thinking…"}</small>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ participants }: { participants: any[] }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  return <div className="leaderboard">{sorted.map((p, i) => <div className="leader-row" key={p.id}><strong>{i + 1}</strong><span>{p.name}</span><b>{p.score}</b></div>)}</div>;
}
