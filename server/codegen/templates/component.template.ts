/**
 * React Component Template
 * Rendered with context data from agents
 */

export const componentTemplate = (componentData: any): string => {
  const { name, props, imports, jsx } = componentData;

  const defaultImports = `import React from 'react';\nimport clsx from 'clsx'`;
  const allImports = imports ? `${defaultImports};\n${imports}` : defaultImports;

  const propsInterface = props.length > 0
    ? `interface ${name}Props {
  ${props.map((p: any) => `${p.name}: ${p.type}${p.optional ? '?' : ''};`).join('\n  ')}
}`
    : '';

  const componentSignature = `export const ${name}: React.FC${props.length > 0 ? `<${name}Props>` : ''} = (${props.length > 0 ? `{ ${props.map((p: any) => p.name).join(', ')} }` : ''}) => {`;

  return `${allImports};

${propsInterface}

${componentSignature}
  return (
    ${jsx}
  );
};
`;
};

/**
 * Example usage:
 * const component = componentTemplate({
 *   name: 'TournamentCard',
 *   props: [
 *     { name: 'title', type: 'string', optional: false },
 *     { name: 'onClick', type: '() => void', optional: true }
 *   ],
 *   imports: "import { Heart } from 'lucide-react';",
 *   jsx: `<div className="p-4 bg-white rounded-lg shadow">
 *     <h3 className="font-bold">{title}</h3>
 *     <button onClick={onClick}>Details</button>
 *   </div>`
 * });
 */
