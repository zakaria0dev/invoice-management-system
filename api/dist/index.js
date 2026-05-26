"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
require("./cron");
const isPassenger = process.env.PHUSION_PASSENGER !== undefined ||
    process.env.PASSENGER_APP_ENV !== undefined ||
    process.env.PASSENGER_ENVIRONMENT !== undefined ||
    process.passenger === true;
const port = parseInt(process.env.PORT || '5000', 10);
if (isPassenger) {
    console.log('Running on Phusion Passenger (N0C)');
    // Phusion Passenger will pass the 'passenger' string as a pipe/socket for the server to listen on
    app_1.default.listen('passenger', () => {
        console.log(`Server is running on Passenger in ${process.env.NODE_ENV || 'production'} mode`);
    });
}
else {
    console.log('Running in local/standard environment');
    app_1.default.listen(port, () => {
        console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}
