const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use a model that supports JSON mode
// Use a model that supports JSON mode
// Use a model that supports JSON mode
const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" }
});

router.post('/hint', authenticateToken, async (req, res) => {
    console.log("AI Request received.");

    const { code, language, problemTitle, problemDescription } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Code is required" });
    }

    try {
        // Hint doesn't strictly need JSON mode, but we can just use text mode for this one by getting a standard model instance if needed,
        // OR just parse the response. But for hints, we usually want plain text. 
        // Let's use a separate model instance for text-only generation if we want to avoid JSON constraint, 
        // OR just tell it to return a JSON object with a "hint" field.
        // For simplicity, let's keep the hint endpoint returning JSON { hint: "..." }

        const prompt = `
        You are a helpful Computer Science Tutor for a high school APCS exam.
        The student is solving the problem: "${problemTitle}".
        
        Problem Description:
        ${problemDescription.substring(0, 500)}... (truncated)

        Current Student Code (${language}):
        ${code}

        Output must be in Traditional Chinese (Taiwan).
        Task:
        Provide a helpful HINT to guide the student in Traditional Chinese. 
        - Do NOT give the full solution.
        - Do NOT write the code for them.
        - Point out syntax errors, logic flaws, or edge cases they might have missed.
        - Be concise (max 3 sentences).
        
        Output JSON: { "hint": "Your hint here" }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Even with JSON mode, we should parse it to be safe
        const data = JSON.parse(text);
        res.json(data);

    } catch (error) {
        console.error("Gemini API Error Details:", error);
        if (error.status === 429) {
            return res.status(429).json({ error: "AI is busy (Rate Limit). Please wait 1 minute." });
        }
        // Fallback if JSON parse fails or other error
        res.status(500).json({ error: "Failed to generate hint." });
    }
});

router.post('/generate-question', authenticateToken, async (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    try {
        const prompt = `
        Generate 1 APCS (Advanced Placement Computer Science) concept question about "${topic}".
        The content MUST be in Traditional Chinese (繁體中文).
        
        Output STRICT JSON format matching this schema:
        {
          "title": "Short Title",
          "content": "Question description... code dump if needed...",
          "code_snippet": "int func(int n) { ... }",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer_index": 0,
          "explanation": "Why A is correct..."
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = JSON.parse(text);

        res.json(data);
    } catch (error) {
        console.error("AI Gen Error:", error);
        if (error.status === 429) {
            return res.status(429).json({ error: "AI Rate Limit. Wait 1 min." });
        }
        res.status(500).json({ error: "Failed to generate question." });
    }
});

router.post('/generate-implementation', authenticateToken, async (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic is required" });

    try {
        const prompt = `
        Generate 1 APCS (Advanced Placement Computer Science) coding problem about "${topic}".
        The content MUST be in Traditional Chinese (繁體中文).
        
        Output STRICT JSON format matching this schema:
        {
          "title": "Problem Title",
          "description": "# Problem Description\\nWrite a program...\\n\\n## Input\\n...\\n\\n## Output\\n...",
          "test_cases": [
            { "input": "1 2", "output": "3", "is_sample": true },
            { "input": "10 20", "output": "30", "is_sample": false },
            { "input": "-5 5", "output": "0", "is_sample": false }
          ]
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = JSON.parse(text);

        res.json(data);
    } catch (error) {
        console.error("AI Gen Implementation Error:", error);
        if (error.status === 429) {
            return res.status(429).json({ error: "AI Rate Limit. Wait 1 min." });
        }
        res.status(500).json({ error: "Failed to generate problem." });
    }
});

const TOPICS = [
    "Basic IO & Variables",
    "Control Structures",
    "Arrays & Strings",
    "Functions & Recursion",
    "Pointers & Memory",
    "Data Structures",
    "Algorithms"
];

router.post('/generate-batch', authenticateToken, async (req, res) => {
    let { topic, count } = req.body;
    count = parseInt(count) || 3;
    if (count > 10) count = 10; // Cap max questions
    if (count < 1) count = 1;

    try {
        let promptContext = "";

        if (topic) {
            promptContext = `Generate ${count} APCS (Advanced Placement Computer Science) concept questions about "${topic}".`;
        } else {
            // Randomly select topics for each question
            const selectedTopics = [];
            for (let i = 0; i < count; i++) {
                const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
                selectedTopics.push(randomTopic);
            }
            promptContext = `Generate ${count} APCS concept questions. Cover these topics in order:\n` +
                selectedTopics.map((t, i) => `${i + 1}. ${t}`).join('\n');
        }

        const prompt = `
        ${promptContext}
        The content MUST be in Traditional Chinese (繁體中文).
        
        Output STRICT JSON format as a LIST (Array) of objects.
        Each object must match this schema:
        {
          "title": "Short Title",
          "content": "Question description... code dump if needed...",
          "code_snippet": "int func(int n) { ... }", (Optional, empty string if not needed)
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer_index": 0,
          "explanation": "Why A is correct..."
        }

        Do not use markdown formatting in the output (no \`\`\`json). Just raw JSON string.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonText);

        // Ensure it's an array
        const questions = Array.isArray(data) ? data : [data];
        res.json(questions);

    } catch (error) {
        console.error("AI Batch Gen Error:", error);
        if (error.status === 429) {
            return res.status(429).json({ error: "AI Rate Limit. Try fewer questions or wait." });
        }
        res.status(500).json({ error: "Failed to generate batch questions." });
    }
});

const TOPICS_IMPL = [
    "Basic Input/Output",
    "Conditional Logic",
    "Loops & Patterns",
    "Arrays & 2D Arrays",
    "String Manipulation",
    "Recursive Functions",
    "Sorting Algorithms",
    "Searching Algorithms",
    "Greedy Algorithms",
    "Dynamic Programming (Basic)"
];

router.post('/generate-implementation-batch', authenticateToken, async (req, res) => {
    let { topic, count } = req.body;
    count = parseInt(count) || 1;
    if (count > 3) count = 3; // Cap max coding problems (expensive/slow)
    if (count < 1) count = 1;

    try {
        let promptContext = "";

        if (topic) {
            promptContext = `Generate ${count} APCS (Advanced Placement Computer Science) coding problems about "${topic}".`;
        } else {
            // Randomly select topics
            const selectedTopics = [];
            for (let i = 0; i < count; i++) {
                const randomTopic = TOPICS_IMPL[Math.floor(Math.random() * TOPICS_IMPL.length)];
                selectedTopics.push(randomTopic);
            }
            promptContext = `Generate ${count} APCS coding problems. Cover these topics in order:\n` +
                selectedTopics.map((t, i) => `${i + 1}. ${t}`).join('\n');
        }

        const prompt = `
        ${promptContext}
        The content MUST be in Traditional Chinese (繁體中文).
        
        Output STRICT JSON format as a LIST (Array) of objects.
        Each object must match this schema:
        {
          "title": "Problem Title",
          "description": "# Problem Description\\nWrite a program...\\n\\n## Input\\n...\\n\\n## Output\\n...",
          "test_cases": [
            { "input": "...", "output": "...", "is_sample": true }
          ]
        }
        
        Do not use markdown formatting in the output (no \`\`\`json). Just raw JSON string.
        Ensure the description is in Markdown format.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonText);

        const problems = Array.isArray(data) ? data : [data];
        res.json(problems);

    } catch (error) {
        console.error("AI Impl Batch Gen Error:", error);
        if (error.status === 429) {
            return res.status(429).json({ error: "AI Rate Limit. Wait and try again." });
        }
        res.status(500).json({ error: "Failed to generate problems." });
    }
});

module.exports = router;
