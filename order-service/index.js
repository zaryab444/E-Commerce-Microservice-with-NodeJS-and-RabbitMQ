const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 9090;
const mongoose = require("mongoose");
const Order = require("./Order");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");
app.use(express.json());

//this connection come from mongodb compass
mongoose.connect('mongodb://localhost:27017/order-service')
var channel, connection;

function createOrder(products, userEmail) {
    let total = 0;
    for (let t = 0; t < products.length; ++t) {
        total += products[t].price;
    }
    const newOrder = new Order({
        products,
        user: userEmail,
        total_price: total,
    });
    newOrder.save();
    return newOrder;
}

async function connect() {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("ORDER");
}
connect().then(() => {
    channel.consume("ORDER", (data) => {
        console.log("Consuming ORDER service");
        const { products, userEmail } = JSON.parse(data.content);
         const newOrder = createOrder(products, userEmail);
        channel.ack(data);
        channel.sendToQueue(
            "PRODUCT",
            Buffer.from(JSON.stringify({ newOrder }))
        );
        console.log("Consuming ORDER queue");
        console.log(products);

    });
});

app.listen(PORT, () => {
    console.log(`Order-Service at ${PORT}`);
});