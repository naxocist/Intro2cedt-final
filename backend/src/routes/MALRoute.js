import express from "express"

import * as MALController from "../controllers/MALController.js"

const router = express.Router();

// GET /api/mal -- get random anime clues by username
router.get("/:username", MALController.getRandomAnimeCluesByUsername);

// GET /api/mal -- get random anime clues by username
// router.get("/:username", MALController.getRandomAnimeByUsername);

export default router
