'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Questions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      course_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references:{
          model:'courses',
          key:'id',
        },
        onDelete:'CASCADE',
        onUpdate:'CASCADE'
      },
      question_text: {
        type: Sequelize.STRING
      },
      options: {
        type: Sequelize.TEXT, // Storing JSON string: '["Option A", "Option B"]'
        allowNull: false
      },
      correct_answer: {
        type: Sequelize.STRING, // The actual text of the correct answer
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Questions');
  }
};