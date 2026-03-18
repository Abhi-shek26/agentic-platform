/**
 * React Page Template
 * Page-level component with routing and layout
 */

export const pageTemplate = (pageData: any): string => {
  const { name, path, components, hooks, api } = pageData;

  const componentImports = components.map((c: string) => `import { ${c} } from '../components/${c}';`).join('\n');
  const hooksImports = hooks ? hooks.map((h: string) => `import ${h} from '../hooks/${h}';`).join('\n') : '';
  const apiImport = api ? `import { ${api.functions.join(', ')} } from '../lib/${api.module}';` : '';

  const allImports = [componentImports, hooksImports, apiImport].filter(Boolean).join('\n');

  const hookUsage = hooks
    ? hooks.map((h: string) => `  const data = ${h}();`).join('\n')
    : '';

  return `import React from 'react';
${allImports}

export const ${name}: React.FC = () => {
${hookUsage}

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-12 px-4">
        ${components.map((c: string) => `<${c} />`).join('\n        ')}
      </div>
    </div>
  );
};

export default ${name};
`;
};

/**
 * Example usage:
 * const page = pageTemplate({
 *   name: 'Home',
 *   path: '/',
 *   components: ['Hero', 'Features', 'CTA'],
 *   hooks: ['useTournament'],
 *   api: { module: 'api', functions: ['fetchTournament'] }
 * });
 */
