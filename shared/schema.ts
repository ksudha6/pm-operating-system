import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  selectedModules: jsonb("selected_modules").$type<string[]>().default(sql`'[]'::jsonb`),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

export const aptitudeAttempts = pgTable("aptitude_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  totalQuestions: integer("total_questions").notNull().default(10),
  correctAnswers: integer("correct_answers").notNull().default(0),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(600),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertAptitudeAttemptSchema = createInsertSchema(aptitudeAttempts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type AptitudeAttempt = typeof aptitudeAttempts.$inferSelect;
export type InsertAptitudeAttempt = z.infer<typeof insertAptitudeAttemptSchema>;

export const aptitudeAnswers = pgTable("aptitude_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => aptitudeAttempts.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctAnswer: integer("correct_answer").notNull(),
  selectedAnswer: integer("selected_answer"),
  isCorrect: boolean("is_correct"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  explanation: text("explanation").notNull().default(""),
  questionIndex: integer("question_index").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAptitudeAnswerSchema = createInsertSchema(aptitudeAnswers).omit({
  id: true,
  createdAt: true,
});

export type AptitudeAnswer = typeof aptitudeAnswers.$inferSelect;
export type InsertAptitudeAnswer = z.infer<typeof insertAptitudeAnswerSchema>;

export const caseSessions = pgTable("case_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  caseType: text("case_type").notNull(),
  mode: text("mode").notNull().default("L6"),
  status: text("status").notNull().default("active"),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(1800),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertCaseSessionSchema = createInsertSchema(caseSessions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type CaseSession = typeof caseSessions.$inferSelect;
export type InsertCaseSession = z.infer<typeof insertCaseSessionSchema>;

export const caseMessages = pgTable("case_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => caseSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCaseMessageSchema = createInsertSchema(caseMessages).omit({
  id: true,
  createdAt: true,
});

export type CaseMessage = typeof caseMessages.$inferSelect;
export type InsertCaseMessage = z.infer<typeof insertCaseMessageSchema>;

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  company: text("company").notNull(),
  role: text("role").notNull(),
  url: text("url"),
  salaryRange: text("salary_range"),
  stage: text("stage").notNull().default("applied"),
  status: text("status").notNull().default("active"),
  appliedDate: timestamp("applied_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  notes: text("notes"),
  recruiterFeedback: text("recruiter_feedback"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
