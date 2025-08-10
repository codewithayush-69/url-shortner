import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { error, log } from "console";
import { json } from "stream/consumers";

const port = 3000;
const DATA_FILE = path.join("data", "links.json");
const serveFile = async (res, path, contenType) => {
  try {
    const data = await readFile(path);
    res.writeHead(200, { "content-Type": contenType });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "content-Type": contenType });
    res.end("404 page not found");
  }
};

const loadLink = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
  }
};

const saveLink = async (link) => {
  await writeFile(DATA_FILE, JSON.stringify(link));
};

const server = createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/") {
      return serveFile(res, path.join("files", "index.html"), "text/html");
    } else if (req.url === "/style.css") {
      return serveFile(res, path.join("files", "style.css"), "text/css");
    } else if (req.url === "/links") {
      const links = await loadLink();
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end(JSON.stringify(links));
    } else {
      const links = await loadLink();
      const shortCode = req.url.slice(1);
      if (links[shortCode]) {
        res.writeHead(302, {location : links[shortCode]});
        return res.end();
      }
      res.writeHead(404, {"conten-Type": "plain/text"});
      res.end("Page not found pls enter a valid link");
    };
  }
  if (req.method === "POST" && req.url === "/shorten") {
    const link = await loadLink();
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const { url, shortCode } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "URL is required" }));
        }
        const finalShortCode =
          shortCode || crypto.randomBytes(4).toString("hex");
        if (link[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Short code must be different" })
          );
        }
        link[finalShortCode] = url;
        await saveLink(link);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            shortUrl: `http://localhost:${port}/${finalShortCode}`,
            originalUrl: url,
            shortCode: finalShortCode,
          })
        );
      } catch (error) {
        console.error("Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  }
});

server.listen(port,() => {
  console.log(`server running at : http://localhost:${port}`);
});
