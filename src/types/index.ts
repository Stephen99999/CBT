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
  is_available: boolean;
  show_result: boolean;
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
  cheated_score: number;
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

// Class (live class hosted by admin) types
export interface ClassInfo {
  id: number;
  admin_id: number;
  name: string;
  start_time: string;        // ISO datetime
  duration_minutes: number;
  latitude: number;
  longitude: number;
  allowed_radius: number;    // meters
  /** Accuracy (m) of the fix captured when the class was created; null when unknown */
  location_accuracy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  admin?: {
    id: number;
    name: string;
    matric_no: string;
  };
  attendances?: AttendanceRecord[];
}

// Attendance record types
export interface AttendanceRecord {
  id: number;
  class_id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  distance_meters: number;
  createdAt: string;
  updatedAt: string;
  attended_class?: ClassInfo;
  student?: {
    id: number;
    name: string;
    matric_no: string;
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
