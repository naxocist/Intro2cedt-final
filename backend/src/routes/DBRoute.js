import express from "express"

import * as DBController from "../controllers/DBController.js"

const router = express.Router();

// GET /api/db -- get users that are on leaderboard
router.get("/", DBController.getLeaderboard);

// POST /api/db -- add user to the leaderboard
router.post("/", DBController.addUserToLeaderboard);

export default router

