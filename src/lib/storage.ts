import { User, Course, Question, QuizAttempt, ThoughtRecord, ForumPost, UserProgress } from '@/types';

// Storage keys
const KEYS = {
  USERS: 'cbt_users',
  CURRENT_USER: 'cbt_current_user',
  COURSES: 'cbt_courses',
  QUESTIONS: 'cbt_questions',
  QUIZ_ATTEMPTS: 'cbt_quiz_attempts',
  THOUGHT_RECORDS: 'cbt_thought_records',
  FORUM_POSTS: 'cbt_forum_posts',
  USER_PROGRESS: 'cbt_user_progress',
};

// Generic storage helpers
const getItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// User functions
export const getUsers = (): User[] => getItem(KEYS.USERS, []);
export const setUsers = (users: User[]): void => setItem(KEYS.USERS, users);

export const getCurrentUser = (): User | null => getItem(KEYS.CURRENT_USER, null);
export const setCurrentUser = (user: User | null): void => setItem(KEYS.CURRENT_USER, user);

export const createUser = (email: string, password: string, name: string): User | null => {
  const users = getUsers();
  if (users.find(u => u.email === email)) {
    return null; // User already exists
  }
  
  const newUser: User = {
    id: crypto.randomUUID(),
    email,
    name,
    role: users.length === 0 ? 'admin' : 'user', // First user is admin
    createdAt: new Date().toISOString(),
    enrolledCourses: [],
  };
  
  // Store password hash (simplified for demo - in production use proper hashing)
  const userWithPassword = { ...newUser, passwordHash: btoa(password) };
  setUsers([...users, userWithPassword as User]);
  return newUser;
};

export const loginUser = (email: string, password: string): User | null => {
  const users = getUsers() as (User & { passwordHash?: string })[];
  const user = users.find(u => u.email === email && u.passwordHash === btoa(password));
  if (user) {
    const { passwordHash, ...userWithoutPassword } = user;
    setCurrentUser(userWithoutPassword);
    return userWithoutPassword;
  }
  return null;
};

export const logoutUser = (): void => {
  setCurrentUser(null);
};

export const updateUser = (userId: string, updates: Partial<User>): User | null => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  setUsers(users);
  
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    setCurrentUser(users[index]);
  }
  
  return users[index];
};

export const deleteUser = (userId: string): boolean => {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  if (filtered.length === users.length) return false;
  setUsers(filtered);
  return true;
};

// Course functions
export const getCourses = (): Course[] => getItem(KEYS.COURSES, []);
export const setCourses = (courses: Course[]): void => setItem(KEYS.COURSES, courses);

export const createCourse = (course: Omit<Course, 'id' | 'createdAt' | 'questionCount'>): Course => {
  const courses = getCourses();
  const newCourse: Course = {
    ...course,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    questionCount: 0,
  };
  setCourses([...courses, newCourse]);
  return newCourse;
};

export const updateCourse = (courseId: string, updates: Partial<Course>): Course | null => {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === courseId);
  if (index === -1) return null;
  
  courses[index] = { ...courses[index], ...updates };
  setCourses(courses);
  return courses[index];
};

export const deleteCourse = (courseId: string): boolean => {
  const courses = getCourses();
  const filtered = courses.filter(c => c.id !== courseId);
  if (filtered.length === courses.length) return false;
  setCourses(filtered);
  
  // Also delete related questions
  const questions = getQuestions().filter(q => q.courseId !== courseId);
  setQuestions(questions);
  
  return true;
};

// Question functions
export const getQuestions = (): Question[] => getItem(KEYS.QUESTIONS, []);
export const setQuestions = (questions: Question[]): void => setItem(KEYS.QUESTIONS, questions);

export const getQuestionsByCourse = (courseId: string): Question[] => {
  return getQuestions().filter(q => q.courseId === courseId);
};

