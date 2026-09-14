/**
 * Code Generator
 * Renders templates and validates generated code
 */

import { componentTemplate } from '../templates/component.template';
import { pageTemplate } from '../templates/page.template';
import { routeTemplate } from '../templates/route.template';
import { schemaTemplate } from '../templates/schema.template';
import {
  packageJsonTemplate,
  tsConfigTemplate,
  viteConfigTemplate,
  tailwindConfigTemplate,
  dockerfileTemplate,
  envExampleTemplate,
  gitignoreTemplate,
  postcssConfigTemplate,
  clientIndexHtmlTemplate,
  clientMainTsxTemplate,
  clientIndexCssTemplate,
  appTsxTemplate,
  serverIndexTemplate,
  sharedTypesTemplate,
  apiClientTemplate,
  dbClientTemplate,
  pageFileBase,
  pageComponentAlias,
  EntryPageRef,
} from '../templates/config.template';

export interface CodeGenResult {
  success: boolean;
  files: Array<{
    path: string;
    content: string;
    type: 'typescript' | 'json' | 'plaintext' | 'yaml';
  }>;
  errors?: string[];
  warnings?: string[];
}

export interface GenerationData {
  projectName: string;
  specification: any;
  architecture: any;
  frontend?: any;
  backend?: any;
  database?: any;
}

