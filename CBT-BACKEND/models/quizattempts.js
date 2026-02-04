'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class quizAttempts extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      quizAttempts.belongsTo(models.User, { foreignKey: 'user_id' });
      quizAttempts.belongsTo(models.Course, { foreignKey: 'course_id' });
    }
  }
  quizAttempts.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: DataTypes.INTEGER,
    course_id: DataTypes.INTEGER,
    score: DataTypes.INTEGER,
    cheated_score: DataTypes.INTEGER,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'quizAttempts',
  });
  return quizAttempts;
};