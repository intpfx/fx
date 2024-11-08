let IS_DEV = Deno.env.get("DENO_REGION") ? false : true;
let INDEX = "";
let MAIN_JS = "";

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
export function CI(
  {
    charset,
    keywords,
    description,
    author,
    robots,
    title,
    icon,
    icon_png,
    manifest,
  } = {
    charset: "UTF-8",
    keywords: "keywords",
    description: "description",
    author: "author",
    robots: "index, follow",
    title: "I am title",
    icon: "",
    icon_png: "",
    manifest: "",
  },
) {
  INDEX = /*html*/ `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset=${charset}>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="mobile-web-app-capable" content="yes">
      <meta name="format-detection" content="telephone=no">
      <meta name="keywords" content=${keywords}>
      <meta name="description" content=${description}>
      <meta name="author" content=${author}>
      <meta name="robots" content=${robots}>
      <meta name="start_url" content="/">
      <title>${title}</title>
      ${
    icon ? /*html*/ `<link rel="icon" type="image/svg+xml" href=${icon}>` : ""
  }
      ${
    icon_png
      ? /*html*/ `<link rel="apple-touch-icon" type="image/png" href=${icon_png}>`
      : ""
  }
      ${icon ? /*html*/ `<link rel="mask-icon" href=${icon} color="#000">` : ""}
      ${
    icon_png
      ? /*html*/ `<link rel="fluid-icon" href=${icon_png} title="title">`
      : ""
  }
      ${
    icon
      ? /*html*/ `<link rel="shortcut icon" type="image/svg+xml" href=${icon}>`
      : ""
  }
      ${
    icon_png
      ? /*html*/ `<link rel="apple-touch-startup-image" type="image/png" href=${icon_png}>`
      : ""
  }
      ${
    manifest
      ? /*html*/ `<link rel="manifest" type="application/manifest+json" href=${manifest}>`
      : ""
  }
    </head>
    <body></body>
    <script type="module" src="main.js"></script>
    <dev-inject />
  </html>`;
}
CI();

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
CMJS();

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

/**
 * Application Program Interface Route Marking System
 */
export const roadmap: Roadmap = new Roadmap();
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

Deno.serve((request) => {
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
