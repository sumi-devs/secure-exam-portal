// Grade submission automatically for MCQ and true/false questions
function gradeSubmission(questions, answers) {
    let totalMarks = 0;
    let earnedMarks = 0;
    const gradedAnswers = [];

    questions.forEach((question, idx) => {
        const studentAnswer = answers[idx] || '';
        let isCorrect = false;
        let marksObtained = 0;
        let requiresManualGrading = false;

        totalMarks += question.marks || 0;

        // Grade multiple choice
        if (question.questionType === 'multiple_choice') {
            isCorrect = studentAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
            marksObtained = isCorrect ? question.marks : 0;
        }

        // Grade true/false
        else if (question.questionType === 'true_false') {
            isCorrect = studentAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
            marksObtained = isCorrect ? question.marks : 0;
        }

        // Short answer requires manual grading
        else if (question.questionType === 'short_answer') {
            marksObtained = 0;
            requiresManualGrading = true;
        }

        // Essay requires manual grading
        else if (question.questionType === 'essay') {
            marksObtained = 0;
            requiresManualGrading = true;
        }

        if (!requiresManualGrading) {
            earnedMarks += marksObtained;
        }

        gradedAnswers.push({
            questionIndex: idx,
            studentAnswer,
            isCorrect,
            marksObtained,
            requiresManualGrading
        });
    });

    return {
        totalMarks,
        earnedMarks,
        percentage: totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0,
        gradedAnswers,
        requiresManualGrading: gradedAnswers.some(a => a.requiresManualGrading)
    };
}

// Assign letter grade based on percentage
function assignGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

module.exports = {
    gradeSubmission,
    assignGrade
};
