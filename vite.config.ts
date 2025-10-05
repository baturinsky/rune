import glsl from 'vite-plugin-glsl';
import { viteSingleFile } from "vite-plugin-singlefile"
//import compiler from '@ampproject/rollup-plugin-closure-compiler';
import { defineConfig, UserConfig, UserConfigFnObject } from 'vite';

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  return {
    plugins: [
      glsl({ minify: true }),
      //viteSingleFile({removeViteModuleLoader:true}),      
    ],
    base: '',
    define: {
      DEBUG: mode == 'development'
    },

    build: {
      minify: true,
      modulePreload: { polyfill: false },
      emptyOutDir: true,
      rollupOptions: {
        output: { entryFileNames: "bundle.js" }
      }
    }
  } as UserConfig
});

