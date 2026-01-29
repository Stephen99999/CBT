import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Course, Question } from '@/types';
import { getCourses, getQuestionsByCourse, enrollInCourse, getUserQuizAttempts, createQuizAttempt, updateUserProgress } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, BarChart, CheckCircle, XCircle, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateCurrentUser } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (id) {
      const courses = getCourses();
      const foundCourse = courses.find((c) => c.id === id);
      setCourse(foundCourse || null);
      setQuestions(getQuestionsByCourse(id));
    }
  }, [id]);

  const isEnrolled = user?.enrolledCourses.includes(id || '') || false;
  const previousAttempts = user ? getUserQuizAttempts(user.id).filter((a) => a.courseId === id) : [];
  const bestScore = previousAttempts.length > 0 
    ? Math.max(...previousAttempts.map((a) => (a.score / a.totalQuestions) * 100))
    : 0;

  const handleEnroll = () => {
    if (!user) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to enroll in courses.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    
    if (id) {
      const success = enrollInCourse(user.id, id);
      if (success) {
        const updatedUser = { ...user, enrolledCourses: [...user.enrolledCourses, id] };
        updateCurrentUser(updatedUser);
        toast({
          title: 'Enrolled successfully!',
          description: 'You can now start the quiz.',
        });
      }
    }
  };

  const startQuiz = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsQuizMode(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setShowExplanation(false);
  };

  const selectAnswer = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      const prevQuestion = questions[currentQuestionIndex - 1];
      setShowExplanation(selectedAnswers[prevQuestion.id] !== undefined);
    }
  };

  const finishQuiz = () => {
    if (!user || !id) return;
    
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: selectedAnswers[q.id] ?? -1,
      isCorrect: selectedAnswers[q.id] === q.correctAnswer,
    }));
    
    const score = answers.filter((a) => a.isCorrect).length;
    
    createQuizAttempt({
      userId: user.id,
      courseId: id,
      score,
      totalQuestions: questions.length,
      answers,
    });
    
    updateUserProgress(user.id, id);
    setShowResults(true);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const isCorrect = currentQuestion && currentAnswer === currentQuestion.correctAnswer;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const finalScore = Object.entries(selectedAnswers).filter(
    ([qId, answer]) => questions.find((q) => q.id === qId)?.correctAnswer === answer
  ).length;

  if (!course) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </Layout>
    );
  }

  if (showResults) {
    const percentage = (finalScore / questions.length) * 100;
    return (
      <Layout>
        <div className="container py-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
              <CardDescription>Here's how you did</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {percentage.toFixed(0)}%
                </div>
                <p className="text-muted-foreground">
                  You got {finalScore} out of {questions.length} questions correct
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Review Your Answers</h3>
                {questions.map((q, index) => {
                  const userAnswer = selectedAnswers[q.id];
                  const correct = userAnswer === q.correctAnswer;
                  return (
                    <div key={q.id} className="p-4 rounded-lg border">
                      <div className="flex items-start gap-3">
                        {correct ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium mb-2">
                            {index + 1}. {q.text}
                          </p>
                          <p className="text-sm">
                            Your answer: <span className={correct ? 'text-green-500' : 'text-destructive'}>
                              {q.options[userAnswer] || 'Not answered'}
                            </span>
                          </p>
                          {!correct && (
                            <p className="text-sm text-green-500">
                              Correct answer: {q.options[q.correctAnswer]}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-2">{q.explanation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate('/courses')} className="flex-1">
                  Back to Courses
                </Button>
                <Button onClick={startQuiz} className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isQuizMode && currentQuestion) {
    return (
      <Layout>
        <div className="container py-8 max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setIsQuizMode(false)}>
                Exit Quiz
              </Button>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentAnswer === index;
                  const isCorrectAnswer = index === currentQuestion.correctAnswer;
                  const showCorrectness = showExplanation && isSelected;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => !showExplanation && selectAnswer(currentQuestion.id, index)}
                      disabled={showExplanation}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        showCorrectness
                          ? isCorrectAnswer
                            ? 'border-green-500 bg-green-50 dark:bg-green-950'
                            : 'border-destructive bg-destructive/10'
                          : isSelected
                          ? 'border-primary bg-primary/10'
                          : 'hover:border-primary/50'
                      } ${showExplanation && isCorrectAnswer && !isSelected ? 'border-green-500' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-6 w-6 rounded-full border flex items-center justify-center text-sm font-medium ${
                          showCorrectness && isCorrectAnswer ? 'bg-green-500 text-white border-green-500' :
                          showCorrectness && !isCorrectAnswer ? 'bg-destructive text-white border-destructive' :
                          isSelected ? 'bg-primary text-primary-foreground border-primary' : ''
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                        {showExplanation && isCorrectAnswer && (
                          <CheckCircle className="ml-auto h-5 w-5 text-green-500" />
                        )}
                        {showExplanation && isSelected && !isCorrectAnswer && (
                          <XCircle className="ml-auto h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {showExplanation && (
                <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 dark:bg-green-950' : 'bg-destructive/10'}`}>
                  <p className={`font-medium mb-1 ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                </div>
              )}
              
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={nextQuestion}
                  disabled={currentAnswer === undefined}
                  className="flex-1"
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>
        
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={course.imageUrl}
                alt={course.title}
                className="object-cover w-full h-full"
              />
            </div>
            
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{course.category}</Badge>
                <Badge>{course.difficulty}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.description}</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{course.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BarChart className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="font-medium">{course.questionCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Level</p>
                      <p className="font-medium capitalize">{course.difficulty}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Start Learning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEnrolled ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span>You're enrolled in this course</span>
                    </div>
                    {previousAttempts.length > 0 && (
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Best Score</p>
                        <p className="text-2xl font-bold">{bestScore.toFixed(0)}%</p>
                        <p className="text-sm text-muted-foreground">
                          {previousAttempts.length} attempt(s)
                        </p>
                      </div>
                    )}
                    <Button onClick={startQuiz} className="w-full" disabled={questions.length === 0}>
                      {previousAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
                    </Button>
                    {questions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">
                        No questions available yet
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Enroll in this course to access quizzes and track your progress.
                    </p>
                    <Button onClick={handleEnroll} className="w-full">
                      Enroll Now - Free
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetail;
