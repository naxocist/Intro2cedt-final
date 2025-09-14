import User from "../models/userModel.js"

export const getLeaderboard = async (req, res) => {
  const users = await User.find().sort({ score: -1, name: 1 }).select({ name: 1, score: 1, _id: 0 });
  return res.status(200).json(users);
}


export const addUser = async (req, res) => {
  try {
    const newUser = new User(req.body);

    const existingUser = await User.find({ name: newUser.name });
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "User with this name already exists" });
    }

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


export const updateUserScore = async (req, res) => {
  try {
    const { name, score, password } = req.body;

    if (!name || !password || !score) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const user = await User.find({ name: name, password: password });

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (score > user[0].score) {
      user[0].score = score;
      await user[0].save();
    }

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ error: "Bad Request" });
    } else {
      res.status(500).json({ error: "Internal server error." });
    }
  }
}


export const deleteUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const user = await User.find({ name: name });
    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user[0].password !== password) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await User.deleteOne({ name: name, password: password });
    return res.status(200).json({ message: "OK" });
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ error: "Bad Request" });
    } else {
      res.status(500).json({ error: "Internal server error." });
    }
  }
}
