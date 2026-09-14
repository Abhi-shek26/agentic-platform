/**
 * Drizzle ORM Schema Template
 * Database table definitions with relationships
 */

export const schemaTemplate = (schemaData: any): string => {
  const tables = schemaData?.tables ?? [];
  if (!Array.isArray(tables) || tables.length === 0) {
    throw new Error('No tables data provided');
  }

  const tableDefinitions = tables.map((table: any) => {
    const { name } = table;
    const fields = table.fields ?? [];
    const fieldDefs = fields
      .map((field: any) => {
        // Support both shapes:
        //  - template shape: { fieldName, type, constraints: { primaryKey, notNull, unique, defaultValue } }
        //  - architect shape: { name, type, required, unique, foreignKey, values, default }
        const fieldName = field.fieldName || field.name;
        if (!fieldName) return null;
        const constraints = field.constraints ?? {};
        // Architect-shaped tables mark keys with required/unique only, so treat
        // a field literally named "id" as the primary key by default.
        const isPrimaryKey = constraints.primaryKey ?? (fieldName === 'id');
        const isNotNull = constraints.notNull ?? field.required ?? isPrimaryKey;
        const isUnique = constraints.unique ?? field.unique ?? false;
        const defaultValue = constraints.defaultValue ?? field.default;
        let fieldDef = `  ${fieldName}: ${mapDrizzleType(field.type)}('${fieldName}')`;

        if (isPrimaryKey) fieldDef += '.primaryKey()';
        if ((field.type === 'uuid') && isPrimaryKey) fieldDef += '.defaultRandom()';
        if (isNotNull) fieldDef += '.notNull()';
        if (isUnique) fieldDef += '.unique()';
        if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
          fieldDef += `.default(${formatDefault(defaultValue)})`;
        }
        if (field.foreignKey) fieldDef += ` /* FK -> ${field.foreignKey} */`;
        if (field.values) fieldDef += ` /* enum: ${field.values.join(' | ')} */`;

        fieldDef += ',';
        return fieldDef;
      })
      .filter(Boolean)
      .join('\n');

    return `export const ${sanitizeIdentifier(name)} = pgTable('${name}', {
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
    'float': 'decimal',
    'boolean': 'boolean',
    'date': 'date',
    'timestamp': 'timestamp',
    'enum': 'text',
    'json': 'json',
  };
  return typeMap[type] || 'varchar';
}

function sanitizeIdentifier(name: string): string {
  const cleaned = String(name || 'table').replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `t_${cleaned}`;
}

function formatDefault(value: any): string {
  if (value === 'now()') return 'new Date().toISOString()';
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
  return String(value);
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
