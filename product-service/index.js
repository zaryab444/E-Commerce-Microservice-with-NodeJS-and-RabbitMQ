const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const product = require("./Product");
const isAuthenticated = require("../isAuthenticated");

app.use(express.json());
var order;

//this connection come from mongodb compass
mongoose.connect('mongodb://localhost:27017/product-service')
var channel, connection;


async function connect() {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT"); 
}
connect();

app.post("/product/buy", isAuthenticated, async (req, res) => {
    const { ids } = req.body;
    const products = await Product.find({ _id: { $in: ids } });
    channel.sendToQueue(
        "ORDER",
        Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            })
        )
    );
    channel.consume("PRODUCT", (data) => {
        // console.log(JSON.parse(data.content));
        console.log('Consuming Product queue');
        order = JSON.parse(data.content);
        // console.log(order);
        // return res.json(order); //this return order here successfully but they give an error in cmd 
    });

    return res.json(order);  // if i put this here the order is undefined
});

app.post("/product/create", isAuthenticated, async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});

app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});
