import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import './cron';

const isPassenger =
    process.env.PHUSION_PASSENGER !== undefined ||
    process.env.PASSENGER_APP_ENV !== undefined ||
    process.env.PASSENGER_ENVIRONMENT !== undefined ||
    (process as any).passenger === true;
const port = parseInt(process.env.PORT || '5000', 10);

if (isPassenger) {
    console.log('Running on Phusion Passenger (N0C)');
    // Phusion Passenger will pass the 'passenger' string as a pipe/socket for the server to listen on
    app.listen('passenger', () => {
        console.log(`Server is running on Passenger in ${process.env.NODE_ENV || 'production'} mode`);
    });
} else {
    console.log('Running in local/standard environment');
    app.listen(port, () => {
        console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });
}
