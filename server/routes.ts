import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== AUTH ROUTES =====

  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      await storage.invalidateOtpsForEmail(email);

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createOtpCode({
        email: email.toLowerCase(),
        code,
        expiresAt,
        used: false,
      });

      console.log(`[OTP] Code for ${email}: ${code}`);

      res.json({
        message: "OTP sent successfully",
        devOtp: code,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Email and OTP code are required" });
      }

      const otp = await storage.getValidOtp(email, code);
      if (!otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      await storage.markOtpUsed(otp.id);

      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          email: email.toLowerCase(),
          name: null,
          avatarUrl: null,
          selectedModules: [],
          onboardingComplete: false,
        });
      }

      req.session.userId = user.id;

      res.json({ user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/google", (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }

    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauthState = state;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Failed to initialize auth" });
      }
      res.redirect(googleUrl);
    });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error("Google OAuth error:", error);
        return res.redirect("/?error=google_denied");
      }

      if (!code) {
        return res.redirect("/?error=no_code");
      }

      if (state && req.session.oauthState && state !== req.session.oauthState) {
        return res.redirect("/?error=invalid_state");
      }
      delete req.session.oauthState;

      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) {
        console.error("Google token error:", tokenData);
        return res.redirect("/?error=token_failed");
      }

      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await userInfoRes.json() as any;

      if (!googleUser.email) {
        return res.redirect("/?error=no_email");
      }

      let user = await storage.getUserByEmail(googleUser.email);
      if (!user) {
        user = await storage.createUser({
          email: googleUser.email.toLowerCase(),
          name: googleUser.name || null,
          avatarUrl: googleUser.picture || null,
          selectedModules: [],
          onboardingComplete: false,
        });
      } else if (googleUser.picture && !user.avatarUrl) {
        user = await storage.updateUser(user.id, { avatarUrl: googleUser.picture });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error after Google auth:", err);
          return res.redirect("/?error=session_error");
        }
        res.redirect("/");
      });
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      res.redirect("/?error=google_auth_failed");
    }
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { name, selectedModules } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name;
      if (selectedModules !== undefined) {
        updates.selectedModules = selectedModules;
        updates.onboardingComplete = true;
      }

      const user = await storage.updateUser(req.session.userId!, updates);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== APTITUDE ROUTES =====

  app.get("/api/aptitude/attempts", requireAuth, async (req, res) => {
    try {
      const attempts = await storage.getAptitudeAttempts(req.session.userId);
      res.json(attempts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/aptitude/start", requireAuth, async (req, res) => {
    try {
      const { category, difficulty } = req.body;

      const timeLimits: Record<string, number> = {
        easy: 1200,
        medium: 900,
        hard: 720,
        very_hard: 600,
      };
      const timeLimitSeconds = timeLimits[difficulty] || 900;

      const attempt = await storage.createAptitudeAttempt({
        category,
        difficulty,
        userId: req.session.userId,
        totalQuestions: 10,
        correctAnswers: 0,
        timeSpentSeconds: 0,
        timeLimitSeconds,
        status: "in_progress",
      });

      const prompt = buildAptitudePrompt(category, difficulty);
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { questions: [] };
      }

      const questions = parsed.questions || [];
      const answers = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let correctedAnswer = q.correctAnswer ?? 0;

        if (q.explanation && q.options) {
          const explanation = q.explanation.toLowerCase();
          const optionLetterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
          const mentionPatterns = [
            /(?:correct answer|answer is|matches option|therefore option|the answer is)\s*(?:option\s*)?([abcd])\b/i,
            /option\s+([abcd])\s*(?:is correct|is the correct|is right)/i,
            /\b([abcd])\s*(?:is the correct|is correct)/i,
          ];
          for (const pattern of mentionPatterns) {
            const match = q.explanation.match(pattern);
            if (match) {
              const mentionedIndex = optionLetterMap[match[1].toLowerCase()];
              if (mentionedIndex !== undefined && mentionedIndex !== correctedAnswer) {
                console.log(`Corrected answer for Q${i + 1}: AI said index ${correctedAnswer} but explanation references option ${match[1].toUpperCase()} (index ${mentionedIndex})`);
                correctedAnswer = mentionedIndex;
              }
              break;
            }
          }
        }

        const answer = await storage.createAptitudeAnswer({
          attemptId: attempt.id,
          questionText: q.question || q.questionText || "",
          options: q.options || [],
          correctAnswer: correctedAnswer,
          selectedAnswer: null,
          isCorrect: null,
          timeSpentSeconds: 0,
          category,
          difficulty,
          explanation: q.explanation || "",
          questionIndex: i,
        });
        answers.push(answer);
      }

      res.json({ attempt, questions: answers });
    } catch (err: any) {
      console.error("Error starting aptitude test:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/aptitude/answers/:id/submit", requireAuth, async (req, res) => {
    try {
      const answerId = parseInt(req.params.id);
      const { selectedAnswer } = req.body;

      if (typeof selectedAnswer !== "number") {
        return res.status(400).json({ error: "selectedAnswer must be a number" });
      }

      const existing = await storage.getAptitudeAnswer(answerId);
      if (!existing) {
        return res.status(404).json({ error: "Answer not found" });
      }

      const attempt = await storage.getAptitudeAttempt(existing.attemptId);
      if (!attempt || attempt.userId !== req.session.userId) {
        return res.status(404).json({ error: "Answer not found" });
      }

      if (attempt.status !== "in_progress") {
        return res.status(400).json({ error: "Test already completed" });
      }

      const elapsed = Math.floor((Date.now() - new Date(attempt.createdAt).getTime()) / 1000);
      if (elapsed > attempt.timeLimitSeconds) {
        await storage.updateAptitudeAttempt(attempt.id, { status: "completed" });
        return res.status(400).json({ error: "Time limit exceeded" });
      }

      if (existing.selectedAnswer !== null) {
        return res.status(400).json({ error: "Answer already submitted" });
      }

      const isCorrect = selectedAnswer === existing.correctAnswer;
      const updated = await storage.updateAptitudeAnswer(answerId, {
        selectedAnswer,
        isCorrect,
      });

      if (isCorrect) {
        const attempt = await storage.getAptitudeAttempt(updated.attemptId);
        if (attempt) {
          await storage.updateAptitudeAttempt(attempt.id, {
            correctAnswers: attempt.correctAnswers + 1,
          });
        }
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/aptitude/attempts/:id/complete", requireAuth, async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const existing = await storage.getAptitudeAttempt(attemptId);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Attempt not found" });
      }
      const updated = await storage.updateAptitudeAttempt(attemptId, {
        status: "completed",
        completedAt: new Date(),
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== CASE SIMULATOR ROUTES =====

  app.get("/api/cases/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getCaseSessions(req.session.userId);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/cases/sessions/:id/messages", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getCaseSession(sessionId);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Session not found" });
      }
      const messages = await storage.getCaseMessagesBySession(sessionId);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cases/start", requireAuth, async (req, res) => {
    try {
      const { caseType, mode } = req.body;

      const timeLimitSeconds = 1800;

      const session = await storage.createCaseSession({
        caseType,
        mode,
        userId: req.session.userId,
        status: "active",
        timeLimitSeconds,
        feedback: null,
      });

      const systemPrompt = buildCaseSystemPrompt(caseType, mode);
      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Start the interview. Ask your first question." },
        ],
        max_completion_tokens: 2048,
      });

      const firstQuestion = completion.choices[0]?.message?.content || "";

      await storage.createCaseMessage({
        sessionId: session.id,
        role: "assistant",
        content: firstQuestion,
      });

      const updatedSession = await storage.getCaseSession(session.id);
      res.json(updatedSession);
    } catch (err: any) {
      console.error("Error starting case session:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cases/sessions/:id/messages", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { content } = req.body;

      const session = await storage.getCaseSession(sessionId);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session already ended" });
      }

      const elapsed = Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 1000);
      if (elapsed > session.timeLimitSeconds) {
        await storage.updateCaseSession(sessionId, { status: "completed" });
        return res.status(400).json({ error: "Time limit exceeded" });
      }

      await storage.createCaseMessage({
        sessionId,
        role: "user",
        content,
      });

      const allMessages = await storage.getCaseMessagesBySession(sessionId);
      const systemPrompt = buildCaseSystemPrompt(session.caseType, session.mode);

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...allMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      await storage.createCaseMessage({
        sessionId,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Error in case chat:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api/cases/sessions/:id/end", requireAuth, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getCaseSession(sessionId);
      if (!session || session.userId !== req.session.userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const allMessages = await storage.getCaseMessagesBySession(sessionId);

      const feedbackPrompt = `You are a senior PM interviewer. Based on the following case interview conversation, provide detailed feedback on the candidate's performance. Include:
1. Overall assessment (strong/moderate/needs improvement)
2. What they did well
3. Areas for improvement
4. Specific suggestions for next steps
5. A score out of 10

Here is the conversation:
${allMessages.map((m) => `${m.role}: ${m.content}`).join("\n\n")}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: feedbackPrompt }],
        max_completion_tokens: 2048,
      });

      const feedback = completion.choices[0]?.message?.content || "";

      const updated = await storage.updateCaseSession(sessionId, {
        status: "completed",
        feedback,
        completedAt: new Date(),
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== CAREER COPILOT ROUTES =====

  app.get("/api/career/applications", requireAuth, async (req, res) => {
    try {
      const applications = await storage.getJobApplications(req.session.userId);
      res.json(applications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/career/applications", requireAuth, async (req, res) => {
    try {
      const app = await storage.createJobApplication({ ...req.body, userId: req.session.userId });
      res.json(app);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/career/applications/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getJobApplication(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Application not found" });
      }
      const updated = await storage.updateJobApplication(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/career/applications/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getJobApplication(id);
      if (!existing || existing.userId !== req.session.userId) {
        return res.status(404).json({ error: "Application not found" });
      }
      await storage.deleteJobApplication(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/career/insights", requireAuth, async (req, res) => {
    try {
      const applications = await storage.getJobApplications(req.session.userId);

      if (applications.length === 0) {
        return res.status(400).json({ error: "No applications to analyze" });
      }

      const appSummary = applications.map((a) => ({
        company: a.company,
        role: a.role,
        stage: a.stage,
        status: a.status,
        appliedDate: a.appliedDate,
        recruiterFeedback: a.recruiterFeedback,
        notes: a.notes,
      }));

      const prompt = `You are a career coach for product managers. Analyze the following job application data and provide actionable insights:

${JSON.stringify(appSummary, null, 2)}

Provide:
1. Pipeline health assessment
2. Recurring patterns (if any rejections, identify common themes)
3. Conversion rate analysis (applied -> screen -> onsite -> offer)
4. Weekly improvement plan (3-5 specific actions)
5. Areas to focus on for the next week

Be specific and actionable. Use data from the applications to back up your recommendations.`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_completion_tokens: 4096,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Error generating insights:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  return httpServer;
}

function buildAptitudePrompt(category: string, difficulty: string): string {
  const categoryDescriptions: Record<string, string> = {
    quantitative_reasoning: "mathematical and logical reasoning problems involving percentages, ratios, probability, algebra, and numerical patterns",
    data_interpretation: "questions about interpreting charts, graphs, tables, and data sets to draw conclusions",
    product_analytics: "questions about product metrics, A/B testing, funnel analysis, cohort analysis, and data-driven decision making",
    root_cause_analysis: "scenario-based questions where a product metric has changed and the candidate must identify potential root causes",
    product_sense: "questions about product intuition, user needs assessment, feature prioritization, and product strategy",
  };

  const difficultyDescriptions: Record<string, string> = {
    easy: "straightforward, single-step problems suitable for warming up",
    medium: "multi-step problems requiring solid analytical thinking",
    hard: "complex problems requiring creative problem-solving and deep analysis",
    very_hard: "extremely challenging problems that require expert-level thinking, multiple frameworks, and nuanced analysis",
  };

  return `Generate exactly 10 multiple-choice questions for a PM aptitude test.

Category: ${category} - ${categoryDescriptions[category] || category}
Difficulty: ${difficulty} - ${difficultyDescriptions[difficulty] || difficulty}

Requirements:
- Each question should have exactly 4 options (A, B, C, D)
- Vary the question structure and approach
- Make questions realistic and relevant to PM interviews
- Include detailed explanations for the correct answer
- Randomize where the correct answer appears — don't always put it in the same position

CRITICAL INSTRUCTIONS FOR correctAnswer:
- correctAnswer is a 0-based index: A=0, B=1, C=2, D=3
- You MUST verify your correctAnswer matches your explanation
- First solve the problem completely, then determine which option matches the solution, then set correctAnswer to that option's index
- Double-check: if the answer is option A, correctAnswer must be 0. If B, must be 1. If C, must be 2. If D, must be 3.
- Do NOT confuse the option letter with its index

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The full question text",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": 0,
      "explanation": "Detailed step-by-step explanation showing the calculation/reasoning and confirming which option (A/B/C/D) is correct"
    }
  ]
}

correctAnswer is the 0-indexed position: A=0, B=1, C=2, D=3. Verify it matches your explanation before outputting.`;
}

function buildCaseSystemPrompt(caseType: string, mode: string): string {
  const caseDescriptions: Record<string, string> = {
    product_sense: "product sense and design. Ask questions about designing products, identifying user needs, and making product decisions.",
    growth: "product growth strategy. Ask about acquisition, activation, retention, referral, and revenue optimization.",
    monetization: "monetization strategy. Ask about pricing models, revenue optimization, and business model design.",
    retention: "user retention. Ask about reducing churn, improving engagement, and building habit-forming products.",
    ai_strategy: "AI integration strategy. Ask about when and how to integrate AI/ML into products, evaluating AI product opportunities, and managing AI product development.",
  };

  let systemPrompt = `You are a senior PM interviewer conducting a ${caseType.replace(/_/g, " ")} case interview. Your focus is on ${caseDescriptions[caseType] || caseType}

Interview rules:
- Ask ONE question at a time
- Wait for the candidate's response before asking the next question
- Challenge their assumptions constructively
- Push for specifics - don't accept vague answers
- Ask follow-up questions based on their responses
- After 5-7 exchanges, naturally wrap up the case`;

  if (mode === "L7") {
    systemPrompt += `

DIRECTOR MODE (L7): In addition to product questions, also ask about:
- Organizational design: How would you structure your team? What roles do you need?
- Vision and strategy: What's the 3-year vision? How does this fit into company strategy?
- Stakeholder management: How do you handle conflicts between engineering and design? How do you influence without authority?
- Executive communication: How would you present this to the CEO?
- Cross-functional leadership and trade-off decisions at scale`;
  }

  return systemPrompt;
}
