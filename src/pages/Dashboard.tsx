import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { getEnrolledCourses, getMyQuizAttempts, getClasses, getMyAttendance, markClassAttendance, describeGeofenceRejection } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Course, QuizAttempt, ClassInfo, AttendanceRecord } from '@/types';
import { BookOpen, Calendar, ArrowRight, Award, Loader2, MapPin, Clock, CheckCircle2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveClasses, setLiveClasses] = useState<ClassInfo[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const { toast } = useToast();

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
        const [myCoursesData, attemptsData, classesData, attendanceData] = await Promise.all([
          getEnrolledCourses(),  // Calls your new working backend endpoint
          getMyQuizAttempts(),
          getClasses(),          // Live classes (for attendance)
          getMyAttendance()      // My attendance history (to show "Marked")
        ]);

        console.log("✅ My Courses from Backend:", attemptsData);

        setEnrolledCourses(myCoursesData);
        setRecentAttempts(attemptsData.slice(-5).reverse());
        setLiveClasses(classesData);
        setMyAttendance(attendanceData);

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

  // ---------- Live classes / attendance helpers ----------
  const getClassStatus = (cls: ClassInfo): 'upcoming' | 'running' | 'ended' => {
    const now = Date.now();
    const start = new Date(cls.start_time).getTime();
    const end = start + cls.duration_minutes * 60 * 1000;
    if (now < start) return 'upcoming';
    if (now <= end) return 'running';
    return 'ended';
  };

  const hasMarked = (classId: number) =>
    myAttendance.some((a) => Number(a.class_id) === Number(classId));

  const handleMarkAttendance = async (cls: ClassInfo) => {
    setMarkingId(cls.id);
    try {
      // Location is captured automatically from the student's device GPS
      const record = await markClassAttendance(cls.id);
      setMyAttendance((prev) => [...prev, record]);
      toast({
        title: 'Attendance marked ✅',
        description:
          record.distance_meters != null
            ? `You were ${Math.round(record.distance_meters)}m from the class location.`
            : 'Attendance marked successfully.',
      });
    } catch (error: any) {
      // The geofence rejection carries the numbers (distance, radius and both
      // GPS-error tolerances), so explain those instead of the bare "too far"
      // message — otherwise the student can't tell whether they moved, their fix
      // was poor, or the class location itself was captured somewhere else.
      const description =
        describeGeofenceRejection(error?.data) || error?.message || 'Something went wrong.';

      toast({
        title: 'Attendance not recorded',
        description,
        variant: 'destructive',
      });
    } finally {
      setMarkingId(null);
    }
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

        {/* Live Classes / Attendance */}
        {liveClasses.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Live Classes
              </CardTitle>
              <CardDescription>
                Mark attendance while you are within the allowed radius of the class location
                (your location is captured automatically)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveClasses.map((cls) => {
                const status = getClassStatus(cls);
                const marked = hasMarked(cls.id);
                return (
                  <div
                    key={cls.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(cls.start_time).toLocaleString()} · {cls.duration_minutes} min
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        Attendance within {cls.allowed_radius} m of the lecturer
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={status === 'running' ? 'default' : 'secondary'}>
                        {status === 'running' ? 'Live now' : status === 'upcoming' ? 'Soon' : 'Ended'}
                      </Badge>
                      {marked && (
                        <span className="flex items-center gap-1 text-sm text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Marked
                        </span>
                      )}
                      <Button
                        size="sm"
                        disabled={status !== 'running' || marked || markingId !== null}
                        onClick={() => handleMarkAttendance(cls)}
                      >
                        {markingId === cls.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Locating…
                          </>
                        ) : (
                          'Mark Attendance'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* My Attendance History */}
        {myAttendance.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  My Attendance
                </CardTitle>
                <CardDescription>
                  Every class you have marked attendance for
                </CardDescription>
              </div>
              <Badge variant="secondary" className="px-3">
                {myAttendance.length} marked
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {myAttendance.map((record) => {
                const cls = record.attended_class;
                return (
                  <div
                    key={record.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {cls ? cls.name : `Class #%${record.class_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Marked {new Date(record.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {record.distance_meters} m from class
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

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
                          ).toFixed(0)}
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