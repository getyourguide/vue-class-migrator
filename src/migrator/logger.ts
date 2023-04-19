import winston from 'winston';

export const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console(),
    ],
});