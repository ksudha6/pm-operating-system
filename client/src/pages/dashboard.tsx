import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Brain,
  MessageSquare,
  Briefcase,
  TrendingUp,
  Target,
  Clock,
  ArrowRight,
  BarChart3,
  Zap,
  Trophy,
} from "lucide-react";
import type { AptitudeAttempt, JobApplication, CaseSession } from "@shared/schema";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  testId,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  testId: string;
}) {
  return (
    <Card className="hover-elevate" data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight" data-testid={`${testId}-value`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-chart-3" />
            <span className="text-xs text-chart-3 font-medium">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleCard({
  title,
  description,
  icon: Icon,
  href,
  stats,
  accentColor,
  testId,
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
  stats?: string;
  accentColor: string;
  testId: string;
}) {
  return (
    <Card className="hover-elevate group" data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-md ${accentColor}`}>
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">{title}</h3>
                {stats && (
                  <p className="text-xs text-muted-foreground">{stats}</p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            <Link href={href}>
              <Button variant="ghost" size="sm" className="gap-1 -ml-2" data-testid={`${testId}-launch`}>
                Launch
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: attempts, isLoading: attemptsLoading } = useQuery<AptitudeAttempt[]>({
    queryKey: ["/api/aptitude/attempts"],
  });

  const { data: applications, isLoading: appsLoading } = useQuery<JobApplication[]>({
    queryKey: ["/api/career/applications"],
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<CaseSession[]>({
    queryKey: ["/api/cases/sessions"],
  });

  const completedAttempts = attempts?.filter((a) => a.status === "completed") || [];
  const totalQuestions = completedAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const totalCorrect = completedAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const activeApps = applications?.filter((a) => a.status === "active") || [];
  const screens = activeApps.filter((a) => ["screen", "onsite", "offer"].includes(a.stage)).length;
  const onsites = activeApps.filter((a) => ["onsite", "offer"].includes(a.stage)).length;
  const offers = activeApps.filter((a) => a.stage === "offer").length;

  const isLoading = attemptsLoading || appsLoading || sessionsLoading;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Your PM career at a glance. Track progress, sharpen skills, land roles.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Practice Questions"
            value={totalQuestions}
            subtitle={`${completedAttempts.length} sessions completed`}
            icon={Brain}
            testId="stat-questions"
          />
          <StatCard
            title="Accuracy"
            value={`${avgAccuracy}%`}
            subtitle={`${totalCorrect} correct answers`}
            icon={Target}
            trend={avgAccuracy > 70 ? "Above average" : undefined}
            testId="stat-accuracy"
          />
          <StatCard
            title="Case Sessions"
            value={sessions?.length || 0}
            subtitle="Total simulations run"
            icon={MessageSquare}
            testId="stat-cases"
          />
          <StatCard
            title="Active Applications"
            value={activeApps.length}
            subtitle={`${screens} screens, ${onsites} onsites, ${offers} offers`}
            icon={Briefcase}
            testId="stat-applications"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Modules</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ModuleCard
            title="PM Interview Gym"
            description="Sharpen your aptitude with AI-generated questions across quantitative reasoning, data interpretation, product analytics, and more."
            icon={Brain}
            href="/interview-gym"
            stats={completedAttempts.length > 0 ? `${completedAttempts.length} sessions` : "Start practicing"}
            accentColor="bg-chart-1"
            testId="module-gym"
          />
          <ModuleCard
            title="Case Simulator"
            description="Practice product cases with an AI interviewer. Choose from product sense, growth, monetization, retention, and AI strategy."
            icon={MessageSquare}
            href="/case-simulator"
            stats={sessions && sessions.length > 0 ? `${sessions.length} simulations` : "Begin simulating"}
            accentColor="bg-chart-2"
            testId="module-cases"
          />
          <ModuleCard
            title="Career Copilot"
            description="Track applications, monitor your pipeline, and get AI-powered insights on rejection patterns and improvement areas."
            icon={Briefcase}
            href="/career-copilot"
            stats={activeApps.length > 0 ? `${activeApps.length} active` : "Add applications"}
            accentColor="bg-chart-3"
            testId="module-career"
          />
        </div>
      </div>

      {completedAttempts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-chart-4" />
            <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {completedAttempts.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between gap-4 p-4" data-testid={`activity-${attempt.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-1/10">
                        <BarChart3 className="h-4 w-4 text-chart-1" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{attempt.category.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(attempt.createdAt).toLocaleDateString()} &middot; {attempt.totalQuestions} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {attempt.difficulty}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {attempt.totalQuestions > 0
                          ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
