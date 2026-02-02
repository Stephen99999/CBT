import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
// 👇 IMPORT THE NEW FUNCTION HERE
import { getEnrolledCourses, getMyQuizAttempts } from '@/lib/storage'; 
import { Course, QuizAttempt } from '@/types';
import { BookOpen, TrendingUp, Calendar, ArrowRight, Award, Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback image since your API logs show 'imageUrl' is missing from the DB response
  const DEFAULT_IMAGE = "https://placehold.co/600x400?text=Course+Image";

  useEffect(() => {
    if (!user) {
        navigate('/auth');
        return;
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            // 👇 1. FETCH DATA IN PARALLEL
            const [myCoursesData, attemptsData] = await Promise.all([
                getEnrolledCourses(),  // Calls your new working backend endpoint
                getMyQuizAttempts()
            ]);

            console.log("✅ My Courses from Backend:", myCoursesData);

            setEnrolledCourses(myCoursesData);
            setRecentAttempts(attemptsData.slice(-5).reverse());
            
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();

  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
        <Layout>
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </Layout>
    );
  }

  const totalQuizzes = recentAttempts.length;
  const averageScore = totalQuizzes > 0
    ? recentAttempts.reduce((sum, a) => {
        const pct = (a.totalQuestions && a.totalQuestions > 0)
          ? ((a.score ?? 0) / a.totalQuestions) * 100
          : (a.score ?? 0);
        return sum + pct;
      }, 0) / totalQuizzes
    : 0;

  const getCourseTitle = (courseId: string | number) => {
    // Robust check (String vs Number)
    const found = enrolledCourses.find((c) => String(c.id) === String(courseId));
    return found?.title || 'Unknown Course';
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
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
                    const courseAttempts = recentAttempts.filter((a) => String(a.courseId ?? a.course_id) === String(course.id));
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
                            {/* Uses Default Image if API doesn't send one */}
                            <img
                              src={course.imageUrl || DEFAULT_IMAGE}
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
                        <p className="font-medium">{getCourseTitle(attempt.courseId ?? attempt.course_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(attempt.completedAt ?? attempt.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {(attempt.totalQuestions && attempt.totalQuestions > 0
                            ? ((attempt.score ?? 0) / attempt.totalQuestions) * 100
                            : (attempt.score ?? 0)
                          ).toFixed(0)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.score ?? '—'}/{attempt.totalQuestions ?? '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;