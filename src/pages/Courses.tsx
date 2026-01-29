import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Course } from '@/types';
import { getCourses, enrollInCourse } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, BarChart, Search, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  
  const { user, updateCurrentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const allCourses = getCourses();
    setCourses(allCourses);
    setFilteredCourses(allCourses);
  }, []);

  useEffect(() => {
    let filtered = courses;
    
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((c) => c.category === categoryFilter);
    }
    
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter((c) => c.difficulty === difficultyFilter);
    }
    
    setFilteredCourses(filtered);
  }, [searchQuery, categoryFilter, difficultyFilter, courses]);

  const categories = [...new Set(courses.map((c) => c.category))];

  const handleEnroll = (courseId: string) => {
    if (!user) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to enroll in courses.',
        variant: 'destructive',
      });
      return;
    }
    
    const success = enrollInCourse(user.id, courseId);
    if (success) {
      const updatedUser = { ...user, enrolledCourses: [...user.enrolledCourses, courseId] };
      updateCurrentUser(updatedUser);
      toast({
        title: 'Enrolled successfully!',
        description: 'You can now access this course from your dashboard.',
      });
    }
  };

  const isEnrolled = (courseId: string) => {
    return user?.enrolledCourses.includes(courseId) || false;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return '';
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
          <p className="text-muted-foreground">
            Discover CBT-based courses designed to help you succeed
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="object-cover w-full h-full"
                  />
                  {isEnrolled(course.id) && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enrolled
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{course.category}</Badge>
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart className="h-4 w-4" />
                      {course.questionCount} questions
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  {isEnrolled(course.id) ? (
                    <Button asChild className="w-full">
                      <Link to={`/course/${course.id}`}>Continue Learning</Link>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild className="flex-1">
                        <Link to={`/course/${course.id}`}>View Details</Link>
                      </Button>
                      <Button onClick={() => handleEnroll(course.id)} className="flex-1">
                        Enroll Now
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Courses;
