// User types
export interface User {
  id: string;
  matric_no: string;
  name: string;
  role: 'student' | 'admin';
  createdAt: string;
  enrolledCourses: string[];
}

// Course types
export interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  time_allowed: string;
  totalEnrollments?: number | string;
  imageUrl: string;
}

// Question types
export interface Question {
  id: string;
  course_id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
}

// Quiz types
export interface QuizAttempt {
  id: number;            
  user_id: number;      
  course_id: number;    
  score: number | null;  
  totalQuestions?: number;
  createdAt: string;    
  updatedAt: string;
  /** Optional camelCase aliases when API normalizes keys */
  courseId?: number;
  completedAt?: string;
  
  // These nested objects exist in your JSON and are needed for the UI
  User?: {
    name: string;
    matric_no: string;
  };
  Course?: {
    title: string;
  };
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
