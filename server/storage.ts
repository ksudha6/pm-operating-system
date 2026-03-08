import {
  type User, type InsertUser,
  type OtpCode, type InsertOtpCode,
  type AptitudeAttempt, type InsertAptitudeAttempt,
  type AptitudeAnswer, type InsertAptitudeAnswer,
  type CaseSession, type InsertCaseSession,
  type CaseMessage, type InsertCaseMessage,
  type JobApplication, type InsertJobApplication,
  users, otpCodes, aptitudeAttempts, aptitudeAnswers,
  caseSessions, caseMessages, jobApplications,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getValidOtp(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpUsed(id: number): Promise<void>;
  invalidateOtpsForEmail(email: string): Promise<void>;

  createAptitudeAttempt(attempt: InsertAptitudeAttempt): Promise<AptitudeAttempt>;
  getAptitudeAttempt(id: number): Promise<AptitudeAttempt | undefined>;
  updateAptitudeAttempt(id: number, data: Partial<AptitudeAttempt>): Promise<AptitudeAttempt>;
  getAptitudeAttempts(userId?: string): Promise<AptitudeAttempt[]>;
  getRecentAptitudeAttempts(days: number, userId?: string): Promise<AptitudeAttempt[]>;

  createAptitudeAnswer(answer: InsertAptitudeAnswer): Promise<AptitudeAnswer>;
  getAptitudeAnswer(id: number): Promise<AptitudeAnswer | undefined>;
  getAptitudeAnswersByAttempt(attemptId: number): Promise<AptitudeAnswer[]>;
  updateAptitudeAnswer(id: number, data: Partial<AptitudeAnswer>): Promise<AptitudeAnswer>;

  createCaseSession(session: InsertCaseSession): Promise<CaseSession>;
  getCaseSession(id: number): Promise<CaseSession | undefined>;
  updateCaseSession(id: number, data: Partial<CaseSession>): Promise<CaseSession>;
  getCaseSessions(userId?: string): Promise<CaseSession[]>;

  createCaseMessage(message: InsertCaseMessage): Promise<CaseMessage>;
  getCaseMessagesBySession(sessionId: number): Promise<CaseMessage[]>;

  createJobApplication(app: InsertJobApplication): Promise<JobApplication>;
  getJobApplication(id: number): Promise<JobApplication | undefined>;
  updateJobApplication(id: number, data: Partial<JobApplication>): Promise<JobApplication>;
  deleteJobApplication(id: number): Promise<void>;
  getJobApplications(userId?: string): Promise<JobApplication[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({ ...insertUser, email: insertUser.email.toLowerCase() }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async createOtpCode(otp: InsertOtpCode): Promise<OtpCode> {
    const [result] = await db.insert(otpCodes).values(otp).returning();
    return result;
  }

  async getValidOtp(email: string, code: string): Promise<OtpCode | undefined> {
    const [result] = await db.select().from(otpCodes).where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gte(otpCodes.expiresAt, new Date())
      )
    );
    return result;
  }

  async markOtpUsed(id: number): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
  }

  async invalidateOtpsForEmail(email: string): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(
      and(eq(otpCodes.email, email.toLowerCase()), eq(otpCodes.used, false))
    );
  }

  async createAptitudeAttempt(attempt: InsertAptitudeAttempt): Promise<AptitudeAttempt> {
    const [result] = await db.insert(aptitudeAttempts).values(attempt).returning();
    return result;
  }

  async getAptitudeAttempt(id: number): Promise<AptitudeAttempt | undefined> {
    const [result] = await db.select().from(aptitudeAttempts).where(eq(aptitudeAttempts.id, id));
    return result;
  }

  async updateAptitudeAttempt(id: number, data: Partial<AptitudeAttempt>): Promise<AptitudeAttempt> {
    const [result] = await db.update(aptitudeAttempts).set(data).where(eq(aptitudeAttempts.id, id)).returning();
    return result;
  }

  async getAptitudeAttempts(userId?: string): Promise<AptitudeAttempt[]> {
    if (userId) {
      return db.select().from(aptitudeAttempts)
        .where(eq(aptitudeAttempts.userId, userId))
        .orderBy(desc(aptitudeAttempts.createdAt));
    }
    return db.select().from(aptitudeAttempts).orderBy(desc(aptitudeAttempts.createdAt));
  }

  async getRecentAptitudeAttempts(days: number, userId?: string): Promise<AptitudeAttempt[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const conditions = [
      gte(aptitudeAttempts.createdAt, cutoff),
      eq(aptitudeAttempts.status, "completed")
    ];
    if (userId) {
      conditions.push(eq(aptitudeAttempts.userId, userId));
    }
    return db.select().from(aptitudeAttempts)
      .where(and(...conditions))
      .orderBy(desc(aptitudeAttempts.createdAt));
  }

  async createAptitudeAnswer(answer: InsertAptitudeAnswer): Promise<AptitudeAnswer> {
    const [result] = await db.insert(aptitudeAnswers).values(answer).returning();
    return result;
  }

  async getAptitudeAnswer(id: number): Promise<AptitudeAnswer | undefined> {
    const [result] = await db.select().from(aptitudeAnswers).where(eq(aptitudeAnswers.id, id));
    return result;
  }

  async getAptitudeAnswersByAttempt(attemptId: number): Promise<AptitudeAnswer[]> {
    return db.select().from(aptitudeAnswers)
      .where(eq(aptitudeAnswers.attemptId, attemptId))
      .orderBy(aptitudeAnswers.questionIndex);
  }

  async updateAptitudeAnswer(id: number, data: Partial<AptitudeAnswer>): Promise<AptitudeAnswer> {
    const [result] = await db.update(aptitudeAnswers).set(data).where(eq(aptitudeAnswers.id, id)).returning();
    return result;
  }

  async createCaseSession(session: InsertCaseSession): Promise<CaseSession> {
    const [result] = await db.insert(caseSessions).values(session).returning();
    return result;
  }

  async getCaseSession(id: number): Promise<CaseSession | undefined> {
    const [result] = await db.select().from(caseSessions).where(eq(caseSessions.id, id));
    return result;
  }

  async updateCaseSession(id: number, data: Partial<CaseSession>): Promise<CaseSession> {
    const [result] = await db.update(caseSessions).set(data).where(eq(caseSessions.id, id)).returning();
    return result;
  }

  async getCaseSessions(userId?: string): Promise<CaseSession[]> {
    if (userId) {
      return db.select().from(caseSessions)
        .where(eq(caseSessions.userId, userId))
        .orderBy(desc(caseSessions.createdAt));
    }
    return db.select().from(caseSessions).orderBy(desc(caseSessions.createdAt));
  }

  async createCaseMessage(message: InsertCaseMessage): Promise<CaseMessage> {
    const [result] = await db.insert(caseMessages).values(message).returning();
    return result;
  }

  async getCaseMessagesBySession(sessionId: number): Promise<CaseMessage[]> {
    return db.select().from(caseMessages)
      .where(eq(caseMessages.sessionId, sessionId))
      .orderBy(caseMessages.createdAt);
  }

  async createJobApplication(app: InsertJobApplication): Promise<JobApplication> {
    const [result] = await db.insert(jobApplications).values(app).returning();
    return result;
  }

  async getJobApplication(id: number): Promise<JobApplication | undefined> {
    const [result] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
    return result;
  }

  async updateJobApplication(id: number, data: Partial<JobApplication>): Promise<JobApplication> {
    const [result] = await db.update(jobApplications).set({ ...data, updatedAt: new Date() }).where(eq(jobApplications.id, id)).returning();
    return result;
  }

  async deleteJobApplication(id: number): Promise<void> {
    await db.delete(jobApplications).where(eq(jobApplications.id, id));
  }

  async getJobApplications(userId?: string): Promise<JobApplication[]> {
    if (userId) {
      return db.select().from(jobApplications)
        .where(eq(jobApplications.userId, userId))
        .orderBy(desc(jobApplications.createdAt));
    }
    return db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
  }
}

export const storage = new DatabaseStorage();
