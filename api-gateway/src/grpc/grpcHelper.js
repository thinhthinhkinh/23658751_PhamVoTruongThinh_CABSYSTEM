const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_DIR = path.join(__dirname, "../../../../proto");

function loadProto(filename) {
  const packageDef = protoLoader.loadSync(path.join(PROTO_DIR, filename), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDef);
}

function makeClient(pkg, ServiceName, host) {
  return new pkg[ServiceName](host, grpc.credentials.createInsecure());
}

function call(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

// Gateway calls a gRPC method, then maps GrpcResponse → HTTP response
async function grpcRequest(res, client, method, request) {
  try {
    const resp = await call(client, method, request);
    const status = resp.http_status || 200;
    if (resp.success) {
      return res.status(status).json(JSON.parse(resp.json));
    } else {
      return res.status(status).json({
        error: { code: resp.error_code, message: resp.error_message },
      });
    }
  } catch (err) {
    const status = err.code === grpc.status.NOT_FOUND ? 404
                 : err.code === grpc.status.ALREADY_EXISTS ? 409
                 : err.code === grpc.status.PERMISSION_DENIED ? 403
                 : err.code === grpc.status.UNAUTHENTICATED ? 401
                 : 500;
    return res.status(status).json({
      error: { code: "GRPC_ERROR", message: err.details || err.message },
    });
  }
}

// Extract auth info from request — prefers context set by auth-service middleware,
// falls back to local JWT decode when auth-service was unreachable during middleware.
function authCtx(req) {
  if (req._authContext) return req._authContext;
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return { callerId: "", callerRole: "" };
  try {
    const payload = JSON.parse(
      Buffer.from(auth.slice(7).split(".")[1], "base64url").toString()
    );
    return { callerId: payload.id || "", callerRole: payload.role || "" };
  } catch {
    return { callerId: "", callerRole: "" };
  }
}

module.exports = { loadProto, makeClient, grpcRequest, authCtx };
