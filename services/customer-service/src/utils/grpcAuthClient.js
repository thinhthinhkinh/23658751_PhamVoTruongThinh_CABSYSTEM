const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL || "localhost:5010";

const pkgDef = protoLoader.loadSync(
  path.join(__dirname, "../../../../proto/auth.proto"),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const pkg = grpc.loadPackageDefinition(pkgDef);
const client = new pkg.cab.auth.AuthService(AUTH_GRPC_URL, grpc.credentials.createInsecure());

function rpc(method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = {
  registerCredentials: (req) => rpc("RegisterCredentials", req),
  loginByEmail:        (req) => rpc("LoginByEmail", req),
};