export class CodeGenerator {
  /**
   * Generate React component files
   */
  static generateComponents(frontendData: any): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];
    const errors: string[] = [];

    console.log('[COMPONENTS] frontendData:', JSON.stringify(frontendData).substring(0, 300));
    console.log('[COMPONENTS] frontendData.components exists?', !!frontendData?.components);
    console.log('[COMPONENTS] frontendData.components type:', typeof frontendData?.components);
    if (frontendData?.components) {
      console.log('[COMPONENTS] components array length:', frontendData.components.length);
    }

    try {
      if (!frontendData?.components) {
        console.log('[COMPONENTS] ❌ No components data - returning error');
        return { success: false, files: [], errors: ['No components data provided'] };
      }

      console.log('[COMPONENTS] ✓ Found components, generating...');
      for (const component of frontendData.components) {
        try {
          // If mock agent already provides code, use it directly
          let code: string;
          if (component.code) {
            code = component.code;
            console.log(`[COMPONENTS] ✓ Using pre-generated code for ${component.name} (${code.length} bytes)`);
          } else {
            // Otherwise render from template
            code = componentTemplate(component);
            console.log(`[COMPONENTS] ✓ Rendered template for ${component.name} (${code.length} bytes)`);
          }

          files.push({
            path: `client/src/components/${component.name}.tsx`,
            content: code,
            type: 'typescript',
          });
        } catch (error) {
          console.log(`[COMPONENTS] ✗ Failed to generate ${component.name}:`, error);
          errors.push(`Failed to generate component ${component.name}: ${error}`);
        }
      }

      console.log(`[COMPONENTS] Generated ${files.length} component files`);
      return {
        success: errors.length === 0,
        files,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.log('[COMPONENTS] ❌ Exception:', error);
      return {
        success: false,
        files,
        errors: [`Component generation failed: ${error}`],
      };
    }
  }

  /**
   * Generate React page files
   */
  static generatePages(frontendData: any): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];
    const errors: string[] = [];

    console.log('[PAGES] frontendData:', JSON.stringify(frontendData).substring(0, 300));
    console.log('[PAGES] frontendData.pages exists?', !!frontendData?.pages);
    console.log('[PAGES] frontendData.pages type:', typeof frontendData?.pages);
    if (frontendData?.pages) {
      console.log('[PAGES] pages array length:', frontendData.pages.length);
    }

    try {
      if (!frontendData?.pages) {
        console.log('[PAGES] ❌ No pages data - returning error');
        return { success: false, files: [], errors: ['No pages data provided'] };
      }

      console.log('[PAGES] ✓ Found pages, generating...');
      for (const page of frontendData.pages) {
        try {
          // If mock agent already provides code, use it directly
          let code: string;
          const filename = pageFileBase(page.name);

          if (page.code) {
            code = page.code;
            console.log(`[PAGES] ✓ Using pre-generated code for ${page.name} → ${filename}.tsx (${code.length} bytes)`);
          } else {
            // Otherwise render from template
            code = pageTemplate(page);
            console.log(`[PAGES] ✓ Rendered template for ${page.name} → ${filename}.tsx (${code.length} bytes)`);
          }

          files.push({
            path: `client/src/pages/${filename}.tsx`,
            content: code,
            type: 'typescript',
          });
        } catch (error) {
          console.log(`[PAGES] ✗ Failed to generate ${page.name}:`, error);
          errors.push(`Failed to generate page ${page.name}: ${error}`);
        }
      }

      console.log(`[PAGES] Generated ${files.length} page files`);
      return {
        success: errors.length === 0,
        files,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.log('[PAGES] ❌ Exception:', error);
      return {
        success: false,
        files,
        errors: [`Page generation failed: ${error}`],
      };
    }
  }

  /**
   * Import sources that are always safe to keep in merged route files:
   * the wrapper-provided express (handled separately), drizzle, and sibling
   * generated files. Everything else (logger libs, auth libs, phantom
   * ../utils|config|services|middleware) is stripped — those modules don't
   * exist and each copy would either 404 at install or break the merge.
   */
  private static readonly KEEP_ROUTE_IMPORT =
    /from\s+['"](drizzle-orm(?:\/.*)?|\.\/[^'"]*|\.\.\/db\/[^'"]*|\.\.\/shared\/[^'"]*)['"]/;

  /**
   * Strip per-blob boilerplate so multiple LLM-returned route snippets can be
   * merged into ONE router file: drop express imports, router creation, and
   * router exports, but KEEP drizzle/sibling imports (db, tables, eq) — the
   * model legitimately needs those and the wrapper does not provide them.
   * The merged file gets a single canonical express header instead.
   * (LLM blobs each repeat `import express`, `const router = ...`, and
   * `export default router`, which otherwise produce redeclaration errors.)
   */
  private static sanitizeRouteBlob(code: string): { code: string; imports: string[] } {
    const kept: string[] = [];
    const imports: string[] = [];
    for (let line of code.split('\n')) {
      const t = line.trim();
      if (/^import\s/.test(t)) {
        if (/from\s+['"]express['"]/.test(t)) continue; // wrapper provides
        if (this.KEEP_ROUTE_IMPORT.test(t)) imports.push(t);
        continue; // strip all other imports (phantom modules, extra libs)
      }
      if (/^import\s+['"]/.test(t)) continue;
      if (/^(const|let|var)\s+router\s*=/.test(t)) continue; // router creation
      if (/^export\s+default\b/.test(t)) continue;
      if (/^export\s+(const|let|var|function|async\s+function|class)\s+router\b/.test(t)) continue;
      if (/^module\.exports/.test(t)) continue;
      // JS `===` on a drizzle column object inside .where(...) is always a
      // bug: `where(t.col === v)` compares the column descriptor. Rewrite to
      // drizzle `eq(t.col, v)` / `ne(t.col, v)`. The merger injects the
      // eq/ne import when it sees usage. Skipped for compound conditions.
      line = line.replace(
        /\.where\(\s*([A-Za-z_]\w*\.[A-Za-z_]\w*)\s*(===|!==)\s*([^()]+?)\)/g,
        (m, lhs, op, rhs) => {
          if (/===|!==|&&|\|\||\?/.test(rhs)) return m;
          return `.where(${op === "===" ? "eq" : "ne"}(${lhs}, ${rhs.trim()}))`;
        }
      );
      // Untyped single-param callbacks (`.map(p => ...)`) fail strict tsc
      // when the array is `any` (e.g. from `let query: any`). Annotate.
      line = line.replace(
        /\.(map|filter|find|findIndex|some|every|forEach)\(\s*([A-Za-z_]\w*)\s*=>/g,
        ".$1(($2: any) =>"
      );
      kept.push(line);
    }
    const cleaned = kept
      .join('\n')
      .replace(/const\s+express\s*=\s*require\(['"]express['"]\);?/g, '')
      .trim();
    return { code: cleaned, imports };
  }

  /**
   * Repair two drizzle-specific model mistakes in merged route files:
   *
   * 1. Query-builder reassignment: `let query = db.select().from(t)` narrows
   *    `query` to the full-select type, so `query = query.where(...)` (which
   *    returns a partial-select type) fails. Annotating `let query: any`
   *    fixes it with zero behaviour change.
   *
   * 2. Table shadowing: `const results = await db.select().from(results)`
   *    declares a local with the same name as the imported table, making the
   *    initializer self-referential. The declaration (and later row usages in
   *    the same handler, excluding further table-position references) is
   *    renamed to `<name>Data`, e.g. `resultsData`.
   */
  private static repairRouteBodies(content: string, tableNames: string[]): string {
    // Split into header (imports + router creation) and handler blocks.
    const lines = content.split('\n');
    let splitAt = 0;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^(const|let|var)\s+router\s*=/.test(t)) {
        splitAt = i + 1;
        break;
      }
    }
    const header = lines.slice(0, splitAt);
    const rest = lines.slice(splitAt);

    // Handler blocks start at lines beginning with `router.`
    const blocks: string[][] = [];
    let current: string[] = [];
    for (const line of rest) {
      if (/^router\.(get|post|put|delete|patch|use|all)\(/.test(line.trim()) && current.length > 0) {
        blocks.push(current);
        current = [];
      }
      current.push(line);
    }
    if (current.length > 0) blocks.push(current);

    const repairedBlocks = blocks.map((block) => {
      let out = [...block];
      // Rule 1: `let <v> = db.` → `let <v>: any = db.`
      out = out.map((line) =>
        line.replace(/^(\s*)let\s+([A-Za-z_]\w*)\s*=\s*db\./, '$1let $2: any = db.')
      );
      // Rule 2: table shadowing within this handler.
      for (const table of tableNames) {
        const declIdx = out.findIndex((line) => {
          const m = new RegExp(`^\\s*(const|let|var)\\s+${table}\\s*=`).exec(line);
          if (!m) return false;
          const rhs = line.slice(line.indexOf('=') + 1);
          return new RegExp(`\\b${table}\\b`).test(rhs);
        });
        if (declIdx < 0) continue;
        const replacement = `${table}Data`;
        out[declIdx] = out[declIdx].replace(
          new RegExp(`^([ \\t]*(?:const|let|var)\\s+)${table}(\\s*=)`),
          `$1${replacement}$2`
        );
        for (let i = declIdx + 1; i < out.length; i++) {
          // Don't touch genuine table-position references: from/insert/update/delete(table)
          if (new RegExp(`(?:from|insert|update|delete)\\(\\s*${table}\\b`).test(out[i])) continue;
          out[i] = out[i].replace(new RegExp(`\\b${table}\\b`, 'g'), replacement);
        }
        console.log(`[ROUTES] Renamed shadowing local "${table}" → "${replacement}"`);
      }
      return out;
    });

    return [...header, ...repairedBlocks.flat()].join('\n');
  }

  /**
   * Generate Express route files
   */
  static generateRoutes(backendData: any): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];
    const errors: string[] = [];

    console.log('[ROUTES] backendData:', JSON.stringify(backendData).substring(0, 300));
    console.log('[ROUTES] backendData.routes exists?', !!backendData?.routes);
    if (backendData?.routes) {
      console.log('[ROUTES] routes array length:', backendData.routes.length);
    }

    try {
      if (!backendData?.routes) {
        console.log('[ROUTES] ❌ No routes data - returning error');
        return { success: false, files: [], errors: ['No routes data provided'] };
      }

      const routesByGroup: Record<string, string[]> = {};
      const importsByGroup: Record<string, Set<string>> = {};

      for (const route of backendData.routes) {
        try {
          let code: string;
          let blobImports: string[] = [];

          if (route.code) {
            // Use pre-generated code if available (sanitized: no express
            // imports, no router creation/exports — the merged file wraps
            // once; drizzle/sibling imports are collected for the header)
            const sanitized = this.sanitizeRouteBlob(route.code);
            code = sanitized.code;
            blobImports = sanitized.imports;
            console.log(`[ROUTES] ✓ Using pre-generated code for ${route.method} ${route.path}`);
          } else {
            // Otherwise render from template
            code = routeTemplate(route);
            console.log(`[ROUTES] ✓ Rendered template for ${route.method} ${route.path}`);
          }

          if (!code) {
            console.log(`[ROUTES] ⚠ Empty code for ${route.method} ${route.path} after sanitizing — skipped`);
            continue;
          }

          const group = route.group || 'index';

          if (!routesByGroup[group]) {
            routesByGroup[group] = [];
            importsByGroup[group] = new Set<string>();
          }
          routesByGroup[group].push(code);
          blobImports.forEach((i) => importsByGroup[group].add(i));
        } catch (error) {
          console.log(`[ROUTES] ✗ Failed to generate route ${route.path}:`, error);
          errors.push(`Failed to generate route ${route.path}: ${error}`);
        }
      }

      // Combine routes by group (single header/footer per file — the runtime
      // `express` default import is kept so `express.Request` type refs in
      // blobs still resolve). Missing-but-used db/table/drizzle imports are
      // injected: models often USE db/eq/tables without importing them.
      for (const [group, routeCodes] of Object.entries(routesByGroup)) {
        const bodies = routeCodes.join('\n\n');
        const headerLines = [...importsByGroup[group]];
        const hasFrom = (src: string) =>
          headerLines.some((l) => new RegExp(`from\\s+['"]${src}['"]`).test(l));
        if (/\bdb\b/.test(bodies) && !hasFrom('../db/client')) {
          headerLines.unshift(`import { db } from '../db/client';`);
        }
        // Tables referenced via from/insert/update/delete(...) that aren't
        // imported yet (schema exports are camelCase consts like `tournaments`).
        const usedTables = new Set<string>();
        for (const m of bodies.matchAll(/(?:from|insert|update|delete)\(\s*([A-Za-z_]\w*)\s*[\),]/g)) {
          usedTables.add(m[1]);
        }
        const importedTables = new Set<string>();
        for (const l of headerLines) {
          const m = /from\s+['"]\.\.\/db\/schema['"]/.test(l)
            ? l.match(/import\s*\{([^}]*)\}/)
            : null;
          if (m) m[1].split(',').forEach((s) => importedTables.add(s.trim()));
        }
        const missingTables = [...usedTables].filter(
          (t) => !importedTables.has(t) && !['db', 'router', 'req', 'res'].includes(t)
        );
        if (missingTables.length > 0) {
          headerLines.unshift(`import { ${missingTables.join(', ')} } from '../db/schema';`);
        }
        // Drizzle helpers actually called (eq(...), and(...), ...) that aren't imported yet.
        const usedHelpers = ['eq', 'ne', 'and', 'or', 'desc', 'asc', 'sql'].filter((h) =>
          new RegExp(`\\b${h}\\s*\\(`).test(bodies)
        );
        const importedHelpers = new Set<string>();
        for (const l of headerLines) {
          if (/from\s+['"]drizzle-orm['"]/.test(l)) {
            const m = l.match(/import\s*\{([^}]*)\}/);
            if (m) m[1].split(',').forEach((s) => importedHelpers.add(s.trim()));
          }
        }
        const missingHelpers = usedHelpers.filter((h) => !importedHelpers.has(h));
        if (missingHelpers.length > 0) {
          headerLines.unshift(`import { ${missingHelpers.join(', ')} } from 'drizzle-orm';`);
        }
        const routerImport = `import express, { Router } from 'express';
const router = Router();
${headerLines.length > 0 ? headerLines.join('\n') + '\n' : ''}
`;
        const routerExport = `\nexport default router;`;
        const merged = routerImport + bodies + routerExport;
        // Final pass: repair query-reassignment narrowing + table shadowing.
        const allTables = [...new Set([...importedTables, ...missingTables])];
        const content = this.repairRouteBodies(merged, allTables);

        files.push({
          path: `server/routes/${group}.ts`,
          content,
          type: 'typescript',
        });

        console.log(`[ROUTES] ✓ Combined ${routeCodes.length} routes into server/routes/${group}.ts`);
      }

      console.log(`[ROUTES] Generated ${files.length} route files`);
      return {
        success: errors.length === 0,
        files,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.log('[ROUTES] ❌ Exception:', error);
      return {
        success: false,
        files,
        errors: [`Route generation failed: ${error}`],
      };
    }
  }

  /**
   * Repair the non-existent `table.unique([...])` table-callback form models
   * copy from other ORMs: pgTable(name, cols, (table) => ({ x:
   * table.unique([...]) })) → proper uniqueIndex definitions appended after
   * the table, with the import added when missing.
   */
  private static normalizeUniqueConstraints(code: string): string {
    const collected: Array<{ table: string; fields: string[] }> = [];
    // Match `}, (table) => ({ ... table.unique([..]) ... }));` closers.
    const stripped = code.replace(
      /\n\}\s*,\s*\(\s*table\s*\)\s*=>\s*\(\{([\s\S]*?)\}\)\)\s*;/g,
      (m, body: string) => {
        const um = /table\.unique\(\s*\[([^\]]*)\]\s*\)/.exec(body);
        if (!um) return "\n});";
        // Find owning table: nearest preceding `export const X = pgTable('t', {`
        const before = code.slice(0, code.indexOf(m));
        const tm = /export\s+const\s+(\w+)\s*=\s*pgTable\(\s*['"]([^'"]+)['"]/g;
        let last: RegExpExecArray | null = null;
        let cur: RegExpExecArray | null;
        while ((cur = tm.exec(before)) !== null) last = cur;
        if (last) {
          collected.push({
            table: last[1],
            fields: um[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean),
          });
        }
        return "\n});";
      }
    );
    if (collected.length === 0) return code;
    let out = stripped;
    out = out.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]drizzle-orm\/pg-core['"]/,
      (_m, members: string) => {
        const list = members.split(",").map((s) => s.trim()).filter(Boolean);
        if (!list.includes("uniqueIndex")) list.push("uniqueIndex");
        return `import { ${list.join(", ")} } from 'drizzle-orm/pg-core'`;
      }
    );
    for (const c of collected) {
      const idxName = `${c.table}_${c.fields.join("_")}_unique`.toLowerCase();
      out += `\nexport const ${c.table}Unique = uniqueIndex('${idxName}').on(${c.fields.map((f) => `${c.table}.${f}`).join(", ")});\n`;
    }
    return out;
  }

  /**
   * Repair the most common Drizzle API mistakes in verbatim model schemas.
   * Models frequently write memory-style calls — varchar(255), uuid(),
   * timestamp() — but pg-core requires the column name first:
   * varchar('email', { length: 255 }). The field key on the line gives us
   * the name, so `email: varchar(255)` becomes
   * `email: varchar('email', { length: 255 })`. Also rewrites the invalid
   * `varchar('x', { enum: [...] })` form to `text('x')`.
   * Lines that already pass a quoted name first are left untouched.
   */
  private static normalizeVerbatimSchema(code: string): string {
    const drizzleTypes = new Set([
      'uuid', 'varchar', 'text', 'integer', 'boolean', 'timestamp', 'date', 'decimal', 'json',
    ]);
    return code
      .split('\n')
      .map((line) => {
        const m = /^(\s*)(\w+)\s*:\s*(uuid|varchar|text|integer|boolean|timestamp|date|decimal|json)\(([^)]*)\)(.*)$/.exec(line);
        if (!m || !drizzleTypes.has(m[3])) return line;
        const [, indent, field, type, args, rest] = m;
        const trimmed = args.trim();
        // Already correct: quoted column name first — except varchar enum form.
        if (/^['"]/.test(trimmed)) {
          if (type === 'varchar' && /\{\s*enum\s*:/.test(trimmed)) {
            return `${indent}${field}: text('${field}')${rest}`;
          }
          // Postgres NUMERIC literals must be strings: decimal(...).default(0) → .default('0')
          if (type === 'decimal') {
            return `${indent}${field}: ${type}(${args})${rest.replace(/\.default\((\d[\d.]*)\)/g, ".default('$1')")}`;
          }
          return line;
        }
        if (type === 'varchar' && /^\d+$/.test(trimmed)) {
          return `${indent}${field}: varchar('${field}', { length: ${trimmed} })${rest}`;
        }
        // Bare or bogus args (uuid(), timestamp(), integer(8)...): just add the name.
        if (type === 'decimal') {
          return `${indent}${field}: ${type}('${field}')${rest.replace(/\.default\((\d[\d.]*)\)/g, ".default('$1')")}`;
        }
        return `${indent}${field}: ${type}('${field}')${rest}`;
      })
      .join('\n');
  }

  /**
   * Generate Drizzle ORM schema.
   * Accepts the architect shape ({ tables: [...] }) and the mock-agent shape
   * ({ schema: "<ready TS>" }) — the latter is written verbatim.
   */
  static generateSchema(databaseData: any): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];

    try {
      if (typeof databaseData === 'string' && databaseData.trim().length > 0) {
        files.push({ path: 'server/db/schema.ts', content: this.normalizeUniqueConstraints(this.normalizeVerbatimSchema(databaseData)), type: 'typescript' });
        return { success: true, files };
      }
      if (typeof databaseData?.schema === 'string' && databaseData.schema.trim().length > 0) {
        files.push({ path: 'server/db/schema.ts', content: this.normalizeUniqueConstraints(this.normalizeVerbatimSchema(databaseData.schema)), type: 'typescript' });
        return { success: true, files };
      }
      if (!databaseData?.tables) {
        return { success: false, files: [], errors: ['No tables data provided'] };
      }

      const code = schemaTemplate(databaseData);
      files.push({
        path: 'server/db/schema.ts',
        content: code,
        type: 'typescript',
      });

      return { success: true, files };
    } catch (error) {
      return {
        success: false,
        files,
        errors: [`Schema generation failed: ${error}`],
      };
    }
  }

  /**
   * Generate configuration files
   */
  static generateConfigs(projectData: any): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];

    try {
      // package.json
      const packageJson = packageJsonTemplate(projectData);
      files.push({
        path: 'package.json',
        content: JSON.stringify(packageJson, null, 2),
        type: 'json',
      });

      // tsconfig.json
      const tsConfig = tsConfigTemplate();
      files.push({
        path: 'tsconfig.json',
        content: JSON.stringify(tsConfig, null, 2),
        type: 'json',
      });

      // vite.config.ts
      files.push({
        path: 'vite.config.ts',
        content: viteConfigTemplate(),
        type: 'typescript',
      });

      // tailwind.config.ts
      files.push({
        path: 'tailwind.config.ts',
        content: tailwindConfigTemplate(),
        type: 'typescript',
      });

      // Dockerfile
      files.push({
        path: 'Dockerfile',
        content: dockerfileTemplate(),
        type: 'plaintext',
      });

      // .env.example
      files.push({
        path: '.env.example',
        content: envExampleTemplate(projectData),
        type: 'plaintext',
      });

      // .gitignore
      files.push({
        path: '.gitignore',
        content: gitignoreTemplate(),
        type: 'plaintext',
      });

      // postcss.config.js (required for Tailwind — missing this silently
      // produces unstyled builds with raw "@tailwind" directives in the CSS)
      files.push({
        path: 'postcss.config.js',
        content: postcssConfigTemplate(),
        type: 'plaintext',
      });

      return { success: true, files };
    } catch (error) {
      return {
        success: false,
        files,
        errors: [`Config generation failed: ${error}`],
      };
    }
  }

  /**
   * Generate runnable entry files so the project boots without hand-editing:
   * client/index.html, client/src/{main.tsx, App.tsx, index.css, lib/api.ts},
   * postcss is covered by configs, server/index.ts, shared/types.ts.
   * App nav is derived from the generated pages (falls back to spec pages).
   */
  static generateEntryFiles(data: GenerationData): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];
    try {
      const appTitle =
        data.projectName || data.specification?.tournamentName || 'Tournament Website';

      const rawPages: string[] = Array.isArray(data.frontend?.pages)
        ? data.frontend.pages.map((p: any) => p?.name).filter(Boolean)
        : [];
      const specPages: string[] = Array.isArray(data.specification?.pages)
        ? data.specification.pages
        : [];
      const names = (rawPages.length > 0 ? rawPages : specPages).slice(0, 12);
      const refs: EntryPageRef[] = (names.length > 0 ? names : ['Home']).map((name, i) => ({
        name: String(name),
        fileBase: pageFileBase(String(name)),
        alias: pageComponentAlias(String(name), i),
      }));

      files.push({ path: 'client/index.html', content: clientIndexHtmlTemplate(appTitle), type: 'plaintext' });
      files.push({ path: 'client/src/main.tsx', content: clientMainTsxTemplate(), type: 'typescript' });
      files.push({ path: 'client/src/App.tsx', content: appTsxTemplate(appTitle, refs), type: 'typescript' });
      files.push({ path: 'client/src/index.css', content: clientIndexCssTemplate(), type: 'plaintext' });
      files.push({ path: 'client/src/lib/api.ts', content: apiClientTemplate(), type: 'typescript' });
      files.push({ path: 'server/index.ts', content: serverIndexTemplate(), type: 'typescript' });
      files.push({ path: 'server/db/client.ts', content: dbClientTemplate(), type: 'typescript' });
      files.push({ path: 'shared/types.ts', content: sharedTypesTemplate(data.specification), type: 'typescript' });

      return { success: true, files };
    } catch (error) {
      return { success: false, files, errors: [`Entry file generation failed: ${error}`] };
    }
  }

  /**
   * Emit placeholder stubs for relative imports that no agent generated.
   * The frontend model often references components in pages that it never
   * emitted (e.g. page imports HeroSection but only TournamentCard exists),
   * which breaks vite build + tsc. Stubs export BOTH named and default
   * bindings so either import style resolves, and are clearly marked TODO.
   * Scoped to client/src (components/pages/hooks/lib); server-side phantom
   * imports are forbidden by the backend prompt instead (stubs can't guess
   * server APIs, and masking them would hide real bugs).
   */
  static generateMissingImportStubs(
    files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }>
  ): Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> {
    const emitted = new Set(files.map((f) => f.path));
    const stubs: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];
    const seen = new Set<string>();

    const dirOf = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
    const normalize = (fromDir: string, spec: string): string | null => {
      if (!spec.startsWith('.')) return null;
      const parts = [...fromDir.split('/'), ...spec.split('/')].filter((s) => s !== '' && s !== '.');
      const stack: string[] = [];
      for (const part of parts) {
        if (part === '..') stack.pop();
        else stack.push(part);
      }
      const joined = stack.join('/');
      if (!joined.startsWith('client/src/')) return null;
      if (/\.(tsx?|css|json)$/.test(joined)) return joined;
      return `${joined}.tsx`;
    };

    for (const file of files) {
      if (!file.path.startsWith('client/src/') || !/\.(tsx?|jsx?)$/.test(file.path)) continue;
      const fromDir = dirOf(file.path);
      for (const m of file.content.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
        const target = normalize(fromDir, m[1]);
        if (!target || emitted.has(target) || seen.has(target)) continue;
        seen.add(target);
        const base = target.slice(target.lastIndexOf('/') + 1).replace(/\.tsx$/, '');
        const comp = base.replace(/[^a-zA-Z0-9]/g, '') || 'Stub';
        const name = /^[A-Z]/.test(comp) ? comp : comp.charAt(0).toUpperCase() + comp.slice(1);
        stubs.push({
          path: target,
          content: `import React from 'react';

/**
 * AUTO-GENERATED STUB — referenced by generated code but never emitted.
 * TODO: replace with the real ${name} implementation.
 */
export const ${name}: React.FC<any> = () => (
  <div data-stub="${name}" className="p-8 text-center text-gray-400 border border-dashed rounded-lg">
    ${name} — pending implementation
  </div>
);

export default ${name};
`,
          type: 'typescript',
        });
        console.log(`[STUBS] + ${target} (referenced by ${file.path})`);
      }
    }
    return stubs;
  }

  /**
   * Generate all files for a project
   */
  static generateProject(data: GenerationData): CodeGenResult {
    const allFiles = [];
    const allErrors: string[] = [];

    console.log('🔨 Generating project:', data.projectName);
    console.log('[DEBUG] Received data keys:', Object.keys(data));
    console.log('[DEBUG] frontend type:', typeof data.frontend);
    console.log('[DEBUG] frontend:', JSON.stringify(data.frontend).substring(0, 200));
    console.log('[DEBUG] backend type:', typeof data.backend);
    console.log('[DEBUG] backend:', JSON.stringify(data.backend).substring(0, 200));

    // Generate components
    const components = this.generateComponents(data.frontend);
    allFiles.push(...components.files);
    if (components.errors) allErrors.push(...components.errors);

    // Generate pages
    const pages = this.generatePages(data.frontend);
    allFiles.push(...pages.files);
    if (pages.errors) allErrors.push(...pages.errors);

    // Generate routes
    const routes = this.generateRoutes(data.backend);
    allFiles.push(...routes.files);
    if (routes.errors) allErrors.push(...routes.errors);

    // Generate schema
    const schema = this.generateSchema(data.database);
    allFiles.push(...schema.files);
    if (schema.errors) allErrors.push(...schema.errors);

    // Generate configs
    const configs = this.generateConfigs(data);
    allFiles.push(...configs.files);
    if (configs.errors) allErrors.push(...configs.errors);

    // Generate runnable entry files (index.html, main.tsx, App.tsx, server/index.ts, ...)
    const entry = this.generateEntryFiles(data);
    allFiles.push(...entry.files);
    if (entry.errors) allErrors.push(...entry.errors);

    // Stub any relative imports the agents referenced but never emitted
    // (e.g. a page importing a component that was never generated).
    // Without this, one phantom import breaks the entire vite build.
    const stubs = this.generateMissingImportStubs(allFiles);
    allFiles.push(...stubs);

    console.log(`[DEBUG] Total files generated: ${allFiles.length}`);
    console.log(`[DEBUG] Components: ${components.files.length}, Pages: ${pages.files.length}, Routes: ${routes.files.length}`);

    return {
      success: allErrors.length === 0,
      files: allFiles,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }
}
