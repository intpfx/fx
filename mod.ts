let IS_DEV = Deno.env.get("DENO_REGION") ? false : true;
let PORT = 8000;
let LOOP_FLAG = true;
let INDEX = /*html*/ `
<!DOCTYPE html>
<html>
  <head>
    <title>I am title</title>
  </head>
  <body></body>
  <script type="module" src="/main.js"></script>
  <dev-inject />
</html>`;
let MAIN_JS = 'console.log("This is JS entrance.")';

interface Handler {
  (messages: { request: Request; headers: Headers }): Response;
}

class Roadmap extends Map {
  constructor() {
    super();
  }
  mark(key: string, value: Handler) {
    super.set(key, value);
  }
}

/**
 * Switch to development mode forcibly
 */
export function STDM() {
  IS_DEV = false;
}

/**
 * Custom Index HTML
 */
export function CI({ title } = { title: "I am title" }) {
  INDEX = /*html*/ `
  <!DOCTYPE html>
  <html>
    <head>
      <title>${title}</title>
    </head>
    <body></body>
    <script type="module" src="/main.js"></script>
    <dev-inject />
  </html>`;
}

/**
 * Custom Main JavaScript
 * @param {Function} main
 */
export function CMJS(main: () => void = () => {
  console.log("This is JS entrance.");
}) {
  const context = main.toString();
  MAIN_JS = context.slice(context.indexOf("{") + 1, context.lastIndexOf("}"));
}

const hmr_dev = () => {
  if (IS_DEV) {
    const hmr_socket_fragment = /*html*/ `
      <script class="dev_script" type="module">
        const hmr_socket = new WebSocket("ws://localhost:8000/hmr");
        hmr_socket.onerror = () => location.reload();
        hmr_socket.onclose = () => location.reload();
      </script>
      <script class="dev_script" type="module">
        // 获取所有class为dev_script的script标签
        const scripts = document.querySelectorAll(".dev_script");
        // 移除所有class为dev_script的script标签
        scripts.forEach((script) => script.remove());
      </script>`;
    // Inject the HMR socket fragment into the index.html
    return INDEX.replace("<dev-inject />", hmr_socket_fragment);
  } else {
    return INDEX.replace("<dev-inject />", "");
  }
};

export const roadmap = new Roadmap();
roadmap.mark("", (messages) => {
  const { headers } = messages;
  headers.set("Content-Type", "text/html");
  return new Response(hmr_dev(), { headers });
});
roadmap.mark("hmr", (messages) => {
  const { request } = messages;
  const { socket: _socket, response } = Deno.upgradeWebSocket(request);
  return response;
});
roadmap.mark("main.js", (messages) => {
  const { headers } = messages;
  headers.set("Content-Type", "application/javascript");
  return new Response(MAIN_JS, { headers });
});

while (LOOP_FLAG) {
  try {
    Deno.serve({
      port: PORT,
      onListen: () => {
        if (IS_DEV) {
          console.log(`Server is running on http://localhost:${PORT}`);
          LOOP_FLAG = false;
        }
      },
    }, (request) => {
      const url = new URL(request.url);
      const pathArray = url.pathname.split("/");
      const headers = new Headers();
      const handler = roadmap.get(pathArray[1]);
      const messages = {
        request: request,
        headers: headers,
      };
      if (handler) {
        return handler(messages);
      } else {
        headers.set("Content-Type", "text/html");
        return new Response("404 Not Found", { headers, status: 404 });
      }
    });
    // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    switch (error.name) {
      case "AddrInUse": {
        PORT++;
        break;
      }
    }
  }
}
