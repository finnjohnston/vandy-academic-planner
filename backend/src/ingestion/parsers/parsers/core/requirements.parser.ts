import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedRequirements } from "../../types/core/parsed.requirements.type.js";
import { geminiSemaphore } from "../../../services/semaphore.service.js";

// Retry configuration for handling rate limits
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract retry delay from Google API error response
 */
function extractRetryDelay(error: any): number | null {
    // Try to extract retryDelay from error.errorDetails
    const retryInfo = error.errorDetails?.find(
        (detail: any) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );

    if (retryInfo?.retryDelay) {
        // Parse duration like "32s" or "32.5s" to milliseconds
        const match = retryInfo.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
        if (match) {
            return parseFloat(match[1]) * 1000;
        }
    }

    return null;
}

const promptTemplate = `
You are a meticulous data parsing expert specializing in university course catalogs. Your task is to analyze the provided description text for a specific course and convert it into a structured JSON object according to the rules below.

# CONTEXT
- Course Code: "{course_code}"
- Description Text: "{description_text}"

# RULES

1.  **Identify Requirement Types:** Scan the text for two types of requirements using the following keyword logic:
    * **Corequisites:** Identify a sentence as a corequisite if it contains "corequisite," "concurrent," or any phrase combining both terms, like **"prerequisite or corequisite."**
    * **Prerequisites:** Identify a sentence as a prerequisite ONLY if it contains keywords like "prerequisite," "requires," or "must have completed," AND it does NOT contain any of the corequisite keywords.
    * Only scan the text for corequisites or prerequisites, do not include antirequisites or courses you cannot take if you take this course.

2.  **Populate JSON Structure:** For each requirement type found, create an object with two keys:
    * \`"rawText"\`: The full, original sentence or clause for that requirement.
    * \`"courses"\`: A nested JSON object representing the logical structure, using \`$and\` and \`$or\` keys.

3.  **Logical Structure for "courses":**
    * The \`courses\` object must be a nested structure using \`"$and"\` and \`"$or"\` keys.
    * An \`"$and"\` key holds a list where **all** items must be satisfied.
    * An \`"$or"\` key holds a list where **only one** of the items must be satisfied.
    * Items in these lists can be either a course code string (e.g., \`"CS 1101"\`) or another nested \`"$and"\`/\`"$or"\` object.
    * Even if there is only ONE course in a requirement, it MUST still be wrapped in a \`$and\` or \`$or\` key. Never return a bare course code string.

4.   **Subject Code Determination (This is a common error):**
      * If a course number appears without a subject code (e.g., "1101"):
        1. Check if a different subject code was mentioned earlier in the SAME SENTENCE for a previous course
        2. If yes, use that subject code for this course number
        3. If no, use the input \`course_code\`'s subject code
      * NEVER guess or hallucinate subject codes - always use one of the above rules
      * Example: In "Prerequisite: MATH 1200 and 1300", both courses are MATH
      * Example: In "Prerequisite: 1101 and 1102" for course "CS 2201", both are CS
      * 
5.  **Use Best Judgment:** The keywords and rules are guidelines. Your primary goal is to accurately reflect the true meaning of the text. If the phrasing is unusual but clearly implies a prerequisite, classify it correctly. If the subject of a course number is not mentioned but is clearly not represented by the provided 'course_code''s subject code, use the subject code you know is correct. You are the expert; make the correct classification based on your language understanding.

6.  **Handling Nulls:** If a requirement type is not mentioned, its corresponding JSON object must have \`null\` values for both \`"rawText"\` and \`"courses"\`.

# CRITICAL ERRORS TO AVOID

**Subject Code Errors**:
1. WRONG: Using a random or hallucinated subject code
2. WRONG: Guessing what subject code "makes sense"
3. CORRECT: When you see a bare number like "1101", look earlier in the SAME SENTENCE for a subject code
4. CORRECT: If no subject was mentioned earlier in the sentence, use the input course's subject code
5. CORRECT: If these rules clearly do not work for the input, reason and use your judgement to make the correct classification.
6. Example: "Prerequisite: CS 1101 and 2201" → Both are CS courses
7. Example: "Prerequisite: 1101 or MATH 1200" for course "CS 2201" → First is CS 1101, second is MATH 1200

**Single Requirement Structure:**
- Even a single course MUST use $and or $or wrapper
- WRONG: \`"courses": "CS 1101"\`
- CORRECT: \`"courses": {"$and": ["CS 1101"]}\`

# IMPORTANT: All JSON keys must use camelCase format (e.g., "rawText" not "raw_text")

# EXAMPLES (GOLD STANDARD)

### Example 1:

* **Input Context:**
    * Course Code: \`PHYS 2210\`
    * Description Text: "Geometrical optics, including reflection, refraction, ray tracing, and aberrations. Physical optics, including wave theory, absorption, dispersion, diffraction, and polarization. Quantum optics, including photon theory, lasers, entanglement, teleportation, and the statistics of quantum noise in optical signaling. No credit for students who have earned credit for 5210. Prerequisite: either 1502 or 1602 or 1912; and either MATH 1201 or 1301. [3] (MNS)"
* **Required Output JSON:**
    \`\`\`json
    {
      "prerequisites": {
        "rawText": "Prerequisite: either 1502 or 1602 or 1912; and either MATH 1201 or 1301.",
        "courses": {
          "$and": [
            { "$or": ["PHYS 1502", "PHYS 1602", "PHYS 1912"] },
            { "$or": ["MATH 1201", "MATH 1301"] }
          ]
        }
      },
      "corequisites": {
        "rawText": null,
        "courses": null
      }
    }
    \`\`\`

### Example 2:

* **Input Context:**
    * Course Code: \`PHYS 2255\`
    * Description Text: "Relativity. Experimental basis of quantum physics. Structure of the atom. Wave properties of matter. The hydrogen atom. Atomic and statistical physics. Prerequisite: either 1502, 1602, 1902 (or 1912), or 2053. Corequisite: MATH 2300 or 2500. [3] (MNS)"
* **Required Output JSON:**
    \`\`\`json
    {
      "prerequisites": {
        "rawText": "Prerequisite: either 1502, 1602, 1902 (or 1912), or 2053.",
        "courses": {
          "$or": ["PHYS 1502", "PHYS 1602", "PHYS 1902", "PHYS 1912", "PHYS 2053"]
        }
      },
      "corequisites": {
        "rawText": "Corequisite: MATH 2300 or 2500.",
        "courses": {
          "$or": ["MATH 2300", "MATH 2500"]
        }
      }
    }
    \`\`\`

### Example 3:

* **Input Context:**
    * Course Code: \`PHYS 2953L\`
    * Description Text: "Fundamental physics experiments and measurements. Statistical analysis of measured data. One laboratory per week. Prerequisite: 2255L, and either 2255 or 3651; or 1912 and either 2255 or 3651; or either 2250W or 2260W. [1] (No AXLE credit)"
* **Required Output JSON:**
    \`\`\`json
    {
      "prerequisites": {
        "rawText": "Prerequisite: 2255L, and either 2255 or 3651; or 1912 and either 2255 or 3651; or either 2250W or 2260W.",
        "courses": {
          "$or": [
            { "$and": ["PHYS 2255L", { "$or": ["PHYS 2255", "PHYS 3651"] }] },
            { "$and": ["PHYS 1912", { "$or": ["PHYS 2255", "PHYS 3651"] }] },
            { "$or": ["PHYS 2250W", "PHYS 2260W"] }
          ]
        }
      },
      "corequisites": {
        "rawText": null,
        "courses": null
      }
    }
    \`\`\`

### Example 4:

* **Input Context:**
    * Course Code: \`PHYS 3200\`
    * Description Text: "Temperature, work, heat, and the first law of thermodynamics. Entropy and the second law of thermodynamics. Kinetic theory of gases with applications to ideal gases and electromagnetic radiation. Serves as repeat credit for students who have completed 3207. Prerequisite or corequisite: 2270 or 2275. [3] (MNS)"
* **Required Output JSON:**
   \`\`\`json
   {
     "prerequisites": {
       "rawText": null,
       "courses": null
     },
     "corequisites": {
       "rawText": "Prerequisite or corequisite: 2270 or 2275.",
       "courses": {
         "$or": ["PHYS 2270", "PHYS 2275"]
       }
     }
   }
   \`\`\`

# TASK
Based on all the rules and the examples provided, parse the **description_text** given in the **CONTEXT** section above and return only the resulting JSON object.
`;

