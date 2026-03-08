import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import {
  Briefcase,
  Plus,
  ExternalLink,
  Loader2,
  Trash2,
  Edit,
  TrendingUp,
  Target,
  BarChart3,
  Send,
  Sparkles,
  ArrowUpRight,
  Building2,
  Calendar,
} from "lucide-react";
import type { JobApplication } from "@shared/schema";

const STAGES = [
  { value: "applied", label: "Applied", color: "bg-chart-1" },
  { value: "screen", label: "Screen", color: "bg-chart-4" },
  { value: "onsite", label: "Onsite", color: "bg-chart-2" },
  { value: "offer", label: "Offer", color: "bg-chart-3" },
  { value: "rejected", label: "Rejected", color: "bg-destructive" },
];

const applicationFormSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  url: z.string().optional(),
  salaryRange: z.string().optional(),
  stage: z.string().default("applied"),
  status: z.string().default("active"),
  notes: z.string().optional(),
  recruiterFeedback: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationFormSchema>;

function StatsOverview({ applications }: { applications: JobApplication[] }) {
  const active = applications.filter((a) => a.status === "active");
  const applied = active.length;
  const screens = active.filter((a) => ["screen", "onsite", "offer"].includes(a.stage)).length;
  const onsites = active.filter((a) => ["onsite", "offer"].includes(a.stage)).length;
  const offers = active.filter((a) => a.stage === "offer").length;
  const rejected = applications.filter((a) => a.stage === "rejected").length;
  const offerRate = applied > 0 ? Math.round((offers / applied) * 100) : 0;

  const stats = [
    { label: "Applied", value: applied, icon: Send, color: "text-chart-1" },
    { label: "Screens", value: screens, icon: Target, color: "text-chart-4" },
    { label: "Onsites", value: onsites, icon: Building2, color: "text-chart-2" },
    { label: "Offers", value: offers, icon: TrendingUp, color: "text-chart-3" },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} data-testid={`stat-${stat.label.toLowerCase()}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApplicationForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<ApplicationFormData>;
  onSubmit: (data: ApplicationFormData) => void;
  isPending: boolean;
}) {
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      company: "",
      role: "",
      url: "",
      salaryRange: "",
      stage: "applied",
      status: "active",
      notes: "",
      recruiterFeedback: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Google" {...field} data-testid="input-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Senior PM" {...field} data-testid="input-role" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} data-testid="input-url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary Range</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. $200k-$250k" {...field} data-testid="input-salary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-stage">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any notes about this application..." {...field} data-testid="input-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recruiterFeedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recruiter Feedback</FormLabel>
              <FormControl>
                <Textarea placeholder="Feedback received from recruiter..." {...field} data-testid="input-feedback" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full" data-testid="button-submit-application">
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {defaultValues?.company ? "Update Application" : "Add Application"}
        </Button>
      </form>
    </Form>
  );
}

function ApplicationCard({
  app,
  onEdit,
  onDelete,
  onUpdateStage,
}: {
  app: JobApplication;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStage: (stage: string) => void;
}) {
  const stageInfo = STAGES.find((s) => s.value === app.stage);

  return (
    <Card className="hover-elevate" data-testid={`app-card-${app.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate" data-testid={`text-company-${app.id}`}>{app.company}</h3>
              {app.url && (
                <a href={app.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{app.role}</p>
            {app.salaryRange && (
              <p className="text-xs text-muted-foreground">{app.salaryRange}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(app.appliedDate).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Select value={app.stage} onValueChange={onUpdateStage}>
              <SelectTrigger className="h-7 text-xs w-24" data-testid={`select-stage-${app.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={onEdit} className="h-7 w-7" data-testid={`button-edit-${app.id}`}>
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onDelete} className="h-7 w-7" data-testid={`button-delete-${app.id}`}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
        {app.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{app.notes}</p>
        )}
        {app.recruiterFeedback && (
          <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <span className="font-medium">Feedback: </span>
            {app.recruiterFeedback}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIInsights({ applications }: { applications: JobApplication[] }) {
  const [insights, setInsights] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getInsights = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/career/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to get insights");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

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
              fullContent += event.content;
              setInsights(fullContent);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-chart-4" />
            <CardTitle className="text-sm font-medium">AI Career Insights</CardTitle>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={getInsights}
            disabled={isLoading || applications.length === 0}
            data-testid="button-get-insights"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            Analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-insights">
            {insights}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {applications.length === 0
              ? "Add some applications first, then get AI-powered insights on patterns and improvement areas."
              : "Click Analyze to get AI insights on your application patterns, rejection trends, and improvement suggestions."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CareerCopilot() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");
  const { toast } = useToast();

  const { data: applications, isLoading } = useQuery<JobApplication[]>({
    queryKey: ["/api/career/applications"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const res = await apiRequest("POST", "/api/career/applications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career/applications"] });
      setDialogOpen(false);
      toast({ title: "Application added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ApplicationFormData> }) => {
      const res = await apiRequest("PATCH", `/api/career/applications/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career/applications"] });
      setDialogOpen(false);
      setEditingApp(null);
      toast({ title: "Application updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/career/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/career/applications"] });
      toast({ title: "Application deleted" });
    },
  });

  const filteredApps = applications?.filter((a) =>
    filterStage === "all" ? true : a.stage === filterStage
  ) || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-career-title">
            Career Copilot
          </h1>
          <p className="text-sm text-muted-foreground">
            Track applications, monitor your pipeline, and get AI-powered insights.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingApp(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-1" data-testid="button-add-application">
              <Plus className="h-4 w-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingApp ? "Edit Application" : "Add Application"}</DialogTitle>
            </DialogHeader>
            <ApplicationForm
              defaultValues={editingApp ? {
                company: editingApp.company,
                role: editingApp.role,
                url: editingApp.url || "",
                salaryRange: editingApp.salaryRange || "",
                stage: editingApp.stage,
                status: editingApp.status,
                notes: editingApp.notes || "",
                recruiterFeedback: editingApp.recruiterFeedback || "",
              } : undefined}
              onSubmit={(data) => {
                if (editingApp) {
                  updateMutation.mutate({ id: editingApp.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <StatsOverview applications={applications || []} />
      )}

      <AIInsights applications={applications || []} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Applications</h2>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-32" data-testid="select-filter-stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {applications?.length === 0
                  ? "No applications yet. Add your first one to start tracking."
                  : "No applications match this filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredApps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onEdit={() => { setEditingApp(app); setDialogOpen(true); }}
                onDelete={() => deleteMutation.mutate(app.id)}
                onUpdateStage={(stage) => updateMutation.mutate({ id: app.id, data: { stage } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
