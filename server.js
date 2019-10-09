const fs = require("fs");
const express = require("express");
const http = require("http");
const https = require("https");
const morgan = require("morgan");
const cors = require("cors");
const healthCheck = require("express-healthcheck");

const app = express();

app.use(morgan("combined"));
app.use(cors());
app.use("/health", healthCheck());

let dockerHost = null;
let dockerPort = null;

if (process.env.DOCKER_HOST) {
  console.log(`Docker Host: ${process.env.DOCKER_HOST}`);

  try {
    const dh = process.env.DOCKER_HOST.split(":");
    [dockerHost, dockerPort] = dh;
  } catch (err) {
    console.log(err);
  }
}

let certPath;

if (process.env.DOCKER_TLS_VERIFY) {
  if (process.env.DOCKER_CERT_PATH) {
    certPath = process.env.DOCKER_CERT_PATH;
  } else {
    certPath = `${process.env.HOME || process.env.USERPROFILE}/.docker`;
  }
}

function tryParseJSON(jsonString) {
  try {
    const o = JSON.parse(jsonString);

    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {}

  return false;
}

app.listen(8080, () => {
  console.log("server is running");
});

app.get("/api/docker/*", (req, response) => {
  const path = req.params[0];
  const query = req._parsedUrl.search || "";
  const options = {
    path: `/${path}${query}`,
    method: "GET"
  };

  let { request } = http;

  if (certPath) {
    request = https.request;
    options.ca = fs.readFileSync(`${certPath}/ca.pem`);
    options.cert = fs.readFileSync(`${certPath}/cert.pem`);
    options.key = fs.readFileSync(`${certPath}/key.pem`);
  }

  if (dockerHost) {
    options.host = dockerHost;
    options.port = dockerPort;
  } else if (process.platform === "win32") {
    options.socketPath = "\\\\.\\pipe\\docker_engine";
  } else {
    options.socketPath = "/var/run/docker.sock";
  }

  const apiReq = request(options, res => {
    let data = "";

    res.on("data", chunk => {
      data += chunk;
    });

    res.on("end", () => {
      const jsonData = tryParseJSON(data.toString());

      if (jsonData) {
        response.json(jsonData);
      } else {
        response.set("Content-Type", "text/plain");
        response.send(data.toString());
      }
    });
  });

  apiReq.on("error", err => {
    console.log(`problem with request: ${err.message}`);
    console.log(err.stack);
  });

  req.end();
});
