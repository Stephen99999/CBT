'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // How accurately the admin's device reported the class location, in meters.
    // NULL for classes created before this existed (their capture quality is
    // unknown), so the fence falls back to the plain radius + student accuracy.
    await queryInterface.addColumn('Classes', 'location_accuracy', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Classes', 'location_accuracy');
  },
};
