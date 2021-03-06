const createError = require("http-errors");
const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const level = require("level");
const {
  InternalError,
  RPCResponse,
  parseJsonrpcReq,
} = require("./utils/jsonrpc");
const handlers = require("./handlers");
const {
  ensureValidJsonrpcRequest,
  jsonrpcLogger,
  fetchInfoFromJWT,
} = require("./middleware");
const { STREAMS_DID_EMAIL_DB } = require("./constants");

const app = express();

// this was the best way i could see to avoid race conditions with db
// but i dont know how to "close" the db (or if i even need to?)
const db = level(STREAMS_DID_EMAIL_DB);
app.set(STREAMS_DID_EMAIL_DB, db);

app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(jsonrpcLogger);

app.post(
  "/rpc/v0",
  ensureValidJsonrpcRequest,
  (req, res, next) =>
    fetchInfoFromJWT(req, res, next, app.get(STREAMS_DID_EMAIL_DB)),
  async (req, res, next) => {
    const { id, Namespace, Handler, params } = parseJsonrpcReq(req);
    const db = app.get(STREAMS_DID_EMAIL_DB);
    return handlers[Namespace][Handler](req, res, next, db, id, params);
  }
);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  const { id } = parseJsonrpcReq(req);

  res
    .status(500)
    .json(
      new RPCResponse({ id, error: new InternalError({ data: err.message }) })
    );
});

module.exports = app;
