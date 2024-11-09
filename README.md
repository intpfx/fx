一个极其简单的快速开发套件。

以下是用法案例：

```javascript
import { CI, CMJS, roadmap, STDM } from "jsr:@intpfx/fx";
// import { CI, CMJS, roadmap, STDM } from "npm:@intpfx/fx";

// 强制转换至部署模式，会取消HMR功能的注入，主要用于非Deno Deploy环境部署时使用
STDM();

// 自定义入口索引HTML模板内容
CI({
  title: "Hello, World!",
});

// 自定义入口JS模板内容
CMJS(() => {
  console.log("Hello, World!");
});

// 添加API端点
roadmap.mark("test", async (messages) => {
  const { request, headers } = messages;
  const { key = null } = await request.json();
  const result = key ? "success" : "failure";
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify({ message: result }));
});
```
