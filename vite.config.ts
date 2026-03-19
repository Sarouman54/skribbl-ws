import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	root: 'src',
	build: {
		rollupOptions: {
			input: {
				main: resolve('src/index.html'),
				room: resolve('src/room.html'),
			},
		},
		outDir: '../dist',
		emptyOutDir: true,
	},
	plugins: [
		tailwindcss(),
	],
});
