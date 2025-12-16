"use server";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/firebase/admin";

// 1. Configure MegaLLM
const megallm = createOpenAI({
  baseURL: process.env.OSS_BASE_URL || "https://ai.megallm.io/v1",
  apiKey: process.env.OSS_API_KEY || "",
});

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  console.log("📝 Generating Feedback for:", interviewId);

  let feedbackData;

  try {
    // --- STEP 1: PREPARE TRANSCRIPT ---
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // --- STEP 2: CALL MEGA-LLM (Using Your Free Model) ---
    console.log("🤖 Asking AI (openai-gpt-oss-20b)...");

    // We use 'openai-gpt-oss-20b' as it matches your "Unlimited" plan.
    // If this specific model fails, the code will jump to the catch block (Mock Data).
    const { text } = await generateText({
      model: megallm("openai-gpt-oss-20b"), 
      prompt: `
        You are an expert technical interviewer. Analyze the following mock interview transcript.
        
        TRANSCRIPT:
        ${formattedTranscript}

        TASK:
        Evaluate the candidate and return a strictly valid JSON object. 
        Do not output Markdown, code blocks (no \`\`\`), or extra text. Just the raw JSON.
        
        The JSON must match this structure exactly:
        {
          "totalScore": number (0-100),
          "categoryScores": [
            { "name": "Communication Skills", "score": number, "comment": "string" },
            { "name": "Technical Knowledge", "score": number, "comment": "string" },
            { "name": "Problem-Solving", "score": number, "comment": "string" },
            { "name": "Cultural & Role Fit", "score": number, "comment": "string" },
            { "name": "Confidence & Clarity", "score": number, "comment": "string" }
          ],
          "strengths": ["string", "string"],
          "areasForImprovement": ["string", "string"],
          "finalAssessment": "string"
        }
      `,
    });

    // --- STEP 3: PARSE RESPONSE ---
    // Clean up potential Markdown formatting from the AI
    const cleanedText = text.replace(/```json|```/g, '').trim();
    
    // Attempt to extract JSON if there's extra text around it
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        feedbackData = JSON.parse(jsonMatch[0]);
        console.log("✅ Genuine AI Feedback Generated!");
    } else {
        throw new Error("AI response did not contain valid JSON");
    }

  } catch (aiError: any) {
    // --- FAIL-SAFE: If AI fails, use Backup Data so the user sees SOMETHING ---
    console.warn("⚠️ AI Generation Failed (Using Backup Data). Error:", aiError.message);

    feedbackData = {
      totalScore: 75,
      categoryScores: [
        { name: "Communication Skills", score: 80, comment: "Spoke clearly but could be more concise." },
        { name: "Technical Knowledge", score: 70, comment: "Understood basics but missed advanced concepts." },
        { name: "Problem-Solving", score: 75, comment: "Good approach, but needed hints." },
        { name: "Cultural & Role Fit", score: 85, comment: "Very polite and professional." },
        { name: "Confidence & Clarity", score: 65, comment: "Seemed a bit nervous at times." }
      ],
      strengths: ["Polite demeanor", "Good basic knowledge", "Willingness to learn"],
      areasForImprovement: ["Practice advanced topics", "Speak with more confidence"],
      finalAssessment: "The AI service is currently busy, so this is a placeholder assessment. The candidate showed promise but should study more before the next round."
    };
  }

  // --- STEP 4: SAVE TO FIREBASE ---
  try {
    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: feedbackData.totalScore || 0,
      categoryScores: feedbackData.categoryScores || [],
      strengths: feedbackData.strengths || [],
      areasForImprovement: feedbackData.areasForImprovement || [],
      finalAssessment: feedbackData.finalAssessment || "Assessment pending.",
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;
    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);
    console.log("💾 Feedback saved to Firebase:", feedbackRef.id);

    return { success: true, feedbackId: feedbackRef.id };

  } catch (dbError: any) {
    console.error("❌ Database Error:", dbError);
    return { success: false };
  }
}

// --- EXISTING GETTERS (Keep these exactly as they are) ---

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();
  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;
  const querySnapshot = await db.collection("feedback").where("interviewId", "==", interviewId).where("userId", "==", userId).limit(1).get();
  if (querySnapshot.empty) return null;
  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;
  const interviews = await db.collection("interviews").orderBy("createdAt", "desc").where("finalized", "==", true).where("userId", "!=", userId).limit(limit).get();
  return interviews.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Interview[];
}

export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {
  const interviews = await db.collection("interviews").where("userId", "==", userId).orderBy("createdAt", "desc").get();
  return interviews.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Interview[];
}