import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, KeyRound, ArrowRight, Loader2, BarChart3 } from "lucide-react";

export default function AuthPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const { loginMutation, verifyOtpMutation } = useAuth();
  const { toast } = useToast();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    loginMutation.mutate(email, {
      onSuccess: (data: any) => {
        setStep("otp");
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        toast({
          title: "Verification code sent",
          description: "Check your email for the 6-digit code.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    verifyOtpMutation.mutate(
      { email, code: otp },
      {
        onError: (err: any) => {
          toast({
            title: "Verification failed",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-app-title">
            PM Operating System
          </h1>
          <p className="text-muted-foreground text-sm">
            Your AI-powered platform for PM interviews, case practice, and career management
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {step === "email" ? "Sign in to your account" : "Enter verification code"}
            </CardTitle>
            <CardDescription>
              {step === "email"
                ? "Enter your email to receive a one-time code"
                : `We sent a 6-digit code to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    data-testid="input-email"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending || !email}
                  data-testid="button-send-otp"
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Continue with Email
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {devOtp && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Development Mode — Your code:</p>
                    <p className="text-2xl font-mono font-bold tracking-[0.3em] text-primary" data-testid="text-dev-otp">
                      {devOtp}
                    </p>
                  </div>
                )}
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 text-center text-lg tracking-[0.3em] font-mono"
                    maxLength={6}
                    data-testid="input-otp"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyOtpMutation.isPending || otp.length !== 6}
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="w-4 h-4 mr-2" />
                  )}
                  Verify & Sign In
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setDevOtp(null);
                  }}
                  data-testid="button-back-to-email"
                >
                  Use a different email
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to use PM OS for your interview preparation.
        </p>
      </div>
    </div>
  );
}
