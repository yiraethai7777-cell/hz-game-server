const express = require("express");

const app = express();

app.use(express.json());

app.get("/", function (req, res) {
    res.send("HZ Game Server Online");
});

app.post("/bot", function (req, res) {
    const message = req.body.message;

    if (message === "!테스트") {
        res.json({
            reply: "서버 연결 성공!"
        });
        return;
    }

    res.json({
        reply: null
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log("Server started on port " + PORT);
});
