import { resolve } from "path"
import { defineConfig } from "vite"
import basicSsl from "@vitejs/plugin-basic-ssl"

// 多页面构建：将根 index.html 与 pages 目录下的各页面作为入口
export default defineConfig({
  appType: "mpa",
  plugins: [basicSsl()],
  server: {
    https: true, // ✅ 启用 https
    port: 5173, // 可选：指定端口
    // 通过代理把前端同源的 /api 请求转发到后端 Flask，避免 https->http 混合内容与 CORS
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      // 便于快速联通性测试：可直接访问 https://localhost:5173/hello_world
      "/hello_world": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    https: true, // 预览环境同样启用 https（npm run serve）
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        a_instrument: resolve(process.cwd(), "pages/a_instrument.html"),
        b_instrument: resolve(process.cwd(), "pages/b_instrument.html"),
        login: resolve(process.cwd(), "pages/login.html"),
        register: resolve(process.cwd(), "pages/register.html"),
        output_bookings: resolve(process.cwd(), "pages/output_bookings.html"),
        date_plan: resolve(process.cwd(), "pages/date_plan.html"),
      },
    },
  },
})
