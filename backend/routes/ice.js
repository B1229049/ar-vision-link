import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    iceServers: [
      {
        urls:
          "stun:stun.l.google.com:19302",
      },
      {
        urls:
          process.env.TURN_URL,
        username:
          process.env
            .TURN_USERNAME,
        credential:
          process.env
            .TURN_CREDENTIAL,
      },
      {
        urls:
          process.env.TURNS_URL,
        username:
          process.env
            .TURN_USERNAME,
        credential:
          process.env
            .TURN_CREDENTIAL,
      },
    ],
  });
});

export default router;