export const createQuestion = (question: Omit<Question, 'id'>): Question => {
  const questions = getQuestions();
  const newQuestion: Question = {
    ...question,
    id: crypto.randomUUID(),
  };
  setQuestions([...questions, newQuestion]);
  
  // Update course question count
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === question.courseId);
  if (courseIndex !== -1) {
    courses[courseIndex].questionCount++;
    setCourses(courses);
  }
  
  return newQuestion;
};

export const updateQuestion = (questionId: string, updates: Partial<Question>): Question | null => {
  const questions = getQuestions();
  const index = questions.findIndex(q => q.id === questionId);
  if (index === -1) return null;
  
  questions[index] = { ...questions[index], ...updates };
  setQuestions(questions);
  return questions[index];
};

export const deleteQuestion = (questionId: string): boolean => {
  const questions = getQuestions();
  const question = questions.find(q => q.id === questionId);
  if (!question) return false;
  
  const filtered = questions.filter(q => q.id !== questionId);
  setQuestions(filtered);
  
  // Update course question count
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === question.courseId);
  if (courseIndex !== -1) {
    courses[courseIndex].questionCount = Math.max(0, courses[courseIndex].questionCount - 1);
    setCourses(courses);
  }
  
  return true;
};

// Quiz attempt functions
export const getQuizAttempts = (): QuizAttempt[] => getItem(KEYS.QUIZ_ATTEMPTS, []);
export const setQuizAttempts = (attempts: QuizAttempt[]): void => setItem(KEYS.QUIZ_ATTEMPTS, attempts);

