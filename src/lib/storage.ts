// src/services/apiService.ts
import { apiRequest } from '@/lib/api';
import { User, Course, Question, QuizAttempt } from '@/types';

// ==========================================
// COURSE FUNCTIONS
// ==========================================

export const getCourses = async (): Promise<Course[]> => {
  return apiRequest<Course[]>('/courses', { method: 'GET' });
};
export const getCoursesAdmin = async (): Promise<Course[]> => {
  return apiRequest<Course[]>('/courses/admin', { method: 'GET' });
};
export const getEnrolledCourses = async (): Promise<Course[]> => {
  return apiRequest<Course[]>('/myCourses', { method: 'GET' });
};

export const getCourseById = async (courseId: string): Promise<Course> => {
  return apiRequest<Course>(`/courses/${courseId}`, { method: 'GET' });
};

export const createCourse = async (courseData: any): Promise<Course> => {
  // Translate Frontend Form (camelCase) -> Database Columns (snake_case)
  const payload = {
    title: courseData.title,
    description: courseData.description,
    level: courseData.category,          // Map category -> level
    time_allowed: courseData.duration,   // Map duration -> time_allowed
    image_url: courseData.imageUrl       // Map imageUrl -> image_url
  };

  return apiRequest<Course>('/courses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateCourse = async (courseId: string, updates: any): Promise<Course> => {
  // We strictly define the payload to ensure we map keys correctly
  // Use a partial mapping based on what's available in 'updates'
  const payload: any = {};
  
  if (updates.title) payload.title = updates.title;
  if (updates.description) payload.description = updates.description;
  if (updates.category) payload.level = updates.category;        // Map category -> level
  if (updates.duration) payload.time_allowed = updates.duration; // Map duration -> time_allowed
  if (updates.imageUrl) payload.image_url = updates.imageUrl;    // Map imageUrl -> image_url

  return apiRequest<Course>(`/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteCourse = async (courseId: string): Promise<boolean> => {
  try {
    await apiRequest(`/courses/${courseId}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    return false;
  }
};

// ==========================================
// ENROLLMENT FUNCTIONS
// ==========================================

export const enrollInCourse = async (courseId: string): Promise<boolean> => {
  try {
    await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' });
    return true;
  } catch (error) {
    return false;
  }
};

// Add this to your imports/exports
export const toggleCourseAvailability = async (id: string) => {
  const response = await apiRequest(`/courses/${id}/toggle-availability`, { method: 'PUT' });
  return response;
};

export const toggleShowResult = async (id: string) => {
  const response = await apiRequest(`/courses/${id}/toggle-show-result`, { method: 'PUT' });
  return response;
};

// ==========================================
// QUESTION FUNCTIONS
// ==========================================

export const getQuestionsByCourse = async (courseId: string): Promise<Question[]> => {
  return apiRequest<Question[]>(`/courses/${courseId}/questions`, { method: 'GET' });
};

export const createQuestion = async (questionData: any): Promise<Question> => {
  // Translate Frontend -> Backend
  const payload = {
    course_id: questionData.courseId,       // Maps courseId -> course_id
    question_text: questionData.text,       // Maps text -> question_text
    options: questionData.options,          // Array stays the same
    correct_answer: questionData.correctAnswer // Maps correctAnswer -> correct_answer
  };

  return apiRequest<Question>('/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateQuestion = async (questionId: string, updates: any): Promise<Question> => {
  // Translate Frontend -> Backend for updates
  const payload: any = {};
  
  // Check if keys exist in 'updates' before mapping
  if (updates.text !== undefined) payload.question_text = updates.text;
  if (updates.courseId !== undefined) payload.course_id = updates.courseId;
  if (updates.correctAnswer !== undefined) payload.correct_answer = updates.correctAnswer;
  if (updates.options !== undefined) payload.options = updates.options;

  return apiRequest<Question>(`/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteQuestion = async (questionId: string): Promise<boolean> => {
  try {
    await apiRequest(`/questions/${questionId}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    return false;
  }
};

// ==========================================
// QUIZ ATTEMPT FUNCTIONS
// ==========================================

export const getMyQuizAttempts = async (): Promise<QuizAttempt[]> => {
  return apiRequest<QuizAttempt[]>('/attempts/me', { method: 'GET' });
};

// 1. Start: Matches POST /attempts
// Expects: { courseId }
export const startQuizAttempt = async (courseId: string | number) => {
  return apiRequest<{ attempt_id: number; msg: string }>('/attempts', {
    method: 'POST',
    body: JSON.stringify({ courseId }),
  });
  
};

// 2. Finish: Matches PUT /attempts/complete
// Expects: { attempt_id, score }
export const submitQuizResult = async (attempt_id: number, score: number, cheatedScore: number | null) => {
  return apiRequest<{ msg: string; score: number }>('/attempts/complete', {
    method: 'PUT', // changed from POST
    body: JSON.stringify({ attempt_id, 
      score,
      cheatedScore }),
  });
};

export const getQuizAttempts = async (): Promise<QuizAttempt[]> => {
  return apiRequest<QuizAttempt[]>('/attempts', { method: 'GET' });
};


export const getUsers = async (): Promise<User[]> => {
  return apiRequest<User[]>('/users', { method: 'GET' });
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await apiRequest(`/users/${userId}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    return false;
  }
};