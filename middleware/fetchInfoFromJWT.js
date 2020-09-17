const { verifyJWT } = require("../utils/jwt-helpers");

const fetchInfoFromJWT = async (req, res, next, db) => {
  req.user = null;
  if (req.headers.authorization) {
    try {
      const jwt = req.headers.authorization.split(" ")[1];
      const { email, did, appID } = await verifyJWT(jwt);
      req.appID = appID;
      const v = JSON.parse(await db.get(`email:${email}`));
      if (v.did === did) {
        // full jwt
        req.user = { email, did };
        next();
      } else if (!v.did) {
        // partial jwt
        req.user = { email, did: null };
        next();
      } else {
        next(new Error("Invalid JWT"));
      }
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
};

module.exports = fetchInfoFromJWT;