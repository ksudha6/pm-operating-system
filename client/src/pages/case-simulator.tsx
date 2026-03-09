import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Plus,
  Loader2,
  User,
  Bot,
  Trophy,
  Clock,
  ArrowRight,
  History,
  Sparkles,
  Timer,
} from "lucide-react";
import type { CaseSession, CaseMessage } from "@shared/schema";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CaseCountdownTimer({
  totalSeconds,
  createdAt,
  onExpire,
}: {
  totalSeconds: number;
  createdAt: string;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  });
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          setTimeout(() => onExpire(), 0);
          return 0;
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onExpire]);

  const isUrgent = remaining <= 120;
  const isWarning = remaining <= 300 && remaining > 120;
  const pct = (remaining / totalSeconds) * 100;

  return (
    <div className="flex items-center gap-2" data-testid="case-timer-countdown">
      <Timer className={`h-4 w-4 ${isUrgent ? "text-destructive animate-pulse" : isWarning ? "text-yellow-500" : "text-muted-foreground"}`} />
      <span className={`text-sm font-mono font-semibold tabular-nums ${isUrgent ? "text-destructive" : isWarning ? "text-yellow-500" : ""}`}>
        {formatTime(remaining)}
      </span>
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const CASE_TYPES = [
  { value: "product_sense", label: "Product Sense" },
  { value: "growth", label: "Growth" },
  { value: "monetization", label: "Monetization" },
  { value: "retention", label: "Retention" },
  { value: "ai_strategy", label: "AI Integration Strategy" },
];

const MODES = [
  { value: "L6", label: "L6 Mode", description: "Senior PM interview questions" },
  { value: "L7", label: "L7 Director Mode", description: "Org design, vision, stakeholder conflicts" },
];

function CaseSetup({ onStart }: { onStart: (caseType: string, mode: string) => void }) {
  const [caseType, setCaseType] = useState("product_sense");
  const [mode, setMode] = useState("L6");

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-chart-2/10">
            <MessageSquare className="h-7 w-7 text-chart-2" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight">New Case Session</h2>
        <p className="text-sm text-muted-foreground">
          Practice with an AI interviewer who challenges your thinking.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Case Type</label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger data-testid="select-case-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value} data-testid={`option-case-${c.value}`}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Interview Level</label>
            <div className="grid grid-cols-2 gap-3">
              {MODES.map((m) => (
                <div
                  key={m.value}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    mode === m.value
                      ? "border-primary bg-primary/5"
                      : "hover-elevate"
                  }`}
                  onClick={() => setMode(m.value)}
                  data-testid={`option-mode-${m.value}`}
                >
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                </div>
              ))}
            </div>
          </div>

          {mode === "L7" && (
            <div className="p-3 rounded-md bg-chart-2/10 text-sm text-chart-2 space-y-1">
              <p className="font-medium">Director Mode includes:</p>
              <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
                <li>Org design questions</li>
                <li>Vision & strategy questions</li>
                <li>Stakeholder conflict scenarios</li>
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md bg-muted/50">
            <Clock className="h-4 w-4 shrink-0" />
            <span>30 minute time limit &middot; Agoda PM standard</span>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => onStart(caseType, mode)}
            data-testid="button-start-case"
          >
            <Sparkles className="h-4 w-4" />
            Begin Interview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatInterface({ session, onTimerExpire }: { session: CaseSession; onTimerExpire: () => void }) {
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messagesData, isLoading } = useQuery<CaseMessage[]>({
    queryKey: ["/api/cases/sessions", session.id, "messages"],
  });

  const messages = messagesData || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const content = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const res = await fetch(`/api/cases/sessions/${session.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              fullResponse += event.content;
              setStreamingContent(fullResponse);
            }
            if (event.done) {
              setStreamingContent("");
              setIsStreaming(false);
              queryClient.invalidateQueries({ queryKey: ["/api/cases/sessions", session.id, "messages"] });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const endMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cases/sessions/${session.id}/end`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases/sessions", session.id, "messages"] });
      toast({ title: "Session ended", description: "Feedback has been generated." });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs capitalize">
            {session.caseType.replace(/_/g, " ")}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {session.mode}
          </Badge>
          <Badge variant={session.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
            {session.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {session.status === "active" && (
            <CaseCountdownTimer
              totalSeconds={session.timeLimitSeconds}
              createdAt={session.createdAt as unknown as string}
              onExpire={onTimerExpire}
            />
          )}
          {session.status === "active" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => endMutation.mutate()}
              disabled={endMutation.isPending}
              data-testid="button-end-session"
            >
              {endMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              End & Get Feedback
            </Button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-3/4" />
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.id}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-2/10">
                    <Bot className="h-3.5 w-3.5 text-chart-2" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            {streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-2/10">
                  <Bot className="h-3.5 w-3.5 text-chart-2" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed bg-card border">
                  <p className="whitespace-pre-wrap">{streamingContent}</p>
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chart-2/10">
                  <Bot className="h-3.5 w-3.5 text-chart-2" />
                </div>
                <div className="rounded-lg px-4 py-2.5 bg-card border">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </>
        )}

        {session.feedback && (
          <Card className="mt-4">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-chart-4" />
                <p className="text-sm font-semibold">Session Feedback</p>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {session.feedback}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {session.status === "active" && (
        <div className="pt-3 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isStreaming}
              data-testid="input-case-message"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionHistory({ onSelect }: { onSelect: (session: CaseSession) => void }) {
  const { data: sessions, isLoading } = useQuery<CaseSession[]>({
    queryKey: ["/api/cases/sessions"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <History className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No sessions yet. Start your first case simulation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Past Sessions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-4 px-6 py-3 cursor-pointer hover-elevate"
              onClick={() => onSelect(session)}
              data-testid={`session-${session.id}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2 w-2 rounded-full shrink-0 ${session.status === "active" ? "bg-chart-3" : "bg-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize truncate">
                    {session.caseType.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.createdAt).toLocaleDateString()} &middot; {session.mode}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={session.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                  {session.status}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CaseSimulator() {
  const [mode, setMode] = useState<"setup" | "chat" | "history">("setup");
  const [activeSession, setActiveSession] = useState<CaseSession | null>(null);
  const { toast } = useToast();

  const startMutation = useMutation({
    mutationFn: async (data: { caseType: string; mode: string }) => {
      const res = await apiRequest("POST", "/api/cases/start", data);
      return res.json();
    },
    onSuccess: (data: CaseSession) => {
      setActiveSession(data);
      setMode("chat");
      queryClient.invalidateQueries({ queryKey: ["/api/cases/sessions"] });
    },
    onError: (err) => {
      toast({ title: "Failed to start session", description: err.message, variant: "destructive" });
    },
  });

  const handleSelectSession = (session: CaseSession) => {
    setActiveSession(session);
    setMode("chat");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-case-title">
            Case Simulator
          </h1>
          <p className="text-sm text-muted-foreground">
            Practice product cases with an AI interviewer.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "setup" ? "default" : "secondary"}
            size="sm"
            onClick={() => { setMode("setup"); setActiveSession(null); }}
            data-testid="button-new-case"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Case
          </Button>
          <Button
            variant={mode === "history" ? "default" : "secondary"}
            size="sm"
            onClick={() => { setMode("history"); setActiveSession(null); }}
            data-testid="button-case-history"
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
        </div>
      </div>

      {startMutation.isPending && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-chart-2" />
            <p className="text-sm text-muted-foreground">Setting up your interview...</p>
          </CardContent>
        </Card>
      )}

      {!startMutation.isPending && mode === "setup" && (
        <CaseSetup onStart={(caseType, caseMode) => startMutation.mutate({ caseType, mode: caseMode })} />
      )}

      {mode === "chat" && activeSession && (
        <ChatInterface
          session={activeSession}
          onTimerExpire={() => {
            toast({
              title: "Time's up!",
              description: "Your case session has been automatically ended. Feedback is being generated.",
              variant: "destructive",
            });
            apiRequest("POST", `/api/cases/sessions/${activeSession.id}/end`)
              .then((res) => res.json())
              .then((updated) => {
                setActiveSession(updated);
                queryClient.invalidateQueries({ queryKey: ["/api/cases/sessions"] });
                queryClient.invalidateQueries({ queryKey: ["/api/cases/sessions", activeSession.id, "messages"] });
              });
          }}
        />
      )}

      {mode === "history" && <SessionHistory onSelect={handleSelectSession} />}
    </div>
  );
}
