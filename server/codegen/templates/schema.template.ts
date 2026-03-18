/**
 * Drizzle ORM Schema Template
 * Database table definitions with relationships
 */

export const schemaTemplate = (schemaData: any): string => {
  const { tables } = schemaData;

  const tableDefinitions = tables.map((table: any) => {
    const { name, fields } = table;
    const fieldDefs = fields
      .map((field: any) => {
        const { fieldName, type, constraints } = field;
        let fieldDef = `  ${fieldName}: ${mapDrizzleType(type)}('${fieldName}')`;

        if (constraints) {
          if (constraints.primaryKey) fieldDef += '.primaryKey()';
          if (constraints.notNull) fieldDef += '.notNull()';
          if (constraints.unique) fieldDef += '.unique()';
          if (constraints.defaultValue) fieldDef += `.default(${constraints.defaultValue})`;
          if (constraints.generated) fieldDef += '.generatedAlwaysAs()';
        }

        fieldDef += ',';
        return fieldDef;
      })
      .join('\n');

    return `export const ${name} = pgTable('${name}', {
${fieldDefs}
});`;
  }).join('\n\n');

  return `import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  decimal,
  json,
  foreignKey,
  uniqueIndex
} from 'drizzle-orm/pg-core';

${tableDefinitions}
`;
};

function mapDrizzleType(type: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'uuid',
    'string': 'varchar',
    'text': 'text',
    'integer': 'integer',
    'number': 'decimal',
    'boolean': 'boolean',
    'date': 'date',
    'timestamp': 'timestamp',
    'json': 'json',
  };
  return typeMap[type] || 'varchar';
}

/**
 * Example usage:
 * const schema = schemaTemplate({
 *   tables: [
 *     {
 *       name: 'tournaments',
 *       fields: [
 *         { fieldName: 'id', type: 'uuid', constraints: { primaryKey: true } },
 *         { fieldName: 'name', type: 'string', constraints: { notNull: true } },
 *         { fieldName: 'date', type: 'date', constraints: { notNull: true } },
 *       ]
 *     }
 *   ]
 * });
 */
