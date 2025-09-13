import express from "express"

import * as UserController from "../controllers/UserController.js"

const router = express.Router();

// GET /api/users -- get users that are on leaderboard
router.get("/", UserController.getLeaderboard);

// POST /api/users -- add user to the leaderboard
router.post("/", UserController.addUserToLeaderboard);

export default router

