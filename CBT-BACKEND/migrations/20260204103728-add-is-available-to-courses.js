'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Courses', 'is_available', {
      type: Sequelize.BOOLEAN,
      defaultValue: true, // Default to true so old courses remain visible
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Courses', 'is_available');
  }
};