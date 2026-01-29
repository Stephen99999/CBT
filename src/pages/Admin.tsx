import React, { useState, useEffect } from 'react';
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
import { 
  getCourses, createCourse, updateCourse, deleteCourse,
  getQuestions, getQuestionsByCourse, createQuestion, updateQuestion, deleteQuestion,
  getUsers, deleteUser, getQuizAttempts
} from '@/lib/storage';
import { Course, Question, User, QuizAttempt } from '@/types';
import { 
  BookOpen, Users, BarChart3, Settings, PlusCircle, Pencil, Trash2, 
  ChevronDown, ChevronUp, AlertCircle
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
  
  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'course' | 'question' | 'user'; id: string } | null>(null);
  
  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    duration: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    imageUrl: '',
  });
  
  const [questionForm, setQuestionForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedCourse) {
      setCourseQuestions(getQuestionsByCourse(selectedCourse));
    }
  }, [selectedCourse]);

  const loadData = () => {
    setCourses(getCourses());
    setUsers(getUsers());
    setQuizAttempts(getQuizAttempts());
  };

  // Course handlers
  const openCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        title: course.title,
        description: course.description,
        category: course.category,
        duration: course.duration,
        difficulty: course.difficulty,
        imageUrl: course.imageUrl,
      });
    } else {
      setEditingCourse(null);
      setCourseForm({
        title: '',
        description: '',
        category: '',
        duration: '',
        difficulty: 'beginner',
        imageUrl: '',
      });
    }
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = () => {
    if (editingCourse) {
      updateCourse(editingCourse.id, courseForm);
      toast({ title: 'Course updated successfully' });
    } else {
      createCourse(courseForm);
      toast({ title: 'Course created successfully' });
    }
    setCourseDialogOpen(false);
    loadData();
  };

  // Question handlers
  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        text: question.text,
        options: [...question.options],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      });
    }
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = () => {
    if (!selectedCourse) return;
    
    if (editingQuestion) {
      updateQuestion(editingQuestion.id, questionForm);
      toast({ title: 'Question updated successfully' });
    } else {
      createQuestion({ ...questionForm, courseId: selectedCourse });
      toast({ title: 'Question created successfully' });
    }
    setQuestionDialogOpen(false);
    setCourseQuestions(getQuestionsByCourse(selectedCourse));
    loadData();
  };

  // Delete handlers
  const confirmDelete = () => {
    if (!deleteTarget) return;
    
    switch (deleteTarget.type) {
      case 'course':
        deleteCourse(deleteTarget.id);
        toast({ title: 'Course deleted successfully' });
        if (selectedCourse === deleteTarget.id) setSelectedCourse(null);
        break;
      case 'question':
        deleteQuestion(deleteTarget.id);
        toast({ title: 'Question deleted successfully' });
        if (selectedCourse) setCourseQuestions(getQuestionsByCourse(selectedCourse));
        break;
      case 'user':
        deleteUser(deleteTarget.id);
        toast({ title: 'User deleted successfully' });
        break;
    }
    
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    loadData();
  };

  // Analytics calculations
  const totalEnrollments = users.reduce((sum, u) => sum + u.enrolledCourses.length, 0);
  const averageScore = quizAttempts.length > 0
    ? quizAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / quizAttempts.length
    : 0;
  const courseCompletionRate = courses.length > 0
    ? (courses.filter(c => quizAttempts.some(a => a.courseId === c.id)).length / courses.length) * 100
    : 0;

  if (!user || user.role !== 'admin') return null;

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Score</p>
                  <p className="text-2xl font-bold">{averageScore.toFixed(0)}%</p>
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
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{course.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
                        </TableCell>
                        <TableCell>{course.questionCount}</TableCell>
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
                              {index + 1}. {question.text}
                            </p>
                            <div className="mt-2 space-y-1">
                              {question.options.map((option, optIndex) => (
                                <p
                                  key={optIndex}
                                  className={`text-sm ${
                                    optIndex === question.correctAnswer
                                      ? 'text-green-600 dark:text-green-400 font-medium'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                  {optIndex === question.correctAnswer && ' ✓'}
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
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.enrolledCourses.length}</TableCell>
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
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>Quiz attempts and scores by course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.map((course) => {
                      const courseAttempts = quizAttempts.filter((a) => a.courseId === course.id);
                      const avgScore = courseAttempts.length > 0
                        ? courseAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / courseAttempts.length
                        : 0;
                      
                      return (
                        <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {courseAttempts.length} attempts
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{avgScore.toFixed(0)}%</p>
                            <p className="text-sm text-muted-foreground">avg. score</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest quiz completions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quizAttempts.slice(-5).reverse().map((attempt) => {
                      const attemptUser = users.find((u) => u.id === attempt.userId);
                      const course = courses.find((c) => c.id === attempt.courseId);
                      
                      return (
                        <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{attemptUser?.name || 'Unknown User'}</p>
                            <p className="text-sm text-muted-foreground">{course?.title || 'Unknown Course'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {((attempt.score / attempt.totalQuestions) * 100).toFixed(0)}%
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(attempt.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {quizAttempts.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No quiz attempts yet</p>
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
                <Label>Difficulty</Label>
                <Select
                  value={courseForm.difficulty}
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') =>
                    setCourseForm((prev) => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="question-explanation">Explanation</Label>
              <Textarea
                id="question-explanation"
                placeholder="Explain why this is the correct answer..."
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion}>Save</Button>
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
