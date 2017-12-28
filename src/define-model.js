const TypeMapping = require('./constants/type-mapping')
const TableNameMode = require('./constants/table-name-modes')
const FieldNameMode = require('./constants/field-name-modes')

const camelCase2Underline = require('./utils/camel-case-to-underline')
const { isString } = require('./utils/check-type')

function convert2SequelizeType (localType) {
  return TypeMapping[localType].Sequelize
}

function defineModel (sequelize, name, attributes, options) {
  const tableNameMode = options.tableNameMode
  const fieldNameMode = options.fieldNameMode

  const sqlzModelOptions = Object.assign(
    {
      freezeTableName: true,
      tableName: tableNameMode === TableNameMode.CAMELCASE
        ? name
        : camelCase2Underline(name, tableNameMode),
      createdAt: false,
      updatedAt: false,
      deletedAt: false
    },
    options
  )

  const sqlzAttributes = {}
  const associations = {}
  for (let attr in attributes) {
    const v = attributes[attr]
    let item = isString(v) ? { type: v } : v
    attributes[attr] = item
    // model associations
    if (item.model) {
      const key = item.key || 'id'
      const fKey = item.foreignKey || attr + 'Id'
      const associationItem = {
        model: item.model,
        key,
        foreignKey: fKey,
        required: item.required !== false
      }
      associations[attr] = associationItem
      attr = fKey
      const sqlzModel = item.model.sequelizeModel
      item = {
        type: item.model.attributes[key].type
      }
      if (sqlzModel) {
        item.references = {
          model: sqlzModel,
          key: sqlzModel.primaryKeyAttribute
        }
      }
    }

    // field name
    !item.field &&
      fieldNameMode !== FieldNameMode.CAMELCASE &&
      (item.field = camelCase2Underline(attr, fieldNameMode))
    // primary key
    if (attr === 'id') {
      item.primaryKey = true
      // it can be find in model.primaryKeyField
    }
    // field type
    isString(item.type) && (item.type = convert2SequelizeType(item.type))

    // createdAt && updatedAt
    if (attr === 'createdAt' || item.createdAt) {
      sqlzModelOptions.createdAt = item.field
    } else if (attr === 'updatedAt' || item.updatedAt) {
      sqlzModelOptions.updatedAt = item.field
    }

    sqlzAttributes[attr] = item
  }
  const model = sequelize.define(name, sqlzAttributes, sqlzModelOptions)
  for (let name in associations) {
    const item = associations[name]
    const sqlzModel = item.model.sequelizeModel
    sqlzModel &&
      model.belongsTo(sqlzModel, {
        as: name,
        foreignKey: item.foreignKey
      })
  }
  return {
    sequelizeModel: model,
    associations
  }
}

module.exports = defineModel