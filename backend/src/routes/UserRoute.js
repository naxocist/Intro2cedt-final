import express from "express"

import * as UserController from "../controllers/UserController.js"

const router = express.Router();

// GET /api/users -- get users that are on leaderboard
router.get("/", UserController.getLeaderboard);

// POST /api/users -- add user to the leaderboard
router.post("/", UserController.addUser);

// PUT /api/users -- update user score on the leaderboard
router.put("/", UserController.updateUserScore);

// DELETE /api/users -- delete user from the leaderboard
router.delete("/", UserController.deleteUser);

export default router

