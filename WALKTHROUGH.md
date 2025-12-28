# APCS Practice Platform - Walkthrough

## 1. Project Overview
This platform is a full-stack web application designed to help students practice for the **APCS (Advanced Placement Computer Science)** exam in Taiwan. It includes:
- **Concept Quiz**: Multiple choice questions with feedback.
- **Implementation Practice**: Online judge with real-time code execution.
- **AI Tutor & Generator**: Integration with Google Gemini for hints and content generation.

## 2. Recent Changes (2025-12-28)
### AI Prompt Refinement
- **Objective**: Prevent the AI from leaking "Chain of Thought" or "Thinking" processes into the final JSON output, which was breaking the frontend parser.
- **Solution**:
    - Updated `server/routes/ai.js` to use the `gemini-flash-latest` model.
    - Enabled `responseMimeType: "application/json"` in the `generationConfig`.
    - Simplified prompts to request STRICT JSON output.
- **Verification**:
    - Validated using `curl` against `api/ai/generate-question` and `api/ai/generate-implementation`.
    - Confirmed output is pure JSON without markdown fences or extra text.

## 3. Core Features Verified
- **Authentication**: JWT Login works (Admin/Student).
- **Concept Questions**: Admin can generate and save questions. Students can take quizzes.
- **Implementation Problems**:
    - Admin can generate problems with AI.
    - Students can submit Python code.
    - Test cases run successfully (AC/WA status).

## 4. Tech Stack Status
- **Frontend**: Vue 3 + Tailwind (Running on port 5173).
- **Backend**: Node.js + Express (Running on port 3000).
- **Database**: PostgreSQL (Running in Docker).
- **AI**: Google Gemini API (Active and Refined).

## 5. Next Steps
- **Monitoring**: Watch for any 429 Rate Limit errors from Gemini if usage spikes.
- **UI Polish**: Enhance the "Loading" states for AI generation with better skeletons or progress bars.
## 4. Question Bank LLM Integration (Batch Generation)
**Objective**: Accelerate question bank population.

**Features**:
1.  **Bulk Concept Generation**:
    - Generates 3, 5, or 10 multiple-choice questions at once.
    - **Topics**: Pick specific APCS topics (e.g., Recursion) or "Random (Mixed)" for variety.
    - **Review UI**: Inspect generated questions, edit them if needed, or save them to the DB directly.

2.  **Bulk Coding Problem Generation**:
    - Generates up to 3 full coding problems with test cases.
    - Supports random topic selection from algorithms (Sorting, DP, Greedy, etc.).
    - Includes Title, Markdown Description, and Test Cases.

**Verification**:
- Use `curl` or the Admin UI to generate batches.
- Confirm "Random" mode produces diverse topics.
