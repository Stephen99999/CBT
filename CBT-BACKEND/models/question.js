'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Question.belongsTo(models.Course, {
        foreignKey: 'course_id',
        as: 'course', // (Optional) Alias for including data
        onDelete: 'CASCADE'
      });
    }
  }
  Question.init({
    course_id: DataTypes.INTEGER,
    question_text: DataTypes.STRING,
    options: {
      type: DataTypes.TEXT,
      get() {
        // When fetching from DB: Convert string "['A','B']" -> Array ['A','B']
        const rawValue = this.getDataValue('options');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        // When saving to DB: Convert Array ['A','B'] -> string "['A','B']"
        this.setDataValue('options', JSON.stringify(value));
      }
    },
    correct_answer: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Question',
  });
  return Question;
};