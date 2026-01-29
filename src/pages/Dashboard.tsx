import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses, getUserQuizAttempts, getUserThoughtRecords } from '@/lib/storage';
import { Course, QuizAttempt, ThoughtRecord } from '@/types';
import { BookOpen, Brain, TrendingUp, Calendar, ArrowRight, Award } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [thoughtRecords, setThoughtRecords] = useState<ThoughtRecord[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const allCourses = getCourses();
    const enrolled = allCourses.filter((c) => user.enrolledCourses.includes(c.id));
    setEnrolledCourses(enrolled);

    const attempts = getUserQuizAttempts(user.id);
    setRecentAttempts(attempts.slice(-5).reverse());

    const records = getUserThoughtRecords(user.id);
    setThoughtRecords(records.slice(-3).reverse());
  }, [user, navigate]);

  if (!user) return null;

  const totalQuizzes = recentAttempts.length;
  const averageScore = totalQuizzes > 0
    ? recentAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / totalQuizzes
    : 0;

  const getCourseTitle = (courseId: string) => {
    return enrolledCourses.find((c) => c.id === courseId)?.title || 'Unknown Course';
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">
            Track your progress and continue learning
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                  <p className="text-2xl font-bold">{enrolledCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quizzes Completed</p>
                  <p className="text-2xl font-bold">{totalQuizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{averageScore.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Thought Records</p>
                  <p className="text-2xl font-bold">{thoughtRecords.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Enrolled Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Continue where you left off</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/courses">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {enrolledCourses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet</p>
                  <Button asChild>
                    <Link to="/courses">Browse Courses</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrolledCourses.slice(0, 3).map((course) => {
                    const courseAttempts = recentAttempts.filter((a) => a.courseId === course.id);
                    const progress = courseAttempts.length > 0 
                      ? Math.min(100, (courseAttempts.length / 3) * 100) 
                      : 0;
                    
                    return (
                      <Link
                        key={course.id}
                        to={`/course/${course.id}`}
                        className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={course.imageUrl}
                              alt={course.title}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{course.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {courseAttempts.length} quiz attempt(s)
                            </p>
                            <Progress value={progress} className="h-2 mt-2" />
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest quiz attempts</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {recentAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No quiz attempts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAttempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{getCourseTitle(attempt.courseId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(attempt.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {((attempt.score / attempt.totalQuestions) * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.score}/{attempt.totalQuestions}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CBT Tools Promo */}
        <Card className="mt-8">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">Practice CBT Techniques</h3>
                <p className="text-muted-foreground">
                  Use thought records and cognitive restructuring tools to manage exam anxiety
                </p>
              </div>
              <Button asChild>
                <Link to="/cbt-tools">
                  Open CBT Tools
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
