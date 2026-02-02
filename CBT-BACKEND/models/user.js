'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    
    static associate(models) {
      
      // 1. Enrollment Association
      User.belongsToMany(models.Course, { 
        through: models.Enrollment,
        foreignKey: 'user_id',
        as: 'enrolled_courses'
      });

      // 2. Quiz Association (Method A: Get the COURSES taken)
      User.belongsToMany(models.Course, {
        through: models.quizAttempts,
        foreignKey: 'user_id',
        as: 'courses_attempted' 
      });

      // 3. Quiz Association (Method B: Get the ACTUAL ATTEMPTS/SCORES)
      // This is very useful for 'getMyAttempts' controller
      User.hasMany(models.quizAttempts, {
        foreignKey: 'user_id',
        as: 'attempts'
      });
    }
  
  }
  User.init({
    name: DataTypes.STRING,
    matric_no: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};