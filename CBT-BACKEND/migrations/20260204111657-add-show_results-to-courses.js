'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Courses', 'show_result', {
      type: Sequelize.BOOLEAN,
      defaultValue: false, 
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Courses', 'show_result');
  }
};