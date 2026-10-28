'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Class extends Model {
    static associate(models) {
      // 1. Admin (lecturer) who created the class
      Class.belongsTo(models.User, {
        foreignKey: 'admin_id',
        as: 'admin'
      });


      // 3. Attendance records for this class
      Class.hasMany(models.Attendance, { foreignKey: 'class_id', as: 'attendances' });
    }
  }

  Class.init({
    // Admin (lecturer) who created the class
    admin_id: DataTypes.INTEGER,

    // Class details
    name: DataTypes.STRING,

    // When the class starts (admin sets this)
    start_time: DataTypes.DATE,

    // How long the class lasts, in minutes
    duration_minutes: DataTypes.INTEGER,

    // Location captured from the admin's current position
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,

    // Students can only mark attendance within this radius (meters) of the admin's location
    allowed_radius: DataTypes.INTEGER,

    // How accurately the admin's device reported this location, in meters.
    // NULL when the class predates this field. It is folded into the fence so a
    // class captured with a ±400 m fix doesn't pretend to be a 15 m fence.
    location_accuracy: DataTypes.DOUBLE,
  }, {
    sequelize,
    modelName: 'Class',
    tableName: 'Classes',
  });

  return Class;
};