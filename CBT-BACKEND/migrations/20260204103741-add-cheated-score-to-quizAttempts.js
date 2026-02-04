'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('quizAttempts', 'cheated_score', {
      type: Sequelize.INTEGER,
      defaultValue: null,
      allowNull: true,
      comment: 'Stores the raw score if the user was flagged for cheating'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('quizAttempts', 'cheated_score');
  }
};