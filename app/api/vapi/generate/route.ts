import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

// NOTE: We removed the "ai" and "@ai-sdk/openai" imports to stop the crashing.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📥 CONNECTION SUCCESSFUL. Request Body:", body);

    const { type, role, level, techstack, userid } = body;

    // 1. USE BACKUP QUESTIONS DIRECTLY (Bypasses AI completely)
    const questions = [
      `Could you tell me about your experience with ${techstack || "coding"}?`,
      "What is the most challenging technical problem you have solved?",
      "How do you handle tight deadlines?",
      "Why do you want to work here?",
      "Do you have any questions for us?"
    ];

    // 2. SAVE TO FIREBASE
    console.log("💾 Saving to Firebase...");
    
    const interview = {
      role: role || "General Developer",
      type: type || "General",
      level: level || "Entry",
      techstack: techstack ? techstack.split(",") : ["General"],
      questions: questions,
      userId: userid || "test-user",
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);
    console.log("✅ Interview Card Created! ID:", docRef.id);

    // 3. RETURN RESPONSE TO VAPI
    return Response.json({
      success: true,
      interviewId: docRef.id,
      questions: questions
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ SERVER ERROR:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}