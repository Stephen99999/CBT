'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Attendance extends Model {
    static associate(models) {
      // The class this attendance belongs to
      Attendance.belongsTo(models.Class, {
        foreignKey: 'class_id',
        as: 'attended_class'
      });

      // The student who marked it
      Attendance.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'student'
      });
    }
  }

  Attendance.init({
    class_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,

    // Student's position when they marked attendance
    latitude: DataTypes.DOUBLE,
    longitude: DataTypes.DOUBLE,

    // Distance from the class location, in meters (for audit)
    distance_meters: DataTypes.DOUBLE,
  }, {
    sequelize,
    modelName: 'Attendance',
    tableName: 'Attendances',
  });

  return Attendance;
};
