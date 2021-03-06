const { validateOTP } = require("../../../utils/otp");
const {
  InvalidOneTimePassError,
  RPCResponse,
} = require("../../../utils/jsonrpc");
const { updateUserEntryInDBWithDID } = require("../../../db");
const { createJWT } = require("../../../utils/jwt-helpers");
const { instantiateCeramic } = require("../../../utils/ceramic");
const ManagedUser = require("../../../utils/User");

module.exports = async (req, res, next, db, id, [{ email, code }]) => {
  // this is hardcoded for now, with 1 app
  const appID = "did:3:12345";
  const partialJWTClaimsThisEmail = true; //req.user.email === email;
  let validOTP = true;
  try {
    // validOTP = await validateOTP(req.user.email, code);
  } catch (err) {
    res
      .status(400)
      .json(new RPCResponse({ id, error: new InvalidOneTimePassError() }));
    return;
  }

  if (validOTP && partialJWTClaimsThisEmail) {
    try {
      const { ceramic, idWallet } = await instantiateCeramic(email);
      const did = idWallet.id;
      await updateUserEntryInDBWithDID(did, email, db);
      const jwt = await createJWT({
        email,
        did,
        appID,
      });
      res.status(201).json(new RPCResponse({ id, result: { jwt, did } }));
      const managedUser = new ManagedUser({ email, ceramic });
      managedUser.configure(appID);
    } catch (err) {
      next(err);
    }
  } else {
    res
      .status(403)
      .json(new RPCResponse({ id, error: new InvalidOneTimePassError() }));
  }
};
