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
          const filename = page.name.toLowerCase().replace(/\s+/g, '-');

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

      for (const route of backendData.routes) {
        try {
          let code: string;

          if (route.code) {
            // Use pre-generated code if available
            code = route.code;
            console.log(`[ROUTES] ✓ Using pre-generated code for ${route.method} ${route.path}`);
          } else {
            // Otherwise render from template
            code = routeTemplate(route);
            console.log(`[ROUTES] ✓ Rendered template for ${route.method} ${route.path}`);
          }

          const group = route.group || 'index';

          if (!routesByGroup[group]) {
            routesByGroup[group] = [];
          }
          routesByGroup[group].push(code);
        } catch (error) {
          console.log(`[ROUTES] ✗ Failed to generate route ${route.path}:`, error);
          errors.push(`Failed to generate route ${route.path}: ${error}`);
        }
      }

      // Combine routes by group
      for (const [group, routeCodes] of Object.entries(routesByGroup)) {
        const routerImport = `import { Router } from 'express';
const router = Router();

`;
        const routerExport = `\nexport default router;`;
        const content = routerImport + routeCodes.join('\n\n') + routerExport;

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
   * Generate Drizzle ORM schema
   */
  static generateSchema(databaseData: any): CodeGenResult {
    const files: Array<{ path: string; content: string; type: 'typescript' | 'json' | 'plaintext' | 'yaml' }> = [];
    const errors: string[] = [];

    try {
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
    const errors: string[] = [];

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

    console.log(`[DEBUG] Total files generated: ${allFiles.length}`);
    console.log(`[DEBUG] Components: ${components.files.length}, Pages: ${pages.files.length}, Routes: ${routes.files.length}`);

    return {
      success: allErrors.length === 0,
      files: allFiles,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }
}
