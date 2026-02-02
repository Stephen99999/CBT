import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Course, Question, QuizAttempt } from '@/types';
import { 
  getCourseById, 
  getQuestionsByCourse, 
  enrollInCourse, 
  getMyQuizAttempts, 
  getEnrolledCourses,
  startQuizAttempt, 
  submitQuizResult
} from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, BarChart, CheckCircle, ArrowLeft, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper to format seconds into MM:SS
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Data State
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enrollment State
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Quiz UI States
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // Ref to prevent double submission race conditions
  const isSubmittingRef = useRef(false);

  // 1. Fetch Data on Mount
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const [courseData, questionsData, enrolledList] = await Promise.all([
          getCourseById(id),
          getQuestionsByCourse(id),
          getEnrolledCourses().catch(() => [])
        ]);

        setCourse(courseData);
        setQuestions(questionsData);

        const found = enrolledList.find((c: Course) => String(c.id) === String(id));
        setIsEnrolled(!!found);

        if (user) {
          const allAttempts = await getMyQuizAttempts();
          setAttempts(allAttempts.filter((a) => String(a.courseId) === String(id)));
        }
      } catch (error) {
        console.error("Failed to fetch course data", error);
        toast({
          title: "Error",
          description: "Could not load course details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id, user, toast]);

  // 2. Anti-Cheat & Timer Logic
  useEffect(() => {
    if (!isQuizMode || !currentAttemptId || !course) return;

    // A. Disable Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);

    // B. Calculate Deadline
    // Note: In a production app, fetch the exact server-side 'createdAt' for better precision
    const durationInMinutes = Number(course.time_allowed) || 10;
    const now = new Date().getTime();
    const deadline = now + (durationInMinutes * 60 * 1000); 

    // C. Timer Interval
    const timerInterval = setInterval(() => {
      const currentTime = new Date().getTime();
      const secondsLeft = Math.floor((deadline - currentTime) / 1000);

      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        setTimeLeft(0);
        handleAutoSubmit("Time is up!");
      } else {
        setTimeLeft(secondsLeft);
      }
    }, 1000);

    // D. Tab Switch Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleAutoSubmit("Cheating detected: You switched tabs.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timerInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isQuizMode, currentAttemptId, course]);

  // Helper Wrapper for Auto-Submission
  const handleAutoSubmit = (reason: string) => {
    if (isSubmittingRef.current) return; // Prevent double calls
    
    toast({
        title: "Quiz Ended",
        description: reason,
        variant: "destructive"
    });
    finishQuiz();
  };

  const bestScore = attempts.length > 0 
    ? Math.max(...attempts.map((a) => (a.totalQuestions && a.totalQuestions > 0)
        ? ((a.score ?? 0) / a.totalQuestions) * 100
        : (a.score ?? 0)))
    : 0;

  // 3. Handlers
  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to enroll.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    
    if (id) {
      setEnrolling(true);
      try {
        const success = await enrollInCourse(id);
        if (success) {
          setIsEnrolled(true);
          toast({
            title: 'Enrolled successfully!',
            description: 'You can now start the quiz.',
          });
        }
      } catch (error) {
        toast({
            title: 'Enrollment Failed',
            description: 'Please try again later.',
            variant: "destructive"
        });
      } finally {
        setEnrolling(false);
      }
    }
  };

  const startQuiz = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Frontend Check: Prevent restart if already attempted
    if (attempts.length > 0) {
        toast({
            title: "Access Denied",
            description: "You have already attempted this quiz.",
            variant: "destructive"
        });
        return;
    }
    
    if (!id) return;

    setStartingQuiz(true);
    isSubmittingRef.current = false; // Reset ref

    try {
        const data = await startQuizAttempt(id);
        setCurrentAttemptId(data.attempt_id);

        setIsQuizMode(true);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
    } catch (error: any) {
        console.error(error);
        if (error.response?.status === 400) {
             toast({
                title: "Cannot Restart",
                description: "You have already taken this quiz.",
                variant: "destructive"
            });
            // Refresh attempts to update UI
            const allAttempts = await getMyQuizAttempts();
            setAttempts(allAttempts.filter((a) => String(a.courseId) === String(id)));
        } else {
            toast({
                title: "Warning",
                description: "You have already attempted this quiz.",
                variant: "destructive"
            });
        }
    } finally {
        setStartingQuiz(false);
    }
  };

  const selectAnswer = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const finishQuiz = async () => {
    // 1. Validation Checks
    if (isSubmittingRef.current) return;
    if (!user || !id || !currentAttemptId) return;

    // 2. Lock Submission
    isSubmittingRef.current = true;
    setSubmitting(true);
    
    // 3. Calculate Score Locally
    const answers = questions.map((q) => {
        const userAns = selectedAnswers[q.id];
        const isCorrect = Number(userAns) === Number(q.correct_answer);
        return {
            questionId: q.id,
            selectedAnswer: userAns ?? -1,
            isCorrect: isCorrect,
        };
    });
    
    const score = answers.filter((a) => a.isCorrect).length;
    
    try {
        await submitQuizResult(currentAttemptId, score);

        const updatedAttempts = await getMyQuizAttempts();
        setAttempts(updatedAttempts.filter((a) => String(a.courseId) === String(id)));
        
        // Short delay for UX
        setTimeout(() => {
            setShowResults(true);
        }, 500);

    } catch (error: any) {
        console.error(error);
        // Even if backend fails (e.g. timeout), show the result locally so user isn't stuck
        if(error.response?.status === 200) {
             setShowResults(true);
        } else {
             toast({
                title: "Submission Status",
                description: error.response?.data?.msg || "Quiz submitted, but there was an issue saving.",
                variant: "default" 
            });
            setShowResults(true);
        }
    } finally {
        setSubmitting(false);
        setCurrentAttemptId(null);
        setIsQuizMode(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  if (loading) {
    return (
        <Layout>
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </Layout>
    );
  }

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

  // --- RESULTS VIEW ---
  if (showResults) {
    return (
      <Layout>
        <div className="container py-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Quiz Submitted</CardTitle>
              <CardDescription>
                Thank you for completing the assessment. Your results have been recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">              
              <Button variant="outline" onClick={() => navigate('/courses')} className="w-full">
                Back to Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // --- QUIZ VIEW (ACTIVE) ---
  if (isQuizMode && currentQuestion) {
    return (
      <Layout>
        {/* 'select-none' disables text highlighting */}
        <div className="container py-8 max-w-2xl mx-auto select-none">
          
          {/* Header Bar */}
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              
              {/* Timer Badge */}
              {timeLeft !== null && (
                 <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="text-lg px-4 py-1 animate-in fade-in">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatTime(timeLeft)}
                 </Badge>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <Card className="border-2">
            <CardHeader className="bg-muted/30 pb-6">
              <CardTitle className="text-xl leading-relaxed">
                  {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               <div className="grid gap-3">
                {currentQuestion.options.map((option, index) => (
                    <Button
                    key={index}
                    variant={currentAnswer === index ? "default" : "outline"}
                    className={`justify-start h-auto py-4 px-4 text-left whitespace-normal text-base transition-all
                        ${currentAnswer === index ? 'ring-2 ring-primary ring-offset-2' : 'hover:bg-muted'}
                    `}
                    onClick={() => selectAnswer(currentQuestion.id, index)}
                    >
                    <span className="mr-3 font-bold bg-muted-foreground/10 w-6 h-6 flex items-center justify-center rounded text-xs">
                        {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                    </Button>
                ))}
                </div>

              <div className="flex gap-4 pt-4 border-t mt-4">
                <Button
                  variant="ghost"
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0 || submitting}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  onClick={nextQuestion}
                  // We generally want to allow them to skip, but if you want to force an answer:
                  // disabled={currentAnswer === undefined || submitting}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentQuestionIndex === questions.length - 1 ? 'Submit Exam' : 'Next Question'}
                  {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
             <AlertTriangle className="h-4 w-4 text-yellow-500" />
             <span>Do not switch tabs or reload. The exam will auto-submit.</span>
          </div>
        </div>
      </Layout>
    );
  }

  // --- COURSE OVERVIEW VIEW ---
  return (
    <Layout>
      <div className="container py-8">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Image & Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video rounded-xl overflow-hidden bg-muted shadow-sm">
              <img
                src={course.imageUrl || "https://placehold.co/600x400?text=Course"}
                alt={course.title}
                className="object-cover w-full h-full"
              />
            </div>
            
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className="px-3">CBT Examination</Badge>
                <Badge variant="outline" className="uppercase">{course.level}</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">{course.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">{course.description}</p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4 pt-4">
               <Card className="bg-muted/50 border-none">
                   <CardContent className="p-4 flex items-center gap-3">
                       <div className="p-2 bg-background rounded-full"><Clock className="h-5 w-5 text-primary"/></div>
                       <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Duration</p>
                           <p className="font-semibold">{course.time_allowed} Mins</p>
                       </div>
                   </CardContent>
               </Card>
               <Card className="bg-muted/50 border-none">
                   <CardContent className="p-4 flex items-center gap-3">
                       <div className="p-2 bg-background rounded-full"><BarChart className="h-5 w-5 text-primary"/></div>
                       <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Questions</p>
                           <p className="font-semibold">{questions.length}</p>
                       </div>
                   </CardContent>
               </Card>
               <Card className="bg-muted/50 border-none">
                   <CardContent className="p-4 flex items-center gap-3">
                       <div className="p-2 bg-background rounded-full"><BookOpen className="h-5 w-5 text-primary"/></div>
                       <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Mode</p>
                           <p className="font-semibold">Strict</p>
                       </div>
                   </CardContent>
               </Card>
            </div>
          </div>
          
          {/* Right Column: Action Card */}
          <div className="space-y-6">
            <Card className="sticky top-24 shadow-lg border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle>Action Center</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEnrolled ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-100">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">You are enrolled</span>
                    </div>

                    {attempts.length > 0 ? (
                      <div className="p-6 rounded-lg bg-muted text-center space-y-2">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Final Score</p>
                        <p className="text-4xl font-extrabold text-primary">{bestScore.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground pt-2 border-t mt-4">
                           Exam completed. No retakes allowed.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Ready to begin? Once started, the timer cannot be paused.
                            </p>
                            <Button 
                                onClick={startQuiz} 
                                size="lg"
                                className="w-full font-semibold text-lg h-12" 
                                disabled={questions.length === 0 || startingQuiz}
                            >
                              {startingQuiz && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Start Examination
                            </Button>
                        </div>
                        {questions.length === 0 && (
                          <p className="text-xs text-red-500 text-center bg-red-50 p-2 rounded">
                            Exam questions are not yet available.
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Enrollment is required to access the examination materials and track your results.
                    </p>
                    <Button 
                        onClick={handleEnroll} 
                        className="w-full"
                        size="lg"
                        disabled={enrolling}
                    >
                      {enrolling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                      ) : (
                        "Enroll Now"
                      )}
                    </Button>
                  </div>
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