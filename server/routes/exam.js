const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Generate a Mock Exam Paper
router.get('/paper', authenticateToken, async (req, res) => {
    try {
        // MVP: Fetch random 30 Concept + 3 Implementation
        const difficulty = req.query.difficulty ? parseInt(req.query.difficulty) : null;

        const conceptRes = await db.query('SELECT * FROM questions_concept ORDER BY RANDOM() LIMIT 30');

        let codingQuery = 'SELECT * FROM questions_implementation';
        const codingParams = [];

        if (difficulty && difficulty >= 1 && difficulty <= 4) {
            codingQuery += ' WHERE difficulty = $1';
            codingParams.push(difficulty);
        }

        codingQuery += ' ORDER BY RANDOM() LIMIT 3';

        const codingRes = await db.query(codingQuery, codingParams);

        res.json({
            id: Date.now(),
            duration: 150 * 60, // 150 minutes (2.5 hr) roughly standard
            concept: conceptRes.rows,
            implementation: codingRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate exam paper' });
    }
});

// Submit Exam (Simple Grading for Concept, just verify for Implementation)
// In a real system, this might save the whole exam session.
router.post('/submit', authenticateToken, async (req, res) => {
    const { conceptAnswers } = req.body; // { qId: ansIndex, ... }

    try {
        // Grade Concept
        // We need to fetch correct answers.
        // Optimization: In a real app we'd cache this or doing a bulk verify query.
        // For MVP, simple loop or fetching all relevant IDs.

        let score = 0;
        let total = 0;
        let details = [];

        const ids = Object.keys(conceptAnswers);
        if (ids.length > 0) {
            const result = await db.query('SELECT id, answer_index FROM questions_concept WHERE id = ANY($1::int[])', [ids]);
            const correctMap = {};
            result.rows.forEach(r => correctMap[r.id] = r.answer_index);

            ids.forEach(qid => {
                total++;
                if (correctMap[qid] === conceptAnswers[qid]) {
                    score++;
                    details.push({ id: qid, correct: true });
                } else {
                    details.push({ id: qid, correct: false, correctIndex: correctMap[qid] });
                }
            });
        }

        res.json({
            score,
            total,
            details
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit exam' });
    }
});

module.exports = router;
