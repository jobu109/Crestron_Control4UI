import { defineConfig } from 'vitest/config';

// Three build targets share one source tree:
//   dev             -> mock adapter in the browser (npm run dev)
//   --mode crestron -> static page for a CH5 archive (dist/crestron)
//   --mode ha       -> one ES module that registers <zenith-panel> for Home Assistant (dist/ha)
export default defineConfig(({ mode }) => {
  const define = {
    __DEFAULT_ADAPTER__: JSON.stringify(mode === 'crestron' ? 'crestron' : mode === 'ha' ? 'ha' : 'mock')
  };
  if (mode === 'ha') {
    return {
      define,
      build: {
        outDir: 'dist/ha',
        emptyOutDir: true,
        target: 'es2021',
        lib: {
          entry: 'src/ha-panel.ts',
          formats: ['es'],
          fileName: () => 'zenith-panel.js'
        }
      }
    };
  }
  return {
    base: './',
    define,
    build: {
      outDir: 'dist/crestron',
      emptyOutDir: true,
      target: 'es2021'
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts']
    }
  };
});
