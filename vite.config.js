import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' faz os caminhos dos arquivos serem relativos, então funciona
// tanto em usuario.github.io/ quanto em usuario.github.io/nome-do-repo/
// sem precisar editar nada aqui.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
