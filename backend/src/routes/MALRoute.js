import express from "express"

import * as MALController from "../controllers/MALController.js"

const router = express.Router();

// GET /api/mal/:username -- get random anime clues by username
router.get("/:username", MALController.getRandomAnimeCluesByUsername);

export default router