/**
 * Parses course requirements using the Gemini AI model
 * @param courseCode Course code (e.g., "PHYS 2210")
 * @param descriptionText Full course description text containing requirement information
 * @returns ParsedRequirements object with structured prerequisites and corequisites
 */
export async function parseRequirements(
    courseCode: string,
    descriptionText: string
): Promise<ParsedRequirements> {
    // Handle empty or invalid input
    if (!courseCode || !descriptionText) {
        return {
            prerequisites: { rawText: null, courses: null },
            corequisites: { rawText: null, courses: null }
        };
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
    });

    // Fill in the prompt template
    const prompt = promptTemplate
        .replace('{course_code}', courseCode)
        .replace('{description_text}', descriptionText);

    // Retry loop with exponential backoff for handling rate limits
    let lastError: any;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Generate response with semaphore control (limits concurrent API calls)
            const result = await geminiSemaphore.execute(() =>
                model.generateContent(prompt)
            );
            const response = result.response;
            const text = response.text();

            // Extract JSON from response (remove markdown code blocks if present)
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1] : text;

            // Parse and validate the response
            const parsed = JSON.parse(jsonText.trim()) as ParsedRequirements;

            // Validate structure
            if (!parsed.prerequisites || !parsed.corequisites) {
                throw new Error('Invalid response structure: missing prerequisites or corequisites');
            }

            return parsed;
        } catch (error: any) {
            lastError = error;

            // Check if it's a rate limit error (429)
            if (error.status === 429 || error.message?.includes('429')) {
                // Extract retry delay from error response, or use exponential backoff
                const retryDelay = extractRetryDelay(error) ||
                                  INITIAL_RETRY_DELAY * Math.pow(2, attempt);

                console.warn(
                    `Rate limit hit for ${courseCode}, retrying in ${retryDelay}ms ` +
                    `(attempt ${attempt + 1}/${MAX_RETRIES})`
                );

                await sleep(retryDelay);
                continue; // Retry
            }

            // If not a rate limit error, fail immediately
            break;
        }
    }

    // All retries exhausted or non-retryable error occurred
    console.error('Error parsing requirements with Gemini:', lastError);
    // Return empty structure on error rather than throwing
    // This makes the parser more resilient
    return {
        prerequisites: { rawText: null, courses: null },
        corequisites: { rawText: null, courses: null }
    };
}