export const createQuizAttempt = (attempt: Omit<QuizAttempt, 'id' | 'completedAt'>): QuizAttempt => {
  const attempts = getQuizAttempts();
  const newAttempt: QuizAttempt = {
    ...attempt,
    id: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
  setQuizAttempts([...attempts, newAttempt]);
  return newAttempt;
};

export const getUserQuizAttempts = (userId: string): QuizAttempt[] => {
  return getQuizAttempts().filter(a => a.userId === userId);
};

// Thought record functions
export const getThoughtRecords = (): ThoughtRecord[] => getItem(KEYS.THOUGHT_RECORDS, []);
export const setThoughtRecords = (records: ThoughtRecord[]): void => setItem(KEYS.THOUGHT_RECORDS, records);

export const createThoughtRecord = (record: Omit<ThoughtRecord, 'id' | 'createdAt'>): ThoughtRecord => {
  const records = getThoughtRecords();
  const newRecord: ThoughtRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  setThoughtRecords([...records, newRecord]);
  return newRecord;
};

export const getUserThoughtRecords = (userId: string): ThoughtRecord[] => {
  return getThoughtRecords().filter(r => r.userId === userId);
};

export const deleteThoughtRecord = (recordId: string): boolean => {
  const records = getThoughtRecords();
  const filtered = records.filter(r => r.id !== recordId);
  if (filtered.length === records.length) return false;
  setThoughtRecords(filtered);
  return true;
};

// Forum functions
export const getForumPosts = (): ForumPost[] => getItem(KEYS.FORUM_POSTS, []);
export const setForumPosts = (posts: ForumPost[]): void => setItem(KEYS.FORUM_POSTS, posts);

export const createForumPost = (post: Omit<ForumPost, 'id' | 'createdAt' | 'replies'>): ForumPost => {
  const posts = getForumPosts();
  const newPost: ForumPost = {
    ...post,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    replies: [],
  };
  setForumPosts([...posts, newPost]);
  return newPost;
};

export const addForumReply = (postId: string, reply: Omit<ForumPost['replies'][0], 'id' | 'createdAt'>): ForumPost | null => {
  const posts = getForumPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index === -1) return null;
  
  posts[index].replies.push({
    ...reply,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  setForumPosts(posts);
  return posts[index];
};

// Progress functions
export const getUserProgress = (): UserProgress[] => getItem(KEYS.USER_PROGRESS, []);
export const setUserProgress = (progress: UserProgress[]): void => setItem(KEYS.USER_PROGRESS, progress);

export const updateUserProgress = (userId: string, courseId: string): void => {
  const allProgress = getUserProgress();
  const attempts = getUserQuizAttempts(userId).filter(a => a.courseId === courseId);
  
  const existingIndex = allProgress.findIndex(p => p.userId === userId && p.courseId === courseId);
  const newProgress: UserProgress = {
    userId,
    courseId,
    completedQuizzes: attempts.length,
    averageScore: attempts.length > 0 
      ? attempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / attempts.length 
      : 0,
    lastActivity: new Date().toISOString(),
  };
  
  if (existingIndex !== -1) {
    allProgress[existingIndex] = newProgress;
  } else {
    allProgress.push(newProgress);
  }
  
  setUserProgress(allProgress);
};

// Enrollment functions
export const enrollInCourse = (userId: string, courseId: string): boolean => {
  const user = getCurrentUser();
  if (!user || user.id !== userId) return false;
  
  if (user.enrolledCourses.includes(courseId)) return false;
  
  const updatedUser = updateUser(userId, {
    enrolledCourses: [...user.enrolledCourses, courseId],
  });
  
  return !!updatedUser;
};

export const unenrollFromCourse = (userId: string, courseId: string): boolean => {
  const user = getCurrentUser();
  if (!user || user.id !== userId) return false;
  
  const updatedUser = updateUser(userId, {
    enrolledCourses: user.enrolledCourses.filter(id => id !== courseId),
  });
  
  return !!updatedUser;
};

// Initialize sample data
export const initializeSampleData = (): void => {
  const courses = getCourses();
  if (courses.length === 0) {
    const sampleCourses: Omit<Course, 'id' | 'createdAt' | 'questionCount'>[] = [
      {
        title: 'Anxiety Management Fundamentals',
        description: 'Learn evidence-based techniques to understand and manage anxiety using CBT principles.',
        category: 'Mental Health',
        duration: '4 weeks',
        difficulty: 'beginner',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
      },
      {
        title: 'Cognitive Restructuring Mastery',
        description: 'Master the art of identifying and challenging negative thought patterns.',
        category: 'CBT Techniques',
        duration: '6 weeks',
        difficulty: 'intermediate',
        imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400',
      },
      {
        title: 'Depression Recovery Strategies',
        description: 'Comprehensive CBT-based approach to understanding and overcoming depression.',
        category: 'Mental Health',
        duration: '8 weeks',
        difficulty: 'intermediate',
        imageUrl: 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=400',
      },
      {
        title: 'Stress Resilience Training',
        description: 'Build mental resilience and learn effective stress management techniques.',
        category: 'Wellness',
        duration: '3 weeks',
        difficulty: 'beginner',
        imageUrl: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400',
      },
    ];
    
    const createdCourses = sampleCourses.map(course => createCourse(course));
    
    // Add sample questions for the first course
    if (createdCourses[0]) {
      const sampleQuestions: Omit<Question, 'id'>[] = [
        {
          courseId: createdCourses[0].id,
          text: 'What is the primary goal of Cognitive Behavioral Therapy?',
          options: [
            'To analyze childhood experiences',
            'To change negative thought patterns and behaviors',
            'To prescribe medication',
            'To provide emotional support only',
          ],
          correctAnswer: 1,
          explanation: 'CBT focuses on identifying and changing negative thought patterns and behaviors that contribute to emotional distress.',
        },
        {
          courseId: createdCourses[0].id,
          text: 'Which of the following is a cognitive distortion?',
          options: [
            'Positive thinking',
            'Mindfulness',
            'Catastrophizing',
            'Deep breathing',
          ],
          correctAnswer: 2,
          explanation: 'Catastrophizing is a cognitive distortion where one assumes the worst possible outcome will happen.',
        },
        {
          courseId: createdCourses[0].id,
          text: 'What is a thought record used for in CBT?',
          options: [
            'Recording daily activities',
            'Tracking medication intake',
            'Documenting and analyzing negative thoughts',
            'Planning future goals',
          ],
          correctAnswer: 2,
          explanation: 'A thought record is a CBT tool used to identify, examine, and challenge negative automatic thoughts.',
        },
      ];
      
      sampleQuestions.forEach(q => createQuestion(q));
    }
  }
};
