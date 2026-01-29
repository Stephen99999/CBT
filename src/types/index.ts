// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  enrolledCourses: string[];
}

// Course types
export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  imageUrl: string;
  createdAt: string;
  questionCount: number;
}

// Question types
export interface Question {
  id: string;
  courseId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Quiz types
export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  answers: { questionId: string; selectedAnswer: number; isCorrect: boolean }[];
}

// Progress types
export interface UserProgress {
  userId: string;
  courseId: string;
  completedQuizzes: number;
  averageScore: number;
  lastActivity: string;
}

// CBT types
export interface ThoughtRecord {
  id: string;
  userId: string;
  situation: string;
  automaticThought: string;
  emotion: string;
  emotionIntensity: number;
  cognitiveDistortion: string;
  alternativeThought: string;
  newEmotionIntensity: number;
  createdAt: string;
}

// Forum types
export interface ForumPost {
  id: string;
  userId: string;
  userName: string;
  courseId?: string;
  title: string;
  content: string;
  createdAt: string;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}
