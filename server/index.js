const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.APCS_PRATICE_BACKEND_PORT || process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('APCS Platform API is running');
});

const questionsConceptRouter = require('./routes/questions_concept');
app.use('/api/questions/concept', questionsConceptRouter);

const questionsImplementationRouter = require('./routes/questions_implementation');
app.use('/api/questions/implementation', questionsImplementationRouter);

const judgeRouter = require('./routes/judge');
app.use('/api/judge', judgeRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const examRouter = require('./routes/exam');
app.use('/api/exam', examRouter);

const analyticsRouter = require('./routes/analytics');
app.use('/api/analytics', analyticsRouter);

const commentsRouter = require('./routes/comments');
app.use('/api/comments', commentsRouter);

const aiRouter = require('./routes/ai');
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
