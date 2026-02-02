'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      // 1. Questions
      Course.hasMany(models.Question, { foreignKey: 'course_id', as: 'questions' });
      
      // 2. Enrolled Students
      Course.belongsToMany(models.User, { 
        through: models.Enrollment,
        foreignKey: 'course_id',
        as: 'students' 
      });

      // 3. Quiz Attempts (Relationship A: Get the Students who took it)
      Course.belongsToMany(models.User, {
        through: models.quizAttempts,
        foreignKey: 'course_id',
        as: 'students_who_attempted' 
      });

      // 4. Quiz Attempts (Relationship B: Get the SCORES/DATA) <--- ADD THIS
      // This allows: await course.getAttempts() -> returns [{score: 90, user_id: 1}, ...]
      Course.hasMany(models.quizAttempts, { foreignKey: 'course_id', as: 'attempts' });

      
    }
  }

  Course.init({
    // ADD TITLE
    title:DataTypes.STRING,
    level: DataTypes.INTEGER,
    description: DataTypes.STRING,
    time_allowed: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Course',
  });
  
  return Course;
};