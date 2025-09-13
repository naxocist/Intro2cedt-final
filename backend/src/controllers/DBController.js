import User from "../models/userModel.js"

export const getLeaderboard = async (req, res) => {
  const users = User.find().sort({ score: -1 });
  return res.status(200).json(users);
}

export const addUserToLeaderboard = async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();

    res.status(200).json({ message: "OK" });
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ error: "Bad Request" });
    } else {
      res.status(500).json({ error: "Internal server error." });
    }
  }
}
