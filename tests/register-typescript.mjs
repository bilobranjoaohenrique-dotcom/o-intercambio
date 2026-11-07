import { registerHooks } from 'node:module';

// Vite resolves extensionless TypeScript imports. Node's strip-only test
// runner needs the source extension and Babylon's published .js subpaths.
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) specifier += '.ts';
  if (specifier.startsWith('@babylonjs/core/') && !specifier.endsWith('.js')) specifier += '.js';
  return next(specifier, context);
} });
