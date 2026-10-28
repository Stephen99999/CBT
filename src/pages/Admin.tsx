import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import {
  getCoursesAdmin, createCourse, updateCourse, deleteCourse,
  getQuestionsByCourse, createQuestion, updateQuestion, deleteQuestion,
  getUsers, deleteUser, getQuizAttempts,
  toggleCourseAvailability, toggleShowResult,
  getClasses, createClass, deleteClass, getClassAttendance
} from '@/lib/storage';
import { Course, Question, User, QuizAttempt, ClassInfo, AttendanceRecord } from '@/types';
import {
  BookOpen, Users, BarChart3, Settings, PlusCircle, Pencil, Trash2,
  AlertCircle, Loader2, MapPin, ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [courseQuestions, setCourseQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'course' | 'question' | 'user' | 'class'; id: string } | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    duration: '',
    imageUrl: '',
  });

  const [questionForm, setQuestionForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  });

  // Class states
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    start_time: '',   // datetime-local value
    duration: '',     // minutes (string in form, converted on save)
    radius: '',       // meters (string in form, converted on save)
  });

  // Attendance viewer states
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [viewingClass, setViewingClass] = useState<ClassInfo | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [analyticsCourseFilter, setAnalyticsCourseFilter] = useState("all");
  const filteredAttempts = analyticsCourseFilter === "all"
    ? quizAttempts
    : quizAttempts.filter(attempt => String(attempt.course_id) === String(analyticsCourseFilter));

  const exportToCSV = () => {
    // Define CSV headers
    const headers = ["Student Name", "Matric_no", "Course Title", "Score", "Date"];

    // Map the filtered data to CSV rows
    const csvRows = filteredAttempts.map(attempt => {
      const userName = attempt.User?.name || 'Unknown User';
      const matric_no = attempt.User?.matric_no || 'Unknown Matric Number'
      const courseTitle = attempt.Course?.title || 'Unknown Course';
      const score = attempt.score !== null ? attempt.score : 'In Progress';
      const date = new Date(attempt.createdAt).toLocaleDateString();

      // Wrap fields in quotes to prevent issues with commas in names or titles
      return `"${userName}","${matric_no}","${courseTitle}","${score}","${date}"`;
    });

    // Combine headers and rows
    const csvString = [headers.join(","), ...csvRows].join("\n");

    // Create a Blob and trigger download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Name the file dynamically based on the filter
    const fileName = analyticsCourseFilter === "all"
      ? "all_scores.csv"
      : `course_${analyticsCourseFilter}_scores.csv`;

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      // Fetch all core data in parallel
      const [coursesData, usersData, attemptsData, classesData] = await Promise.all([
        getCoursesAdmin(),
        getUsers(),
        getQuizAttempts(),
        getClasses()
      ]);
      console.log("Loaded Courses:", coursesData);

      setCourses(coursesData);
      setUsers(usersData);
      setQuizAttempts(attemptsData);
      setClasses(classesData);
    } catch (error) {
      console.error("Failed to load admin data", error);
      toast({
        title: "Error loading data",
        description: "Could not fetch admin data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate, loadData]);

  // Load Questions when a course is selected
  useEffect(() => {
    const fetchQuestions = async () => {
      if (selectedCourse) {
        try {
          // Assuming getQuestions accepts a courseId or we filter the result
          // If your API supports getQuestions(courseId), pass it here.
          const questions = await getQuestionsByCourse(selectedCourse);
          setCourseQuestions(questions);
        } catch (error) {
          toast({ title: "Failed to load questions", variant: "destructive" });
        }
      } else {
        setCourseQuestions([]);
      }
    };
    fetchQuestions();
  }, [selectedCourse, toast]);

  // Course handlers
  const openCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        title: course.title,
        description: course.description,
        category: course.level,
        duration: course.time_allowed,
        imageUrl: course.imageUrl,
      });
    } else {
      setEditingCourse(null);
      setCourseForm({
        title: '',
        description: '',
        category: '',
        duration: '',
        imageUrl: '',
      });
    }
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, courseForm);
        toast({ title: 'Course updated successfully' });
      } else {
        await createCourse(courseForm);
        toast({ title: 'Course created successfully' });
      }
      setCourseDialogOpen(false);
      loadData(); // Refresh list
    } catch (error) {
      toast({ title: 'Operation failed', description: 'Could not save course.', variant: 'destructive' });
    }
  };

  // Question handlers
  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        text: question.question_text,
        options: [...question.options],
        correctAnswer: question.correct_answer,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      });
    }
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!selectedCourse) return;

    try {
      const questionData = { ...questionForm, courseId: selectedCourse };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
        toast({ title: 'Question updated successfully' });
      } else {
        await createQuestion(questionData);
        toast({ title: 'Question created successfully' });
      }
      setQuestionDialogOpen(false);

      // Refresh questions for this course
      const updatedQuestions = await getQuestionsByCourse(selectedCourse);
      setCourseQuestions(updatedQuestions);

      // Refresh main data (to update question counts in course list)
      loadData();
    } catch (error) {
      toast({ title: 'Operation failed', description: 'Could not save question.', variant: 'destructive' });
    }
  };

  // Delete handlers
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.type) {
        case 'course':
          await deleteCourse(deleteTarget.id);
          toast({ title: 'Course deleted successfully' });
          if (selectedCourse === deleteTarget.id) setSelectedCourse(null);
          break;
        case 'question':
          await deleteQuestion(deleteTarget.id);
          toast({ title: 'Question deleted successfully' });
          // Refresh questions list manually if we deleted a question
          if (selectedCourse) {
            const updated = await getQuestionsByCourse(selectedCourse);
            setCourseQuestions(updated);
          }
          break;
        case 'user':
          await deleteUser(deleteTarget.id);
          toast({ title: 'User deleted successfully' });
          break;
        case 'class':
          await deleteClass(deleteTarget.id);
          toast({ title: 'Class deleted successfully' });
          break;
      }

      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadData(); // Refresh global data
    } catch (error) {
      toast({ title: 'Delete failed', description: 'Could not delete item.', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (courseId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    try {
      // Optimistic UI update
      setCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === courseId
            ? { ...course, is_available: newStatus }
            : course
        )
      );

      await toggleCourseAvailability(courseId);

      toast({
        title: 'Status Updated',
        description: `Course is now ${newStatus ? 'Visible' : 'Hidden'}`,
      });
    } catch (error) {
      // Revert on failure
      setCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === courseId
            ? { ...course, is_available: currentStatus }
            : course
        )
      );
      toast({
        title: 'Update Failed',
        description: 'Could not update course status.',
        variant: 'destructive',
      });
    }
  };

  // Class handlers
  const openClassDialog = () => {
    setClassForm({ name: '', start_time: '', duration: '', radius: '' });
    setClassDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.name || !classForm.start_time) {
      toast({ title: 'Missing details', description: 'Class name and start time are required.', variant: 'destructive' });
      return;
    }
    setCreatingClass(true);
    try {
      // createClass captures the admin's current location automatically
      await createClass({
        name: classForm.name,
        start_time: classForm.start_time,
        duration_minutes: classForm.duration ? Number(classForm.duration) : undefined,
        allowed_radius: classForm.radius ? Number(classForm.radius) : undefined,
      });
      toast({ title: 'Class created successfully', description: 'Your current location was saved as the attendance zone.' });
      setClassDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Could not create class', description: error?.message || 'Failed to capture your location.', variant: 'destructive' });
    } finally {
      setCreatingClass(false);
    }
  };

  // Attendance viewer handler
  const openAttendanceDialog = async (cls: ClassInfo) => {
    setViewingClass(cls);
    setAttendanceDialogOpen(true);
    setLoadingAttendance(true);
    try {
      const records = await getClassAttendance(cls.id);
      setAttendanceRecords(records);
    } catch (error) {
      toast({ title: 'Failed to load attendance list', variant: 'destructive' });
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleToggleShowResult = async (courseId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    try {
      // Optimistic UI update
      setCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === courseId
            ? { ...course, show_result: newStatus }
            : course
        )
      );

      await toggleShowResult(courseId);

      toast({
        title: 'Show Result Updated',
        description: `Course will now ${newStatus ? 'show' : 'hide'} results to students.`,
      });
    } catch (error) {
      console.error('Failed to toggle show result', error);
      // Revert on failure
      setCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.id === courseId
            ? { ...course, show_result: currentStatus }
            : course
        )
      );
      toast({
        title: 'Update Failed',
        description: 'Could not update show result setting.',
        variant: 'destructive',
      });
    }
  };
  // Analytics calculations
  const totalEnrollments = courses.reduce((sum, course) =>
    sum + Number(course.totalEnrollments || 0), 0
  );

  if (!user || user.role !== 'admin') return null;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage courses, questions, and users
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>



          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enrollments</p>
                  <p className="text-2xl font-bold">{totalEnrollments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Course Management</CardTitle>
                  <CardDescription>Add, edit, or remove courses</CardDescription>
                </div>
                <Button onClick={() => openCourseDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Course
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Show Result</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{course.level}</TableCell>
                        <TableCell>
                          <Switch
                            checked={course.show_result}
                            onCheckedChange={() => handleToggleShowResult(course.id, course.show_result)}
                          />
                          {course.show_result ? 'Show Result' : 'Hide Result'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={course.is_available}
                            onCheckedChange={() => handleToggleStatus(course.id, course.is_available)}
                          />
                          {course.is_available ? 'Available' : 'Hidden'}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openCourseDialog(course)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteTarget({ type: 'course', id: course.id });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live Classes</CardTitle>
                  <CardDescription>
                    Create classes — the location is captured automatically from your current position
                  </CardDescription>
                </div>
                <Button onClick={() => openClassDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Class
                </Button>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No classes yet. Create your first class!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Starts</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Radius</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell>{new Date(cls.start_time).toLocaleString()}</TableCell>
                          <TableCell>{cls.duration_minutes} min</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cls.allowed_radius} m
                            </span>
                          </TableCell>
                          <TableCell>{cls.admin?.name || '—'}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View attendance"
                              onClick={() => openAttendanceDialog(cls)}
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteTarget({ type: 'class', id: String(cls.id) });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Question Management</CardTitle>
                    <CardDescription>Manage quiz questions for each course</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedCourse || ''} onValueChange={setSelectedCourse}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCourse && (
                      <Button onClick={() => openQuestionDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Question
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedCourse ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a course to manage its questions
                  </div>
                ) : courseQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No questions yet. Add your first question!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courseQuestions.map((question, index) => (
                      <div key={question.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              {index + 1}. {question.question_text}
                            </p>
                            <div className="mt-2 space-y-1">
                              {question.options.map((option, optIndex) => (
                                <p
                                  key={optIndex}
                                  className={`text-sm ${optIndex === question.correct_answer
                                    ? 'text-green-600 dark:text-green-400 font-medium'
                                    : 'text-muted-foreground'
                                    }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                  {optIndex === question.correct_answer && ' ✓'}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openQuestionDialog(question)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteTarget({ type: 'question', id: question.id });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Enrolled Courses</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.matric_no}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.enrolledCourses?.length || 0}</TableCell>
                        <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {u.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteTarget({ type: 'user', id: u.id });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">

              {/* --- CARD 1: COURSE PERFORMANCE --- */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>Average scores by course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.map((course) => {
                      const courseAttempts = quizAttempts.filter((a) => String(a.course_id) === String(course.id));
                      const totalScoreSum = courseAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
                      const avgRawScore = courseAttempts.length > 0 ? totalScoreSum / courseAttempts.length : 0;

                      return (
                        <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {courseAttempts.length} attempts
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{avgRawScore.toFixed(1)}</p>
                            <p className="text-sm text-muted-foreground">avg. points</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* --- CARD 2: RECENT ACTIVITY & SCORES --- */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <CardTitle>Scores & Activity</CardTitle>
                      <CardDescription>Filter and export quiz completions</CardDescription>
                    </div>

                    {/* Filter and Export Controls */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select value={analyticsCourseFilter} onValueChange={setAnalyticsCourseFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Courses</SelectItem>
                          {courses.map(course => (
                            <SelectItem key={course.id} value={String(course.id)}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        onClick={exportToCSV}
                        disabled={filteredAttempts.length === 0}
                      >
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Map over filteredAttempts instead of quizAttempts */}
                    {filteredAttempts.map((attempt) => {
                      const userName = attempt.User?.name || 'Unknown User';
                      const courseTitle = attempt.Course?.title || 'Unknown Course';
                      const scoreDisplay = attempt.score !== null ? attempt.score : 'In Progress';
                      const cheatedscore = attempt.cheated_score;

                      return (
                        <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{userName}</p>
                            <p className="text-sm text-muted-foreground">{courseTitle}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              Score: {scoreDisplay}
                            </p>
                            {cheatedscore && (
                              <p className="font-bold">
                                Cheated Score: {cheatedscore}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {new Date(attempt.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {filteredAttempts.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No scores match the selected filter.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
            <DialogDescription>
              {editingCourse ? 'Update the course details below' : 'Fill in the details to create a new course'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Title</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-description">Description</Label>
              <Textarea
                id="course-description"
                value={courseForm.description}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course-category">Category</Label>
                <Input
                  id="course-category"
                  value={courseForm.category}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-duration">Duration</Label>
                <Input
                  id="course-duration"
                  placeholder="e.g., 4 weeks"
                  value={courseForm.duration}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, duration: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="course-image">Image URL</Label>
                <Input
                  id="course-image"
                  placeholder="https://..."
                  value={courseForm.imageUrl}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCourse}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>
              Your current location will be captured automatically and saved as the
              attendance zone when you create the class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g., CHM 101 Morning Lecture"
                value={classForm.name}
                onChange={(e) => setClassForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-start">Start Time</Label>
              <Input
                id="class-start"
                type="datetime-local"
                value={classForm.start_time}
                onChange={(e) => setClassForm((prev) => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-duration">Duration (minutes)</Label>
                <Input
                  id="class-duration"
                  type="number"
                  min="1"
                  placeholder="60"
                  value={classForm.duration}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-radius">Allowed Radius (meters)</Label>
                <Input
                  id="class-radius"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={classForm.radius}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, radius: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)} disabled={creatingClass}>
              Cancel
            </Button>
            <Button onClick={handleSaveClass} disabled={creatingClass}>
              {creatingClass && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {creatingClass ? 'Capturing location…' : 'Create (uses my location)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? 'Update the question details' : 'Create a new quiz question'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question-text">Question</Label>
              <Textarea
                id="question-text"
                value={questionForm.text}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Answer Options</Label>
              {questionForm.options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="w-6 text-center font-medium">{String.fromCharCode(65 + index)}.</span>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[index] = e.target.value;
                      setQuestionForm((prev) => ({ ...prev, options: newOptions }));
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <Select
                value={questionForm.correctAnswer.toString()}
                onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, correctAnswer: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionForm.options.map((_, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      Option {String.fromCharCode(65 + index)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Attendance Viewer Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Attendance — {viewingClass?.name}
            </DialogTitle>
            <DialogDescription>
              Students who marked attendance for this class
              {viewingClass && ` (fence: ${viewingClass.allowed_radius} m)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {loadingAttendance ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students have marked attendance yet.
              </div>
            ) : (
              attendanceRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{record.student?.name || 'Unknown Student'}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.student?.matric_no}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="flex items-center gap-1 justify-center">
                      <MapPin className="h-3 w-3" />
                      {record.distance_meters} m
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(record.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Admin;