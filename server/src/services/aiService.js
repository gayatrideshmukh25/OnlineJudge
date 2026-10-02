import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  apiKey: process.env.gemini_api_key,
});
export const getCodeReview = async (problem, code, language, status) => {
  const prompt = `
 You are an expert programming code reviewer.

Review the following programming submission.

Problem:
${problem}

Language:
${language}

Submission Status:
${status}

Code:
${code}

Return the review in Markdown using EXACTLY this structure:

# 1. Summary
- What the code does
- Main approach used
- One important observation

# 2. Correctness Analysis

## Logic
- Point 1
- Point 2

## Edge Cases
- Edge case 1
- Edge case 2

# 3. Time Complexity
- **Complexity:** O(...)
- **Reason:** Maximum 1-2 short sentences.

# 4. Space Complexity
- **Complexity:** O(...)
- **Reason:** Maximum 1-2 short sentences.

# 5. Issues
- **Issue:** Short issue title
  - Explanation in 1-2 short sentences.

- **Issue:** Short issue title
  - Explanation in 1-2 short sentences.

# 6. Suggestions for Improvement
- Suggestion 1
- Suggestion 2
- Suggestion 3

IMPORTANT RULES:
- DO NOT return JSON.
- DO NOT return one large paragraph.
- DO NOT write introductory text such as "Here is a code review..."
- Every section must use bullet points.
- Keep each bullet SHORT.
- Maximum 2 sentences per bullet.
- Use headings exactly as provided.
- Do not provide a complete rewritten solution.
- Focus on teaching the programmer.
- Only mention issues that actually exist in the submitted code.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
  });
  console.log("AI response:", response.text);
  return response.text;
};
