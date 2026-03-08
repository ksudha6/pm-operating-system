import { storage } from "./storage";
import { db } from "./db";
import { jobApplications, aptitudeAttempts, aptitudeAnswers } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingApps = await storage.getJobApplications();
  if (existingApps.length > 0) return;

  console.log("Seeding database with sample data...");

  const apps = [
    {
      company: "Google",
      role: "Senior Product Manager, Search",
      url: "https://careers.google.com",
      salaryRange: "$220k-$280k",
      stage: "onsite" as const,
      status: "active" as const,
      notes: "Had initial call with recruiter. Team focuses on search quality improvements.",
      recruiterFeedback: "Strong product sense, moving to onsite round.",
    },
    {
      company: "Stripe",
      role: "Product Manager, Payments",
      url: "https://stripe.com/jobs",
      salaryRange: "$200k-$260k",
      stage: "screen" as const,
      status: "active" as const,
      notes: "Applied through referral. Focus on payment infrastructure.",
    },
    {
      company: "Meta",
      role: "Director of Product, AI",
      url: "https://metacareers.com",
      salaryRange: "$350k-$450k",
      stage: "applied" as const,
      status: "active" as const,
      notes: "L7 role focusing on AI-powered features across family of apps.",
    },
    {
      company: "Notion",
      role: "Senior PM, Core Product",
      url: "https://notion.so/careers",
      salaryRange: "$190k-$240k",
      stage: "rejected" as const,
      status: "active" as const,
      recruiterFeedback: "Great culture fit but looking for more enterprise experience. Consider reapplying in 6 months.",
    },
    {
      company: "Figma",
      role: "Product Manager, Developer Platform",
      url: "https://figma.com/careers",
      salaryRange: "$200k-$250k",
      stage: "offer" as const,
      status: "active" as const,
      notes: "Received verbal offer. Negotiating comp package.",
      recruiterFeedback: "Exceptional product thinking and technical depth. Team is excited.",
    },
  ];

  for (const app of apps) {
    await storage.createJobApplication({
      ...app,
      appliedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }

  const categories = ["quantitative_reasoning", "data_interpretation", "product_analytics"];
  const difficulties = ["easy", "medium", "hard"];

  for (let i = 0; i < 3; i++) {
    const totalQ = 10;
    const correct = Math.floor(Math.random() * 5) + 4;
    const attempt = await storage.createAptitudeAttempt({
      category: categories[i],
      difficulty: difficulties[i],
      totalQuestions: totalQ,
      correctAnswers: correct,
      timeSpentSeconds: Math.floor(Math.random() * 300) + 200,
      timeLimitSeconds: 600,
      status: "completed",
    });

    await storage.updateAptitudeAttempt(attempt.id, {
      completedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }

  console.log("Database seeded successfully.");
}
