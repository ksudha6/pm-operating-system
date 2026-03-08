import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Target,
  TrendingUp,
  BarChart3,
  Loader2,
} from "lucide-react";
import type { AptitudeAttempt, AptitudeAnswer } from "@shared/schema";

const CATEGORIES = [
  { value: "quantitative_reasoning", label: "Quantitative Reasoning" },
  { value: "data_interpretation", label: "Data Interpretation" },
  { value: "product_analytics", label: "Product Analytics" },
  { value: "root_cause_analysis", label: "Root Cause Analysis" },
  { value: "product_sense", label: "Product Sense" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "very_hard", label: "Very Hard" },
];

type QuestionData = {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

function TestSetup({ onStart }: { onStart: (category: string, difficulty: string) => void }) {
  const [category, setCategory] = useState("quantitative_reasoning");
  const [difficulty, setDifficulty] = useState("medium");

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Start Practice Session</h2>
        <p className="text-sm text-muted-foreground">
          AI-generated questions tailored to your selected category and difficulty.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} data-testid={`option-category-${c.value}`}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger data-testid="select-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d.value} value={d.value} data-testid={`option-difficulty-${d.value}`}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md bg-muted/50">
            <Clock className="h-4 w-4 shrink-0" />
            <span>10 questions &middot; 10 minute time limit</span>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => onStart(category, difficulty)}
            data-testid="button-start-test"
          >
            <Play className="h-4 w-4" />
            Start Practice
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveTest({
  attempt,
  questions,
  onComplete,
}: {
  attempt: AptitudeAttempt;
  questions: AptitudeAnswer[];
  onComplete: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(attempt.timeLimitSeconds);
  const { toast } = useToast();

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = questions.filter((q) => q.selectedAnswer !== null).length;

  const submitMutation = useMutation({
    mutationFn: async (data: { answerId: number; selectedAnswer: number }) => {
      const res = await apiRequest("POST", `/api/aptitude/answers/${data.answerId}/submit`, {
        selectedAnswer: data.selectedAnswer,
      });
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aptitude/attempts"] });
      setShowExplanation(true);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/aptitude/attempts/${attempt.id}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aptitude/attempts"] });
      onComplete();
    },
  });

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    submitMutation.mutate({
      answerId: currentQuestion.id,
      selectedAnswer,
    });
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeMutation.mutate();
    }
  };

  if (!currentQuestion) return null;

  const options = currentQuestion.options as string[];
  const isCorrect = currentQuestion.selectedAnswer !== null
    ? currentQuestion.selectedAnswer === currentQuestion.correctAnswer
    : selectedAnswer === currentQuestion.correctAnswer;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs capitalize">
              {attempt.category.replace(/_/g, " ")}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {attempt.difficulty}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums" data-testid="text-answered-count">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
      </div>

      <Progress value={progress} className="h-1.5" data-testid="progress-test" />

      <Card>
        <CardContent className="p-6 space-y-6">
          <p className="text-base leading-relaxed font-medium" data-testid="text-question">
            {currentQuestion.questionText}
          </p>

          <div className="space-y-2">
            {options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isAnswered = showExplanation;
              const isOptionCorrect = index === currentQuestion.correctAnswer;
              let optionClass = "border p-3 rounded-md cursor-pointer text-sm transition-colors";

              if (isAnswered) {
                if (isOptionCorrect) {
                  optionClass += " border-chart-3 bg-chart-3/10";
                } else if (isSelected && !isOptionCorrect) {
                  optionClass += " border-destructive bg-destructive/10";
                } else {
                  optionClass += " opacity-50";
                }
              } else {
                optionClass += isSelected
                  ? " border-primary bg-primary/5"
                  : " hover-elevate";
              }

              return (
                <div
                  key={index}
                  className={optionClass}
                  onClick={() => !isAnswered && setSelectedAnswer(index)}
                  data-testid={`option-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="pt-0.5">{option}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {showExplanation && (
            <div className="p-4 rounded-md bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-chart-3" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {isCorrect ? "Correct!" : "Incorrect"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {!showExplanation ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null || submitMutation.isPending}
                data-testid="button-submit-answer"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-1" data-testid="button-next-question">
                {currentIndex < questions.length - 1 ? (
                  <>
                    Next <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Complete Test
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TestHistory() {
  const { data: attempts, isLoading } = useQuery<AptitudeAttempt[]>({
    queryKey: ["/api/aptitude/attempts"],
  });

  const completedAttempts = attempts?.filter((a) => a.status === "completed") || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (completedAttempts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No completed sessions yet. Start practicing to see your history.</p>
        </CardContent>
      </Card>
    );
  }

  const totalQuestions = completedAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const totalCorrect = completedAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const categoryStats = completedAttempts.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = { total: 0, correct: 0, count: 0 };
    acc[a.category].total += a.totalQuestions;
    acc[a.category].correct += a.correctAnswers;
    acc[a.category].count += 1;
    return acc;
  }, {} as Record<string, { total: number; correct: number; count: number }>);

  const weakest = Object.entries(categoryStats).sort(
    ([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total)
  )[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Accuracy</p>
            <p className="text-xl font-bold" data-testid="text-overall-accuracy">{avgAccuracy}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sessions</p>
            <p className="text-xl font-bold">{completedAttempts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Questions Solved</p>
            <p className="text-xl font-bold">{totalQuestions}</p>
          </CardContent>
        </Card>
        {weakest && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Weakest Topic</p>
              <p className="text-sm font-bold capitalize">{weakest[0].replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round((weakest[1].correct / weakest[1].total) * 100)}% accuracy
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Session History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {completedAttempts.slice(0, 10).map((attempt) => {
              const accuracy = attempt.totalQuestions > 0
                ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
                : 0;
              return (
                <div key={attempt.id} className="flex items-center justify-between gap-4 px-6 py-3" data-testid={`history-${attempt.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${accuracy >= 70 ? "bg-chart-3" : accuracy >= 50 ? "bg-chart-4" : "bg-destructive"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{attempt.category.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary" className="text-xs capitalize">{attempt.difficulty}</Badge>
                    <span className="text-sm font-semibold tabular-nums w-10 text-right">{accuracy}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InterviewGym() {
  const [mode, setMode] = useState<"setup" | "active" | "history">("setup");
  const [activeAttempt, setActiveAttempt] = useState<AptitudeAttempt | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<AptitudeAnswer[]>([]);
  const { toast } = useToast();

  const startMutation = useMutation({
    mutationFn: async (data: { category: string; difficulty: string }) => {
      const res = await apiRequest("POST", "/api/aptitude/start", data);
      return res.json();
    },
    onSuccess: (data: { attempt: AptitudeAttempt; questions: AptitudeAnswer[] }) => {
      setActiveAttempt(data.attempt);
      setActiveQuestions(data.questions);
      setMode("active");
    },
    onError: (err) => {
      toast({
        title: "Failed to start test",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-gym-title">
            PM Interview Gym
          </h1>
          <p className="text-sm text-muted-foreground">
            Sharpen your aptitude with AI-generated practice questions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "setup" ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode("setup")}
            data-testid="button-new-test"
          >
            <Play className="h-4 w-4 mr-1" />
            New Test
          </Button>
          <Button
            variant={mode === "history" ? "default" : "secondary"}
            size="sm"
            onClick={() => setMode("history")}
            data-testid="button-history"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            History
          </Button>
        </div>
      </div>

      {startMutation.isPending && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating AI-powered questions...</p>
          </CardContent>
        </Card>
      )}

      {!startMutation.isPending && mode === "setup" && (
        <TestSetup onStart={(category, difficulty) => startMutation.mutate({ category, difficulty })} />
      )}

      {mode === "active" && activeAttempt && (
        <ActiveTest
          attempt={activeAttempt}
          questions={activeQuestions}
          onComplete={() => {
            setMode("history");
            setActiveAttempt(null);
            setActiveQuestions([]);
          }}
        />
      )}

      {mode === "history" && <TestHistory />}
    </div>
  );
}
