import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, MessageSquare, Briefcase, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    id: "interview_gym",
    label: "PM Interview Gym",
    description: "AI-generated aptitude tests across 5 categories",
    icon: Brain,
  },
  {
    id: "case_simulator",
    label: "Case Simulator",
    description: "Practice with an AI interviewer in L6 and L7 modes",
    icon: MessageSquare,
  },
  {
    id: "career_copilot",
    label: "Career Copilot",
    description: "Track job applications with AI-powered insights",
    icon: Briefcase,
  },
];

export default function Onboarding() {
  const { user, updateProfileMutation } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [selectedModules, setSelectedModules] = useState<string[]>(
    (user?.selectedModules as string[]) || []
  );

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }
    if (selectedModules.length === 0) {
      toast({
        title: "Select at least one module",
        description: "Choose which modules you'd like to use.",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(
      { name: name.trim(), selectedModules },
      {
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-onboarding-title">
            Set Up Your Profile
          </h1>
          <p className="text-muted-foreground text-sm">
            Tell us about yourself and choose your modules
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Your Name
              </CardTitle>
              <CardDescription>How should we address you?</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
                required
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Choose Your Modules</CardTitle>
              <CardDescription>Select the tools you want to use (at least one)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MODULES.map((mod) => {
                const isSelected = selectedModules.includes(mod.id);
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    )}
                    data-testid={`button-module-${mod.id}`}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary/10" : "bg-muted"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium text-sm", isSelected && "text-primary")}>
                        {mod.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={updateProfileMutation.isPending || !name.trim() || selectedModules.length === 0}
            data-testid="button-complete-setup"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Complete Setup
          </Button>
        </form>
      </div>
    </div>
  );
}
