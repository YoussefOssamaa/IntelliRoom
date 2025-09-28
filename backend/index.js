import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello from backend!");
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
